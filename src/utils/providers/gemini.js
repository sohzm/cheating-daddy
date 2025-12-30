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
     */
    async generateText(model, prompt, systemPrompt, options = {}) {
        this.initialize();

        const response = await this.client.models.generateContentStream({
            model: model,
            contents: [{ text: prompt }],
            systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
            generationConfig: {
                temperature: options.temperature || 0.7,
                maxOutputTokens: options.maxTokens || 2048
            }
        });

        return response;
    }

    /**
     * Analyze image with vision model (streaming)
     */
    async analyzeImage(model, base64Image, prompt, systemPrompt, options = {}) {
        this.initialize();

        const contents = [
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image
                }
            },
            { text: prompt }
        ];

        const response = await this.client.models.generateContentStream({
            model: model,
            contents: contents,
            systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
            generationConfig: {
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
            { text: prompt }
        ];

        const response = await this.client.models.generateContentStream({
            model: model,
            contents: contents,
            generationConfig: {
                temperature: options.temperature || 0.7,
                maxOutputTokens: options.maxTokens || 2048
            }
        });

        return response;
    }

    /**
     * Validate API key by making a test request
     */
    async validateApiKey() {
        try {
            this.initialize();
            await this.client.models.generateContent({
                model: 'gemini-2.5-flash-lite',
                contents: [{ text: 'Hi' }],
                generationConfig: { maxOutputTokens: 1 }
            });
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
}

module.exports = GeminiProvider;
