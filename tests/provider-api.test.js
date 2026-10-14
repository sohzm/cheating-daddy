const assert = require('node:assert/strict');
const http = require('node:http');
const { once, EventEmitter } = require('node:events');
const { test } = require('node:test');
const { WebSocketServer } = require('ws');
const sdk = require('@google/genai');
const { loadModule, createStorage } = require('./helpers');

async function createProvider(t, { groq = false, googleStatus = 200 } = {}) {
    const storage = createStorage(t);
    storage.initializeStorage();
    storage.setCredentials({ apiKey: 'synthetic-google-key', groqApiKey: groq ? 'synthetic-groq-key' : '' });
    const packets = [];
    const requests = [];
    const events = new EventEmitter();
    const server = http.createServer(async (request, response) => {
        let text = '';
        for await (const chunk of request) text += chunk;
        const body = JSON.parse(text);
        requests.push({ url: request.url, body });
        if (request.url !== '/groq' && googleStatus !== 200) {
            response.writeHead(googleStatus, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: { code: googleStatus, message: 'Model access denied', status: 'PERMISSION_DENIED' } }));
            events.emit('request');
            return;
        }
        response.writeHead(200, { 'Content-Type': 'text/event-stream' });
        response.end(
            request.url === '/groq'
                ? 'data: {"choices":[{"delta":{"content":"Answer"}}]}\n\ndata: [DONE]\n\n'
                : 'data: {"candidates":[{"content":{"parts":[{"text":"Screen answer"}]}}]}\n\n'
        );
        events.emit('request');
    });
    const wss = new WebSocketServer({ server });
    wss.on('connection', socket => {
        socket.on('message', data => {
            const packet = JSON.parse(data.toString());
            packets.push(packet);
            if (packet.setup) socket.send(JSON.stringify({ setupComplete: {} }));
            events.emit('packet');
        });
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const handlers = new Map();
    const ref = { current: null };
    const gemini = loadModule(
        'src/utils/gemini.js',
        {
            '@google/genai': {
                ...sdk,
                GoogleGenAI: class extends sdk.GoogleGenAI {
                    constructor(options) {
                        super({ ...options, httpOptions: { ...options.httpOptions, baseUrl } });
                    }
                },
            },
            electron: {
                BrowserWindow: {
                    getAllWindows: () => [
                        {
                            webContents: {
                                send() {},
                                executeJavaScript: () => {
                                    throw new Error('Legacy renderer storage read');
                                },
                            },
                        },
                    ],
                },
                ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
            },
            '../storage': storage,
            './cloud': {},
            './transportLogger': { startTransportLog() {}, logTransportEvent() {}, closeTransportLog() {} },
        },
        { fetch: (url, options) => fetch(url === 'https://api.groq.com/openai/v1/chat/completions' ? baseUrl + '/groq' : url, options) }
    );
    gemini.setupGeminiIpcHandlers(ref);
    t.after(async () => {
        if (ref.current) await handlers.get('close-session')(null);
        for (const socket of wss.clients) socket.terminate();
        await new Promise(resolve => wss.close(resolve));
        await new Promise(resolve => server.close(resolve));
    });
    async function waitForPacket(predicate) {
        for (;;) {
            const packet = packets.find(predicate);
            if (packet) return packet;
            await once(events, 'packet', { signal: t.signal });
        }
    }
    return { gemini, storage, packets, requests, events, handlers, ref, waitForPacket };
}

test('real SDK sends a current Live setup and honors Search off without renderer storage', { timeout: 10000 }, async t => {
    const fixture = await createProvider(t);
    fixture.storage.updatePreference('googleSearchEnabled', false);
    assert.equal((await fixture.gemini.getEnabledTools()).length, 0);
    fixture.ref.current = await fixture.gemini.initializeGeminiSession('synthetic-google-key');
    assert.ok(fixture.ref.current, 'Live connection should initialize');
    const setup = (await fixture.waitForPacket(packet => packet.setup)).setup;
    assert.equal(setup.model, 'models/gemini-3.8-live');
    assert.deepEqual(setup.generationConfig.responseModalities, ['AUDIO']);
    assert.deepEqual(setup.inputAudioTranscription, {});
    assert.deepEqual(setup.outputAudioTranscription, {});
    assert.deepEqual(setup.tools || [], []);
    assert.equal(setup.proactivity, undefined);
});

test('Search opt-in reaches the Live request', { timeout: 10000 }, async t => {
    const fixture = await createProvider(t);
    fixture.storage.updatePreference('googleSearchEnabled', true);
    fixture.ref.current = await fixture.gemini.initializeGeminiSession('synthetic-google-key');
    assert.ok(fixture.ref.current);
    assert.deepEqual((await fixture.waitForPacket(packet => packet.setup)).setup.tools, [{ googleSearch: {} }]);
});

test('typed IPC messages reach the real SDK WebSocket as text', { timeout: 10000 }, async t => {
    const fixture = await createProvider(t);
    fixture.ref.current = await fixture.gemini.initializeGeminiSession('synthetic-google-key');
    assert.ok(fixture.ref.current);
    const result = await fixture.handlers.get('send-text-message')(null, '  Explain this code  ');
    assert.equal(result.success, true);
    const received = await fixture.waitForPacket(packet => packet.realtimeInput);
    assert.equal(received.realtimeInput.text, 'Explain this code');
});

test('PCM audio keeps its declared 24 kHz format through the real SDK', { timeout: 10000 }, async t => {
    const fixture = await createProvider(t);
    fixture.ref.current = await fixture.gemini.initializeGeminiSession('synthetic-google-key');
    assert.ok(fixture.ref.current);
    await fixture.gemini.sendAudioToGemini('AAAA', fixture.ref);
    const received = await fixture.waitForPacket(packet => packet.realtimeInput?.audio);
    assert.deepEqual(received.realtimeInput.audio, { data: 'AAAA', mimeType: 'audio/pcm;rate=24000' });
});

test('Gemini screenshots reach HTTP streaming with the current model and JPEG payload', { timeout: 10000 }, async t => {
    const fixture = await createProvider(t);
    const result = await fixture.gemini.sendImageToGeminiHttp('aW1hZ2U=', 'Explain the screen');
    assert.equal(result.success, true);
    assert.equal(result.text, 'Screen answer');
    assert.equal(result.model, 'gemini-3.8-flash');
    const request = fixture.requests[0];
    assert.match(request.url, /models\/gemini-3\.8-flash:streamGenerateContent/);
    assert.deepEqual(request.body.contents[0].parts[0].inlineData, { mimeType: 'image/jpeg', data: 'aW1hZ2U=' });
});

test('saved Groq defaults migrate for both text and image requests', { timeout: 10000 }, async t => {
    const fixture = await createProvider(t, { groq: true });
    fixture.storage.setConfig({ groqModel: 'qwen/qwen3.6-27b', groqImageModel: 'qwen/qwen3.6-27b' });
    fixture.ref.current = await fixture.gemini.initializeGeminiSession('synthetic-google-key');
    assert.ok(fixture.ref.current);
    const requested = once(fixture.events, 'request');
    await fixture.handlers.get('send-text-message')(null, 'Explain this code');
    await requested;
    const result = await fixture.handlers.get('send-image-content')(null, {
        data: Buffer.alloc(1024).toString('base64'),
        prompt: 'Explain the screen',
    });
    assert.equal(result.success, true);
    assert.equal(fixture.requests.length, 2);
    for (const { body } of fixture.requests) {
        assert.equal(body.model, 'qwen/qwen3.8-27b');
        assert.equal(body.reasoning_format, 'hidden');
        assert.equal(body.reasoning_effort, 'none');
        assert.equal(body.include_reasoning, undefined);
    }
    assert.equal(fixture.requests[1].body.messages[1].content[1].type, 'image_url');
});

test('Gemini permission failures do not switch models or consume local success counts', { timeout: 10000 }, async t => {
    const fixture = await createProvider(t, { googleStatus: 403 });
    const result = await fixture.gemini.sendImageToGeminiHttp('aW1hZ2U=', 'Explain the screen');
    assert.equal(result.success, false);
    assert.match(result.error, /Model access denied/);
    assert.equal(fixture.requests.length, 1);
    assert.match(fixture.requests[0].url, /models\/gemini-3\.8-flash:streamGenerateContent/);
    assert.equal(fixture.storage.getTodayLimits().flash.count, 0);
});
