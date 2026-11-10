const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { DeepSeekSession } = require('../src/utils/deepseek');
const { createKeyStore } = require('../src/utils/deepseekCredentials');

function setup(t, saveHistory, env = { DEEPSEEK_API_KEY: 'test-key' }) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'deepseek-ipc-'));
    t.after(() => fs.rmSync(directory, { force: true, recursive: true }));
    const handlers = new Map(),
        events = [],
        requests = [],
        authorizations = [];
    let logStarts = 0;
    const filename = path.resolve(__dirname, '../src/utils/gemini.js');
    const realRequire = createRequire(filename);
    const mocks = {
        electron: {
            ipcMain: { handle: (name, callback) => handlers.set(name, callback) },
            BrowserWindow: { getAllWindows: () => [{ webContents: { send: (...args) => events.push(args) } }] },
            safeStorage: {},
        },
        '../storage': {
            getConfigDir: () => directory,
            getPreferences: () => ({
                deepseekSaveHistory: saveHistory,
                selectedProfile: 'interview',
                selectedLanguage: 'ru-RU',
                customPrompt: 'Context',
            }),
        },
        './deepseekCredentials': { createKeyStore: options => createKeyStore({ ...options, env }) },
        './transportLogger': { startTransportLog: () => logStarts++, closeTransportLog: () => {}, logTransportEvent: () => {} },
        './deepseek': {
            DeepSeekSession: class extends DeepSeekSession {
                constructor(options) {
                    super({
                        ...options,
                        fetchImpl: async (url, request) => {
                            requests.push(JSON.parse(request.body));
                            authorizations.push(request.headers.Authorization);
                            return {
                                ok: true,
                                body: (async function* () {
                                    yield new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Ответ"}}]}\ndata: [DONE]\n');
                                })(),
                            };
                        },
                    });
                }
            },
        },
    };
    const module = { exports: {} };
    vm.runInNewContext(
        fs.readFileSync(filename, 'utf8'),
        {
            require: name => mocks[name] || realRequire(name),
            module,
            global: {},
            process,
            Buffer,
            console: { log() {}, error() {}, warn() {} },
            setTimeout,
            clearTimeout,
        },
        { filename }
    );
    module.exports.setupGeminiIpcHandlers({ current: null });
    return { invoke: (name, ...args) => handlers.get(name)({}, ...args), events, requests, authorizations, logStarts: () => logStarts, directory };
}

test('without a keyring, entered key starts DeepSeek, survives session close, and can be forgotten', async t => {
    const app = setup(t, false, {});
    const status = await app.invoke('deepseek:set-key', 'sk-temporary-test');
    assert.equal(status.success, true);
    assert.equal(status.storage, 'memory');
    assert.equal(JSON.stringify(status).includes('sk-temporary-test'), false);
    assert.equal((await app.invoke('initialize-deepseek')).success, true);
    await app.invoke('send-text-message', 'Question');
    assert.equal(app.authorizations[0], 'Bearer sk-temporary-test');
    await app.invoke('close-session');
    assert.equal((await app.invoke('deepseek:key-status')).storage, 'memory');
    assert.deepEqual(fs.readdirSync(app.directory), []);
    assert.equal((await app.invoke('deepseek:set-key', '')).hasKey, false);
    assert.equal((await app.invoke('initialize-deepseek')).success, false);
});

test('DeepSeek IPC routes text and screen, preserves language, and writes no private-session data', async t => {
    const app = setup(t, false);
    assert.equal((await app.invoke('deepseek:key-status')).hasKey, true);
    assert.equal((await app.invoke('initialize-deepseek')).success, true);
    assert.equal((await app.invoke('send-text-message', 'Question')).success, true);
    assert.equal((await app.invoke('send-image-content', { data: '/9j/AA==', prompt: 'Read screen' })).success, true);
    assert.match(app.requests[0].messages[0].content, /ru-RU/);
    assert.equal(
        app.events.some(([name]) => name.startsWith('save-')),
        false
    );
    assert.equal(app.logStarts(), 0);
    assert.deepEqual(fs.readdirSync(app.directory), []);
    assert.equal((await app.invoke('send-audio-content', { data: 'AAAA' })).success, false);
    for (const value of [null, undefined, {}, { data: null }]) {
        assert.equal((await app.invoke('send-image-content', value)).success, false);
    }
    assert.equal((await app.invoke('close-session')).success, true);
    assert.equal((await app.invoke('send-text-message', 'After close')).success, false);
});

test('history is persisted only after explicit opt-in and excludes screenshot bytes', async t => {
    const app = setup(t, true);
    await app.invoke('initialize-deepseek');
    await app.invoke('send-text-message', 'Question');
    await app.invoke('send-image-content', { data: '/9j/AA==', prompt: 'Read screen' });
    const saves = app.events.filter(([name]) => name.startsWith('save-'));
    assert.equal(saves.length, 3);
    assert.equal(app.logStarts(), 1);
    assert.equal(JSON.stringify(saves).includes('/9j/AA=='), false);
    await app.invoke('close-session');
});
