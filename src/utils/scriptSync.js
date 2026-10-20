// Script follow-along: screenshot the screen, ask a vision model which beat of
// the loaded script the person is on, and hand the answer back to the Script
// view. Runs in the main process so API keys never leave it.

const Anthropic = require('@anthropic-ai/sdk');
const storage = require('../storage');

const CLAUDE_MODEL = 'claude-opus-5-5';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash-vision-exp';
const MAX_BEATS = 1000;
const MAX_BEAT_CHARS = 2000;
const SCREENSHOT_WIDTH = 1280;
const REQUEST_TIMEOUT_MS = 30000;

const ANSWER_SCHEMA = {
    type: 'object',
    properties: {
        beat: { type: 'integer', description: 'Index of the beat the person is on now' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        reason: { type: 'string', description: 'One short sentence: what on screen shows this' },
    },
    required: ['beat', 'confidence', 'reason'],
    additionalProperties: false,
};

const INSTRUCTIONS = `You help someone follow a recording script. They are working through the script's beats in order, and each request gives you a screenshot of their screen right now.

Decide which beat they are on: the beat whose action best matches what the screen shows, judging by the app that is open, the file or view in it, and any text or dialog on screen. People move forward through the script, so when two beats fit equally well, prefer the one at or just after the beat the player is currently showing.

Use confidence "low" when the screen does not clearly match any beat (a blank desktop, an unrelated window), and then return the beat the player is currently showing.

Answer with JSON only: {"beat": <index>, "confidence": "high" | "medium" | "low", "reason": "<one short sentence>"}.`;

// ── Request validation ──

function cleanText(value) {
    return String(value == null ? '' : value)
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
        .slice(0, MAX_BEAT_CHARS);
}

/** Validates what the renderer sent; returns { beats, currentIndex } or throws. */
function validateRequest(request) {
    if (!request || !Array.isArray(request.beats)) throw new Error('No script beats were sent');
    if (request.beats.length === 0) throw new Error('The script has no beats');
    if (request.beats.length > MAX_BEATS) throw new Error(`The script has more than ${MAX_BEATS} beats`);
    const beats = request.beats.map(beat => ({
        at: cleanText(beat && beat.at).slice(0, 12),
        scene: cleanText(beat && beat.scene).slice(0, 200),
        action: cleanText(beat && beat.action),
        narration: cleanText(beat && beat.narration),
    }));
    const index = Number(request.currentIndex);
    const currentIndex = Number.isInteger(index) ? Math.max(-1, Math.min(beats.length - 1, index)) : -1;
    return { beats, currentIndex };
}

// ── Prompt ──

/** The script as the model sees it: one numbered line per beat. Stable per script, so it caches. */
function scriptBlock(beats) {
    const lines = beats.map((beat, i) => {
        const parts = [`[${i}]`];
        if (beat.at) parts.push(`(${beat.at})`);
        if (beat.scene) parts.push(`${beat.scene} —`);
        parts.push(beat.action || '—');
        if (beat.narration) parts.push(`/ says: ${beat.narration}`);
        return parts.join(' ');
    });
    return `<script>\n${lines.join('\n')}\n</script>`;
}

function questionText(currentIndex) {
    const shown = currentIndex >= 0 ? `The player is currently showing beat ${currentIndex}.` : 'The player has not reached the first beat yet.';
    return `${shown} Which beat is the person on now?`;
}

/** Parses and checks a model answer against the script; returns { beat, confidence, reason }. */
function parseAnswer(text, beatCount) {
    let data;
    try {
        const match = String(text).match(/\{[\s\S]*\}/);
        data = JSON.parse(match ? match[0] : text);
    } catch (e) {
        throw new Error('The AI did not answer with JSON');
    }
    const beat = Number(data.beat);
    if (!Number.isInteger(beat) || beat < 0 || beat >= beatCount) throw new Error('The AI named a beat that is not in the script');
    const confidence = ['high', 'medium', 'low'].includes(data.confidence) ? data.confidence : 'low';
    return { beat, confidence, reason: cleanText(data.reason).slice(0, 300) };
}

// ── Screenshot ──

async function captureScreen() {
    const { desktopCapturer, screen, systemPreferences } = require('electron');
    // Without permission macOS still returns a screenshot, but of the wallpaper only.
    if (process.platform === 'darwin' && systemPreferences.getMediaAccessStatus('screen') !== 'granted') {
        throw new Error('Allow Screen Recording for this app in System Settings → Privacy & Security, then reopen it');
    }
    const { width, height } = screen.getPrimaryDisplay().size;
    const scale = Math.min(1, SCREENSHOT_WIDTH / width);
    const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: Math.round(width * scale), height: Math.round(height * scale) },
    });
    if (!sources.length || sources[0].thumbnail.isEmpty()) {
        throw new Error('Could not capture the screen — check screen recording permission');
    }
    return sources[0].thumbnail.toJPEG(70).toString('base64');
}

