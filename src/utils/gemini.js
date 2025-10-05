const { GoogleGenAI } = require('@google/genai');
const { BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const { saveDebugAudio } = require('../audioUtils');
const { getSystemPrompt } = require('./prompts');
const { composioService } = require('./composio');

// Conversation tracking variables
let currentSessionId = null;
let currentTranscription = '';
let conversationHistory = [];
let isInitializingSession = false;
let transcriptOnlyMode = false; // New mode for recording transcripts without AI responses
let liveResponsesEnabled = false; // When false, stream transcripts but do not generate AI responses
let storedTranscripts = []; // Store transcripts for later analysis

/**
 * Detect if transcribed text contains voice assistant patterns
 * @param {string} text - The transcribed text to analyze
 * @returns {boolean} - Whether the text appears to be from a voice assistant
 */
function isVoiceAssistantText(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }

    const lowerText = text.toLowerCase().trim();
    
    // Voice assistant wake words and patterns
    const wakeWords = [
        'hey siri', 'ok google', 'alexa', 'hey cortana', 'hey assistant',
        'computer', 'jarvis', 'hey google', 'okay google'
    ];

    // Voice assistant response patterns
    const assistantPatterns = [
        'i\'m sorry', 'im sorry', 'i don\'t understand', 'i dont understand',
        'i can\'t help', 'i cant help', 'i\'m not sure', 'im not sure',
        'here\'s what i found', 'heres what i found', 'i found this',
        'according to', 'let me search', 'i\'ll help you', 'ill help you',
        'i can help you', 'what can i help', 'how can i assist',
        'i\'m here to help', 'im here to help', 'i\'m your assistant', 'im your assistant'
    ];

    // System/device response patterns
    const systemPatterns = [
        'system', 'device', 'connected', 'disconnected', 'battery',
        'low battery', 'charging', 'volume', 'brightness', 'settings',
        'notification', 'alert', 'warning', 'error', 'success',
        'wifi', 'bluetooth', 'location', 'permission', 'access'
    ];

    // Check for wake words
    const hasWakeWord = wakeWords.some(wakeWord => 
        lowerText.includes(wakeWord)
    );

    // Check for assistant response patterns
    const hasAssistantPattern = assistantPatterns.some(pattern => 
        lowerText.includes(pattern)
    );

    // Check for system patterns
    const hasSystemPattern = systemPatterns.some(pattern => 
        lowerText.includes(pattern)
    );

    // Additional heuristics - only block very short responses that are likely system confirmations
    const isShortResponse = lowerText.length < 10 && (
        lowerText === 'yes' || lowerText === 'no' || 
        lowerText === 'ok' || lowerText === 'okay' ||
        lowerText === 'sure' || lowerText === 'right' ||
        lowerText === 'done' || lowerText === 'ready'
    );

    const isCommandResponse = lowerText.includes('command') || 
                             lowerText.includes('executed') ||
                             lowerText.includes('completed');

    const isVoiceAssistant = hasWakeWord || hasAssistantPattern || hasSystemPattern || 
                            isShortResponse || isCommandResponse;

    if (isVoiceAssistant) {
        console.log(`[Voice Assistant Filter] Detected voice assistant text: "${text}"`);
        console.log(`[Voice Assistant Filter] Reasons: wakeWord=${hasWakeWord}, assistantPattern=${hasAssistantPattern}, systemPattern=${hasSystemPattern}, shortResponse=${isShortResponse}, commandResponse=${isCommandResponse}`);
    }

    return isVoiceAssistant;
}

/**
 * Determine if a transcription should be processed based on quality and content
 * @param {string} transcription - The transcribed text to analyze
 * @returns {boolean} - Whether the transcription should be processed
 */
