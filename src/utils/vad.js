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
    silenceThreshold: 500, // ms of silence before committing (increased for stability)
    maxRecordingTime: 15000, // 15 seconds max recording
    minRecordingTime: 500, // Minimum 500ms recording before committing
    preSpeechPadFrames: 2, // Frames to include before speech detection
    postSpeechPadFrames: 2, // Frames to include after speech ends
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
        
        // VAD configuration - these parameters may need tuning
        this.vadConfig = {
            sampleRate: VAD_CONFIG.sampleRate,
            frameSize: VAD_CONFIG.frameSize,
            positiveSpeechThreshold: 0.6, // Threshold for detecting speech
            negativeSpeechThreshold: 0.45, // Threshold for detecting non-speech
            minSpeechFrames: 3, // Minimum consecutive speech frames to start recording
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
            // Convert Float32Array to the format expected by VAD
            const vadInput = this.prepareVADInput(audioFrame);
            const voice = await this.vad.process(vadInput);

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

    // Cleanup method
    destroy() {
        this.setState(VADState.IDLE);
        this.audioBuffer = [];
        this.preSpeechBuffer = [];
        if (this.vad) {
            // Clean up VAD resources if needed
            this.vad = null;
        }
    }
}

module.exports = {
    VADProcessor,
    VADState,
    VAD_CONFIG
};
