// renderer.js
const { ipcRenderer } = require('electron');
const path = require('path');

// Import VAD functionality
let VADProcessor;
try {
    // __dirname resolves to 'src' folder when loaded from index.html
    // So we need to go to 'utils/vad.js'
    const vadPath = path.join(__dirname, 'utils', 'vad.js');
    const vad = require(vadPath);
    VADProcessor = vad.VADProcessor;
    console.log('✅ VAD module loaded successfully from:', vadPath);
} catch (error) {
    console.warn('❌ VAD module not available:', error);
    console.warn('Tried path:', path.join(__dirname, 'utils', 'vad.js'));
    VADProcessor = null;
}

// Initialize random display name for UI components
window.randomDisplayName = null;

// Request random display name from main process
ipcRenderer
    .invoke('get-random-display-name')
    .then(name => {
        window.randomDisplayName = name;
        console.log('Set random display name:', name);
    })
    .catch(err => {
        console.warn('Could not get random display name:', err);
        window.randomDisplayName = 'System Monitor';
    });

let mediaStream = null;
let screenshotInterval = null;
let audioContext = null;
let audioProcessor = null;
let audioBuffer = [];
let vadProcessor = null; // VAD processor instance
const SAMPLE_RATE = 24000;
const AUDIO_CHUNK_DURATION = 0.1; // seconds
const BUFFER_SIZE = 4096; // Increased buffer size for smoother audio

let hiddenVideo = null;
let offscreenCanvas = null;
let offscreenContext = null;
let currentImageQuality = 'medium'; // Store current image quality for manual screenshots
let microphoneEnabled = false; // Microphone toggle state - starts OFF by default

const isLinux = process.platform === 'linux';
const isMacOS = process.platform === 'darwin';

// Token tracking system for rate limiting
let tokenTracker = {
    tokens: [], // Array of {timestamp, count, type} objects
    audioStartTime: null,

    // Add tokens to the tracker
    addTokens(count, type = 'image') {
        const now = Date.now();
        this.tokens.push({
            timestamp: now,
            count: count,
            type: type,
        });

        // Clean old tokens (older than 1 minute)
        this.cleanOldTokens();
    },

    // Calculate image tokens based on Gemini 2.0 rules
    calculateImageTokens(width, height) {
        // Images ≤384px in both dimensions = 258 tokens
        if (width <= 384 && height <= 384) {
            return 258;
        }

        // Larger images are tiled into 768x768 chunks, each = 258 tokens
        const tilesX = Math.ceil(width / 768);
        const tilesY = Math.ceil(height / 768);
        const totalTiles = tilesX * tilesY;

        return totalTiles * 258;
    },

    // Track audio tokens continuously
    trackAudioTokens() {
        if (!this.audioStartTime) {
            this.audioStartTime = Date.now();
            return;
        }

        const now = Date.now();
        const elapsedSeconds = (now - this.audioStartTime) / 1000;

        // Audio = 32 tokens per second
        const audioTokens = Math.floor(elapsedSeconds * 32);

        if (audioTokens > 0) {
            this.addTokens(audioTokens, 'audio');
            this.audioStartTime = now;
        }
    },

    // Clean tokens older than 1 minute
    cleanOldTokens() {
        const oneMinuteAgo = Date.now() - 60 * 1000;
        this.tokens = this.tokens.filter(token => token.timestamp > oneMinuteAgo);
    },

    // Get total tokens in the last minute
    getTokensInLastMinute() {
        this.cleanOldTokens();
        return this.tokens.reduce((total, token) => total + token.count, 0);
    },

    // Check if we should throttle based on settings
    shouldThrottle() {
        // Get rate limiting settings from localStorage
        const throttleEnabled = localStorage.getItem('throttleTokens') === 'true';
        if (!throttleEnabled) {
            return false;
        }

        const maxTokensPerMin = parseInt(localStorage.getItem('maxTokensPerMin') || '1000000', 10);
        const throttleAtPercent = parseInt(localStorage.getItem('throttleAtPercent') || '75', 10);

        const currentTokens = this.getTokensInLastMinute();
        const throttleThreshold = Math.floor((maxTokensPerMin * throttleAtPercent) / 100);

        console.log(`Token check: ${currentTokens}/${maxTokensPerMin} (throttle at ${throttleThreshold})`);

        return currentTokens >= throttleThreshold;
    },

    // Reset the tracker
    reset() {
        this.tokens = [];
        this.audioStartTime = null;
    },
};

