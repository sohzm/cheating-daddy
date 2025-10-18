// src/utils/vad.js
// Voice Activity Detection (VAD) processor for Cheating Daddy
// Based on the rholive reference implementation's audio segmentation approach

const VAD = require('@ricky0123/vad-node');

const VADState = {
    IDLE: 'IDLE', // Not listening for speech
    LISTENING: 'LISTENING', // Listening for the start of speech
    RECORDING: 'RECORDING', // Actively recording speech
    COMMITTING: 'COMMITTING' // Speech has ended, preparing to send audio
};

const VAD_CONFIG = {
    sampleRate: 16000,
    frameSize: 512, // 32ms at 16kHz
    silenceThreshold: 600, // ms of silence before committing (increased for better accuracy)
    maxRecordingTime: 20000, // 20 seconds max recording (increased for longer questions)
    minRecordingTime: 400, // Minimum 400ms recording (reduced to catch quick questions)
    preSpeechPadFrames: 3, // Frames to include before speech detection (increased)
    postSpeechPadFrames: 3, // Frames to include after speech ends (increased)
    adaptiveThreshold: true, // Enable adaptive threshold adjustment
    noiseGateThreshold: 0.02, // Minimum amplitude to consider as potential speech
};

class VADProcessor {
    constructor(onCommit, onStateChange = null) {
        this.onCommit = onCommit; // Callback to send audio segment
        this.onStateChange = onStateChange; // Optional callback for state changes
        this.state = VADState.IDLE;
        this.audioBuffer = [];
        this.preSpeechBuffer = []; // Buffer for pre-speech padding
        this.silenceStartTime = 0;
        this.recordingStartTime = 0;
        this.frameCount = 0;
        this.consecutiveSilenceFrames = 0;
        this.consecutiveSpeechFrames = 0;
        this.inputSampleRate = 24000; // User's audio sample rate

        // Adaptive threshold tracking
        this.noiseLevel = 0;
        this.noiseLevelSamples = 0;
        this.speechConfidenceHistory = [];

        // VAD configuration - these parameters may need tuning
        this.vadConfig = {
            sampleRate: VAD_CONFIG.sampleRate,
            frameSize: VAD_CONFIG.frameSize,
            positiveSpeechThreshold: 0.55, // Slightly lowered for better detection
            negativeSpeechThreshold: 0.40, // Threshold for detecting non-speech
            minSpeechFrames: 2, // Reduced to 2 for faster response
            maxSpeechFrames: 10, // Not used in our implementation
            preSpeechPadFrames: VAD_CONFIG.preSpeechPadFrames,
        };

        this.initializeVAD();
    }

    async initializeVAD() {
        try {
            this.vad = new VAD.default(this.vadConfig);
            this.setState(VADState.LISTENING);
            console.log('VAD initialized successfully');
        } catch (error) {
            console.error('Failed to initialize VAD:', error);
            this.setState(VADState.IDLE);
        }
    }

    setState(newState) {
        if (this.state !== newState) {
            const oldState = this.state;
            this.state = newState;
            console.log(`VAD state transition: ${oldState} -> ${newState}`);
            
            if (this.onStateChange) {
                this.onStateChange(newState, oldState);
            }
        }
    }

