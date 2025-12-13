// groq.js - Groq API integration for Speech-to-Text using Whisper Large V3 Turbo
const { BrowserWindow, ipcMain } = require('electron');
const https = require('https');
const { URL } = require('url');

// Groq API configuration
const GROQ_API_BASE = 'https://api.groq.com/openai/v1';
const WHISPER_MODEL = 'whisper-large-v3-turbo';

// Audio buffer for accumulating audio chunks before sending to Groq
let speechBuffer = []; // Only contains speech segments
let contextBuffer = []; // Rolling buffer for pre-speech context
let isProcessing = false;
let groqApiKey = null;

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

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

/**
 * Calculate RMS (Root Mean Square) energy of PCM audio buffer
 * @param {Buffer} pcmBuffer - 16-bit PCM audio buffer
 * @returns {number} - RMS value (0-32767 range for 16-bit audio)
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
 * @param {string} apiKey - Groq API key
 */
function initializeGroq(apiKey) {
    groqApiKey = apiKey;
    console.log('[GROQ] Initialized with API key');
    return true;
}

/**
 * Convert PCM audio buffer to WAV format
 * @param {Buffer} pcmBuffer - Raw PCM audio data (16-bit, mono, 24kHz)
 * @returns {Buffer} - WAV file buffer
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
    wavBuffer.writeUInt32LE(16, offset); offset += 4; // Chunk size
    wavBuffer.writeUInt16LE(1, offset); offset += 2; // Audio format (PCM)
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
 * @param {Buffer} wavBuffer - WAV audio buffer
 * @returns {Promise<string>} - Transcribed text
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

        // Add file field
        formDataParts.push(
            `--${boundary}\r\n`,
            `Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n`,
            `Content-Type: audio/wav\r\n\r\n`
        );

        const filePartHeader = Buffer.from(formDataParts.join(''));

        // Add model field
        const modelPart = Buffer.from(
            `\r\n--${boundary}\r\n` +
            `Content-Disposition: form-data; name="model"\r\n\r\n` +
            `${WHISPER_MODEL}\r\n` +
            `--${boundary}--\r\n`
        );

        // Combine all parts
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
                    console.error('[GROQ] API Error:', res.statusCode, data);
                    reject(new Error(`Groq API error: ${res.statusCode} - ${data}`));
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
 * Add audio chunk to buffer
 * @param {Buffer} pcmBuffer - PCM audio buffer (16-bit, mono, 24kHz)
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
            // Trim context buffer to max size
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
 * Process accumulated audio buffer and send to Groq for transcription
 * @returns {Promise<string|null>} - Transcribed text or null if buffer too small
 */
async function processAudioBuffer() {
    if (isProcessing || speechBuffer.length === 0) {
        return null;
    }

    // Calculate total duration
    const totalBytes = speechBuffer.reduce((sum, buf) => sum + buf.length, 0);
    const totalDuration = totalBytes / (SAMPLE_RATE * BYTES_PER_SAMPLE);

    if (totalDuration < MIN_AUDIO_DURATION_SECONDS) {
        console.log(`[GROQ] Audio buffer too short (${totalDuration.toFixed(2)}s), waiting for more audio...`);
        return null;
    }

    isProcessing = true;

    try {
        // Combine all audio chunks
        const combinedPcm = Buffer.concat(speechBuffer);

        // Clear buffer
        speechBuffer = [];

        // Check audio energy (RMS) to avoid sending silence
        const rms = calculateRMS(combinedPcm);
        console.log(`[GROQ] Audio RMS: ${rms.toFixed(0)}, threshold: ${SILENCE_RMS_THRESHOLD}`);

        if (rms < SILENCE_RMS_THRESHOLD) {
            console.log(`[GROQ] Audio too quiet (RMS: ${rms.toFixed(0)}), likely silence - skipping transcription`);
            isProcessing = false;
            return null;
        }

        console.log(`\n[GROQ] Processing ${totalDuration.toFixed(2)}s of audio (RMS: ${rms.toFixed(0)})...`);

        // Convert to WAV
        const wavBuffer = pcmToWav(combinedPcm);
        console.log(`[GROQ] Created WAV file: ${wavBuffer.length} bytes`);

        // Send to Groq for transcription
        const transcription = await transcribeWithGroq(wavBuffer);

        // Send transcription to renderer for display
        if (transcription && transcription.trim()) {
            sendToRenderer('groq-transcription', transcription);
        }

        // Reset speech tracking state for next utterance
        isSpeaking = false;
        lastSpeechTime = 0;

        return transcription;
    } catch (error) {
        console.error('[GROQ] Error processing audio:', error);
        // Reset state even on error
        isSpeaking = false;
        lastSpeechTime = 0;
        return null;
    } finally {
        isProcessing = false;
    }
}

