if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, desktopCapturer, globalShortcut, session, ipcMain, shell, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { GoogleGenAI } = require('@google/genai');
const os = require('os');
const { spawn } = require('child_process');
const { pcmToWav, analyzeAudioBuffer, saveDebugAudio } = require('./audioUtils');
const { getSystemPrompt } = require('./utils/prompts');

let geminiSession = null;
let loopbackProc = null;
let systemAudioProc = null;
let audioIntervalTimer = null;
let mouseEventsIgnored = false;
let messageBuffer = '';

function ensureDataDirectories() {
    const homeDir = os.homedir();
    const cheddarDir = path.join(homeDir, 'cheddar');
    const dataDir = path.join(cheddarDir, 'data');
    const imageDir = path.join(dataDir, 'image');
    const audioDir = path.join(dataDir, 'audio');

    [cheddarDir, dataDir, imageDir, audioDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    return { imageDir, audioDir };
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 400,
        frame: false,
        transparent: true,
        hasShadow: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hiddenInMissionControl: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false,
            enableBlinkFeatures: 'GetDisplayMedia',
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        backgroundColor: '#00000000',
    });

    session.defaultSession.setDisplayMediaRequestHandler(
        (request, callback) => {
            desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
                callback({ video: sources[0], audio: 'loopback' });
            });
        },
        { useSystemPicker: true }
    );
    
    mainWindow.setResizable(false);
    mainWindow.setContentProtection(true);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    if (process.platform === 'win32') {
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const moveIncrement = Math.floor(Math.min(width, height) * 0.15);

    const isMac = process.platform === 'darwin';
    const modifier = isMac ? 'Alt' : 'Ctrl';
    const shortcuts = [`${modifier}+Up`, `${modifier}+Down`, `${modifier}+Left`, `${modifier}+Right`];

    shortcuts.forEach(accelerator => {
        globalShortcut.register(accelerator, () => {
            if (!mainWindow.isVisible()) {
                return;
            }
            
            const [currentX, currentY] = mainWindow.getPosition();
            let newX = currentX;
            let newY = currentY;

            switch (accelerator) {
                case `${modifier}+Up`:
                    newY -= moveIncrement;
                    break;
                case `${modifier}+Down`:
                    newY += moveIncrement;
                    break;
                case `${modifier}+Left`:
                    newX -= moveIncrement;
                    break;
                case `${modifier}+Right`:
                    newX += moveIncrement;
                    break;
            }

            mainWindow.setPosition(newX, newY);
        });
    });

    const toggleVisibilityShortcut = isMac ? 'Cmd+\\' : 'Ctrl+\\';
    globalShortcut.register(toggleVisibilityShortcut, () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
        }
    });

    const toggleShortcut = isMac ? 'Cmd+M' : 'Ctrl+M';
    globalShortcut.register(toggleShortcut, () => {
        mouseEventsIgnored = !mouseEventsIgnored;
        if (mouseEventsIgnored) {
            mainWindow.setIgnoreMouseEvents(true, { forward: true });
            console.log('Mouse events ignored');
        } else {
            mainWindow.setIgnoreMouseEvents(false);
            console.log('Mouse events enabled');
        }
        mainWindow.webContents.send('click-through-toggled', mouseEventsIgnored);
    });

    const nextStepShortcut = isMac ? 'Cmd+Enter' : 'Ctrl+Enter';
    globalShortcut.register(nextStepShortcut, async () => {
        console.log('Next step shortcut triggered');
        try {
            if (geminiSession) {
                await geminiSession.sendRealtimeInput({ text: 'What should be the next step here' });
                console.log('Sent "next step" message to Gemini');
            } else {
                console.log('No active Gemini session');
            }
        } catch (error) {
            console.error('Error sending next step message:', error);
        }
    });

    ipcMain.on('view-changed', (event, view) => {
        if (view !== 'assistant') {
            mainWindow.setIgnoreMouseEvents(false);
        }
    });

    ipcMain.handle('window-minimize', () => {
        mainWindow.minimize();
    });
}

