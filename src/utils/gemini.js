const { GoogleGenAI, Modality } = require('@google/genai');
const { BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const { saveDebugAudio } = require('../audioUtils');
const { getSystemPrompt } = require('./prompts');
const { getAvailableModel, incrementLimitCount, getApiKey, getGroqApiKey, incrementCharUsage, getModelForToday } = require('../storage');
const { connectCloud, sendCloudAudio, sendCloudText, sendCloudImage, closeCloud, isCloudActive, setOnTurnComplete } = require('./cloud');
const { getCachedResponse, setCachedResponse, getCacheStats, clearCache } = require('./cache');
const { shouldUseFastModel } = require('./router');

// Lazy-loaded to avoid circular dependency (localai.js imports from gemini.js)
let _localai = null;
function getLocalAi() {
    if (!_localai) _localai = require('./localai');
    return _localai;
}

// Provider mode: 'byok', 'cloud', or 'local'
let currentProviderMode = 'byok';

// Groq conversation history for context
let groqConversationHistory = [];

// Conversation tracking variables
let currentSessionId = null;
let currentTranscription = '';
let conversationHistory = [];
let screenAnalysisHistory = [];
let currentProfile = null;
let currentCustomPrompt = null;
let isInitializingSession = false;
let currentSystemPrompt = null;

// Fast response tracking
let isProcessingResponse = false;
let lastProcessedTranscription = '';
let pendingTranscription = '';
let pendingTranscriptionTimestamp = 0;
let pauseTimer = null;
let responseProcessedForCurrentTurn = false;

// Check if question is complete (ends with ? or has complete sentences)
function isQuestionComplete(text) {
    const trimmed = text.trim();
    return trimmed.endsWith('?') || (trimmed.match(/[.!?]+\s/g) || []).length >= 1;
}

// Check if new input looks like continuation of previous (not a new question)
function isQuestionContinuation(newText, previousText) {
    if (!previousText || previousText.trim().length === 0) return false;

    // If new text is very short (< 10 chars) and doesn't start with capital, it's likely a fragment
    if (newText.trim().length < 10 && !/^[A-Z]/.test(newText.trim())) {
        return true;
    }

    // If previous text ends with a word (not punctuation), new text is likely continuation
    const endsWithWord = /[a-zA-Z]$/.test(previousText.trim());
    return endsWithWord;
}

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

    const contextLines = validTurns.map(turn => `[Interviewer]: ${turn.transcription.trim()}\n[Your answer]: ${turn.ai_response.trim()}`);

    return `Session reconnected. Here's the conversation so far:\n\n${contextLines.join('\n\n')}\n\nContinue from here.`;
}

