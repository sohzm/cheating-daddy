// groq.js - Groq API integration for Speech-to-Text (Whisper) and Chat Completion (Llama models)
const { BrowserWindow, ipcMain } = require('electron');
const https = require('https');
const { URL } = require('url');
const { getSystemPrompt } = require('./prompts');

// Groq API configuration
const GROQ_API_BASE = 'https://api.groq.com/openai/v1';
const WHISPER_MODEL = 'whisper-large-v3-turbo';

// Available Llama models for chat completion
const LLAMA_MODELS = {
    'llama-4-maverick': 'meta-llama/llama-4-maverick-17b-128e-instruct',
    'llama-4-scout': 'meta-llama/llama-4-scout-17b-16e-instruct'
};

// Audio buffer for accumulating audio chunks before sending to Groq
let speechBuffer = []; // Only contains speech segments
let contextBuffer = []; // Rolling buffer for pre-speech context
let isProcessing = false;
let groqApiKey = null;

// Conversation history for context
let conversationHistory = [];
let currentSystemPrompt = '';

// Minimum audio duration in seconds before sending to Groq (to avoid sending tiny clips)
const MIN_AUDIO_DURATION_SECONDS = 1.5; // Reduced since we now only buffer speech
const SAMPLE_RATE = 24000; // 24kHz as used in the app
const BYTES_PER_SAMPLE = 2; // 16-bit PCM

// Context buffer settings - keep some silence before speech starts
const MAX_CONTEXT_CHUNKS = 10; // Keep ~1 second of pre-speech context

// Speech detection thresholds
const SILENCE_RMS_THRESHOLD = 300; // RMS below this is considered silence (lowered for sensitivity)
const SPEECH_RMS_THRESHOLD = 500; // RMS above this is considered speech

// Speech state tracking for smarter flush
let lastSpeechTime = 0; // Timestamp of last detected speech
let isSpeaking = false; // Currently in speech segment
const SILENCE_AFTER_SPEECH_MS = 1500; // Wait 1.5 seconds of silence after speech before flushing
const POST_SPEECH_CONTEXT_MS = 500; // Include 0.5s of silence after speech ends

// Periodic check timer
let checkTimer = null;
const CHECK_INTERVAL_MS = 500; // Check every 500ms for faster response

// Store selected model for chat completion
let selectedLlamaModel = 'llama-4-maverick';

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

/**
 * Calculate RMS (Root Mean Square) energy of PCM audio buffer
 */
function calculateRMS(pcmBuffer) {
    const samples = pcmBuffer.length / 2; // 2 bytes per sample (16-bit)
    let sumSquares = 0;

    for (let i = 0; i < samples; i++) {
        const sample = pcmBuffer.readInt16LE(i * 2);
        sumSquares += sample * sample;
    }

    return Math.sqrt(sumSquares / samples);
}

/**
 * Initialize Groq API with the provided API key
 */
function initializeGroq(apiKey, customPrompt = '', profile = 'interview', language = 'en-US') {
    groqApiKey = apiKey;
    conversationHistory = [];

    // Get system prompt (Groq doesn't support Google Search tool)
    const googleSearchEnabled = false;
    currentSystemPrompt = getSystemPrompt(profile, customPrompt, googleSearchEnabled);

    // Add language instruction
    const languageMap = {
        'en-US': 'English', 'en-GB': 'English', 'en-AU': 'English', 'en-IN': 'English',
        'es-ES': 'Spanish', 'es-US': 'Spanish', 'fr-FR': 'French', 'fr-CA': 'French',
        'de-DE': 'German', 'it-IT': 'Italian', 'pt-BR': 'Portuguese', 'hi-IN': 'Hindi',
        'ja-JP': 'Japanese', 'ko-KR': 'Korean', 'cmn-CN': 'Chinese (Simplified)',
    };

    const selectedLanguageName = languageMap[language] || 'English';
    currentSystemPrompt += `\n\n=== CRITICAL LANGUAGE INSTRUCTION ===
The user has selected ${selectedLanguageName} as their preferred language.
YOU MUST respond ONLY in ${selectedLanguageName}, regardless of what language the interviewer uses.`;

    console.log('[GROQ] Initialized with API key for profile:', profile);
    return true;
}

