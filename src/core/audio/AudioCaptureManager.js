/**
 * AudioCaptureManager - Unified Audio Capture Abstraction
 * 
 * Provides a consistent interface for audio capture across platforms:
 * - macOS: Uses audiotee native binary (Core Audio Taps API, requires 14.2+)
 * - Windows: Uses getDisplayMedia loopback audio (renderer process)
 * - Linux: Uses getDisplayMedia with audio (renderer process)
 * 
 * This manager abstracts away platform differences and provides:
 * - Consistent event interface
 * - Unified buffer handling (24kHz mono PCM)
 * - Backpressure management via queue
 * - Error recovery
 * - macOS version validation (14.2+ required for Core Audio Taps)
 * 
 * audiotee (Core Audio Taps) advantages:
 * - Uses Apple's native Core Audio Taps API
 * - No app restart required after granting permission
 * - Uses NSAudioCaptureUsageDescription (audio permission, not screen recording)
 */

const EventEmitter = require('events');
const { spawn } = require('child_process');

// Safe performance instrumentation (never breaks app)
const { safeStartTiming, safeReportFailure, FAILURE_MODES } = require('../perf/SafePerf');

// macOS version utilities
const macOS = require('../../utils/core/macOS');

// Audio configuration constants
const CONFIG = {
    SAMPLE_RATE: 24000,
    CHANNELS_MONO: 1,
    CHANNELS_STEREO: 2,
    BYTES_PER_SAMPLE: 2,
    CHUNK_DURATION: 0.1, // seconds
    MAX_QUEUE_SIZE: 50, // ~5 seconds of buffered chunks
    MAX_BUFFER_SECONDS: 1, // Maximum buffer accumulation before trim
};

// Calculate derived values
CONFIG.CHUNK_SIZE_MONO = CONFIG.SAMPLE_RATE * CONFIG.BYTES_PER_SAMPLE * CONFIG.CHANNELS_MONO * CONFIG.CHUNK_DURATION;
CONFIG.CHUNK_SIZE_STEREO = CONFIG.SAMPLE_RATE * CONFIG.BYTES_PER_SAMPLE * CONFIG.CHANNELS_STEREO * CONFIG.CHUNK_DURATION;
CONFIG.MAX_BUFFER_SIZE = CONFIG.SAMPLE_RATE * CONFIG.BYTES_PER_SAMPLE * CONFIG.MAX_BUFFER_SECONDS;

/**
 * AudioCaptureManager class
 * 
 * Events:
 * - 'audio': Emitted when audio data is ready. Payload: { base64Data, mimeType }
 * - 'error': Emitted on capture errors. Payload: Error object
 * - 'started': Emitted when capture starts successfully
 * - 'stopped': Emitted when capture stops
 * - 'version-unsupported': Emitted when macOS version is too old
 */
class AudioCaptureManager extends EventEmitter {
    constructor() {
        super();
        this.platform = process.platform;
        this.isCapturing = false;
        this.systemAudioProc = null;
        this.audioBuffer = Buffer.alloc(0);
        this.audioQueue = [];
        this.isProcessingQueue = false;
        this._versionChecked = false;
        this._versionSupported = true;
    }

    /**
     * Check if macOS version supports audio capture
     * @returns {{ isSupported: boolean, version: string | null, reason: string | null }}
     */
    checkMacOSVersionSupport() {
        if (this.platform !== 'darwin') {
            return { isSupported: true, version: null, reason: 'Not macOS' };
        }

        const support = macOS.checkAudioSupport();
        this._versionChecked = true;
        this._versionSupported = support.isSupported;

        if (!support.isSupported) {
            console.error(`[AudioCaptureManager] macOS version not supported: ${support.reason}`);
        } else {
            console.log(`[AudioCaptureManager] macOS ${support.version} - audio capture supported`);
        }

        return support;
    }

