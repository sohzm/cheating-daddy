const { GoogleGenAI, Modality } = require('@google/genai');
const { BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const { saveDebugAudio } = require('../audioUtils');
const { getSystemPrompt } = require('./prompts');
const { getAvailableModel, incrementLimitCount, getApiKey, getGroqApiKey, incrementCharUsage, getConfig, getPreferences } = require('../storage');
const { connectCloud, sendCloudAudio, sendCloudText, sendCloudImage, closeCloud, isCloudActive, setOnTurnComplete } = require('./cloud');
const { startTransportLog, logTransportEvent, closeTransportLog } = require('./transportLogger');
const { checkGeminiSetup, checkGroqSetup, listGroqModels, describeGroqKeyError, parseErrorBody } = require('./providerCheck');
const { startGroqTranscription, processGroqAudio, stopGroqTranscription } = require('./groqTranscription');

// Lazy-loaded to avoid circular dependency (localai.js imports from gemini.js)
let _localai = null;
function getLocalAi() {
    if (!_localai) _localai = require('./localai');
    return _localai;
}

// Provider mode: 'byok', 'cloud', or 'local'
let currentProviderMode = 'byok';

// Groq conversation history for context
let groqConversationHistory = [];

// Conversation tracking variables
let currentSessionId = null;
let currentTranscription = '';
let conversationHistory = [];
let screenAnalysisHistory = [];
let currentProfile = null;
let currentCustomPrompt = null;
let isInitializingSession = false;
let currentSystemPrompt = null;

function formatSpeakerResults(results) {
    let text = '';
    for (const result of results) {
        if (result.transcript && result.speakerId) {
            const speakerLabel = result.speakerId === 1 ? 'Interviewer' : 'Candidate';
            text += `[${speakerLabel}]: ${result.transcript}\n`;
        }
    }
    return text;
}

module.exports.formatSpeakerResults = formatSpeakerResults;

// Audio capture variables
let systemAudioProc = null;
let messageBuffer = '';
let groqRequestStartedForTurn = false;

const GROQ_MAX_COMPLETION_TOKENS = 4096;
const GROQ_MIN_COMPLETION_TOKENS = 1024;
const GROQ_EMPTY_RESPONSE_MESSAGE =
    'Groq reached the maximum completion-token limit before returning a final answer. Disable thinking in Home → AI responses and try again.';

// Resolved once per session by the pre-flight check so the exact casing Groq
// expects is used, and so a bad key is reported before any audio is sent.
let resolvedGroqModel = null;
let groqSetupError = null;
let groqUnavailable = false;

// The transcription that arrives mid-turn is a partial sentence. Wait for a
// short gap (or an explicit end-of-turn) before handing it to Groq.
let groqTranscriptionTimer = null;
const GROQ_TRANSCRIPTION_DEBOUNCE_MS = 900;

// Reconnection variables
let isUserClosing = false;
let sessionParams = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 2000;

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

// Build context message for session restoration
function buildContextMessage() {
    const lastTurns = conversationHistory.slice(-20);
    const validTurns = lastTurns.filter(turn => turn.transcription?.trim() && turn.ai_response?.trim());

    if (validTurns.length === 0) return null;

    const contextLines = validTurns.map(turn => `[Interviewer]: ${turn.transcription.trim()}\n[Your answer]: ${turn.ai_response.trim()}`);

    return `Session reconnected. Here's the conversation so far:\n\n${contextLines.join('\n\n')}\n\nContinue from here.`;
}

// Conversation management functions
function initializeNewSession(profile = null, customPrompt = null) {
    currentSessionId = Date.now().toString();
    startTransportLog(currentSessionId);
    currentTranscription = '';
    groqRequestStartedForTurn = false;
    cancelPendingGroqTranscription();
    conversationHistory = [];
    screenAnalysisHistory = [];
    groqConversationHistory = [];
    currentProfile = profile;
    currentCustomPrompt = customPrompt;
    console.log('New conversation session started:', currentSessionId, 'profile:', profile);

    // Save initial session with profile context
    if (profile) {
        sendToRenderer('save-session-context', {
            sessionId: currentSessionId,
            profile: profile,
            customPrompt: customPrompt || '',
        });
    }
}

function saveConversationTurn(transcription, aiResponse) {
    if (!currentSessionId) {
        initializeNewSession();
    }

    const conversationTurn = {
        timestamp: Date.now(),
        transcription: transcription.trim(),
        ai_response: aiResponse.trim(),
    };

    conversationHistory.push(conversationTurn);
    console.log('Saved conversation turn:', conversationTurn);

    // Send to renderer to save in IndexedDB
    sendToRenderer('save-conversation-turn', {
        sessionId: currentSessionId,
        turn: conversationTurn,
        fullHistory: conversationHistory,
    });
}

function saveScreenAnalysis(prompt, response, model) {
    if (!currentSessionId) {
        initializeNewSession();
    }

    const analysisEntry = {
        timestamp: Date.now(),
        prompt: prompt,
        response: response.trim(),
        model: model,
    };

    screenAnalysisHistory.push(analysisEntry);
    console.log('Saved screen analysis:', analysisEntry);

    // Send to renderer to save
    sendToRenderer('save-screen-analysis', {
        sessionId: currentSessionId,
        analysis: analysisEntry,
        fullHistory: screenAnalysisHistory,
        profile: currentProfile,
        customPrompt: currentCustomPrompt,
    });
}

function getCurrentSessionData() {
    return {
        sessionId: currentSessionId,
        history: conversationHistory,
    };
}

async function getEnabledTools() {
    const tools = [];

    // The setting lives in preferences.json (Customize → Google Search). It used
    // to be read from renderer localStorage, which is never written any more, so
    // the tool was always attached regardless of what the user chose.
    const googleSearchEnabled = getPreferences().googleSearchEnabled === true;
    console.log('Google Search enabled:', googleSearchEnabled);

    if (googleSearchEnabled) {
        tools.push({ googleSearch: {} });
        console.log('Added Google Search tool');
    } else {
        console.log('Google Search tool disabled');
    }

    return tools;
}

async function getStoredSetting(key, defaultValue) {
    try {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            // Wait a bit for the renderer to be ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Try to get setting from renderer process localStorage
            const value = await windows[0].webContents.executeJavaScript(`
                (function() {
                    try {
                        if (typeof localStorage === 'undefined') {
                            console.log('localStorage not available yet for ${key}');
                            return '${defaultValue}';
                        }
                        const stored = localStorage.getItem('${key}');
                        console.log('Retrieved setting ${key}:', stored);
                        return stored || '${defaultValue}';
                    } catch (e) {
                        console.error('Error accessing localStorage for ${key}:', e);
                        return '${defaultValue}';
                    }
                })()
            `);
            return value;
        }
    } catch (error) {
        console.error('Error getting stored setting for', key, ':', error.message);
    }
    console.log('Using default value for', key, ':', defaultValue);
    return defaultValue;
}