/**
 * Convert PCM audio buffer to WAV format
 */
function pcmToWav(pcmBuffer) {
    const numChannels = 1;
    const sampleRate = SAMPLE_RATE;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmBuffer.length;
    const fileSize = 36 + dataSize;

    const wavBuffer = Buffer.alloc(44 + dataSize);
    let offset = 0;

    // RIFF header
    wavBuffer.write('RIFF', offset); offset += 4;
    wavBuffer.writeUInt32LE(fileSize, offset); offset += 4;
    wavBuffer.write('WAVE', offset); offset += 4;

    // fmt chunk
    wavBuffer.write('fmt ', offset); offset += 4;
    wavBuffer.writeUInt32LE(16, offset); offset += 4;
    wavBuffer.writeUInt16LE(1, offset); offset += 2;
    wavBuffer.writeUInt16LE(numChannels, offset); offset += 2;
    wavBuffer.writeUInt32LE(sampleRate, offset); offset += 4;
    wavBuffer.writeUInt32LE(byteRate, offset); offset += 4;
    wavBuffer.writeUInt16LE(blockAlign, offset); offset += 2;
    wavBuffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

    // data chunk
    wavBuffer.write('data', offset); offset += 4;
    wavBuffer.writeUInt32LE(dataSize, offset); offset += 4;

    // Copy PCM data
    pcmBuffer.copy(wavBuffer, offset);

    return wavBuffer;
}

/**
 * Send audio to Groq Whisper API for transcription
 */
async function transcribeWithGroq(wavBuffer) {
    return new Promise((resolve, reject) => {
        if (!groqApiKey) {
            reject(new Error('Groq API key not initialized'));
            return;
        }

        const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

        // Build multipart form data
        const formDataParts = [];

        formDataParts.push(
            `--${boundary}\r\n`,
            `Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n`,
            `Content-Type: audio/wav\r\n\r\n`
        );

        const filePartHeader = Buffer.from(formDataParts.join(''));

        const modelPart = Buffer.from(
            `\r\n--${boundary}\r\n` +
            `Content-Disposition: form-data; name="model"\r\n\r\n` +
            `${WHISPER_MODEL}\r\n` +
            `--${boundary}--\r\n`
        );

        const requestBody = Buffer.concat([filePartHeader, wavBuffer, modelPart]);

        const url = new URL(`${GROQ_API_BASE}/audio/transcriptions`);

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqApiKey}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': requestBody.length
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const response = JSON.parse(data);
                        const transcription = response.text || '';
                        console.log('\n========================================');
                        console.log('[GROQ WHISPER] TRANSCRIPTION RESULT:');
                        console.log('----------------------------------------');
                        console.log(transcription);
                        console.log('========================================\n');
                        resolve(transcription);
                    } catch (e) {
                        console.error('[GROQ] Failed to parse response:', e);
                        reject(e);
                    }
                } else {
                    console.error('[GROQ] Whisper API Error:', res.statusCode, data);
                    // Handle specific error codes like Gemini does
                    if (res.statusCode === 401) {
                        sendToRenderer('update-status', 'Invalid API Key');
                        reject(new Error('Invalid API Key'));
                    } else if (res.statusCode === 429) {
                        sendToRenderer('update-status', 'API Quota Exceeded');
                        reject(new Error('API Quota Exceeded'));
                    } else {
                        reject(new Error(`Groq API error: ${res.statusCode}`));
                    }
                }
            });
        });

        req.on('error', (e) => {
            console.error('[GROQ] Request error:', e);
            reject(e);
        });

        req.write(requestBody);
        req.end();
    });
}

