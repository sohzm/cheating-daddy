const crypto = require('crypto');
const { sendToRenderer, initializeNewSession, saveConversationTurn } = require('./gemini');
const { getSystemPrompt } = require('./prompts');
const transcription = require('./transcription');
const realtime = require('./realtimeTranscription');
const groq = require('./groqTranscription');
const { ensureValidOpenAIAuth, refreshOpenAIAuth } = require('./openaiOAuth');
const storage = require('../storage');

const RESPONSES_URL = 'https://chatgpt.com/backend-api/codex/responses';
const ORIGINATOR = 'codex_cli_rs';

// VAD constants. SILENCE_FRAMES * ~0.1s = silence we wait before treating speech as ended.
const SILENCE_RMS = 0.01;
const SILENCE_FRAMES = 8; // ~0.8s (exp1: was 15 ≈ 1.5s) — faster endpointing on normal questions
const MAX_HISTORY_MESSAGES = 10; // keep last N turns (user+assistant) as conversation context

let session = null; // { systemPrompt, model, sessionId, audioBuffer, speechFrames, silenceCount, isSpeaking }
let latestScreenshot = null;
let isGenerating = false;
let pendingTranscription = null;

function isChatGPTSessionActive() {
    return session !== null;
}

function setLatestScreenshot(base64Data) {
    latestScreenshot = base64Data;
}

function languageDirective(locale) {
    if (!locale || locale === 'en-US') {
        return '';
    }
    return `\n\nRespond in ${locale}.`;
}

async function initializeChatGPTSession(profile = 'interview', customPrompt = '', language = 'ru-RU', model = 'gpt-5.4-mini') {
    sendToRenderer('session-initializing', true);
    try {
        const auth = await ensureValidOpenAIAuth();
        if (!auth || !auth.accessToken) {
            sendToRenderer('session-initializing', false);
            sendToRenderer('update-status', 'ChatGPT account not connected');
            return false;
        }

        const prefs = storage.getPreferences();
        const sttEngine = prefs.chatgptTranscription || 'local'; // 'local' | 'groq' | 'realtime'
        const wantRealtime = sttEngine === 'realtime';

        const systemPrompt = getSystemPrompt(profile, customPrompt, false) + languageDirective(language);
        session = {
            systemPrompt,
            model,
            sessionId: crypto.randomUUID(),
            audioBuffer: [],
            speechFrames: 0,
            silenceCount: 0,
            isSpeaking: false,
            sttEngine,
            langCode: (language || 'en-US').split('-')[0],
            useRealtime: wantRealtime,
            reasoningEffort: prefs.chatgptReasoningEffort || 'medium',
            history: [], // [{ role: 'user' | 'assistant', text }] — conversation context for follow-ups
        };
        isGenerating = false;
        pendingTranscription = null;
        initializeNewSession(profile, customPrompt);

        transcription.resetResampleState();
        // Load Whisper unless transcription is fully cloud (Groq) — keep it for local/realtime-fallback.
        if (sttEngine !== 'groq') {
            transcription.setTranscribeLanguage(language);
            const whisperModel = prefs.whisperModel || 'Xenova/whisper-base';
            await transcription.loadWhisperPipeline(whisperModel, sendToRenderer);
        }

        if (wantRealtime) {
            realtime
                .startRealtimeTranscription({
                    onTranscript: text => {
                        if (!session) return;
                        pendingTranscription = text;
                        drainGenerations();
                    },
                    onError: () => {
                        if (session) session.useRealtime = false;
                        sendToRenderer('update-status', 'Realtime unavailable — using local Whisper. Listening...');
                    },
                })
                .catch(error => {
                    if (session) session.useRealtime = false;
                    console.error('[Realtime] start failed:', error.message);
                });
        }

        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'ChatGPT ready - Listening...');
        return true;
    } catch (error) {
        session = null;
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'ChatGPT error: ' + error.message);
        return false;
    }
}

function processChatGPTAudio(monoChunk24k) {
    if (!session) {
        return;
    }
    // Realtime path: forward raw 24kHz PCM straight to the cloud transcription socket (no local VAD).
    if (session.useRealtime && realtime.isRealtimeReady()) {
        realtime.appendAudio(monoChunk24k);
        return;
    }
    const pcm16k = transcription.resample24kTo16k(monoChunk24k);
    const rms = transcription.calculateRMS(pcm16k);
    session.audioBuffer.push(pcm16k);

    if (rms > SILENCE_RMS) {
        if (!session.isSpeaking) {
            session.isSpeaking = true;
            sendToRenderer('update-status', 'Listening... (speech detected)');
        }
        session.silenceCount = 0;
        session.speechFrames++;
    } else if (session.isSpeaking) {
        session.silenceCount++;
        if (session.silenceCount >= SILENCE_FRAMES) {
            const audio = Buffer.concat(session.audioBuffer);
            session.audioBuffer = [];
            session.isSpeaking = false;
            session.silenceCount = 0;
            session.speechFrames = 0;
            handleSpeechEnd(audio);
        }
    } else if (session.audioBuffer.length > SILENCE_FRAMES) {
        session.audioBuffer.shift();
    }
}

async function handleSpeechEnd(audioData) {
    if (!session) {
        return;
    }
    sendToRenderer('update-status', 'Transcribing...');
    let text;
    try {
        if (session.sttEngine === 'groq') {
            text = await groq.transcribeWithGroq(audioData, session.langCode);
        } else {
            text = await transcription.transcribeAudio(audioData, sendToRenderer);
        }
    } catch (error) {
        sendToRenderer('update-status', 'Transcription error: ' + error.message);
        return;
    }
    if (!text || transcription.isNoiseTranscription(text)) {
        sendToRenderer('update-status', 'Listening...');
        return;
    }
    pendingTranscription = text;
    drainGenerations();
}

