// Claude provider: drives the official `claude` binary (shipped inside @anthropic-ai/claude-agent-sdk)
// so the user's Claude subscription is used instead of an API key. Same approach OpenCode uses.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { app, ipcMain, BrowserWindow } = require('electron');

const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'];
// Used only when Claude Code cannot list the account's models
const MODELS = [
    { value: 'sonnet', label: 'Sonnet', description: '', efforts: EFFORT_LEVELS },
    { value: 'opus', label: 'Opus', description: '', efforts: EFFORT_LEVELS },
    { value: 'haiku', label: 'Haiku', description: '', efforts: EFFORT_LEVELS },
];
const DEFAULT_MODEL = 'sonnet';
const AUTH_TIMEOUT_MS = 15000;
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
const START_TIMEOUT_MS = 45000;
// A turn is abandoned if Claude sends nothing at all for this long (thinking and streaming both count as activity)
const TURN_IDLE_TIMEOUT_MS = 90000;

// Turn off Claude Code features that overlap with this app (memory, CLAUDE.md files, auto compaction, ...)
const ISOLATION_ENV = {
    CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1',
    CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
    DISABLE_AUTO_COMPACT: '1',
    CLAUDE_CODE_ENABLE_AWAY_SUMMARY: '0',
    ENABLE_TOOL_SEARCH: 'false',
    CLAUDE_CODE_DISABLE_ADVISOR_TOOL: '1',
    DISABLE_TELEMETRY: '1',
};

let sdkPromise = null;
function loadSdk() {
    // The SDK is ESM-only, so it has to be loaded with a dynamic import from this CommonJS file.
    if (!sdkPromise) sdkPromise = import('@anthropic-ai/claude-agent-sdk');
    return sdkPromise;
}

function unpackedPath(p) {
    // Executables cannot be spawned from inside app.asar
    return p.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
}

function findOnPath(name) {
    const exts = process.platform === 'win32' ? ['.exe', '.cmd', ''] : [''];
    for (const dir of (process.env.PATH || '').split(path.delimiter)) {
        for (const ext of exts) {
            const candidate = path.join(dir, name + ext);
            try {
                if (fs.statSync(candidate).isFile()) return candidate;
            } catch {}
        }
    }
    return null;
}

function resolveExecutable() {
    if (process.env.CHEATING_DADDY_CLAUDE_PATH) return process.env.CHEATING_DADDY_CLAUDE_PATH;
    const fileName = process.platform === 'win32' ? 'claude.exe' : 'claude';
    const candidates = [`@anthropic-ai/claude-agent-sdk-${process.platform}-${process.arch}`];
    if (process.platform === 'linux') candidates.push(`@anthropic-ai/claude-agent-sdk-linux-${process.arch}-musl`);
    for (const pkg of candidates) {
        try {
            const dir = path.dirname(require.resolve(`${pkg}/package.json`));
            const exe = unpackedPath(path.join(dir, fileName));
            if (fs.existsSync(exe)) return exe;
        } catch {}
    }
    // Fall back to a `claude` the user installed themselves
    return findOnPath('claude');
}

function runClaude(args, timeoutMs) {
    return new Promise((resolve, reject) => {
        const executable = resolveExecutable();
        if (!executable) return reject(new Error('Claude Code binary was not found. Reinstall the app or install Claude Code.'));
        const child = spawn(executable, args, { env: { ...process.env, ...ISOLATION_ENV }, windowsHide: true });
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
            child.kill();
            reject(new Error('Claude Code timed out'));
        }, timeoutMs);
        child.stdout.on('data', d => (stdout += d));
        child.stderr.on('data', d => (stderr += d));
        child.on('error', err => {
            clearTimeout(timer);
            reject(err);
        });
        child.on('close', code => {
            clearTimeout(timer);
            resolve({ code, stdout, stderr });
        });
    });
}

async function getAuthStatus() {
    try {
        const { stdout } = await runClaude(['auth', 'status'], AUTH_TIMEOUT_MS);
        const info = JSON.parse(stdout);
        return {
            available: true,
            loggedIn: info.loggedIn === true,
            authMethod: info.authMethod || 'none',
            email: info.email || null,
            subscriptionType: info.subscriptionType || null,
        };
    } catch (error) {
        return { available: !/not found/i.test(error.message), loggedIn: false, error: error.message };
    }
}