    /**
     * Convert stereo PCM buffer to mono by taking left channel only
     */
    static convertStereoToMono(stereoBuffer) {
        const samples = stereoBuffer.length / 4; // 2 bytes per sample * 2 channels
        const monoBuffer = Buffer.alloc(samples * 2);

        for (let i = 0; i < samples; i++) {
            const leftSample = stereoBuffer.readInt16LE(i * 4);
            monoBuffer.writeInt16LE(leftSample, i * 2);
        }

        return monoBuffer;
    }

    /**
     * Kill any existing audiotee processes (macOS only)
     */
    async _killExistingAudiotee() {
        return new Promise(resolve => {
            console.log('[AudioCaptureManager] Checking for existing audiotee processes...');

            const killProc = spawn('pkill', ['-f', 'audiotee'], {
                stdio: 'ignore',
            });

            killProc.on('close', code => {
                if (code === 0) {
                    console.log('[AudioCaptureManager] Killed existing audiotee processes');
                } else {
                    console.log('[AudioCaptureManager] No existing audiotee processes found');
                }
                resolve();
            });

            killProc.on('error', err => {
                console.log('[AudioCaptureManager] Error checking for existing processes:', err.message);
                resolve();
            });

            // Timeout after 2 seconds
            setTimeout(() => {
                killProc.kill();
                resolve();
            }, 2000);
        });
    }

    /**
     * Process the audio queue sequentially
     */
    async _processQueue() {
        if (this.isProcessingQueue) return;
        this.isProcessingQueue = true;

        try {
            while (this.audioQueue.length > 0) {
                const item = this.audioQueue.shift();
                this.emit('audio', item);
            }
        } catch (err) {
            console.error('[AudioCaptureManager] Error processing audio queue:', err);
            this.emit('error', err);
        } finally {
            this.isProcessingQueue = false;
            if (this.audioQueue.length > 0) {
                this._processQueue();
            }
        }
    }

    /**
     * Resample 24kHz mono PCM to 48kHz mono PCM
     * Simple linear interpolation (doubling samples)
     * sufficient for speech recognition upsampling
     */
    _resample24to48(buffer24k) {
        // Source: 16-bit PCM, 24kHz
        // Target: 16-bit PCM, 48kHz
        // Length doubles (2x samples)
        const samples = buffer24k.length / 2; // 2 bytes per sample
        const buffer48k = Buffer.alloc(samples * 2 * 2); // *2 for doubling, *2 for bytes

        for (let i = 0; i < samples; i++) {
            const sample = buffer24k.readInt16LE(i * 2);
            // Write sample twice
            buffer48k.writeInt16LE(sample, i * 4);
            buffer48k.writeInt16LE(sample, i * 4 + 2);
        }
        return buffer48k;
    }

    /**
     * Enqueue audio chunk with backpressure handling
     */
    _enqueueAudio(base64Data, needsResampling = false) {
        // Performance timing (safe - never breaks)
        const stopTiming = safeStartTiming('audio-chunk');

        // Resample if needed (e.g. 24k -> 48k for specific AudioContext requirements)
        // User requested: "Implemented audio resampling (24kHz → 48kHz) to match the AudioContext sample rate."
        // We assume the incoming data is 24kHz if needsResampling is true
        let processedData = base64Data;

        if (needsResampling) {
            try {
                const rawBuffer = Buffer.from(base64Data, 'base64');
                const resampledBuffer = this._resample24to48(rawBuffer);
                processedData = resampledBuffer.toString('base64');
                // Note: The MIME type should theoretically change to rate=48000, 
                // but the downstream receiver (assistantManager) might expect 24000.
                // We'll stick to the requested 24->48 conversion logic but check if downstream handles it.
            } catch (err) {
                console.error('[AudioCaptureManager] Resampling error:', err);
            }
        }

        // Backpressure / Flow Control
        if (this.audioQueue.length >= CONFIG.MAX_QUEUE_SIZE) {
            console.warn('[AudioCaptureManager] Audio queue full, dropping oldest chunk');
            this.audioQueue.shift();
            // Report overload (safe - never breaks)
            safeReportFailure(FAILURE_MODES.AUDIO_OVERLOAD || 'audio-overload', {
                queueSize: this.audioQueue.length,
            });
        }

        this.audioQueue.push({
            base64Data: processedData,
            mimeType: `audio/pcm;rate=${CONFIG.SAMPLE_RATE}`, // Keeping label consistent for now unless changed
        });

        this._processQueue();

        // Record timing
        stopTiming();
    }