async function drainGenerations() {
    if (isGenerating || !pendingTranscription || !session) {
        return;
    }
    isGenerating = true;
    while (pendingTranscription && session) {
        const text = pendingTranscription;
        pendingTranscription = null;
        sendToRenderer('update-status', 'Generating response...');
        await sendToChatGPT(text);
    }
    isGenerating = false;
    if (session) {
        sendToRenderer('update-status', 'Listening...');
    }
}

function buildHeaders(auth, sessionId) {
    return {
        Authorization: `Bearer ${auth.accessToken}`,
        'chatgpt-account-id': auth.accountId || '',
        'OpenAI-Beta': 'responses=experimental',
        originator: ORIGINATOR,
        session_id: sessionId,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
    };
}

function historyToInput(history) {
    return history.map(turn => ({
        type: 'message',
        role: turn.role,
        content: [{ type: turn.role === 'assistant' ? 'output_text' : 'input_text', text: turn.text }],
    }));
}

function buildBody(model, instructions, content, history = [], reasoningEffort = '') {
    const payload = {
        model,
        instructions,
        input: [...historyToInput(history), { type: 'message', role: 'user', content }],
        tools: [],
        tool_choice: 'auto',
        parallel_tool_calls: false,
        store: false,
        stream: true,
        include: [],
    };
    if (reasoningEffort && reasoningEffort !== 'none') {
        payload.reasoning = { effort: reasoningEffort };
    }
    return JSON.stringify(payload);
}

async function streamResponses(content, retryOn401 = true) {
    const auth = await ensureValidOpenAIAuth();
    if (!auth || !auth.accessToken) {
        sendToRenderer('update-status', 'ChatGPT account not connected');
        return;
    }
    if (!session) {
        return;
    }

    const resp = await fetch(RESPONSES_URL, {
        method: 'POST',
        headers: buildHeaders(auth, session.sessionId),
        body: buildBody(session.model, session.systemPrompt, content, session.history, session.reasoningEffort),
    });

    if (resp.status === 401 && retryOn401) {
        const refreshed = await refreshOpenAIAuth(auth).catch(() => null);
        if (refreshed) {
            return streamResponses(content, false);
        }
    }
    if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        console.error(`[ChatGPT] error ${resp.status} body:`, errText.slice(0, 1000));
        sendToRenderer('update-status', `ChatGPT error ${resp.status}: ${errText.slice(0, 200)}`);
        return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let isFirst = true;

    const flushEvent = dataStr => {
        if (!dataStr || dataStr === '[DONE]') {
            return;
        }
        let evt;
        try {
            evt = JSON.parse(dataStr);
        } catch {
            return;
        }
        if (evt.type === 'response.output_text.delta' && typeof evt.delta === 'string') {
            fullText += evt.delta;
            sendToRenderer(isFirst ? 'new-response' : 'update-response', fullText);
            isFirst = false;
        } else if (evt.type === 'response.completed' || evt.type === 'response.output_text.done') {
            if (fullText) {
                sendToRenderer('update-response', fullText);
            }
        }
    };

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
                flushEvent(trimmed.slice(5).trim());
            }
        }
    }

    if (fullText) {
        const promptText = content.map(c => c.text || '[image]').join(' ');
        saveConversationTurn(promptText, fullText);
        if (session) {
            session.history.push({ role: 'user', text: promptText }, { role: 'assistant', text: fullText });
            if (session.history.length > MAX_HISTORY_MESSAGES) {
                session.history = session.history.slice(-MAX_HISTORY_MESSAGES);
            }
        }
    }
}

async function sendToChatGPT(text) {
    if (!session) {
        return;
    }
    const content = [{ type: 'input_text', text }];
    if (latestScreenshot) {
        content.push({ type: 'input_image', image_url: `data:image/jpeg;base64,${latestScreenshot}` });
    }
    try {
        await streamResponses(content);
    } catch (error) {
        sendToRenderer('update-status', 'ChatGPT error: ' + error.message);
    }
}

async function sendChatGPTImage(base64Data, prompt = '') {
    if (!session) {
        return;
    }
    latestScreenshot = base64Data;
    const content = [
        { type: 'input_text', text: prompt || 'Analyze the screen and help based on the current conversation.' },
        { type: 'input_image', image_url: `data:image/jpeg;base64,${base64Data}` },
    ];
    sendToRenderer('update-status', 'Analyzing image...');
    try {
        await streamResponses(content);
    } catch (error) {
        sendToRenderer('update-status', 'ChatGPT error: ' + error.message);
    }
    if (session) {
        sendToRenderer('update-status', 'Listening...');
    }
}

async function sendChatGPTText(text) {
    if (!session) {
        return;
    }
    pendingTranscription = text;
    return drainGenerations();
}

function closeChatGPTSession() {
    realtime.stopRealtimeTranscription();
    session = null;
    latestScreenshot = null;
    isGenerating = false;
    pendingTranscription = null;
}

module.exports = {
    initializeChatGPTSession,
    processChatGPTAudio,
    sendChatGPTText,
    sendChatGPTImage,
    closeChatGPTSession,
    isChatGPTSessionActive,
    setLatestScreenshot,
};
