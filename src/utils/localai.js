const fs = require('fs');
const path = require('path');
const { getSystemPrompt } = require('./prompts');
const { sendToRenderer, initializeNewSession, saveConversationTurn } = require('./gemini');
const {
    ensureNativeBinary,
    ensureLlamaModel,
    ensureWhisperModel,
    getAvailablePort,
    getModelsDirectory,
    startNativeServer,
    stopNativeServer,
    waitForServer,
} = require('./native-ai-runtime');

let llamaProcess = null;
let llamaBaseUrl = null;
let llamaModel = null;
let whisperProcess = null;
let whisperBaseUrl = null;
let localConversationHistory = [];
let currentSystemPrompt = null;
let isLocalActive = false;
// 'llama' = local GGUF model, 'claude' = Claude via the user's subscription (Whisper still runs locally)
let llmBackend = 'llama';
let claudeChat = null;
let claudeImageChatPromise = null; // separate session for screenshots, only when their model/effort differ from text
let claudeSettings = null; // { model, effort, imageModel, imageEffort }
let initializationController = null;
let llamaCacheSnapshot = new Set();

let isSpeaking = false;
let speechBuffers = [];
let silenceFrameCount = 0;
let speechFrameCount = 0;

const VAD_MODES = {
    NORMAL: { energyThreshold: 0.01, speechFramesRequired: 3, silenceFramesRequired: 30 },
    LOW_BITRATE: { energyThreshold: 0.008, speechFramesRequired: 4, silenceFramesRequired: 35 },
    AGGRESSIVE: { energyThreshold: 0.015, speechFramesRequired: 2, silenceFramesRequired: 20 },
    VERY_AGGRESSIVE: { energyThreshold: 0.02, speechFramesRequired: 2, silenceFramesRequired: 15 },
};

let vadConfig = VAD_MODES.VERY_AGGRESSIVE;
let resampleRemainder = Buffer.alloc(0);

function resample24kTo16k(inputBuffer) {
    const combined = Buffer.concat([resampleRemainder, inputBuffer]);
    const inputSamples = Math.floor(combined.length / 2);
    const outputSamples = Math.floor((inputSamples * 2) / 3);
    const outputBuffer = Buffer.alloc(outputSamples * 2);

    for (let i = 0; i < outputSamples; i++) {
        const sourcePosition = (i * 3) / 2;
        const sourceIndex = Math.floor(sourcePosition);
        const fraction = sourcePosition - sourceIndex;
        const firstSample = combined.readInt16LE(sourceIndex * 2);
        const secondSample = sourceIndex + 1 < inputSamples ? combined.readInt16LE((sourceIndex + 1) * 2) : firstSample;
        const interpolated = Math.round(firstSample + fraction * (secondSample - firstSample));
        outputBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, interpolated)), i * 2);
    }

    const consumedInputSamples = Math.ceil((outputSamples * 3) / 2);
    const remainderStart = consumedInputSamples * 2;
    resampleRemainder = remainderStart < combined.length ? combined.slice(remainderStart) : Buffer.alloc(0);

    return outputBuffer;
}

function calculateRms(pcm16Buffer) {
    const samples = pcm16Buffer.length / 2;
    if (samples === 0) return 0;

    let sumSquares = 0;
    for (let i = 0; i < samples; i++) {
        const sample = pcm16Buffer.readInt16LE(i * 2) / 32768;
        sumSquares += sample * sample;
    }

    return Math.sqrt(sumSquares / samples);
}

function processVad(pcm16kBuffer) {
    const rms = calculateRms(pcm16kBuffer);
    const isVoice = rms > vadConfig.energyThreshold;

    if (isVoice) {
        speechFrameCount += 1;
        silenceFrameCount = 0;

        if (!isSpeaking && speechFrameCount >= vadConfig.speechFramesRequired) {
            isSpeaking = true;
            speechBuffers = [];
            console.log('[LocalAI] Speech started (RMS:', rms.toFixed(4), ')');
            sendToRenderer('update-status', 'Listening... (speech detected)');
        }
    } else {
        silenceFrameCount += 1;
        speechFrameCount = 0;

        if (isSpeaking && silenceFrameCount >= vadConfig.silenceFramesRequired) {
            isSpeaking = false;
            const audioData = Buffer.concat(speechBuffers);
            speechBuffers = [];
            console.log('[LocalAI] Speech ended, accumulated', audioData.length, 'bytes');
            sendToRenderer('update-status', 'Transcribing...');
            handleSpeechEnd(audioData);
            return;
        }
    }

    if (isSpeaking) {
        speechBuffers.push(Buffer.from(pcm16kBuffer));
    }
}

