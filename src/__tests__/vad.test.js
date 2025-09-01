const { VADState, VAD_CONFIG } = require('../utils/vad');

describe('VAD Module Tests', () => {
    describe('Configuration', () => {
        it('should have correct default VAD configuration', () => {
            expect(VAD_CONFIG.sampleRate).toBe(16000);
            expect(VAD_CONFIG.frameSize).toBe(512);
            expect(VAD_CONFIG.silenceThreshold).toBe(500);
            expect(VAD_CONFIG.maxRecordingTime).toBe(15000);
            expect(VAD_CONFIG.minRecordingTime).toBe(500);
        });

        it('should have all required VAD states', () => {
            expect(VADState.IDLE).toBe('IDLE');
            expect(VADState.LISTENING).toBe('LISTENING');
            expect(VADState.RECORDING).toBe('RECORDING');
            expect(VADState.COMMITTING).toBe('COMMITTING');
        });
    });

    describe('VADProcessor Static Methods', () => {
        // We'll test the VADProcessor class without actually initializing it
        // to avoid issues with the VAD library in the test environment
        
        it('should be able to import VADProcessor class', () => {
            const { VADProcessor } = require('../utils/vad');
            expect(typeof VADProcessor).toBe('function');
            expect(VADProcessor.name).toBe('VADProcessor');
        });
    });
});