async function initializeGeminiSession(apiKey, customPrompt = '', profile = 'interview', language = 'en-US') {
    const client = new GoogleGenAI({
        vertexai: false,
        apiKey: apiKey,
    });

    const systemPrompt = getSystemPrompt(profile, customPrompt);

    try {
        const session = await client.live.connect({
            model: 'gemini-2.0-flash-live-001',
            callbacks: {
                onopen: function () {
                    sendToRenderer('update-status', 'Connected to Gemini - Starting recording...');
                },
                onmessage: function (message) {
                    console.log(message);
                    if (message.serverContent?.modelTurn?.parts) {
                        for (const part of message.serverContent.modelTurn.parts) {
                            console.log(part);
                            if (part.text) {
                                messageBuffer += part.text;
                            }
                        }
                    }

                    if (message.serverContent?.generationComplete) {
                        sendToRenderer('update-response', messageBuffer);
                        messageBuffer = '';
                    }

                    if (message.serverContent?.turnComplete) {
                        sendToRenderer('update-status', 'Listening...');
                    }
                },
                onerror: function (e) {
                    console.debug('Error:', e.message);
                    sendToRenderer('update-status', 'Error: ' + e.message);
                },
                onclose: function (e) {
                    console.debug('Session closed:', e.reason);
                    sendToRenderer('update-status', 'Session closed');
                },
            },
            config: {
                responseModalities: ['TEXT'],
                speechConfig: { languageCode: language },
                systemInstruction: {
                    parts: [{ text: systemPrompt }],
                },
            },
        });

        geminiSession = session;
        return true;
    } catch (error) {
        console.error('Failed to initialize Gemini session:', error);
        return false;
    }
}

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

