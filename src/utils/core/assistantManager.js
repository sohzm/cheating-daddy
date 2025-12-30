const { GoogleGenAI, Modality } = require('@google/genai');
const { BrowserWindow, ipcMain } = require('electron');
const { getSystemPrompt, buildSystemPrompt } = require('../prompts');
const { getAvailableModel, incrementLimitCount, getApiKey, getPreferences, getCustomProfiles } = require('../../storage');
const { generateText, analyzeImage, processAudio } = require('../providers/registry');

// Core Utilities
const {
    startMacOSAudioCapture,
    stopMacOSAudioCapture,
    killExistingSystemAudioDump,
    sendAudioToGemini,
    convertStereoToMono
} = require('./audioCapture');

const { formatSpeakerResults } = require('./aiHelpers');
const { RATE_LIMIT_EXCEEDED } = require('./errors');

// Conversation tracking variables
let currentSessionId = null;
let currentTranscription = '';
let conversationHistory = [];
let screenAnalysisHistory = [];
let currentProfile = null;
let currentCustomPrompt = null;
let isInitializingSession = false;

// Audio capture variables
let messageBuffer = '';

// Audio Processing (Audio -> Text) state
let audioTextBuffer = Buffer.alloc(0);
let lastAudioProcessTime = Date.now();
const AUDIO_PROCESS_INTERVAL = 5000; // 5 seconds default for interval mode
let isProcessingAudio = false;
let manualRecordingActive = false;

// Reconnection variables
let isUserClosing = false;
let sessionParams = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 2000;

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

// Build context message for session restoration
function buildContextMessage() {
    const lastTurns = conversationHistory.slice(-20);
    const validTurns = lastTurns.filter(turn => turn.transcription?.trim() && turn.ai_response?.trim());

    if (validTurns.length === 0) return null;

    const contextLines = validTurns.map(turn =>
        `[Interviewer]: ${turn.transcription.trim()}\n[Your answer]: ${turn.ai_response.trim()}`
    );

    return `Session reconnected. Here's the conversation so far:\n\n${contextLines.join('\n\n')}\n\nContinue from here.`;
}

