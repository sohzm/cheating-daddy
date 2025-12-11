const { GoogleGenerativeAI } = require('@google/generative-ai');
const { BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const { saveDebugAudio } = require('../audioUtils');
const { getSystemPrompt } = require('./prompts');

// Conversation tracking variables
let currentSessionId = null;
let currentTranscription = '';
let conversationHistory = [];
let isInitializingSession = false;

// Audio buffering and VAD variables
let audioAccumulator = Buffer.alloc(0);
let preSpeechBuffer = Buffer.alloc(0);
const PRE_SPEECH_BUFFER_SIZE = 12000; // ~250ms at 24kHz mono 2 bytes
let isSpeaking = false;
let silenceStart = null;
const VAD_THRESHOLD = 3500; // Increased threshold to ignore background noise
const SILENCE_DURATION_MS = 500; // Increased to 500ms to prevent cutting off words (e.g. "Post...Mapping")
const IMAGE_SEND_INTERVAL_MS = 8000; // Increased interval to reduce rate limiting and latency
const MAX_AUDIO_DURATION_MS = 15000; // Force send after 15 seconds
const MIN_AUDIO_DURATION_MS = 500; // Reduced minimum duration to capture short commands
let lastSpeechTime = Date.now();

// Chat session variables
let chatSession = null;
let genAIModel = null;


function formatSpeakerResults(results) {
    // Standard API doesn't return speaker results, so this might be unused or mocked
    return '';
}

module.exports.formatSpeakerResults = formatSpeakerResults;

// Audio capture variables
let systemAudioProc = null;
let messageBuffer = '';

// Reconnection tracking variables
let reconnectionAttempts = 0;
let maxReconnectionAttempts = 3;
let reconnectionDelay = 2000; // 2 seconds between attempts
let lastSessionParams = null;

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

// Conversation management functions
function initializeNewSession() {
    currentSessionId = Date.now().toString();
    currentTranscription = '';
    conversationHistory = [];
    console.log('New conversation session started:', currentSessionId);
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

function getCurrentSessionData() {
    return {
        sessionId: currentSessionId,
        history: conversationHistory,
    };
}

async function getEnabledTools() {
    const tools = [];
    // Check if Google Search is enabled (default: true)
    const googleSearchEnabled = await getStoredSetting('googleSearchEnabled', 'true');
    if (googleSearchEnabled === 'true') {
        tools.push({ googleSearch: {} });
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
                            return '${defaultValue}';
                        }
                        const stored = localStorage.getItem('${key}');
                        return stored || '${defaultValue}';
                    } catch (e) {
                        return '${defaultValue}';
                    }
                })()
            `);
            return value;
        }
    } catch (error) {
        console.error('Error getting stored setting for', key, ':', error.message);
    }
    return defaultValue;
}

// In-memory WAV header generation
function createWavHeader(dataSize, sampleRate = 24000, channels = 1, bitDepth = 16) {
    const byteRate = sampleRate * channels * (bitDepth / 8);
    const blockAlign = channels * (bitDepth / 8);
    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(dataSize + 36, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitDepth, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return header;
}

async function initializeGeminiSession(apiKey, customPrompt = '', profile = 'interview', language = 'en-US', isReconnection = false) {
    if (isInitializingSession) {
        return false;
    }

    isInitializingSession = true;
    sendToRenderer('session-initializing', true);

    if (!isReconnection) {
        lastSessionParams = { apiKey, customPrompt, profile, language };
        reconnectionAttempts = 0;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // * // Use the standard generative model API
        // gemini-2.5-flash-lite-preview-09-2025
        // gemini-2.5-flash-preview-09-2025
        // gemini-2.5-flash-lite
        // gemini-3-pro-preview
        // gemini-2.5-pro
		// gemini-2.5-flash-lite

        // gemini-live-2.5-flash *//



        genAIModel = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-lite-preview-09-2025',
            systemInstruction: getSystemPrompt(profile, customPrompt, false)
        });

        // Initialize chat session
        chatSession = genAIModel.startChat({
            history: [],
            generationConfig: {
                maxOutputTokens: 300,
            }
        });

        if (!isReconnection) {
            initializeNewSession();
        }

        sendToRenderer('update-status', 'Connected (Standard API)');
        isInitializingSession = false;
        sendToRenderer('session-initializing', false);

        // Reset audio buffer
        audioAccumulator = Buffer.alloc(0);
        preSpeechBuffer = Buffer.alloc(0);
        isSpeaking = false;
        silenceStart = null;

        return chatSession;

    } catch (error) {
        console.error('Failed to initialize Gemini session:', error);
        isInitializingSession = false;
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'Error: ' + error.message);
        return null;
    }
}

// VAD and Audio Processing Logic
async function processAudioChunk(chunk, geminiSessionRef) {
    // Calculate RMS first
    const int16Array = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.length / 2);
    let rms = 0;
    for (let i = 0; i < int16Array.length; i++) {
        rms += int16Array[i] * int16Array[i];
    }
    rms = Math.sqrt(rms / int16Array.length);

    const now = Date.now();

    // Debug logging for tuning (log ~10% of frames)
    // if (Math.random() < 0.1) {
    //     console.log('RMS:', rms.toFixed(0));
    // }

    if (rms > VAD_THRESHOLD) {
        if (!isSpeaking) {
            console.log(`[${new Date().toISOString()}] Speech detected... (RMS: ${rms.toFixed(0)})`);
            sendToRenderer('update-status', 'Listening...');
            // Start of speech: prepend pre-speech buffer
            audioAccumulator = Buffer.concat([preSpeechBuffer, chunk]);
            preSpeechBuffer = Buffer.alloc(0); // Clear it
            lastSpeechTime = now; // Reset timer for max duration
        } else {
            // Continue speech
            audioAccumulator = Buffer.concat([audioAccumulator, chunk]);
        }
        isSpeaking = true;
        silenceStart = null;
    } else {
        // Silence
        if (isSpeaking) {
            // We are in a speech turn, but currently silent (pause)
            audioAccumulator = Buffer.concat([audioAccumulator, chunk]);

            if (!silenceStart) {
                silenceStart = now;
            } else if (now - silenceStart > SILENCE_DURATION_MS) {
                // Silence detected for enough time -> End of turn
                console.log(`[${new Date().toISOString()}] End of speech detected. Sending audio...`);
                // Prevent race condition: Reset state BEFORE awaiting
                isSpeaking = false;
                silenceStart = null;
                await sendBufferedAudioToGemini(geminiSessionRef);
                audioAccumulator = Buffer.alloc(0); // Ensure clear
            }
        } else {
            // We are not speaking, just silence.
            // Update pre-speech buffer
            preSpeechBuffer = Buffer.concat([preSpeechBuffer, chunk]);
            if (preSpeechBuffer.length > PRE_SPEECH_BUFFER_SIZE) {
                // Keep only the last N bytes
                preSpeechBuffer = preSpeechBuffer.slice(preSpeechBuffer.length - PRE_SPEECH_BUFFER_SIZE);
            }
            // Do NOT append to audioAccumulator
        }
    }

    // Force send if buffer is too long (only if speaking)
    if (isSpeaking && audioAccumulator.length > 0 && (now - lastSpeechTime > MAX_AUDIO_DURATION_MS)) {
        console.log('Max duration reached. Sending audio...');
        // Prevent race condition
        isSpeaking = false;
        silenceStart = null;
        await sendBufferedAudioToGemini(geminiSessionRef);
        audioAccumulator = Buffer.alloc(0);
    }
}

async function sendBufferedAudioToGemini(geminiSessionRef) {
    if (!chatSession || audioAccumulator.length === 0) return;

    // Calculate duration based on sample rate (24kHz), 16-bit depth, mono
    // 24000 samples/sec * 2 bytes/sample = 48000 bytes/sec
    const durationMs = (audioAccumulator.length / 48000) * 1000;

    if (durationMs < MIN_AUDIO_DURATION_MS) {
        console.log(`Audio too short (${durationMs.toFixed(0)}ms), discarding.`);
        audioAccumulator = Buffer.alloc(0);
        return;
    }

    const audioData = audioAccumulator;
    // Clear buffer immediately to start capturing next turn
    audioAccumulator = Buffer.alloc(0);

    try {
        sendToRenderer('update-status', 'Thinking...');

        // Convert PCM to WAV (in-memory)
        const wavHeader = createWavHeader(audioData.length);
        const wavBuffer = Buffer.concat([wavHeader, audioData]);
        const base64Audio = wavBuffer.toString('base64');

        // Send to Gemini
        const startTime = Date.now();
        let hasStartedSending = false;

        // Start waiting timer
        let secondsWaiting = 0;
        const waitingInterval = setInterval(() => {
            secondsWaiting++;
            console.log(`Waiting for response: ${secondsWaiting}s...`);
        }, 1000);

        const result = await chatSession.sendMessageStream([
            {
                inlineData: {
                    mimeType: 'audio/wav',
                    data: base64Audio
                }
            }
        ]);

        let fullResponse = '';
        let isNoResponse = false;

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
                if (!hasStartedSending) {
                    clearInterval(waitingInterval); // Stop timer on first chunk
                    console.log(`[${new Date().toISOString()}] First chunk received (${Date.now() - startTime}ms)`);
                    hasStartedSending = true; // Mark as started for logging purposes (reused logic below)
                }
                fullResponse += chunkText;
                // Check if response starts with NO_RESPONSE
                if (fullResponse.includes('NO_RESPONSE')) {
                    isNoResponse = true;
                    break; // Stop processing this stream
                }
                sendToRenderer('update-response', fullResponse);
            }
        }

        clearInterval(waitingInterval); // Ensure timer is cleared if loop finishes without chunks (rare)

        if (!isNoResponse && fullResponse.trim().length > 0) {
            // Mock transcription since standard API doesn't provide it
            const mockTranscription = "[Audio Input]";
            saveConversationTurn(mockTranscription, fullResponse);
            sendToRenderer('update-status', 'Listening...');
        } else {
            // Silently ignore
            sendToRenderer('update-status', 'Listening...');
        }

    } catch (error) {
        // Handle specific "empty output" error gracefully
        const errorMessage = error.message || error.toString();
        if (errorMessage.includes('model output must contain either output text or tool calls')) {
            console.warn('Gemini returned empty output (likely no speech detected). Ignoring.');
            sendToRenderer('update-status', 'Listening...');
            return;
        }

        console.error('Error sending audio to Gemini:', error);
        sendToRenderer('update-status', 'Error: ' + errorMessage);
    }
}

function killExistingSystemAudioDump() {
    return new Promise(resolve => {
        const killProc = spawn('pkill', ['-f', 'SystemAudioDump'], { stdio: 'ignore' });
        killProc.on('close', () => resolve());
        killProc.on('error', () => resolve());
        setTimeout(() => { killProc.kill(); resolve(); }, 2000);
    });
}

async function startMacOSAudioCapture(geminiSessionRef) {
    if (process.platform !== 'darwin') return false;
    await killExistingSystemAudioDump();

    const { app } = require('electron');
    const path = require('path');
    let systemAudioPath = app.isPackaged
        ? path.join(process.resourcesPath, 'SystemAudioDump')
        : path.join(__dirname, '../assets', 'SystemAudioDump');

    const spawnOptions = {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PROCESS_NAME: 'AudioService', APP_NAME: 'System Audio Service' },
        detached: false,
        windowsHide: false
    };

    systemAudioProc = spawn(systemAudioPath, [], spawnOptions);

    if (!systemAudioProc.pid) return false;

    // Use smaller chunks for VAD responsiveness
    const CHUNK_DURATION = 0.05;
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

            // Send to VAD processor instead of direct send
            processAudioChunk(monoChunk, geminiSessionRef);
        }
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
        systemAudioProc.kill('SIGTERM');
        systemAudioProc = null;
    }
}

async function sendAudioToGemini(base64Data, geminiSessionRef) {
    // This function is called by Windows IPC handlers with base64 data
    // We need to convert it back to buffer and pass to VAD
    if (!chatSession) return;
    const buffer = Buffer.from(base64Data, 'base64');
    processAudioChunk(buffer, geminiSessionRef);
}

function setupGeminiIpcHandlers(geminiSessionRef) {
    global.geminiSessionRef = geminiSessionRef;

    ipcMain.handle('initialize-gemini', async (event, apiKey, customPrompt, profile, language) => {
        const session = await initializeGeminiSession(apiKey, customPrompt, profile, language);
        if (session) {
            geminiSessionRef.current = session;
            return true;
        }
        return false;
    });

    ipcMain.handle('send-audio-content', async (event, { data, mimeType }) => {
        // Windows sends base64 chunks
        const buffer = Buffer.from(data, 'base64');
        processAudioChunk(buffer, geminiSessionRef);
        return { success: true };
    });

    ipcMain.handle('send-mic-audio-content', async (event, { data, mimeType }) => {
        const buffer = Buffer.from(data, 'base64');
        processAudioChunk(buffer, geminiSessionRef);
        return { success: true };
    });

    // Rate limiting variables
    let lastImageSendTime = 0;
    const IMAGE_SEND_INTERVAL_MS = 8000; // Rate limit: 1 image every 8 seconds

    // Deduplication variables
    let lastAiResponseText = '';
    let lastAiResponseTime = 0;

    ipcMain.handle('send-image-content', async (event, { data, debug }) => {
        if (!chatSession) return { success: false, error: 'No active Gemini session' };

        // USER REQUEST: Disable screen context for now to focus on audio/text speed and accuracy
        return { success: true, skipped: true };
    });

    ipcMain.handle('send-text-message', async (event, text) => {
        if (!chatSession) return { success: false, error: 'No active Gemini session' };
        try {
            sendToRenderer('update-status', 'Thinking...');
            const result = await chatSession.sendMessageStream(text);
            let fullResponse = '';
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                    fullResponse += chunkText;
                    sendToRenderer('update-response', fullResponse);
                }
            }
            saveConversationTurn(text, fullResponse);
            sendToRenderer('update-status', 'Listening...');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ... keep other handlers (start-macos-audio, stop-macos-audio, close-session, etc.)
    ipcMain.handle('start-macos-audio', async event => {
        if (process.platform !== 'darwin') return { success: false, error: 'Not macOS' };
        try {
            const success = await startMacOSAudioCapture(geminiSessionRef);
            return { success };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('stop-macos-audio', async event => {
        stopMacOSAudioCapture();
        return { success: true };
    });

    ipcMain.handle('close-session', async event => {
        stopMacOSAudioCapture();
        chatSession = null;
        return { success: true };
    });
    ipcMain.handle('get-current-session', async event => {
        return { success: true, data: getCurrentSessionData() };
    });

    ipcMain.handle('start-new-session', async event => {
        initializeNewSession();
        return { success: true, sessionId: currentSessionId };
    });

    ipcMain.handle('update-google-search-setting', async (event, enabled) => {
        return { success: true };
    });
}

// Stub for attemptReconnection as it's less relevant for standard API
async function attemptReconnection() {
    return false;
}

module.exports = {
    initializeGeminiSession,
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
    setupGeminiIpcHandlers,
    attemptReconnection,
    formatSpeakerResults,
};
