const { getSystemPrompt } = require('./prompts');
const os = require('os');
const {
    sendToRenderer,
    initializeNewSession,
    saveConversationTurn,
    stripThinkingTags,
    getChatCompletionsUrl,
    getGroqReasoningOptions,
} = require('./gemini');
const { getGroqApiKey, getConfig } = require('../storage');
const {
    ensureNativeBinary,
    ensureWhisperModel,
    getAvailablePort,
    startNativeServer,
    stopNativeServer,
    waitForServer,
} = require('./native-ai-runtime');

let whisperProcess = null;
let whisperBaseUrl = null;
let isRemoteActive = false;
let currentSystemPrompt = null;
let remoteConversationHistory = [];

let isSpeaking = false;
let speechBuffers = [];
let silenceFrameCount = 0;
let speechFrameCount = 0;
let resampleRemainder = Buffer.alloc(0);

const VAD_MODES = {
    NORMAL: { energyThreshold: 0.01, speechFramesRequired: 3, silenceFramesRequired: 30 },
    LOW_BITRATE: { energyThreshold: 0.008, speechFramesRequired: 4, silenceFramesRequired: 35 },
    AGGRESSIVE: { energyThreshold: 0.015, speechFramesRequired: 2, silenceFramesRequired: 20 },
    VERY_AGGRESSIVE: { energyThreshold: 0.02, speechFramesRequired: 2, silenceFramesRequired: 15 },
};

let vadConfig = VAD_MODES.VERY_AGGRESSIVE;

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
            console.log('[Remote] Speech started (RMS:', rms.toFixed(4), ')');
            sendToRenderer('update-status', 'Listening... (speech detected)');
        }
    } else {
        silenceFrameCount += 1;
        speechFrameCount = 0;

        if (isSpeaking && silenceFrameCount >= vadConfig.silenceFramesRequired) {
            isSpeaking = false;
            const audioData = Buffer.concat(speechBuffers);
            speechBuffers = [];
            console.log('[Remote] Speech ended, accumulated', audioData.length, 'bytes');
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
    formData.append('language', 'ru');

    const response = await fetch(`${whisperBaseUrl}/inference`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Whisper server returned HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.text?.trim() || '';
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
            onText(stripThinkingTags(fullText) || fullText);
        }
    }

    return stripThinkingTags(fullText);
}

async function requestRemote(messages, onText) {
    const groqApiKey = getGroqApiKey();
    if (!groqApiKey) {
        throw new Error('No API key configured');
    }

    const config = getConfig();
    const model = config.groqModel;

    const response = await fetch(getChatCompletionsUrl(config, 'remoteBaseUrl'), {
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
            max_completion_tokens: 16384,
            ...getGroqReasoningOptions(model, config.disableGroqThinking),
        }),
    });

    if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(`API returned HTTP ${response.status}: ${errorText}`);
    }

    return readStreamingResponse(response, onText);
}

async function sendToRemote(transcription) {
    remoteConversationHistory.push({
        role: 'user',
        content: transcription.trim(),
    });

    if (remoteConversationHistory.length > 20) {
        remoteConversationHistory = remoteConversationHistory.slice(-20);
    }

    try {
        const messages = [{ role: 'system', content: currentSystemPrompt || 'You are a helpful assistant.' }, ...remoteConversationHistory];

        let isFirst = true;
        const fullText = await requestRemote(messages, text => {
            sendToRenderer(isFirst ? 'new-response' : 'update-response', text);
            isFirst = false;
        });

        if (fullText.trim()) {
            remoteConversationHistory.push({
                role: 'assistant',
                content: fullText.trim(),
            });
            saveConversationTurn(transcription, fullText);
        } else {
            sendToRenderer('new-response', 'Model returned an empty response. Try again.');
            sendToRenderer('update-status', 'Empty response');
            return;
        }

        console.log('[Remote] Response completed');
        sendToRenderer('update-status', 'Listening...');
    } catch (error) {
        console.error('[Remote] API error:', error);
        sendToRenderer('update-status', 'API error: ' + error.message);
    }
}