// ── Providers ──

async function askClaude(apiKey, beats, currentIndex, image) {
    const client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
    try {
        const response = await client.beta.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 2048,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            output_config: { effort: 'low', format: { type: 'json_schema', schema: ANSWER_SCHEMA } },
            system: [
                { type: 'text', text: INSTRUCTIONS },
                { type: 'text', text: scriptBlock(beats), cache_control: { type: 'ephemeral' } },
            ],
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
                        { type: 'text', text: questionText(currentIndex) },
                    ],
                },
            ],
        });
        if (response.stop_reason === 'refusal') throw new Error('Claude declined to read this screenshot');
        const text = response.content.find(block => block.type === 'text');
        if (!text) throw new Error('Claude returned no answer');
        return parseAnswer(text.text, beats.length);
    } catch (error) {
        if (error instanceof Anthropic.AuthenticationError) throw new Error('Claude rejected the API key');
        if (error instanceof Anthropic.RateLimitError) throw new Error('Claude rate limit reached — checks will resume shortly');
        if (error instanceof Anthropic.APIConnectionError) throw new Error('Could not reach Claude — check your connection');
        if (error instanceof Anthropic.APIError) throw new Error(`Claude error ${error.status}: ${error.message}`);
        throw error;
    }
}

async function askDeepSeek(apiKey, model, beats, currentIndex, image) {
    let res;
    try {
        res = await fetch(DEEPSEEK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            body: JSON.stringify({
                model,
                max_tokens: 300,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: `${INSTRUCTIONS}\n\n${scriptBlock(beats)}` },
                    {
                        role: 'user',
                        content: [
                            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
                            { type: 'text', text: questionText(currentIndex) },
                        ],
                    },
                ],
            }),
        });
    } catch (error) {
        throw new Error('Could not reach DeepSeek — check your connection');
    }
    if (res.status === 401) throw new Error('DeepSeek rejected the API key');
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`DeepSeek error ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error('DeepSeek returned no answer');
    return parseAnswer(text, beats.length);
}

// ── IPC ──

async function locate(request) {
    const { beats, currentIndex } = validateRequest(request);
    const prefs = storage.getPreferences();
    const creds = storage.getCredentials();
    const provider = prefs.scriptSyncProvider === 'deepseek' ? 'deepseek' : 'claude';
    const apiKey = ((provider === 'deepseek' ? creds.deepseekApiKey : creds.anthropicApiKey) || '').trim();
    if (!apiKey) throw new Error(`Add your ${provider === 'deepseek' ? 'DeepSeek' : 'Claude'} API key on the Script page`);

    const image = await captureScreen();
    const answer =
        provider === 'deepseek'
            ? await askDeepSeek(apiKey, (prefs.deepseekVisionModel || DEFAULT_DEEPSEEK_MODEL).trim(), beats, currentIndex, image)
            : await askClaude(apiKey, beats, currentIndex, image);
    return { ...answer, provider };
}

function setupScriptSyncIpcHandlers() {
    const { ipcMain } = require('electron');
    ipcMain.handle('script-sync:locate', async (event, request) => {
        try {
            return { success: true, data: await locate(request) };
        } catch (error) {
            console.error('Script sync failed:', error.message);
            return { success: false, error: error.message };
        }
    });
}

module.exports = {
    setupScriptSyncIpcHandlers,
    validateRequest,
    scriptBlock,
    questionText,
    parseAnswer,
    askClaude,
    askDeepSeek,
    DEFAULT_DEEPSEEK_MODEL,
};
