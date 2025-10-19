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

    // Note: Conversation history storage has been removed
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

    const systemPrompt = getSystemPrompt(profile, customPrompt, googleSearchEnabled);

    // Initialize new conversation session (only if not reconnecting)
    if (!isReconnection) {
        initializeNewSession();
    }

    try {
        // Determine which model to use based on mode
        let session;

        if (mode === 'interview') {
            // Interview mode: Use Gemini 2.5 Flash Live API for real-time audio/video
            const liveModel = 'gemini-live-2.5-flash-preview';
            console.log(`🎤 Interview mode: Using ${liveModel}`);

            session = await client.live.connect({
                model: liveModel,
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
        } else {
            // Coding/OA mode: Use regular Gemini API (not Live API) for better code quality
            const regularModel = model || 'gemini-2.5-flash';
            console.log(`💻 Coding/OA mode: Using ${regularModel} (regular API, screenshot-based)`);

            // Enhanced prompt for coding mode - ULTRA AGGRESSIVE for direct answers
            // Make Pro model even more aggressive about being concise
            const isProModel = regularModel.includes('pro');
            const codingPrompt = systemPrompt + `

============ CRITICAL CODING MODE INSTRUCTIONS ============

YOU ARE A CODING ASSISTANT IN A TIMED ASSESSMENT. FOLLOW THESE RULES EXACTLY:

${isProModel ? `
WARNING GEMINI PRO: YOU MUST BE EXTREMELY CONCISE. NO VERBOSE RESPONSES.
MAXIMUM 10 LINES OF EXPLANATION TOTAL. FOCUS ON CODE ONLY.
` : ''}

1. WHEN YOU SEE A SCREENSHOT:
   - DO NOT DESCRIBE the screenshot or UI elements
   - DO NOT explain what you see on screen
   - IMMEDIATELY read the coding problem text
   - IMMEDIATELY solve that problem
   - Your ONLY job is to provide the CODE SOLUTION

2. RESPONSE FORMAT (STRICTLY FOLLOW):
   - Line 1: One sentence approach (MAX 15 words)
   - Line 2+: COMPLETE working code ONLY (language shown on screen)
   - Last line: Time/Space complexity
   - DO NOT include: screenshot descriptions, UI analysis, or anything not related to the code solution

3. CODE REQUIREMENTS:
   - ZERO comments in code
   - ZERO explanations before or after code
   - ZERO tutorial text
   - ONLY the language shown on screen
   - CLEAN, optimized code that passes all test cases

4. ABSOLUTELY FORBIDDEN:
   - NO long explanations or theory
   - NO comments in code
   - NO multiple language versions
   - NO step-by-step walkthroughs
   - NO example inputs/outputs
   - NO alternative approaches discussion

5. RESPONSE LENGTH LIMIT:
   - Approach: 1 line (max 15 words)
   - Code: As needed
   - Complexity: 1 line
   - TOTAL NON-CODE TEXT: MAX 2 LINES

EXAMPLE OF PERFECT RESPONSE:
"HashMap to count frequencies, find max group size, return chars with that frequency.

class Solution {
    public String majorityFrequencyGroup(String s) {
        Map<Character, Integer> freq = new HashMap<>();
        for (char c : s.toCharArray()) freq.put(c, freq.getOrDefault(c, 0) + 1);
        Map<Integer, List<Character>> groups = new HashMap<>();
        for (Map.Entry<Character, Integer> e : freq.entrySet()) {
            groups.computeIfAbsent(e.getValue(), k -> new ArrayList<>()).add(e.getKey());
        }
        int maxSize = 0, maxFreq = 0;
        for (Map.Entry<Integer, List<Character>> e : groups.entrySet()) {
            int size = e.getValue().size();
            if (size > maxSize || (size == maxSize && e.getKey() > maxFreq)) {
                maxSize = size;
                maxFreq = e.getKey();
            }
        }
        StringBuilder sb = new StringBuilder();
        for (char c : groups.get(maxFreq)) sb.append(c);
        return sb.toString();
    }
}

Time: O(n), Space: O(n)"

CRITICAL FINAL REMINDER:
- DO NOT describe what you see in the screenshot
- DO NOT analyze UI elements, browser tabs, taskbar, or any visual elements
- DO NOT write "This is a screenshot of..." or "I see a problem on LeetCode..."
- IMMEDIATELY jump to solving the coding problem
- Your response MUST START with the approach sentence, NOT a description

NOW SOLVE THE CODING PROBLEM SHOWN IN THE SCREENSHOT.
RESPONSE FORMAT: [approach sentence] + [code] + [complexity]`;

            // For coding mode, we'll create a "session" object that mimics the live API
            // but uses generateContent internally
            session = {
                model: regularModel,
                client: client,
                systemPrompt: codingPrompt,
                tools: enabledTools,
                isClosed: false,
                conversationHistory: [], // Track conversation history for context

                async sendRealtimeInput(input) {
                    if (this.isClosed) {
                        console.log('Session is closed, ignoring input');
                        return;
                    }

                    try {
                        // Only process image and text inputs for coding mode
                        if (input.media || input.text) {
                            console.log(`📸 Sending to ${this.model}`);
                            sendToRenderer('update-status', 'Analyzing...');

                            // Build the parts array for current message
                            const parts = [];

                            if (input.text) {
                                parts.push({ text: input.text });
                            }

                            if (input.media) {
                                parts.push({
                                    inlineData: {
                                        mimeType: input.media.mimeType,
                                        data: input.media.data
                                    }
                                });
                            }

                            // Build full conversation with history
                            const contents = [
                                ...this.conversationHistory,
                                { role: 'user', parts: parts }
                            ];

                            // Use streaming for faster display
                            const streamResult = await this.client.models.generateContentStream({
                                model: this.model,
                                contents: contents,
                                systemInstruction: { parts: [{ text: this.systemPrompt }] },
                                generationConfig: {
                                    temperature: 0.7,
                                    topK: 40,
                                    topP: 0.95,
                                    maxOutputTokens: 8192,
                                },
                                tools: this.tools.length > 0 ? this.tools : undefined,
                            });

                            // Stream the response as it arrives
                            let responseText = '';

                            // Check if it's iterable stream or has stream property
                            const streamToIterate = streamResult.stream || streamResult;

                            try {
                                for await (const chunk of streamToIterate) {
                                    if (chunk && chunk.candidates && chunk.candidates.length > 0) {
                                        const candidate = chunk.candidates[0];
                                        if (candidate.content && candidate.content.parts) {
                                            for (const part of candidate.content.parts) {
                                                if (part.text) {
                                                    responseText += part.text;
                                                    // Send each chunk immediately for faster display
                                                    sendToRenderer('update-response', responseText);
                                                }
                                            }
                                        }
                                    }
                                }

                                if (responseText && responseText.trim()) {
                                    console.log(`✅ Got response: ${responseText.length} chars`);

                                    // Save to conversation history
                                    this.conversationHistory.push(
                                        { role: 'user', parts: parts },
                                        { role: 'model', parts: [{ text: responseText }] }
                                    );

                                    console.log(`💬 Conversation history: ${this.conversationHistory.length / 2} turns`);
                                    sendToRenderer('update-status', 'Ready');
                                } else {
                                    console.error('❌ No response text received');
                                    sendToRenderer('update-status', 'No response generated');
                                }
                            } catch (streamError) {
                                console.error('❌ Streaming error:', streamError);
                                // Fallback: try to get the complete result
                                const finalResult = await streamResult;
                                if (finalResult && finalResult.candidates && finalResult.candidates.length > 0) {
                                    const candidate = finalResult.candidates[0];
                                    if (candidate.content && candidate.content.parts) {
                                        for (const part of candidate.content.parts) {
                                            if (part.text) {
                                                responseText += part.text;
                                            }
                                        }
                                    }
                                }
                                if (responseText && responseText.trim()) {
                                    console.log(`✅ Got response (fallback): ${responseText.length} chars`);

                                    // Save to conversation history
                                    this.conversationHistory.push(
                                        { role: 'user', parts: parts },
                                        { role: 'model', parts: [{ text: responseText }] }
                                    );

                                    sendToRenderer('update-response', responseText);
                                    sendToRenderer('update-status', 'Ready');
                                } else {
                                    throw streamError;
                                }
                            }
                        }
                    } catch (error) {
                        console.error('❌ Error in coding mode:', error);

                        // Show user-friendly short error message
                        let shortMsg = 'Error';

                        if (error.message && error.message.toLowerCase().includes('429')) {
                            shortMsg = 'Rate limit exceeded';
                        } else if (error.message && error.message.toLowerCase().includes('503')) {
                            shortMsg = 'Server overloaded';
                        } else if (error.message && error.message.toLowerCase().includes('401')) {
                            shortMsg = 'Invalid API key';
                        }

                        sendToRenderer('update-status', shortMsg);
                    }
                },

                async close() {
                    this.isClosed = true;
                    console.log('Coding mode session closed');
                    sendToRenderer('update-status', 'Session closed');
                }
            };

            sendToRenderer('update-status', `${regularModel} ready (screenshot mode)`);
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

    ipcMain.handle('send-image-content', async (event, { data, debug, isManual }) => {
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

            // Check current mode to handle differently
            const currentMode = lastSessionParams?.mode || 'interview';

            process.stdout.write('!');

            if (currentMode === 'interview' && isManual) {
                // Interview mode (Live API) + Manual screenshot (Ctrl+Enter):
                // Send screenshot + text prompt to trigger a response
                // This is for when user wants AI to analyze something specific (question, code, etc.)
                await geminiSessionRef.current.sendRealtimeInput({
                    media: { data: data, mimeType: 'image/jpeg' },
                });

                // Small delay to ensure screenshot is processed
                await new Promise(resolve => setTimeout(resolve, 100));

                // Send a minimal prompt to trigger analysis without biasing the response
                await geminiSessionRef.current.sendRealtimeInput({
                    text: "."
                });
            } else {
                // Either exam mode OR automated screenshots in interview mode:
                // Just send screenshot alone (no text prompt to trigger response)
                await geminiSessionRef.current.sendRealtimeInput({
                    media: { data: data, mimeType: 'image/jpeg' },
                });
            }

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

    // Combined handler: Send screenshot + text
    ipcMain.handle('send-screenshot-with-text', async (event, { imageData, text }) => {
        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };

        try {
            if (!imageData || typeof imageData !== 'string') {
                return { success: false, error: 'Invalid image data' };
            }

            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return { success: false, error: 'Invalid text message' };
            }

            // Check current mode to handle differently
            const currentMode = lastSessionParams?.mode || 'interview';

            if (currentMode === 'interview') {
                // Interview mode (Live API): Send screenshot and text SEPARATELY
                // Live API doesn't support media + text in one request
                console.log('Interview mode: Sending screenshot + text in TWO separate requests:', text);

                // 1. Send screenshot first
                process.stdout.write('!');
                await geminiSessionRef.current.sendRealtimeInput({
                    media: { data: imageData, mimeType: 'image/jpeg' }
                });

                // 2. Send text prompt second
                await geminiSessionRef.current.sendRealtimeInput({
                    text: text.trim()
                });
            } else {
                // Exam Assistant mode (Regular API): Send screenshot + text together in ONE request
                console.log('Exam mode: Sending screenshot + text in one request:', text);

                await geminiSessionRef.current.sendRealtimeInput({
                    media: { data: imageData, mimeType: 'image/jpeg' },
                    text: text.trim()
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Error sending screenshot with text:', error);
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