    async processAudio(audioFrame) {
        if (!this.vad || this.state === VADState.IDLE) {
            return;
        }

        this.frameCount++;

        try {
            // IMPROVEMENT 2: Apply noise gate - ignore very quiet audio (background noise)
            if (VAD_CONFIG.noiseGateThreshold > 0 && !this.hasSignificantAudio(audioFrame)) {
                // Still buffer for pre-speech padding, but don't process with VAD
                this.bufferPreSpeechAudio(audioFrame);
                return;
            }

            // IMPROVEMENT 1: Resample audio from 24kHz to 16kHz for VAD
            const resampledFrame = this.resampleAudio(audioFrame);

            // Convert Float32Array to the format expected by VAD
            const vadInput = this.prepareVADInput(resampledFrame);
            const voice = await this.vad.process(vadInput);

            // IMPROVEMENT 3: Track speech confidence for adaptive thresholds
            if (VAD_CONFIG.adaptiveThreshold) {
                this.updateAdaptiveThreshold(voice);
            }

            switch (this.state) {
                case VADState.LISTENING:
                    this.handleListeningState(audioFrame, voice);
                    break;

                case VADState.RECORDING:
                    this.handleRecordingState(audioFrame, voice);
                    break;

                case VADState.COMMITTING:
                    // During commit, buffer new audio but don't process it
                    this.bufferPreSpeechAudio(audioFrame);
                    break;
            }
        } catch (error) {
            console.error('Error processing audio with VAD:', error);
        }
    }

    prepareVADInput(audioFrame) {
        // Convert Float32Array to Int16Array if needed
        if (audioFrame instanceof Float32Array) {
            const int16Array = new Int16Array(audioFrame.length);
            for (let i = 0; i < audioFrame.length; i++) {
                // Convert from [-1, 1] to [-32768, 32767]
                int16Array[i] = Math.max(-32768, Math.min(32767, audioFrame[i] * 32767));
            }
            return int16Array;
        }
        return audioFrame;
    }

    // IMPROVEMENT 1: Audio Resampling (24kHz → 16kHz)
    resampleAudio(audioFrame) {
        // If sample rates match, no resampling needed
        if (this.inputSampleRate === VAD_CONFIG.sampleRate) {
            return audioFrame;
        }

        // Calculate resampling ratio
        const ratio = VAD_CONFIG.sampleRate / this.inputSampleRate; // 16000/24000 = 0.6667
        const outputLength = Math.floor(audioFrame.length * ratio);
        const resampled = new Float32Array(outputLength);

        // Linear interpolation for smooth resampling
        for (let i = 0; i < outputLength; i++) {
            const srcIndex = i / ratio;
            const srcIndexFloor = Math.floor(srcIndex);
            const srcIndexCeil = Math.min(srcIndexFloor + 1, audioFrame.length - 1);
            const fraction = srcIndex - srcIndexFloor;

            // Interpolate between two samples
            resampled[i] = audioFrame[srcIndexFloor] * (1 - fraction) +
                          audioFrame[srcIndexCeil] * fraction;
        }

        return resampled;
    }

    // IMPROVEMENT 2: Noise Gate (filters background noise)
    hasSignificantAudio(audioFrame) {
        // Calculate RMS (Root Mean Square) - measures audio volume/energy
        let sum = 0;
        for (let i = 0; i < audioFrame.length; i++) {
            sum += audioFrame[i] * audioFrame[i];
        }
        const rms = Math.sqrt(sum / audioFrame.length);

        // Update background noise level estimate (only when listening)
        if (this.state === VADState.LISTENING) {
            // Exponential moving average - slowly adapts to ambient noise
            this.noiseLevel = this.noiseLevel * 0.95 + rms * 0.05;
            this.noiseLevelSamples++;
        }

        // Return true if audio is above noise gate threshold
        return rms > VAD_CONFIG.noiseGateThreshold;
    }

