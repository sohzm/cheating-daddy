/**
 * Google Cloud Speech-to-Text Integration
 * 
 * CRITICAL: Since Live API is gated, we use Google Cloud Speech STT
 * This is a production-grade solution used by companies like Zoom, Meet
 * 
 * Architecture Benefits:
 * - Streaming recognition (100-300ms latency)
 * - 125+ languages supported
 * - Automatic punctuation
 * - Speaker diarization (future upgrade)
 * - 99.9% uptime SLA
 * 
 * Setup Instructions:
 * 1. npm install @google-cloud/speech --save
 * 2. Enable Speech-to-Text API in Google Cloud Console
 * 3. Use same API key as Gemini (if from same project)
 *    OR create separate Speech API key
 * 
 * Cost: Free tier includes 60 minutes/month
 * Paid: $0.006 per 15 seconds = ~$1.44 per hour
 */

const speech = require('@google-cloud/speech');

// STT Configuration (optimized for interviews)
const STREAMING_CONFIG = {
    encoding: 'LINEAR16',
    sampleRateHertz: 24000,
    languageCode: 'en-US',
    
    // Enhanced features
    enableAutomaticPunctuation: true, // Add periods, commas automatically
    enableWordTimeOffsets: false, // We don't need word timing
    model: 'latest_long', // Best for interviews (vs 'command_and_search')
    useEnhanced: true, // Use premium model for better accuracy
    
    // Streaming settings
    interimResults: true, // Get partial results for UI
    singleUtterance: false, // Allow continuous speech
    maxAlternatives: 1, // Only need top result
    
    // Performance optimization
    enableWordConfidence: false, // Faster without confidence scores
    profanityFilter: false, // No censorship in professional setting
};

// Question detection thresholds
const QUESTION_DETECTION = {
    minLength: 200, // 200ms minimum (optimized for speed)
    silenceThreshold: 600, // 600ms silence = question done
    maxDuration: 30000, // 30s max per question
    
    // Sentence boundary detection
    sentenceEnders: ['.', '?', '!'],
    doubleNewlineThreshold: 800, // 800ms silence = paragraph break
};

class GoogleSpeechSTT {
    constructor(onTranscriptComplete, onTranscriptPartial = null) {
        this.onTranscriptComplete = onTranscriptComplete;
        this.onTranscriptPartial = onTranscriptPartial;
        
        // Google Cloud Speech client
        this.client = null;
        this.recognizeStream = null;
        
        // State
        this.isStreaming = false;
        this.currentTranscript = '';
        this.finalTranscript = '';
        this.questionStartTime = 0;
        this.lastSpeechTime = 0;
        this.silenceTimer = null;
        
        // Language
        this.currentLanguage = 'en-US';
        
        console.log('✅ [GOOGLE STT] GoogleSpeechSTT initialized');
    }
    
    /**
     * Initialize Google Cloud Speech client
     */
    async initialize(apiKey, projectId = 'gemini-assistant') {
        try {
            console.log('🔧 [GOOGLE STT] Initializing Google Cloud Speech...');
            
            // Initialize Speech client with API key
            this.client = new speech.SpeechClient({
                apiKey: apiKey,
                projectId: projectId,
            });
            
            console.log('✅ [GOOGLE STT] Google Cloud Speech client ready');
            return true;
        } catch (error) {
            console.error('❌ [GOOGLE STT] Initialization failed:', error);
            throw new Error(`Google Cloud Speech init failed: ${error.message}`);
        }
    }
    
    /**
     * Start streaming recognition
     */
    async startStreaming(languageCode = 'en-US') {
        if (this.isStreaming) {
            console.warn('⚠️ [GOOGLE STT] Already streaming');
            return;
        }
        
        try {
            console.log('🎙️ [GOOGLE STT] Starting streaming recognition...');
            console.log(`    Language: ${languageCode}`);
            
            this.currentLanguage = languageCode;
            this.currentTranscript = '';
            this.finalTranscript = '';
            this.questionStartTime = Date.now();
            this.lastSpeechTime = Date.now();
            
            // Create streaming config
            const streamConfig = {
                ...STREAMING_CONFIG,
                languageCode: languageCode,
            };
            
            // Create recognize stream
            this.recognizeStream = this.client
                .streamingRecognize({
                    config: streamConfig,
                    interimResults: true,
                })
                .on('error', this.handleStreamError.bind(this))
                .on('data', this.handleStreamData.bind(this));
            
            this.isStreaming = true;
            console.log('✅ [GOOGLE STT] Streaming started');
        } catch (error) {
            console.error('❌ [GOOGLE STT] Failed to start streaming:', error);
            throw error;
        }
    }
    
    /**
     * Handle streaming data from Google Cloud Speech
     */
    handleStreamData(data) {
        try {
            if (!data.results || data.results.length === 0) {
                return;
            }
            
            const result = data.results[0];
            const transcript = result.alternatives[0].transcript;
            const isFinal = result.isFinal;
            
            if (isFinal) {
                // Final result - add to accumulated transcript
                console.log('📝 [GOOGLE STT] Final result:', transcript);
                
                this.finalTranscript += transcript + ' ';
                this.currentTranscript = this.finalTranscript;
                
                // Update last speech time
                this.lastSpeechTime = Date.now();
                
                // Start silence detection
                this.startSilenceDetection();
                
                // Callback for final transcript update
                if (this.onTranscriptPartial) {
                    this.onTranscriptPartial(this.finalTranscript.trim());
                }
            } else {
                // Interim result - show but don't commit
                console.log('📝 [GOOGLE STT] Interim result:', transcript);
                
                const combinedTranscript = this.finalTranscript + transcript;
                
                // Callback for partial transcript
                if (this.onTranscriptPartial) {
                    this.onTranscriptPartial(combinedTranscript.trim());
                }
            }
        } catch (error) {
            console.error('❌ [GOOGLE STT] Error handling stream data:', error);
        }
    }
    
