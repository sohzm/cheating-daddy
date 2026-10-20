import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { validateRequest, scriptBlock, questionText, parseAnswer } = createRequire(import.meta.url)('../src/utils/scriptSync.js');

const BEATS = [
    { at: '0:28', scene: 'Scene 1 — Setup', action: 'Open the inputs folder.', narration: '' },
    { at: '3:55', scene: 'Scene 2 — AutoCAD', action: 'Open AutoCAD on the drawing.', narration: 'Here is the plan.' },
];

test('requests are validated before anything leaves the app', () => {
    assert.throws(() => validateRequest(null), /No script beats/);
    assert.throws(() => validateRequest({ beats: [] }), /no beats/);
    assert.throws(() => validateRequest({ beats: new Array(1001).fill({ action: 'x' }) }), /more than 1000/);

    const { beats, currentIndex } = validateRequest({ beats: [...BEATS, { action: 'a\u0000b'.padEnd(5000, 'c') }], currentIndex: 99 });
    assert.equal(currentIndex, 2);
    assert.equal(beats[2].action.length, 2000);
    assert.equal(beats[2].action.includes('\u0000'), false);
    assert.equal(validateRequest({ beats: BEATS, currentIndex: 'x' }).currentIndex, -1);
});

test('the script is sent as one numbered line per beat', () => {
    assert.equal(
        scriptBlock(validateRequest({ beats: BEATS }).beats),
        '<script>\n[0] (0:28) Scene 1 — Setup — Open the inputs folder.\n[1] (3:55) Scene 2 — AutoCAD — Open AutoCAD on the drawing. / says: Here is the plan.\n</script>'
    );
    assert.match(questionText(1), /currently showing beat 1/);
    assert.match(questionText(-1), /not reached the first beat/);
});

test('answers are checked against the script', () => {
    assert.deepEqual(parseAnswer('{"beat": 1, "confidence": "high", "reason": "AutoCAD is open"}', 2), {
        beat: 1,
        confidence: 'high',
        reason: 'AutoCAD is open',
    });
    // A model that wraps its JSON in prose still parses; an unknown confidence counts as low.
    assert.equal(parseAnswer('Sure: {"beat": 0, "confidence": "certain", "reason": "x"}', 2).confidence, 'low');
    assert.throws(() => parseAnswer('{"beat": 2, "confidence": "high", "reason": "x"}', 2), /not in the script/);
    assert.throws(() => parseAnswer('{"beat": 0.5, "confidence": "high", "reason": "x"}', 2), /not in the script/);
    assert.throws(() => parseAnswer('no idea', 2), /JSON/);
});

const { askClaude, askDeepSeek } = createRequire(import.meta.url)('../src/utils/scriptSync.js');

/** Swaps global fetch for one request, recording what was sent. */
async function withFetch(reply, run) {
    const original = globalThis.fetch;
    const sent = {};
    globalThis.fetch = async (url, init) => {
        sent.url = String(url);
        sent.headers = new Headers(init.headers);
        sent.body = JSON.parse(init.body);
        return new Response(JSON.stringify(reply), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    try {
        return { result: await run(), sent };
    } finally {
        globalThis.fetch = original;
    }
}

test('Claude gets the screenshot, the script and a JSON schema', async () => {
    const reply = {
        id: 'msg_1',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [{ type: 'text', text: '{"beat":1,"confidence":"medium","reason":"AutoCAD is open"}' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 10 },
    };
    const { result, sent } = await withFetch(reply, () => askClaude('sk-ant-test', validateRequest({ beats: BEATS }).beats, 0, 'AAAA'));
    assert.deepEqual(result, { beat: 1, confidence: 'medium', reason: 'AutoCAD is open' });
    assert.match(sent.url, /\/v1\/messages/);
    assert.equal(sent.headers.get('x-api-key'), 'sk-ant-test');
    assert.match(sent.headers.get('anthropic-beta'), /server-side-fallback-2026-07-01/);
    assert.equal(sent.body.model, 'claude-opus-5-5');
    assert.equal(sent.body.fallbacks, 'default');
    assert.equal(sent.body.output_config.format.type, 'json_schema');
    assert.match(sent.body.system[1].text, /\[1\] \(3:55\)/);
    const [image, question] = sent.body.messages[0].content;
    assert.deepEqual(image.source, { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' });
    assert.match(question.text, /currently showing beat 0/);
});

test('DeepSeek gets the same question in its OpenAI-style format', async () => {
    const reply = { choices: [{ message: { content: '{"beat":0,"confidence":"high","reason":"Folder open"}' } }] };
    const { result, sent } = await withFetch(reply, () =>
        askDeepSeek('sk-test', 'deepseek-v4-flash-vision-exp', validateRequest({ beats: BEATS }).beats, -1, 'BBBB')
    );
    assert.equal(result.beat, 0);
    assert.equal(sent.url, 'https://api.deepseek.com/chat/completions');
    assert.equal(sent.headers.get('authorization'), 'Bearer sk-test');
    assert.equal(sent.body.model, 'deepseek-v4-flash-vision-exp');
    assert.equal(sent.body.messages[1].content[0].image_url.url, 'data:image/jpeg;base64,BBBB');
});
