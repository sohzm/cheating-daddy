// src/utils/vad.js
// Voice Activity Detection (VAD) processor for Cheating Daddy
// Based on the rholive reference implementation's audio segmentation approach

const VAD = require('@ricky0123/vad-node');

const VADState = {
    IDLE: 'IDLE', // Not listening for speech
    PAUSED: 'PAUSED', // Manually paused by user (mic off)
    LISTENING: 'LISTENING', // Listening for the start of speech
    RECORDING: 'RECORDING', // Actively recording speech
    COMMITTING: 'COMMITTING' // Speech has ended, preparing to send audio
};

const VAD_CONFIG = {
    sampleRate: 16000,
    frameSize: 512, // 32ms at 16kHz
    silenceThreshold: 200, // ms of silence before committing (OPTIMIZED for faster response)
    maxRecordingTime: 20000, // 20 seconds max recording (increased for longer questions)
    minRecordingTime: 200, // Minimum 200ms recording (OPTIMIZED to catch quick questions faster)
    preSpeechPadFrames: 2, // Frames to include before speech detection
    postSpeechPadFrames: 1, // Frames to include after speech ends (REDUCED for speed)
    adaptiveThreshold: true, // Enable adaptive threshold adjustment
    noiseGateThreshold: 0.015, // Minimum amplitude to consider as potential speech (LOWERED for better detection)
};

class VADProcessor {
    constructor(onCommit, onStateChange = null, mode = 'automatic') {
        this.onCommit = onCommit; // Callback to send audio segment
        this.onStateChange = onStateChange; // Optional callback for state changes
        this.mode = mode; // 'automatic' or 'manual'
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

        // VAD configuration - OPTIMIZED for faster response (3-5 seconds target)
        this.vadConfig = {
            sampleRate: VAD_CONFIG.sampleRate,
            frameSize: VAD_CONFIG.frameSize,
            positiveSpeechThreshold: 0.50, // LOWERED for faster speech detection
            negativeSpeechThreshold: 0.35, // LOWERED to detect silence faster
            minSpeechFrames: 1, // REDUCED to 1 for immediate response
            maxSpeechFrames: 10, // Not used in our implementation
            preSpeechPadFrames: VAD_CONFIG.preSpeechPadFrames,
        };

        this.initializeVAD();
    }