// Conversation management functions
function initializeNewSession(profile = null, customPrompt = null) {
    currentSessionId = Date.now().toString();
    currentTranscription = '';
    conversationHistory = [];
    screenAnalysisHistory = [];
    groqConversationHistory = [];
    currentProfile = profile;
    currentCustomPrompt = customPrompt;
    console.log('New conversation session started:', currentSessionId, 'profile:', profile);

    // Save initial session with profile context
    if (profile) {
        sendToRenderer('save-session-context', {
            sessionId: currentSessionId,
            profile: profile,
            customPrompt: customPrompt || '',
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
        model: model,
    };

    screenAnalysisHistory.push(analysisEntry);
    console.log('Saved screen analysis:', analysisEntry);

    // Send to renderer to save
    sendToRenderer('save-screen-analysis', {
        sessionId: currentSessionId,
        analysis: analysisEntry,
        fullHistory: screenAnalysisHistory,
        profile: currentProfile,
        customPrompt: currentCustomPrompt,
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
        const preferences = require('../storage').getPreferences();
        const value = preferences[key];
        return value === undefined || value === null ? defaultValue : String(value);
    } catch (error) {
        console.error('Error getting stored setting for', key, ':', error.message);
        return defaultValue;
    }
}

function describeCloseReason(closeEvent) {
    if (!closeEvent) {
        return 'unknown';
    }

    if (typeof closeEvent.reason === 'string' && closeEvent.reason.trim() !== '') {
        return closeEvent.reason;
    }

    if (typeof closeEvent.code === 'number') {
        return `code ${closeEvent.code}`;
    }

    return 'no reason provided';
}

function summarizeLiveServerMessage(message) {
    const serverContent = message?.serverContent;
    if (!serverContent) {
        return null;
    }

    if (serverContent.setupComplete) {
        return 'setupComplete';
    }

    if (serverContent.generationComplete) {
        return 'generationComplete';
    }

    if (serverContent.turnComplete) {
        return 'turnComplete';
    }

    if (typeof serverContent.inputTranscription?.text === 'string') {
        return `inputTranscription: ${serverContent.inputTranscription.text}`;
    }

    if (typeof serverContent.outputTranscription?.text === 'string') {
        return `outputTranscription: ${serverContent.outputTranscription.text}`;
    }

    if (serverContent.modelTurn?.parts) {
        // Log periodically - there are many chunks
    }

    return null;
}

// helper to check if groq has been configured
function hasGroqKey() {
    const key = getGroqApiKey();
    return key && key.trim() != '';
}

function trimConversationHistoryForGemma(history, maxChars = 42000) {
    if (!history || history.length === 0) return [];
    let totalChars = 0;
    const trimmed = [];

    for (let i = history.length - 1; i >= 0; i--) {
        const turn = history[i];
        const turnChars = (turn.content || '').length;

        if (totalChars + turnChars > maxChars) break;
        totalChars += turnChars;
        trimmed.unshift(turn);
    }
    return trimmed;
}

function stripThinkingTags(text) {
    if (!text) return '';
    let result = text;
    // Remove ALL instances of thinking tags (using global flag)
    result = result.replace(/<think>[\s\S]*?<\/think>/gi, '');
    // Also handle cases where tags might be split across streamed chunks (incomplete)
    result = result.replace(/<think>/gi, '');
    result = result.replace(/<\/think>/gi, '');
    return result.trim();
}

async function sendToGroq(transcription, isPartial = false, preferFastModel = null) {
    const groqApiKey = getGroqApiKey();
    if (!groqApiKey) {
        console.log('No Groq API key configured, skipping Groq response');
        return;
    }

    if (!transcription || transcription.trim() === '') {
        console.log('Empty transcription, skipping Groq');
        return;
    }

    // Check cache for exact or similar questions (skip for partial transcriptions)
    if (!isPartial) {
        const cachedResponse = getCachedResponse(transcription);
        if (cachedResponse) {
            const { response } = cachedResponse;
            console.log('[Cache] Using cached response');
            sendToRenderer('new-response', response);

            groqConversationHistory.push({
                role: 'user',
                content: transcription.trim(),
            });
            groqConversationHistory.push({
                role: 'assistant',
                content: response,
            });

            saveConversationTurn(transcription, response);
            isProcessingResponse = false;
            sendToRenderer('update-status', 'Listening... (cached)');
            return;
        }
    }

    // Determine which model to use based on query complexity
    // preferFastModel can be: true (force fast), false (force complex), null (auto-detect)
    let useFastModel = preferFastModel;
    if (useFastModel === null) {
        useFastModel = shouldUseFastModel(transcription);
    }

    // Select model based on complexity
    // Fast models: llama-3.1-70b-versatile (default), mixtral-8x7b-32768
    // Complex models: llama-3.1-405b-reasoning-ultra, deepseek-r1-distill-llama-70b
    let modelToUse;
    if (useFastModel) {
        modelToUse = getModelForToday() || 'llama-3.1-70b-versatile';
    } else {
        // Use a more capable model for complex queries
        modelToUse = 'llama-3.1-405b-reasoning-ultra';
    }

    // Check if we have the model available
    const availableModel = getModelForToday();
    if (!availableModel) {
        console.log('All Groq daily limits exhausted');
        sendToRenderer('update-status', 'Groq limits reached for today');
        return;
    }

    // If the complex model isn't available in today's pool, fall back to available model
    if (!useFastModel && availableModel !== modelToUse) {
        console.log('[Router] Complex model not in daily pool, using available:', availableModel);
        modelToUse = availableModel;
    }

    console.log(`Sending to Groq (${modelToUse}, fast=${useFastModel}):`, transcription.substring(0, 100) + '...');

    // Mark as processing to prevent turnComplete from clearing state prematurely
    isProcessingResponse = true;

    // Clear previous response and show processing status
    sendToRenderer('new-response', 'Processing...');

    groqConversationHistory.push({
        role: 'user',
        content: transcription.trim(),
    });

    if (groqConversationHistory.length > 20) {
        groqConversationHistory = groqConversationHistory.slice(-20);
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: [{ role: 'system', content: currentSystemPrompt || 'You are a helpful assistant.' }, ...groqConversationHistory],
                stream: true,
                temperature: useFastModel ? 0.7 : 0.3, // Lower temp for complex reasoning
                max_tokens: useFastModel ? 1024 : 2048, // More tokens for complex
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq API error:', response.status, errorText);

            // Fallback to Gemini on rate limit (429)
            if (response.status === 429) {
                console.log('[Fast Mode] Groq rate limited, falling back to Gemini...');
                sendToRenderer('update-status', 'Rate limited, using Gemini...');
                // Retry with Gemini
                const apiKey = getApiKey();
                if (apiKey) {
                    sendToGemma(transcription);
                    return;
                }
            }

            sendToRenderer('update-status', `Groq error: ${response.status}`);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let isFirst = true;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const json = JSON.parse(data);
                        const token = json.choices?.[0]?.delta?.content || '';
                        if (token) {
                            fullText += token;
                            const displayText = stripThinkingTags(fullText);
                            if (displayText) {
                                // Only log occasionally to avoid spam
                                if (displayText.length % 200 === 0) {
                                    console.log('[Fast Mode Debug] Response chunk:', displayText.substring(0, 20) + '...');
                                }
                                sendToRenderer(isFirst ? 'new-response' : 'update-response', displayText);
                                isFirst = false;
                            }
                        }
                    } catch (parseError) {
                        // Skip invalid JSON chunks
                    }
                }
            }
        }

        const cleanedResponse = stripThinkingTags(fullText);
        const modelKey = modelToUse.split('/').pop();

        const systemPromptChars = (currentSystemPrompt || 'You are a helpful assistant.').length;
        const historyChars = groqConversationHistory.reduce((sum, msg) => sum + (msg.content || '').length, 0);
        const inputChars = systemPromptChars + historyChars;
        const outputChars = cleanedResponse.length;

        incrementCharUsage('groq', modelKey, inputChars + outputChars);

        if (cleanedResponse) {
            groqConversationHistory.push({
                role: 'assistant',
                content: cleanedResponse,
            });

            // Cache the response (skip partial transcriptions)
            if (!isPartial) {
                setCachedResponse(transcription, cleanedResponse);
            }

            saveConversationTurn(transcription, cleanedResponse);
        }

        console.log(`Groq response completed (${modelToUse})`);
        // Allow next question to be processed immediately
        isProcessingResponse = false;
        sendToRenderer('update-status', 'Listening...');
    } catch (error) {
        console.error('Error calling Groq API:', error);
        isProcessingResponse = false;
        sendToRenderer('update-status', 'Groq error: ' + error.message);
    }
}