function shouldProcessTranscription(transcription) {
    if (!transcription || typeof transcription !== 'string') {
        return false;
    }

    const text = transcription.trim();
    
    // Minimum length requirement (at least 3 words)
    const words = text.split(/\s+/).filter(word => word.length > 0);
    if (words.length < 3) {
        return false;
    }

    // Skip very short utterances that are likely not meaningful
    if (text.length < 15) {
        return false;
    }

    // Skip common filler words and sounds
    const fillerWords = [
        'um', 'uh', 'ah', 'er', 'hmm', 'well', 'so', 'like', 'you know',
        'i mean', 'actually', 'basically', 'literally', 'obviously'
    ];
    
    const lowerText = text.toLowerCase();
    const isMostlyFiller = fillerWords.some(filler => 
        lowerText.includes(filler) && words.length < 5
    );
    
    if (isMostlyFiller) {
        return false;
    }

    // Skip repetitive or stuttering patterns
    const wordsArray = lowerText.split(/\s+/);
    const uniqueWords = new Set(wordsArray);
    if (wordsArray.length > 3 && uniqueWords.size < wordsArray.length * 0.6) {
        return false; // Too much repetition
    }

    // Skip incomplete sentences that end abruptly
    if (text.endsWith('...') || text.endsWith('..') || text.endsWith('.')) {
        // Check if it's a complete thought
        const sentenceEndings = ['.', '!', '?'];
        const lastChar = text[text.length - 1];
        if (sentenceEndings.includes(lastChar) && words.length >= 4) {
            return true; // Complete sentence
        }
    }

    // Require at least one complete word (not just letters)
    const hasCompleteWords = words.some(word => 
        word.length >= 3 && /^[a-zA-Z]+$/.test(word)
    );

    return hasCompleteWords;
}

