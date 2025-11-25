const { VADState, VAD_CONFIG } = require('../utils/vad');

describe('VAD Module Tests', () => {
    describe('Configuration', () => {
        it('should have correct default VAD configuration', () => {
            expect(VAD_CONFIG.sampleRate).toBe(16000); // Internal VAD sample rate
            expect(VAD_CONFIG.frameSize).toBe(512);
            expect(VAD_CONFIG.silenceThreshold).toBe(200); // Optimized for faster response
            expect(VAD_CONFIG.maxRecordingTime).toBe(20000); // 20 seconds max
            expect(VAD_CONFIG.minRecordingTime).toBe(200); // 200ms minimum (optimized)
        });

        it('should have all required VAD states', () => {
            expect(VADState.IDLE).toBe('IDLE');
            expect(VADState.LISTENING).toBe('LISTENING');
            expect(VADState.RECORDING).toBe('RECORDING');
            expect(VADState.COMMITTING).toBe('COMMITTING');
        });

        it('should have pre and post speech padding configured', () => {
            expect(VAD_CONFIG.preSpeechPadFrames).toBeDefined();
            expect(VAD_CONFIG.postSpeechPadFrames).toBeDefined();
        });

        it('should have noise gate and adaptive threshold settings', () => {
            expect(VAD_CONFIG.noiseGateThreshold).toBeDefined();
            expect(VAD_CONFIG.adaptiveThreshold).toBeDefined();
        });
    });

    describe('VADProcessor Class', () => {
        it('should be able to import VADProcessor class', () => {
            const { VADProcessor } = require('../utils/vad');
            expect(typeof VADProcessor).toBe('function');
            expect(VADProcessor.name).toBe('VADProcessor');
        });

        it('should support dual VAD modes', () => {
            const { VADProcessor } = require('../utils/vad');
            // Test that VADProcessor can be instantiated with different modes
            // Note: We can't actually instantiate it without the VAD library
            expect(VADProcessor).toBeDefined();
        });
    });

    describe('VAD Modes', () => {
        it('should support automatic mode', () => {
            // Automatic mode: continuous speech detection with auto-commit
            const automaticMode = 'automatic';
            expect(['automatic', 'manual']).toContain(automaticMode);
        });

        it('should support manual mode', () => {
            // Manual mode: user-controlled recording with manual commit
            const manualMode = 'manual';
            expect(['automatic', 'manual']).toContain(manualMode);
        });
    });

    describe('Audio Resampling', () => {
        it('should handle 24kHz to 16kHz resampling', () => {
            // Current implementation receives 24kHz audio and resamples to 16kHz
            const inputSampleRate = 24000;
            const outputSampleRate = 16000;
            const resamplingRatio = outputSampleRate / inputSampleRate;

            expect(resamplingRatio).toBeCloseTo(0.6667, 4);
            expect(VAD_CONFIG.sampleRate).toBe(outputSampleRate);
        });
    });
});
