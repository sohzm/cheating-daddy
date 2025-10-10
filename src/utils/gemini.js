const { GoogleGenAI } = require('@google/genai');
const { BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const { saveDebugAudio } = require('../audioUtils');
const { getSystemPrompt } = require('./prompts');
const pdfProcessor = require('./pdfProcessor');
const { initializeOpenRouterSession, sendToOpenRouter } = require('./openrouter');
const { sendToRenderer } = require('./ipcUtils');

// Enhanced prompt engineering for coding interview mode
function getCodingOptimizedPrompt(basePrompt, model) {
    // Get CV context if available
    const cvContext = pdfProcessor.getCVContext();
    
    const codingEnhancements = `
You are an expert coding interview assistant with the following capabilities:

**CORE RESPONSIBILITIES:**
- Analyze code screenshots and provide detailed, actionable feedback
- Help debug code issues with step-by-step explanations
- Suggest code improvements and best practices
- Provide real-time coding assistance during interviews
- Explain algorithms, data structures, and design patterns
- Offer multiple solution approaches when applicable

**RESPONSE GUIDELINES:**
- Be concise but comprehensive in your explanations
- Provide code examples with clear comments
- Explain the time and space complexity of solutions
- Suggest edge cases and test scenarios
- Maintain a professional, helpful tone
- Focus on learning and improvement

**CODING BEST PRACTICES:**
- Emphasize clean, readable code
- Suggest proper error handling
- Recommend appropriate data structures
- Highlight security considerations
- Encourage testing and validation

**INTERVIEW CONTEXT:**
- Act as a pair programming partner
- Provide hints without giving away complete solutions
- Encourage problem-solving thinking
- Help with debugging and optimization
- Support both technical and soft skills development

**RESPONSE FORMAT:**
- Use clear headings and bullet points
- Include code blocks with syntax highlighting
- Provide step-by-step breakdowns
- End with key takeaways or next steps

Remember: You're helping someone succeed in a coding interview. Be supportive, educational, and thorough in your assistance.

${cvContext}
`;

    return basePrompt + codingEnhancements;
}

// Enhanced response quality for coding interviews
function enhanceCodingResponse(response) {
    // Ensure proper formatting and structure
    let enhanced = response.trim();
    
    // Add coding-specific enhancements
    if (enhanced.length > 0) {
        // Ensure code blocks are properly formatted
        enhanced = enhanced.replace(/```(\w+)?\n?/g, '```$1\n');
        
        // Add helpful context if response seems incomplete
        if (enhanced.length < 100 && !enhanced.includes('```')) {
            enhanced += '\n\n*Note: This appears to be a brief response. Feel free to ask for more detailed explanations or specific code examples.*';
        }
        
        // Ensure proper markdown formatting
        if (enhanced.includes('**') && !enhanced.includes('##')) {
            // Add section headers for better organization
            enhanced = enhanced.replace(/\*\*([^*]+)\*\*/g, '## $1');
        }
    }
    
    return enhanced;
}

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

// OpenRouter session management
let openrouterSession = null;

// Initialize OpenRouter session
async function initializeOpenRouterSessionWrapper(apiKey, mode = 'coding', model = 'deepseek-r1') {
    try {
        console.log('Initializing OpenRouter session...');
        const session = await initializeOpenRouterSession(apiKey, mode, model);
        console.log('OpenRouter session initialized successfully');
        return session;
    } catch (error) {
        console.error('Failed to initialize OpenRouter session:', error);
        throw error;
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

async function initializeGeminiSession(apiKey, customPrompt = '', profile = 'interview', language = 'en-US', isReconnection = false, mode = 'interview', model = 'gemini-2.5-flash') {
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
            mode,
            model,
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

    // Get CV context if available and add to custom prompt
    const cvContext = pdfProcessor.getCVContext();
    const enhancedCustomPrompt = cvContext ? `${customPrompt}\n\n${cvContext}` : customPrompt;
    
    // Debug logging for CV context
    if (cvContext) {
        console.log('📄 CV context loaded and included in prompt');
        console.log('CV context length:', cvContext.length);
    } else {
        console.log('📄 No CV context available');
    }
    
    const systemPrompt = getSystemPrompt(profile, enhancedCustomPrompt, googleSearchEnabled);

    // Initialize new conversation session (only if not reconnecting)
    if (!isReconnection) {
        initializeNewSession();
    }

    try {
        // Determine the model and connection type based on mode
        let session;
        
        if (mode === 'interview' || model === 'gemini-live-2.0') {
            // Use live connection for interview mode
            session = await client.live.connect({
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
                            sendToRenderer('update-status', 'Response complete');

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
        } else {
            // For coding/OA mode, we'll use the existing live session infrastructure
            // but with a different configuration optimized for image processing
            let responseBuffer = ''; // Buffer to accumulate response text
            let responseTimeout = null; // Timeout for partial responses
            let performanceMetrics = {
                startTime: Date.now(),
                messageCount: 0,
                responseTime: 0,
                errorCount: 0
            };
            
            session = await client.live.connect({
                model: 'gemini-live-2.5-flash-preview',
                callbacks: {
                    onopen: function () {
                        sendToRenderer('update-status', `${model} session connected (screenshot mode)`);
                    },
                    onmessage: function (message) {
                        performanceMetrics.messageCount++;
                        const messageStartTime = Date.now();
                        
                        console.log('Coding mode received message:', JSON.stringify(message, null, 2));
                        
                        // Handle AI model response
                        if (message.serverContent?.modelTurn?.parts) {
                            console.log('Processing model turn parts:', message.serverContent.modelTurn.parts.length);
                            for (const part of message.serverContent.modelTurn.parts) {
                                if (part.text) {
                                    responseBuffer += part.text;
                                    console.log('Accumulated response text:', responseBuffer);
                                    
                                    // Clear any existing timeout and set a new one for partial response
                                    if (responseTimeout) {
                                        clearTimeout(responseTimeout);
                                    }
                                    
                                    // Set timeout to send partial response if no completion comes
                                    responseTimeout = setTimeout(() => {
                                        if (responseBuffer.trim()) {
                                            console.log('Sending partial response due to timeout:', responseBuffer);
                                            sendToRenderer('update-response', responseBuffer);
                                            responseBuffer = '';
                                        }
                                    }, 5000); // 5 second timeout for partial responses
                                }
                            }
                        }

                        if (message.serverContent?.generationComplete) {
                            console.log('Generation complete received');
                            performanceMetrics.responseTime = Date.now() - messageStartTime;
                            
                            // Log performance metrics
                            console.log('Performance metrics:', {
                                totalMessages: performanceMetrics.messageCount,
                                responseTime: performanceMetrics.responseTime + 'ms',
                                sessionDuration: Date.now() - performanceMetrics.startTime + 'ms',
                                errorCount: performanceMetrics.errorCount
                            });
                            
                            // Clear timeout since we got completion
                            if (responseTimeout) {
                                clearTimeout(responseTimeout);
                                responseTimeout = null;
                            }
                            
                            // Send the complete accumulated response with quality enhancement
                            if (responseBuffer.trim()) {
                                console.log('Sending complete response:', responseBuffer);
                                
                                // Enhance response quality for coding interviews
                                const enhancedResponse = enhanceCodingResponse(responseBuffer);
                                sendToRenderer('update-response', enhancedResponse);
                                responseBuffer = ''; // Reset buffer
                            }
                            sendToRenderer('update-status', 'Ready');
                        }
                        
                        // Handle other message types
                        if (message.serverContent?.serverTurn) {
                            console.log('Server turn received:', message.serverContent.serverTurn);
                        }
                        
                        if (message.serverContent?.modelTurn) {
                            console.log('Model turn received:', message.serverContent.modelTurn);
                        }
                    },
                    onerror: function (e) {
                        performanceMetrics.errorCount++;
                        console.error('Error in coding mode session:', e.message);
                        console.error('Error metrics:', {
                            errorCount: performanceMetrics.errorCount,
                            totalMessages: performanceMetrics.messageCount,
                            sessionDuration: Date.now() - performanceMetrics.startTime + 'ms'
                        });
                        
                        sendToRenderer('update-status', 'Error: ' + e.message);
                        
                        // Enhanced error handling with exponential backoff
                        const retryDelay = Math.min(1000 * Math.pow(2, (reconnectionAttempts || 0)), 30000);
                        console.log(`Attempting to reconnect coding mode session in ${retryDelay}ms (attempt ${(reconnectionAttempts || 0) + 1})`);
                        
                        setTimeout(() => {
                            console.log('Attempting to reconnect coding mode session...');
                            initializeNewSession();
                        }, retryDelay);
                    },
                    onclose: function (e) {
                        console.log('Coding mode session closed', e ? `with code: ${e.code}` : '');
                        
                        // Clear any pending timeout
                        if (responseTimeout) {
                            clearTimeout(responseTimeout);
                            responseTimeout = null;
                        }
                        
                        // Send any remaining buffered response
                        if (responseBuffer.trim()) {
                            console.log('Sending final buffered response:', responseBuffer);
                            sendToRenderer('update-response', responseBuffer);
                            responseBuffer = '';
                        }
                        
                        if (e && e.code !== 1000) {
                            console.log('Session closed with error code, attempting to reconnect...');
                            setTimeout(() => {
                                console.log('Attempting to reconnect coding mode session...');
                                initializeNewSession();
                            }, 3000);
                        }
                    },
                },
                config: {
                    responseModalities: ['TEXT'],
                    tools: enabledTools,
                    contextWindowCompression: { slidingWindow: {} },
                    systemInstruction: {
                        parts: [{ text: getCodingOptimizedPrompt(systemPrompt, model) }],
                    },
                    // Enable image processing for coding mode
                    inputModalities: ['TEXT', 'AUDIO', 'IMAGE'],
                    // Enhanced configuration for coding interviews
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 8192,
                    },
                },
            });
        }

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

    ipcMain.handle('initialize-gemini', async (event, apiKey, customPrompt, profile = 'interview', language = 'en-US', mode = 'interview', model = 'gemini-2.5-flash') => {
        const session = await initializeGeminiSession(apiKey, customPrompt, profile, language, false, mode, model);
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

        const startTime = Date.now();
        let retryCount = 0;
        const maxRetries = 3;

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

            // Validate image data integrity
            if (buffer.length > 10 * 1024 * 1024) { // 10MB limit
                console.error(`Image too large: ${buffer.length} bytes`);
                return { success: false, error: 'Image too large (max 10MB)' };
            }

            console.log(`Sending image: ${buffer.length} bytes, base64 length: ${data.length}`);
            process.stdout.write('!');
            
            // Progressive enhancement: adaptive delay based on image size
            const adaptiveDelay = Math.min(100 + (buffer.length / 10000), 1000);
            await new Promise(resolve => setTimeout(resolve, adaptiveDelay));
            
            // Retry mechanism with exponential backoff
            while (retryCount < maxRetries) {
                try {
                    await geminiSessionRef.current.sendRealtimeInput({
                        media: { 
                            data: data, 
                            mimeType: 'image/jpeg' 
                        },
                    });
                    
                    const processingTime = Date.now() - startTime;
                    console.log(`Image sent successfully in ${processingTime}ms (attempt ${retryCount + 1})`);
                    
                    // Log performance metrics
                    console.log('Image processing metrics:', {
                        imageSize: buffer.length,
                        processingTime: processingTime + 'ms',
                        retryCount: retryCount,
                        adaptiveDelay: adaptiveDelay + 'ms'
                    });
                    
                    return { success: true, processingTime };
                } catch (mediaError) {
                    retryCount++;
                    console.error(`Error sending media (attempt ${retryCount}/${maxRetries}):`, mediaError.message);
                    
                    if (retryCount < maxRetries) {
                        // Exponential backoff
                        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
                        console.log(`Retrying in ${backoffDelay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    } else {
                        // Final fallback: send as text description
                        console.error('All retries failed, using text fallback');
                        const fallbackText = `[Image captured: ${buffer.length} bytes, ${Math.round(buffer.length/1024)}KB JPEG - Analysis requested]`;
                        await geminiSessionRef.current.sendRealtimeInput({
                            text: fallbackText
                        });
                        console.log('Image fallback sent as text');
                        return { success: true, fallback: true, retryCount };
                    }
                }
            }
        } catch (error) {
            console.error('Error sending image:', error);
            return { success: false, error: error.message, retryCount };
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

    // PDF Upload and Management Handlers
    ipcMain.handle('upload-cv-pdf', async (event) => {
        try {
            const result = await dialog.showOpenDialog({
                title: 'Select your CV/Resume (PDF)',
                filters: [
                    { name: 'PDF Files', extensions: ['pdf'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
            });

            if (result.canceled || result.filePaths.length === 0) {
                return { success: false, error: 'No file selected' };
            }

            const filePath = result.filePaths[0];
            const processResult = await pdfProcessor.processPDF(filePath);

            if (processResult.success) {
                console.log('CV uploaded and processed successfully:', processResult);
                return {
                    success: true,
                    fileName: processResult.fileName,
                    textLength: processResult.textLength,
                    pages: processResult.pages
                };
            } else {
                return { success: false, error: processResult.error };
            }
        } catch (error) {
            console.error('Error uploading CV:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-cv-status', async (event) => {
        try {
            return pdfProcessor.getCVStatus();
        } catch (error) {
            console.error('Error getting CV status:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('clear-cv', async (event) => {
        try {
            pdfProcessor.clearCV();
            return { success: true };
        } catch (error) {
            console.error('Error clearing CV:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-cv-context', async (event) => {
        try {
            return {
                success: true,
                context: pdfProcessor.getCVContext()
            };
        } catch (error) {
            console.error('Error getting CV context:', error);
            return { success: false, error: error.message };
        }
    });

    // OpenRouter IPC handlers
    ipcMain.handle('initialize-openrouter-session', async (event, { apiKey, mode, model }) => {
        try {
            // Store the session globally, don't return it
            openrouterSession = await initializeOpenRouterSessionWrapper(apiKey, mode, model);
            console.log('OpenRouter session stored globally');
            return { success: true, model: openrouterSession.model, mode: openrouterSession.mode };
        } catch (error) {
            console.error('Error initializing OpenRouter session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('send-to-openrouter', async (event, { message, screenshotData, selectedModel }) => {
        try {
            if (!openrouterSession) {
                throw new Error('OpenRouter session not initialized');
            }

            let responseBuffer = '';
            
            // Check if this is DeepSeekR1 and we have screenshot data
            const model = selectedModel || 'deepseek-r1';
            
            if (model === 'deepseek-r1' && screenshotData) {
                console.log('🔄 DeepSeekR1 with screenshot: Using LLM chaining with user message');
                
                // Step 1: Extract text from screenshot using Gemini
                const geminiApiKey = await getStoredSetting('apiKey') || process.env.GEMINI_API_KEY;
                
                if (!geminiApiKey || typeof geminiApiKey !== 'string') {
                    throw new Error('Gemini API key not found or invalid. Please ensure you have entered a valid Gemini API key for LLM chaining.');
                }
                
                sendToRenderer('update-status', 'Extracting text from screenshot...');
                const extractedText = await extractTextFromImageWithGemini(screenshotData, geminiApiKey);
                
                if (!extractedText || extractedText.trim().length === 0) {
                    throw new Error('Failed to extract text from screenshot');
                }
                
                console.log(`Extracted text length: ${extractedText.length} characters`);
                
                // Step 2: Combine extracted text with user message
                const combinedPrompt = `Screenshot Context:
${extractedText}

User Question/Request:
${message}

Please analyze the screenshot content above and respond to the user's question/request. Provide detailed assistance based on what you can see in the screenshot.`;
                
                sendToRenderer('update-status', 'Processing with DeepSeekR1...');
                
                await sendToOpenRouter(openrouterSession, combinedPrompt, (chunk) => {
                    responseBuffer += chunk;
                    sendToRenderer('update-response', responseBuffer);
                });
                
            } else {
                // Regular text-only request
                await sendToOpenRouter(openrouterSession, message, (chunk) => {
                    responseBuffer += chunk;
                    sendToRenderer('update-response', responseBuffer);
                });
            }

            sendToRenderer('update-status', 'Response complete');
            return { success: true };
        } catch (error) {
            console.error('Error sending to OpenRouter:', error);
            sendToRenderer('update-status', `OpenRouter error: ${error.message}`);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('close-openrouter-session', async () => {
        try {
            openrouterSession = null;
            sendToRenderer('update-status', 'OpenRouter session closed');
            return { success: true };
        } catch (error) {
            console.error('Error closing OpenRouter session:', error);
            return { success: false, error: error.message };
        }
    });

    // OpenRouter image/screenshot handler with LLM chaining
    ipcMain.handle('send-image-to-openrouter', async (event, { data, debug }) => {
        if (!openrouterSession) {
            return { success: false, error: 'No active OpenRouter session' };
        }

        const startTime = Date.now();
        let retryCount = 0;
        const maxRetries = 3;

        try {
            if (!data || typeof data !== 'string') {
                console.error('Invalid image data received for OpenRouter');
                return { success: false, error: 'Invalid image data' };
            }

            const buffer = Buffer.from(data, 'base64');

            if (buffer.length < 1000) {
                console.error(`Image buffer too small for OpenRouter: ${buffer.length} bytes`);
                return { success: false, error: 'Image buffer too small' };
            }

            // Validate image data integrity
            if (buffer.length > 10 * 1024 * 1024) { // 10MB limit
                console.error(`Image too large for OpenRouter: ${buffer.length} bytes`);
                return { success: false, error: 'Image too large (max 10MB)' };
            }

            console.log(`Processing image with LLM chaining: ${buffer.length} bytes`);
            process.stdout.write('!');
            
            // Progressive enhancement: adaptive delay based on image size
            const adaptiveDelay = Math.min(100 + (buffer.length / 10000), 1000);
            await new Promise(resolve => setTimeout(resolve, adaptiveDelay));
            
            // Retry mechanism with exponential backoff
            while (retryCount < maxRetries) {
                try {
                    // Step 1: Use Gemini Live to extract text from image
                    sendToRenderer('update-status', 'Extracting text from image...');
                    
                    const geminiApiKey = await getStoredSetting('apiKey') || process.env.GEMINI_API_KEY;
                    console.log('getStoredSetting result:', await getStoredSetting('apiKey'));
                    console.log('process.env.GEMINI_API_KEY:', process.env.GEMINI_API_KEY);
                    console.log('Final geminiApiKey type:', typeof geminiApiKey);
                    console.log('Final geminiApiKey value:', geminiApiKey);
                    console.log('Retrieved Gemini API key for LLM chaining:', geminiApiKey ? `${String(geminiApiKey).substring(0, 10)}...` : 'null');
                    
                    if (!geminiApiKey || typeof geminiApiKey !== 'string') {
                        throw new Error('Gemini API key not found or invalid. Please ensure you have entered a valid Gemini API key for LLM chaining.');
                    }
                    
                    const extractedText = await extractTextFromImageWithGemini(data, geminiApiKey);
                    
                    if (!extractedText || extractedText.trim().length === 0) {
                        throw new Error('Failed to extract text from image');
                    }
                    
                    console.log(`Extracted text length: ${extractedText.length} characters`);
                    
                    // Step 2: Send extracted text to DeepSeekR1
                    sendToRenderer('update-status', 'Processing with DeepSeekR1...');
                    
                    const analysisPrompt = `Please analyze the following content extracted from a screenshot and provide detailed assistance:

${extractedText}

If this is code, help debug, explain, or provide solutions. If this is a problem or question, provide a complete answer with step-by-step explanation. If it's a multiple choice question, give the answer with reasoning.`;

                    let responseBuffer = '';
                    
                    await sendToOpenRouter(openrouterSession, analysisPrompt, (chunk) => {
                        responseBuffer += chunk;
                        sendToRenderer('update-response', responseBuffer);
                    });

                    const processingTime = Date.now() - startTime;
                    console.log(`LLM chaining completed successfully in ${processingTime}ms (attempt ${retryCount + 1})`);
                    
                    // Log performance metrics
                    console.log('LLM chaining metrics:', {
                        imageSize: buffer.length,
                        extractedTextLength: extractedText.length,
                        processingTime: processingTime + 'ms',
                        retryCount: retryCount,
                        model: openrouterSession.model
                    });
                    
                    sendToRenderer('update-status', 'Response complete');
                    return { success: true };
                    
                } catch (error) {
                    retryCount++;
                    console.warn(`LLM chaining attempt ${retryCount} failed:`, error.message);
                    
                    if (retryCount < maxRetries) {
                        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
                        console.log(`Retrying in ${backoffDelay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    } else {
                        throw error;
                    }
                }
            }
            
        } catch (error) {
            console.error('Error in LLM chaining:', error);
            sendToRenderer('update-status', `LLM chaining error: ${error.message}`);
            return { success: false, error: error.message };
        }
    });

    // OpenRouter direct vision handler (for non-DeepSeekR1 models)
    ipcMain.handle('send-image-to-openrouter-vision', async (event, { data, debug }) => {
        if (!openrouterSession) {
            return { success: false, error: 'No active OpenRouter session' };
        }

        const startTime = Date.now();
        let retryCount = 0;
        const maxRetries = 3;

        try {
            if (!data || typeof data !== 'string') {
                console.error('Invalid image data received for OpenRouter vision');
                return { success: false, error: 'Invalid image data' };
            }

            const buffer = Buffer.from(data, 'base64');

            if (buffer.length < 1000) {
                console.error(`Image buffer too small for OpenRouter vision: ${buffer.length} bytes`);
                return { success: false, error: 'Image buffer too small' };
            }

            // Validate image data integrity
            if (buffer.length > 10 * 1024 * 1024) { // 10MB limit
                console.error(`Image too large for OpenRouter vision: ${buffer.length} bytes`);
                return { success: false, error: 'Image too large (max 10MB)' };
            }

            console.log(`Sending image to OpenRouter vision model: ${buffer.length} bytes`);
            process.stdout.write('!');
            
            // Progressive enhancement: adaptive delay based on image size
            const adaptiveDelay = Math.min(100 + (buffer.length / 10000), 1000);
            await new Promise(resolve => setTimeout(resolve, adaptiveDelay));
            
            // Retry mechanism with exponential backoff
            while (retryCount < maxRetries) {
                try {
                    // Convert base64 to data URL for OpenRouter
                    const dataUrl = `data:image/jpeg;base64,${data}`;
                    
                    // Create a message with the image for OpenRouter
                    const messages = [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: 'Please analyze this screenshot and provide detailed assistance. If this is code, help debug, explain, or provide solutions. If this is a problem or question, provide a complete answer with step-by-step explanation.'
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: dataUrl
                                    }
                                }
                            ]
                        }
                    ];

                    let responseBuffer = '';
                    
                    await sendToOpenRouter(openrouterSession, messages, (chunk) => {
                        responseBuffer += chunk;
                        sendToRenderer('update-response', responseBuffer);
                    });

                    const processingTime = Date.now() - startTime;
                    console.log(`Image sent to OpenRouter vision successfully in ${processingTime}ms (attempt ${retryCount + 1})`);
                    
                    // Log performance metrics
                    console.log('OpenRouter vision processing metrics:', {
                        imageSize: buffer.length,
                        processingTime: processingTime + 'ms',
                        retryCount: retryCount,
                        model: openrouterSession.model
                    });
                    
                    sendToRenderer('update-status', 'Response complete');
                    return { success: true };
                    
                } catch (error) {
                    retryCount++;
                    console.warn(`OpenRouter vision send attempt ${retryCount} failed:`, error.message);
                    
                    if (retryCount < maxRetries) {
                        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
                        console.log(`Retrying in ${backoffDelay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    } else {
                        throw error;
                    }
                }
            }
            
        } catch (error) {
            console.error('Error sending image to OpenRouter vision:', error);
            sendToRenderer('update-status', `OpenRouter vision error: ${error.message}`);
            return { success: false, error: error.message };
        }
    });
}

// Context-aware OCR system that detects screen regions and content types
async function extractTextFromImageWithGemini(imageData, apiKey) {
    try {
        console.log('🔍 Starting context-aware OCR analysis...');
        
        // Create a temporary Gemini session for text extraction
        const { GoogleGenAI } = require('@google/genai');
        
        if (!apiKey) {
            throw new Error('Gemini API key not provided for text extraction');
        }
        
        console.log('Using Gemini API key for text extraction:', apiKey ? `${apiKey.substring(0, 10)}...` : 'null');
        
        const genAI = new GoogleGenAI({
            vertexai: false,
            apiKey: apiKey,
        });

        // Step 1: Analyze screen regions and content types
        const contextAnalysis = await analyzeScreenContext(imageData, genAI);
        console.log('📊 Screen context analysis:', contextAnalysis);
        
        // Step 2: Extract text based on detected context
        const extractedText = await performContextAwareExtraction(imageData, genAI, contextAnalysis);
        
        return extractedText;
    } catch (error) {
        console.error('Error in context-aware OCR:', error);
        
        // Fallback to basic extraction if context analysis fails
        console.log('🔄 Falling back to basic text extraction...');
        return await performBasicTextExtraction(imageData, apiKey);
    }
}

// Analyze screen to detect regions and content types
async function analyzeScreenContext(imageData, genAI) {
    const analysisPrompt = `Analyze this screenshot and identify different regions and content types. Look for:

1. **Terminal/Console regions**: Dark backgrounds with monospaced text, command prompts, code output
2. **Video/Media regions**: Video players, streaming content, media controls
3. **Code editor regions**: Syntax-highlighted code, line numbers, file tabs
4. **Web browser regions**: Web pages, forms, navigation elements
5. **IDE/Application regions**: Development environments, toolbars, panels
6. **Question/Problem regions**: Text-based questions, multiple choice, problem statements

Respond with ONLY a valid JSON object (no markdown, no code blocks, no extra text). The JSON should contain:
{
  "regions": [
    {
      "type": "terminal|video|code_editor|web_browser|ide|question|other",
      "location": "left|right|top|bottom|center|full",
      "confidence": 0.0-1.0,
      "description": "Brief description of what's in this region"
    }
  ],
  "primary_content": "terminal|video|code|web|question|mixed",
  "context_hints": ["coding_interview", "video_tutorial", "web_browsing", "problem_solving"]
}

IMPORTANT: Return only the JSON object, no markdown formatting or code blocks.`;

    try {
        const result = await genAI.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: analysisPrompt },
                        {
                            inlineData: {
                                data: imageData,
                                mimeType: 'image/jpeg'
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1000,
            }
        });
        
        const analysisText = result.candidates[0].content.parts[0].text;
        console.log(`📊 Raw context analysis: ${analysisText.substring(0, 200)}...`);
        
        // Try to parse JSON, handling markdown code blocks
        try {
            // Extract JSON from markdown code blocks if present
            let jsonText = analysisText.trim();
            
            // Remove markdown code block markers
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            // Clean up any remaining whitespace
            jsonText = jsonText.trim();
            
            console.log(`🧹 Cleaned JSON text: ${jsonText.substring(0, 200)}...`);
            
            const analysis = JSON.parse(jsonText);
            console.log(`✅ Successfully parsed context analysis:`, analysis);
            return JSON.stringify(analysis);
        } catch (parseError) {
            console.warn('Failed to parse context analysis as JSON:', parseError.message);
            console.log('Raw text that failed to parse:', analysisText);
            return JSON.stringify({
                primary_content: 'mixed',
                regions: [],
                context_hints: ['general']
            });
        }
        
    } catch (error) {
        console.error('Error in screen context analysis:', error);
        // Return fallback analysis
        return JSON.stringify({
            primary_content: 'mixed',
            regions: [],
            context_hints: ['general']
        });
    }
}

// Perform context-aware text extraction based on detected regions
async function performContextAwareExtraction(imageData, genAI, contextAnalysis) {
    try {
        let analysis;
        try {
            analysis = JSON.parse(contextAnalysis);
        } catch (parseError) {
            console.warn('Failed to parse context analysis JSON, using fallback');
            analysis = { primary_content: 'mixed', regions: [] };
        }

        console.log(`🎯 Detected primary content: ${analysis.primary_content}`);
        
        // Create region-specific extraction prompts
        const regionPrompts = analysis.regions.map(region => {
            return `**${region.type.toUpperCase()} REGION (${region.location})**: ${region.description}`;
        }).join('\n');

        // Build context-aware extraction prompt
        const extractionPrompt = `Extract ALL text content from this screenshot. Return ONLY plain text, NO JSON format.

**DETECTED CONTEXT:**
- Primary Content: ${analysis.primary_content}
- Context Hints: ${analysis.context_hints?.join(', ') || 'general'}

**REGIONS DETECTED:**
${regionPrompts || 'No specific regions detected'}

**EXTRACTION INSTRUCTIONS:**

${getContextSpecificInstructions(analysis.primary_content)}

**IMPORTANT: Return ONLY plain text content, structured as follows:**

=== SCREEN CONTEXT ===
[Brief description of what's on screen]

=== TERMINAL/CONSOLE CONTENT ===
[Any terminal output, commands, or console text]

=== CODE CONTENT ===
[Any code snippets, with proper formatting and indentation]

=== QUESTION/PROBLEM TEXT ===
[Any questions, problems, or prompts visible]

=== UI ELEMENTS ===
[Buttons, labels, navigation elements]

=== OTHER TEXT ===
[Any other readable text not covered above]

DO NOT return JSON. Return only the structured text content above. Focus on accuracy and preserve formatting, especially for code and terminal output.`;

        const result = await genAI.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: extractionPrompt },
                        {
                            inlineData: {
                                data: imageData,
                                mimeType: 'image/jpeg'
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 4000,
            }
        });
        
        let extractedText = result.candidates[0].content.parts[0].text;
        
        // Post-process to remove any JSON formatting that might have been returned
        extractedText = cleanExtractedText(extractedText);
        
        console.log(`✅ Context-aware extraction completed: ${extractedText.length} characters`);
        console.log(`📝 First 200 chars: ${extractedText.substring(0, 200)}...`);
        return extractedText;
        
    } catch (error) {
        console.error('Error in context-aware extraction:', error);
        throw error;
    }
}

// Clean extracted text to remove JSON formatting
function cleanExtractedText(text) {
    try {
        // Remove any markdown code blocks
        let cleaned = text.trim();
        
        // Remove markdown code blocks
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```[a-z]*\s*/, '').replace(/\s*```$/, '');
        }
        
        // Remove JSON object markers if present
        cleaned = cleaned.replace(/^\{[\s\S]*\}$/m, '').trim();
        
        // Remove any remaining JSON-like structures
        cleaned = cleaned.replace(/^\s*[\{\[].*[\}\]]\s*$/m, '').trim();
        
        // If the text is empty after cleaning, return original
        if (cleaned.length === 0) {
            console.warn('⚠️ Text became empty after cleaning, returning original');
            return text;
        }
        
        console.log(`🧹 Cleaned text from ${text.length} to ${cleaned.length} characters`);
        return cleaned;
        
    } catch (error) {
        console.warn('Error cleaning extracted text:', error);
        return text; // Return original if cleaning fails
    }
}

// Get context-specific extraction instructions
function getContextSpecificInstructions(primaryContent) {
    const instructions = {
        'terminal': `Focus on:
- Command prompts and their output
- Error messages and warnings
- File paths and directory structures
- Code execution results
- System information`,
        
        'video': `Focus on:
- Video titles and descriptions
- Subtitles or captions
- Control buttons and timestamps
- Any overlaid text or annotations
- Video metadata if visible`,
        
        'code': `Focus on:
- Complete code blocks with proper indentation
- Syntax highlighting preservation
- Line numbers if present
- File names and paths
- Error messages or warnings
- Comments and documentation`,
        
        'web': `Focus on:
- Page titles and headings
- Form fields and labels
- Navigation elements
- Article or content text
- URLs and links
- User interface elements`,
        
        'question': `Focus on:
- Complete question text
- Multiple choice options
- Problem statements
- Instructions or requirements
- Answer fields or input areas
- Any diagrams or visual aids`,
        
        'mixed': `Focus on:
- All visible text content
- Maintain spatial relationships
- Preserve formatting and structure
- Include all UI elements
- Capture both code and text content`
    };
    
    return instructions[primaryContent] || instructions['mixed'];
}

// Fallback basic text extraction
async function performBasicTextExtraction(imageData, apiKey) {
    const { GoogleGenAI } = require('@google/genai');
    
    const genAI = new GoogleGenAI({
        vertexai: false,
        apiKey: apiKey,
    });
    
    const extractionPrompt = `Please extract ALL text content from this image. Include:
1. Any visible text, code, or numbers
2. UI elements, buttons, labels
3. Error messages or notifications
4. Code snippets or programming content
5. Questions, problems, or prompts
6. Any other readable text

Format the output as plain text, preserving the structure and context. If there's code, maintain proper indentation and formatting.`;

    const result = await genAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [
            {
                role: 'user',
                parts: [
                    { text: extractionPrompt },
                    {
                        inlineData: {
                            data: imageData,
                            mimeType: 'image/jpeg'
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4000,
        }
    });
    
    const extractedText = result.candidates[0].content.parts[0].text;
    console.log(`✅ Basic extraction completed: ${extractedText.length} characters`);
    return extractedText;
}

// IPC handler for getting OpenRouter rate limit status
ipcMain.handle('get-openrouter-rate-limit', async (event, model) => {
    try {
        const { getRateLimitStatus } = require('./openrouter.js');
        const status = getRateLimitStatus(model);
        return { success: true, status };
    } catch (error) {
        console.error('Error getting rate limit status:', error);
        return { success: false, error: error.message };
    }
});

module.exports = {
    initializeGeminiSession,
    getEnabledTools,
    getStoredSetting,
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
