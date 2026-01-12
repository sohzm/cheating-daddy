const { GoogleGenAI } = require('@google/genai');
const { BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const { saveDebugAudio } = require('../audioUtils');
const { getSystemPrompt } = require('./prompts');
const { VADProcessor } = require('./vad');

// Conversation tracking variables
let currentSessionId = null;
let currentTranscription = '';
let conversationHistory = [];
let isInitializingSession = false;
let isSessionReady = false; // Track if Live API setup is complete

// Auto-reset tracking to prevent context buildup
let responseCount = 0;
const MAX_RESPONSES_BEFORE_RESET = 3; // Reset session every 3 responses for optimal performance
let isAutoResetting = false;
let pendingReset = false; // Flag to indicate reset is needed but waiting for turn to complete
let didGenerateResponse = false; // Track if AI actually generated a response in current turn

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
let storedLanguageName = 'English'; // Store the selected language name for use in prompts

// macOS VAD tracking variables
let macVADProcessor = null;
let macVADEnabled = false;
let macVADMode = 'automatic';
let macMicrophoneEnabled = false;

// Model generation settings (can be updated via IPC from renderer)
let generationSettings = {
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 8192,
};

// Model-specific max output token limits
const MODEL_MAX_OUTPUT_TOKENS = {
    // Gemini models
    'gemini-2.0-flash-exp': 8192,
    'gemini-2.5-flash': 65536,
    'gemini-3-pro-preview': 65536,
    // Groq Llama models
    'llama-4-maverick': 8192,
    'llama-4-scout': 8192,
};

// Get max output tokens for a specific model
function getMaxOutputTokensForModel(model) {
    return MODEL_MAX_OUTPUT_TOKENS[model] || 8192;
}

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

// Auto-reset session to prevent context buildup and maintain fast response times
async function autoResetSessionInBackground() {
    if (!lastSessionParams || isAutoResetting || isInitializingSession) {
        console.log('Cannot auto-reset: session params missing or already resetting');
        return;
    }

    isAutoResetting = true;
    console.log('Auto-resetting session after 3 responses to maintain optimal performance...');

    try {
        // Close current session
        if (global.geminiSessionRef?.current) {
            await global.geminiSessionRef.current.close();
        }

        // Small delay to ensure clean closure
        await new Promise(resolve => setTimeout(resolve, 500));

        // Create fresh session with same parameters
        const newSession = await initializeGeminiSession(
            lastSessionParams.apiKey,
            lastSessionParams.customPrompt,
            lastSessionParams.profile,
            lastSessionParams.language,
            false, // Not a reconnection, fresh start
            lastSessionParams.mode,
            lastSessionParams.model
        );

        if (newSession && global.geminiSessionRef) {
            global.geminiSessionRef.current = newSession;
            responseCount = 0; // Reset counter
            pendingReset = false; // Clear pending reset flag
            didGenerateResponse = false; // Reset response generation flag
            console.log('Session auto-reset completed - ready for fast responses');

            // IMPORTANT: Send conversation history to new session so it remembers previous Q&A
            await sendReconnectionContext();
            console.log('Conversation context sent to new session - AI remembers previous answers');
        } else {
            console.error('Failed to create new session during auto-reset');
        }
    } catch (error) {
        console.error('Error during auto-reset:', error);
    } finally {
        isAutoResetting = false;
    }
}

async function initializeGeminiSession(apiKey, customPrompt = '', profile = 'interview', language = 'en-US', isReconnection = false, mode = 'interview', model = 'gemini-2.5-flash') {
    if (isInitializingSession) {
        console.log('Session initialization already in progress');
        return false;
    }

    isInitializingSession = true;
    isSessionReady = false; // Reset ready state for new session
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
        responseCount = 0; // Reset response counter for fresh session
        didGenerateResponse = false; // Reset response generation flag
        console.log('Response counter reset for new session');
    }

    const client = new GoogleGenAI({
        vertexai: false,
        apiKey: apiKey,
    });

    // Get enabled tools first to determine Google Search status
    const enabledTools = await getEnabledTools();
    const googleSearchEnabled = enabledTools.some(tool => tool.googleSearch);

    let systemPrompt = getSystemPrompt(profile, customPrompt, googleSearchEnabled);

    // Add explicit language instruction based on user's selected language
    const languageMap = {
        'en-US': 'English',
        'en-GB': 'English',
        'en-AU': 'English',
        'en-IN': 'English',
        'es-ES': 'Spanish',
        'es-US': 'Spanish',
        'fr-FR': 'French',
        'fr-CA': 'French',
        'de-DE': 'German',
        'it-IT': 'Italian',
        'pt-BR': 'Portuguese',
        'pt-PT': 'Portuguese',
        'ru-RU': 'Russian',
        'ja-JP': 'Japanese',
        'ko-KR': 'Korean',
        'zh-CN': 'Chinese (Simplified)',
        'cmn-CN': 'Chinese (Simplified)',
        'zh-TW': 'Chinese (Traditional)',
        'ar-SA': 'Arabic',
        'ar-XA': 'Arabic',
        'hi-IN': 'Hindi',
        'nl-NL': 'Dutch',
        'pl-PL': 'Polish',
        'tr-TR': 'Turkish',
        'sv-SE': 'Swedish',
        'da-DK': 'Danish',
        'fi-FI': 'Finnish',
        'no-NO': 'Norwegian',
        'th-TH': 'Thai',
        'te-IN': 'Telugu',
        'ta-IN': 'Tamil',
        'mr-IN': 'Marathi',
        'ml-IN': 'Malayalam',
        'kn-IN': 'Kannada',
        'gu-IN': 'Gujarati',
        'bn-IN': 'Bengali',
        'vi-VN': 'Vietnamese',
        'id-ID': 'Indonesian',
    };

    const selectedLanguageName = languageMap[language] || 'English';
    storedLanguageName = selectedLanguageName; // Store for use in text/screenshot prompts

    // Add critical language instruction to system prompt
    systemPrompt += `\n\n=== CRITICAL LANGUAGE INSTRUCTION ===
The user has selected ${selectedLanguageName} as their preferred language.
YOU MUST respond ONLY in ${selectedLanguageName}, regardless of what language the interviewer or other person uses.
Even if they speak in mixed languages (e.g., English + Hindi, Russian + English, etc.), you MUST respond entirely in ${selectedLanguageName}.
This is mandatory and cannot be overridden by any other instruction.`;

    // Initialize new conversation session (only if not reconnecting)
    if (!isReconnection) {
        initializeNewSession();
    }

    try {
        // Determine which model to use based on mode
        let session;

        if (mode === 'interview') {
            // Interview mode: Use Gemini 2.0 Flash Exp Live API for real-time audio/video
            const liveModel = 'gemini-2.0-flash-exp';
            console.log(` Interview mode: Using ${liveModel}`);

            session = await client.live.connect({
                model: liveModel,
            callbacks: {
                onopen: function () {
                    sendToRenderer('update-status', 'Live session connected');
                },
                onmessage: function (message) {
                    console.log('----------------', message);

                    // Handle setup complete - session is now ready
                    if (message.setupComplete) {
                        isSessionReady = true;
                        isInitializingSession = false;
                        sendToRenderer('session-initializing', false);
                        sendToRenderer('update-status', 'Listening...');
                        console.log('✅ Live API setup complete - session ready');
                    }

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
                                didGenerateResponse = true; // Mark that AI generated a response
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
                        // Note: Auto-reset logic moved to turnComplete handler (Live API uses turnComplete, not generationComplete)
                    }

                    if (message.serverContent?.turnComplete) {
                        sendToRenderer('update-status', 'Listening...');
                        // Clear message buffer for the next turn to prevent concatenation
                        messageBuffer = '';
                        currentTranscription = '';

                        // Check if we have a pending reset AND if AI actually responded
                        if (pendingReset && !isAutoResetting) {
                            if (didGenerateResponse) {
                                console.log('Executing pending auto-reset now that turn is complete...');
                                pendingReset = false;
                                didGenerateResponse = false; // Reset for next turn
                                // Small delay to ensure UI updates complete
                                setTimeout(() => {
                                    autoResetSessionInBackground();
                                }, 500);
                            } else {
                                console.log('Turn complete but no response generated (interrupted) - keeping pending reset, waiting for actual response');
                                // Keep pendingReset = true, don't execute yet
                            }
                        } else if (didGenerateResponse) {
                            // Only count responses that were actually generated
                            responseCount++;
                            console.log(`Response ${responseCount}/${MAX_RESPONSES_BEFORE_RESET} completed`);

                            // Check if we need to reset after NEXT response
                            if (responseCount >= MAX_RESPONSES_BEFORE_RESET && !isAutoResetting) {
                                console.log('Auto-reset scheduled - will reset after next question is answered');
                                pendingReset = true;
                            }
                        }

                        // Always reset the flag for next turn
                        didGenerateResponse = false;
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
                        sendToRenderer('update-status', 'Invalid API Key');
                        return;
                    }

                    // Check if the error is related to quota exceeded
                    const isQuotaError =
                        e.message &&
                        (e.message.includes('exceeded your current quota') ||
                            e.message.includes('quota exceeded') ||
                            e.message.includes('RESOURCE_EXHAUSTED') ||
                            e.message.includes('rate limit'));

                    if (isQuotaError) {
                        console.log('Error due to quota exceeded - stopping reconnection attempts');
                        lastSessionParams = null; // Clear session params to prevent reconnection
                        reconnectionAttempts = maxReconnectionAttempts; // Stop further attempts
                        sendToRenderer('update-status', 'API Quota Exceed');
                        return;
                    }

                    sendToRenderer('update-status', 'Error: ' + e.message);
                },
                onclose: function (e) {
                    console.debug('Session closed:', e.reason);
                    isSessionReady = false; // Reset ready state when session closes

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
                        sendToRenderer('update-status', 'Invalid API Key');
                        return;
                    }

                    // Check if the session closed due to quota exceeded
                    const isQuotaError =
                        e.reason &&
                        (e.reason.includes('exceeded your current quota') ||
                            e.reason.includes('quota exceeded') ||
                            e.reason.includes('RESOURCE_EXHAUSTED') ||
                            e.reason.includes('rate limit'));

                    if (isQuotaError) {
                        console.log('Session closed due to quota exceeded - stopping reconnection attempts');
                        lastSessionParams = null; // Clear session params to prevent reconnection
                        reconnectionAttempts = maxReconnectionAttempts; // Stop further attempts
                        sendToRenderer('update-status', 'API Quota Exceed');
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
                    contextWindowCompression: {
                        triggerTokens: 28000,
                        slidingWindow: {
                            targetTokens: 13000
                        }
                    },
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
                                // Add language reminder for non-English languages
                                let finalText = input.text;
                                if (storedLanguageName !== 'English') {
                                    finalText = `${input.text} (Remember: Respond in ${storedLanguageName})`;
                                }
                                parts.push({ text: finalText });
                            }

                            if (input.media) {
                                parts.push({
                                    inlineData: {
                                        mimeType: input.media.mimeType,
                                        data: input.media.data
                                    }
                                });
                                // Add language reminder for non-English when only screenshot (no text provided)
                                if (!input.text && storedLanguageName !== 'English') {
                                    parts.push({ text: `(Remember: Respond in ${storedLanguageName})` });
                                }
                            }

                            // Build full conversation with history
                            const contents = [
                                ...this.conversationHistory,
                                { role: 'user', parts: parts }
                            ];

                            // Log caching status for performance monitoring
                            if (this.conversationHistory.length > 0) {
                                console.log(`Using context cache for faster response (request #${this.conversationHistory.length / 2 + 1})`);
                            }

                            // Use streaming for faster display with context caching
                            // Ensure maxOutputTokens doesn't exceed model's limit
                            const modelMaxTokens = getMaxOutputTokensForModel(this.model);
                            const effectiveMaxTokens = Math.min(generationSettings.maxOutputTokens, modelMaxTokens);

                            const streamResult = await this.client.models.generateContentStream({
                                model: this.model,
                                contents: contents,
                                systemInstruction: { parts: [{ text: this.systemPrompt }] },
                                generationConfig: {
                                    temperature: generationSettings.temperature,
                                    topK: 40,
                                    topP: generationSettings.topP,
                                    maxOutputTokens: effectiveMaxTokens,
                                },
                                tools: this.tools.length > 0 ? this.tools : undefined,
                                // Context caching: Cache system prompt for 5 minutes (one interview session)
                                // This speeds up subsequent requests by ~50% by reusing cached content
                                cachedContent: {
                                    ttl: '300s', // 5 minutes - good for one coding/interview session
                                },
                            });

                            // Stream the response as it arrives
                            let responseText = '';

                            // Check if it's iterable stream or has stream property
                            const streamToIterate = streamResult.stream || streamResult;

                            // Streaming optimization: Batch UI updates for smoother rendering
                            let lastUpdateTime = Date.now();
                            const UPDATE_INTERVAL = 50; // Update UI every 50ms for smooth rendering

                            try {
                                for await (const chunk of streamToIterate) {
                                    if (chunk && chunk.candidates && chunk.candidates.length > 0) {
                                        const candidate = chunk.candidates[0];
                                        if (candidate.content && candidate.content.parts) {
                                            for (const part of candidate.content.parts) {
                                                if (part.text) {
                                                    responseText += part.text;

                                                    // Batch updates: Only send to UI every 50ms for smoother rendering
                                                    const now = Date.now();
                                                    if (now - lastUpdateTime >= UPDATE_INTERVAL) {
                                                        sendToRenderer('update-response', responseText);
                                                        lastUpdateTime = now;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                // Send final update to ensure last chunk is displayed
                                sendToRenderer('update-response', responseText);

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
            // Coding mode is immediately ready (no Live API setup delay)
            isSessionReady = true;
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

async function startMacOSAudioCapture(geminiSessionRef, vadEnabled = false, vadMode = 'automatic') {
    if (process.platform !== 'darwin') return false;

    // Kill any existing SystemAudioDump processes first
    await killExistingSystemAudioDump();

    console.log('Starting macOS audio capture with SystemAudioDump...');

    const { app } = require('electron');
    const path = require('path');
    const fs = require('fs');

    let systemAudioPath;
    if (app.isPackaged) {
        systemAudioPath = path.join(process.resourcesPath, 'SystemAudioDump');
    } else {
        systemAudioPath = path.join(__dirname, '../assets', 'SystemAudioDump');
    }

    console.log('SystemAudioDump path:', systemAudioPath);

    // Check if SystemAudioDump binary exists before attempting to spawn
    if (!fs.existsSync(systemAudioPath)) {
        console.warn('⚠ SystemAudioDump binary not found at:', systemAudioPath);
        console.warn('ℹ macOS system audio capture will not be available.');
        console.warn('ℹ The app will continue but audio from other apps will not be captured.');
        console.warn('ℹ To enable audio capture, ensure SystemAudioDump is in src/assets/ (development) or Resources/ (packaged).');
        return false;
    }

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

    try {
        systemAudioProc = spawn(systemAudioPath, [], spawnOptions);
    } catch (error) {
        console.error(' Failed to spawn SystemAudioDump:', error.message);
        console.error('Path:', systemAudioPath);
        console.error('Hint: Make sure SystemAudioDump binary has execute permissions (chmod +x)');
        return false;
    }

    if (!systemAudioProc.pid) {
        console.error(' Failed to start SystemAudioDump - no PID');
        console.error('Path:', systemAudioPath);
        console.error('Hint: Binary may not have execute permissions or wrong architecture');
        return false;
    }

    console.log(' SystemAudioDump started with PID:', systemAudioProc.pid);

    const CHUNK_DURATION = 0.1;
    const SAMPLE_RATE = 24000;
    const BYTES_PER_SAMPLE = 2;
    const CHANNELS = 2;
    const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * CHUNK_DURATION;

    let audioBuffer = Buffer.alloc(0);

    // Initialize VAD for macOS using settings passed from renderer
    macVADEnabled = vadEnabled;
    macVADMode = vadMode;

    console.log(`🔧 [macOS] VAD Settings: enabled=${macVADEnabled}, mode=${macVADMode}`);

    if (macVADEnabled) {
        console.log(`🔧 [macOS] Initializing VAD in ${macVADMode.toUpperCase()} mode`);

        // Initialize microphone state based on mode
        if (macVADMode === 'automatic') {
            macMicrophoneEnabled = true;
            console.log('🎤 [macOS AUTOMATIC] Microphone enabled by default');
        } else {
            macMicrophoneEnabled = false;
            console.log('🔴 [macOS MANUAL] Microphone OFF - click button to enable');
        }

        // Create VAD processor for macOS
        macVADProcessor = new VADProcessor(
            async (audioSegment, metadata) => {
                try {
                    // Convert Float32Array to PCM Buffer
                    const pcmBuffer = convertFloat32ToPCMBuffer(audioSegment);
                    const base64Data = pcmBuffer.toString('base64');
                    await sendAudioToGemini(base64Data, geminiSessionRef);
                    console.log('🎤 [macOS VAD] Audio segment sent:', metadata);
                } catch (error) {
                    console.error('❌ [macOS VAD] Failed to send audio segment:', error);
                }
            },
            null, // onStateChange callback
            macVADMode // VAD mode
        );

        console.log('✅ [macOS] VAD processor initialized');
    }

    systemAudioProc.stdout.on('data', data => {
        audioBuffer = Buffer.concat([audioBuffer, data]);

        while (audioBuffer.length >= CHUNK_SIZE) {
            const chunk = audioBuffer.slice(0, CHUNK_SIZE);
            audioBuffer = audioBuffer.slice(CHUNK_SIZE);

            const monoChunk = CHANNELS === 2 ? convertStereoToMono(chunk) : chunk;

            if (macVADEnabled && macVADProcessor) {
                // VAD mode: process through VAD
                if (!macMicrophoneEnabled) {
                    // Skip audio processing if mic is OFF in manual mode
                    continue;
                }

                // Convert PCM Buffer to Float32Array for VAD
                const float32Audio = convertPCMBufferToFloat32(monoChunk);
                macVADProcessor.processAudio(float32Audio);
            } else {
                // No VAD: send directly to Gemini (legacy behavior)
                const base64Data = monoChunk.toString('base64');
                sendAudioToGemini(base64Data, geminiSessionRef);
            }

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
        console.error(' SystemAudioDump process error:', err);

        // Provide helpful error message for architecture issues
        if (err.code === 'ENOENT') {
            console.error('\n TROUBLESHOOTING:');
            console.error('1. SystemAudioDump may not have execute permissions');
            console.error('   Run: chmod +x /path/to/SystemAudioDump');
            console.error('\n2. Binary may be wrong architecture for your Mac');
            console.error('   - ARM64 binary requires Apple Silicon (M1/M2/M3)');
            console.error('   - x64 binary requires Intel Mac or Rosetta 2');
            console.error('\n3. For Intel Macs: Install Rosetta 2');
            console.error('   Run: softwareupdate --install-rosetta');
        }

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

// Convert PCM Buffer (Int16) to Float32Array for VAD processing
function convertPCMBufferToFloat32(pcmBuffer) {
    const samples = pcmBuffer.length / 2; // 2 bytes per sample (Int16)
    const float32Array = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
        const int16Sample = pcmBuffer.readInt16LE(i * 2);
        // Convert from Int16 range [-32768, 32767] to Float32 range [-1, 1]
        float32Array[i] = int16Sample / (int16Sample < 0 ? 32768 : 32767);
    }

    return float32Array;
}

// Convert Float32Array back to PCM Buffer (Int16) for sending to Gemini
function convertFloat32ToPCMBuffer(float32Array) {
    const pcmBuffer = Buffer.alloc(float32Array.length * 2); // 2 bytes per sample

    for (let i = 0; i < float32Array.length; i++) {
        // Clamp to [-1, 1] range
        const sample = Math.max(-1, Math.min(1, float32Array[i]));
        // Convert from Float32 range [-1, 1] to Int16 range [-32768, 32767]
        const int16Sample = sample < 0 ? sample * 32768 : sample * 32767;
        pcmBuffer.writeInt16LE(Math.round(int16Sample), i * 2);
    }

    return pcmBuffer;
}

function stopMacOSAudioCapture() {
    // Clean up VAD processor
    if (macVADProcessor) {
        macVADProcessor.destroy();
        macVADProcessor = null;
        console.log('[macOS] VAD processor destroyed');
    }

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

    // Update model generation settings from renderer
    ipcMain.handle('update-generation-settings', async (event, settings) => {
        if (settings.temperature !== undefined) {
            generationSettings.temperature = settings.temperature;
        }
        if (settings.topP !== undefined) {
            generationSettings.topP = settings.topP;
        }
        if (settings.maxOutputTokens !== undefined) {
            generationSettings.maxOutputTokens = settings.maxOutputTokens;
        }
        console.log('[GEMINI] Generation settings updated:', generationSettings);
        return { success: true };
    });

    // Get model-specific max output tokens
    ipcMain.handle('get-model-max-tokens', async (event, model) => {
        return getMaxOutputTokensForModel(model);
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

            // For interview mode manual screenshots, wait for session to be ready
            if (currentMode === 'interview' && isManual && !isSessionReady) {
                console.log('⏳ Waiting for Live API setup to complete...');
                // Wait up to 10 seconds for setupComplete
                let waitTime = 0;
                while (!isSessionReady && waitTime < 10000) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    waitTime += 100;
                }
                if (!isSessionReady) {
                    console.warn('⚠️ Session not ready after 10s - screenshot may fail');
                    return { success: false, error: 'Session not ready yet - please wait a few seconds and try again' };
                }
                console.log('✅ Session ready, proceeding with screenshot');
            }

            process.stdout.write('!');

            if (currentMode === 'interview' && isManual) {
                // Interview mode (Live API) + Manual screenshot (Ctrl+Enter):
                // Send screenshot + smart prompt to analyze what's shown
                // This helps when user wants to ask about what's on screen
                await geminiSessionRef.current.sendRealtimeInput({
                    media: { data: data, mimeType: 'image/jpeg' },
                });

                // Small delay to ensure screenshot is processed
                await new Promise(resolve => setTimeout(resolve, 100));

                // Send contextual prompt that analyzes the screenshot content
                await geminiSessionRef.current.sendRealtimeInput({
                    text: "Based on this screenshot: If you see a CODING PROBLEM (LeetCode, HackerRank, CodeSignal, etc. with a code editor), immediately provide the COMPLETE CODE SOLUTION using the EXACT function signature visible in the screenshot (same class name, method name, parameter count/types/names, return type). DO NOT modify the signature - if it shows 3 parameters, your solution MUST use all 3 parameters. DO NOT search online for similar problems. Format: [1-line approach] + [clean code block without comments using EXACT signature] + [complexity] + [algorithm explanation with 2-4 brief bullet points so I can explain the approach to the interviewer]. If it's an APTITUDE/MCQ/REASONING question, answer directly and concisely in 2-3 sentences - DO NOT say 'This is a word problem' or 'not a coding question', just give the answer. If it's a regular interview question, answer briefly (2-3 sentences). If it's just code to review, explain what it does. If unclear, describe what you see."
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

            // Add language reminder for non-English languages
            let finalText = text.trim();
            if (storedLanguageName !== 'English') {
                finalText += ` (Remember: Respond in ${storedLanguageName})`;
            }

            console.log('Sending text message:', finalText);
            await geminiSessionRef.current.sendRealtimeInput({ text: finalText });
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

            // Add language reminder for non-English languages
            let finalText = text.trim();
            if (storedLanguageName !== 'English') {
                finalText += ` (Remember: Respond in ${storedLanguageName})`;
            }

            if (currentMode === 'interview') {
                // Interview mode (Live API): Send screenshot and text SEPARATELY
                // Live API doesn't support media + text in one request
                console.log('Interview mode: Sending screenshot + text in TWO separate requests:', finalText);

                // 1. Send screenshot first
                process.stdout.write('!');
                await geminiSessionRef.current.sendRealtimeInput({
                    media: { data: imageData, mimeType: 'image/jpeg' }
                });

                // 2. Send text prompt second
                await geminiSessionRef.current.sendRealtimeInput({
                    text: finalText
                });
            } else {
                // Exam Assistant mode (Regular API): Send screenshot + text together in ONE request
                console.log('Exam mode: Sending screenshot + text in one request:', finalText);

                await geminiSessionRef.current.sendRealtimeInput({
                    media: { data: imageData, mimeType: 'image/jpeg' },
                    text: finalText
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Error sending screenshot with text:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('start-macos-audio', async (event, vadEnabled = false, vadMode = 'automatic') => {
        if (process.platform !== 'darwin') {
            return {
                success: false,
                error: 'macOS audio capture only available on macOS',
            };
        }

        try {
            const success = await startMacOSAudioCapture(geminiSessionRef, vadEnabled, vadMode);
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

    // macOS microphone toggle handler (for manual VAD mode)
    ipcMain.handle('toggle-macos-microphone', async (event, enabled) => {
        try {
            if (process.platform !== 'darwin') {
                return { success: false, error: 'macOS only' };
            }

            macMicrophoneEnabled = enabled;
            console.log(`🎤 [macOS] Microphone ${enabled ? 'enabled' : 'disabled'}`);

            if (macVADProcessor && macVADMode === 'manual') {
                if (enabled) {
                    // Manual mode: enable mic and start recording
                    macVADProcessor.resume();
                    console.log('[macOS MANUAL] Mic ON - now recording');
                } else {
                    // Manual mode: disable mic and commit audio
                    if (macVADProcessor.audioBuffer && macVADProcessor.audioBuffer.length > 0) {
                        console.log('[macOS MANUAL] Mic OFF - committing audio');
                        macVADProcessor.commit();
                    } else {
                        macVADProcessor.pause();
                        console.log('[macOS MANUAL] Mic OFF - no audio to commit');
                    }
                }
            }

            return { success: true, enabled: macMicrophoneEnabled };
        } catch (error) {
            console.error('Error toggling macOS microphone:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('close-session', async event => {
        try {
            stopMacOSAudioCapture();

            // Clear session params to prevent reconnection when user closes session
            lastSessionParams = null;

            // Reset response counter
            responseCount = 0;
            console.log('🔄 Response counter reset on session close');

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

    // VAD mode update handler
    ipcMain.handle('update-vad-mode', async (event, vadMode) => {
        try {
            console.log(`VAD mode updated to: ${vadMode}`);
            // The renderer process will handle the VAD mode change
            // This handler is mainly for logging and potential future use
            return { success: true, mode: vadMode };
        } catch (error) {
            console.error('Error updating VAD mode:', error);
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
    convertPCMBufferToFloat32,
    convertFloat32ToPCMBuffer,
    stopMacOSAudioCapture,
    sendAudioToGemini,
    setupGeminiIpcHandlers,
    attemptReconnection,
    formatSpeakerResults,
};