    // IMPROVEMENT 3: Adaptive Threshold Adjustment
    updateAdaptiveThreshold(voiceDetected) {
        // Track speech detection history (last 100 frames)
        this.speechConfidenceHistory.push(voiceDetected ? 1 : 0);
        if (this.speechConfidenceHistory.length > 100) {
            this.speechConfidenceHistory.shift();
        }

        // Auto-adjust threshold based on detection rate (only when listening)
        if (this.state === VADState.LISTENING && this.speechConfidenceHistory.length >= 50) {
            const speechRate = this.speechConfidenceHistory.reduce((a, b) => a + b, 0) / this.speechConfidenceHistory.length;

            // If detecting speech too often (>80%) = too sensitive, raise threshold
            if (speechRate > 0.8 && this.vadConfig.positiveSpeechThreshold < 0.75) {
                this.vadConfig.positiveSpeechThreshold += 0.01;
                console.log(`VAD: Threshold increased to ${this.vadConfig.positiveSpeechThreshold.toFixed(2)} (too sensitive)`);
            }
            // If rarely detecting speech (<5%) = not sensitive enough, lower threshold
            else if (speechRate < 0.05 && this.vadConfig.positiveSpeechThreshold > 0.45) {
                this.vadConfig.positiveSpeechThreshold -= 0.01;
                console.log(`VAD: Threshold decreased to ${this.vadConfig.positiveSpeechThreshold.toFixed(2)} (not sensitive enough)`);
            }
        }
    }

    handleListeningState(audioFrame, voice) {
        // Always buffer audio for pre-speech padding
        this.bufferPreSpeechAudio(audioFrame);

        if (voice) {
            this.consecutiveSpeechFrames++;
            this.consecutiveSilenceFrames = 0;

            // Start recording if we have enough consecutive speech frames
            if (this.consecutiveSpeechFrames >= this.vadConfig.minSpeechFrames) {
                console.log(`Speech detected (${this.consecutiveSpeechFrames} consecutive frames), starting recording.`);
                this.startRecording();
            }
        } else {
            this.consecutiveSpeechFrames = 0;
            this.consecutiveSilenceFrames++;
        }
    }

    handleRecordingState(audioFrame, voice) {
        // Always add audio to the recording buffer
        this.audioBuffer.push(audioFrame);

        if (!voice) {
            // Count silence frames
            this.consecutiveSilenceFrames++;
            this.consecutiveSpeechFrames = 0;

            // Start silence timer on first silent frame
            if (this.silenceStartTime === 0) {
                this.silenceStartTime = Date.now();
            }

            // Check if silence threshold is reached
            const silenceDuration = Date.now() - this.silenceStartTime;
            if (silenceDuration > VAD_CONFIG.silenceThreshold) {
                const recordingDuration = Date.now() - this.recordingStartTime;
                
                // Only commit if we have a minimum recording duration
                if (recordingDuration >= VAD_CONFIG.minRecordingTime) {
                    console.log(`Silence threshold reached (${silenceDuration}ms), committing audio.`);
                    this.commit();
                } else {
                    console.log(`Recording too short (${recordingDuration}ms), discarding and returning to listening.`);
                    this.discardAndReturnToListening();
                }
            }
        } else {
            // Reset silence tracking when speech is detected again
            this.consecutiveSilenceFrames = 0;
            this.consecutiveSpeechFrames++;
            this.silenceStartTime = 0;
        }

        // Check maximum recording time
        const recordingDuration = Date.now() - this.recordingStartTime;
        if (recordingDuration > VAD_CONFIG.maxRecordingTime) {
            console.log(`Max recording time reached (${recordingDuration}ms), committing audio.`);
            this.commit();
        }
    }

    bufferPreSpeechAudio(audioFrame) {
        this.preSpeechBuffer.push(audioFrame);
        
        // Keep only the required number of pre-speech frames
        if (this.preSpeechBuffer.length > VAD_CONFIG.preSpeechPadFrames) {
            this.preSpeechBuffer.shift();
        }
    }

    startRecording() {
        this.setState(VADState.RECORDING);
        this.recordingStartTime = Date.now();
        
        // Start with pre-speech padding
        this.audioBuffer = [...this.preSpeechBuffer];
        this.preSpeechBuffer = [];
        
        // Reset counters
        this.silenceStartTime = 0;
        this.consecutiveSilenceFrames = 0;
    }