// helper to check if groq has been configured *and* is usable. When the
// pre-flight rejects the key or model we fall back to Gemini Live for answers
// rather than leaving the assistant silent for the whole session.
function hasGroqKey() {
    if (groqUnavailable) {
        return false;
    }
    const key = getGroqApiKey();
    return key && key.trim() != '';
}

function cancelPendingGroqTranscription() {
    if (groqTranscriptionTimer) {
        clearTimeout(groqTranscriptionTimer);
        groqTranscriptionTimer = null;
    }
}

// Called on every partial transcript. Gemini streams the input transcription
// word by word, so firing immediately sent Groq a one-word fragment ("hii")
// instead of the question. Restart a short timer instead and only send once the
// transcript stops growing.
function scheduleGroqTranscription() {
    if (!hasGroqKey() || groqRequestStartedForTurn) {
        return;
    }

    cancelPendingGroqTranscription();
    groqTranscriptionTimer = setTimeout(sendFinalTranscriptionToGroq, GROQ_TRANSCRIPTION_DEBOUNCE_MS);
}

function sendFinalTranscriptionToGroq() {
    cancelPendingGroqTranscription();

    if (!hasGroqKey() || groqRequestStartedForTurn) {
        return;
    }

    const transcription = currentTranscription.trim();
    if (transcription === '') {
        return;
    }

    groqRequestStartedForTurn = true;
    sendToGroq(transcription);
}

function trimConversationHistoryForGemma(history, maxChars = 42000) {
    if (!history || history.length === 0) return [];
    let totalChars = 0;
    const trimmed = [];

    for (let i = history.length - 1; i >= 0; i--) {
        const turn = history[i];
        const turnChars = (turn.content || '').length;

        if (totalChars + turnChars > maxChars) break;
        totalChars += turnChars;
        trimmed.unshift(turn);
    }
    return trimmed;
}

function stripThinkingTags(text) {
    const trimmedStart = text.trimStart();
    if ('<think>'.startsWith(trimmedStart)) {
        return '';
    }

    return text.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();
}

function getGroqReasoningOptions(model, disableThinking) {
    // Model ids are typed by hand in settings, so match case-insensitively -
    // "Qwen/Qwen3.6-27B" used to fall through here and keep thinking enabled,
    // which burned the entire completion budget before any answer was produced.
    const normalized = String(model || '').toLowerCase();

    if (normalized.includes('qwen3')) {
        const options = {
            reasoning_format: 'hidden',
        };

        if (disableThinking) {
            options.reasoning_effort = 'none';
        }

        return options;
    }

    if (normalized.startsWith('openai/gpt-oss-')) {
        return {
            include_reasoning: false,
        };
    }

    return {};
}

function getGroqMaxCompletionTokens(config) {
    const configured = Number(config.groqMaxCompletionTokens);
    if (!Number.isFinite(configured) || configured <= 0) {
        return GROQ_MAX_COMPLETION_TOKENS;
    }
    return Math.max(GROQ_MIN_COMPLETION_TOKENS, Math.floor(configured));
}

// The model actually sent to Groq: the pre-flight resolved id when we have one
// (correct casing), otherwise whatever is configured.
function getActiveGroqModel(configuredModel) {
    if (resolvedGroqModel && resolvedGroqModel.toLowerCase() === String(configuredModel || '').toLowerCase()) {
        return resolvedGroqModel;
    }
    return configuredModel;
}

function describeGroqHttpError(status, bodyText, model) {
    const message = parseErrorBody(bodyText);

    if (status === 401 || status === 403) {
        return describeGroqKeyError(status, message);
    }
    if (status === 404) {
        return `Groq does not recognise the model "${model}": ${message}. Fix it in Home → Groq model.`;
    }
    if (status === 413) {
        return `Groq request too large for your rate limit: ${message}`;
    }
    if (status === 429) {
        return `Groq rate limit reached: ${message}`;
    }
    return `Groq error ${status}: ${message}`;
}

/**
 * Streams one Groq chat completion to the renderer.
 *
 * Retries once with a smaller answer budget on a 413: Groq counts
 * prompt tokens + max_completion_tokens against the per-minute token limit, so
 * a fixed 16k ceiling made every request fail on the free tier (TPM 8000).
 */
