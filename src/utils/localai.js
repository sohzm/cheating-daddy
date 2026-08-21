const { Ollama } = require('ollama');
const { getSystemPrompt } = require('./prompts');
const { sendToRenderer, initializeNewSession, saveConversationTurn } = require('./gemini');

// ── State ──

let ollamaClient = null;
let ollamaModel = null;
let whisperPipeline = null;
let isWhisperLoading = false;
let localConversationHistory = [];
let currentSystemPrompt = null;
let isLocalActive = false;
let isProcessingAudio = false;
let isGeneratingResponse = false;

// Maximum accumulated speech buffer: ~15 seconds at 16kHz 16-bit mono = 16000 * 2 * 15 = 480,000 bytes
const MAX_SPEECH_BUFFER_BYTES = 480000;

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

// Audio resampling buffer
let resampleRemainder = Buffer.alloc(0);

// ── Audio Resampling (24kHz → 16kHz) ──

function resample24kTo16k(inputBuffer) {
    if (!inputBuffer || inputBuffer.length === 0) return Buffer.alloc(0);

    // Combine with any leftover samples from previous call
    const combined = Buffer.concat([resampleRemainder, inputBuffer]);
    const inputSamples = Math.floor(combined.length / 2); // 16-bit = 2 bytes per sample
    if (inputSamples < 3) {
        resampleRemainder = combined;
        return Buffer.alloc(0);
    }

    // Ratio: 16000/24000 = 2/3, so for every 3 input samples we produce 2 output samples
    const outputSamples = Math.floor((inputSamples * 2) / 3);
    const outputBuffer = Buffer.alloc(outputSamples * 2);

    for (let i = 0; i < outputSamples; i++) {
        // Map output sample index to input position
        const srcPos = (i * 3) / 2;
        const srcIndex = Math.floor(srcPos);
        const frac = srcPos - srcIndex;

        const s0 = combined.readInt16LE(srcIndex * 2);
        const s1 = srcIndex + 1 < inputSamples ? combined.readInt16LE((srcIndex + 1) * 2) : s0;
        const interpolated = Math.round(s0 + frac * (s1 - s0));
        outputBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, interpolated)), i * 2);
    }

    // Store remainder for next call
    const consumedInputSamples = Math.ceil((outputSamples * 3) / 2);
    const remainderStart = consumedInputSamples * 2;
    resampleRemainder = remainderStart < combined.length ? combined.slice(remainderStart) : Buffer.alloc(0);

    return outputBuffer;
}

// ── VAD (Voice Activity Detection) ──

function calculateRMS(pcm16Buffer) {
    const samples = pcm16Buffer.length / 2;
    if (samples === 0) return 0;
    let sumSquares = 0;
    for (let i = 0; i < samples; i++) {
        const sample = pcm16Buffer.readInt16LE(i * 2) / 32768;
        sumSquares += sample * sample;
    }
    return Math.sqrt(sumSquares / samples);
}

function processVAD(pcm16kBuffer) {
    if (!isLocalActive) return;

    const rms = calculateRMS(pcm16kBuffer);
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

    // Accumulate audio during speech with cap guard
    if (isSpeaking) {
        speechBuffers.push(Buffer.from(pcm16kBuffer));

        // Check if buffer exceeded max length (~15s) to prevent memory exhaustion
        const currentLength = speechBuffers.reduce((acc, b) => acc + b.length, 0);
        if (currentLength >= MAX_SPEECH_BUFFER_BYTES) {
            console.log('[LocalAI] Max speech buffer reached, forcing transcription');
            isSpeaking = false;
            sendToRenderer('update-status', 'Transcribing...');
            const audioData = Buffer.concat(speechBuffers);
            speechBuffers = [];
            handleSpeechEnd(audioData);
        }
    }
}

// ── Whisper Transcription ──

async function loadWhisperPipeline(modelName) {
    if (whisperPipeline) return whisperPipeline;
    if (isWhisperLoading) return null;

    isWhisperLoading = true;
    const targetModel = modelName || 'Xenova/whisper-small';
    console.log('[LocalAI] Loading Whisper model:', targetModel);
    sendToRenderer('whisper-downloading', true);
    sendToRenderer('update-status', `Loading Whisper model (${targetModel})...`);

    try {
        // Dynamic import for ESM module
        const { pipeline, env } = await import('@huggingface/transformers');
        const { app } = require('electron');
        const path = require('path');

        // Cache models outside the asar archive so ONNX runtime can load them
        const cacheDir = path.join(app.getPath('userData'), 'whisper-models');
        env.cacheDir = cacheDir;
        env.allowLocalModels = false;

        const loadModel = async (device = 'auto') => {
            return await pipeline('automatic-speech-recognition', targetModel, {
                dtype: 'q8',
                device,
            });
        };

        try {
            whisperPipeline = await loadModel('auto');
        } catch (initialError) {
            console.warn('[LocalAI] Auto device load failed:', initialError.message);
            // If the cached file was corrupted/partially downloaded (Protobuf parsing error or similar), purge cache and retry
            if (
                initialError.message &&
                (initialError.message.includes('Protobuf') ||
                    initialError.message.includes('parsing failed') ||
                    initialError.message.includes('corrupted') ||
                    initialError.message.includes('INVALID_ARGUMENT'))
            ) {
                console.warn('[LocalAI] Corrupted model detected in cache. Purging cache directory and retrying...');
                try {
                    const fs = require('fs');
                    const modelFolder = path.join(cacheDir, targetModel.replace('/', path.sep));
                    if (fs.existsSync(modelFolder)) {
                        fs.rmSync(modelFolder, { recursive: true, force: true });
                    }
                } catch (cleanErr) {
                    console.error('[LocalAI] Failed to clean model folder:', cleanErr);
                }
            }

            // Retry with CPU
            whisperPipeline = await loadModel('cpu');
        }

        console.log('[LocalAI] Whisper model loaded successfully');
        sendToRenderer('whisper-downloading', false);
        isWhisperLoading = false;
        return whisperPipeline;
    } catch (error) {
        console.error('[LocalAI] Failed to load Whisper model:', error);
        sendToRenderer('whisper-downloading', false);
        sendToRenderer('update-status', 'Failed to load Whisper model: ' + error.message);
        isWhisperLoading = false;
        return null;
    }
}