// Conversation management functions
function initializeNewSession(profile = null, customPrompt = null) {
    currentSessionId = Date.now().toString();
    currentTranscription = '';
    conversationHistory = [];
    screenAnalysisHistory = [];
    currentProfile = profile;
    currentCustomPrompt = customPrompt;
    console.log('New conversation session started:', currentSessionId, 'profile:', profile);

    // Save initial session with profile context
    if (profile) {
        sendToRenderer('save-session-context', {
            sessionId: currentSessionId,
            profile: profile,
            customPrompt: customPrompt || ''
        });
    }
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

function saveScreenAnalysis(prompt, response, model) {
    if (!currentSessionId) {
        initializeNewSession();
    }

    const analysisEntry = {
        timestamp: Date.now(),
        prompt: prompt,
        response: response.trim(),
        model: model
    };

    screenAnalysisHistory.push(analysisEntry);
    console.log('Saved screen analysis:', analysisEntry);

    // Send to renderer to save
    sendToRenderer('save-screen-analysis', {
        sessionId: currentSessionId,
        analysis: analysisEntry,
        fullHistory: screenAnalysisHistory,
        profile: currentProfile,
        customPrompt: currentCustomPrompt
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

async function initializeGeminiSession(apiKey, customPrompt = '', profile = 'interview', language = 'en-US', isReconnect = false) {
    if (isInitializingSession) {
        console.log('Session initialization already in progress');
        return false;
    }

    isInitializingSession = true;
    if (!isReconnect) {
        sendToRenderer('session-initializing', true);
    }

    // Store params for reconnection
    if (!isReconnect) {
        sessionParams = { apiKey, customPrompt, profile, language };
        reconnectAttempts = 0;
    }

    const client = new GoogleGenAI({
        vertexai: false,
        apiKey: apiKey,
        httpOptions: { apiVersion: 'v1alpha' },
    });
    const prefs = await getPreferences();
    const customProfiles = getCustomProfiles();

    const googleSearchEnabled = prefs.googleSearchEnabled !== false;
    const enabledTools = googleSearchEnabled ? [{ googleSearch: {} }] : [];

    // Check if selected profile is a custom one
    const customProfileModel = customProfiles.find(p => p.id === profile);
    let systemPrompt;

    if (customProfileModel) {
        console.log('Using Custom Profile:', customProfileModel.name);
        systemPrompt = buildSystemPrompt({
            persona: customProfileModel.settings.persona,
            length: customProfileModel.settings.length,
            format: customProfileModel.settings.format,
            context: customPrompt,
            googleSearch: googleSearchEnabled
        });
    } else {
        // Default/Legacy handling
        const detailedAnswers = prefs.detailedAnswers === true;
        systemPrompt = getSystemPrompt(profile, customPrompt, googleSearchEnabled, detailedAnswers);
    }

    // Initialize new conversation session only on first connect
    if (!isReconnect) {
        initializeNewSession(profile, customPrompt);
    }

    try {
        const session = await client.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            callbacks: {
                onopen: function () {
                    sendToRenderer('update-status', 'Live session connected');
                },
                onmessage: function (message) {

                    // Handle input transcription (what was spoken)
                    if (message.serverContent?.inputTranscription?.results) {
                        currentTranscription += formatSpeakerResults(message.serverContent.inputTranscription.results);
                    } else if (message.serverContent?.inputTranscription?.text) {
                        const text = message.serverContent.inputTranscription.text;
                        if (text.trim() !== '') {
                            currentTranscription += text;
                        }
                    }

                    // Handle AI response from modelTurn.parts or outputTranscription
                    if (message.serverContent?.modelTurn?.parts) {
                        for (const part of message.serverContent.modelTurn.parts) {
                            if (part.text && part.text.trim() !== '') {
                                const isNewResponse = messageBuffer === '';
                                messageBuffer += part.text;
                                sendToRenderer(isNewResponse ? 'new-response' : 'update-response', {
                                    text: messageBuffer,
                                    type: 'live',
                                    question: isNewResponse ? currentTranscription : undefined
                                });
                            }
                        }
                    }


                    if (message.serverContent?.outputTranscription?.text) {
                        const text = message.serverContent.outputTranscription.text;
                        if (text.trim() !== '') {
                            const isNewResponse = messageBuffer === '';
                            messageBuffer += text;
                            sendToRenderer(isNewResponse ? 'new-response' : 'update-response', {
                                text: messageBuffer,
                                type: 'live',
                                question: isNewResponse ? currentTranscription : undefined
                            });
                        }
                    }

                    if (message.serverContent?.generationComplete) {
                        // Only send/save if there's actual content
                        if (messageBuffer.trim() !== '') {
                            sendToRenderer('update-response', {
                                text: messageBuffer,
                                type: 'live'
                            });

                            // Save conversation turn when we have both transcription and AI response
                            if (currentTranscription) {
                                saveConversationTurn(currentTranscription, messageBuffer);
                                currentTranscription = ''; // Reset for next turn
                            }
                        }
                        messageBuffer = '';
                    }

                    if (message.serverContent?.interrupted) {
                        console.log('Session interrupted');
                        sendToRenderer('update-status', 'Interrupted');
                        // Treat as turn complete if we have content
                        if (messageBuffer.trim() !== '') {
                            // Mark as interrupted in the text
                            messageBuffer += '...';
                            sendToRenderer('update-response', {
                                text: messageBuffer,
                                type: 'live'
                            });

                            if (currentTranscription) {
                                saveConversationTurn(currentTranscription, messageBuffer);
                                currentTranscription = '';
                            }
                            messageBuffer = ''; // Reset buffer
                        }
                    }

                    if (message.serverContent?.turnComplete) {
                        sendToRenderer('update-status', 'Listening...');
                    }
                },
                onerror: function (e) {
                    console.log('Session error:', e.message);
                    sendToRenderer('update-status', 'Error: ' + e.message);
                },
                onclose: function (e) {
                    console.log('Session closed:', e.reason);

                    // Don't reconnect if user intentionally closed
                    if (isUserClosing) {
                        isUserClosing = false;
                        sendToRenderer('update-status', 'Session closed');
                        return;
                    }

                    // Attempt reconnection
                    if (sessionParams && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                        attemptReconnect();
                    } else {
                        sendToRenderer('update-status', 'Session closed');
                    }
                },
            },
            config: {
                responseModalities: [Modality.AUDIO], // TEXT not supported in Live API simultaneously
                enableAffectiveDialog: true,
                proactivity: { proactiveAudio: true },
                outputAudioTranscription: {}, // Request text transcription of the response
                inputAudioTranscription: {},
                // Use NO_INTERRUPTION to prevent "Session interrupted" from background noise/echo
                // This ensures the model finishes its response even if audio is detected.
                // The new input is still processed (queued), addressing the user's question.
                realtimeInputConfig: {
                    activityHandling: 'NO_INTERRUPTION'
                },
                tools: enabledTools,
                thinkingConfig: { thinkingBudget: 0 },
                contextWindowCompression: { slidingWindow: {} },
                speechConfig: {
                    languageCode: language,
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } }
                },
                systemInstruction: { parts: [{ text: systemPrompt }] },
            },
            generationConfig: {
                maxOutputTokens: 4000,
            },
        });

        isInitializingSession = false;
        if (!isReconnect) {
            sendToRenderer('session-initializing', false);
        }
        return session;
    } catch (error) {
        console.error('Failed to initialize Gemini session:', error);
        isInitializingSession = false;
        if (!isReconnect) {
            sendToRenderer('session-initializing', false);
        }
        return null;
    }
}