async function streamGroqCompletion({ messages, model, config, logPrefix }) {
    const groqApiKey = getGroqApiKey();
    if (!groqApiKey) {
        return { ok: false, error: 'No Groq API key configured. Add one in Home → Groq API key.' };
    }

    let maxCompletionTokens = getGroqMaxCompletionTokens(config);

    for (let attempt = 0; attempt < 2; attempt++) {
        let response;
        try {
            response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${groqApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages,
                    stream: true,
                    temperature: 0.7,
                    max_completion_tokens: maxCompletionTokens,
                    ...getGroqReasoningOptions(model, config.disableGroqThinking),
                }),
            });
        } catch (error) {
            console.error('Error calling Groq API:', error);
            logTransportEvent(`${logPrefix}.error`, { error: error.message, stack: error.stack });
            return { ok: false, error: `Could not reach Groq: ${error.message}` };
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq API error:', response.status, errorText);
            logTransportEvent(`${logPrefix}.http_error`, {
                status: response.status,
                body: errorText,
                maxCompletionTokens,
            });

            const canShrink = response.status === 413 && attempt === 0 && maxCompletionTokens > GROQ_MIN_COMPLETION_TOKENS;
            if (canShrink) {
                maxCompletionTokens = Math.max(GROQ_MIN_COMPLETION_TOKENS, Math.floor(maxCompletionTokens / 2));
                console.warn(`Groq rejected the request as too large, retrying with max_completion_tokens=${maxCompletionTokens}`);
                continue;
            }

            return { ok: false, status: response.status, error: describeGroqHttpError(response.status, errorText, model) };
        }

        logTransportEvent(`${logPrefix}.http_response`, { status: response.status, maxCompletionTokens });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let isFirst = true;
        let finishReason = null;
        // SSE events can straddle network chunks, so keep the tail of an
        // incomplete line instead of dropping it as a parse error.
        let pending = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            logTransportEvent(`${logPrefix}.stream_chunk`, { chunk });

            pending += chunk;
            const lines = pending.split('\n');
            pending = lines.pop() || '';

            for (const rawLine of lines) {
                const line = rawLine.trim();
                if (!line.startsWith('data: ')) continue;

                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const json = JSON.parse(data);
                    logTransportEvent(`${logPrefix}.stream_event`, json);
                    finishReason = json.choices?.[0]?.finish_reason || finishReason;
                    const token = json.choices?.[0]?.delta?.content || '';
                    if (!token) continue;

                    fullText += token;
                    const displayText = stripThinkingTags(fullText);
                    if (displayText) {
                        sendToRenderer(isFirst ? 'new-response' : 'update-response', displayText);
                        isFirst = false;
                    }
                } catch (parseError) {
                    logTransportEvent(`${logPrefix}.stream_parse_error`, {
                        data,
                        error: parseError.message,
                    });
                }
            }
        }

        return { ok: true, text: stripThinkingTags(fullText), rawText: fullText, finishReason };
    }

    return { ok: false, error: 'Groq request failed' };
}

async function sendToGroq(transcription) {
    if (!getGroqApiKey()) {
        console.log('No Groq API key configured, skipping Groq response');
        return;
    }

    if (!transcription || transcription.trim() === '') {
        console.log('Empty transcription, skipping Groq');
        return;
    }

    // A pre-flight failure (bad key, unknown model) would otherwise repeat on
    // every single turn - report it once and stop hammering the API.
    if (groqSetupError) {
        sendToRenderer('update-status', groqSetupError);
        return;
    }

    const config = getConfig();
    const modelToUse = getActiveGroqModel(config.groqModel);

    console.log(`Sending to Groq (${modelToUse}):`, transcription.substring(0, 100) + '...');
    logTransportEvent('groq.text.request', {
        model: modelToUse,
        transcription,
    });

    groqConversationHistory.push({
        role: 'user',
        content: transcription.trim(),
    });

    if (groqConversationHistory.length > 20) {
        groqConversationHistory = groqConversationHistory.slice(-20);
    }

    const systemPrompt = currentSystemPrompt || 'You are a helpful assistant.';
    const result = await streamGroqCompletion({
        model: modelToUse,
        config,
        logPrefix: 'groq.text',
        messages: [{ role: 'system', content: systemPrompt }, ...groqConversationHistory],
    });

    if (!result.ok) {
        // Drop the user turn we optimistically queued so the history stays in sync.
        groqConversationHistory.pop();
        sendToRenderer('new-response', result.error);
        sendToRenderer('update-status', result.error);
        return;
    }

    const cleanedResponse = result.text;
    const historyChars = groqConversationHistory.reduce((sum, msg) => sum + (msg.content || '').length, 0);
    incrementCharUsage('groq', modelToUse, systemPrompt.length + historyChars + cleanedResponse.length);

    if (!cleanedResponse) {
        console.warn(`Groq returned no final answer (${modelToUse})`);
        logTransportEvent('groq.text.empty_response', {
            model: modelToUse,
            fullText: result.rawText,
            finishReason: result.finishReason,
        });
        sendToRenderer('new-response', GROQ_EMPTY_RESPONSE_MESSAGE);
        sendToRenderer('update-status', 'Groq reached the completion-token limit');
        return;
    }

    groqConversationHistory.push({
        role: 'assistant',
        content: cleanedResponse,
    });
    saveConversationTurn(transcription, cleanedResponse);

    logTransportEvent('groq.text.completed', {
        model: modelToUse,
        response: cleanedResponse,
    });
    console.log(`Groq response completed (${modelToUse})`);
    sendToRenderer('update-status', 'Listening...');
}

async function sendImageToGroq(base64Data, prompt) {
    if (!getGroqApiKey()) {
        return { success: false, error: 'No Groq API key configured. Add one in Home → Groq API key.' };
    }

    const config = getConfig();
    const model = config.groqImageModel;

    logTransportEvent('groq.image.request', {
        model,
        prompt,
        imageBytes: Buffer.byteLength(base64Data, 'base64'),
    });

    const result = await streamGroqCompletion({
        model,
        config,
        logPrefix: 'groq.image',
        messages: [
            { role: 'system', content: currentSystemPrompt || 'You are a helpful assistant.' },
            {
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
            },
        ],
    });

    if (!result.ok) {
        // A text-only model returns 400 for image_url content - say so plainly,
        // because the configured image model defaults to the chat model.
        if (result.status === 400) {
            return {
                success: false,
                error: `${result.error} — "${model}" may not accept images. Set a vision-capable model in Home → Groq image model.`,
            };
        }
        return { success: false, error: result.error };
    }

    if (!result.text) {
        logTransportEvent('groq.image.empty_response', {
            model,
            fullText: result.rawText,
            finishReason: result.finishReason,
        });
        return { success: false, error: GROQ_EMPTY_RESPONSE_MESSAGE };
    }

    saveScreenAnalysis(prompt, result.text, model);
    logTransportEvent('groq.image.completed', {
        model,
        response: result.text,
    });
    return { success: true, text: result.text, model };
}

