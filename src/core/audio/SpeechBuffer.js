/**
 * SpeechBuffer - Robust speech buffering for Audio-to-Text mode
 *
 * Solves the problem of fragmenting long questions into multiple chunks.
 * Uses a state machine approach with proper end-of-utterance detection.
 *
 * Key features:
 * - Waits for actual end of speech (longer silence), not arbitrary timeouts
 * - Maintains speech state: IDLE -> SPEAKING -> TRAILING_SILENCE -> READY
 * - Configurable thresholds for different use cases
 * - Memory-safe with maximum buffer limits
 */

// Speech detection states
const SpeechState = {
    IDLE: 'idle', // No speech detected, buffer empty
    SPEAKING: 'speaking', // Active speech, accumulating audio
    TRAILING_SILENCE: 'trailing_silence', // Speech ended, waiting to confirm
    READY: 'ready', // Buffer ready for processing
};

// Default configuration (optimized for interview questions)
const DEFAULT_CONFIG = {
    // VAD thresholds
    vadThreshold: 800, // RMS threshold for speech detection
    vadHysteresis: 600, // Lower threshold to prevent flutter (speech continues below main threshold briefly)

    // Timing thresholds (milliseconds)
    endOfUtteranceSilence: 1500, // Silence duration to consider speech "done"
    minSpeechDuration: 500, // Minimum speech duration before we start buffering (filter noise bursts)
    maxBufferDuration: 60000, // Maximum buffer duration (60 seconds) - force processing

    // Buffer size thresholds (bytes at 24kHz, 16-bit mono = 48000 bytes/sec)
    minBufferSize: 24000, // 0.5 seconds minimum (filter tiny fragments)
    maxBufferSize: 24000 * 60 * 2, // 60 seconds max (2.88 MB) - prevent memory issues

    // Sample rate info (for calculations)
    sampleRate: 24000,
    bytesPerSample: 2,
};