function pcm16ToFloat32(pcm16Buffer) {
    const samples = pcm16Buffer.length / 2;
    const float32 = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
        const val = pcm16Buffer.readInt16LE(i * 2) / 32768;
        float32[i] = Math.max(-1.0, Math.min(1.0, val));
    }
    return float32;
}

async function transcribeAudio(pcm16kBuffer) {
    if (!whisperPipeline) {
        console.error('[LocalAI] Whisper pipeline not loaded');
        return null;
    }

    try {
        const float32Audio = pcm16ToFloat32(pcm16kBuffer);

        // Whisper expects audio at 16kHz
        const result = await whisperPipeline(float32Audio, {
            sampling_rate: 16000,
            language: 'en',
            task: 'transcribe',
        });

        const text = result?.text?.trim() || '';
        console.log('[LocalAI] Transcription:', text);
        return text;
    } catch (error) {
        console.error('[LocalAI] Transcription error:', error);
        return null;
    }
}

// ── Speech End Handler ──

async function handleSpeechEnd(audioData) {
    if (!isLocalActive) return;

    if (isProcessingAudio) {
        console.log('[LocalAI] Audio processing in progress, queuing/skipping chunk');
        return;
    }

    // Minimum audio length check (~0.5 seconds at 16kHz, 16-bit = 16000 bytes)
    if (audioData.length < 16000) {
        console.log('[LocalAI] Audio too short, skipping');
        if (!isGeneratingResponse) {
            sendToRenderer('update-status', 'Listening...');
        }
        return;
    }

    isProcessingAudio = true;
    try {
        const transcription = await transcribeAudio(audioData);

        if (!transcription || transcription.trim() === '' || transcription.trim().length < 2) {
            console.log('[LocalAI] Empty or trivial transcription, skipping');
            if (!isGeneratingResponse) {
                sendToRenderer('update-status', 'Listening...');
            }
            return;
        }

        sendToRenderer('update-status', 'Generating response...');
        await sendToOllama(transcription);
    } catch (err) {
        console.error('[LocalAI] Error in handleSpeechEnd:', err);
        sendToRenderer('update-status', 'Error: ' + err.message);
    } finally {
        isProcessingAudio = false;
    }
}

// ── Ollama Chat ──

