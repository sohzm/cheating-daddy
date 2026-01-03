/**
 * AudioCaptureManager - Unified Audio Capture Abstraction
 * 
 * Provides a consistent interface for audio capture across platforms:
 * - macOS: Uses SystemAudioDump native binary (main process)
 * - Windows: Uses getDisplayMedia loopback audio (renderer process)
 * - Linux: Uses getDisplayMedia with audio (renderer process)
 * 
 * This manager abstracts away platform differences and provides:
 * - Consistent event interface
 * - Unified buffer handling (24kHz mono PCM)
 * - Backpressure management via queue
 * - Error recovery
 */

const EventEmitter = require('events');
const { spawn } = require('child_process');

// Safe performance instrumentation (never breaks app)
const { safeStartTiming, safeReportFailure, FAILURE_MODES } = require('../perf/SafePerf');

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
     * Kill any existing SystemAudioDump processes (macOS only)
     */
    async _killExistingSystemAudioDump() {
        return new Promise(resolve => {
            console.log('[AudioCaptureManager] Checking for existing SystemAudioDump processes...');

            const killProc = spawn('pkill', ['-f', 'SystemAudioDump'], {
                stdio: 'ignore',
            });

            killProc.on('close', code => {
                if (code === 0) {
                    console.log('[AudioCaptureManager] Killed existing SystemAudioDump processes');
                } else {
                    console.log('[AudioCaptureManager] No existing SystemAudioDump processes found');
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
     * Enqueue audio chunk with backpressure handling
     */
    _enqueueAudio(base64Data) {
        // Performance timing (safe - never breaks)
        const stopTiming = safeStartTiming('audio-chunk');

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
            base64Data,
            mimeType: `audio/pcm;rate=${CONFIG.SAMPLE_RATE}`,
        });

        this._processQueue();

        // Record timing
        stopTiming();
    }

    /**
     * Start audio capture on macOS using SystemAudioDump
     */
    async _startMacOSCapture() {
        await this._killExistingSystemAudioDump();

        console.log('[AudioCaptureManager] Starting macOS audio capture with SystemAudioDump...');

        const { app } = require('electron');
        const path = require('path');

        let systemAudioPath;
        if (app.isPackaged) {
            systemAudioPath = path.join(process.resourcesPath, 'SystemAudioDump');
        } else {
            systemAudioPath = path.join(__dirname, '../../../src/assets', 'SystemAudioDump');
        }

        console.log('[AudioCaptureManager] SystemAudioDump path:', systemAudioPath);

        const spawnOptions = {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env },
        };

        this.systemAudioProc = spawn(systemAudioPath, [], spawnOptions);

        if (!this.systemAudioProc.pid) {
            const error = new Error('Failed to start SystemAudioDump');
            this.emit('error', error);
            return false;
        }

        console.log('[AudioCaptureManager] SystemAudioDump started with PID:', this.systemAudioProc.pid);

        // Handle audio data from stdout
        this.systemAudioProc.stdout.on('data', data => {
            this.audioBuffer = Buffer.concat([this.audioBuffer, data]);

            while (this.audioBuffer.length >= CONFIG.CHUNK_SIZE_STEREO) {
                const chunk = this.audioBuffer.slice(0, CONFIG.CHUNK_SIZE_STEREO);
                this.audioBuffer = this.audioBuffer.slice(CONFIG.CHUNK_SIZE_STEREO);

                // Convert stereo to mono
                const monoChunk = AudioCaptureManager.convertStereoToMono(chunk);
                const base64Data = monoChunk.toString('base64');

                this._enqueueAudio(base64Data);
            }

            // Prevent buffer overflow
            if (this.audioBuffer.length > CONFIG.MAX_BUFFER_SIZE) {
                this.audioBuffer = this.audioBuffer.slice(-CONFIG.MAX_BUFFER_SIZE);
            }
        });

        this.systemAudioProc.stderr.on('data', data => {
            console.error('[AudioCaptureManager] SystemAudioDump stderr:', data.toString());
        });

        this.systemAudioProc.on('close', code => {
            console.log('[AudioCaptureManager] SystemAudioDump closed with code:', code);
            this.systemAudioProc = null;
            if (this.isCapturing) {
                this.isCapturing = false;
                this.emit('stopped');
            }
        });

        this.systemAudioProc.on('error', err => {
            console.error('[AudioCaptureManager] SystemAudioDump error:', err);
            this.systemAudioProc = null;
            this.emit('error', err);
        });

        this.isCapturing = true;
        this.emit('started');
        return true;
    }

    /**
     * Start audio capture
     * For macOS: Starts SystemAudioDump in main process
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
