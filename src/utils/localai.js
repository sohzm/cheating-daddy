const { Ollama } = require('ollama');
const { getSystemPrompt } = require('./prompts');
const { sendToRenderer, initializeNewSession, saveConversationTurn } = require('./gemini');
const transcription = require('./transcription');

// ── State ──

let ollamaClient = null;
let ollamaModel = null;
let localConversationHistory = [];
let currentSystemPrompt = null;
let isLocalActive = false;

// Most recent screen frame (automated capture), attached to the next voice answer so the model can "see" the screen
let latestScreenshot = null;

let isGenerating = false;
let pendingTranscription = null;

// VAD state
let isSpeaking = false;
let speechBuffers = [];
let silenceFrameCount = 0;
let speechFrameCount = 0;

// VAD configuration
const VAD_MODES = {
    NORMAL: { energyThreshold: 0.01, speechFramesRequired: 3, silenceFramesRequired: 30 },
    LOW_BITRATE: { energyThreshold: 0.008, speechFramesRequired: 4, silenceFramesRequired: 35 },
    AGGRESSIVE: { energyThreshold: 0.015, speechFramesRequired: 2, silenceFramesRequired: 20 },
    VERY_AGGRESSIVE: { energyThreshold: 0.02, speechFramesRequired: 2, silenceFramesRequired: 15 },
};
let vadConfig = VAD_MODES.VERY_AGGRESSIVE;

// ── VAD (Voice Activity Detection) ──

function processVAD(pcm16kBuffer) {
    const rms = transcription.calculateRMS(pcm16kBuffer);
    const isVoice = rms > vadConfig.energyThreshold;

    if (isVoice) {
        speechFrameCount++;
        silenceFrameCount = 0;

        if (!isSpeaking && speechFrameCount >= vadConfig.speechFramesRequired) {
            isSpeaking = true;
            speechBuffers = [];
            console.log('[LocalAI] Speech started (RMS:', rms.toFixed(4), ')');
            sendToRenderer('update-status', 'Listening... (speech detected)');
        }
    } else {
        silenceFrameCount++;
        speechFrameCount = 0;

        if (isSpeaking && silenceFrameCount >= vadConfig.silenceFramesRequired) {
            isSpeaking = false;
            console.log('[LocalAI] Speech ended, accumulated', speechBuffers.length, 'chunks');
            sendToRenderer('update-status', 'Transcribing...');

            // Trigger transcription with accumulated audio
            const audioData = Buffer.concat(speechBuffers);
            speechBuffers = [];
            handleSpeechEnd(audioData);
            return;
        }
    }

    // Accumulate audio during speech
    if (isSpeaking) {
        speechBuffers.push(Buffer.from(pcm16kBuffer));
    }
}

// ── Speech End Handler ──

async function handleSpeechEnd(audioData) {
    if (!isLocalActive) return;

    // Minimum audio length check (~0.5 seconds at 16kHz, 16-bit)
    if (audioData.length < 16000) {
        console.log('[LocalAI] Audio too short, skipping');
        sendToRenderer('update-status', 'Listening...');
        return;
    }

    const transcribed = await transcription.transcribeAudio(audioData, sendToRenderer);

    if (!transcribed || transcription.isNoiseTranscription(transcribed)) {
        console.log('[LocalAI] Empty/noise transcription, skipping:', JSON.stringify(transcribed));
        sendToRenderer('update-status', 'Listening...');
        return;
    }

    pendingTranscription = transcribed;
    if (isGenerating) {
        console.log('[LocalAI] Busy generating — queued latest, dropping intermediate utterances');
        return;
    }
    await drainGenerations();
}

async function drainGenerations() {
    while (pendingTranscription && isLocalActive) {
        const text = pendingTranscription;
        pendingTranscription = null;
        isGenerating = true;
        try {
            sendToRenderer('update-status', 'Generating response...');
            await sendToOllama(text);
        } catch (e) {
            console.error('[LocalAI] Generation error:', e?.message || e);
        } finally {
            isGenerating = false;
        }
    }
}

