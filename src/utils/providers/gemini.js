/**
 * Gemini HTTP Provider
 * Implements text and vision capabilities using Gemini's REST API
 * Note: Live audio WebSocket remains in gemini.js
 */

const { GoogleGenAI } = require('@google/genai');

class GeminiProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.client = null;
    }

    initialize() {
        if (!this.apiKey) {
            throw new Error('Gemini API key not configured');
        }
        if (!this.client) {
            this.client = new GoogleGenAI({ apiKey: this.apiKey });
        }
        return this;
    }

    supportsLiveAudio() { return true; }
    supportsVision() { return true; }
    supportsStreaming() { return true; }

    /**
     * Generate text response (streaming)
     * @param {string} model - Model name
     * @param {string} prompt - User prompt
     * @param {string} systemPrompt - System prompt
     * @param {object} options - Options including conversationContext
     */
    async generateText(model, prompt, systemPrompt, options = {}) {
        this.initialize();

        // Build contents array with conversation context
        let contents;
        if (options.conversationContext && Array.isArray(options.conversationContext) && options.conversationContext.length > 0) {
            // Convert conversation context to Gemini format
            contents = options.conversationContext.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));
            // Add current prompt
            contents.push({ role: 'user', parts: [{ text: prompt }] });
            console.log('[Gemini] Added', options.conversationContext.length / 2, 'previous turns for context');
        } else {
            contents = prompt;
        }

        const response = await this.client.models.generateContentStream({
            model: model,
            contents: contents,
            config: {
                ...(systemPrompt && { systemInstruction: systemPrompt }),
                temperature: options.temperature || 0.7,
                maxOutputTokens: options.maxTokens || 2048
            }
        });

        return response;
    }

    /**
     * Analyze image with vision model (streaming)
     * Note: For vision, we include conversation context as text history, NOT previous images
     */
    async analyzeImage(model, base64Image, prompt, systemPrompt, options = {}) {
        this.initialize();

        let contents;
        if (options.conversationContext && Array.isArray(options.conversationContext) && options.conversationContext.length > 0) {
            // Build history from conversation context (text only)
            contents = options.conversationContext.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));
            // Add current image + prompt
            contents.push({
                role: 'user',
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: prompt }
                ]
            });
            console.log('[Gemini] Added', options.conversationContext.length / 2, 'previous turns for image context');
        } else {
            // No context - original behavior
            contents = [
                {
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: base64Image
                    }
                },
                prompt
            ];
        }

        const response = await this.client.models.generateContentStream({
            model: model,
            contents: contents,
            config: {
                ...(systemPrompt && { systemInstruction: systemPrompt }),
                temperature: options.temperature || 0.7,
                maxOutputTokens: options.maxTokens || 2048
            }
        });

        return response;
    }

    /**
     * Process audio input (multimodal - for Audio→Text mode)
     */
    async processAudio(model, base64Audio, prompt, options = {}) {
        this.initialize();

        const contents = [
            {
                inlineData: {
                    mimeType: options.mimeType || 'audio/wav',
                    data: base64Audio
                }
            },
            prompt
        ];

        const response = await this.client.models.generateContentStream({
            model: model,
            contents: contents,
            config: {
                temperature: options.temperature || 0.7,
                maxOutputTokens: options.maxTokens || 2048
            }
        });

        // Return standardized format matching Groq provider
        // Note: generateContentStream returns the async iterable directly
        return {
            stream: response,
            transcription: '' // Gemini stream doesn't give full text immediately, handled by stream consumer
        };
    }

    /**
     * Validate API key by making a test request
     */
    async validateApiKey() {
        try {
            this.initialize();
            await this.client.models.generateContent({
                model: 'gemini-2.5-flash-lite',
                contents: 'Hi',
                config: { maxOutputTokens: 1 }
            });
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
}

module.exports = GeminiProvider;