// Track audio tokens every few seconds
setInterval(() => {
    tokenTracker.trackAudioTokens();
}, 2000);

function convertFloat32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        // Improved scaling to prevent clipping
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function initializeGemini(profile = 'interview', language = 'en-US', mode = 'interview', model = 'gemini-2.5-flash') {
    const apiKey = localStorage.getItem('apiKey')?.trim();
    if (apiKey) {
        // Get mode and model from localStorage if not provided
        const selectedMode = mode || localStorage.getItem('selectedMode') || 'interview';
        const selectedModel = model || localStorage.getItem('selectedModel') || 'gemini-2.5-flash';

        const success = await ipcRenderer.invoke('initialize-gemini', apiKey, localStorage.getItem('customPrompt') || '', profile, language, selectedMode, selectedModel);
        if (success) {
            cheddar.setStatus(selectedMode === 'interview' ? 'Live' : 'Ready');
        } else {
            cheddar.setStatus('error');
        }
    }
}

// Listen for status updates
ipcRenderer.on('update-status', (event, status) => {
    console.log('Status update:', status);
    cheddar.setStatus(status);
});

// Listen for responses - REMOVED: This is handled in CheatingDaddyApp.js to avoid duplicates
// ipcRenderer.on('update-response', (event, response) => {
//     console.log('Gemini response:', response);
//     cheddar.e().setResponse(response);
//     // You can add UI elements to display the response if needed
// });

