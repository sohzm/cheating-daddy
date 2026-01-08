// groq.js - Groq API integration for Speech-to-Text (Whisper) and Text Generation (Llama)
const { BrowserWindow, ipcMain } = require('electron');
const https = require('https');
const { URL } = require('url');

// Groq API configuration
const GROQ_API_BASE = 'https://api.groq.com/openai/v1';
const WHISPER_MODEL = 'whisper-large-v3-turbo';

// Audio buffer for accumulating audio chunks before sending to Groq
let audioBuffer = [];
let isProcessing = false;
let groqApiKey = null;

// Minimum audio duration in seconds before sending to Groq
const MIN_AUDIO_DURATION_SECONDS = 2.0;
const SAMPLE_RATE = 24000; // 24kHz as used in the app
const BYTES_PER_SAMPLE = 2; // 16-bit PCM

// Auto-flush timer for continuous audio accumulation
let autoFlushTimer = null;
const AUTO_FLUSH_INTERVAL_MS = 5000; // Flush every 5 seconds if we have enough audio

// Audio energy threshold - RMS below this is considered silence
const SILENCE_RMS_THRESHOLD = 500;

// Llama text generation configuration
let currentLlamaModel = 'meta-llama/llama-4-maverick-17b-128e-instruct';
let conversationHistory = [];
let currentProfile = 'interview';
let currentSystemPrompt = '';

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

/**
 * Calculate RMS (Root Mean Square) energy of PCM audio buffer
 * @param {Buffer} pcmBuffer - 16-bit PCM audio buffer
 * @returns {number} - RMS value
 */
function calculateRMS(pcmBuffer) {
    const samples = pcmBuffer.length / 2;
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
 * Set the Llama model to use for text generation
 * @param {string} model - Model ID
 */
function setLlamaModel(model) {
    currentLlamaModel = model;
    console.log(`[GROQ] Llama model set to: ${model}`);
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
    audioBuffer.push(pcmBuffer);

    // Calculate total duration
    const totalBytes = audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
    const totalDuration = totalBytes / (SAMPLE_RATE * BYTES_PER_SAMPLE);

    // Start auto-flush timer if not already running
    if (!autoFlushTimer && totalDuration >= MIN_AUDIO_DURATION_SECONDS) {
        autoFlushTimer = setTimeout(async () => {
            autoFlushTimer = null;
            if (audioBuffer.length > 0 && !isProcessing) {
                console.log('[GROQ] Auto-flushing audio buffer...');
                await processAudioBuffer();
            }
        }, AUTO_FLUSH_INTERVAL_MS);
    }
}

/**
 * Process accumulated audio buffer and send to Groq for transcription
 * @returns {Promise<string|null>} - Transcribed text or null if buffer too small
 */
async function processAudioBuffer() {
    if (isProcessing || audioBuffer.length === 0) {
        return null;
    }

    // Calculate total duration
    const totalBytes = audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
    const totalDuration = totalBytes / (SAMPLE_RATE * BYTES_PER_SAMPLE);

    if (totalDuration < MIN_AUDIO_DURATION_SECONDS) {
        console.log(`[GROQ] Audio buffer too short (${totalDuration.toFixed(2)}s), waiting for more audio...`);
        return null;
    }

    isProcessing = true;

    try {
        // Combine all audio chunks
        const combinedPcm = Buffer.concat(audioBuffer);
        audioBuffer = [];

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

        // Send transcription to renderer for display and processing
        if (transcription && transcription.trim()) {
            sendToRenderer('groq-transcription', transcription);
        }

        return transcription;
    } catch (error) {
        console.error('[GROQ] Error processing audio:', error);
        return null;
    } finally {
        isProcessing = false;
    }
}

/**
 * Force process the current audio buffer
 * @returns {Promise<string|null>}
 */
async function flushAudioBuffer() {
    if (audioBuffer.length === 0) {
        return null;
    }

    // Cancel any pending auto-flush
    if (autoFlushTimer) {
        clearTimeout(autoFlushTimer);
        autoFlushTimer = null;
    }

    const totalBytes = audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
    const totalDuration = totalBytes / (SAMPLE_RATE * BYTES_PER_SAMPLE);

    // Need at least 0.5 seconds for meaningful transcription
    if (totalDuration < 0.5) {
        audioBuffer = [];
        return null;
    }

    isProcessing = true;
    console.log(`\n[GROQ] Flush processing ${totalDuration.toFixed(2)}s of audio...`);

    try {
        const combinedPcm = Buffer.concat(audioBuffer);
        audioBuffer = [];

        const wavBuffer = pcmToWav(combinedPcm);
        const transcription = await transcribeWithGroq(wavBuffer);

        if (transcription && transcription.trim()) {
            sendToRenderer('groq-transcription', transcription);
        }

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
    audioBuffer = [];
    if (autoFlushTimer) {
        clearTimeout(autoFlushTimer);
        autoFlushTimer = null;
    }
    console.log('[GROQ] Audio buffer cleared');
}

/**
 * Get current buffer duration in seconds
 * @returns {number}
 */
function getBufferDuration() {
    const totalBytes = audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
    return totalBytes / (SAMPLE_RATE * BYTES_PER_SAMPLE);
}

/**
 * Check if Groq is initialized
 * @returns {boolean}
 */
function isGroqInitialized() {
    return groqApiKey !== null;
}

// ============================================================
// Llama Text Generation Functions
// ============================================================

/**
 * Set the current profile and system prompt for Llama generation
 * @param {string} profile - The profile name (interview, sales, etc.)
 * @param {string} systemPrompt - The system prompt to use
 */
function setLlamaConfig(profile, systemPrompt) {
    currentProfile = profile;
    currentSystemPrompt = systemPrompt;
    conversationHistory = [];
    console.log(`[GROQ LLAMA] Config set - Profile: ${profile}`);
}

/**
 * Generate a response using Llama via Groq API
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

        let fullResponse = '';
        let buffer = '';

        const req = https.request(options, (res) => {
            res.on('data', (chunk) => {
                buffer += chunk.toString();

                // Process complete SSE messages
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

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

                        // Limit history to last 10 exchanges
                        if (conversationHistory.length > 20) {
                            conversationHistory = conversationHistory.slice(-20);
                        }

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

    ipcMain.handle('groq-set-model', async (event, model) => {
        try {
            setLlamaModel(model);
            return { success: true };
        } catch (error) {
            console.error('[GROQ] Set model error:', error);
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
    ipcMain.handle('groq-set-llama-config', async (event, { profile, systemPrompt }) => {
        try {
            setLlamaConfig(profile, systemPrompt);
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
    setLlamaModel,
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