let loginInProgress = null;
function login() {
    if (loginInProgress) return loginInProgress;
    loginInProgress = new Promise(resolve => {
        const executable = resolveExecutable();
        if (!executable) return resolve({ success: false, error: 'Claude Code binary was not found' });
        const child = spawn(executable, ['auth', 'login'], { env: { ...process.env, ...ISOLATION_ENV }, windowsHide: true });
        let output = '';
        let opened = false;
        const timer = setTimeout(() => child.kill(), LOGIN_TIMEOUT_MS);
        const onData = data => {
            output += data.toString();
            // The CLI opens the browser itself. Show its URL in the app too, as a fallback link if no browser opened.
            const match = !opened && output.match(/https:\/\/\S+/);
            if (match) {
                opened = true;
                const url = match[0].replace(/[)\].,]+$/, '');
                for (const win of BrowserWindow.getAllWindows()) win.webContents.send('claude-login-url', url);
            }
        };
        child.stdout.on('data', onData);
        child.stderr.on('data', onData);
        child.on('error', err => {
            clearTimeout(timer);
            resolve({ success: false, error: err.message });
        });
        child.on('close', async code => {
            clearTimeout(timer);
            const status = await getAuthStatus();
            resolve(
                status.loggedIn
                    ? { success: true, status }
                    : { success: false, error: code === 0 ? 'Sign-in was not completed' : 'Sign-in failed or was cancelled' }
            );
        });
    }).finally(() => {
        loginInProgress = null;
    });
    return loginInProgress;
}