async function sendToOllama(transcription) {
    if (!ollamaClient || !ollamaModel) {
        console.error('[LocalAI] Ollama not configured');
        sendToRenderer('update-status', 'Ollama not configured');
        return;
    }

    console.log('[LocalAI] Sending to Ollama:', transcription.substring(0, 100) + '...');
    isGeneratingResponse = true;

    localConversationHistory.push({
        role: 'user',
        content: transcription.trim(),
    });

    // Keep history manageable for local models
    if (localConversationHistory.length > 16) {
        localConversationHistory = localConversationHistory.slice(-16);
    }

    try {
        const messages = [{ role: 'system', content: currentSystemPrompt || 'You are a helpful assistant.' }, ...localConversationHistory];

        const response = await ollamaClient.chat({
            model: ollamaModel,
            messages,
            stream: true,
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
    } finally {
        isGeneratingResponse = false;
    }
}

// ── Public API ──

async function initializeLocalSession(ollamaHost, model, whisperModel, profile, customPrompt) {
    console.log('[LocalAI] Initializing local session:', { ollamaHost, model, whisperModel, profile });

    sendToRenderer('session-initializing', true);

    try {
        // Setup system prompt
        currentSystemPrompt = getSystemPrompt(profile, customPrompt, false);

        // Normalize host URL
        let targetHost = (ollamaHost || 'http://127.0.0.1:11434').trim();
        if (!targetHost.startsWith('http://') && !targetHost.startsWith('https://')) {
            targetHost = 'http://' + targetHost;
        }

        // Initialize Ollama client
        ollamaClient = new Ollama({ host: targetHost });
        ollamaModel = model || 'llama3.1';

        // Test Ollama connection & verify model availability
        let modelList = [];
        try {
            const listRes = await ollamaClient.list();
            modelList = listRes?.models || [];
            console.log(
                '[LocalAI] Ollama connection verified. Available models:',
                modelList.map(m => m.name)
            );
        } catch (error) {
            // Try fallback from 127.0.0.1 to localhost or vice versa
            let fallbackHost = null;
            if (targetHost.includes('127.0.0.1')) {
                fallbackHost = targetHost.replace('127.0.0.1', 'localhost');
            } else if (targetHost.includes('localhost')) {
                fallbackHost = targetHost.replace('localhost', '127.0.0.1');
            }

            if (fallbackHost) {
                try {
                    console.log(`[LocalAI] Retrying connection with fallback host: ${fallbackHost}`);
                    const fallbackClient = new Ollama({ host: fallbackHost });
                    const listRes = await fallbackClient.list();
                    modelList = listRes?.models || [];
                    ollamaClient = fallbackClient;
                    targetHost = fallbackHost;
                    console.log('[LocalAI] Ollama fallback connection succeeded');
                } catch (fallbackError) {
                    console.error('[LocalAI] Cannot connect to Ollama:', error.message);
                    sendToRenderer('session-initializing', false);
                    sendToRenderer('update-status', `Cannot connect to Ollama at ${targetHost}. Please make sure 'ollama serve' is running.`);
                    return false;
                }
            } else {
                console.error('[LocalAI] Cannot connect to Ollama at', targetHost, ':', error.message);
                sendToRenderer('session-initializing', false);
                sendToRenderer('update-status', `Cannot connect to Ollama at ${targetHost}. Please make sure 'ollama serve' is running.`);
                return false;
            }
        }

        // Check if model is pulled
        if (modelList.length > 0) {
            const modelNames = modelList.map(m => m.name);
            const modelExists = modelNames.some(m => m === ollamaModel || m.startsWith(ollamaModel + ':') || m.split(':')[0] === ollamaModel);
            if (!modelExists) {
                console.warn(`[LocalAI] Model '${ollamaModel}' not found in installed models:`, modelNames);
                sendToRenderer(
                    'update-status',
                    `Warning: Model '${ollamaModel}' may not be downloaded. Run 'ollama pull ${ollamaModel}' if it fails.`
                );
            }
        }

        // Load Whisper model
        const pipeline = await loadWhisperPipeline(whisperModel || 'Xenova/whisper-small');
        if (!pipeline) {
            sendToRenderer('session-initializing', false);
            return false;
        }

        // Reset VAD & session state
        isSpeaking = false;
        speechBuffers = [];
        silenceFrameCount = 0;
        speechFrameCount = 0;
        resampleRemainder = Buffer.alloc(0);
        localConversationHistory = [];
        isProcessingAudio = false;
        isGeneratingResponse = false;

        // Initialize conversation session for history tracking
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
    const pcm16k = resample24kTo16k(monoChunk24k);
    if (pcm16k && pcm16k.length > 0) {
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
    resampleRemainder = Buffer.alloc(0);
    localConversationHistory = [];
    ollamaClient = null;
    ollamaModel = null;
    currentSystemPrompt = null;
    isProcessingAudio = false;
    isGeneratingResponse = false;
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
        sendToRenderer('update-status', 'Analyzing image with local AI...');

        const userMessage = {
            role: 'user',
            content: prompt || 'Analyze this image and provide direct answers.',
            images: [base64Data],
        };

        // Store text version in history
        localConversationHistory.push({ role: 'user', content: prompt || '[Attached Screenshot]' });

        if (localConversationHistory.length > 16) {
            localConversationHistory = localConversationHistory.slice(-16);
        }

        const messages = [
            { role: 'system', content: currentSystemPrompt || 'You are a helpful assistant.' },
            ...localConversationHistory.slice(0, -1),
            userMessage,
        ];

        let response;
        try {
            response = await ollamaClient.chat({
                model: ollamaModel,
                messages,
                stream: true,
            });
        } catch (chatErr) {
            // Check if model doesn't support images (e.g. text-only model)
            if (chatErr.message && (chatErr.message.includes('does not support images') || chatErr.message.includes('vision'))) {
                console.warn('[LocalAI] Current model does not support images. Falling back to text prompt only.');
                sendToRenderer('update-status', `Model ${ollamaModel} does not support images. Try pulling 'llava' or 'gemma3:4b'.`);

                const fallbackMessages = [
                    { role: 'system', content: currentSystemPrompt || 'You are a helpful assistant.' },
                    ...localConversationHistory.slice(0, -1),
                    { role: 'user', content: prompt || 'Help me with the current task.' },
                ];

                response = await ollamaClient.chat({
                    model: ollamaModel,
                    messages: fallbackMessages,
                    stream: true,
                });
            } else {
                throw chatErr;
            }
        }

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
            saveConversationTurn(prompt || '[Screenshot]', fullText);
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

module.exports = {
    initializeLocalSession,
    processLocalAudio,
    closeLocalSession,
    isLocalSessionActive,
    sendLocalText,
    sendLocalImage,
};
