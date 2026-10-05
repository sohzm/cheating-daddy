const { sendToRenderer, saveConversationTurn, saveScreenAnalysis } = require('./gemini');

const MAX_HISTORY_MESSAGES = 20;
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant.';

let chatCompletionsUrl = null;
let apiKey = null;
let model = null;
let label = 'API';
let systemPrompt = null;
let conversationHistory = [];
let isActive = false;

function buildChatCompletionsUrl(rootUrl) {
    const trimmed = rootUrl.trim().replace(/\/+$/, '');
    if (trimmed.endsWith('/chat/completions')) {
        return trimmed;
    }
    return `${trimmed}/chat/completions`;
}

function buildModelsUrl(rootUrl) {
    const trimmed = rootUrl.trim().replace(/\/+$/, '');
    if (trimmed.endsWith('/chat/completions')) {
        return `${trimmed.slice(0, -'/chat/completions'.length)}/models`;
    }
    return `${trimmed}/models`;
}

async function listAvailableModels(config) {
    const url = buildModelsUrl(config.baseUrl);
    const headers = {};
    if (config.apiKey) {
        headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
        let detail = '';
        try {
            const payload = await response.json();
            detail = payload?.error?.message || '';
        } catch {
            // The response body was not JSON.
        }
        const statusHint = response.status === 401 ? ' (check the API key)' : '';
        throw new Error(`${config.label || 'API'} returned HTTP ${response.status}${statusHint}${detail ? `: ${detail}` : ''}`);
    }

    const payload = await response.json();
    const entries = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.models) ? payload.models : [];
    const models = entries.map(entry => (typeof entry === 'string' ? entry : entry?.id || entry?.name || '')).filter(Boolean);
    return [...new Set(models)].sort((a, b) => a.localeCompare(b));
}

function initializeApiClient(config) {
    chatCompletionsUrl = buildChatCompletionsUrl(config.baseUrl);
    apiKey = config.apiKey || null;
    model = config.model;
    label = config.label || 'API';
    systemPrompt = config.systemPrompt;
    conversationHistory = [];
    isActive = true;
}

function closeApiClient() {
    chatCompletionsUrl = null;
    apiKey = null;
    model = null;
    label = 'API';
    systemPrompt = null;
    conversationHistory = [];
    isActive = false;
}

function trimConversationHistory() {
    if (conversationHistory.length > MAX_HISTORY_MESSAGES) {
        conversationHistory = conversationHistory.slice(-MAX_HISTORY_MESSAGES);
    }
}

async function readStreamingResponse(response, onText) {
    const decoder = new TextDecoder();
    let pendingText = '';
    let fullText = '';

    for await (const chunk of response.body) {
        pendingText += decoder.decode(chunk, { stream: true });
        const lines = pendingText.split('\n');
        pendingText = lines.pop() || '';

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            const data = line.slice(6).trim();
            if (!data || data === '[DONE]') continue;

            const event = JSON.parse(data);
            const token = event.choices?.[0]?.delta?.content || '';
            if (!token) continue;

            fullText += token;
            onText(fullText);
        }
    }

    return fullText;
}

async function requestCompletion(messages, onText) {
    if (!isActive || !chatCompletionsUrl) {
        throw new Error('No active API session');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(chatCompletionsUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model,
            messages,
            stream: true,
        }),
    });

    if (!response.ok || !response.body) {
        let detail = '';
        try {
            const payload = await response.json();
            detail = payload?.error?.message || '';
        } catch {
            // The response body was not JSON.
        }
        const statusHint = response.status === 401 ? ' (check the API key)' : '';
        throw new Error(`${label} returned HTTP ${response.status}${statusHint}${detail ? `: ${detail}` : ''}`);
    }

    return readStreamingResponse(response, onText);
}

async function sendApiText(text) {
    const userMessage = { role: 'user', content: text.trim() };
    conversationHistory.push(userMessage);
    trimConversationHistory();

    const messages = [{ role: 'system', content: systemPrompt || DEFAULT_SYSTEM_PROMPT }, ...conversationHistory.slice(0, -1), userMessage];

    let isFirst = true;
    const fullText = await requestCompletion(messages, chunk => {
        sendToRenderer(isFirst ? 'new-response' : 'update-response', chunk);
        isFirst = false;
    });

    if (fullText.trim()) {
        conversationHistory.push({ role: 'assistant', content: fullText.trim() });
        saveConversationTurn(text, fullText);
    }

    return fullText;
}

async function sendApiImage(base64Data, prompt) {
    conversationHistory.push({ role: 'user', content: prompt });
    trimConversationHistory();

    const userMessage = {
        role: 'user',
        content: [
            { type: 'text', text: prompt },
            {
                type: 'image_url',
                image_url: {
                    url: `data:image/jpeg;base64,${base64Data}`,
                },
            },
        ],
    };
    const messages = [{ role: 'system', content: systemPrompt || DEFAULT_SYSTEM_PROMPT }, ...conversationHistory.slice(0, -1), userMessage];

    let isFirst = true;
    const fullText = await requestCompletion(messages, chunk => {
        sendToRenderer(isFirst ? 'new-response' : 'update-response', chunk);
        isFirst = false;
    });

    if (fullText.trim()) {
        conversationHistory.push({ role: 'assistant', content: fullText.trim() });
        saveScreenAnalysis(prompt, fullText, model);
    }

    return fullText;
}

module.exports = {
    initializeApiClient,
    closeApiClient,
    sendApiText,
    sendApiImage,
    listAvailableModels,
};