function startMacOSAudioCapture() {
    if (process.platform !== 'darwin') return false;

    console.log('Starting macOS audio capture with SystemAudioDump...');

    let systemAudioPath;
    if (app.isPackaged) {
        systemAudioPath = path.join(process.resourcesPath, 'SystemAudioDump');
    } else {
        systemAudioPath = path.join(__dirname, 'SystemAudioDump');
    }

    console.log('SystemAudioDump path:', systemAudioPath);

    systemAudioProc = spawn(systemAudioPath, [], {
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!systemAudioProc.pid) {
        console.error('Failed to start SystemAudioDump');
        return false;
    }

    console.log('SystemAudioDump started with PID:', systemAudioProc.pid);

    const CHUNK_DURATION = 0.1;
    const SAMPLE_RATE = 24000;
    const BYTES_PER_SAMPLE = 2;
    const CHANNELS = 2;
    const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * CHUNK_DURATION;

    let audioBuffer = Buffer.alloc(0);

    systemAudioProc.stdout.on('data', data => {
        audioBuffer = Buffer.concat([audioBuffer, data]);

        while (audioBuffer.length >= CHUNK_SIZE) {
            const chunk = audioBuffer.slice(0, CHUNK_SIZE);
            audioBuffer = audioBuffer.slice(CHUNK_SIZE);

            const monoChunk = CHANNELS === 2 ? convertStereoToMono(chunk) : chunk;
            const base64Data = monoChunk.toString('base64');
            sendAudioToGemini(base64Data);

            if (process.env.DEBUG_AUDIO) {
                console.log(`Processed audio chunk: ${chunk.length} bytes`);
                saveDebugAudio(monoChunk, 'system_audio');
            }
        }

        const maxBufferSize = SAMPLE_RATE * BYTES_PER_SAMPLE * 1;
        if (audioBuffer.length > maxBufferSize) {
            audioBuffer = audioBuffer.slice(-maxBufferSize);
        }
    });

    systemAudioProc.stderr.on('data', data => {
        console.error('SystemAudioDump stderr:', data.toString());
    });

    systemAudioProc.on('close', code => {
        console.log('SystemAudioDump process closed with code:', code);
        systemAudioProc = null;
    });

    systemAudioProc.on('error', err => {
        console.error('SystemAudioDump process error:', err);
        systemAudioProc = null;
    });

    return true;
}

function convertStereoToMono(stereoBuffer) {
    const samples = stereoBuffer.length / 4;
    const monoBuffer = Buffer.alloc(samples * 2);

    for (let i = 0; i < samples; i++) {
        const leftSample = stereoBuffer.readInt16LE(i * 4);
        monoBuffer.writeInt16LE(leftSample, i * 2);
    }

    return monoBuffer;
}

function stopMacOSAudioCapture() {
    if (systemAudioProc) {
        console.log('Stopping SystemAudioDump...');
        systemAudioProc.kill('SIGTERM');
        systemAudioProc = null;
    }
}

async function sendAudioToGemini(base64Data) {
    if (!geminiSession) return;

    try {
        process.stdout.write('.');
        await geminiSession.sendRealtimeInput({
            audio: {
                data: base64Data,
                mimeType: 'audio/pcm;rate=24000',
            },
        });
    } catch (error) {
        console.error('Error sending audio to Gemini:', error);
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    stopMacOSAudioCapture();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopMacOSAudioCapture();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle('initialize-gemini', async (event, apiKey, customPrompt, profile = 'interview', language = 'en-US') => {
    return await initializeGeminiSession(apiKey, customPrompt, profile, language);
});

ipcMain.handle('send-audio-content', async (event, { data, mimeType }) => {
    if (!geminiSession) return { success: false, error: 'No active Gemini session' };
    try {
        process.stdout.write('.');
        await geminiSession.sendRealtimeInput({
            audio: { data: data, mimeType: mimeType },
        });
        return { success: true };
    } catch (error) {
        console.error('Error sending audio:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('send-image-content', async (event, { data, debug }) => {
    if (!geminiSession) return { success: false, error: 'No active Gemini session' };

    try {
        if (!data || typeof data !== 'string') {
            console.error('Invalid image data received');
            return { success: false, error: 'Invalid image data' };
        }

        const buffer = Buffer.from(data, 'base64');

        if (buffer.length < 1000) {
            console.error(`Image buffer too small: ${buffer.length} bytes`);
            return { success: false, error: 'Image buffer too small' };
        }

        process.stdout.write('!');
        await geminiSession.sendRealtimeInput({
            media: { data: data, mimeType: 'image/jpeg' },
        });

        return { success: true };
    } catch (error) {
        console.error('Error sending image:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('send-text-message', async (event, text) => {
    if (!geminiSession) return { success: false, error: 'No active Gemini session' };

    try {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return { success: false, error: 'Invalid text message' };
        }

        console.log('Sending text message:', text);
        await geminiSession.sendRealtimeInput({ text: text.trim() });
        return { success: true };
    } catch (error) {
        console.error('Error sending text:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('start-macos-audio', async event => {
    if (process.platform !== 'darwin') {
        return {
            success: false,
            error: 'macOS audio capture only available on macOS',
        };
    }

    try {
        const success = startMacOSAudioCapture();
        return { success };
    } catch (error) {
        console.error('Error starting macOS audio capture:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('stop-macos-audio', async event => {
    try {
        stopMacOSAudioCapture();
        return { success: true };
    } catch (error) {
        console.error('Error stopping macOS audio capture:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('close-session', async event => {
    try {
        stopMacOSAudioCapture();

        // Cleanup any pending resources and stop audio/video capture
        if (geminiSession) {
            await geminiSession.close();
            geminiSession = null;
        }

        return { success: true };
    } catch (error) {
        console.error('Error closing session:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('quit-application', async event => {
    try {
        stopMacOSAudioCapture();
        app.quit();
        return { success: true };
    } catch (error) {
        console.error('Error quitting application:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('open-external', async (event, url) => {
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        console.error('Error opening external URL:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('toggle-window-visibility', async (event) => {
    try {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            const mainWindow = windows[0];
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
            }
        }
        return { success: true };
    } catch (error) {
        console.error('Error toggling window visibility:', error);
        return { success: false, error: error.message };
    }
});