async function sendToGemma(transcription) {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.log('No Gemini API key configured');
        return;
    }

    if (!transcription || transcription.trim() === '') {
        console.log('Empty transcription, skipping Gemma');
        return;
    }

    console.log('Sending to Gemma:', transcription.substring(0, 100) + '...');

    groqConversationHistory.push({
        role: 'user',
        content: transcription.trim(),
    });

    const trimmedHistory = trimConversationHistoryForGemma(groqConversationHistory, 42000);

    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });

        const messages = trimmedHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));

        const systemPrompt = currentSystemPrompt || 'You are a helpful assistant.';
        const messagesWithSystem = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] },
            ...messages,
        ];

        const response = await ai.models.generateContentStream({
            model: 'gemma-4-26b-a4b-it',
            contents: messagesWithSystem,
        });

        let fullText = '';
        let isFirst = true;

        for await (const chunk of response) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                sendToRenderer(isFirst ? 'new-response' : 'update-response', fullText);
                isFirst = false;
            }
        }

        const systemPromptChars = (currentSystemPrompt || 'You are a helpful assistant.').length;
        const historyChars = trimmedHistory.reduce((sum, msg) => sum + (msg.content || '').length, 0);
        const inputChars = systemPromptChars + historyChars;
        const outputChars = fullText.length;

        incrementCharUsage('gemini', 'gemma-4-26b-a4b-it', inputChars + outputChars);

        if (fullText.trim()) {
            groqConversationHistory.push({
                role: 'assistant',
                content: fullText.trim(),
            });

            if (groqConversationHistory.length > 40) {
                groqConversationHistory = groqConversationHistory.slice(-40);
            }

            saveConversationTurn(transcription, fullText);
        }

        console.log('Gemma response completed');
        sendToRenderer('update-status', 'Listening...');
    } catch (error) {
        console.error('Error calling Gemma API:', error);
        sendToRenderer('update-status', 'Gemma error: ' + error.message);
    }
}

// Reasons the server will keep rejecting us no matter how often we retry.
// Reconnecting on these just produced four identical failures in a row.
function isFatalCloseReason(reason) {
    return /api key not valid|invalid authentication|api_key_invalid|permission denied|unauthenticated|not found|is not supported|invalid argument/i.test(
        String(reason || '')
    );
}

/**
 * Validates the Gemini key/model, and the Groq key/model when one is set, before
 * a session is opened.
 *
 * A bad Gemini setup is fatal - nothing works without the Live socket. A bad
 * Groq setup only downgrades us to Gemini-generated answers, so it is reported
 * as a warning and the session still starts.
 *
 * Returns { ok, error, warning, detail }. The caller logs `detail` once a
 * transport log is open.
 */
async function preflightProviders(apiKey) {
    const config = getConfig();

    resolvedGroqModel = null;
    groqSetupError = null;
    groqUnavailable = false;

    const detail = { geminiModel: config.geminiLiveModel, groqModel: config.groqModel };

    const gemini = await checkGeminiSetup(apiKey, config.geminiLiveModel);
    detail.gemini = gemini;
    if (!gemini.ok) {
        return { ok: false, error: gemini.error, detail };
    }

    if (getGroqApiKey()) {
        const groq = await checkGroqSetup(getGroqApiKey(), config.groqModel);
        detail.groq = groq;

        if (!groq.ok) {
            groqSetupError = groq.error;
            groqUnavailable = true;
            return {
                ok: true,
                warning: `${groq.error}\n\nAnswers will come from Gemini Live until this is fixed.`,
                detail,
            };
        }

        resolvedGroqModel = groq.resolvedModel;
        if (groq.corrected) {
            console.log(`Groq model "${config.groqModel}" resolved to "${groq.resolvedModel}"`);
        }
    }

    return { ok: true, detail };
}

/**
 * Pre-flight for a session with no Gemini key at all: the Groq key has to cover
 * both the chat model and the Whisper transcription model.
 * Returns { ok, error, chatModel, detail }.
 */
async function preflightGroqOnly() {
    const config = getConfig();
    const detail = { mode: 'groq-only', groqModel: config.groqModel, groqTranscriptionModel: config.groqTranscriptionModel };

    resolvedGroqModel = null;
    groqSetupError = null;
    groqUnavailable = false;

    const listing = await listGroqModels(getGroqApiKey());
    detail.listing = listing.ok ? { modelCount: listing.models.length } : listing;

    if (!listing.ok) {
        const error = describeGroqKeyError(listing.status, listing.error);
        groqSetupError = error;
        return { ok: false, error, detail };
    }

    const resolve = (wanted, label) => {
        const match = listing.models.find(model => model.toLowerCase() === String(wanted || '').toLowerCase());
        if (match) return { ok: true, model: match };
        return {
            ok: false,
            error: `Groq has no ${label} called "${wanted}". Available models: ${listing.models.slice().sort().join(', ')}`,
        };
    };

    const chat = resolve(config.groqModel, 'model');
    if (!chat.ok) {
        groqSetupError = chat.error;
        return { ok: false, error: chat.error, detail };
    }

    const transcription = resolve(config.groqTranscriptionModel, 'transcription model');
    if (!transcription.ok) {
        groqSetupError = transcription.error;
        return { ok: false, error: transcription.error, detail };
    }

    resolvedGroqModel = chat.model;
    detail.resolved = { chat: chat.model, transcription: transcription.model };
    return { ok: true, chatModel: chat.model, detail };
}

