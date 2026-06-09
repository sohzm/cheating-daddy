// Realtime speech-to-text via the OpenAI Realtime API (WebSocket transport), using an OpenAI API
// key obtained by token-exchanging the ChatGPT subscription id_token (codex obtain_api_key flow).
// Realtime lives on api.openai.com (NOT the Cloudflare-fronted chatgpt.com backend), so a plain WS
// with the exchanged API key is the right transport. Model + pcm rate per openai/codex.
//
// NOTE: whether the subscription-exchanged API key is actually authorized (and not separately
// billed) for realtime is validated live — the handshake response is logged verbosely.

const WebSocket = require('ws');
const { obtainApiKey } = require('./openaiOAuth');

const REALTIME_URL = 'wss://api.openai.com/v1/realtime?intent=transcription';
const TRANSCRIBE_MODEL = 'gpt-4o-mini-transcribe';
const SAMPLE_RATE = 24000;

let ws = null;
let ready = false;
let callbacks = {};

function sessionUpdateMessage() {
    return {
        type: 'session.update',
        session: {
            type: 'transcription',
            audio: {
                input: {
                    format: { type: 'audio/pcm', rate: SAMPLE_RATE },
                    transcription: { model: TRANSCRIBE_MODEL },
                    turn_detection: { type: 'server_vad', silence_duration_ms: 500 },
                },
            },
        },
    };
}

// callbacks: { onTranscript(text), onReady(), onError(err) }
async function startRealtimeTranscription(cbs = {}) {
    callbacks = cbs;
    const apiKey = await obtainApiKey();
    console.log('[Realtime] obtained API key via token-exchange:', apiKey ? 'ok' : 'EMPTY');
    console.log('[Realtime] connecting WS:', REALTIME_URL);

    ws = new WebSocket(REALTIME_URL, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'OpenAI-Beta': 'realtime=v1',
        },
    });

    ws.on('open', () => {
        ready = true;
        console.log('[Realtime] WS open — sending session.update (transcription)');
        ws.send(JSON.stringify(sessionUpdateMessage()));
        if (callbacks.onReady) callbacks.onReady();
    });

    ws.on('message', data => {
        let evt;
        try {
            evt = JSON.parse(data.toString());
        } catch {
            return;
        }
        if (evt.type === 'conversation.item.input_audio_transcription.completed') {
            const text = evt.transcript || '';
            console.log('[Realtime] transcript:', JSON.stringify(text));
            if (text && callbacks.onTranscript) callbacks.onTranscript(text);
        } else if (evt.type === 'error') {
            console.error('[Realtime] error event:', JSON.stringify(evt.error || evt).slice(0, 600));
        } else {
            console.log('[Realtime] event:', evt.type);
        }
    });

    ws.on('unexpected-response', (req, res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
            console.error(`[Realtime] handshake rejected HTTP ${res.statusCode}:`, body.slice(0, 600));
            ready = false;
            if (callbacks.onError) callbacks.onError(new Error(`WS handshake ${res.statusCode}`));
        });
    });

    ws.on('close', (code, reason) => {
        console.log('[Realtime] WS closed', code, reason ? reason.toString().slice(0, 200) : '');
        ready = false;
    });

    ws.on('error', err => {
        console.error('[Realtime] WS error:', err.message);
        ready = false;
        if (callbacks.onError) callbacks.onError(err);
    });
}

function appendAudio(pcm24kBuffer) {
    if (!ws || !ready || ws.readyState !== WebSocket.OPEN) {
        return;
    }
    ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: pcm24kBuffer.toString('base64') }));
}

function isRealtimeReady() {
    return ready;
}

function stopRealtimeTranscription() {
    if (ws) {
        try {
            ws.close();
        } catch {
            // ignore
        }
        ws = null;
    }
    ready = false;
    callbacks = {};
}

module.exports = {
    startRealtimeTranscription,
    appendAudio,
    isRealtimeReady,
    stopRealtimeTranscription,
};