class SpeechBuffer {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.reset();
    }

    reset() {
        this.buffer = Buffer.alloc(0);
        this.state = SpeechState.IDLE;
        this.speechStartTime = null;
        this.lastSpeechTime = null;
        this.silenceStartTime = null;

        // Statistics for debugging
        this.stats = {
            chunksReceived: 0,
            speechChunks: 0,
            silenceChunks: 0,
            peakRms: 0,
            avgRms: 0,
            rmsSum: 0,
        };
    }

    /**
     * Calculate RMS (Root Mean Square) energy of audio chunk
     * Higher RMS = louder audio = likely speech
     */
    calculateRms(chunk) {
        if (chunk.length < 2) return 0;

        let sum = 0;
        const sampleCount = chunk.length / 2;

        for (let i = 0; i < chunk.length; i += 2) {
            const sample = chunk.readInt16LE(i);
            sum += sample * sample;
        }

        return Math.sqrt(sum / sampleCount);
    }

    /**
     * Detect if chunk contains speech using hysteresis
     * Uses different thresholds for starting vs continuing speech
     */
    isSpeech(rms) {
        if (this.state === SpeechState.SPEAKING || this.state === SpeechState.TRAILING_SILENCE) {
            // Already speaking - use lower threshold (hysteresis prevents flutter)
            return rms > this.config.vadHysteresis;
        }
        // Not speaking - use higher threshold to start
        return rms > this.config.vadThreshold;
    }

    /**
     * Add audio chunk to buffer and update state
     * Returns: { ready: boolean, reason?: string }
     */
    addChunk(chunk) {
        const now = Date.now();
        const rms = this.calculateRms(chunk);
        const hasSpeech = this.isSpeech(rms);

        // Update stats
        this.stats.chunksReceived++;
        this.stats.rmsSum += rms;
        this.stats.avgRms = this.stats.rmsSum / this.stats.chunksReceived;
        if (rms > this.stats.peakRms) this.stats.peakRms = rms;

        if (hasSpeech) {
            this.stats.speechChunks++;
        } else {
            this.stats.silenceChunks++;
        }

        // State machine
        switch (this.state) {
            case SpeechState.IDLE:
                if (hasSpeech) {
                    // Speech started
                    this.state = SpeechState.SPEAKING;
                    this.speechStartTime = now;
                    this.lastSpeechTime = now;
                    this.buffer = Buffer.concat([this.buffer, chunk]);
                }
                // Ignore silence when idle
                break;

            case SpeechState.SPEAKING:
                this.buffer = Buffer.concat([this.buffer, chunk]);

                if (hasSpeech) {
                    this.lastSpeechTime = now;
                } else {
                    // Speech paused - enter trailing silence
                    this.state = SpeechState.TRAILING_SILENCE;
                    this.silenceStartTime = now;
                }
                break;

            case SpeechState.TRAILING_SILENCE:
                // Always buffer during trailing silence (captures natural pauses)
                this.buffer = Buffer.concat([this.buffer, chunk]);

                if (hasSpeech) {
                    // Speech resumed - back to speaking
                    this.state = SpeechState.SPEAKING;
                    this.lastSpeechTime = now;
                    this.silenceStartTime = null;
                } else {
                    // Check if silence is long enough to end utterance
                    const silenceDuration = now - this.silenceStartTime;
                    if (silenceDuration >= this.config.endOfUtteranceSilence) {
                        this.state = SpeechState.READY;
                        return { ready: true, reason: 'end_of_utterance' };
                    }
                }
                break;

            case SpeechState.READY:
                // Buffer is ready, shouldn't receive more chunks until reset
                // But handle gracefully
                if (hasSpeech) {
                    this.buffer = Buffer.concat([this.buffer, chunk]);
                }
                break;
        }

        // Safety checks - force ready if buffer too large or too old
        if (this.buffer.length >= this.config.maxBufferSize) {
            this.state = SpeechState.READY;
            return { ready: true, reason: 'max_buffer_size' };
        }

        if (this.speechStartTime && now - this.speechStartTime >= this.config.maxBufferDuration) {
            this.state = SpeechState.READY;
            return { ready: true, reason: 'max_duration' };
        }

        return { ready: false };
    }

    /**
     * Check if buffer is ready for processing
     */
    isReady() {
        return this.state === SpeechState.READY;
    }

    /**
     * Check if buffer has minimum viable content
     */
    hasMinimumContent() {
        return this.buffer.length >= this.config.minBufferSize;
    }

    /**
     * Get the buffered audio data as base64
     */
    getAudioData() {
        return this.buffer.toString('base64');
    }

    /**
     * Get buffer duration in seconds
     */
    getDuration() {
        return this.buffer.length / (this.config.sampleRate * this.config.bytesPerSample);
    }

    /**
     * Get buffer size in bytes
     */
    getSize() {
        return this.buffer.length;
    }

    /**
     * Get current state
     */
    getState() {
        return this.state;
    }

    /**
     * Get statistics for debugging
     */
    getStats() {
        return {
            ...this.stats,
            state: this.state,
            bufferSize: this.buffer.length,
            bufferDuration: this.getDuration(),
            speechDuration: this.speechStartTime ? (Date.now() - this.speechStartTime) / 1000 : 0,
        };
    }

    /**
     * Force the buffer to ready state (for manual trigger mode)
     */
    forceReady() {
        if (this.buffer.length > 0) {
            this.state = SpeechState.READY;
            return true;
        }
        return false;
    }

    /**
     * Consume the buffer (get data and reset)
     * Returns null if buffer doesn't meet minimum requirements
     */
    consume() {
        if (!this.hasMinimumContent()) {
            const stats = this.getStats();
            this.reset();
            return { data: null, stats, reason: 'below_minimum' };
        }

        const data = this.getAudioData();
        const duration = this.getDuration();
        const stats = this.getStats();

        this.reset();

        return { data, duration, stats };
    }
}

// Export for use
module.exports = {
    SpeechBuffer,
    SpeechState,
    DEFAULT_CONFIG,
};