async function attemptReconnect() {
    reconnectAttempts++;
    console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);

    // Clear stale buffers
    messageBuffer = '';
    currentTranscription = '';

    sendToRenderer('update-status', `Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

    // Wait before attempting
    await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));

    try {
        const session = await initializeGeminiSession(
            sessionParams.apiKey,
            sessionParams.customPrompt,
            sessionParams.profile,
            sessionParams.language,
            true // isReconnect
        );

        if (session && global.geminiSessionRef) {
            global.geminiSessionRef.current = session;

            // Restore context from conversation history via text message
            const contextMessage = buildContextMessage();
            if (contextMessage) {
                try {
                    console.log('Restoring conversation context...');
                    await session.sendRealtimeInput({ text: contextMessage });
                } catch (contextError) {
                    console.error('Failed to restore context:', contextError);
                    // Continue without context - better than failing
                }
            }

            // Don't reset reconnectAttempts here - let it reset on next fresh session
            sendToRenderer('update-status', 'Reconnected! Listening...');
            console.log('Session reconnected successfully');
            return true;
        }
    } catch (error) {
        console.error(`Reconnection attempt ${reconnectAttempts} failed:`, error);
    }

    // If we still have attempts left, try again
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        return attemptReconnect();
    }

    // Max attempts reached - notify frontend
    console.log('Max reconnection attempts reached');
    sendToRenderer('reconnect-failed', {
        message: 'Tried 3 times to reconnect. Must be upstream/network issues. Try restarting or download updated app from site.',
    });
    sessionParams = null;
    return false;
}

async function sendImageToGeminiHttp(base64Data, prompt) {
    try {
        console.log(`Sending image to provider...`);

        // Use generic system prompt mechanism or fetch specific one
        const prefs = await getPreferences();
        const customProfiles = getCustomProfiles();
        const profile = prefs.selectedProfile || 'interview';
        const customPrompt = prefs.customPrompt || '';

        let systemPrompt;
        const customProfileModel = customProfiles.find(p => p.id === profile);

        if (customProfileModel) {
            systemPrompt = buildSystemPrompt({
                persona: customProfileModel.settings.persona,
                length: customProfileModel.settings.length,
                format: customProfileModel.settings.format,
                context: customPrompt,
                googleSearch: false // Vision usually doesn't need search tools
            });
        } else {
            const detailedAnswers = prefs.detailedAnswers === true;
            systemPrompt = getSystemPrompt(profile, customPrompt, false, detailedAnswers);
        }

        const { response, provider, model } = await analyzeImage(
            'screenAnalysis',
            base64Data,
            prompt,
            systemPrompt
        );

        console.log(`Image analysis started with ${provider}/${model}`);

        // Stream the response
        let fullText = '';
        let isFirst = true;

        for await (const chunkText of response) {
            if (chunkText) {
                fullText += chunkText;
                sendToRenderer(isFirst ? 'new-response' : 'update-response', {
                    text: fullText,
                    type: 'screen',
                    question: isFirst ? prompt : undefined
                });
                isFirst = false;
            }
        }

        console.log(`Image response completed from ${model}`);

        // Save screen analysis to history
        saveScreenAnalysis(prompt, fullText, model);

        return { success: true, text: fullText, model: model };
    } catch (error) {
        console.error('Error sending image to Provider:', error);
        return { success: false, error: error.message };
    }
}

async function processBufferedAudio(prefs) {
    if (isProcessingAudio || audioTextBuffer.length === 0) return;

    isProcessingAudio = true;
    const audioData = audioTextBuffer.toString('base64');
    audioTextBuffer = Buffer.alloc(0); // Clear buffer

    // Build proper system prompt
    const customProfiles = getCustomProfiles();
    const profile = prefs.selectedProfile || 'interview';
    const customPrompt = prefs.customPrompt || '';

    let systemPrompt;
    const customProfileModel = customProfiles.find(p => p.id === profile);

    if (customProfileModel) {
        systemPrompt = buildSystemPrompt({
            persona: customProfileModel.settings.persona,
            length: customProfileModel.settings.length,
            format: customProfileModel.settings.format,
            context: customPrompt,
            googleSearch: false
        });
    } else {
        const detailedAnswers = prefs.detailedAnswers === true;
        systemPrompt = getSystemPrompt(profile, customPrompt, false, detailedAnswers);
    }

    try {
        console.log('Processing buffered audio...');
        sendToRenderer('update-status', 'Processing audio...');

        const { response, provider, model, transcription } = await processAudio(
            audioData,
            systemPrompt, // Use the constructed system prompt as the instruction
            { mimeType: 'audio/pcm;rate=24000' }
        );

        let fullText = '';
        let isFirst = true;

        for await (const chunkText of response) {
            if (chunkText) {
                fullText += chunkText;
                sendToRenderer(isFirst ? 'new-response' : 'update-response', {
                    text: fullText,
                    type: 'text', // Treat as text response
                    question: transcription // Include transcription for sidebar
                });
                isFirst = false;
            }
        }

        sendToRenderer('update-status', 'Listening...');

    } catch (error) {
        if (error.message === RATE_LIMIT_EXCEEDED) {
            console.log('Whisper limit reached, switching to Live Conversation mode');
            sendToRenderer('update-status', 'Limit reached. Switching to Live Audio...');
            sendToRenderer('toast', { type: 'warning', message: 'Audio-to-Text limits reached. Switched to Live Conversation.' });

            // Switch to Live Conversation
            const storage = require('../../storage');
            await storage.updatePreference('audioProcessingMode', 'live-conversation');

            // Notify frontend to refresh state
            sendToRenderer('setting-changed', { key: 'audioProcessingMode', value: 'live-conversation' });
        } else {
            console.error('Error processing audio:', error);
            sendToRenderer('update-status', 'Error: ' + error.message);
        }
    } finally {
        isProcessingAudio = false;
    }
}

function setupAssistantIpcHandlers(geminiSessionRef) {
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
        try {
            const prefs = await getPreferences();

            // Audio -> Text Mode
            if (prefs.audioProcessingMode === 'audio-to-text') {
                // Simple Energy-based VAD (Root Mean Square)
                const chunk = Buffer.from(data, 'base64');
                let sum = 0;
                // Process 16-bit samples
                for (let i = 0; i < chunk.length; i += 2) {
                    const sample = chunk.readInt16LE(i);
                    sum += sample * sample;
                }
                const rms = Math.sqrt(sum / (chunk.length / 2));

                // Threshold for silence (adjustable) - typical noise floor is ~100-300
                // Increased to 800 to filter out background noise/breathing
                const VAD_THRESHOLD = 800;

                if (rms > VAD_THRESHOLD) {
                    // Speech detected
                    audioTextBuffer = Buffer.concat([audioTextBuffer, chunk]);
                    lastAudioProcessTime = Date.now(); // Reset timer on speech
                } else {
                    // Silence - do nothing or perhaps check buffer age to process pending speech
                }

                // Process if buffer is large enough (e.g., > 2 seconds of speech) OR time interval passed since last clear
                const method = prefs.audioTriggerMethod || 'vad';

                if (method === 'manual') {
                    if (manualRecordingActive) {
                        audioTextBuffer = Buffer.concat([audioTextBuffer, chunk]);
                    }
                    return { success: true };
                }

                // VAD Logic (only if not manual)
                // 2 seconds of audio at 24kHz * 2 bytes = 96000 bytes
                const MIN_BUFFER_SIZE = 24000 * 2 * 2;

                if (audioTextBuffer.length >= MIN_BUFFER_SIZE) {
                    processBufferedAudio(prefs);
                } else if (audioTextBuffer.length > 0 && Date.now() - lastAudioProcessTime > 1500) {
                    // Flush older buffer if silence follows speech
                    processBufferedAudio(prefs);
                }

                return { success: true };
            }

            // Live Conversation Mode (Legacy)
            if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };
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

    ipcMain.handle('send-image-content', async (event, { data, prompt }) => {
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

            // Use HTTP API instead of realtime session
            const result = await sendImageToGeminiHttp(data, prompt);
            return result;
        } catch (error) {
            console.error('Error sending image:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('send-text-message', async (event, text) => {
        try {
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return { success: false, error: 'Invalid text message' };
            }

            console.log('Sending text message to Provider logic...');

            const prefs = await getPreferences();
            const customProfiles = getCustomProfiles();
            const profile = prefs.selectedProfile || 'interview';
            const customPrompt = prefs.customPrompt || '';
            const detailedAnswers = prefs.detailedAnswers === true;

            const customProfileModel = customProfiles.find(p => p.id === profile);
            let systemPrompt;

            if (customProfileModel) {
                systemPrompt = buildSystemPrompt({
                    persona: customProfileModel.settings.persona,
                    length: customProfileModel.settings.length,
                    format: customProfileModel.settings.format,
                    context: customPrompt,
                    googleSearch: true
                });
            } else {
                systemPrompt = getSystemPrompt(profile, customPrompt, true, detailedAnswers);
            }

            const { response, provider, model } = await generateText(
                'textMessage',
                text,
                systemPrompt
            );

            let fullText = '';
            let isFirst = true;

            for await (const chunkText of response) {
                if (chunkText) {
                    fullText += chunkText;
                    sendToRenderer(isFirst ? 'new-response' : 'update-response', {
                        text: fullText,
                        type: 'text',
                        question: isFirst ? text : undefined
                    });
                    isFirst = false;
                }
            }

            return { success: true, text: fullText, model: model };
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

            // Set flag to prevent reconnection attempts
            isUserClosing = true;
            sessionParams = null;

            // Cleanup session
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

// Manual Audio Trigger Handler
async function toggleManualRecording() {
    const prefs = await getPreferences();
    if (prefs.audioProcessingMode !== 'audio-to-text' || prefs.audioTriggerMethod !== 'manual') {
        return;
    }

    if (manualRecordingActive) {
        // Stop & Process
        manualRecordingActive = false;
        sendToRenderer('update-status', 'Processing...');
        await processBufferedAudio(prefs);
    } else {
        // Start Recording
        manualRecordingActive = true;
        audioTextBuffer = Buffer.alloc(0); // Clear previous
        sendToRenderer('update-status', 'Listening...');
    }
}

module.exports = {
    initializeGeminiSession,
    getEnabledTools,
    getStoredSetting,
    sendToRenderer,
    initializeNewSession,
    saveConversationTurn,
    getCurrentSessionData,
    killExistingSystemAudioDump, // Export from audioCapture
    startMacOSAudioCapture, // Export from audioCapture
    convertStereoToMono, // Export from audioCapture
    stopMacOSAudioCapture, // Export from audioCapture
    sendAudioToGemini, // Export from audioCapture
    sendImageToGeminiHttp,
    setupAssistantIpcHandlers, // Renamed
    toggleManualRecording,
};