async function startCapture(screenshotIntervalSeconds = 5, imageQuality = 'medium') {
    // Store the image quality for manual screenshots
    currentImageQuality = imageQuality;

    // Reset token tracker when starting new capture session
    tokenTracker.reset();
    console.log('🎯 Token tracker reset for new capture session');

    // Enable microphone if in automatic VAD mode
    const vadEnabled = localStorage.getItem('vadEnabled') === 'true';
    const vadMode = localStorage.getItem('vadMode') || 'automatic';
    if (vadEnabled && vadMode === 'automatic') {
        microphoneEnabled = true;
        console.log('🎤 [AUTOMATIC MODE] Microphone enabled at session start');
    } else if (vadEnabled && vadMode === 'manual') {
        microphoneEnabled = false;
        console.log('🔴 [MANUAL MODE] Microphone OFF - click button to enable');
    }

    try {
        if (isMacOS) {
            // On macOS, use SystemAudioDump for audio and getDisplayMedia for screen
            console.log('Starting macOS capture with SystemAudioDump...');

            // Get VAD settings from localStorage to pass to main process
            const vadEnabled = localStorage.getItem('vadEnabled') === 'true';
            const vadMode = localStorage.getItem('vadMode') || 'automatic';

            // Start macOS audio capture with VAD settings
            const audioResult = await ipcRenderer.invoke('start-macos-audio', vadEnabled, vadMode);
            if (!audioResult.success) {
                throw new Error('Failed to start macOS audio capture: ' + audioResult.error);
            }

            // Get screen capture for screenshots
            mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: 1,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false, // Don't use browser audio on macOS
            });

            console.log('macOS screen capture started - audio handled by SystemAudioDump');
        } else if (isLinux) {
            // Linux - use display media for screen capture and try to get system audio
            try {
                // First try to get system audio via getDisplayMedia (works on newer browsers)
                mediaStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        frameRate: 1,
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    },
                    audio: {
                        sampleRate: SAMPLE_RATE,
                        channelCount: 1,
                        echoCancellation: false, // Don't cancel system audio
                        noiseSuppression: false,
                        autoGainControl: false,
                    },
                });

                console.log('Linux system audio capture via getDisplayMedia succeeded');

                // Setup audio processing for Linux system audio
                setupLinuxSystemAudioProcessing();
            } catch (systemAudioError) {
                console.warn('System audio via getDisplayMedia failed, trying screen-only capture:', systemAudioError);

                // Fallback to screen-only capture
                mediaStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        frameRate: 1,
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    },
                    audio: false,
                });
            }

            console.log('Linux capture started - system audio:', mediaStream.getAudioTracks().length > 0);
        } else {
            // Windows - use display media with loopback for system audio
            mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: 1,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: {
                    sampleRate: SAMPLE_RATE,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            console.log('Windows capture started with loopback audio');

            // Setup audio processing for Windows loopback audio only
            setupWindowsLoopbackProcessing();
        }

        console.log('MediaStream obtained:', {
            hasVideo: mediaStream.getVideoTracks().length > 0,
            hasAudio: mediaStream.getAudioTracks().length > 0,
            videoTrack: mediaStream.getVideoTracks()[0]?.getSettings(),
        });

        // Start capturing screenshots - check if manual mode
        if (screenshotIntervalSeconds === 'manual' || screenshotIntervalSeconds === 'Manual') {
            console.log('Manual mode enabled - screenshots will be captured on demand only');
            // Don't start automatic capture in manual mode
        } else {
            const intervalMilliseconds = parseInt(screenshotIntervalSeconds) * 1000;
            screenshotInterval = setInterval(() => captureScreenshot(imageQuality), intervalMilliseconds);

            // Capture first screenshot immediately
            setTimeout(() => captureScreenshot(imageQuality), 100);
        }
    } catch (err) {
        console.error('Error starting capture:', err);
        cheddar.setStatus('error');
    }
}

