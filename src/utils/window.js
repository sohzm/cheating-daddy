const { BrowserWindow, globalShortcut, ipcMain, screen, app } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('os');
const { applyStealthMeasures, startTitleRandomization } = require('./stealthFeatures');

let mouseEventsIgnored = false;
let windowResizing = false;
let resizeAnimation = null;
const RESIZE_ANIMATION_DURATION = 500; // milliseconds

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

function createWindow(sendToRenderer, geminiSessionRef, randomNames = null) {
    let windowWidth = 1100;
    let windowHeight = 800;

    const mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        minWidth: 600,
        minHeight: 400,
        frame: false,
        transparent: true,
        hasShadow: true,
        alwaysOnTop: true,
        skipTaskbar: false,
        movable: true,
        resizable: true,
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

    const { session, desktopCapturer } = require('electron');
    session.defaultSession.setDisplayMediaRequestHandler(
        (request, callback) => {
            desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
                callback({ video: sources[0], audio: 'loopback' });
            });
        },
        { useSystemPicker: true }
    );

    mainWindow.setContentProtection(true);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const x = Math.floor((screenWidth - windowWidth) / 2);
    const y = 0;
    mainWindow.setPosition(x, y);

    if (process.platform === 'win32') {
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }

    mainWindow.loadFile(path.join(__dirname, '../index.html'));

    // --- Remember last window position and size ---
    const windowStateFile = path.join(app.getPath('userData'), 'window-state.json');

    try {
        if (fs.existsSync(windowStateFile)) {
            const { x, y, width, height } = JSON.parse(fs.readFileSync(windowStateFile));
            mainWindow.setBounds({ x, y, width, height });
        }
    } catch (err) {
        console.error('Error restoring window state:', err);
    }

    mainWindow.on('close', () => {
        if (!mainWindow.isDestroyed()) {
            const [x, y] = mainWindow.getPosition();
            const [width, height] = mainWindow.getSize();
            const windowState = { x, y, width, height };
            fs.writeFileSync(windowStateFile, JSON.stringify(windowState));
        }
    });

    // --- End remember position/size ---

    if (randomNames && randomNames.windowTitle) {
        mainWindow.setTitle(randomNames.windowTitle);
        console.log(`Set window title to: ${randomNames.windowTitle}`);
    }

    applyStealthMeasures(mainWindow);
    startTitleRandomization(mainWindow);

    mainWindow.webContents.once('dom-ready', () => {
        setTimeout(() => {
            const defaultKeybinds = getDefaultKeybinds();
            let keybinds = defaultKeybinds;

            mainWindow.webContents
                .executeJavaScript(`
                    try {
                        const savedKeybinds = localStorage.getItem('customKeybinds');
                        return { keybinds: savedKeybinds ? JSON.parse(savedKeybinds) : null };
                    } catch (e) {
                        return { keybinds: null };
                    }
                `)
                .then(async savedSettings => {
                    if (savedSettings.keybinds) {
                        keybinds = { ...defaultKeybinds, ...savedSettings.keybinds };
                    }

                    try {
                        const contentProtection = await mainWindow.webContents.executeJavaScript('cheddar.getContentProtection()');
                        mainWindow.setContentProtection(contentProtection);
                        console.log('Content protection loaded from settings:', contentProtection);
                    } catch (error) {
                        console.error('Error loading content protection:', error);
                        mainWindow.setContentProtection(true);
                    }

                    updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef);
                })
                .catch(() => {
                    mainWindow.setContentProtection(true);
                    updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef);
                });
        }, 150);
    });

    setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef);

    return mainWindow;
}

function getDefaultKeybinds() {
    const isMac = process.platform === 'darwin';
    return {
        moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
        moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
        moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
        moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
        toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
        toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
        nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
        previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
        nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
        scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
        scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
        emergencyErase: isMac ? 'Cmd+Shift+E' : 'Ctrl+Shift+E',
    };
}

// Keep the rest of your `updateGlobalShortcuts` and `setupWindowIpcHandlers` functions unchanged.
// No need to modify them — they’ll still work fine.

module.exports = {
    ensureDataDirectories,
    createWindow,
    getDefaultKeybinds,
    updateGlobalShortcuts,
    setupWindowIpcHandlers,
};