// ── Ollama Chat ──

async function sendToOllama(transcription) {
    if (!ollamaClient || !ollamaModel) {
        console.error('[LocalAI] Ollama not configured');
        return;
    }

    console.log('[LocalAI] Sending to Ollama:', transcription.substring(0, 100) + '...');

    localConversationHistory.push({
        role: 'user',
        content: transcription.trim(),
    });

    // Keep history manageable
    if (localConversationHistory.length > 20) {
        localConversationHistory = localConversationHistory.slice(-20);
    }

    try {
        const messages = [{ role: 'system', content: currentSystemPrompt || 'You are a helpful assistant.' }, ...localConversationHistory];

        // Attach the most recent screen frame to the current (last) user turn so the model
        // can "see" the screen while answering. Kept out of stored history to save memory.
        if (latestScreenshot) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.role === 'user') {
                messages[messages.length - 1] = { ...lastMsg, images: [latestScreenshot] };
            }
        }

        const response = await ollamaClient.chat({
            model: ollamaModel,
            messages,
            stream: true,
            // gemma4 is a "thinking" model: by default it generates a hidden chain-of-thought
            // before the answer (~2× slower, and the overlay stays blank while it "thinks").
            // For a real-time teleprompter we want the answer to start streaming immediately.
            think: false,
        });

        let fullText = '';
        let isFirst = true;

        for await (const part of response) {
            const token = part.message?.content || '';
            if (token) {
                fullText += token;
                sendToRenderer(isFirst ? 'new-response' : 'update-response', fullText);
                isFirst = false;
            }
        }

        if (fullText.trim()) {
            localConversationHistory.push({
                role: 'assistant',
                content: fullText.trim(),
            });

            saveConversationTurn(transcription, fullText);
        }

        console.log('[LocalAI] Ollama response completed');
        sendToRenderer('update-status', 'Listening...');
    } catch (error) {
        console.error('[LocalAI] Ollama error:', error);
        sendToRenderer('update-status', 'Ollama error: ' + error.message);
    }
}

// ── Public API ──

// Build a strong, final response-language directive from a locale like "ru-RU".
// Placed at the very end of the system prompt (highest-priority position) so the model
// answers in the configured language regardless of the (possibly English) input language.
function languageDirective(locale) {
    if (!locale) return '';
    const base = String(locale).split('-')[0];
    let name = base;
    try {
        name = new Intl.DisplayNames(['en'], { type: 'language' }).of(base) || base;
    } catch {
        /* Intl unavailable — fall back to the raw code */
    }
    return `\n\n**CRITICAL LANGUAGE RULE: Write your ENTIRE response in ${name} (${locale}), no matter what language the question or the screen content is in. Never answer in English unless ${name} is English.**`;
}

async function initializeLocalSession(ollamaHost, model, whisperModel, profile, customPrompt, language = 'en-US') {
    console.log('[LocalAI] Initializing local session:', { ollamaHost, model, whisperModel, profile, language });

    sendToRenderer('session-initializing', true);

    try {
        // Setup system prompt + enforce the configured response language
        currentSystemPrompt = getSystemPrompt(profile, customPrompt, false) + languageDirective(language);

        // Whisper transcription language follows the same setting (locale → ISO 639-1)
        transcription.setTranscribeLanguage(language);

        // Initialize Ollama client
        ollamaClient = new Ollama({ host: ollamaHost });
        ollamaModel = model;

        // Test Ollama connection
        try {
            await ollamaClient.list();
            console.log('[LocalAI] Ollama connection verified');
        } catch (error) {
            console.error('[LocalAI] Cannot connect to Ollama at', ollamaHost, ':', error.message);
            sendToRenderer('session-initializing', false);
            sendToRenderer('update-status', 'Cannot connect to Ollama at ' + ollamaHost);
            return false;
        }

        // Load Whisper model
        const pipeline = await transcription.loadWhisperPipeline(whisperModel, sendToRenderer);
        if (!pipeline) {
            sendToRenderer('session-initializing', false);
            return false;
        }

        // Reset VAD state
        isSpeaking = false;
        speechBuffers = [];
        silenceFrameCount = 0;
        speechFrameCount = 0;
        transcription.resetResampleState();
        localConversationHistory = [];
        latestScreenshot = null;
        isGenerating = false;
        pendingTranscription = null;

        // Initialize conversation session
        initializeNewSession(profile, customPrompt);

        isLocalActive = true;
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'Local AI ready - Listening...');

        console.log('[LocalAI] Session initialized successfully');
        return true;
    } catch (error) {
        console.error('[LocalAI] Initialization error:', error);
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'Local AI error: ' + error.message);
        return false;
    }
}

