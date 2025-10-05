'use strict';

require('dotenv').config();

const Cerebras = require('@cerebras/cerebras_cloud_sdk');
const { findWorkflowMatchFromText } = require('./composio');

const DEFAULT_MODEL = 'llama3.1-8b';

const DEFAULT_SYSTEM_PROMPT =
    process.env.CEREBRAS_SYSTEM_PROMPT ||
    'You are a concise AI interview coach. Respond with actionable feedback based on the latest transcript provided.';

class CerebrasService {
    constructor() {
        this.client = null;
        this.warnedMissingKey = false;
    }

    /**
     * Determine if a query requires Google Search based on content analysis
     * @param {string} userMessage - The user's message/query
     * @returns {boolean} - Whether Google Search should be used
     */
    shouldUseGoogleSearch(userMessage) {
        if (!userMessage || typeof userMessage !== 'string') {
            return false;
        }

        const message = userMessage.toLowerCase().trim();
        
        // Keywords that indicate need for current/recent information
        const currentInfoKeywords = [
            'latest', 'recent', 'current', 'today', 'yesterday', 'this week', 'this month',
            'now', 'happening', 'breaking', 'news', 'update', 'score', 'result',
            'winner', 'loser', 'game', 'match', 'election', 'weather', 'stock',
            'price', 'rate', 'exchange', 'cryptocurrency', 'bitcoin', 'ethereum'
        ];

        // Time-sensitive indicators
        const timeSensitiveKeywords = [
            '2024', '2025', 'this year', 'last year', 'yesterday', 'today',
            'recently', 'just happened', 'live', 'streaming', 'ongoing'
        ];

        // Question words that often need current data (more specific)
        const questionWords = [
            'who won', 'what happened', 'when did', 'how much', 'how many',
            'what\'s the latest', 'whats the latest', 'what\'s the current', 'whats the current',
            'what\'s happening', 'whats happening', 'what\'s new', 'whats new'
        ];

        // Check for current information needs
        const needsCurrentInfo = currentInfoKeywords.some(keyword => 
            message.includes(keyword)
        );

        // Check for time-sensitive content
        const isTimeSensitive = timeSensitiveKeywords.some(keyword => 
            message.includes(keyword)
        );

        // Check for question patterns that need current data
        const isCurrentQuestion = questionWords.some(pattern => 
            message.includes(pattern)
        );

        // Check for specific domains that need current information
        const currentInfoDomains = [
            'sports', 'football', 'basketball', 'soccer', 'baseball', 'tennis',
            'politics', 'election', 'president', 'government', 'congress',
            'finance', 'market', 'trading', 'crypto', 'bitcoin', 'stocks',
            'technology', 'ai', 'artificial intelligence', 'tech news',
            'entertainment', 'movie', 'celebrity', 'music', 'awards'
        ];

        const isCurrentDomain = currentInfoDomains.some(domain => 
            message.includes(domain)
        );

        // Decision logic: Use Google Search if any of these conditions are met
        const shouldSearch = needsCurrentInfo || isTimeSensitive || isCurrentQuestion || isCurrentDomain;

        console.log(`[Cerebras] Google Search decision for "${userMessage.substring(0, 50)}...": ${shouldSearch ? 'YES' : 'NO'}`);
        console.log(`[Cerebras] Reasons: currentInfo=${needsCurrentInfo}, timeSensitive=${isTimeSensitive}, currentQuestion=${isCurrentQuestion}, currentDomain=${isCurrentDomain}`);

        return shouldSearch;
    }

    async ensureClient() {
        if (this.client) {
            return true;
        }

        const apiKey = process.env.CEREBRAS_API_KEY || process.env.CEREBRAS_API;

        if (!apiKey) {
            if (!this.warnedMissingKey) {
                console.warn('[Cerebras] Missing API key; responses will be skipped.');

                this.warnedMissingKey = true;
            }

            return false;
        }

        try {
            this.client = new Cerebras({ apiKey });

            console.log('[Cerebras] Client initialized');

            return true;
        } catch (error) {
            console.error('[Cerebras] Failed to initialize client:', error.message || error);

            this.client = null;

            return false;
        }
    }

    /**
     * Detect if text contains voice assistant patterns
     * @param {string} text - The text to analyze
     * @returns {boolean} - Whether the text appears to be from a voice assistant
     */
    isVoiceAssistantText(text) {
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
            console.log(`[Cerebras Voice Filter] Detected voice assistant text: "${text}"`);
        }

        return isVoiceAssistant;
    }

    async generateReply(userMessage, options = {}) {
        const trimmed = typeof userMessage === 'string' ? userMessage.trim() : '';

        if (!trimmed) {
            return null;
        }

        // Check if this is voice assistant content and skip processing
        if (this.isVoiceAssistantText(trimmed)) {
            console.log(`[Cerebras Voice Filter] Blocking voice assistant message: "${trimmed}"`);
            return null;
        }

        const ready = await this.ensureClient();

        if (!ready) {
            return null;
        }

        const {
            model = DEFAULT_MODEL,

            temperature = options.temperature ?? 0.6,

            maxTokens = options.maxTokens ?? 256,

            systemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT,

            history = [],
        } = options;

        const workflowSuggestion = findWorkflowMatchFromText(trimmed);
        const shouldUseGoogleSearch = this.shouldUseGoogleSearch(trimmed);

        const messages = [];

        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }

        if (Array.isArray(history) && history.length > 0) {
            for (const message of history) {
                if (message && message.role && message.content) {
                    messages.push({ role: message.role, content: message.content });
                }
            }
        }

        messages.push({ role: 'user', content: trimmed });

        try {
            console.log(`[Cerebras] Generating response for: "${trimmed.substring(0, 50)}..."`);

            const completion = await this.client.chat.completions.create({
                model,

                messages,

                temperature,

                max_tokens: maxTokens,
            });

            const choice = completion?.choices?.[0];

            const message = choice?.message;

            if (!message) {
                console.warn('[Cerebras] No message returned in completion response');

                return null;
            }

            if (typeof message.content === 'string') {
                const response = message.content.trim();

                console.log(`[Cerebras] Response generated: "${response.substring(0, 100)}..."`);

                return {
                    text: response,
                    workflow: workflowSuggestion,
                    shouldUseGoogleSearch: shouldUseGoogleSearch,
                };
            }

            if (Array.isArray(message.content)) {
                const combined = message.content

                    .map(part => (typeof part === 'string' ? part : part?.text || ''))

                    .join('')

                    .trim();

                if (!combined) {
                    return null;
                }

                return {
                    text: combined,
                    workflow: workflowSuggestion,
                    shouldUseGoogleSearch: shouldUseGoogleSearch,
                };
            }

            return null;
        } catch (error) {
            console.error('[Cerebras] Chat completion error:', error.message || error);

            return null;
        }
    }
}

const cerebrasService = new CerebrasService();

module.exports = {
    cerebrasService,
};