async function handleSpeechEnd(audioData) {
    if (!isRemoteActive) return;

    if (audioData.length < 16000) {
        console.log('[Remote] Audio too short, skipping');
        sendToRenderer('update-status', 'Listening...');
        return;
    }

    try {
        const transcription = await transcribeAudio(audioData);

        if (!transcription || transcription.length < 2) {
            console.log('[Remote] Empty transcription, skipping');
            sendToRenderer('update-status', 'Listening...');
            return;
        }

        sendToRenderer('update-status', 'Generating response...');
        await sendToRemote(transcription);
    } catch (error) {
        console.error('[Remote] Transcription error:', error);
        sendToRenderer('update-status', 'Transcription error: ' + error.message);
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

async function startWhisperServer(executablePath, modelPath) {
    const port = await getAvailablePort();
    whisperBaseUrl = `http://127.0.0.1:${port}`;
    whisperProcess = startNativeServer({
        executablePath,
        arguments: ['-m', modelPath, '--host', '127.0.0.1', '--port', String(port), '-t', String(os.cpus().length)],
        name: 'Whisper',
    });

    await waitForServer(`${whisperBaseUrl}/`, whisperProcess, 120000);
}

async function initializeRemoteSession(whisperModel, profile, customPrompt, language) {
    console.log('[Remote] Initializing remote session:', { whisperModel, profile, language });
    sendToRenderer('session-initializing', true);

    try {
        closeRemoteSession();
        currentSystemPrompt = getSystemPrompt(profile, customPrompt, false);

        const binaryProgress = label => progress => {
            sendToRenderer('update-status', formatDownloadStatus(label, progress));
            sendDownloadProgress(label, progress);
        };

        sendDownloadProgress('Checking Whisper runner');
        const whisperBinaryPath = await ensureNativeBinary('whisper', binaryProgress('Whisper runner'));

        sendToRenderer('whisper-downloading', true);
        let whisperModelPath;
        try {
            sendDownloadProgress('Checking Whisper model');
            whisperModelPath = await ensureWhisperModel(whisperModel, binaryProgress('Whisper model'));
        } finally {
            sendToRenderer('whisper-downloading', false);
        }

        sendToRenderer('update-status', 'Starting Whisper...');
        sendDownloadProgress('Starting Whisper');
        await startWhisperServer(whisperBinaryPath, whisperModelPath);

        isSpeaking = false;
        speechBuffers = [];
        silenceFrameCount = 0;
        speechFrameCount = 0;
        resampleRemainder = Buffer.alloc(0);
        remoteConversationHistory = [];

        initializeNewSession(profile, customPrompt);
        isRemoteActive = true;
        sendToRenderer('local-ai-download-progress', { active: false });
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'Ready - Listening...');
        console.log('[Remote] Session initialized successfully');
        return true;
    } catch (error) {
        console.error('[Remote] Initialization error:', error);
        closeRemoteSession();
        sendToRenderer('local-ai-download-progress', { active: false });
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'Error: ' + error.message);
        return false;
    }
}

function processRemoteAudio(monoChunk24k) {
    if (!isRemoteActive) return;

    const pcm16k = resample24kTo16k(monoChunk24k);
    if (pcm16k.length > 0) {
        processVad(pcm16k);
    }
}

function closeRemoteSession() {
    isRemoteActive = false;
    stopNativeServer(whisperProcess);
    whisperProcess = null;
    whisperBaseUrl = null;
    isSpeaking = false;
    speechBuffers = [];
    silenceFrameCount = 0;
    speechFrameCount = 0;
    resampleRemainder = Buffer.alloc(0);
    remoteConversationHistory = [];
    currentSystemPrompt = null;
}

function isRemoteSessionActive() {
    return isRemoteActive;
}

async function sendRemoteText(text) {
    if (!isRemoteActive) {
        return { success: false, error: 'No active remote session' };
    }

    try {
        await sendToRemote(text);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = {
    initializeRemoteSession,
    processRemoteAudio,
    closeRemoteSession,
    isRemoteSessionActive,
    sendRemoteText,
};