function createWavBuffer(pcm16Buffer) {
    const header = Buffer.alloc(44);
    const byteRate = 16000 * 2;

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm16Buffer.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(16000, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm16Buffer.length, 40);

    return Buffer.concat([header, pcm16Buffer]);
}

async function transcribeAudio(pcm16kBuffer) {
    if (!whisperBaseUrl) {
        throw new Error('Whisper server is not running');
    }

    const wavBuffer = createWavBuffer(pcm16kBuffer);
    const formData = new FormData();
    formData.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'speech.wav');
    formData.append('response_format', 'json');
    formData.append('temperature', '0.0');
    formData.append('language', 'en');

    const response = await fetch(`${whisperBaseUrl}/inference`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Whisper server returned HTTP ${response.status}`);
    }

    const result = await response.json();
    const text = result.text?.trim() || '';
    console.log('[LocalAI] Transcription:', text);
    return text;
}

async function handleSpeechEnd(audioData) {
    if (!isLocalActive) return;

    if (audioData.length < 16000) {
        console.log('[LocalAI] Audio too short, skipping');
        sendToRenderer('update-status', 'Listening...');
        return;
    }

    let transcription;
    try {
        transcription = await transcribeAudio(audioData);
    } catch (error) {
        console.error('[LocalAI] Transcription error:', error);
        sendToRenderer('update-status', 'Transcription error: ' + error.message);
        return;
    }

    if (!transcription || transcription.length < 2) {
        console.log('[LocalAI] Empty transcription, skipping');
        sendToRenderer('update-status', 'Listening...');
        return;
    }

    sendToRenderer('update-status', 'Generating response...');
    try {
        await sendToLlama(transcription);
    } catch (error) {
        // sendToLlama already put the failure in the status line; do not relabel it as a transcription problem
        console.error('[LocalAI] Response error:', error);
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

// Creates the screenshot session once. Callers share one promise, so simultaneous screenshots
// cannot each start their own session, and a session closed mid-creation is shut down again.
function getClaudeImageChat() {
    if (!claudeImageChatPromise) {
        const parent = claudeChat;
        const settings = claudeSettings;
        const prompt = currentSystemPrompt;
        const promise = (async () => {
            const chat = await require('./claudeai').createChat({
                model: settings.imageModel,
                effort: settings.imageEffort,
                systemPrompt: prompt,
                alreadyVerified: true,
            });
            if (claudeChat !== parent) {
                chat.close();
                throw new Error('Claude session closed');
            }
            chat.history = parent.history.slice();
            if (chat.history.length) {
                const earlier = chat.history.map(t => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.text}`).join('\n\n');
                chat.addNote(`Conversation so far:\n\n${earlier}`);
            }
            return chat;
        })();
        claudeImageChatPromise = promise;
        // A failed start must not be cached, so the next screenshot can try again
        promise.catch(() => {
            if (claudeImageChatPromise === promise) claudeImageChatPromise = null;
        });
    }
    return claudeImageChatPromise;
}

// The last message is always the newest user turn; Claude keeps earlier turns in its own session.
async function requestClaude(messages, onText) {
    if (!claudeChat) {
        throw new Error('Claude session is not running');
    }

    const last = messages[messages.length - 1];
    const parts = typeof last.content === 'string' ? [{ type: 'text', text: last.content }] : last.content;
    const blocks = [];
    let summary = '';
    for (const part of parts) {
        if (part.type === 'text') {
            blocks.push({ type: 'text', text: part.text });
            summary += part.text;
        } else if (part.type === 'image_url') {
            const match = /^data:(image\/[a-z+.-]+);base64,(.+)$/s.exec(part.image_url?.url || '');
            if (match) {
                blocks.push({ type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } });
                summary += ' [screenshot]';
            }
        }
    }

    const hasImage = blocks.some(block => block.type === 'image');
    if (!hasImage) {
        return claudeChat.ask(blocks, summary.trim(), onText);
    }

    // Same model and effort as text: stay in the main session
    const sameAsText =
        claudeSettings.imageModel === claudeSettings.model && (claudeSettings.imageEffort || 'default') === (claudeSettings.effort || 'default');
    if (sameAsText) {
        return claudeChat.ask(blocks, summary.trim(), onText);
    }

    // Otherwise screenshots get their own session. It starts with the conversation so far, and the main
    // session is told about the answer so follow-up questions make sense.
    const imageChat = await getClaudeImageChat();
    const answer = await imageChat.ask(blocks, summary.trim(), onText);
    claudeChat.addNote(
        `The user shared a screenshot (${summary.replace('[screenshot]', '').trim() || 'no question'}). You (via another session) answered:\n${answer}`
    );
    claudeChat.history.push({ role: 'user', text: summary.trim() }, { role: 'assistant', text: answer });
    if (claudeChat.history.length > 40) claudeChat.history = claudeChat.history.slice(-40);
    return answer;
}

