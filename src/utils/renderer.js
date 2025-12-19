// renderer.js
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

let mediaStream = null;
let screenshotInterval = null;
let audioContext = null;
let audioProcessor = null;
let micAudioProcessor = null;
let audioBuffer = [];
const SAMPLE_RATE = 24000;
const AUDIO_CHUNK_DURATION = 0.1; // seconds
const BUFFER_SIZE = 4096; // Increased buffer size for smoother audio
let audioMuted = false;
let manualScreenshotStatusBackup = null;
let manualScreenshotMode = null;

let hiddenVideo = null;
let offscreenCanvas = null;
let offscreenContext = null;
let currentImageQuality = 'medium'; // Store current image quality for manual screenshots

const isLinux = process.platform === 'linux';
const isMacOS = process.platform === 'darwin';

// ============ STORAGE API ============
// Wrapper for IPC-based storage access
const storage = {
    // Config
    async getConfig() {
        const result = await ipcRenderer.invoke('storage:get-config');
        return result.success ? result.data : {};
    },
    async setConfig(config) {
        return ipcRenderer.invoke('storage:set-config', config);
    },
    async updateConfig(key, value) {
        return ipcRenderer.invoke('storage:update-config', key, value);
    },

    // Credentials
    async getCredentials() {
        const result = await ipcRenderer.invoke('storage:get-credentials');
        return result.success ? result.data : {};
    },
    async setCredentials(credentials) {
        return ipcRenderer.invoke('storage:set-credentials', credentials);
    },
    async getApiKey() {
        const result = await ipcRenderer.invoke('storage:get-api-key');
        return result.success ? result.data : '';
    },
    async setApiKey(apiKey) {
        return ipcRenderer.invoke('storage:set-api-key', apiKey);
    },

    // Preferences
    async getPreferences() {
        const result = await ipcRenderer.invoke('storage:get-preferences');
        return result.success ? result.data : {};
    },
    async setPreferences(preferences) {
        return ipcRenderer.invoke('storage:set-preferences', preferences);
    },
    async updatePreference(key, value) {
        return ipcRenderer.invoke('storage:update-preference', key, value);
    },

    // Keybinds
    async getKeybinds() {
        const result = await ipcRenderer.invoke('storage:get-keybinds');
        return result.success ? result.data : null;
    },
    async setKeybinds(keybinds) {
        return ipcRenderer.invoke('storage:set-keybinds', keybinds);
    },

    // Sessions (History)
    async getAllSessions() {
        const result = await ipcRenderer.invoke('storage:get-all-sessions');
        return result.success ? result.data : [];
    },
    async getSession(sessionId) {
        const result = await ipcRenderer.invoke('storage:get-session', sessionId);
        return result.success ? result.data : null;
    },
    async saveSession(sessionId, data) {
        return ipcRenderer.invoke('storage:save-session', sessionId, data);
    },
    async deleteSession(sessionId) {
        return ipcRenderer.invoke('storage:delete-session', sessionId);
    },
    async deleteAllSessions() {
        return ipcRenderer.invoke('storage:delete-all-sessions');
    },

    // Clear all
    async clearAll() {
        return ipcRenderer.invoke('storage:clear-all');
    },

    // Limits
    async getTodayLimits() {
        const result = await ipcRenderer.invoke('storage:get-today-limits');
        return result.success ? result.data : { flash: { count: 0 }, flashLite: { count: 0 } };
    }
};

// Cache for preferences to avoid async calls in hot paths
let preferencesCache = null;

async function loadPreferencesCache() {
    preferencesCache = await storage.getPreferences();
    return preferencesCache;
}

// Initialize preferences cache
loadPreferencesCache();

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

function setAudioMuted(muted) {
    audioMuted = Boolean(muted);
    ipcRenderer.invoke('set-audio-muted', audioMuted).catch(err => {
        console.warn('Failed to update audio mute state:', err);
    });
    return audioMuted;
}

function getAudioMuted() {
    return audioMuted;
}

async function initializeGemini(profile = 'interview', language = 'en-US', outputLanguage = 'en-US') {
    const apiKey = await storage.getApiKey();
    if (apiKey) {
        const prefs = await storage.getPreferences();
        const success = await ipcRenderer.invoke('initialize-gemini', apiKey, prefs.customPrompt || '', profile, language, outputLanguage);
        if (success) {
            cheatingDaddy.setStatus('Live');
        } else {
            cheatingDaddy.setStatus('error');
        }
    }
}

// Listen for status updates
ipcRenderer.on('update-status', (event, status) => {
    console.log('Status update:', status);
    cheatingDaddy.setStatus(status);
});