function processLocalAudio(monoChunk24k) {
    if (!isLocalActive) return;

    // Resample from 24kHz to 16kHz
    const pcm16k = transcription.resample24kTo16k(monoChunk24k);
    if (pcm16k.length > 0) {
        processVAD(pcm16k);
    }
}

function closeLocalSession() {
    console.log('[LocalAI] Closing local session');
    isLocalActive = false;
    isSpeaking = false;
    speechBuffers = [];
    silenceFrameCount = 0;
    speechFrameCount = 0;
    transcription.resetResampleState();
    localConversationHistory = [];
    latestScreenshot = null;
    isGenerating = false;
    pendingTranscription = null;
    ollamaClient = null;
    ollamaModel = null;
    currentSystemPrompt = null;
    // Note: whisperPipeline is kept loaded to avoid reloading on next session
}

function isLocalSessionActive() {
    return isLocalActive;
}

// ── Send text directly to Ollama (for manual text input) ──

async function sendLocalText(text) {
    if (!isLocalActive || !ollamaClient) {
        return { success: false, error: 'No active local session' };
    }

    try {
        await sendToOllama(text);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function sendLocalImage(base64Data, prompt) {
    if (!isLocalActive || !ollamaClient) {
        return { success: false, error: 'No active local session' };
    }

    try {
        console.log('[LocalAI] Sending image to Ollama');
        sendToRenderer('update-status', 'Analyzing image...');

        const userMessage = {
            role: 'user',
            content: prompt,
            images: [base64Data],
        };

        // Store text-only version in history
        localConversationHistory.push({ role: 'user', content: prompt });

        if (localConversationHistory.length > 20) {
            localConversationHistory = localConversationHistory.slice(-20);
        }

        const messages = [
            { role: 'system', content: currentSystemPrompt || 'You are a helpful assistant.' },
            ...localConversationHistory.slice(0, -1),
            userMessage,
        ];

        const response = await ollamaClient.chat({
            model: ollamaModel,
            messages,
            stream: true,
            // gemma4 is a "thinking" model: by default it generates a hidden chain-of-thought
            // before the answer (~2× slower, and the overlay stays blank while it "thinks").
            // For a real-time teleprompter we want the answer to start streaming immediately.
            think: false,
        });

        let fullText = '';
        let isFirst = true;

        for await (const part of response) {
            const token = part.message?.content || '';
            if (token) {
                fullText += token;
                sendToRenderer(isFirst ? 'new-response' : 'update-response', fullText);
                isFirst = false;
            }
        }

        if (fullText.trim()) {
            localConversationHistory.push({ role: 'assistant', content: fullText.trim() });
            saveConversationTurn(prompt, fullText);
        }

        console.log('[LocalAI] Image response completed');
        sendToRenderer('update-status', 'Listening...');
        return { success: true, text: fullText, model: ollamaModel };
    } catch (error) {
        console.error('[LocalAI] Image error:', error);
        sendToRenderer('update-status', 'Ollama error: ' + error.message);
        return { success: false, error: error.message };
    }
}

function setLatestScreenshot(base64Data) {
    if (base64Data && typeof base64Data === 'string') {
        latestScreenshot = base64Data;
    }
}

module.exports = {
    initializeLocalSession,
    processLocalAudio,
    closeLocalSession,
    isLocalSessionActive,
    sendLocalText,
    sendLocalImage,
    setLatestScreenshot,
};
