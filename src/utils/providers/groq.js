/**
 * Groq AI Provider
 * Implements text and vision capabilities using Groq's API
 */

const Groq = require('groq-sdk');
const rateLimitManager = require('../rateLimitManager');

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
     */
    async generateText(model, prompt, systemPrompt, options = {}) {
        this.initialize();

        const stream = await this.client.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            stream: true,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 2048
        });

        return stream;
    }

    /**
     * Analyze image with vision model (streaming)
     */
    async analyzeImage(model, base64Image, prompt, systemPrompt, options = {}) {
        this.initialize();

        const stream = await this.client.chat.completions.create({
            model: model,
            messages: [
                {
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
                }
            ],
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
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const { promisify } = require('util');
        const writeFile = promisify(fs.writeFile);
        const unlink = promisify(fs.unlink);

        // 1. Create temp file for audio
        const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.wav`);

        // Add WAV header to raw PCM data to ensure it's a valid media file
        // Input: 24kHz, Mono, 16-bit PCM (from gemini.js audio capture)
        const pcmData = Buffer.from(base64Audio, 'base64');
        const wavHeader = Buffer.alloc(44);

        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const dataSize = pcmData.length;
        const totalSize = 36 + dataSize;
        const durationSeconds = dataSize / byteRate;

        // RIFF chunk descriptor
        wavHeader.write('RIFF', 0);
        wavHeader.writeUInt32LE(totalSize, 4);
        wavHeader.write('WAVE', 8);

        // fmt sub-chunk
        wavHeader.write('fmt ', 12);
        wavHeader.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
        wavHeader.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
        wavHeader.writeUInt16LE(numChannels, 22);
        wavHeader.writeUInt32LE(sampleRate, 24);
        wavHeader.writeUInt32LE(byteRate, 28);
        wavHeader.writeUInt16LE(blockAlign, 32);
        wavHeader.writeUInt16LE(bitsPerSample, 34);

        // data sub-chunk
        wavHeader.write('data', 36);
        wavHeader.writeUInt32LE(dataSize, 40);

        const wavBuffer = Buffer.concat([wavHeader, pcmData]);

        try {
            // 1. Prepare buffer (skip disk write) - faster
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
                    [Symbol.asyncIterator]: async function* () {
                        // Yield empty or special token logic?
                        // Better to yield nothing or a status message that UI can ignore
                        yield { choices: [{ delta: { content: "" } }] };
                    }
                };
            }

            // 3. Process with LLM
            const finalPrompt = prompt
                ? `${prompt}\n\nTranscribed Audio:\n"${transcribedText}"`
                : `Transcribed Audio:\n"${transcribedText}"\n\nPlease analyze or respond to this audio transcription.`;

            const stream = await this.client.chat.completions.create({
                model: model,
                messages: [
                    { role: 'user', content: finalPrompt }
                ],
                stream: true,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 2048
            });

            stream.transcription = transcribedText;
            return stream;

        } catch (error) {
            if (fs.existsSync(tempFilePath)) {
                await unlink(tempFilePath).catch(() => { });
            }
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
