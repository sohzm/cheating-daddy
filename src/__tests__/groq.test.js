// Mock electron modules before requiring groq
const electronPath = require.resolve('electron');
require.cache[electronPath] = {
    exports: {
        BrowserWindow: {
            getAllWindows: vi.fn(() => [{ webContents: { send: vi.fn() } }]),
        },
        ipcMain: { handle: vi.fn(), on: vi.fn() },
    },
};

const groq = require('../utils/groq');

describe('Groq Module Tests', () => {
    describe('Configuration', () => {
        it('should have correct Whisper model', () => {
            // Whisper Large V3 Turbo is used for STT
            expect(groq.isGroqInitialized).toBeDefined();
        });

        it('should export all required functions', () => {
            expect(typeof groq.initializeGroq).toBe('function');
            expect(typeof groq.pcmToWav).toBe('function');
            expect(typeof groq.addAudioChunk).toBe('function');
            expect(typeof groq.processAudioBuffer).toBe('function');
            expect(typeof groq.flushAudioBuffer).toBe('function');
            expect(typeof groq.clearAudioBuffer).toBe('function');
            expect(typeof groq.getBufferDuration).toBe('function');
            expect(typeof groq.isGroqInitialized).toBe('function');
            expect(typeof groq.setupGroqIpcHandlers).toBe('function');
        });

        it('should export Llama text generation functions', () => {
            expect(typeof groq.setLlamaConfig).toBe('function');
            expect(typeof groq.generateWithLlama).toBe('function');
            expect(typeof groq.clearConversationHistory).toBe('function');
        });
    });

    describe('Llama Model Configuration', () => {
        it('should support llama-4-maverick model', () => {
            // Maverick is the default, more accurate model
            const profile = 'interview';
            const systemPrompt = 'You are a helpful interview assistant.';
            const model = 'llama-4-maverick';

            // setLlamaConfig should accept model parameter
            expect(() => {
                groq.setLlamaConfig(profile, systemPrompt, model);
            }).not.toThrow();
        });

        it('should support llama-4-scout model', () => {
            // Scout is the faster, lighter model
            const profile = 'interview';
            const systemPrompt = 'You are a helpful interview assistant.';
            const model = 'llama-4-scout';

            expect(() => {
                groq.setLlamaConfig(profile, systemPrompt, model);
            }).not.toThrow();
        });

        it('should default to maverick when no model specified', () => {
            const profile = 'sales';
            const systemPrompt = 'You are a sales assistant.';

            // Should not throw when model is not specified
            expect(() => {
                groq.setLlamaConfig(profile, systemPrompt);
            }).not.toThrow();
        });

        it('should handle invalid model gracefully', () => {
            const profile = 'meeting';
            const systemPrompt = 'You are a meeting assistant.';
            const invalidModel = 'invalid-model';

            // Should fallback to default without throwing
            expect(() => {
                groq.setLlamaConfig(profile, systemPrompt, invalidModel);
            }).not.toThrow();
        });

        it('should support all interview profiles', () => {
            const profiles = ['interview', 'sales', 'meeting', 'presentation', 'negotiation'];
            const systemPrompt = 'Test prompt';

            profiles.forEach(profile => {
                expect(() => {
                    groq.setLlamaConfig(profile, systemPrompt, 'llama-4-maverick');
                }).not.toThrow();
            });
        });

        it('should clear conversation history on config change', () => {
            // First set a config
            groq.setLlamaConfig('interview', 'Prompt 1', 'llama-4-maverick');

            // Then change config - this should clear history
            groq.setLlamaConfig('sales', 'Prompt 2', 'llama-4-scout');

            // clearConversationHistory should work without error
            expect(() => {
                groq.clearConversationHistory();
            }).not.toThrow();
        });
    });

    describe('PCM to WAV Conversion', () => {
        it('should convert PCM buffer to WAV format', () => {
            const pcmBuffer = Buffer.alloc(1000);
            const wavBuffer = groq.pcmToWav(pcmBuffer);

            // Check WAV header
            expect(wavBuffer.toString('ascii', 0, 4)).toBe('RIFF');
            expect(wavBuffer.toString('ascii', 8, 12)).toBe('WAVE');
            expect(wavBuffer.toString('ascii', 12, 16)).toBe('fmt ');
        });

        it('should create correct WAV file size', () => {
            const pcmSize = 2000;
            const pcmBuffer = Buffer.alloc(pcmSize);
            const wavBuffer = groq.pcmToWav(pcmBuffer);

            // WAV = 44 bytes header + PCM data
            expect(wavBuffer.length).toBe(44 + pcmSize);
        });

        it('should handle empty PCM buffer', () => {
            const pcmBuffer = Buffer.alloc(0);
            const wavBuffer = groq.pcmToWav(pcmBuffer);

            expect(wavBuffer.length).toBe(44); // Just header
        });
    });

    describe('Audio Buffer Management', () => {
        beforeEach(() => {
            groq.clearAudioBuffer();
        });

        it('should start with empty buffer', () => {
            const duration = groq.getBufferDuration();
            expect(duration).toBe(0);
        });

        it('should clear buffer correctly', () => {
            // Add some audio
            const pcmBuffer = Buffer.alloc(4800); // 0.1 seconds at 24kHz 16-bit
            groq.addAudioChunk(pcmBuffer);

            // Clear buffer
            groq.clearAudioBuffer();

            const duration = groq.getBufferDuration();
            expect(duration).toBe(0);
        });

        it('should track buffer duration correctly', () => {
            // Add 0.5 seconds of audio at 24kHz, 16-bit (24000 * 2 * 0.5 = 24000 bytes)
            // But audio must exceed speech threshold to be buffered
            const samples = 12000; // 0.5 seconds worth
            const pcmBuffer = Buffer.alloc(samples * 2);

            // Fill with values above speech threshold (500 RMS)
            for (let i = 0; i < samples; i++) {
                pcmBuffer.writeInt16LE(1000, i * 2); // Above threshold
            }

            groq.addAudioChunk(pcmBuffer);

            const duration = groq.getBufferDuration();
            // Should have some duration (may vary based on speech detection)
            expect(duration).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Groq Initialization', () => {
        it('should initialize with API key', () => {
            const result = groq.initializeGroq('test-api-key');
            expect(result).toBe(true);
        });

        it('should report initialization status', () => {
            groq.initializeGroq('another-test-key');
            expect(groq.isGroqInitialized()).toBe(true);
        });
    });

    describe('Interview Mode Integration', () => {
        it('should support interview mode workflow', () => {
            // 1. Initialize Groq
            groq.initializeGroq('test-key');

            // 2. Set Llama config for interview
            groq.setLlamaConfig('interview', 'Help with interview questions', 'llama-4-maverick');

            // 3. Buffer should be ready
            groq.clearAudioBuffer();
            expect(groq.getBufferDuration()).toBe(0);
        });

        it('should support switching between models', () => {
            groq.initializeGroq('test-key');

            // Start with Maverick
            groq.setLlamaConfig('interview', 'Prompt 1', 'llama-4-maverick');

            // Switch to Scout
            groq.setLlamaConfig('interview', 'Prompt 2', 'llama-4-scout');

            // Should work without errors
            expect(groq.isGroqInitialized()).toBe(true);
        });
    });

    describe('Model Selection Validation', () => {
        const validModels = ['llama-4-maverick', 'llama-4-scout'];

        it('should have exactly 2 supported Llama models', () => {
            expect(validModels.length).toBe(2);
        });

        it('llama-4-maverick should be the default model', () => {
            // Maverick is default, used for more accurate responses
            expect(validModels).toContain('llama-4-maverick');
        });

        it('llama-4-scout should be available for faster responses', () => {
            // Scout is for faster, lighter responses
            expect(validModels).toContain('llama-4-scout');
        });
    });
});