    async initializeVAD() {
        try {
            console.log(`🔧 [VAD INIT] Initializing VAD with mode: "${this.mode}"`);
            // The @ricky0123/vad-node library uses a static async new() method
            this.vad = await VAD.NonRealTimeVAD.new(this.vadConfig);
            console.log('✅ [VAD INIT] VAD instance created successfully');

            // Initialize based on mode
            if (this.mode === 'automatic') {
                // Automatic mode: Start listening immediately
                this.setState(VADState.LISTENING);
                console.log('✅ [VAD INIT] AUTOMATIC mode - state set to LISTENING');
            } else {
                // Manual mode: Start paused (mic off by default)
                this.setState(VADState.PAUSED);
                console.log('✅ [VAD INIT] MANUAL mode - state set to PAUSED (mic OFF)');
            }
        } catch (error) {
            console.error('❌ [VAD INIT] Failed to initialize VAD:', error);
            console.error('Config provided:', this.vadConfig);
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
        // Debug: Log first few frames to track state
        if (this.frameCount < 5) {
            console.log(`🎵 [PROCESS AUDIO] Frame ${this.frameCount}: mode="${this.mode}", state="${this.state}"`);
        }

        // Don't process audio if VAD is not initialized, idle, or manually paused
        if (!this.vad || this.state === VADState.IDLE || this.state === VADState.PAUSED) {
            if (this.frameCount < 5 && this.state === VADState.PAUSED) {
                console.log(`⏸️ [PROCESS AUDIO] Skipping frame - VAD is PAUSED (manual mode mic OFF)`);
            }
            return;
        }

        this.frameCount++;

        try {
            // MANUAL MODE: Skip all VAD processing, just buffer raw audio when recording
            if (this.mode === 'manual' && this.state === VADState.RECORDING) {
                if (this.audioBuffer.length === 0) {
                    console.log(`🎙️ [MANUAL MODE] Started buffering audio (no speech detection)`);
                }
                this.audioBuffer.push(audioFrame);

                // Only check for max recording time to prevent buffer overflow
                const recordingDuration = Date.now() - this.recordingStartTime;
                if (recordingDuration > VAD_CONFIG.maxRecordingTime) {
                    console.log(`[MANUAL MODE] Max recording time reached (${recordingDuration}ms), auto-committing to prevent overflow.`);
                    this.commit();
                }
                return; // Skip all VAD speech detection
            }

            // AUTOMATIC MODE: Stream audio continuously without VAD processing
            // Since NonRealTimeVAD doesn't support streaming, we send audio directly in chunks
            if (this.mode === 'automatic' && this.state === VADState.LISTENING) {
                // Send audio chunk directly via the onCommit callback
                // This ensures continuous streaming like before VAD was added
                if (this.onCommit) {
                    this.onCommit(audioFrame, {
                        duration: 0,
                        frameCount: 1,
                        timestamp: Date.now(),
                        streaming: true // Flag to indicate streaming mode
                    });
                }
                return;
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
        // This method is only called for AUTOMATIC mode (manual mode is handled in processAudio)
        // Always add audio to the recording buffer
        this.audioBuffer.push(audioFrame);

        // Auto-commit on silence detection
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
                    console.log(`[AUTOMATIC MODE] Silence threshold reached (${silenceDuration}ms), committing audio.`);
                    this.commit();
                } else {
                    console.log(`[AUTOMATIC MODE] Recording too short (${recordingDuration}ms), discarding and returning to listening.`);
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
            console.log(`[AUTOMATIC MODE] Max recording time reached (${recordingDuration}ms), committing audio.`);
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

        // Return to appropriate state based on mode
        if (this.mode === 'manual') {
            // Manual mode: return to PAUSED (mic OFF) after commit
            this.setState(VADState.PAUSED);
            console.log('[MANUAL MODE] Audio committed - mic is now OFF');
        } else {
            // Automatic mode: return to LISTENING to detect next speech
            this.setState(VADState.LISTENING);
        }
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

    // Manual control methods for microphone toggle
    pause() {
        if (this.state !== VADState.IDLE) {
            // Save the current state before pausing
            const previousState = this.state;

            // If we were recording, commit the current audio
            if (this.state === VADState.RECORDING && this.audioBuffer.length > 0) {
                console.log('Committing ongoing recording before pause');
                this.commit();
            }

            // Clear buffers
            this.audioBuffer = [];
            this.preSpeechBuffer = [];
            this.silenceStartTime = 0;
            this.consecutiveSilenceFrames = 0;
            this.consecutiveSpeechFrames = 0;

            this.setState(VADState.PAUSED);
            console.log(`VAD paused (was ${previousState}) - microphone is OFF`);
        }
    }

    resume() {
        if (this.state === VADState.PAUSED && this.vad) {
            if (this.mode === 'manual') {
                // Manual mode: go directly to RECORDING state and start buffering
                this.setState(VADState.RECORDING);
                this.recordingStartTime = Date.now();
                this.audioBuffer = [];
                console.log('[MANUAL MODE] Mic turned ON - now recording (will commit when mic turned OFF)');
            } else {
                // Automatic mode: go to LISTENING and wait for speech detection
                this.setState(VADState.LISTENING);
                console.log('[AUTOMATIC MODE] VAD resumed - listening for speech');
            }
        }
    }

    // Check if VAD is currently active (not paused or idle)
    isActive() {
        return this.state !== VADState.IDLE && this.state !== VADState.PAUSED;
    }

    // Check if VAD is paused
    isPaused() {
        return this.state === VADState.PAUSED;
    }

    // Set VAD mode (automatic or manual)
    setMode(newMode) {
        if (this.mode === newMode) {
            return; // No change needed
        }

        console.log(`Switching VAD mode from ${this.mode} to ${newMode}`);
        this.mode = newMode;

        // Adjust state based on new mode
        if (newMode === 'automatic') {
            // Automatic mode: resume listening if currently paused
            if (this.state === VADState.PAUSED) {
                this.setState(VADState.LISTENING);
                console.log('Automatic mode enabled - VAD now listening');
            }
        } else if (newMode === 'manual') {
            // Manual mode: pause if currently listening
            if (this.state === VADState.LISTENING) {
                this.setState(VADState.PAUSED);
                console.log('Manual mode enabled - mic is OFF (click button to start)');
            }
        }
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