async function sendToGemma(transcription) {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.log('No Gemini API key configured');
        return;
    }

    if (!transcription || transcription.trim() === '') {
        console.log('Empty transcription, skipping Gemma');
        return;
    }

    console.log('Sending to Gemma:', transcription.substring(0, 100) + '...');

    // Mark as processing to prevent turnComplete from clearing state prematurely
    isProcessingResponse = true;

    // Clear previous response and show processing status
    sendToRenderer('new-response', 'Processing...');

    groqConversationHistory.push({
        role: 'user',
        content: transcription.trim(),
    });

    const trimmedHistory = trimConversationHistoryForGemma(groqConversationHistory, 42000);

    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });

        const messages = trimmedHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));

        const systemPrompt = currentSystemPrompt || 'You are a helpful assistant.';
        const messagesWithSystem = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] },
            ...messages,
        ];

        const response = await ai.models.generateContentStream({
            model: 'gemma-3-27b-it',
            contents: messagesWithSystem,
        });

        let fullText = '';
        let isFirst = true;

        for await (const chunk of response) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                sendToRenderer(isFirst ? 'new-response' : 'update-response', fullText);
                isFirst = false;
            }
        }

        const systemPromptChars = (currentSystemPrompt || 'You are a helpful assistant.').length;
        const historyChars = trimmedHistory.reduce((sum, msg) => sum + (msg.content || '').length, 0);
        const inputChars = systemPromptChars + historyChars;
        const outputChars = fullText.length;

        incrementCharUsage('gemini', 'gemma-3-27b-it', inputChars + outputChars);

        if (fullText.trim()) {
            groqConversationHistory.push({
                role: 'assistant',
                content: fullText.trim(),
            });

            if (groqConversationHistory.length > 40) {
                groqConversationHistory = groqConversationHistory.slice(-40);
            }

            saveConversationTurn(transcription, fullText);
        }

        console.log('Gemma response completed');
        isProcessingResponse = false;
        sendToRenderer('update-status', 'Listening...');
    } catch (error) {
        console.error('Error calling Gemma API:', error);
        isProcessingResponse = false;
        sendToRenderer('update-status', 'Gemma error: ' + error.message);
    }
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

    // Get enabled tools first to determine Google Search status
    const enabledTools = await getEnabledTools();
    const googleSearchEnabled = enabledTools.some(tool => tool.googleSearch);

    const systemPrompt = getSystemPrompt(profile, customPrompt, googleSearchEnabled);
    currentSystemPrompt = systemPrompt; // Store for Groq

    // Initialize new conversation session only on first connect
    if (!isReconnect) {
        initializeNewSession(profile, customPrompt);
    }

    try {
        const session = await client.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: function () {
                    sendToRenderer('update-status', 'Live session connected');
                    // Reset state for new session
                    responseProcessedForCurrentTurn = false;
                    lastProcessedTranscription = '';
                    pendingTranscription = '';
                    pendingTranscriptionTimestamp = 0;
                    isProcessingResponse = false;
                    if (pauseTimer) {
                        clearTimeout(pauseTimer);
                        pauseTimer = null;
                    }
                },
                onmessage: function (message) {
                    const summary = summarizeLiveServerMessage(message);
                    if (summary) {
                        console.log('[Gemini]', summary);
                    }

                    // Handle input transcription (what was spoken)
                    let newInputText = '';
                    if (message.serverContent?.inputTranscription?.results) {
                        currentTranscription += formatSpeakerResults(message.serverContent.inputTranscription.results);
                        newInputText = formatSpeakerResults(message.serverContent.inputTranscription.results);
                    } else if (message.serverContent?.inputTranscription?.text) {
                        const text = message.serverContent.inputTranscription.text;
                        if (text.trim() !== '') {
                            currentTranscription += text;
                            newInputText = text;
                        }
                    }

                    // FAST MODE: Wait for complete question before processing
                    // A question is complete when:
                    // 1. Ends with "?" OR
                    // 2. Has complete sentence (ends with .!) OR
                    // 3. No new speech for 2 seconds (pause detection)
                    // 4. turnComplete fires
                    const inputText = message.serverContent?.inputTranscription?.text;

                    if (inputText && inputText.trim().length > 0) {
                        // Check if this is a continuation of previous incomplete question
                        const isContinuation = isQuestionContinuation(inputText, pendingTranscription);

                        // DEBUG: Log full question state (only first few chars to reduce spam)
                        console.log('[Fast Mode Debug]', {
                            input: inputText.substring(0, 20),
                            isContinuation,
                            processing: isProcessingResponse,
                        });

                        if (isContinuation) {
                            // Update pending transcription with new content
                            pendingTranscription = inputText;
                            pendingTranscriptionTimestamp = Date.now();
                            console.log('[Fast Mode] Continuing question:', inputText.substring(0, 30) + '...');

                            // If we have enough content now (25+ chars), process it
                            if (inputText.trim().length >= 25) {
                                console.log('[Fast Mode] Question now complete:', inputText.substring(0, 50) + '...');
                                console.log('[Fast Mode Debug] Calling Groq/Gemma', { hasGroqKey: hasGroqKey() });
                                sendToRenderer('update-status', 'Processing...');

                                if (hasGroqKey()) {
                                    sendToGroq(inputText.trim(), false);
                                } else {
                                    sendToGemma(inputText.trim());
                                }

                                lastProcessedTranscription = inputText;
                                pendingTranscription = '';
                                pendingTranscriptionTimestamp = 0;
                                if (pauseTimer) {
                                    clearTimeout(pauseTimer);
                                    pauseTimer = null;
                                }
                            } else {
                                // Reset the pause timer - wait for more speech
                                if (pauseTimer) {
                                    clearTimeout(pauseTimer);
                                }
                                sendToRenderer('update-status', 'Listening... (collecting)');
                                sendToRenderer('partial-question', pendingTranscription);

                                // Wait 2 seconds of silence to process incomplete question
                                pauseTimer = setTimeout(() => {
                                    const timeSinceLastUpdate = Date.now() - pendingTranscriptionTimestamp;

                                    // Use whichever has content: pendingTranscription OR currentTranscription
                                    const questionToProcess =
                                        pendingTranscription.trim().length > 10
                                            ? pendingTranscription
                                            : currentTranscription.trim().length > 10
                                              ? currentTranscription
                                              : '';

                                    if (questionToProcess.trim().length > 10 && timeSinceLastUpdate >= 1800) {
                                        console.log('[Fast Mode] Processing after pause:', questionToProcess.substring(0, 50) + '...');
                                        sendToRenderer('update-status', 'Processing...');

                                        if (hasGroqKey()) {
                                            sendToGroq(questionToProcess.trim(), false);
                                        } else {
                                            sendToGemma(questionToProcess.trim());
                                        }

                                        lastProcessedTranscription = questionToProcess;
                                        pendingTranscription = '';
                                        pendingTranscriptionTimestamp = 0;
                                        currentTranscription = '';
                                        pauseTimer = null;
                                    }
                                }, 2000);
                            }
                        } else {
                            // New question (not continuation) - check if complete
                            const isPunctuationComplete = isQuestionComplete(inputText);
                            const isLongEnough = inputText.trim().length >= 25;

                            if (isPunctuationComplete || isLongEnough) {
                                console.log('[Fast Mode] Complete question detected:', inputText.substring(0, 50) + '...');
                                sendToRenderer('update-status', 'Processing...');

                                if (hasGroqKey()) {
                                    sendToGroq(inputText.trim(), false);
                                } else {
                                    sendToGemma(inputText.trim());
                                }

                                lastProcessedTranscription = inputText;
                                pendingTranscription = '';
                                pendingTranscriptionTimestamp = 0;
                            } else {
                                // Start new incomplete question
                                pendingTranscription = inputText;
                                pendingTranscriptionTimestamp = Date.now();
                                console.log('[Fast Mode] New question started:', inputText.substring(0, 30) + '...');
                                sendToRenderer('update-status', 'Listening... (collecting)');

                                // Wait 2 seconds of silence to process
                                if (pauseTimer) clearTimeout(pauseTimer);
                                pauseTimer = setTimeout(() => {
                                    const timeSinceLastUpdate = Date.now() - pendingTranscriptionTimestamp;

                                    // Use whichever has content: pendingTranscription OR currentTranscription
                                    const questionToProcess =
                                        pendingTranscription.trim().length > 10
                                            ? pendingTranscription
                                            : currentTranscription.trim().length > 10
                                              ? currentTranscription
                                              : '';

                                    if (questionToProcess.trim().length > 10 && timeSinceLastUpdate >= 1800) {
                                        console.log('[Fast Mode] Processing after pause:', questionToProcess.substring(0, 50) + '...');
                                        sendToRenderer('update-status', 'Processing...');

                                        if (hasGroqKey()) {
                                            sendToGroq(questionToProcess.trim(), false);
                                        } else {
                                            sendToGemma(questionToProcess.trim());
                                        }

                                        lastProcessedTranscription = questionToProcess;
                                        pendingTranscription = '';
                                        pendingTranscriptionTimestamp = 0;
                                        currentTranscription = '';
                                        pauseTimer = null;
                                    }
                                }, 2000);
                            }
                        }
                    }

                    // Show Gemini's response as backup when Groq fails or is unavailable
                    if (message.serverContent?.outputTranscription?.text) {
                        const liveText = message.serverContent.outputTranscription.text.trim();
                        if (liveText.length > 10) {
                            // Only show if we haven't already shown a response
                            // This serves as backup when Groq is rate limited
                        }
                    }

                    // Legacy: generationComplete handler (now rarely triggered due to fast mode)
                    if (message.serverContent?.generationComplete) {
                        console.log('[Gemini] Generation complete');
                    }

                    // When turn is complete, check if there's a pending question to process
                    if (message.serverContent?.turnComplete) {
                        console.log('[Fast Mode Debug] turnComplete fired', {
                            pendingTranscription: pendingTranscription ? pendingTranscription.substring(0, 30) : '(empty)',
                            pendingLen: pendingTranscription.trim().length,
                            currentTranscription: currentTranscription ? currentTranscription.substring(0, 30) : '(empty)',
                            currentLen: currentTranscription.trim().length,
                            isProcessingResponse,
                        });
                        console.log('[Fast Mode] Turn complete, ready for next question');

                        // Use pendingTranscription OR currentTranscription (whichever has content)
                        const questionToProcess =
                            pendingTranscription.trim().length > 10
                                ? pendingTranscription
                                : currentTranscription.trim().length > 10
                                  ? currentTranscription
                                  : '';

                        // If there's a question that wasn't processed, process it now
                        if (questionToProcess.trim().length > 10 && !isProcessingResponse) {
                            console.log('[Fast Mode] Processing pending question on turnComplete:', questionToProcess.substring(0, 50) + '...');
                            sendToRenderer('update-status', 'Processing...');

                            if (hasGroqKey()) {
                                sendToGroq(questionToProcess.trim(), false);
                            } else {
                                sendToGemma(questionToProcess.trim());
                            }

                            lastProcessedTranscription = questionToProcess;
                            pendingTranscription = '';
                            pendingTranscriptionTimestamp = 0;
                            currentTranscription = '';
                        } else {
                            // Normal reset - no question to process
                            isProcessingResponse = false;
                            currentTranscription = '';
                            lastProcessedTranscription = '';
                            pendingTranscription = '';
                            pendingTranscriptionTimestamp = 0;
                        }

                        if (pauseTimer) {
                            clearTimeout(pauseTimer);
                            pauseTimer = null;
                        }
                        sendToRenderer('update-status', 'Listening...');
                    }
                },
                onerror: function (e) {
                    console.log('Session error:', e.message);
                    sendToRenderer('update-status', 'Error: ' + e.message);
                },
                onclose: function (e) {
                    console.log('Session closed:', describeCloseReason(e));

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
                responseModalities: [Modality.AUDIO],
                proactivity: { proactiveAudio: true },
                outputAudioTranscription: {},
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
    // Don't reset groqConversationHistory to preserve context across reconnects

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

    const spawnOptions = {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
            ...process.env,
        },
    };

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

            if (currentProviderMode === 'cloud') {
                sendCloudAudio(monoChunk);
            } else if (currentProviderMode === 'local') {
                getLocalAi().processLocalAudio(monoChunk);
            } else {
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

async function sendImageToGeminiHttp(base64Data, prompt) {
    // Get available model based on rate limits
    const model = getAvailableModel();

    const apiKey = getApiKey();
    if (!apiKey) {
        return { success: false, error: 'No API key configured' };
    }

    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });

        const contents = [
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data,
                },
            },
            { text: prompt },
        ];

        console.log(`Sending image to ${model} (streaming)...`);
        const response = await ai.models.generateContentStream({
            model: model,
            contents: contents,
        });

        // Increment count after successful call
        incrementLimitCount(model);

        // Stream the response
        let fullText = '';
        let isFirst = true;
        for await (const chunk of response) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                // Send to renderer - new response for first chunk, update for subsequent
                sendToRenderer(isFirst ? 'new-response' : 'update-response', fullText);
                isFirst = false;
            }
        }

        console.log(`Image response completed from ${model}`);

        // Save screen analysis to history
        saveScreenAnalysis(prompt, fullText, model);

        return { success: true, text: fullText, model: model };
    } catch (error) {
        console.error('Error sending image to Gemini HTTP:', error);
        return { success: false, error: error.message };
    }
}