    commit() {
        this.setState(VADState.COMMITTING);
        
        // Add post-speech padding if available
        const postPadding = Math.min(VAD_CONFIG.postSpeechPadFrames, this.preSpeechBuffer.length);
        for (let i = 0; i < postPadding; i++) {
            this.audioBuffer.push(this.preSpeechBuffer[i]);
        }

        // Convert audio buffer to a single buffer
        const completeAudioSegment = this.combineAudioFrames(this.audioBuffer);
        
        const recordingDuration = Date.now() - this.recordingStartTime;
        console.log(`Committing audio segment: ${this.audioBuffer.length} frames, ${recordingDuration}ms duration`);

        // Clear buffers
        this.audioBuffer = [];
        this.silenceStartTime = 0;
        this.consecutiveSilenceFrames = 0;
        this.consecutiveSpeechFrames = 0;

        // Send the audio segment via callback
        if (this.onCommit) {
            this.onCommit(completeAudioSegment, {
                duration: recordingDuration,
                frameCount: this.audioBuffer.length,
                timestamp: Date.now()
            });
        }

        // Return to listening state
        this.setState(VADState.LISTENING);
    }

    discardAndReturnToListening() {
        console.log('Discarding short recording and returning to listening state');
        
        // Clear recording buffers
        this.audioBuffer = [];
        this.silenceStartTime = 0;
        this.consecutiveSilenceFrames = 0;
        this.consecutiveSpeechFrames = 0;
        
        // Return to listening
        this.setState(VADState.LISTENING);
    }

    combineAudioFrames(frames) {
        if (frames.length === 0) {
            return new Float32Array(0);
        }

        // Calculate total length
        let totalLength = 0;
        for (const frame of frames) {
            totalLength += frame.length;
        }

        // Combine all frames into a single buffer
        const combined = new Float32Array(totalLength);
        let offset = 0;
        
        for (const frame of frames) {
            combined.set(frame, offset);
            offset += frame.length;
        }

        return combined;
    }

    // Convert Float32Array to 16-bit PCM buffer for transmission
    convertToPCM16(audioData) {
        const buffer = new ArrayBuffer(audioData.length * 2);
        const view = new DataView(buffer);
        
        for (let i = 0; i < audioData.length; i++) {
            // Convert from [-1, 1] to [-32768, 32767]
            const sample = Math.max(-1, Math.min(1, audioData[i]));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(i * 2, intSample, true); // true for little-endian
        }
        
        return Buffer.from(buffer);
    }

    // Public method to get current state
    getState() {
        return this.state;
    }

    // Public method to get configuration
    getConfig() {
        return { ...VAD_CONFIG };
    }

    // Public method to update configuration
    updateConfig(newConfig) {
        Object.assign(VAD_CONFIG, newConfig);
        console.log('VAD configuration updated:', VAD_CONFIG);
    }

    // Public method to get VAD statistics (useful for debugging)
    getStats() {
        const speechRate = this.speechConfidenceHistory.length > 0
            ? this.speechConfidenceHistory.reduce((a, b) => a + b, 0) / this.speechConfidenceHistory.length
            : 0;

        return {
            state: this.state,
            frameCount: this.frameCount,
            noiseLevel: this.noiseLevel.toFixed(4),
            currentThreshold: this.vadConfig.positiveSpeechThreshold.toFixed(2),
            speechDetectionRate: (speechRate * 100).toFixed(1) + '%',
            isAdaptive: VAD_CONFIG.adaptiveThreshold,
            bufferSize: this.audioBuffer.length,
            preSpeechBufferSize: this.preSpeechBuffer.length
        };
    }

    // Cleanup method
    destroy() {
        this.setState(VADState.IDLE);
        this.audioBuffer = [];
        this.preSpeechBuffer = [];
        this.speechConfidenceHistory = [];
        if (this.vad) {
            // Clean up VAD resources if needed
            this.vad = null;
        }
        console.log('VAD processor destroyed');
    }
}

module.exports = {
    VADProcessor,
    VADState,
    VAD_CONFIG
};