    /**
     * Handle stream errors
     */
    handleStreamError(error) {
        console.error('❌ [GOOGLE STT] Stream error:', error);
        
        // Stop streaming and notify
        this.stopStreaming();
        
        // TODO: Implement retry logic if needed
    }
    
    /**
     * Start silence detection timer
     */
    startSilenceDetection() {
        // Clear existing timer
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
        }
        
        // Start new timer
        this.silenceTimer = setTimeout(() => {
            const silenceDuration = Date.now() - this.lastSpeechTime;
            
            if (silenceDuration >= QUESTION_DETECTION.silenceThreshold) {
                console.log(`[GOOGLE STT] Silence detected (${silenceDuration}ms)`);
                this.commitTranscript();
            }
        }, QUESTION_DETECTION.silenceThreshold);
    }
    
    /**
     * Process audio chunk
     */
    async processAudioChunk(audioChunk) {
        if (!this.isStreaming || !this.recognizeStream) {
            return;
        }
        
        try {
            // Convert Float32Array to PCM16 buffer
            const pcmBuffer = this.float32ToPCM16(audioChunk);
            
            // Write to recognize stream
            this.recognizeStream.write(pcmBuffer);
            
            // Check max duration
            const duration = Date.now() - this.questionStartTime;
            if (duration > QUESTION_DETECTION.maxDuration) {
                console.log('[GOOGLE STT] Max duration reached, committing');
                this.commitTranscript();
            }
        } catch (error) {
            console.error('❌ [GOOGLE STT] Error processing audio chunk:', error);
        }
    }
    
    /**
     * Commit final transcript
     */
    commitTranscript() {
        if (!this.isStreaming) {
            return;
        }
        
        // Clear silence timer
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        
        const transcript = this.finalTranscript.trim();
        const duration = Date.now() - this.questionStartTime;
        
        // Validate
        if (transcript.length === 0) {
            console.log('[GOOGLE STT] Empty transcript, discarding');
            this.stopStreaming();
            return;
        }
        
        if (duration < QUESTION_DETECTION.minLength) {
            console.log(`[GOOGLE STT] Too short (${duration}ms), discarding`);
            this.stopStreaming();
            return;
        }
        
        console.log('✅ [GOOGLE STT] Committing transcript:', transcript);
        console.log(`    Duration: ${duration}ms`);
        console.log(`    Length: ${transcript.length} chars`);
        
        // Callback
        if (this.onTranscriptComplete) {
            this.onTranscriptComplete(transcript, {
                duration,
                language: this.currentLanguage,
                timestamp: Date.now(),
            });
        }
        
        // Stop streaming
        this.stopStreaming();
    }
    
    /**
     * Stop streaming
     */
    stopStreaming() {
        if (!this.isStreaming) {
            return;
        }
        
        console.log('🛑 [GOOGLE STT] Stopping streaming');
        
        // Clear timer
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        
        // Close stream
        if (this.recognizeStream) {
            this.recognizeStream.end();
            this.recognizeStream = null;
        }
        
        // Reset state
        this.isStreaming = false;
        this.currentTranscript = '';
        this.finalTranscript = '';
        this.questionStartTime = 0;
        this.lastSpeechTime = 0;
        
        console.log('✅ [GOOGLE STT] Streaming stopped');
    }
    
    /**
     * Force commit current transcript
     */
    forceCommit() {
        console.log('[GOOGLE STT] Force commit');
        this.commitTranscript();
    }
    
    /**
     * Update language
     */
    updateLanguage(languageCode) {
        console.log(`[GOOGLE STT] Language updated: ${languageCode}`);
        this.currentLanguage = languageCode;
    }
    
    /**
     * Convert Float32Array to PCM16 buffer
     */
    float32ToPCM16(float32Array) {
        const buffer = Buffer.alloc(float32Array.length * 2);
        
        for (let i = 0; i < float32Array.length; i++) {
            const sample = Math.max(-1, Math.min(1, float32Array[i]));
            const int16Sample = sample < 0 ? sample * 32768 : sample * 32767;
            buffer.writeInt16LE(Math.round(int16Sample), i * 2);
        }
        
        return buffer;
    }
    
    /**
     * Get status
     */
    getStatus() {
        return {
            isStreaming: this.isStreaming,
            currentTranscript: this.currentTranscript,
            finalTranscript: this.finalTranscript,
            questionDuration: this.isStreaming ? Date.now() - this.questionStartTime : 0,
        };
    }
    
    /**
     * Destroy
     */
    destroy() {
        console.log('[GOOGLE STT] Destroying');
        
        this.stopStreaming();
        
        if (this.client) {
            this.client = null;
        }
        
        console.log('✅ [GOOGLE STT] Destroyed');
    }
}

// Export
module.exports = {
    GoogleSpeechSTT,
    STREAMING_CONFIG,
    QUESTION_DETECTION,
};