function setupGeminiIpcHandlers(geminiSessionRef) {
    // Store the geminiSessionRef globally for reconnection access
    global.geminiSessionRef = geminiSessionRef;

    ipcMain.handle('initialize-cloud', async (event, token, profile, userContext) => {
        try {
            currentProviderMode = 'cloud';
            initializeNewSession(profile);
            setOnTurnComplete((transcription, response) => {
                saveConversationTurn(transcription, response);
            });
            sendToRenderer('session-initializing', true);
            await connectCloud(token, profile, userContext);
            sendToRenderer('session-initializing', false);
            return true;
        } catch (err) {
            console.error('[Cloud] Init error:', err);
            currentProviderMode = 'byok';
            sendToRenderer('session-initializing', false);
            return false;
        }
    });

    ipcMain.handle('initialize-gemini', async (event, apiKey, customPrompt, profile = 'interview', language = 'en-US') => {
        currentProviderMode = 'byok';
        const session = await initializeGeminiSession(apiKey, customPrompt, profile, language);
        if (session) {
            geminiSessionRef.current = session;
            return true;
        }
        return false;
    });

    ipcMain.handle('initialize-local', async (event, ollamaHost, ollamaModel, whisperModel, profile, customPrompt) => {
        currentProviderMode = 'local';
        const success = await getLocalAi().initializeLocalSession(ollamaHost, ollamaModel, whisperModel, profile, customPrompt);
        if (!success) {
            currentProviderMode = 'byok';
        }
        return success;
    });

    ipcMain.handle('send-audio-content', async (event, { data, mimeType }) => {
        if (currentProviderMode === 'cloud') {
            try {
                const pcmBuffer = Buffer.from(data, 'base64');
                sendCloudAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending cloud audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (currentProviderMode === 'local') {
            try {
                const pcmBuffer = Buffer.from(data, 'base64');
                getLocalAi().processLocalAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending local audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };
        try {
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
        if (currentProviderMode === 'cloud') {
            try {
                const pcmBuffer = Buffer.from(data, 'base64');
                sendCloudAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending cloud mic audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (currentProviderMode === 'local') {
            try {
                const pcmBuffer = Buffer.from(data, 'base64');
                getLocalAi().processLocalAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending local mic audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };
        try {
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

            if (currentProviderMode === 'cloud') {
                const sent = sendCloudImage(data);
                if (!sent) {
                    return { success: false, error: 'Cloud connection not active' };
                }
                return { success: true, model: 'cloud' };
            }

            if (currentProviderMode === 'local') {
                const result = await getLocalAi().sendLocalImage(data, prompt);
                return result;
            }

            // Use HTTP API instead of realtime session
            const result = await sendImageToGeminiHttp(data, prompt);
            return result;
        } catch (error) {
            console.error('Error sending image:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('send-text-message', async (event, text) => {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return { success: false, error: 'Invalid text message' };
        }

        if (currentProviderMode === 'cloud') {
            try {
                console.log('Sending text to cloud:', text);
                sendCloudText(text.trim());
                return { success: true };
            } catch (error) {
                console.error('Error sending cloud text:', error);
                return { success: false, error: error.message };
            }
        }

        if (currentProviderMode === 'local') {
            try {
                console.log('Sending text to local Ollama:', text);
                return await getLocalAi().sendLocalText(text.trim());
            } catch (error) {
                console.error('Error sending local text:', error);
                return { success: false, error: error.message };
            }
        }

        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };

        try {
            console.log('Sending text message:', text);

            if (hasGroqKey()) {
                sendToGroq(text.trim());
            } else {
                sendToGemma(text.trim());
            }

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

            if (currentProviderMode === 'cloud') {
                closeCloud();
                currentProviderMode = 'byok';
                return { success: true };
            }

            if (currentProviderMode === 'local') {
                getLocalAi().closeLocalSession();
                currentProviderMode = 'byok';
                return { success: true };
            }

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

    // Cache management IPC handlers
    ipcMain.handle('get-cache-stats', async event => {
        try {
            return { success: true, data: getCacheStats() };
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('clear-cache', async event => {
        try {
            clearCache();
            return { success: true };
        } catch (error) {
            console.error('Error clearing cache:', error);
            return { success: false, error: error.message };
        }
    });

    // Fast Response Mode - directly process text without Gemini Live
    ipcMain.handle('fast-response', async (event, text) => {
        try {
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return { success: false, error: 'Invalid text' };
            }

            sendToRenderer('update-status', 'Processing...');

            // Check cache first
            const cachedResponse = getCachedResponse(text);
            if (cachedResponse) {
                const { response } = cachedResponse;
                sendToRenderer('new-response', response);
                sendToRenderer('update-status', 'Listening... (cached)');
                return { success: true, cached: true };
            }

            // Send to Groq directly
            if (hasGroqKey()) {
                await sendToGroq(text.trim(), false);
                return { success: true, cached: false };
            } else {
                return { success: false, error: 'No Groq API key configured' };
            }
        } catch (error) {
            console.error('Error in fast response:', error);
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
    killExistingSystemAudioDump,
    startMacOSAudioCapture,
    convertStereoToMono,
    stopMacOSAudioCapture,
    sendAudioToGemini,
    sendImageToGeminiHttp,
    setupGeminiIpcHandlers,
    formatSpeakerResults,
};