/**
 * Send chat completion request to Groq Llama model
 */
async function chatWithLlama(userMessage, model = 'llama-4-maverick', imageData = null) {
    return new Promise((resolve, reject) => {
        if (!groqApiKey) {
            reject(new Error('Groq API key not initialized'));
            return;
        }

        const modelId = LLAMA_MODELS[model] || LLAMA_MODELS['llama-4-maverick'];

        // Build messages array with conversation history
        const messages = [
            { role: 'system', content: currentSystemPrompt }
        ];

        // Add conversation history for context
        for (const turn of conversationHistory) {
            messages.push({ role: 'user', content: turn.userMessage });
            messages.push({ role: 'assistant', content: turn.assistantResponse });
        }

        // Add current user message
        if (imageData) {
            // Multimodal message with image
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: userMessage },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageData}` } }
                ]
            });
        } else {
            messages.push({ role: 'user', content: userMessage });
        }

        const requestBody = JSON.stringify({
            model: modelId,
            messages: messages,
            temperature: 0.7,
            max_tokens: 4096,
            stream: true
        });

        const url = new URL(`${GROQ_API_BASE}/chat/completions`);

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        };

        let responseText = '';

        const req = https.request(options, (res) => {
            res.on('data', (chunk) => {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) {
                                responseText += content;
                                // Stream to renderer
                                sendToRenderer('update-response', responseText);
                            }
                        } catch (e) {
                            // Skip invalid JSON lines
                        }
                    }
                }
            });

            res.on('end', () => {
                if (res.statusCode === 200 && responseText) {
                    console.log('\n========================================');
                    console.log('[GROQ LLAMA] RESPONSE:');
                    console.log('----------------------------------------');
                    console.log(responseText.substring(0, 200) + '...');
                    console.log('========================================\n');

                    // Save to conversation history
                    conversationHistory.push({
                        userMessage: userMessage,
                        assistantResponse: responseText
                    });

                    // Limit history to last 10 turns to prevent context overflow
                    if (conversationHistory.length > 10) {
                        conversationHistory = conversationHistory.slice(-10);
                    }

                    sendToRenderer('update-status', 'Listening...');
                    resolve(responseText);
                } else if (res.statusCode !== 200) {
                    console.error('[GROQ] Chat API Error:', res.statusCode);
                    // Handle specific error codes like Gemini does
                    if (res.statusCode === 401) {
                        sendToRenderer('update-status', 'Invalid API Key');
                        reject(new Error('Invalid API Key'));
                    } else if (res.statusCode === 429) {
                        sendToRenderer('update-status', 'API Quota Exceeded');
                        reject(new Error('API Quota Exceeded'));
                    } else {
                        sendToRenderer('update-status', 'Error: Chat failed');
                        reject(new Error(`Groq Chat API error: ${res.statusCode}`));
                    }
                } else {
                    resolve(responseText);
                }
            });
        });

        req.on('error', (e) => {
            console.error('[GROQ] Chat request error:', e);
            reject(e);
        });

        req.write(requestBody);
        req.end();
    });
}

/**
 * Add audio chunk to buffer with speech detection
 */
function addAudioChunk(pcmBuffer) {
    const chunkRMS = calculateRMS(pcmBuffer);
    const now = Date.now();
    const isSpeechChunk = chunkRMS >= SPEECH_RMS_THRESHOLD;

    if (isSpeechChunk) {
        // Speech detected!
        if (!isSpeaking) {
            // Speech just started - add context buffer first
            if (contextBuffer.length > 0) {
                speechBuffer.push(...contextBuffer);
                contextBuffer = [];
            }
            isSpeaking = true;
            console.log(`[GROQ] Speech started (RMS: ${chunkRMS.toFixed(0)})`);
        }
        // Add speech chunk to buffer
        speechBuffer.push(pcmBuffer);
        lastSpeechTime = now;
    } else {
        // Silence or low audio
        if (isSpeaking) {
            // Was speaking, now silence - add some post-speech context
            const timeSinceSpeech = now - lastSpeechTime;
            if (timeSinceSpeech < POST_SPEECH_CONTEXT_MS) {
                // Still in post-speech window, keep adding
                speechBuffer.push(pcmBuffer);
            } else {
                // Post-speech context complete
                isSpeaking = false;
            }
        } else {
            // Pure silence - add to rolling context buffer (trim to max size)
            contextBuffer.push(pcmBuffer);
            while (contextBuffer.length > MAX_CONTEXT_CHUNKS) {
                contextBuffer.shift();
            }
        }
    }

    // Start periodic check timer if we have speech and timer not running
    if (speechBuffer.length > 0 && !checkTimer) {
        checkTimer = setInterval(() => {
            checkAndFlush();
        }, CHECK_INTERVAL_MS);
    }
}

/**
 * Check if we should flush the speech buffer
 */
async function checkAndFlush() {
    if (isProcessing || speechBuffer.length === 0) {
        return;
    }

    const now = Date.now();
    const timeSinceSpeech = now - lastSpeechTime;
    const speechBytes = speechBuffer.reduce((sum, buf) => sum + buf.length, 0);
    const speechDuration = speechBytes / (SAMPLE_RATE * BYTES_PER_SAMPLE);

    // Time-based speech end detection (handles push-to-talk mode where mic turns off)
    // If enough time has passed since last speech, mark speaking as ended
    if (isSpeaking && timeSinceSpeech >= SILENCE_AFTER_SPEECH_MS) {
        console.log(`[GROQ] No audio for ${(timeSinceSpeech/1000).toFixed(1)}s - marking speech ended`);
        isSpeaking = false;
    }

    // Log status occasionally
    if (speechDuration >= 1) {
        console.log(`[GROQ] Speech buffer: ${speechDuration.toFixed(1)}s | Silence: ${(timeSinceSpeech/1000).toFixed(1)}s | Speaking: ${isSpeaking}`);
    }

    // Flush conditions:
    // 1. Have enough audio AND sustained silence after speech
    // 2. Buffer too large (>20s) - force flush
    const shouldFlush =
        (speechDuration >= MIN_AUDIO_DURATION_SECONDS && timeSinceSpeech >= SILENCE_AFTER_SPEECH_MS && !isSpeaking) ||
        (speechDuration > 20);

    if (shouldFlush) {
        if (speechDuration > 20) {
            console.log(`[GROQ] Buffer large (${speechDuration.toFixed(1)}s) - flushing...`);
        } else {
            console.log(`[GROQ] Speech ended ${(timeSinceSpeech/1000).toFixed(1)}s ago - flushing...`);
        }
        await processAudioBuffer();
    }

    // Stop timer if no more speech
    if (speechBuffer.length === 0 && checkTimer) {
        clearInterval(checkTimer);
        checkTimer = null;
    }
}

/**
 * Process accumulated audio buffer: transcribe with Whisper, then send to Llama
 */
async function processAudioBuffer(model = null) {
    if (isProcessing || speechBuffer.length === 0) {
        return null;
    }

    // Use provided model or stored model
    const chatModel = model || selectedLlamaModel;

    // Calculate total duration
    const totalBytes = speechBuffer.reduce((sum, buf) => sum + buf.length, 0);
    const totalDuration = totalBytes / (SAMPLE_RATE * BYTES_PER_SAMPLE);

    if (totalDuration < MIN_AUDIO_DURATION_SECONDS) {
        console.log(`[GROQ] Audio buffer too short (${totalDuration.toFixed(2)}s), waiting for more audio...`);
        return null;
    }

    isProcessing = true;
    sendToRenderer('update-status', 'Transcribing...');

    try {
        // Combine all audio chunks
        const combinedPcm = Buffer.concat(speechBuffer);
        speechBuffer = [];

        // Check audio energy
        const rms = calculateRMS(combinedPcm);
        console.log(`[GROQ] Audio RMS: ${rms.toFixed(0)}, threshold: ${SILENCE_RMS_THRESHOLD}`);

        if (rms < SILENCE_RMS_THRESHOLD) {
            console.log(`[GROQ] Audio too quiet (RMS: ${rms.toFixed(0)}), likely silence - skipping`);
            isProcessing = false;
            sendToRenderer('update-status', 'Listening...');
            return null;
        }

        console.log(`\n[GROQ] Processing ${totalDuration.toFixed(2)}s of audio (RMS: ${rms.toFixed(0)})...`);

        // Step 1: Transcribe with Whisper
        const wavBuffer = pcmToWav(combinedPcm);
        const transcription = await transcribeWithGroq(wavBuffer);

        if (!transcription || !transcription.trim()) {
            console.log('[GROQ] Empty transcription, skipping chat');
            isProcessing = false;
            sendToRenderer('update-status', 'Listening...');
            return null;
        }

        // Send transcription to renderer
        sendToRenderer('groq-transcription', transcription);
        sendToRenderer('update-status', 'Generating response...');

        // Step 2: Send transcription to Llama for response
        const response = await chatWithLlama(transcription, chatModel);

        // Reset speech tracking state
        isSpeaking = false;
        lastSpeechTime = 0;

        return { transcription, response };
    } catch (error) {
        console.error('[GROQ] Error processing audio:', error);
        sendToRenderer('update-status', 'Error: ' + error.message);
        isSpeaking = false;
        lastSpeechTime = 0;
        return null;
    } finally {
        isProcessing = false;
    }
}

/**
 * Force process the current audio buffer (called when VAD detects end of speech)
 */
async function flushAudioBuffer(model = null) {
    if (speechBuffer.length === 0) {
        return null;
    }

    // Cancel any pending check timer
    if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = null;
    }

    const totalBytes = speechBuffer.reduce((sum, buf) => sum + buf.length, 0);
    const totalDuration = totalBytes / (SAMPLE_RATE * BYTES_PER_SAMPLE);

    // Need at least 0.5 seconds for meaningful transcription
    // VAD triggered this flush, so we trust the end-of-speech detection
    if (totalDuration < 0.5) {
        // Too short - silently discard
        speechBuffer = [];
        contextBuffer = [];
        return null;
    }

    // Use provided model or stored model
    const chatModel = model || selectedLlamaModel;

    isProcessing = true;
    sendToRenderer('update-status', 'Transcribing...');
    console.log(`\n[GROQ] Flush processing ${totalDuration.toFixed(2)}s of audio...`);

    try {
        const combinedPcm = Buffer.concat(speechBuffer);
        speechBuffer = [];
        contextBuffer = [];

        const wavBuffer = pcmToWav(combinedPcm);
        const transcription = await transcribeWithGroq(wavBuffer);

        if (!transcription || !transcription.trim()) {
            console.log('[GROQ] Empty transcription from flush');
            isProcessing = false;
            sendToRenderer('update-status', 'Listening...');
            return null;
        }

        sendToRenderer('groq-transcription', transcription);
        sendToRenderer('update-status', 'Generating response...');

        // Send to Llama for response
        const response = await chatWithLlama(transcription, chatModel);

        // Reset state
        isSpeaking = false;
        lastSpeechTime = 0;

        return { transcription, response };
    } catch (error) {
        console.error('[GROQ] Error flushing audio:', error);
        sendToRenderer('update-status', 'Error: ' + error.message);
        return null;
    } finally {
        isProcessing = false;
    }
}

/**
 * Send screenshot + text to Llama for analysis
 */
async function analyzeWithLlama(text, imageData, model = 'llama-4-maverick') {
    if (!groqApiKey) {
        console.error('[GROQ] No API key initialized');
        sendToRenderer('update-status', 'Error: Groq not initialized');
        return null;
    }

    sendToRenderer('update-status', 'Analyzing screenshot...');
    console.log('[GROQ] Analyzing screenshot with text:', text.substring(0, 100) + '...');

    try {
        const response = await chatWithLlama(text, model, imageData);
        // Status will be set to 'Listening...' by chatWithLlama on success
        return response;
    } catch (error) {
        console.error('[GROQ] Error analyzing:', error);
        sendToRenderer('update-status', 'Error: ' + error.message);
        return null;
    }
}

/**
 * Clear the audio buffer without processing
 */
function clearAudioBuffer() {
    speechBuffer = [];
    contextBuffer = [];
    isSpeaking = false;
    lastSpeechTime = 0;
    if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = null;
    }
    console.log('[GROQ] Audio buffer cleared');
}

/**
 * Clear conversation history
 */
function clearConversationHistory() {
    conversationHistory = [];
    console.log('[GROQ] Conversation history cleared');
}

/**
 * Get current buffer duration in seconds
 */
function getBufferDuration() {
    const totalBytes = speechBuffer.reduce((sum, buf) => sum + buf.length, 0);
    return totalBytes / (SAMPLE_RATE * BYTES_PER_SAMPLE);
}

/**
 * Check if Groq is initialized
 */
function isGroqInitialized() {
    return groqApiKey !== null;
}

/**
 * Get conversation history
 */
function getConversationHistory() {
    return conversationHistory;
}

/**
 * Setup IPC handlers for Groq
 */
function setupGroqIpcHandlers() {
    ipcMain.handle('initialize-groq', async (event, apiKey, customPrompt = '', profile = 'interview', language = 'en-US') => {
        try {
            initializeGroq(apiKey, customPrompt, profile, language);
            return { success: true };
        } catch (error) {
            console.error('[GROQ] Initialization error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('groq-add-audio', async (event, { data }) => {
        try {
            const pcmBuffer = Buffer.from(data, 'base64');
            addAudioChunk(pcmBuffer);
            return { success: true };
        } catch (error) {
            console.error('[GROQ] Add audio error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('groq-process-audio', async (event, model = 'llama-4-maverick') => {
        try {
            selectedLlamaModel = model;
            const result = await processAudioBuffer(model);
            return { success: true, result };
        } catch (error) {
            console.error('[GROQ] Process audio error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('groq-flush-audio', async (event, model = 'llama-4-maverick') => {
        try {
            selectedLlamaModel = model;
            const result = await flushAudioBuffer(model);
            return { success: true, result };
        } catch (error) {
            console.error('[GROQ] Flush audio error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('groq-clear-audio', async (event) => {
        clearAudioBuffer();
        return { success: true };
    });

    ipcMain.handle('groq-chat', async (event, { message, model, imageData }) => {
        try {
            const response = await chatWithLlama(message, model, imageData);
            return { success: true, response };
        } catch (error) {
            console.error('[GROQ] Chat error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('groq-analyze-image', async (event, { text, imageData, model }) => {
        try {
            const response = await analyzeWithLlama(text, imageData, model);
            return { success: true, response };
        } catch (error) {
            console.error('[GROQ] Analyze image error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('groq-clear-history', async (event) => {
        clearConversationHistory();
        return { success: true };
    });

    ipcMain.handle('groq-get-history', async (event) => {
        return { success: true, history: getConversationHistory() };
    });

    console.log('[GROQ] IPC handlers registered');
}

module.exports = {
    initializeGroq,
    pcmToWav,
    transcribeWithGroq,
    chatWithLlama,
    analyzeWithLlama,
    addAudioChunk,
    processAudioBuffer,
    flushAudioBuffer,
    clearAudioBuffer,
    clearConversationHistory,
    getBufferDuration,
    isGroqInitialized,
    getConversationHistory,
    setupGroqIpcHandlers,
    sendToRenderer,
    LLAMA_MODELS
};
