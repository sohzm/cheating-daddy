/**
 * Groq AI Provider
 * Implements text and vision capabilities using Groq's API
 */

const Groq = require('groq-sdk');
const rateLimitManager = require('../rateLimitManager');
const { createWavHeader } = require('../../audioUtils');
const fs = require('fs');
const path = require('path');
const os = require('os');

class GroqProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.client = null;
    }

    initialize() {
        if (!this.apiKey) {
            throw new Error('Groq API key not configured');
        }
        if (!this.client) {
            this.client = new Groq({ apiKey: this.apiKey });
        }
        return this;
    }

    supportsLiveAudio() { return false; }
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

        // Build messages array
        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // Add conversation context for follow-up support
        if (options.conversationContext && Array.isArray(options.conversationContext)) {
            messages.push(...options.conversationContext);
            console.log('[Groq] Added', options.conversationContext.length / 2, 'previous turns for context');
        }

        // Add current user prompt
        messages.push({ role: 'user', content: prompt });

        const stream = await this.client.chat.completions.create({
            model: model,
            messages: messages,
            stream: true,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 2048
        });

        return stream;
    }

    /**
     * Analyze image with vision model (streaming)
     * Note: For vision, we include conversation context as text, NOT the images
     * Images from previous turns are not re-sent (too expensive, model handles text context)
     */
    async analyzeImage(model, base64Image, prompt, systemPrompt, options = {}) {
        this.initialize();

        // Build messages array with context
        const messages = [];

        // Add conversation context as text-only messages (no previous images)
        if (options.conversationContext && Array.isArray(options.conversationContext)) {
            // System prompt first
            messages.push({ role: 'system', content: systemPrompt });
            // Then conversation history
            messages.push(...options.conversationContext);
            console.log('[Groq] Added', options.conversationContext.length / 2, 'previous turns for image context');
            // Then current image + prompt
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/jpeg;base64,${base64Image}`
                        }
                    }
                ]
            });
        } else {
            // No context - original behavior
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: systemPrompt + '\n\n' + prompt },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/jpeg;base64,${base64Image}`
                        }
                    }
                ]
            });
        }

        const stream = await this.client.chat.completions.create({
            model: model,
            messages: messages,
            stream: true,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 2048
        });

        return stream;
    }

    /**
     * Process audio input (multimodal - for Audio→Text mode)
     */
    /**
     * Process audio input (Audio→Text mode)
     * 1. Transcribe audio using Whisper
     * 2. Process transcription with the selected LLM
     */
    /**
     * Process audio input (Audio→Text mode)
     * Groq requires transcription first as Llama models don't accept direct audio yet.
     */
    async processAudio(model, base64Audio, prompt, options = {}) {
        this.initialize();


        // Helper to add WAV header
        // Input: 24kHz, Mono, 16-bit PCM (from gemini.js audio capture)
        const pcmData = Buffer.from(base64Audio, 'base64');

        // Use shared helper for WAV header
        const wavHeader = createWavHeader(pcmData.length, 24000, 1, 16);
        const wavBuffer = Buffer.concat([wavHeader, pcmData]);

        // Calculate duration for rate limiting (24kHz, 1 channel, 16-bit = 2 bytes/sample)
        const durationSeconds = pcmData.length / (24000 * 2);

        try {
            // 1. Prepare buffer (in-memory)
            const file = await Groq.toFile(wavBuffer, `audio_${Date.now()}.wav`, { type: 'audio/wav' });

            // 2. Transcribe using Groq's Whisper model (turbo)
            const transcription = await this.client.audio.transcriptions.create({
                file: file,
                model: 'whisper-large-v3-turbo',
                response_format: 'json',
                temperature: 0.0
            });

            // Track usage (audio seconds)
            rateLimitManager.incrementUsage('groq', 'whisper-large-v3-turbo', 0, durationSeconds);


            const transcribedText = transcription.text;
            console.log('[Groq] Transcription:', transcribedText);

            // Robust filtering for common Whisper hallucinations and non-speech
            const invalidPhrases = [
                'Subtitle', 'Subtitles', 'Ambiance', '[Music]', '(Music)',
                'Music', '[Silence]', '(Silence)', 'Silence',
                'Copyright', 'Generated by', 'MBC'
            ];

            const isInvalid = invalidPhrases.some(phrase =>
                transcribedText.toLowerCase().includes(phrase.toLowerCase()) ||
                transcribedText.trim().length <= 2
            );

            if (!transcribedText || isInvalid) {
                console.log('[Groq] Ignored invalid transcription:', transcribedText);
                return {
                    stream: (async function* () {
                        // Yield empty to satisfy stream interface
                        yield { choices: [{ delta: { content: "" } }] };
                    })(),
                    transcription: ''
                };
            }

            // 3. Build messages array with conversation context for follow-up questions
            const messages = [];

            // Add system prompt
            if (prompt) {
                messages.push({ role: 'system', content: prompt });
            }

            // Add conversation context (last 2 Q&A pairs) for follow-up support
            if (options.conversationContext && Array.isArray(options.conversationContext)) {
                messages.push(...options.conversationContext);
                console.log('[Groq] Added', options.conversationContext.length / 2, 'previous turns for context');
            }

            // Add current transcription as user message
            messages.push({ role: 'user', content: transcribedText });

            const stream = await this.client.chat.completions.create({
                model: model,
                messages: messages,
                stream: true,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 2048
            });

            return {
                stream,
                transcription: transcribedText
            };

        } catch (error) {

            throw error;
        }
    }

    /**
     * Validate API key by making a test request
     */
    async validateApiKey() {
        try {
            this.initialize();
            // Make a minimal request to validate
            await this.client.chat.completions.create({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 1
            });
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
}

module.exports = GroqProvider;