async function startCapture(screenshotIntervalSeconds = 5, imageQuality = 'medium') {
    // Store the image quality for manual screenshots
    currentImageQuality = imageQuality;

    // Refresh preferences cache
    await loadPreferencesCache();
    const audioMode = preferencesCache.audioMode || 'speaker_only';

    try {
        if (isMacOS) {
            // On macOS, use SystemAudioDump for audio and getDisplayMedia for screen
            console.log('Starting macOS capture with SystemAudioDump...');

            // Start macOS audio capture
            const audioResult = await ipcRenderer.invoke('start-macos-audio');
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

            if (audioMode === 'mic_only' || audioMode === 'both') {
                let micStream = null;
                try {
                    micStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            sampleRate: SAMPLE_RATE,
                            channelCount: 1,
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                        },
                        video: false,
                    });
                    console.log('macOS microphone capture started');
                    setupLinuxMicProcessing(micStream);
                } catch (micError) {
                    console.warn('Failed to get microphone access on macOS:', micError);
                }
            }
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

            // Additionally get microphone input for Linux based on audio mode
            if (audioMode === 'mic_only' || audioMode === 'both') {
                let micStream = null;
                try {
                    micStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            sampleRate: SAMPLE_RATE,
                            channelCount: 1,
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                        },
                        video: false,
                    });

                    console.log('Linux microphone capture started');

                    // Setup audio processing for microphone on Linux
                    setupLinuxMicProcessing(micStream);
                } catch (micError) {
                    console.warn('Failed to get microphone access on Linux:', micError);
                    // Continue without microphone if permission denied
                }
            }

            console.log('Linux capture started - system audio:', mediaStream.getAudioTracks().length > 0, 'microphone mode:', audioMode);
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

            if (audioMode === 'mic_only' || audioMode === 'both') {
                let micStream = null;
                try {
                    micStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            sampleRate: SAMPLE_RATE,
                            channelCount: 1,
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                        },
                        video: false,
                    });
                    console.log('Windows microphone capture started');
                    setupLinuxMicProcessing(micStream);
                } catch (micError) {
                    console.warn('Failed to get microphone access on Windows:', micError);
                }
            }
        }

        console.log('MediaStream obtained:', {
            hasVideo: mediaStream.getVideoTracks().length > 0,
            hasAudio: mediaStream.getAudioTracks().length > 0,
            videoTrack: mediaStream.getVideoTracks()[0]?.getSettings(),
        });

        // Manual mode only - screenshots captured on demand via shortcut
        console.log('Manual mode enabled - screenshots will be captured on demand only');
    } catch (err) {
        console.error('Error starting capture:', err);
        cheatingDaddy.setStatus('error');
    }
}

function setupLinuxMicProcessing(micStream) {
    // Setup microphone audio processing for Linux
    const micAudioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    const micSource = micAudioContext.createMediaStreamSource(micStream);
    const micProcessor = micAudioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    let audioBuffer = [];
    const samplesPerChunk = SAMPLE_RATE * AUDIO_CHUNK_DURATION;

    micProcessor.onaudioprocess = async e => {
        if (audioMuted) {
            audioBuffer = [];
            return;
        }
        const inputData = e.inputBuffer.getChannelData(0);
        audioBuffer.push(...inputData);

        // Process audio in chunks
        while (audioBuffer.length >= samplesPerChunk) {
            const chunk = audioBuffer.splice(0, samplesPerChunk);
            const pcmData16 = convertFloat32ToInt16(chunk);
            const base64Data = arrayBufferToBase64(pcmData16.buffer);

            await ipcRenderer.invoke('send-mic-audio-content', {
                data: base64Data,
                mimeType: 'audio/pcm;rate=24000',
            });
        }
    };

    micSource.connect(micProcessor);
    micProcessor.connect(micAudioContext.destination);

    // Store processor reference for cleanup
    micAudioProcessor = micProcessor;
}

