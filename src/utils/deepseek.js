const API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-flash';
const MAX_TEXT_LENGTH = 32000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function validateText(text) {
    if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_LENGTH) {
        throw new Error('Enter a message between 1 and 32,000 characters.');
    }
    return text.trim();
}

function imageContent(data, prompt) {
    if (typeof data !== 'string' || data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
        throw new Error('Invalid screenshot. Use a JPEG or PNG image up to 10 MB.');
    }
    const bytes = Buffer.from(data, 'base64');
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if ((!jpeg && !png) || bytes.length > MAX_IMAGE_BYTES) throw new Error('Screenshot must be JPEG or PNG, up to 10 MB.');
    return [
        { type: 'text', text: validateText(prompt || 'Read the screen and help with the visible task. Mention any text you cannot read reliably.') },
        { type: 'image_url', image_url: { url: `data:image/${jpeg ? 'jpeg' : 'png'};base64,${data}`, detail: 'high' } },
    ];
}

// SSE frames and UTF-8 characters can be split across arbitrary network chunks.
async function readCompletion(body, onText, signal) {
    if (!body) throw new Error('DeepSeek returned no response stream.');
    const decoder = new TextDecoder();
    let pending = '';
    let answer = '';
    let finished = false;
    function consume(line) {
        if (!line.startsWith('data:')) return;
        const data = line.slice(5).trim();
        if (!data) return;
        if (data === '[DONE]') {
            finished = true;
            return;
        }
        const event = JSON.parse(data);
        if (event.error) throw new Error('DeepSeek interrupted the response. Please retry.');
        const choice = event.choices?.[0];
        if (choice?.finish_reason === 'length') throw new Error('DeepSeek reached the response limit. Try a shorter question or disable thinking.');
        if (choice?.finish_reason === 'content_filter') throw new Error('DeepSeek could not answer this request.');
        if (choice?.finish_reason === 'stop') finished = true;
        const text = choice?.delta?.content;
        if (typeof text === 'string' && text) {
            answer += text;
            onText(answer);
        }
    }
    for await (const chunk of body) {
        if (signal?.aborted) throw new Error('Request cancelled.');
        pending += decoder.decode(chunk, { stream: true });
        const lines = pending.split('\n');
        pending = lines.pop();
        for (const line of lines) consume(line);
    }
    pending += decoder.decode();
    if (pending.trim()) consume(pending);
    if (!finished) throw new Error('DeepSeek connection ended before the answer was complete. Please retry.');
    if (!answer.trim()) throw new Error('DeepSeek returned an empty answer. Try disabling thinking.');
    return answer;
}

function httpError(status) {
    const messages = {
        400: 'DeepSeek rejected the request. Check model/image support in the current API documentation.',
        401: 'Invalid DeepSeek API key. Replace it in Home → DeepSeek.',
        402: 'Your DeepSeek balance is insufficient. Top up your API account.',
        403: 'DeepSeek denied access to this model or account.',
        404: 'DeepSeek model or endpoint is unavailable. Check the current API documentation.',
        413: 'Screenshot is too large. Lower the image quality and retry.',
        422: 'DeepSeek could not process the request.',
        429: 'DeepSeek rate limit reached. Wait a moment and retry.',
        500: 'DeepSeek server error. Please retry later.',
        503: 'DeepSeek is overloaded. Please retry later.',
    };
    return messages[status] || `DeepSeek request failed (HTTP ${status}).`;
}

class DeepSeekSession {
    constructor({ apiKey, systemPrompt, thinking = false, fetchImpl = globalThis.fetch, onEvent = () => {}, onTurn = () => {}, timeoutMs = 120000 }) {
        if (typeof apiKey !== 'string' || !apiKey.trim() || apiKey.length > 512 || /\s/.test(apiKey.trim())) {
            throw new Error('Add a valid DeepSeek API key in Home → DeepSeek.');
        }
        this.apiKey = apiKey.trim();
        this.systemPrompt = systemPrompt;
        this.thinking = thinking;
        this.fetch = fetchImpl;
        this.onEvent = onEvent;
        this.onTurn = onTurn;
        this.timeoutMs = timeoutMs;
        this.history = [];
        this.controller = null;
        this.closed = false;
    }

    async send(text, image) {
        if (this.closed) return { success: false, cancelled: true, error: 'Session closed.' };
        if (this.controller) return { success: false, busy: true, error: 'DeepSeek is still answering. Wait for the current response.' };
        const controller = new AbortController();
        this.controller = controller;
        let timedOut = false;
        const timeout = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, this.timeoutMs);
        try {
            const content = image === undefined ? validateText(text) : imageContent(image, text);
            const userMessage = { role: 'user', content };
            // Retain only the most recent screenshot, including for text follow-up questions.
            const history =
                image === undefined
                    ? this.history
                    : this.history.map(message => ({
                          ...message,
                          content: Array.isArray(message.content) ? message.content[0].text + '\n[Previous screenshot]' : message.content,
                      }));
            this.onEvent('update-status', 'DeepSeek: generating...');
            const response = await this.fetch(API_URL, {
                method: 'POST',
                headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [{ role: 'system', content: this.systemPrompt }, ...history, userMessage],
                    stream: true,
                    thinking: { type: this.thinking ? 'enabled' : 'disabled' },
                    max_tokens: this.thinking ? 16384 : 8192,
                }),
                signal: controller.signal,
            });
            if (!response.ok) throw new Error(httpError(response.status));
            let first = true;
            const answer = await readCompletion(
                response.body,
                partial => {
                    if (this.closed || controller.signal.aborted) return;
                    this.onEvent(first ? 'new-response' : 'update-response', partial);
                    first = false;
                },
                controller.signal
            );
            if (this.closed || controller.signal.aborted) throw new Error('Request cancelled.');
            this.history = [...history, userMessage, { role: 'assistant', content: answer }].slice(-12);
            // Keep context bounded even when users paste long documents.
            while (
                this.history.length > 2 &&
                this.history.reduce(
                    (sum, message) => sum + (Array.isArray(message.content) ? message.content[0].text.length : message.content.length),
                    0
                ) > 64000
            ) {
                this.history.splice(0, 2);
            }
            this.onTurn({ prompt: Array.isArray(content) ? content[0].text : content, answer, image: image !== undefined, model: MODEL });
            this.onEvent('update-status', 'DeepSeek ready — text & screenshots');
            return { success: true, model: MODEL };
        } catch (error) {
            if (this.closed) return { success: false, cancelled: true, error: 'Session closed.' };
            const message = timedOut
                ? 'DeepSeek request timed out. Please retry.'
                : error instanceof TypeError
                  ? 'Cannot connect to DeepSeek. Check your connection.'
                  : error.message;
            this.onEvent('update-status', message);
            return { success: false, error: message };
        } finally {
            clearTimeout(timeout);
            if (this.controller === controller) this.controller = null;
        }
    }

    close() {
        this.closed = true;
        this.controller?.abort();
        this.controller = null;
        this.history = [];
        this.apiKey = '';
        this.systemPrompt = '';
    }
}

module.exports = { DeepSeekSession, readCompletion, imageContent, MODEL };