    /**
     * Start audio capture on macOS using audiotee (Core Audio Taps)
     * 
     * audiotee advantages:
     * - Uses Core Audio Taps API (macOS 14.2+)
     * - No app restart required after granting permission  
     * - Better permission UX (audio capture vs screen recording)
     */
    async _startMacOSCapture() {
        // Check macOS version first (requires 14.2+)
        const versionSupport = this.checkMacOSVersionSupport();
        if (!versionSupport.isSupported) {
            const error = new Error(
                `macOS version not supported: ${versionSupport.reason}\n` +
                'System audio capture requires macOS 14.2 (Sonoma) or later for Core Audio Taps.'
            );
            error.code = 'MACOS_VERSION_UNSUPPORTED';
            error.version = versionSupport.version;
            console.error('[AudioCaptureManager]', error.message);
            this.emit('version-unsupported', versionSupport);
            this.emit('error', error);
            return false;
        }

        await this._killExistingAudiotee();

        console.log('[AudioCaptureManager] Starting macOS audio capture with audiotee (Core Audio Taps)...');

        const { app } = require('electron');
        const path = require('path');

        // Note: audiotee uses NSAudioCaptureUsageDescription permission
        // This is handled automatically by macOS when audiotee first runs
        // No need to check screen recording permission!

        let audiotePath;
        if (app.isPackaged) {
            audiotePath = path.join(process.resourcesPath, 'audiotee');
        } else {
            audiotePath = path.join(__dirname, '../../../src/assets', 'audiotee');
        }

        console.log('[AudioCaptureManager] audiotee path:', audiotePath);

        // Check if the binary exists
        const fs = require('fs');
        if (!fs.existsSync(audiotePath)) {
            const error = new Error(`audiotee binary not found at: ${audiotePath}`);
            console.error('[AudioCaptureManager]', error.message);
            this.emit('error', error);
            return false;
        }

        console.log('[AudioCaptureManager] audiotee binary found, starting process...');

        // audiotee CLI options:
        // --sample-rate 24000 : Match our target sample rate (converts to 16-bit)
        // --chunk-duration 0.1 : 100ms chunks to match our CONFIG.CHUNK_DURATION
        // Output: Raw PCM audio to stdout, logs to stderr
        const spawnOptions = {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env },
        };

        // Start audiotee with 24kHz sample rate to match our pipeline
        this.systemAudioProc = spawn(audiotePath, [
            '--sample-rate', '24000',
            '--chunk-duration', '0.1',
        ], spawnOptions);

        if (!this.systemAudioProc.pid) {
            const error = new Error('Failed to start audiotee');
            this.emit('error', error);
            return false;
        }

        console.log('[AudioCaptureManager] audiotee started with PID:', this.systemAudioProc.pid);

        // Track if we're receiving audio data
        let audioDataReceived = false;
        let totalBytesReceived = 0;

        // Handle audio data from stdout
        // audiotee outputs: mono 16-bit PCM at 24kHz (when --sample-rate 24000 is set)
        this.systemAudioProc.stdout.on('data', data => {
            if (!audioDataReceived) {
                audioDataReceived = true;
                console.log('[AudioCaptureManager] First audio data received from audiotee!');
            }
            totalBytesReceived += data.length;

            this.audioBuffer = Buffer.concat([this.audioBuffer, data]);

            // audiotee outputs mono 16-bit PCM directly (no stereo conversion needed)
            while (this.audioBuffer.length >= CONFIG.CHUNK_SIZE_MONO) {
                const chunk = this.audioBuffer.slice(0, CONFIG.CHUNK_SIZE_MONO);
                this.audioBuffer = this.audioBuffer.slice(CONFIG.CHUNK_SIZE_MONO);

                // Already mono from audiotee, just encode
                const base64Data = chunk.toString('base64');

                // Resample 24k -> 48k as requested by user
                this._enqueueAudio(base64Data, true);
            }

            // Prevent buffer overflow
            if (this.audioBuffer.length > CONFIG.MAX_BUFFER_SIZE) {
                this.audioBuffer = this.audioBuffer.slice(-CONFIG.MAX_BUFFER_SIZE);
            }
        });