function setupLinuxSystemAudioProcessing() {
    // Setup system audio processing for Linux (from getDisplayMedia)
    audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    const source = audioContext.createMediaStreamSource(mediaStream);
    audioProcessor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    let audioBuffer = [];
    const samplesPerChunk = SAMPLE_RATE * AUDIO_CHUNK_DURATION;

    audioProcessor.onaudioprocess = async e => {
        if (audioMuted) {
            audioBuffer = [];
            return;
        }
        const inputData = e.inputBuffer.getChannelData(0);
        audioBuffer.push(...inputData);

        // Process audio in chunks
        while (audioBuffer.length >= samplesPerChunk) {
            const chunk = audioBuffer.splice(0, samplesPerChunk);
            const pcmData16 = convertFloat32ToInt16(chunk);
            const base64Data = arrayBufferToBase64(pcmData16.buffer);

            await ipcRenderer.invoke('send-audio-content', {
                data: base64Data,
                mimeType: 'audio/pcm;rate=24000',
            });
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

    let audioBuffer = [];
    const samplesPerChunk = SAMPLE_RATE * AUDIO_CHUNK_DURATION;

    audioProcessor.onaudioprocess = async e => {
        if (audioMuted) {
            audioBuffer = [];
            return;
        }
        const inputData = e.inputBuffer.getChannelData(0);
        audioBuffer.push(...inputData);

        // Process audio in chunks
        while (audioBuffer.length >= samplesPerChunk) {
            const chunk = audioBuffer.splice(0, samplesPerChunk);
            const pcmData16 = convertFloat32ToInt16(chunk);
            const base64Data = arrayBufferToBase64(pcmData16.buffer);

            await ipcRenderer.invoke('send-audio-content', {
                data: base64Data,
                mimeType: 'audio/pcm;rate=24000',
            });
        }
    };

    source.connect(audioProcessor);
    audioProcessor.connect(audioContext.destination);
}

async function captureScreenshot(imageQuality = 'medium', isManual = false) {
    console.log(`Capturing ${isManual ? 'manual' : 'automated'} screenshot...`);
    if (!mediaStream) return;

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
                });

                if (result.success) {
                    console.log(`Image sent successfully (${offscreenCanvas.width}x${offscreenCanvas.height})`);
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

const OUTPUT_PROGRAMMING_LANGUAGE_LABELS = {
    python: 'Python',
    java: 'Java',
    sql: 'SQL',
    javascript: 'JavaScript',
    cpp: 'C++',
    c: 'C',
    csharp: 'C#',
};

const MANUAL_SCREENSHOT_PROMPT_EN = programmingLanguage => `This is a coding/Low-Level Design problem. Please answer in English with the following structure:
1. Translation: Complete translation of the problem
2. Approach: What algorithm you use and your core thinking
3. Code: ${programmingLanguage} implementation, readable and optimal. Don't use generator expression.
4. Input/Output: 2 edge cases with explanations
5. Time Complexity: O(?), explain in 2 sentences
6. Space Complexity: O(?), explain in 2 sentences`;
const MANUAL_SCREENSHOT_PROMPT_ZH = programmingLanguage => `截图是题目(有可能只有部分题目)及其我的solution.中文回答.基于我的solution,回答结构如下:
1. 思路:用什么算法/数据结构来优化当前的回答?降低时间复杂度/空间复杂度?
2. 代码: 用 ${programmingLanguage} 给我完整的实现.不要把代码写在同一行,要易于理解.核心且难于理解的地方给我中文注释
3. 新的时间复杂度: O(?), 中文解释,2句话就行,这里无须换行
4. 新的空间复杂度: O(?), 中文解释,2句话就行,这里无须换行`;
const MANUAL_SCREENSHOT_MODE_PROMPTS = {
    optimization: {
        en: programmingLanguage => `The screenshot shows the question (possibly part of it) and my solution. Answer in English. Based on my solution, the answer structure is as follows:
1. Thought: What algorithm/data structure should be used to optimize the current answer?
2. Code: Implemented in ${programmingLanguage} (if possible, make modifications based on my response). Don't write the code on the same line. Make it easy to understand. Give me Chinese annotations for the core and difficult-to-understand parts
3. New time complexity: O(?)" The Chinese explanation only needs two sentences. There is no need for a line break here
4. New space complexity: O(?)" The Chinese explanation only needs two sentences. There is no need for a line break here`,
        zh: programmingLanguage => `截图是题目(可能是部分)及其我的solution.中文回答.基于我的solution,回答结构如下:
1. 思路:用什么算法/数据结构来优化当前的回答?降低时间复杂度/空间复杂度?
2. 代码: 用 ${programmingLanguage} 实现 (如果可以的话在我的回答基础上进行修改).不要把代码写在同一行,要易于理解.核心且难于理解的地方给我中文注释
3. 新的时间复杂度: O(?), 中文解释,2句话就行,这里无须换行
4. 新的空间复杂度: O(?), 中文解释,2句话就行,这里无须换行`,
    },
    review: {
        en: programmingLanguage => `Please perform a code review and answer in English with the following structure:
1. Functionality Description:
    - What the code is doing overall, summarize in 1-2 sentences
    - Explain any functions/special structures if present
2. Basic Style: Are naming conventions reasonable; any unclear or repetitive parts
3. Security & Performance: Any risks present; any obviously inefficient implementations
4. Modifications & Additions: If there are obvious deficiencies in the code, provide the code in ${programmingLanguage}
5. Suggestions:
    - Overall suggestions (1-2 sentences)
    - Basic style suggestions if there are issues
    - Security and performance suggestions if there are issues`,
        zh: programmingLanguage => `题目是进行code review,按以下结构中文回答:
1. 功能说明:
    - 代码整体在做什么,用1-2句话总结
    - 如有function/特殊结构需要解释功能
2. 基础风格:命名是否合理;有没有不清晰或者重复的部分
3. 安全&性能:是否存在风险(e.g.注入风险);是否有明显低效的实现
4. 修改&补充: 如果代码有明显缺失/需要补齐/标注缺失的地方,请给我code,使用 ${programmingLanguage}
5. 建议:
    - 总体建议(1-2句话)
    - 基础风格如有问题,给出1条建议
    - 安全和性能如有问题,给出2-3条建议`,
    },
    design: {
        en: programmingLanguage => `This is a design problem. Please answer in English with the following structure:
1. Translation: Complete translation of the problem
2. Approach: What design principles you use and your core thinking
3. Code: Use ${programmingLanguage} for the main classes and interfaces`,
        zh: programmingLanguage => `题目是一道Oriented-Object Design.请你用中文回答!
按以下结构中文回答:
1. 翻译: 直接完整翻译题目(不要bullet point)
2. 思路: 1句话概括你的思路和design pattern
3. 代码: 用 ${programmingLanguage} 实现多个class (不要抽象类). 要易于理解且比较optimal.用简易的单行注释.
4. 复杂度: 告诉我每个class主要func的时间复杂度`,
    },
};


function setManualScreenshotMode(mode) {
    manualScreenshotMode = mode;
    return manualScreenshotMode;
}

function getManualScreenshotMode() {
    return manualScreenshotMode;
}

function setManualScreenshotPendingState(isPending) {
    if (!window.cheatingDaddy?.element) return;
    const app = window.cheatingDaddy.element();
    if (!app) return;

    app.isManualScreenshotPending = isPending;
    app.requestUpdate();

    if (isPending) {
        if (manualScreenshotStatusBackup === null) {
            manualScreenshotStatusBackup = app.statusText || '';
        }
        if (window.cheatingDaddy.setStatus) {
            window.cheatingDaddy.setStatus('Analyzing screen...');
        }
    } else if (manualScreenshotStatusBackup !== null && window.cheatingDaddy.setStatus) {
        window.cheatingDaddy.setStatus(manualScreenshotStatusBackup);
        manualScreenshotStatusBackup = null;
    }
}

async function captureManualScreenshot(imageQuality = null) {
    console.log('Manual screenshot triggered');
    const quality = imageQuality || currentImageQuality;

    setManualScreenshotPendingState(true);
    window.dispatchEvent(new CustomEvent('manual-screenshot-start'));

    if (!mediaStream) {
        console.error('No media stream available');
        setManualScreenshotPendingState(false);
        window.dispatchEvent(new CustomEvent('manual-screenshot-end', { detail: { success: false } }));
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
        setManualScreenshotPendingState(false);
        window.dispatchEvent(new CustomEvent('manual-screenshot-end', { detail: { success: false } }));
        return;
    }

    offscreenContext.drawImage(hiddenVideo, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

    let qualityValue;
    switch (quality) {
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

    offscreenCanvas.toBlob(
        async blob => {
            if (!blob) {
                console.error('Failed to create blob from canvas');
                setManualScreenshotPendingState(false);
                window.dispatchEvent(new CustomEvent('manual-screenshot-end', { detail: { success: false } }));
                return;
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result.split(',')[1];

                if (!base64data || base64data.length < 100) {
                    console.error('Invalid base64 data generated');
                    setManualScreenshotPendingState(false);
                    window.dispatchEvent(new CustomEvent('manual-screenshot-end', { detail: { success: false } }));
                    return;
                }

                try {
                    const screenshotsDir = path.join(process.cwd(), 'debug_screenshots');
                    if (!fs.existsSync(screenshotsDir)) {
                        fs.mkdirSync(screenshotsDir, { recursive: true });
                    }
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const screenshotPath = path.join(screenshotsDir, `manual-${timestamp}.jpg`);
                    const imageBuffer = Buffer.from(base64data, 'base64');
                    fs.writeFileSync(screenshotPath, imageBuffer);
                    console.log('Manual screenshot saved to:', screenshotPath);
                } catch (error) {
                    console.warn('Failed to save manual screenshot locally:', error);
                }

                const prefs = await storage.getPreferences();
                const outputLanguage = prefs.selectedOutputLanguage || 'en-US';
                const outputProgrammingLanguage = prefs.selectedOutputProgrammingLanguage || 'python';
                const programmingLanguageLabel =
                    OUTPUT_PROGRAMMING_LANGUAGE_LABELS[outputProgrammingLanguage] || OUTPUT_PROGRAMMING_LANGUAGE_LABELS.python;
                const isEnglish = outputLanguage.toLowerCase().startsWith('en');
                const modePromptEntry = manualScreenshotMode
                    ? MANUAL_SCREENSHOT_MODE_PROMPTS[manualScreenshotMode]?.[isEnglish ? 'en' : 'zh']
                    : '';
                const modePrompt = typeof modePromptEntry === 'function' ? modePromptEntry(programmingLanguageLabel) : modePromptEntry;
                const prompt = modePrompt && modePrompt.trim()
                    ? modePrompt
                    : isEnglish
                        ? MANUAL_SCREENSHOT_PROMPT_EN(programmingLanguageLabel)
                        : MANUAL_SCREENSHOT_PROMPT_ZH(programmingLanguageLabel);

                // Send image with prompt to HTTP API (response streams via IPC events)
                const result = await ipcRenderer.invoke('send-image-content', {
                    data: base64data,
                    prompt: prompt,
                });

                if (result.success) {
                    console.log(`Image response completed from ${result.model}`);
                    // Response already displayed via streaming events (new-response/update-response)
                } else {
                    console.error('Failed to get image response:', result.error);
                    cheatingDaddy.addNewResponse(`Error: ${result.error}`);
                }
                setManualScreenshotPendingState(false);
                window.dispatchEvent(new CustomEvent('manual-screenshot-end', { detail: { success: result.success } }));
            };
            reader.readAsDataURL(blob);
        },
        'image/jpeg',
        qualityValue
    );
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

    // Clean up microphone audio processor (Linux only)
    if (micAudioProcessor) {
        micAudioProcessor.disconnect();
        micAudioProcessor = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

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

// Send text message to Gemini
async function sendTextMessage(text) {
    if (!text || text.trim().length === 0) {
        console.warn('Cannot send empty text message');
        return { success: false, error: 'Empty message' };
    }

    try {
        const result = await ipcRenderer.invoke('send-text-message', text);
        if (result.success) {
            console.log('Text message sent successfully');
        } else {
            console.error('Failed to send text message:', result.error);
        }
        return result;
    } catch (error) {
        console.error('Error sending text message:', error);
        return { success: false, error: error.message };
    }
}

// Listen for conversation data from main process and save to storage
ipcRenderer.on('save-conversation-turn', async (event, data) => {
    try {
        await storage.saveSession(data.sessionId, { conversationHistory: data.fullHistory });
        console.log('Conversation session saved:', data.sessionId);
    } catch (error) {
        console.error('Error saving conversation session:', error);
    }
});

// Listen for session context (profile info) when session starts
ipcRenderer.on('save-session-context', async (event, data) => {
    try {
        await storage.saveSession(data.sessionId, {
            profile: data.profile,
            customPrompt: data.customPrompt
        });
        console.log('Session context saved:', data.sessionId, 'profile:', data.profile);
    } catch (error) {
        console.error('Error saving session context:', error);
    }
});

// Listen for screen analysis responses (from ctrl+enter)
ipcRenderer.on('save-screen-analysis', async (event, data) => {
    try {
        await storage.saveSession(data.sessionId, {
            screenAnalysisHistory: data.fullHistory,
            profile: data.profile,
            customPrompt: data.customPrompt
        });
        console.log('Screen analysis saved:', data.sessionId);
    } catch (error) {
        console.error('Error saving screen analysis:', error);
    }
});

// Listen for emergency erase command from main process
ipcRenderer.on('clear-sensitive-data', async () => {
    console.log('Clearing all data...');
    await storage.clearAll();
});

// Handle shortcuts based on current view
function handleShortcut(shortcutKey) {
    const currentView = cheatingDaddy.getCurrentView();

    if (shortcutKey === 'ctrl+enter' || shortcutKey === 'cmd+enter') {
        if (currentView === 'main') {
            cheatingDaddy.element().handleStart();
        } else {
            captureManualScreenshot();
        }
    }
}

// Create reference to the main app element
const cheatingDaddyApp = document.querySelector('cheating-daddy-app');

// ============ THEME SYSTEM ============
const theme = {
    themes: {
        dark: {
            background: '#1e1e1e',
            text: '#e0e0e0', textSecondary: '#a0a0a0', textMuted: '#6b6b6b',
            border: '#333333', accent: '#ffffff',
            btnPrimaryBg: '#ffffff', btnPrimaryText: '#000000', btnPrimaryHover: '#e0e0e0',
            tooltipBg: '#1a1a1a', tooltipText: '#ffffff',
            keyBg: 'rgba(255,255,255,0.1)'
        },
        light: {
            background: '#ffffff',
            text: '#1a1a1a', textSecondary: '#555555', textMuted: '#888888',
            border: '#e0e0e0', accent: '#000000',
            btnPrimaryBg: '#1a1a1a', btnPrimaryText: '#ffffff', btnPrimaryHover: '#333333',
            tooltipBg: '#1a1a1a', tooltipText: '#ffffff',
            keyBg: 'rgba(0,0,0,0.1)'
        },
        midnight: {
            background: '#0d1117',
            text: '#c9d1d9', textSecondary: '#8b949e', textMuted: '#6e7681',
            border: '#30363d', accent: '#58a6ff',
            btnPrimaryBg: '#58a6ff', btnPrimaryText: '#0d1117', btnPrimaryHover: '#79b8ff',
            tooltipBg: '#161b22', tooltipText: '#c9d1d9',
            keyBg: 'rgba(88,166,255,0.15)'
        },
        sepia: {
            background: '#f4ecd8',
            text: '#5c4b37', textSecondary: '#7a6a56', textMuted: '#998875',
            border: '#d4c8b0', accent: '#8b4513',
            btnPrimaryBg: '#5c4b37', btnPrimaryText: '#f4ecd8', btnPrimaryHover: '#7a6a56',
            tooltipBg: '#5c4b37', tooltipText: '#f4ecd8',
            keyBg: 'rgba(92,75,55,0.15)'
        },
        nord: {
            background: '#2e3440',
            text: '#eceff4', textSecondary: '#d8dee9', textMuted: '#4c566a',
            border: '#3b4252', accent: '#88c0d0',
            btnPrimaryBg: '#88c0d0', btnPrimaryText: '#2e3440', btnPrimaryHover: '#8fbcbb',
            tooltipBg: '#3b4252', tooltipText: '#eceff4',
            keyBg: 'rgba(136,192,208,0.15)'
        },
        dracula: {
            background: '#282a36',
            text: '#f8f8f2', textSecondary: '#bd93f9', textMuted: '#6272a4',
            border: '#44475a', accent: '#ff79c6',
            btnPrimaryBg: '#ff79c6', btnPrimaryText: '#282a36', btnPrimaryHover: '#ff92d0',
            tooltipBg: '#44475a', tooltipText: '#f8f8f2',
            keyBg: 'rgba(255,121,198,0.15)'
        },
        abyss: {
            background: '#0a0a0a',
            text: '#d4d4d4', textSecondary: '#808080', textMuted: '#505050',
            border: '#1a1a1a', accent: '#ffffff',
            btnPrimaryBg: '#ffffff', btnPrimaryText: '#0a0a0a', btnPrimaryHover: '#d4d4d4',
            tooltipBg: '#141414', tooltipText: '#d4d4d4',
            keyBg: 'rgba(255,255,255,0.08)'
        }
    },

    current: 'dark',

    get(name) {
        return this.themes[name] || this.themes.dark;
    },

    getAll() {
        const names = {
            dark: 'Dark',
            light: 'Light',
            midnight: 'Midnight Blue',
            sepia: 'Sepia',
            nord: 'Nord',
            dracula: 'Dracula',
            abyss: 'Abyss'
        };
        return Object.keys(this.themes).map(key => ({
            value: key,
            name: names[key] || key,
            colors: this.themes[key]
        }));
    },

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 30, g: 30, b: 30 };
    },

    lightenColor(rgb, amount) {
        return {
            r: Math.min(255, rgb.r + amount),
            g: Math.min(255, rgb.g + amount),
            b: Math.min(255, rgb.b + amount)
        };
    },

    darkenColor(rgb, amount) {
        return {
            r: Math.max(0, rgb.r - amount),
            g: Math.max(0, rgb.g - amount),
            b: Math.max(0, rgb.b - amount)
        };
    },

    applyBackgrounds(backgroundColor, alpha = 0.8) {
        const root = document.documentElement;
        const baseRgb = this.hexToRgb(backgroundColor);

        // For light themes, darken; for dark themes, lighten
        const isLight = (baseRgb.r + baseRgb.g + baseRgb.b) / 3 > 128;
        const adjust = isLight ? this.darkenColor.bind(this) : this.lightenColor.bind(this);

        const secondary = adjust(baseRgb, 7);
        const tertiary = adjust(baseRgb, 15);
        const hover = adjust(baseRgb, 20);

        root.style.setProperty('--header-background', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--main-content-background', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--bg-primary', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--bg-secondary', `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${alpha})`);
        root.style.setProperty('--bg-tertiary', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--bg-hover', `rgba(${hover.r}, ${hover.g}, ${hover.b}, ${alpha})`);
        root.style.setProperty('--input-background', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--input-focus-background', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--hover-background', `rgba(${hover.r}, ${hover.g}, ${hover.b}, ${alpha})`);
        root.style.setProperty('--scrollbar-background', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
    },

    apply(themeName, alpha = 0.8) {
        const colors = this.get(themeName);
        this.current = themeName;
        const root = document.documentElement;
        const codePalettes = {
            dark: {
                text: '#c9d1d9',
                keyword: '#ff7b72',
                title: '#d2a8ff',
                literal: '#79c0ff',
                string: '#a5d6ff',
                builtIn: '#ffa657',
                comment: '#8b949e',
                name: '#7ee787',
                section: '#1f6feb',
                bullet: '#f2cc60',
                addition: '#aff5b4',
                additionBg: '#033a16',
                deletion: '#ffdcd7',
                deletionBg: '#67060c',
            },
            light: {
                text: '#24292f',
                keyword: '#cf222e',
                title: '#8250df',
                literal: '#0550ae',
                string: '#0a3069',
                builtIn: '#953800',
                comment: '#6e7781',
                name: '#116329',
                section: '#0969da',
                bullet: '#3d2c00',
                addition: '#116329',
                additionBg: '#dafbe1',
                deletion: '#cf222e',
                deletionBg: '#ffebe9',
            },
            midnight: {
                text: '#c9d1d9',
                keyword: '#ff7b72',
                title: '#d2a8ff',
                literal: '#79c0ff',
                string: '#a5d6ff',
                builtIn: '#ffa657',
                comment: '#8b949e',
                name: '#7ee787',
                section: '#58a6ff',
                bullet: '#f2cc60',
                addition: '#aff5b4',
                additionBg: '#033a16',
                deletion: '#ffdcd7',
                deletionBg: '#67060c',
            },
            sepia: {
                text: '#5c4b37',
                keyword: '#a63d2b',
                title: '#7a4e2f',
                literal: '#2f5f7a',
                string: '#3f6b57',
                builtIn: '#8b5a2b',
                comment: '#8e7a61',
                name: '#5b6b2a',
                section: '#2f5f7a',
                bullet: '#6b4f2a',
                addition: '#2d5f3b',
                additionBg: '#e9dcc4',
                deletion: '#8b3a2b',
                deletionBg: '#f3e2d3',
            },
            nord: {
                text: '#eceff4',
                keyword: '#bf616a',
                title: '#b48ead',
                literal: '#81a1c1',
                string: '#88c0d0',
                builtIn: '#d08770',
                comment: '#616e88',
                name: '#a3be8c',
                section: '#5e81ac',
                bullet: '#ebcb8b',
                addition: '#a3be8c',
                additionBg: '#2f3b2f',
                deletion: '#bf616a',
                deletionBg: '#3b2f2f',
            },
            dracula: {
                text: '#f8f8f2',
                keyword: '#ff79c6',
                title: '#bd93f9',
                literal: '#8be9fd',
                string: '#f1fa8c',
                builtIn: '#ffb86c',
                comment: '#6272a4',
                name: '#50fa7b',
                section: '#8be9fd',
                bullet: '#f1fa8c',
                addition: '#50fa7b',
                additionBg: '#273b2b',
                deletion: '#ff5555',
                deletionBg: '#3b2020',
            },
            abyss: {
                text: '#d4d4d4',
                keyword: '#c586c0',
                title: '#4fc1ff',
                literal: '#9cdcfe',
                string: '#ce9178',
                builtIn: '#dcdcaa',
                comment: '#6a9955',
                name: '#4ec9b0',
                section: '#569cd6',
                bullet: '#d7ba7d',
                addition: '#b5cea8',
                additionBg: '#1f3b1f',
                deletion: '#f44747',
                deletionBg: '#3b1f1f',
            },
        };
        const codePalette = codePalettes[themeName] || codePalettes.dark;

        // Text colors
        root.style.setProperty('--text-color', colors.text);
        root.style.setProperty('--text-secondary', colors.textSecondary);
        root.style.setProperty('--text-muted', colors.textMuted);
        // Border colors
        root.style.setProperty('--border-color', colors.border);
        root.style.setProperty('--border-default', colors.accent);
        // Misc
        root.style.setProperty('--placeholder-color', colors.textMuted);
        root.style.setProperty('--scrollbar-thumb', colors.border);
        root.style.setProperty('--scrollbar-thumb-hover', colors.textMuted);
        root.style.setProperty('--key-background', colors.keyBg);
        // Primary button
        root.style.setProperty('--btn-primary-bg', colors.btnPrimaryBg);
        root.style.setProperty('--btn-primary-text', colors.btnPrimaryText);
        root.style.setProperty('--btn-primary-hover', colors.btnPrimaryHover);
        // Start button (same as primary)
        root.style.setProperty('--start-button-background', colors.btnPrimaryBg);
        root.style.setProperty('--start-button-color', colors.btnPrimaryText);
        root.style.setProperty('--start-button-hover-background', colors.btnPrimaryHover);
        // Tooltip
        root.style.setProperty('--tooltip-bg', colors.tooltipBg);
        root.style.setProperty('--tooltip-text', colors.tooltipText);
        // Error color (stays constant)
        root.style.setProperty('--error-color', '#f14c4c');
        root.style.setProperty('--success-color', '#4caf50');
        // Code highlight (theme-aware)
        root.style.setProperty('--code-bg', 'var(--bg-secondary)');
        root.style.setProperty('--code-text', codePalette.text);
        root.style.setProperty('--code-keyword', codePalette.keyword);
        root.style.setProperty('--code-title', codePalette.title);
        root.style.setProperty('--code-literal', codePalette.literal);
        root.style.setProperty('--code-string', codePalette.string);
        root.style.setProperty('--code-built-in', codePalette.builtIn);
        root.style.setProperty('--code-comment', codePalette.comment);
        root.style.setProperty('--code-name', codePalette.name);
        root.style.setProperty('--code-section', codePalette.section);
        root.style.setProperty('--code-bullet', codePalette.bullet);
        root.style.setProperty('--code-addition', codePalette.addition);
        root.style.setProperty('--code-addition-bg', codePalette.additionBg);
        root.style.setProperty('--code-deletion', codePalette.deletion);
        root.style.setProperty('--code-deletion-bg', codePalette.deletionBg);

        // Also apply background colors from theme
        this.applyBackgrounds(colors.background, alpha);
    },

    async load() {
        try {
            const prefs = await storage.getPreferences();
            const themeName = prefs.theme || 'dark';
            const alpha = prefs.backgroundTransparency ?? 0.8;
            this.apply(themeName, alpha);
            return themeName;
        } catch (err) {
            this.apply('dark');
            return 'dark';
        }
    },

    async save(themeName) {
        await storage.updatePreference('theme', themeName);
        this.apply(themeName);
    }
};

// Consolidated cheatingDaddy object - all functions in one place
const cheatingDaddy = {
    // App version
    getVersion: async () => ipcRenderer.invoke('get-app-version'),

    // Element access
    element: () => cheatingDaddyApp,
    e: () => cheatingDaddyApp,

    // App state functions - access properties directly from the app element
    getCurrentView: () => cheatingDaddyApp.currentView,
    getLayoutMode: () => cheatingDaddyApp.layoutMode,

    // Status and response functions
    setStatus: text => cheatingDaddyApp.setStatus(text),
    addNewResponse: response => cheatingDaddyApp.addNewResponse(response),
    updateCurrentResponse: response => cheatingDaddyApp.updateCurrentResponse(response),

    // Core functionality
    initializeGemini,
    startCapture,
    stopCapture,
    sendTextMessage,
    handleShortcut,
    setManualScreenshotMode,
    getManualScreenshotMode,
    setAudioMuted,
    getAudioMuted,

    // Storage API
    storage,

    // Theme API
    theme,

    // Refresh preferences cache (call after updating preferences)
    refreshPreferencesCache: loadPreferencesCache,

    // Platform detection
    isLinux: isLinux,
    isMacOS: isMacOS,
};

// Make it globally available
window.cheatingDaddy = cheatingDaddy;

// Load theme after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => theme.load());
} else {
    theme.load();
}