function requestLlm(messages, onText) {
    return llmBackend === 'claude' ? requestClaude(messages, onText) : requestLlama(messages, onText);
}

async function requestLlama(messages, onText) {
    if (!llamaBaseUrl) {
        throw new Error('Llama server is not running');
    }

    const response = await fetch(`${llamaBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'local',
            messages,
            stream: true,
            max_tokens: 2048,
            chat_template_kwargs: {
                enable_thinking: false,
            },
        }),
    });

    if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(`Llama server returned HTTP ${response.status}: ${errorText}`);
    }

    return readStreamingResponse(response, onText);
}

async function sendToLlama(transcription) {
    localConversationHistory.push({
        role: 'user',
        content: transcription.trim(),
    });

    if (localConversationHistory.length > 20) {
        localConversationHistory = localConversationHistory.slice(-20);
    }

    try {
        const messages = [{ role: 'system', content: currentSystemPrompt || 'You are a helpful assistant.' }, ...localConversationHistory];

        let isFirst = true;
        const fullText = await requestLlm(messages, text => {
            sendToRenderer(isFirst ? 'new-response' : 'update-response', text);
            isFirst = false;
        });

        if (fullText.trim()) {
            localConversationHistory.push({
                role: 'assistant',
                content: fullText.trim(),
            });
            saveConversationTurn(transcription, fullText);
        }

        console.log('[LocalAI] Llama response completed');
        sendToRenderer('update-status', 'Listening...');
    } catch (error) {
        console.error('[LocalAI] Llama error:', error);
        sendToRenderer('update-status', 'Local AI error: ' + error.message);
        throw error;
    }
}

function formatDownloadStatus(label, progress) {
    if (!progress.expectedBytes) {
        return `Downloading ${label}...`;
    }

    const percentage = Math.floor((progress.downloadedBytes / progress.expectedBytes) * 100);
    return `Downloading ${label}... ${percentage}%`;
}

function sendDownloadProgress(label, progress = null) {
    const percentage = progress?.expectedBytes ? Math.min(100, Math.floor((progress.downloadedBytes / progress.expectedBytes) * 100)) : null;
    sendToRenderer('local-ai-download-progress', {
        active: true,
        label,
        percentage,
    });
}

function getDirectoryEntries(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        return new Set();
    }

    const entries = new Set();
    const visit = currentPath => {
        for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
            const entryPath = path.join(currentPath, entry.name);
            entries.add(entryPath);
            if (entry.isDirectory()) {
                visit(entryPath);
            }
        }
    };

    visit(directoryPath);
    return entries;
}

function removeNewLlamaCacheEntries() {
    const cacheDirectory = path.join(getModelsDirectory(), 'llama');
    const currentEntries = Array.from(getDirectoryEntries(cacheDirectory));
    currentEntries.sort((first, second) => second.length - first.length);

    for (const entryPath of currentEntries) {
        if (!llamaCacheSnapshot.has(entryPath)) {
            fs.rmSync(entryPath, { recursive: true, force: true });
        }
    }
}

async function prepareNativeFiles(llamaModelReference, whisperModel, signal, needsLlama = true) {
    const binaryProgress = label => progress => {
        sendToRenderer('update-status', formatDownloadStatus(label, progress));
        sendDownloadProgress(label, progress);
    };

    let llamaBinaryPath = null;
    if (needsLlama) {
        sendDownloadProgress('Checking Llama runner');
        llamaBinaryPath = await ensureNativeBinary('llama', binaryProgress('Llama runner'), signal);
    }

    sendDownloadProgress('Checking Whisper runner');
    const whisperBinaryPath = await ensureNativeBinary('whisper', binaryProgress('Whisper runner'), signal);

    let whisperModelPath;
    sendToRenderer('whisper-downloading', true);
    try {
        sendDownloadProgress('Checking Whisper model');
        whisperModelPath = await ensureWhisperModel(whisperModel, binaryProgress('Whisper model'), signal);
    } finally {
        sendToRenderer('whisper-downloading', false);
    }

    if (!needsLlama) {
        return { whisperBinaryPath, whisperModelPath };
    }

    sendDownloadProgress('Checking language model');
    const llamaFiles = await ensureLlamaModel(llamaModelReference, binaryProgress('Language model'), binaryProgress('Vision model'), signal);
    return {
        llamaBinaryPath,
        whisperBinaryPath,
        whisperModelPath,
        llamaModelPath: llamaFiles.modelPath,
        projectorPath: llamaFiles.projectorPath,
    };
}

function validatePreparedNativeFiles(nativeFiles, needsLlama = true) {
    const requiredFiles = [
        ['Whisper runner', nativeFiles.whisperBinaryPath],
        ['Whisper model', nativeFiles.whisperModelPath],
    ];
    if (needsLlama) {
        requiredFiles.push(
            ['Llama runner', nativeFiles.llamaBinaryPath],
            ['Language model', nativeFiles.llamaModelPath],
            ['Vision model', nativeFiles.projectorPath]
        );
    }

    for (const [label, filePath] of requiredFiles) {
        if (!filePath || !fs.existsSync(filePath)) {
            throw new Error(`${label} path is invalid: ${filePath}`);
        }
    }
}

async function startWhisperServer(executablePath, modelPath) {
    const port = await getAvailablePort();
    whisperBaseUrl = `http://127.0.0.1:${port}`;
    whisperProcess = startNativeServer({
        executablePath,
        arguments: ['-m', modelPath, '--host', '127.0.0.1', '--port', String(port)],
        name: 'Whisper',
    });

    await waitForServer(`${whisperBaseUrl}/`, whisperProcess, 120000);
}

async function startLlamaServer(executablePath, modelPath, projectorPath) {
    if (!modelPath || !fs.existsSync(modelPath)) {
        throw new Error(`Language model path is invalid: ${modelPath}`);
    }
    if (!projectorPath || !fs.existsSync(projectorPath)) {
        throw new Error(`Vision model path is invalid: ${projectorPath}`);
    }

    const port = await getAvailablePort();
    const argumentsList = [
        '--host',
        '127.0.0.1',
        '--port',
        String(port),
        '--alias',
        'local',
        '-c',
        '8192',
        '-m',
        modelPath,
        '--mmproj',
        projectorPath,
    ];

    if (process.platform === 'darwin') {
        argumentsList.push('-ngl', '99');
    }

    llamaBaseUrl = `http://127.0.0.1:${port}`;
    llamaProcess = startNativeServer({
        executablePath,
        arguments: argumentsList,
        name: 'Llama',
    });

    await waitForServer(`${llamaBaseUrl}/health`, llamaProcess, 30 * 60 * 1000);
}

async function initializeLocalSession(model, whisperModel, profile, customPrompt, options = {}) {
    const backend = options.backend === 'claude' ? 'claude' : 'llama';
    const usesLlama = backend === 'llama';
    console.log('[LocalAI] Initializing native local session:', { model, whisperModel, profile, backend });
    sendToRenderer('session-initializing', true);

    try {
        closeLocalSession();
        llmBackend = backend;
        initializationController = new AbortController();
        llamaCacheSnapshot = getDirectoryEntries(path.join(getModelsDirectory(), 'llama'));
        currentSystemPrompt = getSystemPrompt(profile, customPrompt, false);
        llamaModel = model;

        const nativeFiles = await prepareNativeFiles(model, whisperModel, initializationController.signal, usesLlama);
        validatePreparedNativeFiles(nativeFiles, usesLlama);

        sendToRenderer('update-status', 'Starting Whisper...');
        sendDownloadProgress('Starting Whisper');
        await startWhisperServer(nativeFiles.whisperBinaryPath, nativeFiles.whisperModelPath);

        if (usesLlama) {
            sendToRenderer('update-status', 'Loading local language model...');
            sendDownloadProgress('Loading language model');
            await startLlamaServer(nativeFiles.llamaBinaryPath, nativeFiles.llamaModelPath, nativeFiles.projectorPath);
        } else {
            sendToRenderer('update-status', 'Connecting to Claude...');
            sendDownloadProgress('Connecting to Claude');
            claudeSettings = options.claude;
            const chat = await require('./claudeai').createChat({
                model: options.claude.model,
                effort: options.claude.effort,
                systemPrompt: currentSystemPrompt,
            });
            // createChat cannot be interrupted, so honour a Cancel that arrived while it was running
            if (initializationController?.signal.aborted) {
                chat.close();
                throw Object.assign(new Error('Initialization cancelled'), { name: 'AbortError' });
            }
            claudeChat = chat;
        }

        isSpeaking = false;
        speechBuffers = [];
        silenceFrameCount = 0;
        speechFrameCount = 0;
        resampleRemainder = Buffer.alloc(0);
        localConversationHistory = [];

        initializeNewSession(profile, customPrompt);
        isLocalActive = true;
        initializationController = null;
        sendToRenderer('local-ai-download-progress', { active: false });
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', usesLlama ? 'Local AI ready - Listening...' : 'Claude ready - Listening...');
        console.log('[LocalAI] Native session initialized successfully');
        return true;
    } catch (error) {
        const wasCancelled = error.name === 'AbortError' || initializationController?.signal.aborted;
        if (wasCancelled) {
            console.log('[LocalAI] Initialization cancelled');
        } else {
            console.error('[LocalAI] Initialization error:', error);
        }
        closeLocalSession();
        if (wasCancelled) {
            removeNewLlamaCacheEntries();
        }
        sendToRenderer('local-ai-download-progress', { active: false });
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', wasCancelled ? 'Local AI download cancelled' : 'Local AI error: ' + error.message);
        return false;
    }
}

function processLocalAudio(monoChunk24k) {
    if (!isLocalActive) return;

    const pcm16k = resample24kTo16k(monoChunk24k);
    if (pcm16k.length > 0) {
        processVad(pcm16k);
    }
}

function closeLocalSession() {
    isLocalActive = false;
    initializationController?.abort();
    initializationController = null;
    claudeChat?.close();
    claudeChat = null;
    claudeImageChatPromise?.then(
        chat => chat.close(),
        () => {}
    );
    claudeImageChatPromise = null;
    claudeSettings = null;
    llmBackend = 'llama';
    stopNativeServer(llamaProcess);
    stopNativeServer(whisperProcess);
    llamaProcess = null;
    whisperProcess = null;
    llamaBaseUrl = null;
    whisperBaseUrl = null;
    llamaModel = null;
    isSpeaking = false;
    speechBuffers = [];
    silenceFrameCount = 0;
    speechFrameCount = 0;
    resampleRemainder = Buffer.alloc(0);
    localConversationHistory = [];
    currentSystemPrompt = null;
}

async function cancelLocalInitialization() {
    if (!initializationController) {
        return false;
    }

    initializationController.abort();
    stopNativeServer(llamaProcess);
    stopNativeServer(whisperProcess);
    await new Promise(resolve => setTimeout(resolve, 300));
    removeNewLlamaCacheEntries();
    sendToRenderer('local-ai-download-progress', { active: false });
    sendToRenderer('session-initializing', false);
    return true;
}

function isLocalSessionActive() {
    return isLocalActive;
}

function hasActiveLlm() {
    return isLocalActive && (llmBackend === 'claude' ? !!claudeChat : !!llamaProcess);
}

async function sendLocalText(text) {
    if (!hasActiveLlm()) {
        return { success: false, error: 'No active local session' };
    }

    try {
        await sendToLlama(text);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function sendLocalImage(base64Data, prompt) {
    if (!hasActiveLlm()) {
        return { success: false, error: 'No active local session' };
    }

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

    localConversationHistory.push({ role: 'user', content: prompt });
    if (localConversationHistory.length > 20) {
        localConversationHistory = localConversationHistory.slice(-20);
    }

    try {
        sendToRenderer('update-status', 'Analyzing image...');
        const messages = [
            { role: 'system', content: currentSystemPrompt || 'You are a helpful assistant.' },
            ...localConversationHistory.slice(0, -1),
            userMessage,
        ];

        let isFirst = true;
        const fullText = await requestLlm(messages, text => {
            sendToRenderer(isFirst ? 'new-response' : 'update-response', text);
            isFirst = false;
        });

        if (fullText.trim()) {
            localConversationHistory.push({ role: 'assistant', content: fullText.trim() });
            saveConversationTurn(prompt, fullText);
        }

        sendToRenderer('update-status', 'Listening...');
        return { success: true, text: fullText, model: llamaModel };
    } catch (error) {
        console.error('[LocalAI] Image error:', error);
        sendToRenderer('update-status', 'Local AI image error: ' + error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    initializeLocalSession,
    cancelLocalInitialization,
    processLocalAudio,
    closeLocalSession,
    isLocalSessionActive,
    sendLocalText,
    sendLocalImage,
};