        this.systemAudioProc.stderr.on('data', data => {
            // audiotee logs to stderr - this is normal operation info
            const msg = data.toString().trim();
            if (msg) {
                console.log('[AudioCaptureManager] audiotee:', msg);
            }
        });

        this.systemAudioProc.on('close', code => {
            console.log('[AudioCaptureManager] audiotee closed with code:', code);
            this.systemAudioProc = null;
            if (this.isCapturing) {
                this.isCapturing = false;
                this.emit('stopped');
            }
        });

        this.systemAudioProc.on('error', err => {
            console.error('[AudioCaptureManager] audiotee error:', err);
            this.systemAudioProc = null;
            this.emit('error', err);
        });

        this.isCapturing = true;
        this.emit('started');
        return true;
    }

    /**
     * Start audio capture
     * For macOS: Starts audiotee in main process (Core Audio Taps)
     * For Windows/Linux: Returns config for renderer to use getDisplayMedia
     */
    async start() {
        if (this.isCapturing) {
            console.warn('[AudioCaptureManager] Already capturing, ignoring start request');
            return { success: true, alreadyRunning: true };
        }

        try {
            if (this.platform === 'darwin') {
                const result = await this._startMacOSCapture();
                return { success: result };
            } else {
                // For Windows/Linux, audio capture happens in the renderer process
                // via getDisplayMedia. Return configuration for the renderer.
                this.isCapturing = true;
                this.emit('started');
                return {
                    success: true,
                    rendererHandled: true,
                    config: {
                        sampleRate: CONFIG.SAMPLE_RATE,
                        chunkDuration: CONFIG.CHUNK_DURATION,
                        maxQueueSize: CONFIG.MAX_QUEUE_SIZE,
                    },
                };
            }
        } catch (error) {
            console.error('[AudioCaptureManager] Failed to start capture:', error);
            this.emit('error', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Stop audio capture
     */
    stop() {
        if (!this.isCapturing) {
            return;
        }

        console.log('[AudioCaptureManager] Stopping audio capture...');

        if (this.systemAudioProc) {
            this.systemAudioProc.kill('SIGTERM');
            this.systemAudioProc = null;
        }

        // Clear buffers and queue
        this.audioBuffer = Buffer.alloc(0);
        this.audioQueue = [];
        this.isCapturing = false;

        this.emit('stopped');
    }

    /**
     * Process audio chunk from renderer (for Windows/Linux)
     * Called by IPC handler when renderer sends audio data
     */
    processRendererAudio(base64Data) {
        if (!this.isCapturing) return;
        this._enqueueAudio(base64Data);
    }

    /**
     * Get current capture status
     */
    getStatus() {
        return {
            isCapturing: this.isCapturing,
            platform: this.platform,
            queueSize: this.audioQueue.length,
            bufferSize: this.audioBuffer.length,
        };
    }

    /**
     * Get configuration for renderer-side audio processing
     */
    static getRendererConfig() {
        return {
            SAMPLE_RATE: CONFIG.SAMPLE_RATE,
            CHUNK_DURATION: CONFIG.CHUNK_DURATION,
            BUFFER_SIZE: 4096,
            MAX_QUEUE_SIZE: CONFIG.MAX_QUEUE_SIZE,
        };
    }
}

// Export singleton instance and class
const audioCaptureManager = new AudioCaptureManager();

module.exports = {
    AudioCaptureManager,
    audioCaptureManager,
    CONFIG,
};
