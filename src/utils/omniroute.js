// OmniRoute provider — OpenAI-compatible gateway (default: http://localhost:20128/v1).
// Handles text and vision completions. Audio transcription is NOT provided here;
// in omniroute mode the transcript must come from Gemini Live or a local Whisper server.

const { getConfig, getCredentials, incrementCharUsage } = require('../storage');

const DEFAULT_BASE_URL = 'http://localhost:20128/v1';
const DEFAULT_MODEL = 'auto';
const REQUEST_TIMEOUT_MS = 120000;

function getBaseUrl() {
    const configured = (getConfig().omnirouteBaseUrl || '').trim();
    return (configured || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function getApiKey() {
    return (getCredentials().omnirouteKey || '').trim();
}

function getModel() {
    return (getConfig().omnirouteModel || '').trim() || DEFAULT_MODEL;
}

function getVisionModel() {
    return (getConfig().omnirouteVisionModel || '').trim() || getModel();
}

function buildHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const key = getApiKey();
    // OmniRoute serves keyless free providers, so an empty key is still a valid setup.
    if (key) {
        headers.Authorization = `Bearer ${key}`;
    }
    return headers;
}

// Reads an OpenAI-style SSE stream, carrying partial lines across chunk
// boundaries so a token split mid-frame is never dropped.
async function readSseStream(response, onDelta) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    let fullText = '';
    let finishReason = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        pending += decoder.decode(value, { stream: true });
        const lines = pending.split('\n');
        pending = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;

            const data = trimmed.slice(5).trim();
            if (!data || data === '[DONE]') continue;

            let event;
            try {
                event = JSON.parse(data);
            } catch {
                continue; // ignore keep-alives and malformed frames
            }

            finishReason = event.choices?.[0]?.finish_reason || finishReason;
            // A gateway can report a mid-stream failure inside an SSE frame.
            if (event.error) {
                throw new Error(event.error.message || 'OmniRoute reported a stream error');
            }

            const token = event.choices?.[0]?.delta?.content || '';
            if (token) {
                fullText += token;
                onDelta(fullText);
            }
        }
    }

    return { fullText, finishReason };
}

async function streamCompletion(messages, onDelta, modelOverride) {
    const model = modelOverride || getModel();
    const url = `${getBaseUrl()}/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: buildHeaders(),
            signal: controller.signal,
            body: JSON.stringify({ model, messages, stream: true }),
        });

        if (!response.ok || !response.body) {
            const body = await response.text().catch(() => '');
            throw new Error(`OmniRoute HTTP ${response.status}: ${extractErrorMessage(body)}`);
        }

        // OmniRoute reports some failures as a plain JSON body with HTTP 200 and no
        // SSE frames. Without this check the caller would get a silent empty answer.
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('event-stream')) {
            const body = await response.text().catch(() => '');
            throw new Error(`OmniRoute: ${extractErrorMessage(body)}`);
        }

        const { fullText } = await readSseStream(response, onDelta);

        if (!fullText.trim()) {
            throw new Error('OmniRoute returned no content - check the model name and provider quota');
        }

        const inputChars = messages.reduce((sum, message) => {
            if (typeof message.content === 'string') return sum + message.content.length;
            // Vision messages carry an array of parts; only count the text ones.
            return sum + (message.content || []).reduce((n, part) => n + (part.text?.length || 0), 0);
        }, 0);
        incrementCharUsage('omniroute', model, inputChars + fullText.length);

        return { text: fullText, model };
    } finally {
        clearTimeout(timeout);
    }
}

// Pulls a human-readable message out of an OpenAI-style error body.
function extractErrorMessage(body) {
    try {
        const parsed = JSON.parse(body);
        return parsed.error?.message || parsed.message || body.slice(0, 300);
    } catch {
        return body.slice(0, 300) || 'no response body';
    }
}

function buildImageMessage(prompt, base64Data) {
    return {
        role: 'user',
        content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
        ],
    };
}

// Verifies the gateway is reachable and the key (if any) is accepted.
async function checkConnection() {
    try {
        const response = await fetch(`${getBaseUrl()}/models`, { headers: buildHeaders() });
        if (!response.ok) {
            const body = await response.text().catch(() => '');
            return { success: false, error: `HTTP ${response.status}: ${extractErrorMessage(body)}` };
        }
        const payload = await response.json();
        const models = (payload.data || []).map(entry => entry.id).filter(Boolean);
        return { success: true, models, baseUrl: getBaseUrl() };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = {
    DEFAULT_BASE_URL,
    DEFAULT_MODEL,
    getBaseUrl,
    getModel,
    getVisionModel,
    streamCompletion,
    buildImageMessage,
    checkConnection,
};