async function initializeGeminiSession(apiKey, customPrompt = '', profile = 'interview', language = 'en-US', isReconnect = false) {
    if (isInitializingSession) {
        console.log('Session initialization already in progress');
        return { session: null, error: 'A session is already starting' };
    }

    isInitializingSession = true;
    if (!isReconnect) {
        sendToRenderer('session-initializing', true);
    }

    let preflightWarning = null;
    let preflightDetail = null;

    // Store params for reconnection
    if (!isReconnect) {
        sessionParams = { apiKey, customPrompt, profile, language };
        reconnectAttempts = 0;

        // live.connect() resolves as soon as the socket opens, so an invalid key
        // or model only surfaces in a close event a moment later. Check first.
        const preflight = await preflightProviders(apiKey);
        preflightDetail = preflight.detail;

        if (!preflight.ok) {
            console.error('Provider pre-flight failed:', preflight.error);
            // Keep a record of the rejected attempt - this is the log the user
            // reaches for when a session refuses to start.
            startTransportLog(Date.now().toString());
            logTransportEvent('providers.preflight_failed', preflight.detail);
            closeTransportLog();

            isInitializingSession = false;
            sessionParams = null;
            sendToRenderer('session-initializing', false);
            return { session: null, error: preflight.error };
        }

        preflightWarning = preflight.warning || null;
        if (preflightWarning) {
            console.warn('Provider pre-flight warning:', preflightWarning);
        }
    }

    const client = new GoogleGenAI({
        vertexai: false,
        apiKey: apiKey,
        httpOptions: { apiVersion: 'v1alpha' },
    });

    // Get enabled tools first to determine Google Search status
    const enabledTools = await getEnabledTools();
    const googleSearchEnabled = enabledTools.some(tool => tool.googleSearch);

    const systemPrompt = getSystemPrompt(profile, customPrompt, googleSearchEnabled);
    currentSystemPrompt = systemPrompt; // Store for Groq

    // Initialize new conversation session only on first connect
    if (!isReconnect) {
        initializeNewSession(profile, customPrompt);
        logTransportEvent('providers.preflight', preflightDetail);
    }

    try {
        const session = await client.live.connect({
            model: getConfig().geminiLiveModel,
            callbacks: {
                onopen: function () {
                    logTransportEvent('gemini.live.opened', {});
                    sendToRenderer('update-status', 'Live session connected');
                },
                onmessage: function (message) {
                    console.log('----------------', message);
                    logTransportEvent('gemini.live.message', message);

                    // Handle input transcription (what was spoken)
                    if (message.serverContent?.inputTranscription?.results) {
                        currentTranscription += formatSpeakerResults(message.serverContent.inputTranscription.results);
                    } else if (message.serverContent?.inputTranscription?.text) {
                        const text = message.serverContent.inputTranscription.text;
                        if (text.trim() !== '') {
                            currentTranscription += text;
                        }
                    }

                    if (message.serverContent?.inputTranscription) {
                        scheduleGroqTranscription();
                    }

                    if (!hasGroqKey() && message.serverContent?.outputTranscription?.text) {
                        const isFirstChunk = messageBuffer === '';
                        messageBuffer += message.serverContent.outputTranscription.text;
                        sendToRenderer(isFirstChunk ? 'new-response' : 'update-response', messageBuffer);
                    }

                    if (message.serverContent?.generationComplete) {
                        // The spoken turn is over, so send whatever transcript we
                        // have rather than waiting out the debounce.
                        sendFinalTranscriptionToGroq();

                        if (currentTranscription.trim() !== '') {
                            if (!hasGroqKey() && messageBuffer.trim() !== '') {
                                saveConversationTurn(currentTranscription, messageBuffer);
                            }
                            currentTranscription = '';
                        }
                        messageBuffer = '';
                    }

                    if (message.serverContent?.turnComplete) {
                        sendFinalTranscriptionToGroq();
                        cancelPendingGroqTranscription();
                        currentTranscription = '';
                        messageBuffer = '';
                        groqRequestStartedForTurn = false;
                        sendToRenderer('update-status', 'Listening...');
                    }
                },
                onerror: function (e) {
                    console.log('Session error:', e.message);
                    logTransportEvent('gemini.live.error', {
                        error: e.message,
                    });
                    sendToRenderer('update-status', 'Gemini error: ' + e.message);
                },
                onclose: function (e) {
                    const reason = e?.reason || 'no reason given';
                    console.log('Session closed:', reason);
                    logTransportEvent('gemini.live.closed', { reason });
                    cancelPendingGroqTranscription();

                    // Don't reconnect if user intentionally closed
                    if (isUserClosing) {
                        isUserClosing = false;
                        closeTransportLog();
                        sendToRenderer('update-status', 'Session closed');
                        return;
                    }

                    // Retrying an auth/model rejection can never succeed, and the
                    // reason used to be swallowed behind a bare "Session closed".
                    if (isFatalCloseReason(reason)) {
                        sessionParams = null;
                        closeTransportLog();
                        sendToRenderer('update-status', `Gemini closed the session: ${reason}`);
                        sendToRenderer('reconnect-failed', {
                            message: `Gemini closed the session: ${reason}`,
                        });
                        return;
                    }

                    // Attempt reconnection
                    if (sessionParams && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                        attemptReconnect();
                    } else {
                        closeTransportLog();
                        sendToRenderer('update-status', `Session closed (${reason})`);
                    }
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                proactivity: { proactiveAudio: true },
                outputAudioTranscription: {},
                tools: enabledTools,
                // Enable speaker diarization
                inputAudioTranscription: {
                    enableSpeakerDiarization: true,
                    minSpeakerCount: 2,
                    maxSpeakerCount: 2,
                },
                contextWindowCompression: { slidingWindow: {} },
                speechConfig: { languageCode: language },
                systemInstruction: {
                    parts: [{ text: systemPrompt }],
                },
            },
        });

        isInitializingSession = false;
        if (!isReconnect) {
            sendToRenderer('session-initializing', false);
        }
        if (preflightWarning) {
            sendToRenderer('new-response', preflightWarning);
        }
        return { session, error: null, warning: preflightWarning };
    } catch (error) {
        console.error('Failed to initialize Gemini session:', error);
        logTransportEvent('gemini.live.connect_failed', { error: error.message });
        isInitializingSession = false;
        if (!isReconnect) {
            sendToRenderer('session-initializing', false);
        }
        return { session: null, error: `Could not open the Gemini Live session: ${error.message}` };
    }
}

async function attemptReconnect() {
    reconnectAttempts++;
    console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);

    // Clear stale buffers
    messageBuffer = '';
    currentTranscription = '';
    // Don't reset groqConversationHistory to preserve context across reconnects

    sendToRenderer('update-status', `Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

    // Wait before attempting
    await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));

    try {
        const { session } = await initializeGeminiSession(
            sessionParams.apiKey,
            sessionParams.customPrompt,
            sessionParams.profile,
            sessionParams.language,
            true // isReconnect
        );

        if (session && global.geminiSessionRef) {
            global.geminiSessionRef.current = session;

            // Restore context from conversation history via text message
            const contextMessage = buildContextMessage();
            if (contextMessage) {
                try {
                    console.log('Restoring conversation context...');
                    await session.sendRealtimeInput({ text: contextMessage });
                } catch (contextError) {
                    console.error('Failed to restore context:', contextError);
                    // Continue without context - better than failing
                }
            }

            // Don't reset reconnectAttempts here - let it reset on next fresh session
            sendToRenderer('update-status', 'Reconnected! Listening...');
            console.log('Session reconnected successfully');
            return true;
        }
    } catch (error) {
        console.error(`Reconnection attempt ${reconnectAttempts} failed:`, error);
    }

    // If we still have attempts left, try again
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        return attemptReconnect();
    }

    // Max attempts reached - notify frontend
    console.log('Max reconnection attempts reached');
    sendToRenderer('reconnect-failed', {
        message: 'Tried 3 times to reconnect. Must be upstream/network issues. Try restarting or download updated app from site.',
    });
    sessionParams = null;
    return false;
}

function killExistingSystemAudioDump() {
    return new Promise(resolve => {
        console.log('Checking for existing SystemAudioDump processes...');

        // Kill any existing SystemAudioDump processes
        const killProc = spawn('pkill', ['-f', 'SystemAudioDump'], {
            stdio: 'ignore',
        });

        killProc.on('close', code => {
            if (code === 0) {
                console.log('Killed existing SystemAudioDump processes');
            } else {
                console.log('No existing SystemAudioDump processes found');
            }
            resolve();
        });

        killProc.on('error', err => {
            console.log('Error checking for existing processes (this is normal):', err.message);
            resolve();
        });

        // Timeout after 2 seconds
        setTimeout(() => {
            killProc.kill();
            resolve();
        }, 2000);
    });
}

async function startMacOSAudioCapture(geminiSessionRef) {
    if (process.platform !== 'darwin') return false;

    // Kill any existing SystemAudioDump processes first
    await killExistingSystemAudioDump();

    console.log('Starting macOS audio capture with SystemAudioDump...');

    const { app } = require('electron');
    const path = require('path');

    let systemAudioPath;
    if (app.isPackaged) {
        systemAudioPath = path.join(process.resourcesPath, 'SystemAudioDump');
    } else {
        systemAudioPath = path.join(__dirname, '../assets', 'SystemAudioDump');
    }

    console.log('SystemAudioDump path:', systemAudioPath);

    const spawnOptions = {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
            ...process.env,
        },
    };

    systemAudioProc = spawn(systemAudioPath, [], spawnOptions);

    if (!systemAudioProc.pid) {
        console.error('Failed to start SystemAudioDump');
        return false;
    }

    console.log('SystemAudioDump started with PID:', systemAudioProc.pid);

    const CHUNK_DURATION = 0.1;
    const SAMPLE_RATE = 24000;
    const BYTES_PER_SAMPLE = 2;
    const CHANNELS = 2;
    const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * CHUNK_DURATION;

    let audioBuffer = Buffer.alloc(0);

    systemAudioProc.stdout.on('data', data => {
        audioBuffer = Buffer.concat([audioBuffer, data]);

        while (audioBuffer.length >= CHUNK_SIZE) {
            const chunk = audioBuffer.slice(0, CHUNK_SIZE);
            audioBuffer = audioBuffer.slice(CHUNK_SIZE);

            const monoChunk = CHANNELS === 2 ? convertStereoToMono(chunk) : chunk;

            if (currentProviderMode === 'cloud') {
                sendCloudAudio(monoChunk);
            } else if (currentProviderMode === 'local') {
                getLocalAi().processLocalAudio(monoChunk);
            } else if (currentProviderMode === 'groq') {
                processGroqAudio(monoChunk);
            } else {
                const base64Data = monoChunk.toString('base64');
                sendAudioToGemini(base64Data, geminiSessionRef);
            }

            if (process.env.DEBUG_AUDIO) {
                console.log(`Processed audio chunk: ${chunk.length} bytes`);
                saveDebugAudio(monoChunk, 'system_audio');
            }
        }

        const maxBufferSize = SAMPLE_RATE * BYTES_PER_SAMPLE * 1;
        if (audioBuffer.length > maxBufferSize) {
            audioBuffer = audioBuffer.slice(-maxBufferSize);
        }
    });

    systemAudioProc.stderr.on('data', data => {
        console.error('SystemAudioDump stderr:', data.toString());
    });

    systemAudioProc.on('close', code => {
        console.log('SystemAudioDump process closed with code:', code);
        systemAudioProc = null;
    });

    systemAudioProc.on('error', err => {
        console.error('SystemAudioDump process error:', err);
        systemAudioProc = null;
    });

    return true;
}

function convertStereoToMono(stereoBuffer) {
    const samples = stereoBuffer.length / 4;
    const monoBuffer = Buffer.alloc(samples * 2);

    for (let i = 0; i < samples; i++) {
        const leftSample = stereoBuffer.readInt16LE(i * 4);
        monoBuffer.writeInt16LE(leftSample, i * 2);
    }

    return monoBuffer;
}

function stopMacOSAudioCapture() {
    if (systemAudioProc) {
        console.log('Stopping SystemAudioDump...');
        systemAudioProc.kill('SIGTERM');
        systemAudioProc = null;
    }
}

async function sendAudioToGemini(base64Data, geminiSessionRef) {
    if (!geminiSessionRef.current) return;

    try {
        process.stdout.write('.');
        await geminiSessionRef.current.sendRealtimeInput({
            audio: {
                data: base64Data,
                mimeType: 'audio/pcm;rate=24000',
            },
        });
    } catch (error) {
        console.error('Error sending audio to Gemini:', error);
    }
}

async function sendImageToGeminiHttp(base64Data, prompt) {
    // Get available model based on rate limits
    const model = getAvailableModel();

    const apiKey = getApiKey();
    if (!apiKey) {
        return { success: false, error: 'No API key configured' };
    }

    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });

        const contents = [
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data,
                },
            },
            { text: prompt },
        ];

        console.log(`Sending image to ${model} (streaming)...`);
        const response = await ai.models.generateContentStream({
            model: model,
            contents: contents,
        });

        // Increment count after successful call
        incrementLimitCount(model);

        // Stream the response
        let fullText = '';
        let isFirst = true;
        for await (const chunk of response) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                // Send to renderer - new response for first chunk, update for subsequent
                sendToRenderer(isFirst ? 'new-response' : 'update-response', fullText);
                isFirst = false;
            }
        }

        console.log(`Image response completed from ${model}`);

        // Save screen analysis to history
        saveScreenAnalysis(prompt, fullText, model);

        return { success: true, text: fullText, model: model };
    } catch (error) {
        console.error('Error sending image to Gemini HTTP:', error);
        return { success: false, error: error.message };
    }
}

function setupGeminiIpcHandlers(geminiSessionRef) {
    // Store the geminiSessionRef globally for reconnection access
    global.geminiSessionRef = geminiSessionRef;

    ipcMain.handle('initialize-cloud', async (event, token, profile, userContext) => {
        try {
            currentProviderMode = 'cloud';
            initializeNewSession(profile);
            setOnTurnComplete((transcription, response) => {
                saveConversationTurn(transcription, response);
            });
            sendToRenderer('session-initializing', true);
            await connectCloud(token, profile, userContext);
            sendToRenderer('session-initializing', false);
            return true;
        } catch (err) {
            console.error('[Cloud] Init error:', err);
            currentProviderMode = 'byok';
            sendToRenderer('session-initializing', false);
            return false;
        }
    });

    ipcMain.handle('initialize-gemini', async (event, apiKey, customPrompt, profile = 'interview', language = 'en-US') => {
        currentProviderMode = 'byok';
        const { session, error, warning } = await initializeGeminiSession(apiKey, customPrompt, profile, language);
        if (session) {
            geminiSessionRef.current = session;
            return { success: true, warning };
        }
        return { success: false, error: error || 'Could not start the Gemini session' };
    });

    // Groq on its own: Groq Whisper does the listening, the Groq chat model
    // answers. No Gemini key involved anywhere in this path.
    ipcMain.handle('initialize-groq', async (event, profile = 'interview', customPrompt = '') => {
        currentProviderMode = 'groq';
        sendToRenderer('session-initializing', true);

        try {
            const config = getConfig();
            const preflight = await preflightGroqOnly();

            if (!preflight.ok) {
                console.error('Groq pre-flight failed:', preflight.error);
                startTransportLog(Date.now().toString());
                logTransportEvent('providers.preflight_failed', preflight.detail);
                closeTransportLog();

                currentProviderMode = 'byok';
                sendToRenderer('session-initializing', false);
                return { success: false, error: preflight.error };
            }

            currentSystemPrompt = getSystemPrompt(profile, customPrompt, false);
            initializeNewSession(profile, customPrompt);
            logTransportEvent('providers.preflight', preflight.detail);

            startGroqTranscription({
                sendToRenderer,
                onText: transcription => sendToGroq(transcription),
            });

            sendToRenderer('session-initializing', false);
            sendToRenderer('update-status', 'Listening...');
            console.log(`Groq-only session started (${preflight.chatModel} + ${config.groqTranscriptionModel})`);
            return { success: true };
        } catch (error) {
            console.error('Failed to start Groq-only session:', error);
            currentProviderMode = 'byok';
            sendToRenderer('session-initializing', false);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('initialize-local', async (event, localLlmModel, whisperModel, profile, customPrompt) => {
        currentProviderMode = 'local';
        const success = await getLocalAi().initializeLocalSession(localLlmModel, whisperModel, profile, customPrompt);
        if (!success) {
            currentProviderMode = 'byok';
        }
        return success;
    });

    ipcMain.handle('cancel-local-initialization', async () => {
        const cancelled = await getLocalAi().cancelLocalInitialization();
        if (cancelled) {
            currentProviderMode = 'byok';
        }
        return cancelled;
    });

    ipcMain.handle('send-audio-content', async (event, { data, mimeType }) => {
        if (currentProviderMode === 'cloud') {
            try {
                const pcmBuffer = Buffer.from(data, 'base64');
                sendCloudAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending cloud audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (currentProviderMode === 'local') {
            try {
                const pcmBuffer = Buffer.from(data, 'base64');
                getLocalAi().processLocalAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending local audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (currentProviderMode === 'groq') {
            try {
                processGroqAudio(Buffer.from(data, 'base64'));
                return { success: true };
            } catch (error) {
                console.error('Error sending groq audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };
        try {
            process.stdout.write('.');
            await geminiSessionRef.current.sendRealtimeInput({
                audio: { data: data, mimeType: mimeType },
            });
            return { success: true };
        } catch (error) {
            console.error('Error sending system audio:', error);
            return { success: false, error: error.message };
        }
    });

    // Handle microphone audio on a separate channel
    ipcMain.handle('send-mic-audio-content', async (event, { data, mimeType }) => {
        if (currentProviderMode === 'cloud') {
            try {
                const pcmBuffer = Buffer.from(data, 'base64');
                sendCloudAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending cloud mic audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (currentProviderMode === 'local') {
            try {
                const pcmBuffer = Buffer.from(data, 'base64');
                getLocalAi().processLocalAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending local mic audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (currentProviderMode === 'groq') {
            try {
                processGroqAudio(Buffer.from(data, 'base64'));
                return { success: true };
            } catch (error) {
                console.error('Error sending groq mic audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };
        try {
            process.stdout.write(',');
            await geminiSessionRef.current.sendRealtimeInput({
                audio: { data: data, mimeType: mimeType },
            });
            return { success: true };
        } catch (error) {
            console.error('Error sending mic audio:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('send-image-content', async (event, { data, prompt }) => {
        try {
            if (!data || typeof data !== 'string') {
                console.error('Invalid image data received');
                return { success: false, error: 'Invalid image data' };
            }

            const buffer = Buffer.from(data, 'base64');

            if (buffer.length < 1000) {
                console.error(`Image buffer too small: ${buffer.length} bytes`);
                return { success: false, error: 'Image buffer too small' };
            }

            process.stdout.write('!');

            if (currentProviderMode === 'cloud') {
                const sent = sendCloudImage(data);
                if (!sent) {
                    return { success: false, error: 'Cloud connection not active' };
                }
                return { success: true, model: 'cloud' };
            }

            if (currentProviderMode === 'local') {
                const result = await getLocalAi().sendLocalImage(data, prompt);
                return result;
            }

            if (currentProviderMode === 'groq') {
                return await sendImageToGroq(data, prompt);
            }

            const result = hasGroqKey() ? await sendImageToGroq(data, prompt) : await sendImageToGeminiHttp(data, prompt);
            return result;
        } catch (error) {
            console.error('Error sending image:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('send-text-message', async (event, text) => {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return { success: false, error: 'Invalid text message' };
        }

        if (currentProviderMode === 'cloud') {
            try {
                console.log('Sending text to cloud:', text);
                sendCloudText(text.trim());
                return { success: true };
            } catch (error) {
                console.error('Error sending cloud text:', error);
                return { success: false, error: error.message };
            }
        }

        if (currentProviderMode === 'local') {
            try {
                console.log('Sending text to local Llama:', text);
                return await getLocalAi().sendLocalText(text.trim());
            } catch (error) {
                console.error('Error sending local text:', error);
                return { success: false, error: error.message };
            }
        }

        if (currentProviderMode === 'groq') {
            try {
                console.log('Sending text to Groq:', text);
                await sendToGroq(text.trim());
                return { success: true };
            } catch (error) {
                console.error('Error sending groq text:', error);
                return { success: false, error: error.message };
            }
        }

        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };

        try {
            console.log('Sending text message:', text);

            if (hasGroqKey()) {
                groqRequestStartedForTurn = true;
                sendToGroq(text.trim());
            }

            await geminiSessionRef.current.sendRealtimeInput({ text: text.trim() });
            return { success: true };
        } catch (error) {
            console.error('Error sending text:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('start-macos-audio', async event => {
        if (process.platform !== 'darwin') {
            return {
                success: false,
                error: 'macOS audio capture only available on macOS',
            };
        }

        try {
            const success = await startMacOSAudioCapture(geminiSessionRef);
            return { success };
        } catch (error) {
            console.error('Error starting macOS audio capture:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('stop-macos-audio', async event => {
        try {
            stopMacOSAudioCapture();
            return { success: true };
        } catch (error) {
            console.error('Error stopping macOS audio capture:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('close-session', async event => {
        try {
            stopMacOSAudioCapture();
            cancelPendingGroqTranscription();
            resolvedGroqModel = null;
            groqSetupError = null;
            groqUnavailable = false;

            if (currentProviderMode === 'cloud') {
                closeCloud();
                currentProviderMode = 'byok';
                closeTransportLog();
                return { success: true };
            }

            if (currentProviderMode === 'local') {
                getLocalAi().closeLocalSession();
                currentProviderMode = 'byok';
                closeTransportLog();
                return { success: true };
            }

            if (currentProviderMode === 'groq') {
                stopGroqTranscription();
                currentProviderMode = 'byok';
                closeTransportLog();
                return { success: true };
            }

            // Set flag to prevent reconnection attempts
            isUserClosing = true;
            sessionParams = null;

            // Cleanup session
            if (geminiSessionRef.current) {
                await geminiSessionRef.current.close();
                geminiSessionRef.current = null;
            } else {
                closeTransportLog();
            }

            return { success: true };
        } catch (error) {
            console.error('Error closing session:', error);
            return { success: false, error: error.message };
        }
    });

    // Conversation history IPC handlers
    ipcMain.handle('get-current-session', async event => {
        try {
            return { success: true, data: getCurrentSessionData() };
        } catch (error) {
            console.error('Error getting current session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('start-new-session', async event => {
        try {
            initializeNewSession();
            return { success: true, sessionId: currentSessionId };
        } catch (error) {
            console.error('Error starting new session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('update-google-search-setting', async (event, enabled) => {
        try {
            console.log('Google Search setting updated to:', enabled);
            // The setting is already saved in localStorage by the renderer
            // This is just for logging/confirmation
            return { success: true };
        } catch (error) {
            console.error('Error updating Google Search setting:', error);
            return { success: false, error: error.message };
        }
    });
}

module.exports = {
    initializeGeminiSession,
    preflightProviders,
    preflightGroqOnly,
    streamGroqCompletion,
    getGroqReasoningOptions,
    sendImageToGroq,
    getEnabledTools,
    getStoredSetting,
    sendToRenderer,
    initializeNewSession,
    saveConversationTurn,
    getCurrentSessionData,
    killExistingSystemAudioDump,
    startMacOSAudioCapture,
    convertStereoToMono,
    stopMacOSAudioCapture,
    sendAudioToGemini,
    sendImageToGeminiHttp,
    setupGeminiIpcHandlers,
    formatSpeakerResults,
};