async function logout() {
    try {
        await runClaude(['auth', 'logout'], AUTH_TIMEOUT_MS);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Async queue so user messages can be streamed into one long-lived Claude process.
class InputQueue {
    constructor() {
        this.items = [];
        this.waiting = null;
        this.closed = false;
    }
    push(item) {
        if (this.closed) return;
        if (this.waiting) {
            const resolve = this.waiting;
            this.waiting = null;
            resolve({ value: item, done: false });
        } else {
            this.items.push(item);
        }
    }
    close() {
        this.closed = true;
        if (this.waiting) this.waiting({ value: undefined, done: true });
        this.waiting = null;
    }
    [Symbol.asyncIterator]() {
        return {
            next: () => {
                if (this.items.length) return Promise.resolve({ value: this.items.shift(), done: false });
                if (this.closed) return Promise.resolve({ value: undefined, done: true });
                return new Promise(resolve => (this.waiting = resolve));
            },
        };
    }
}

function getWorkspaceDir() {
    const dir = path.join(app.getPath('userData'), 'claude-workspace');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function friendlyError(message) {
    if (/not logged in|\/login|authentication_error|invalid api key|unauthorized|api error:?\s*401/i.test(message)) {
        return 'Not signed in to Claude. Click "Sign in with Claude" on the home screen.';
    }
    if (/rate[ _-]?limit|usage limit|overloaded_error|api error:?\s*429/i.test(message)) {
        return 'Claude usage limit reached. Try again later or switch model.';
    }
    return message;
}

class ClaudeChat {
    constructor({ model, systemPrompt, effort }) {
        this.model = model || DEFAULT_MODEL;
        this.effort = effort && effort !== 'default' ? effort : undefined;
        this.systemPrompt = systemPrompt || 'You are a helpful assistant.';
        this.query = null;
        this.input = null;
        this.turn = null; // { onText, text, resolve, reject }
        this.chain = Promise.resolve();
        this.notes = [];
        this.history = []; // plain-text record so a restarted process can be given the earlier conversation
        this.closed = false;
    }

    async start() {
        const { query } = await loadSdk();
        const executable = resolveExecutable();
        if (!executable) throw new Error('Claude Code binary was not found. Reinstall the app or install Claude Code.');

        this.input = new InputQueue();
        const stderrLines = [];
        const query_ = query({
            prompt: this.input,
            options: {
                pathToClaudeCodeExecutable: executable,
                cwd: getWorkspaceDir(),
                env: { ...process.env, ...ISOLATION_ENV },
                model: this.model,
                systemPrompt: this.systemPrompt,
                // Plain chat: no tools, no user/project settings, no hooks, nothing written to disk
                tools: [],
                skills: [],
                settingSources: [],
                settings: { disableAllHooks: true },
                strictMcpConfig: true,
                mcpServers: {},
                permissionMode: 'dontAsk',
                persistSession: false,
                includePartialMessages: true,
                verbatimPrompts: true,
                // Effort only applies when Claude is allowed to think; without it, skip thinking for speed
                ...(this.effort ? { effort: this.effort, thinking: { type: 'adaptive' } } : { thinking: { type: 'disabled' } }),
                stderr: line => {
                    stderrLines.push(line);
                    if (stderrLines.length > 20) stderrLines.shift();
                },
            },
        });
        this.query = query_;
        this.pump(query_, stderrLines);
        // Surfaces login/startup problems now instead of on the first question
        let init;
        let startTimer;
        try {
            init = await Promise.race([
                query_.initializationResult(),
                new Promise((_, reject) => {
                    startTimer = setTimeout(() => reject(new Error('Claude Code did not start in time')), START_TIMEOUT_MS);
                }),
            ]);
        } catch (error) {
            this.discardProcess();
            throw error;
        } finally {
            clearTimeout(startTimer);
        }
        const account = init && init.account;
        if (account && account.tokenSource === 'none' && account.apiKeySource === undefined) {
            this.close();
            throw new Error('Not signed in to Claude. Click "Sign in with Claude" on the home screen.');
        }
    }

    async pump(query_, stderrLines) {
        let failure = null;
        try {
            for await (const message of query_) {
                this.handleMessage(message);
            }
        } catch (error) {
            failure = error;
        }
        if (this.query === query_) {
            this.query = null;
            this.input?.close();
            this.input = null;
        }
        if (this.turn) {
            const detail = failure?.message || stderrLines.join('\n').trim() || 'Claude process ended unexpectedly';
            this.turn.reject(new Error(friendlyError(detail)));
            this.turn = null;
        }
    }

    handleMessage(message) {
        const turn = this.turn;
        if (!turn) return;
        turn.touch();
        if (message.type === 'stream_event' && message.parent_tool_use_id == null) {
            const delta = message.event?.type === 'content_block_delta' ? message.event.delta : null;
            if (delta?.type === 'text_delta' && delta.text) {
                turn.text += delta.text;
                turn.onText?.(turn.text);
            }
        } else if (message.type === 'result') {
            this.turn = null;
            if (message.is_error) {
                const detail = Array.isArray(message.errors) && message.errors.length ? message.errors.join('\n') : message.result || message.subtype;
                turn.reject(new Error(friendlyError(String(detail))));
            } else {
                if (!turn.text && typeof message.result === 'string') {
                    turn.text = message.result;
                    turn.onText?.(turn.text);
                }
                turn.resolve(turn.text);
            }
        }
    }

    // Text shown to Claude with the next question, e.g. answers given by the separate screenshot session
    addNote(text) {
        this.notes.push(text);
        if (this.notes.length > 10) this.notes.shift();
    }

    // content: array of Anthropic content blocks ({type:'text'} / {type:'image'}); summary: text stored for replay
    ask(content, summary, onText) {
        const run = async () => {
            if (this.closed) throw new Error('Claude session is closed');
            let blocks = content;
            if (!this.query) {
                await this.start();
                if (this.closed) throw new Error('Claude session is closed');
                if (this.history.length) {
                    const replay = this.history.map(t => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.text}`).join('\n\n');
                    blocks = [{ type: 'text', text: `Earlier in this conversation:\n\n${replay}\n\nContinue from here.` }, ...content];
                }
            }
            if (this.notes.length) {
                blocks = [{ type: 'text', text: `Context from elsewhere in this session:\n\n${this.notes.join('\n\n')}` }, ...blocks];
                this.notes = [];
            }
            const text = await new Promise((resolve, reject) => {
                let timer;
                const touch = () => {
                    clearTimeout(timer);
                    timer = setTimeout(() => {
                        // Drop the stuck process so the next question starts a fresh one
                        this.turn = null;
                        this.discardProcess();
                        reject(new Error('Claude stopped responding. Try again.'));
                    }, TURN_IDLE_TIMEOUT_MS);
                };
                this.turn = {
                    onText,
                    text: '',
                    touch,
                    resolve: value => {
                        clearTimeout(timer);
                        resolve(value);
                    },
                    reject: error => {
                        clearTimeout(timer);
                        reject(error);
                    },
                };
                touch();
                this.input.push({ type: 'user', message: { role: 'user', content: blocks }, parent_tool_use_id: null });
            });
            this.history.push({ role: 'user', text: summary }, { role: 'assistant', text });
            if (this.history.length > 40) this.history = this.history.slice(-40);
            return text;
        };
        const result = this.chain.then(run, run);
        this.chain = result.catch(() => {});
        return result;
    }

    // Stops the process but keeps the session usable: the next ask() starts a new one and replays the history
    discardProcess() {
        const query_ = this.query;
        this.query = null;
        this.input?.close();
        this.input = null;
        try {
            query_?.close();
        } catch {}
    }

    close() {
        this.closed = true;
        this.discardProcess();
        if (this.turn) {
            this.turn.reject(new Error('Claude session closed'));
            this.turn = null;
        }
    }
}

// alreadyVerified: the caller checked the sign-in moments ago (e.g. a second session in the same app run)
async function createChat({ model, systemPrompt, effort, alreadyVerified = false }) {
    if (!alreadyVerified) {
        const status = await getAuthStatus();
        if (!status.available) throw new Error(status.error || 'Claude Code binary was not found');
        if (!status.loggedIn) throw new Error('Not signed in to Claude. Click "Sign in with Claude" on the home screen.');
    }
    const chat = new ClaudeChat({ model, systemPrompt, effort });
    await chat.start();
    return chat;
}

// Asks Claude Code which models this account can use. No prompt is sent, so no tokens are used.
let modelsCache = null;
let modelsPromise = null;
function listModels(force = false) {
    if (modelsCache && !force) return Promise.resolve(modelsCache);
    // Concurrent callers share one probe instead of each starting a Claude process
    if (!modelsPromise) {
        modelsPromise = probeModels().finally(() => {
            modelsPromise = null;
        });
    }
    return modelsPromise;
}

async function probeModels() {
    const executable = resolveExecutable();
    if (!executable) return MODELS;
    const { query } = await loadSdk();
    const input = new InputQueue();
    const q = query({
        prompt: input,
        options: {
            pathToClaudeCodeExecutable: executable,
            cwd: getWorkspaceDir(),
            env: { ...process.env, ...ISOLATION_ENV },
            tools: [],
            skills: [],
            settingSources: [],
            settings: { disableAllHooks: true },
            persistSession: false,
        },
    });
    let timer;
    try {
        const init = await Promise.race([
            q.initializationResult(),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('Claude Code did not start in time')), 30000);
            }),
        ]);
        const models = (init.models || []).map(m => ({
            value: m.value,
            label: m.displayName || m.value,
            description: m.description || '',
            efforts: m.supportedEffortLevels || EFFORT_LEVELS,
        }));
        if (models.length) modelsCache = models;
        return models.length ? models : MODELS;
    } catch (error) {
        console.error('[Claude] Could not list models:', error.message);
        return MODELS;
    } finally {
        clearTimeout(timer);
        input.close();
        try {
            q.close();
        } catch {}
    }
}

// Checks the settings object sent by the renderer; returns a clean copy, or null if it is unusable
function normalizeSettings(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const modelOk = v => typeof v === 'string' && /^[A-Za-z0-9][\w.:@\[\]\/-]{0,99}$/.test(v);
    const effortOk = v => v === undefined || v === 'default' || EFFORT_LEVELS.includes(v);
    if (!modelOk(raw.model) || !modelOk(raw.imageModel) || !effortOk(raw.effort) || !effortOk(raw.imageEffort)) return null;
    return { model: raw.model, effort: raw.effort || 'default', imageModel: raw.imageModel, imageEffort: raw.imageEffort || 'default' };
}

function setupClaudeIpcHandlers() {
    ipcMain.handle('claude-auth-status', () => getAuthStatus());
    ipcMain.handle('claude-login', () => login());
    ipcMain.handle('claude-logout', () => logout());
    ipcMain.handle('claude-models', () => listModels());
}

module.exports = { MODELS, DEFAULT_MODEL, normalizeSettings, createChat, getAuthStatus, listModels, setupClaudeIpcHandlers };
