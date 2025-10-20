const { GoogleGenAI } = require('@google/genai');
const { BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const { saveDebugAudio } = require('../audioUtils');
const { getSystemPrompt } = require('./prompts');

// Conversation tracking variables
let currentSessionId = null;
let currentTranscription = '';
let conversationHistory = [];
let isInitializingSession = false;

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

async function sendReconnectionContext() {
    if (!global.geminiSessionRef?.current || conversationHistory.length === 0) {
        return;
    }

    try {
        // Gather all transcriptions from the conversation history
        const transcriptions = conversationHistory
            .map(turn => turn.transcription)
            .filter(transcription => transcription && transcription.trim().length > 0);

        if (transcriptions.length === 0) {
            return;
        }

        // Create the context message
        const contextMessage = `Till now all these questions were asked in the interview, answer the last one please:\n\n${transcriptions.join(
            '\n'
        )}`;

        console.log('Sending reconnection context with', transcriptions.length, 'previous questions');

        // Send the context message to the new session
        await global.geminiSessionRef.current.sendRealtimeInput({
            text: contextMessage,
        });
    } catch (error) {
        console.error('Error sending reconnection context:', error);
    }
}

async function getEnabledTools() {
    const tools = [];

    // Check if Google Search is enabled (default: true)
    const googleSearchEnabled = await getStoredSetting('googleSearchEnabled', 'true');
    console.log('Google Search enabled:', googleSearchEnabled);

    if (googleSearchEnabled === 'true') {
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

async function attemptReconnection() {
    if (!lastSessionParams || reconnectionAttempts >= maxReconnectionAttempts) {
        console.log('Max reconnection attempts reached or no session params stored');
        sendToRenderer('update-status', 'Session closed');
        return false;
    }

    reconnectionAttempts++;
    console.log(`Attempting reconnection ${reconnectionAttempts}/${maxReconnectionAttempts}...`);

    // Wait before attempting reconnection
    await new Promise(resolve => setTimeout(resolve, reconnectionDelay));

    try {
        const session = await initializeGeminiSession(
            lastSessionParams.apiKey,
            lastSessionParams.customPrompt,
            lastSessionParams.profile,
            lastSessionParams.language,
            true // isReconnection flag
        );

        if (session && global.geminiSessionRef) {
            global.geminiSessionRef.current = session;
            reconnectionAttempts = 0; // Reset counter on successful reconnection
            console.log('Live session reconnected');

            // Send context message with previous transcriptions
            await sendReconnectionContext();

            return true;
        }
    } catch (error) {
        console.error(`Reconnection attempt ${reconnectionAttempts} failed:`, error);
    }

    // If this attempt failed, try again
    if (reconnectionAttempts < maxReconnectionAttempts) {
        return attemptReconnection();
    } else {
        console.log('All reconnection attempts failed');
        sendToRenderer('update-status', 'Session closed');
        return false;
    }
}

async function initializeGeminiSession(apiKey, customPrompt = '', profile = 'interview', language = 'en-US', isReconnection = false) {
    if (isInitializingSession) {
        console.log('Session initialization already in progress');
        return false;
    }

    isInitializingSession = true;
    sendToRenderer('session-initializing', true);

    // Store session parameters for reconnection (only if not already reconnecting)
    if (!isReconnection) {
        lastSessionParams = {
            apiKey,
            customPrompt,
            profile,
            language,
        };
        reconnectionAttempts = 0; // Reset counter for new session
    }

    const client = new GoogleGenAI({
        vertexai: false,
        apiKey: apiKey,
    });

    // Get enabled tools first to determine Google Search status
    const enabledTools = await getEnabledTools();
    const googleSearchEnabled = enabledTools.some(tool => tool.googleSearch);

    const systemPrompt = getSystemPrompt(profile, customPrompt, googleSearchEnabled);

    // Initialize new conversation session (only if not reconnecting)
    if (!isReconnection) {
        initializeNewSession();
    }

    try {
        const session = await client.live.connect({
            model: 'gemini-live-2.5-flash-preview',
            callbacks: {
                onopen: function () {
                    sendToRenderer('update-status', 'Live session connected');
                },
                onmessage: function (message) {
                    console.log('----------------', message);

                    if (message.serverContent?.inputTranscription?.results) {
                        currentTranscription += formatSpeakerResults(message.serverContent.inputTranscription.results);
                    }

                    // Handle AI model response
                    if (message.serverContent?.modelTurn?.parts) {
                        for (const part of message.serverContent.modelTurn.parts) {
                            console.log(part);
                            if (part.text) {
                                messageBuffer += part.text;
                                sendToRenderer('update-response', messageBuffer);
                            }
                        }
                    }

                    if (message.serverContent?.generationComplete) {
                        sendToRenderer('update-response', messageBuffer);

                        // Save conversation turn when we have both transcription and AI response
                        if (currentTranscription && messageBuffer) {
                            saveConversationTurn(currentTranscription, messageBuffer);
                            currentTranscription = ''; // Reset for next turn
                        }

                        messageBuffer = '';
                    }

                    if (message.serverContent?.turnComplete) {
                        sendToRenderer('update-status', 'Listening...');
                    }
                },
                onerror: function (e) {
                    console.debug('Error:', e.message);

                    // Check if the error is related to invalid API key
                    const isApiKeyError =
                        e.message &&
                        (e.message.includes('API key not valid') ||
                            e.message.includes('invalid API key') ||
                            e.message.includes('authentication failed') ||
                            e.message.includes('unauthorized'));

                    if (isApiKeyError) {
                        console.log('Error due to invalid API key - stopping reconnection attempts');
                        lastSessionParams = null; // Clear session params to prevent reconnection
                        reconnectionAttempts = maxReconnectionAttempts; // Stop further attempts
                        sendToRenderer('update-status', 'Error: Invalid API key');
                        return;
                    }

                    sendToRenderer('update-status', 'Error: ' + e.message);
                },
                onclose: function (e) {
                    console.debug('Session closed:', e.reason);

                    // Check if the session closed due to invalid API key
                    const isApiKeyError =
                        e.reason &&
                        (e.reason.includes('API key not valid') ||
                            e.reason.includes('invalid API key') ||
                            e.reason.includes('authentication failed') ||
                            e.reason.includes('unauthorized'));

                    if (isApiKeyError) {
                        console.log('Session closed due to invalid API key - stopping reconnection attempts');
                        lastSessionParams = null; // Clear session params to prevent reconnection
                        reconnectionAttempts = maxReconnectionAttempts; // Stop further attempts
                        sendToRenderer('update-status', 'Session closed: Invalid API key');
                        return;
                    }

                    // Attempt automatic reconnection for server-side closures
                    if (lastSessionParams && reconnectionAttempts < maxReconnectionAttempts) {
                        console.log('Attempting automatic reconnection...');
                        attemptReconnection();
                    } else {
                        sendToRenderer('update-status', 'Session closed');
                    }
                },
            },
            config: {
                responseModalities: ['TEXT'],
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
        sendToRenderer('session-initializing', false);
        return session;
    } catch (error) {
        console.error('Failed to initialize Gemini session:', error);
        isInitializingSession = false;
        sendToRenderer('session-initializing', false);
        return null;
    }
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

    // Spawn SystemAudioDump with stealth options
    const spawnOptions = {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
            ...process.env,
            // Set environment variables that might help with stealth
            PROCESS_NAME: 'AudioService',
            APP_NAME: 'System Audio Service',
        },
    };

    // On macOS, apply additional stealth measures
    if (process.platform === 'darwin') {
        spawnOptions.detached = false;
        spawnOptions.windowsHide = false;
    }

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
            const base64Data = monoChunk.toString('base64');
            sendAudioToGemini(base64Data, geminiSessionRef);

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

function setupGeminiIpcHandlers(geminiSessionRef) {
    // Store the geminiSessionRef globally for reconnection access
    global.geminiSessionRef = geminiSessionRef;

    ipcMain.handle('initialize-gemini', async (event, apiKey, customPrompt, profile = 'interview', language = 'en-US') => {
        const session = await initializeGeminiSession(apiKey, customPrompt, profile, language);
        if (session) {
            geminiSessionRef.current = session;
            return true;
        }
        return false;
    });

    ipcMain.handle('send-audio-content', async (event, { data, mimeType }) => {
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

    ipcMain.handle('send-image-content', async (event, { data, debug }) => {
        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };

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
            await geminiSessionRef.current.sendRealtimeInput({
                media: { data: data, mimeType: 'image/jpeg' },
            });

            return { success: true };
        } catch (error) {
            console.error('Error sending image:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('send-text-message', async (event, text) => {
        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };

        try {
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return { success: false, error: 'Invalid text message' };
            }

            console.log('Sending text message:', text);
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

            // Clear session params to prevent reconnection when user closes session
            lastSessionParams = null;

            // Cleanup any pending resources and stop audio/video capture
            if (geminiSessionRef.current) {
                await geminiSessionRef.current.close();
                geminiSessionRef.current = null;
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
    getEnabledTools,
    getStoredSetting,
    sendToRenderer,
    initializeNewSession,
    saveConversationTurn,
    getCurrentSessionData,
    sendReconnectionContext,
    killExistingSystemAudioDump,
    startMacOSAudioCapture,
    convertStereoToMono,
    stopMacOSAudioCapture,
    sendAudioToGemini,
    setupGeminiIpcHandlers,
    attemptReconnection,
    formatSpeakerResults,
};
