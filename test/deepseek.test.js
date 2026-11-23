const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DeepSeekSession, readCompletion, imageContent } = require('../src/utils/deepseek');

const screenshot = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString('base64');
const event = content => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\r\n\r\n`;
function response(text = 'Ответ') {
    const bytes = new TextEncoder().encode(event(text) + 'data: [DONE]\n\n');
    return {
        ok: true,
        body: (async function* () {
            for (const byte of bytes) yield Uint8Array.of(byte);
        })(),
    };
}
function createSession(options = {}) {
    return new DeepSeekSession({ apiKey: 'test-key', systemPrompt: 'Test', fetchImpl: async () => response(), ...options });
}

test('SSE handles single-byte UTF-8 chunks, CRLF, keepalives, reasoning and an unterminated DONE line', async () => {
    const source =
        ': keepalive\n\n' + 'data: {"choices":[{"delta":{"reasoning_content":"private reasoning"}}]}\n' + event('Привет 👋') + 'data: [DONE]';
    const bytes = new TextEncoder().encode(source);
    const body = (async function* () {
        for (const byte of bytes) yield Uint8Array.of(byte);
    })();
    const updates = [];
    assert.equal(await readCompletion(body, text => updates.push(text)), 'Привет 👋');
    assert.deepEqual(updates, ['Привет 👋']);
});

test('incomplete, malformed, empty, and length-limited streams fail', async () => {
    for (const data of [event('partial'), 'data: nope\n', 'data: [DONE]\n', 'data: {"choices":[{"finish_reason":"length"}]}\n']) {
        const body = (async function* () {
            yield new TextEncoder().encode(data);
        })();
        await assert.rejects(readCompletion(body, () => {}));
    }
});

test('vision payload uses official endpoint and text follow-ups keep the latest image', async () => {
    const calls = [],
        events = [],
        turns = [];
    const session = createSession({
        fetchImpl: async (url, options) => {
            calls.push({ url, ...options, body: JSON.parse(options.body) });
            return response();
        },
        onEvent: (...args) => events.push(args),
        onTurn: turn => turns.push(turn),
    });
    assert.equal((await session.send('Read this', screenshot)).success, true);
    await session.send('Explain the answer');
    await session.send('Next page', screenshot);
    assert.equal(calls[0].url, 'https://api.deepseek.com/chat/completions');
    assert.equal(calls[0].headers.Authorization, 'Bearer test-key');
    assert.equal(calls[0].body.model, 'deepseek-flash');
    assert.deepEqual(calls[0].body.thinking, { type: 'disabled' });
    assert.equal(calls[0].body.messages[1].content[1].image_url.url, `data:image/png;base64,${screenshot}`);
    assert.equal(calls[1].body.messages[1].content[1].type, 'image_url');
    assert.equal(typeof calls[2].body.messages[1].content, 'string');
    assert.equal(calls[2].body.messages.filter(message => Array.isArray(message.content)).length, 1);
    assert.equal(turns[0].image, true);
    assert.equal(turns[1].image, false);
    assert.equal(JSON.stringify(turns).includes(screenshot), false);
    assert.equal(
        events.some(([channel, text]) => channel === 'new-response' && text === 'Ответ'),
        true
    );
});

test('all documented HTTP failures are actionable and never commit a failed turn', async () => {
    for (const status of [400, 401, 402, 403, 404, 413, 422, 429, 500, 503]) {
        const session = createSession({ fetchImpl: async () => ({ ok: false, status }) });
        const result = await session.send('Question');
        assert.equal(result.success, false);
        assert.ok(result.error.length > 20);
        assert.deepEqual(session.history, []);
        assert.equal(session.controller, null);
    }
});

test('closing aborts inflight requests, clears secrets/context, and suppresses late UI events', async () => {
    let release, signal;
    const events = [],
        turns = [];
    const session = createSession({
        fetchImpl: async (_, options) => {
            signal = options.signal;
            await new Promise(resolve => {
                release = resolve;
            });
            return response();
        },
        onEvent: (...args) => events.push(args),
        onTurn: turn => turns.push(turn),
    });
    const pending = session.send('Question');
    const busy = await session.send('Second question');
    assert.equal(busy.success, false);
    session.close();
    assert.equal(signal.aborted, true);
    const eventCount = events.length;
    release();
    assert.equal((await pending).cancelled, true);
    assert.equal(events.length, eventCount);
    assert.deepEqual(turns, []);
    assert.deepEqual(session.history, []);
    assert.equal(session.apiKey, '');
    assert.equal((await session.send('late')).cancelled, true);
});

test('timeout aborts the request and releases the session for retry', async () => {
    const session = createSession({
        timeoutMs: 10,
        fetchImpl: (_, { signal }) =>
            new Promise((resolve, reject) => {
                signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
            }),
    });
    const result = await session.send('Question');
    assert.match(result.error, /timed out/);
    session.fetch = async () => response();
    assert.equal((await session.send('Retry')).success, true);
});

test('invalid IPC values are rejected before network access', async () => {
    let calls = 0;
    const session = createSession({
        fetchImpl: async () => {
            calls++;
            return response();
        },
    });
    for (const text of [null, 42, {}, '', ' ', 'a'.repeat(32001)]) assert.equal((await session.send(text)).success, false);
    for (const data of [null, 42, '', '@@', Buffer.from('not an image').toString('base64'), 'A'.repeat(15 * 1024 * 1024)]) {
        assert.throws(() => imageContent(data, 'Read'));
    }
    assert.equal(calls, 0);
    assert.throws(() => createSession({ apiKey: 'bad\nkey' }));
});

test('history stays bounded and thinking is explicitly opt-in', async () => {
    let body;
    const session = createSession({
        thinking: true,
        fetchImpl: async (_, options) => {
            body = JSON.parse(options.body);
            return response();
        },
    });
    for (let i = 0; i < 15; i++) await session.send(`Question ${i}`);
    assert.equal(session.history.length, 12);
    assert.equal(session.history[0].content, 'Question 9');
    assert.deepEqual(body.thinking, { type: 'enabled' });
    assert.equal(body.max_tokens, 16384);
});