function setupLinuxSystemAudioProcessing() {
    // Setup system audio processing for Linux (from getDisplayMedia)
    audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    const source = audioContext.createMediaStreamSource(mediaStream);
    audioProcessor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    // Initialize VAD if enabled and available
    let isVADEnabled = false;
    if (VADProcessor) {
        try {
            const vadEnabled = localStorage.getItem('vadEnabled') === 'true';
            if (vadEnabled) {
                // Get VAD mode from localStorage (default: 'automatic')
                const vadMode = localStorage.getItem('vadMode') || 'automatic';
                console.log(`Initializing VAD in ${vadMode.toUpperCase()} mode`);

                // Create VAD processor with onCommit callback and mode
                vadProcessor = new VADProcessor(
                    async (audioSegment, metadata) => {
                        try {
                            // Convert Float32Array to Int16 PCM
                            const pcmData16 = convertFloat32ToInt16(audioSegment);
                            const base64Data = arrayBufferToBase64(pcmData16.buffer);

                            await ipcRenderer.invoke('send-audio-content', {
                                data: base64Data,
                                mimeType: 'audio/pcm;rate=24000',
                            });

                            console.log('VAD audio segment sent:', metadata);
                        } catch (error) {
                            console.error('Failed to send VAD audio segment:', error);
                        }
                    },
                    null, // onStateChange callback
                    vadMode // VAD mode
                );
                isVADEnabled = true;
                console.log('VAD enabled for Linux system audio processing');

                // In AUTOMATIC mode: enable microphone by default
                if (vadMode === 'automatic') {
                    microphoneEnabled = true;
                    console.log('🎤 Automatic mode - microphone enabled by default');
                }
            }
        } catch (error) {
            console.error('Failed to initialize VAD:', error);
        }
    }

    let audioBuffer = [];
    const samplesPerChunk = SAMPLE_RATE * AUDIO_CHUNK_DURATION;
    let audioFrameCount = 0;

    audioProcessor.onaudioprocess = async e => {
        audioFrameCount++;

        // Debug: Log first few frames
        if (audioFrameCount <= 3) {
            console.log(`🔊 [AUDIO] Frame ${audioFrameCount}: microphoneEnabled=${microphoneEnabled}, isVADEnabled=${isVADEnabled}`);
        }

        // Skip audio processing if microphone is not enabled
        if (!microphoneEnabled) {
            if (audioFrameCount <= 3) {
                console.log(`🚫 [AUDIO] Skipping frame - microphone is OFF`);
            }
            return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        audioBuffer.push(...inputData);

        // Process audio in chunks
        while (audioBuffer.length >= samplesPerChunk) {
            const chunk = audioBuffer.splice(0, samplesPerChunk);

            if (isVADEnabled && vadProcessor) {
                // Process with VAD (VAD will check its own pause state)
                await vadProcessor.processAudio(chunk);
            } else {
                // Process without VAD (original behavior)
                const pcmData16 = convertFloat32ToInt16(chunk);
                const base64Data = arrayBufferToBase64(pcmData16.buffer);

                await ipcRenderer.invoke('send-audio-content', {
                    data: base64Data,
                    mimeType: 'audio/pcm;rate=24000',
                });
            }
        }
    };

    source.connect(audioProcessor);
    audioProcessor.connect(audioContext.destination);
}

function setupWindowsLoopbackProcessing() {
    // Setup audio processing for Windows loopback audio only
    audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    const source = audioContext.createMediaStreamSource(mediaStream);
    audioProcessor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    // Initialize VAD if enabled and available
    let isVADEnabled = false;
    if (VADProcessor) {
        try {
            const vadEnabled = localStorage.getItem('vadEnabled') === 'true';
            if (vadEnabled) {
                // Get VAD mode from localStorage (default: 'automatic')
                const vadMode = localStorage.getItem('vadMode') || 'automatic';
                console.log(`Initializing VAD in ${vadMode.toUpperCase()} mode`);

                // Create VAD processor with onCommit callback and mode
                vadProcessor = new VADProcessor(
                    async (audioSegment, metadata) => {
                        try {
                            // Convert Float32Array to Int16 PCM
                            const pcmData16 = convertFloat32ToInt16(audioSegment);
                            const base64Data = arrayBufferToBase64(pcmData16.buffer);

                            await ipcRenderer.invoke('send-audio-content', {
                                data: base64Data,
                                mimeType: 'audio/pcm;rate=24000',
                            });

                            console.log('VAD audio segment sent:', metadata);
                        } catch (error) {
                            console.error('Failed to send VAD audio segment:', error);
                        }
                    },
                    null, // onStateChange callback
                    vadMode // VAD mode
                );
                isVADEnabled = true;
                console.log('VAD enabled for Windows loopback processing');

                // In AUTOMATIC mode: enable microphone by default
                if (vadMode === 'automatic') {
                    microphoneEnabled = true;
                    console.log('🎤 Automatic mode - microphone enabled by default');
                }
            }
        } catch (error) {
            console.error('Failed to initialize VAD:', error);
        }
    }

    let audioBuffer = [];
    const samplesPerChunk = SAMPLE_RATE * AUDIO_CHUNK_DURATION;
    let audioFrameCount = 0;

    audioProcessor.onaudioprocess = async e => {
        audioFrameCount++;

        // Debug: Log first few frames
        if (audioFrameCount <= 3) {
            console.log(`🔊 [AUDIO] Frame ${audioFrameCount}: microphoneEnabled=${microphoneEnabled}, isVADEnabled=${isVADEnabled}`);
        }

        // Skip audio processing if microphone is not enabled
        if (!microphoneEnabled) {
            if (audioFrameCount <= 3) {
                console.log(`🚫 [AUDIO] Skipping frame - microphone is OFF`);
            }
            return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        audioBuffer.push(...inputData);

        // Process audio in chunks
        while (audioBuffer.length >= samplesPerChunk) {
            const chunk = audioBuffer.splice(0, samplesPerChunk);

            if (isVADEnabled && vadProcessor) {
                // Process with VAD (VAD will check its own pause state)
                await vadProcessor.processAudio(chunk);
            } else {
                // Process without VAD (original behavior)
                const pcmData16 = convertFloat32ToInt16(chunk);
                const base64Data = arrayBufferToBase64(pcmData16.buffer);

                await ipcRenderer.invoke('send-audio-content', {
                    data: base64Data,
                    mimeType: 'audio/pcm;rate=24000',
                });
            }
        }
    };

    source.connect(audioProcessor);
    audioProcessor.connect(audioContext.destination);
}

async function captureScreenshot(imageQuality = 'medium', isManual = false) {
    console.log(`Capturing ${isManual ? 'manual' : 'automated'} screenshot...`);
    if (!mediaStream) return;

    // Store isManual flag for use in the blob callback
    const captureIsManual = isManual;

    // Check rate limiting for automated screenshots only
    if (!isManual && tokenTracker.shouldThrottle()) {
        console.log('⚠️ Automated screenshot skipped due to rate limiting');
        return;
    }

    // Lazy init of video element
    if (!hiddenVideo) {
        hiddenVideo = document.createElement('video');
        hiddenVideo.srcObject = mediaStream;
        hiddenVideo.muted = true;
        hiddenVideo.playsInline = true;
        await hiddenVideo.play();

        await new Promise(resolve => {
            if (hiddenVideo.readyState >= 2) return resolve();
            hiddenVideo.onloadedmetadata = () => resolve();
        });

        // Lazy init of canvas based on video dimensions
        offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = hiddenVideo.videoWidth;
        offscreenCanvas.height = hiddenVideo.videoHeight;
        offscreenContext = offscreenCanvas.getContext('2d');
    }

    // Check if video is ready
    if (hiddenVideo.readyState < 2) {
        console.warn('Video not ready yet, skipping screenshot');
        return;
    }

    offscreenContext.drawImage(hiddenVideo, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

    // Check if image was drawn properly by sampling a pixel
    const imageData = offscreenContext.getImageData(0, 0, 1, 1);
    const isBlank = imageData.data.every((value, index) => {
        // Check if all pixels are black (0,0,0) or transparent
        return index === 3 ? true : value === 0;
    });

    if (isBlank) {
        console.warn('Screenshot appears to be blank/black');
    }

    let qualityValue;
    switch (imageQuality) {
        case 'high':
            qualityValue = 0.9;
            break;
        case 'medium':
            qualityValue = 0.7;
            break;
        case 'low':
            qualityValue = 0.5;
            break;
        default:
            qualityValue = 0.7; // Default to medium
    }

    offscreenCanvas.toBlob(
        async blob => {
            if (!blob) {
                console.error('Failed to create blob from canvas');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result.split(',')[1];

                // Validate base64 data
                if (!base64data || base64data.length < 100) {
                    console.error('Invalid base64 data generated');
                    return;
                }

                const result = await ipcRenderer.invoke('send-image-content', {
                    data: base64data,
                    isManual: captureIsManual,
                });

                if (result.success) {
                    // Track image tokens after successful send
                    const imageTokens = tokenTracker.calculateImageTokens(offscreenCanvas.width, offscreenCanvas.height);
                    tokenTracker.addTokens(imageTokens, 'image');
                    console.log(`📊 Image sent successfully - ${imageTokens} tokens used (${offscreenCanvas.width}x${offscreenCanvas.height})`);
                } else {
                    console.error('Failed to send image:', result.error);
                }
            };
            reader.readAsDataURL(blob);
        },
        'image/jpeg',
        qualityValue
    );
}

async function captureManualScreenshot(imageQuality = null) {
    console.log('Manual screenshot triggered');
    const quality = imageQuality || currentImageQuality;

    // Check if we're in coding mode
    const selectedMode = localStorage.getItem('selectedMode') || 'interview';

    if (selectedMode === 'coding') {
        // For coding mode, ONLY send screenshot - system prompt will handle it
        await captureScreenshot(quality, true);
    } else {
        // For interview mode, just send screenshot
        await captureScreenshot(quality, true);
    }
}

// Expose functions to global scope for external access
window.captureManualScreenshot = captureManualScreenshot;

function stopCapture() {
    if (screenshotInterval) {
        clearInterval(screenshotInterval);
        screenshotInterval = null;
    }

    if (audioProcessor) {
        audioProcessor.disconnect();
        audioProcessor = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    // Destroy VAD processor if active
    if (vadProcessor) {
        vadProcessor.destroy();
        vadProcessor = null;
        console.log('VAD processor destroyed');
    }

    // Reset microphone state
    microphoneEnabled = false;

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    // Stop macOS audio capture if running
    if (isMacOS) {
        ipcRenderer.invoke('stop-macos-audio').catch(err => {
            console.error('Error stopping macOS audio:', err);
        });
    }

    // Clean up hidden elements
    if (hiddenVideo) {
        hiddenVideo.pause();
        hiddenVideo.srcObject = null;
        hiddenVideo = null;
    }
    offscreenCanvas = null;
    offscreenContext = null;
}

// Send text message to Gemini with automatic screenshot (combined in one request)
async function sendTextMessage(text) {
    if (!text || text.trim().length === 0) {
        console.warn('Cannot send empty text message');
        return { success: false, error: 'Empty message' };
    }

    try {
        // Capture screenshot and get base64 data
        console.log('Capturing screenshot with text message...');

        if (!mediaStream) {
            console.error('No media stream available');
            return { success: false, error: 'No media stream' };
        }

        // Lazy init of video element if needed
        if (!hiddenVideo) {
            hiddenVideo = document.createElement('video');
            hiddenVideo.srcObject = mediaStream;
            hiddenVideo.muted = true;
            hiddenVideo.playsInline = true;
            await hiddenVideo.play();

            await new Promise(resolve => {
                if (hiddenVideo.readyState >= 2) return resolve();
                hiddenVideo.onloadedmetadata = () => resolve();
            });

            offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = hiddenVideo.videoWidth;
            offscreenCanvas.height = hiddenVideo.videoHeight;
            offscreenContext = offscreenCanvas.getContext('2d');
        }

        // Check if video is ready
        if (hiddenVideo.readyState < 2) {
            console.warn('Video not ready');
            return { success: false, error: 'Video not ready' };
        }

        offscreenContext.drawImage(hiddenVideo, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

        // Get quality setting
        let qualityValue;
        switch (currentImageQuality) {
            case 'high':
                qualityValue = 0.9;
                break;
            case 'medium':
                qualityValue = 0.7;
                break;
            case 'low':
                qualityValue = 0.5;
                break;
            default:
                qualityValue = 0.7;
        }

        // Convert canvas to base64
        const blob = await new Promise(resolve => {
            offscreenCanvas.toBlob(resolve, 'image/jpeg', qualityValue);
        });

        if (!blob) {
            console.error('Failed to create blob');
            return { success: false, error: 'Failed to create blob' };
        }

        const reader = new FileReader();
        const base64data = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        // Send both screenshot and text together in one request
        const result = await ipcRenderer.invoke('send-screenshot-with-text', {
            imageData: base64data,
            text: text.trim()
        });

        if (result.success) {
            // Track image tokens
            const imageTokens = tokenTracker.calculateImageTokens(offscreenCanvas.width, offscreenCanvas.height);
            tokenTracker.addTokens(imageTokens, 'image');
            console.log('Screenshot + text sent successfully in one request');
        } else {
            console.error('Failed to send screenshot with text:', result.error);
        }
        return result;
    } catch (error) {
        console.error('Error sending text message with screenshot:', error);
        return { success: false, error: error.message };
    }
}

// Listen for emergency erase command from main process
ipcRenderer.on('clear-sensitive-data', () => {
    console.log('Clearing renderer-side sensitive data...');
    localStorage.removeItem('apiKey');
    localStorage.removeItem('customPrompt');
    // Consider clearing IndexedDB as well for full erasure
});

// Handle shortcuts based on current view
function handleShortcut(shortcutKey) {
    const currentView = cheddar.getCurrentView();

    if (shortcutKey === 'ctrl+enter' || shortcutKey === 'cmd+enter') {
        if (currentView === 'main') {
            cheddar.element().handleStart();
        } else {
            captureManualScreenshot();
        }
    }
}

// Microphone toggle function
async function toggleMicrophone(enabled) {
    microphoneEnabled = enabled;

    // Handle macOS separately (VAD runs in main process)
    if (isMacOS) {
        try {
            const result = await ipcRenderer.invoke('toggle-macos-microphone', enabled);
            console.log('🍎 [macOS] Microphone toggle result:', result);
            return result;
        } catch (error) {
            console.error('❌ [macOS] Failed to toggle microphone:', error);
            return { success: false, error: error.message };
        }
    }

    // Handle Windows/Linux (VAD runs in renderer process)
    if (vadProcessor) {
        if (enabled) {
            // Resume VAD processor
            vadProcessor.resume();
            console.log('✅ Microphone enabled - VAD resumed');
        } else {
            // In MANUAL mode: commit audio when mic is toggled OFF
            // In AUTOMATIC mode: just pause normally
            if (vadProcessor.mode === 'manual') {
                // Check if we have recorded audio to commit
                if (vadProcessor.audioBuffer && vadProcessor.audioBuffer.length > 0) {
                    console.log('🎤 [MANUAL MODE] Mic toggled OFF - committing recorded audio');
                    vadProcessor.commit();
                } else {
                    vadProcessor.pause();
                    console.log('❌ Microphone disabled - no audio to commit');
                }
            } else {
                vadProcessor.pause();
                console.log('❌ Microphone disabled - VAD paused');
            }
        }
    } else {
        console.log(`Microphone ${enabled ? 'enabled' : 'disabled'} (no VAD processor active)`);
    }

    return { success: true, enabled: microphoneEnabled };
}

// Create reference to the main app element
const cheatingDaddyApp = document.querySelector('cheating-daddy-app');

// Consolidated cheddar object - all functions in one place
const cheddar = {
    // Element access
    element: () => cheatingDaddyApp,
    e: () => cheatingDaddyApp,

    // App reference for global shortcuts (to be set after DOMContentLoaded)
    app: null,

    // App state functions - access properties directly from the app element
    getCurrentView: () => cheatingDaddyApp.currentView,
    getLayoutMode: () => cheatingDaddyApp.layoutMode,

    // Status and response functions
    setStatus: text => cheatingDaddyApp.setStatus(text),
    setResponse: response => cheatingDaddyApp.setResponse(response),

    // Core functionality
    initializeGemini,
    startCapture,
    stopCapture,
    sendTextMessage,
    handleShortcut,
    toggleMicrophone,

    // Content protection function
    getContentProtection: () => {
        const contentProtection = localStorage.getItem('contentProtection');
        return contentProtection !== null ? contentProtection === 'true' : true;
    },

    // Platform detection
    isLinux: isLinux,
    isMacOS: isMacOS,
};

// Make it globally available
window.cheddar = cheddar;

// Set app reference after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for the custom element to be fully initialized
    setTimeout(() => {
        const appElement = document.querySelector('cheating-daddy-app');
        if (appElement) {
            cheddar.app = appElement;
            console.log('App reference set for global shortcuts');
        }
    }, 100);
});
