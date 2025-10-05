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

    async generateReply(userMessage, options = {}) {
        const trimmed = typeof userMessage === 'string' ? userMessage.trim() : '';

        if (!trimmed) {
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