/**
 * Force process the current audio buffer (called when VAD detects end of speech)
 * @returns {Promise<string|null>}
 */
async function flushAudioBuffer() {
    if (speechBuffer.length === 0) {
        return null;
    }

    // Cancel any pending check timer
    if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = null;
    }

    // Force process even if below minimum duration
    const totalBytes = speechBuffer.reduce((sum, buf) => sum + buf.length, 0);
    const totalDuration = totalBytes / (SAMPLE_RATE * BYTES_PER_SAMPLE);

    // Need at least 0.5 seconds for meaningful transcription
    if (totalDuration < 0.5) {
        // Too short - silently discard (don't spam logs)
        speechBuffer = [];
        contextBuffer = [];
        return null;
    }

    isProcessing = true;
    console.log(`\n[GROQ] Flush processing ${totalDuration.toFixed(2)}s of audio...`);

    try {
        const combinedPcm = Buffer.concat(speechBuffer);
        speechBuffer = [];
        contextBuffer = [];

        const wavBuffer = pcmToWav(combinedPcm);
        const transcription = await transcribeWithGroq(wavBuffer);

        if (transcription && transcription.trim()) {
            sendToRenderer('groq-transcription', transcription);
        }

        // Reset state
        isSpeaking = false;
        lastSpeechTime = 0;

        return transcription;
    } catch (error) {
        console.error('[GROQ] Error flushing audio:', error);
        return null;
    } finally {
        isProcessing = false;
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
 * Get current buffer duration in seconds
 * @returns {number}
 */
function getBufferDuration() {
    const totalBytes = speechBuffer.reduce((sum, buf) => sum + buf.length, 0);
    return totalBytes / (SAMPLE_RATE * BYTES_PER_SAMPLE);
}

/**
 * Check if Groq is initialized
 * @returns {boolean}
 */
function isGroqInitialized() {
    return groqApiKey !== null;
}

// Llama text generation configuration
const LLAMA_MODELS = {
    'llama-4-maverick': 'meta-llama/llama-4-maverick-17b-128e-instruct',
    'llama-4-scout': 'meta-llama/llama-4-scout-17b-16e-instruct'
};

// Default to Maverick
let currentLlamaModel = LLAMA_MODELS['llama-4-maverick'];

// Conversation history for context
let conversationHistory = [];
let currentProfile = 'interview';
let currentSystemPrompt = '';

/**
 * Set the current profile, system prompt, and model for Llama generation
 * @param {string} profile - The profile name (interview, sales, etc.)
 * @param {string} systemPrompt - The system prompt to use
 * @param {string} [model] - The model key ('llama-4-maverick' or 'llama-4-scout')
 */
function setLlamaConfig(profile, systemPrompt, model = 'llama-4-maverick') {
    currentProfile = profile;
    currentSystemPrompt = systemPrompt;
    currentLlamaModel = LLAMA_MODELS[model] || LLAMA_MODELS['llama-4-maverick'];
    conversationHistory = []; // Reset conversation on config change
    console.log(`[GROQ LLAMA] Config set - Profile: ${profile}, Model: ${model} (${currentLlamaModel})`);
}

/**
 * Generate a response using Llama 4 Maverick via Groq API
 * @param {string} userMessage - The user's question/transcription
 * @param {string} [imageBase64] - Optional base64 encoded image
 * @returns {Promise<string>} - The generated response
 */
async function generateWithLlama(userMessage, imageBase64 = null) {
    return new Promise((resolve, reject) => {
        if (!groqApiKey) {
            reject(new Error('Groq API key not initialized'));
            return;
        }

        console.log(`\n[GROQ LLAMA] Generating response for: "${userMessage.substring(0, 100)}..."`);
        sendToRenderer('update-status', 'Thinking...');

        // Build messages array
        const messages = [];

        // Add system prompt
        if (currentSystemPrompt) {
            messages.push({
                role: 'system',
                content: currentSystemPrompt
            });
        }

        // Add conversation history for context
        messages.push(...conversationHistory);

        // Add current user message
        const userContent = [];

        // Add text content
        userContent.push({
            type: 'text',
            text: userMessage
        });

        // Add image if provided (for vision-capable models)
        if (imageBase64) {
            userContent.push({
                type: 'image_url',
                image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                }
            });
        }

        messages.push({
            role: 'user',
            content: userContent.length === 1 ? userMessage : userContent
        });

        const requestBody = JSON.stringify({
            model: currentLlamaModel,
            messages: messages,
            temperature: 0.7,
            max_tokens: 4096,
            stream: true // Enable streaming for faster perceived response
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

        let fullResponse = '';
        let buffer = '';

        const req = https.request(options, (res) => {
            res.on('data', (chunk) => {
                buffer += chunk.toString();

                // Process complete SSE messages
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            continue;
                        }
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) {
                                fullResponse += content;
                                // Stream to renderer for live display
                                sendToRenderer('update-response', fullResponse);
                            }
                        } catch (e) {
                            // Ignore parse errors for incomplete chunks
                        }
                    }
                }
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    // Process any remaining buffer
                    if (buffer.startsWith('data: ') && buffer.slice(6) !== '[DONE]') {
                        try {
                            const parsed = JSON.parse(buffer.slice(6));
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) {
                                fullResponse += content;
                            }
                        } catch (e) {}
                    }

                    if (fullResponse) {
                        console.log('\n========================================');
                        console.log('[GROQ LLAMA] RESPONSE:');
                        console.log('----------------------------------------');
                        console.log(fullResponse.substring(0, 500) + (fullResponse.length > 500 ? '...' : ''));
                        console.log('========================================\n');

                        // Save to conversation history
                        conversationHistory.push(
                            { role: 'user', content: userMessage },
                            { role: 'assistant', content: fullResponse }
                        );

                        // Limit history to last 10 exchanges to prevent context overflow
                        if (conversationHistory.length > 20) {
                            conversationHistory = conversationHistory.slice(-20);
                        }

                        // Send final response to renderer
                        sendToRenderer('update-response', fullResponse);
                        sendToRenderer('update-status', 'Ready');
                        resolve(fullResponse);
                    } else {
                        sendToRenderer('update-status', 'No response');
                        reject(new Error('Empty response from Llama'));
                    }
                } else {
                    console.error('[GROQ LLAMA] API Error:', res.statusCode, buffer);
                    sendToRenderer('update-status', 'Error');
                    reject(new Error(`Groq Llama API error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (e) => {
            console.error('[GROQ LLAMA] Request error:', e);
            sendToRenderer('update-status', 'Error');
            reject(e);
        });

        req.write(requestBody);
        req.end();
    });
}

/**
 * Clear conversation history
 */
function clearConversationHistory() {
    conversationHistory = [];
    console.log('[GROQ LLAMA] Conversation history cleared');
}

/**
 * Setup IPC handlers for Groq
 */
function setupGroqIpcHandlers() {
    ipcMain.handle('initialize-groq', async (event, apiKey) => {
        try {
            initializeGroq(apiKey);
            return { success: true };
        } catch (error) {
            console.error('[GROQ] Initialization error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('groq-add-audio', async (event, { data }) => {
        try {
            // data is base64 encoded PCM
            const pcmBuffer = Buffer.from(data, 'base64');
            addAudioChunk(pcmBuffer);
            return { success: true };
        } catch (error) {
            console.error('[GROQ] Add audio error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('groq-process-audio', async (event) => {
        try {
            const transcription = await processAudioBuffer();
            return { success: true, transcription };
        } catch (error) {
            console.error('[GROQ] Process audio error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('groq-flush-audio', async (event) => {
        try {
            const transcription = await flushAudioBuffer();
            return { success: true, transcription };
        } catch (error) {
            console.error('[GROQ] Flush audio error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('groq-clear-audio', async (event) => {
        clearAudioBuffer();
        return { success: true };
    });

    // Llama text generation handlers
    ipcMain.handle('groq-set-llama-config', async (event, { profile, systemPrompt, model }) => {
        try {
            setLlamaConfig(profile, systemPrompt, model);
            return { success: true };
        } catch (error) {
            console.error('[GROQ] Set Llama config error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('groq-generate-response', async (event, { message, imageBase64 }) => {
        try {
            const response = await generateWithLlama(message, imageBase64);
            return { success: true, response };
        } catch (error) {
            console.error('[GROQ] Generate response error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('groq-clear-history', async (event) => {
        clearConversationHistory();
        return { success: true };
    });

    console.log('[GROQ] IPC handlers registered');
}

module.exports = {
    initializeGroq,
    pcmToWav,
    transcribeWithGroq,
    addAudioChunk,
    processAudioBuffer,
    flushAudioBuffer,
    clearAudioBuffer,
    getBufferDuration,
    isGroqInitialized,
    setupGroqIpcHandlers,
    sendToRenderer,
    // Llama text generation
    setLlamaConfig,
    generateWithLlama,
    clearConversationHistory
};