function formatSpeakerResults(results) {
    let text = '';
    for (const result of results) {
        if (result.transcript && result.speakerId) {
            const speakerLabel = result.speakerId === 1 ? 'Interviewer' : 'Candidate';
            const transcriptText = result.transcript;
            
            // Check if this transcript is from a voice assistant
            if (isVoiceAssistantText(transcriptText)) {
                console.log(`[Voice Assistant Filter] Blocking voice assistant transcript: "${transcriptText}"`);
                continue; // Skip this transcript
            }
            
            text += `[${speakerLabel}]: ${transcriptText}\n`;
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

function saveTranscriptOnly(transcription) {
    if (!currentSessionId) {
        initializeNewSession();
    }

    const transcriptEntry = {
        timestamp: Date.now(),
        transcription: transcription.trim(),
        sessionId: currentSessionId,
    };

    storedTranscripts.push(transcriptEntry);
    console.log('Saved transcript (no AI response):', transcriptEntry);

    // Send to renderer to save transcript without AI response
    sendToRenderer('save-transcript-only', {
        sessionId: currentSessionId,
        transcript: transcriptEntry,
        allTranscripts: storedTranscripts,
    });
}

function analyzeStoredTranscripts(userQuery) {
    if (storedTranscripts.length === 0) {
        return {
            success: false,
            message: "No transcripts available to analyze."
        };
    }

    // Combine all stored transcripts into a single text
    const combinedTranscript = storedTranscripts
        .map(entry => `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.transcription}`)
        .join('\n');

    console.log('Analyzing stored transcripts:', storedTranscripts.length, 'entries');
    
    // Return the combined transcript for AI analysis
    return {
        success: true,
        combinedTranscript,
        transcriptCount: storedTranscripts.length,
        userQuery
    };
}

function clearStoredTranscripts() {
    storedTranscripts = [];
    console.log('Cleared stored transcripts');
    sendToRenderer('transcripts-cleared', { sessionId: currentSessionId });
}

function setTranscriptOnlyMode(enabled) {
    transcriptOnlyMode = enabled;
    console.log('Transcript-only mode:', enabled ? 'ENABLED' : 'DISABLED');
    // When transcript-only mode is enabled, also disable live responses
    if (enabled) {
        liveResponsesEnabled = false;
    }
    
    // If we have an active session, we need to restart it with new configuration
    if (global.geminiSessionRef?.current) {
        console.log('Restarting session with new transcript-only mode configuration...');
        // Close current session
        global.geminiSessionRef.current.close();
        global.geminiSessionRef.current = null;
        
        // Restart session with new configuration
        setTimeout(async () => {
            try {
                const session = await initializeGeminiSession(
                    lastSessionParams.apiKey,
                    lastSessionParams.customPrompt,
                    lastSessionParams.profile,
                    lastSessionParams.language,
                    true, // isReconnection flag
                    lastSessionParams.composioApiKey
                );
                if (session) {
                    global.geminiSessionRef.current = session;
                    console.log('Session restarted with transcript-only mode:', enabled);
                }
            } catch (error) {
                console.error('Failed to restart session:', error);
            }
        }, 1000);
    }
    
    sendToRenderer('transcript-mode-changed', { 
        transcriptOnlyMode: enabled,
        liveResponsesEnabled,
        sessionId: currentSessionId 
    });
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
    } else {
        console.log('Google Search tool disabled');
    }

    // Add Composio tools if service is initialized
    if (composioService.isServiceInitialized()) {
        try {
            const composioTools = await composioService.getToolsForGemini('default-user', [
                'GMAIL_SEND_EMAIL',
                'GMAIL_GET_EMAILS',
                'GMAIL_SEARCH_EMAILS',
                'GMAIL_REPLY_TO_EMAIL'
            ]);
            
            if (composioTools && composioTools.length > 0) {
                // Clean and convert Composio tools to Gemini format
                const cleanedTools = composioTools.map(tool => {
                    // Create a deep copy and clean unsupported properties
                    const cleanedTool = JSON.parse(JSON.stringify(tool));
                    
                    // Clean up parameters to remove unsupported properties
                    if (cleanedTool.parameters && cleanedTool.parameters.properties) {
                        const cleanedProperties = {};
                        for (const [key, value] of Object.entries(cleanedTool.parameters.properties)) {
                            // Remove unsupported properties for Gemini
                            const cleanedValue = { ...value };
                            delete cleanedValue.file_uploadable;
                            delete cleanedValue.format;
                            delete cleanedValue.title; // Remove title as it's not needed
                            delete cleanedValue.examples; // Remove examples as it's not supported by Gemini
                            
                            // Keep only essential properties
                            const essentialProps = ['type', 'description', 'default', 'nullable', 'items'];
                            const filteredValue = {};
                            for (const prop of essentialProps) {
                                if (cleanedValue[prop] !== undefined) {
                                    filteredValue[prop] = cleanedValue[prop];
                                }
                            }
                            
                            cleanedProperties[key] = filteredValue;
                        }
                        cleanedTool.parameters.properties = cleanedProperties;
                    }
                    
                    return cleanedTool;
                });
                
                // Convert to Gemini format
                const geminiTools = cleanedTools.map(tool => ({
                    functionDeclarations: [tool]
                }));
                tools.push(...geminiTools);
                console.log(`Added ${cleanedTools.length} Composio tools`);
            }
        } catch (error) {
            console.error('Failed to load Composio tools:', error);
            console.log('Continuing without Composio tools...');
        }
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
            true, // isReconnection flag
            lastSessionParams.composioApiKey
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

async function initializeGeminiSession(apiKey, customPrompt = '', profile = 'interview', language = 'en-US', isReconnection = false, composioApiKey = null) {
    if (isInitializingSession) {
        console.log('Session initialization already in progress');
        return false;
    }

    isInitializingSession = true;
    sendToRenderer('session-initializing', true);

    // Use environment variable if apiKey is not provided
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

    // Store session parameters for reconnection (only if not already reconnecting)
    if (!isReconnection) {
        lastSessionParams = {
            apiKey: finalApiKey,
            customPrompt,
            profile,
            language,
            composioApiKey,
        };
        reconnectionAttempts = 0; // Reset counter for new session
    }

    const client = new GoogleGenAI({
        vertexai: false,
        apiKey: finalApiKey,
    });

    // Initialize Composio service if API key is provided
    if (composioApiKey && !composioService.isServiceInitialized()) {
        console.log('Initializing Composio service...');
        await composioService.initialize(composioApiKey, finalApiKey);
    }

    // Get enabled tools first to determine Google Search status
    let enabledTools;
    try {
        enabledTools = await getEnabledTools();
    } catch (error) {
        console.error('Error getting enabled tools:', error);
        // Fallback to just Google Search if Composio tools fail
        enabledTools = [];
        const googleSearchEnabled = await getStoredSetting('googleSearchEnabled', 'true');
        if (googleSearchEnabled === 'true') {
            enabledTools.push({ googleSearch: {} });
        }
    }
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
                onmessage: async function (message) {
                    console.log('----------------', message);

                    if (message.serverContent?.inputTranscription?.results) {
                        const transcriptionText = formatSpeakerResults(message.serverContent.inputTranscription.results);
                        
                        // Check if the transcription contains voice assistant content
                        if (transcriptionText && isVoiceAssistantText(transcriptionText)) {
                            console.log(`[Voice Assistant Filter] Blocking voice assistant transcription from being processed`);
                            return; // Skip processing this message entirely
                        }
                        
                        // Stream transcripts to renderer regardless, but gate model response accumulation
                        if (transcriptionText) {
                            // Always notify renderer with streaming transcript text
                            sendToRenderer('transcript-stream', { text: transcriptionText });

                            // Additional filtering to reduce unnecessary responses
                            if (shouldProcessTranscription(transcriptionText)) {
                                if (transcriptOnlyMode) {
                                    // In transcript-only mode, save transcript without triggering AI response
                                    saveTranscriptOnly(transcriptionText);
                                    return; // Don't accumulate for AI processing
                                }

                                // If live responses are disabled, keep storing as transcript and skip model reply accumulation
                                if (!liveResponsesEnabled) {
                                    saveTranscriptOnly(transcriptionText);
                                    return;
                                }

                                // Else, accumulate to pair with a later AI response
                                currentTranscription += transcriptionText;
                            } else {
                                console.log(`[Audio Filter] Skipping short or low-quality transcription: "${transcriptionText}"`);
                            }
                        }
                    }

                    // Handle AI model response - skip entirely in transcript-only mode or when live responses disabled
                    if (!transcriptOnlyMode && liveResponsesEnabled && message.serverContent?.modelTurn?.parts) {
                        // Accumulate text chunks silently; only send once on generationComplete
                        for (const part of message.serverContent.modelTurn.parts) {
                            console.log(part);
                            if (part.text) {
                                messageBuffer += part.text;
                            }
                            
                            // Handle function calls
                            if (part.functionCall && composioService.isServiceInitialized()) {
                                try {
                                    console.log('🔧 Executing function call:', part.functionCall.name);
                                    const result = await composioService.executeFunctionCall('default-user', {
                                        name: part.functionCall.name,
                                        args: part.functionCall.args || {}
                                    });
                                    console.log('✅ Function call result:', result);
                                    
                                    // Send function call result to renderer
                                    sendToRenderer('function-call-result', {
                                        name: part.functionCall.name,
                                        result: result
                                    });
                                } catch (error) {
                                    console.error('❌ Function call failed:', error);
                                    sendToRenderer('function-call-error', {
                                        name: part.functionCall.name,
                                        error: error.message
                                    });
                                }
                            }
                        }
                    }

                    if (!transcriptOnlyMode && liveResponsesEnabled && message.serverContent?.generationComplete) {
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
                responseModalities: transcriptOnlyMode || !liveResponsesEnabled ? [] : ['TEXT'], // Disable responses when transcript-only or live responses disabled
                tools: transcriptOnlyMode || !liveResponsesEnabled ? [] : enabledTools, // Disable tools as well when not responding
                // Enable speaker diarization
                inputAudioTranscription: {
                    enableSpeakerDiarization: true,
                    minSpeakerCount: 2,
                    maxSpeakerCount: 2,
                },
                contextWindowCompression: { slidingWindow: {} },
                speechConfig: { languageCode: language },
                systemInstruction: transcriptOnlyMode || !liveResponsesEnabled ? {
                    parts: [{ text: "You are in transcript-only mode. Do not respond to any audio input. Only transcribe what you hear." }],
                } : {
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

function setupGeminiIpcHandlers(geminiSessionRef, mainWindow) {
    // Store the geminiSessionRef globally for reconnection access
    global.geminiSessionRef = geminiSessionRef;

    ipcMain.handle('initialize-gemini', async (event, apiKey, customPrompt, profile = 'interview', language = 'en-US', composioApiKey = null) => {
        // Use environment variable if apiKey is not provided
        const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
        const session = await initializeGeminiSession(finalApiKey, customPrompt, profile, language, false, composioApiKey);
        if (session) {
            geminiSessionRef.current = session;
            return true;
        }
        return false;
    });

    ipcMain.handle('send-audio-content', async (event, { data, mimeType }) => {
        // Voice commands disabled - return success but don't process audio
        return { success: true };
    });

    // Handle microphone audio on a separate channel
    ipcMain.handle('send-mic-audio-content', async (event, { data, mimeType }) => {
        // Voice commands disabled - return success but don't process microphone audio
        return { success: true };
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

    ipcMain.handle('capture-manual-screenshot', async (event) => {
        try {
            // Send message to renderer to trigger manual screenshot
            if (mainWindow) {
                mainWindow.webContents.send('capture-manual-screenshot');
                return { success: true };
            }
            return { success: false, error: 'No active window' };
        } catch (error) {
            console.error('Error triggering manual screenshot:', error);
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

    // Composio-specific IPC handlers
    ipcMain.handle('initialize-composio', async (event, composioApiKey, geminiApiKey = null) => {
        try {
            // Use environment variable if geminiApiKey is not provided
            const finalGeminiApiKey = geminiApiKey || process.env.GEMINI_API_KEY;
            const success = await composioService.initialize(composioApiKey, finalGeminiApiKey);
            return { success };
        } catch (error) {
            console.error('Error initializing Composio:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('connect-gmail', async (event, externalUserId, authConfigId) => {
        try {
            const result = await composioService.connectGmail(externalUserId, authConfigId);
            return result;
        } catch (error) {
            console.error('Error connecting Gmail:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-gmail-connection-status', async (event, externalUserId) => {
        try {
            const result = await composioService.getGmailConnectionStatus(externalUserId);
            return result;
        } catch (error) {
            console.error('Error getting Gmail connection status:', error);
            return { success: false, error: error.message };
        }
    });

    // Generic integration connection handlers
    ipcMain.handle('composio-start-connection', async (event, externalUserId, authConfigId, label) => {
        try {
            const result = await composioService.connectIntegration(externalUserId, authConfigId, label || 'Integration');
            return result;
        } catch (error) {
            console.error('Error starting Composio connection:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('composio-wait-connection', async (event, externalUserId, authConfigId, timeoutMs) => {
        try {
            const result = await composioService.waitForIntegrationConnection(externalUserId, authConfigId, timeoutMs || 300000);
            return result;
        } catch (error) {
            console.error('Error waiting for Composio connection:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('composio-get-connection-status', async (event, externalUserId, authConfigId) => {
        try {
            const result = await composioService.getIntegrationConnectionStatus(externalUserId, authConfigId);
            return result;
        } catch (error) {
            console.error('Error getting Composio connection status:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('composio-disconnect', async (event, externalUserId, authConfigId) => {
        try {
            const result = await composioService.disconnectIntegration(externalUserId, authConfigId);
            return result;
        } catch (error) {
            console.error('Error disconnecting Composio integration:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('composio-list-accounts', async (event) => {
        try {
            return { success: true, accounts: composioService.getConnectedAccounts() };
        } catch (error) {
            console.error('Error listing Composio accounts:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('composio-verify-all-connections', async (event, externalUserId) => {
        try {
            const results = await composioService.verifyAllConnections(externalUserId);
            return { success: true, results };
        } catch (error) {
            console.error('Error verifying all Composio connections:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('execute-email-task', async (event, externalUserId, task, tools) => {
        try {
            const result = await composioService.executeEmailTaskWithAgent(externalUserId, task, tools);
            return result;
        } catch (error) {
            console.error('Error executing email task:', error);
            return { success: false, error: error.message };
        }
    });

    // Transcript-only mode IPC handlers
    ipcMain.handle('set-transcript-only-mode', async (event, enabled) => {
        try {
            setTranscriptOnlyMode(enabled);
            return { success: true, transcriptOnlyMode: enabled };
        } catch (error) {
            console.error('Error setting transcript-only mode:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-stored-transcripts', async (event) => {
        try {
            return { 
                success: true, 
                transcripts: storedTranscripts,
                count: storedTranscripts.length 
            };
        } catch (error) {
            console.error('Error getting stored transcripts:', error);
            return { success: false, error: error.message };
        }
    });

    // Toggle live responses (stream transcripts, optionally reply)
    ipcMain.handle('set-live-responses-enabled', async (event, enabled) => {
        try {
            liveResponsesEnabled = Boolean(enabled);
            console.log('Live responses:', liveResponsesEnabled ? 'ENABLED' : 'DISABLED');

            // Restart session to apply config change
            if (global.geminiSessionRef?.current && lastSessionParams) {
                try {
                    await global.geminiSessionRef.current.close();
                } catch (e) {}
                global.geminiSessionRef.current = null;

                const session = await initializeGeminiSession(
                    lastSessionParams.apiKey,
                    lastSessionParams.customPrompt,
                    lastSessionParams.profile,
                    lastSessionParams.language,
                    true, // isReconnection
                    lastSessionParams.composioApiKey
                );
                if (session) {
                    global.geminiSessionRef.current = session;
                }
            }

            sendToRenderer('transcript-mode-changed', {
                transcriptOnlyMode,
                liveResponsesEnabled,
                sessionId: currentSessionId,
            });
            return { success: true, liveResponsesEnabled };
        } catch (error) {
            console.error('Error setting live responses:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('analyze-stored-transcripts', async (event, userQuery) => {
        try {
            const result = analyzeStoredTranscripts(userQuery);
            return result;
        } catch (error) {
            console.error('Error analyzing stored transcripts:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('clear-stored-transcripts', async (event) => {
        try {
            clearStoredTranscripts();
            return { success: true };
        } catch (error) {
            console.error('Error clearing stored transcripts:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-transcript-mode-status', async (event) => {
        try {
            return { 
                success: true, 
                transcriptOnlyMode,
                storedTranscriptCount: storedTranscripts.length 
            };
        } catch (error) {
            console.error('Error getting transcript mode status:', error);
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
