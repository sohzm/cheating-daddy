const { BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('os');
const { applyStealthMeasures, startTitleRandomization } = require('./stealthFeatures');

let mouseEventsIgnored = false;
let windowResizing = false;
let windowMoving = false; // Track if window is being moved manually
let resizeAnimation = null;
let lastMoveTime = 0; // Track last time window was moved
let intendedWindowSize = { width: 800, height: 450 }; // Track intended size to prevent drift
const RESIZE_ANIMATION_DURATION = 500; // milliseconds
const MOVE_COOLDOWN = 300; // milliseconds to wait after movement before allowing resize

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
    // Get layout preference (default to 'normal') - Optimal height, comfortable width
    let windowWidth = 800;
    let windowHeight = 450;

    // Store initial intended size
    intendedWindowSize = { width: windowWidth, height: windowHeight };

    const windowOptions = {
        width: windowWidth,
        height: windowHeight,
        frame: false,
        transparent: true,
        hasShadow: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hiddenInMissionControl: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // TODO: change to true
            backgroundThrottling: false,
            enableBlinkFeatures: 'GetDisplayMedia',
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        backgroundColor: '#00000000',
    };

    // Add Windows-specific options to hide from screen capture picker
    if (process.platform === 'win32') {
        // type: 'toolbar' helps hide from various Windows UI elements
        windowOptions.type = 'toolbar';
    }

    const mainWindow = new BrowserWindow(windowOptions);

    const { session, desktopCapturer } = require('electron');
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

    // Enhanced always-on-top configuration to stay above all apps including UWP apps
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Set always on top with the highest level
    // Using 'pop-up-menu' level which is higher than most apps but below screen-saver
    // This prevents hiding behind apps like WhatsApp, Unstop, etc.
    if (process.platform === 'win32') {
        // On Windows, use 'pop-up-menu' level with relative level 1
        // This keeps window above normal apps and UWP apps
        mainWindow.setAlwaysOnTop(true, 'pop-up-menu', 1);
    } else if (process.platform === 'darwin') {
        // On macOS, use 'screen-saver' for maximum visibility
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    } else {
        // Linux and other platforms
        mainWindow.setAlwaysOnTop(true, 'pop-up-menu');
    }

    // Center window at the top of the screen
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const x = Math.floor((screenWidth - windowWidth) / 2);
    const y = 0;
    mainWindow.setPosition(x, y);

    // Additional focus management to ensure window stays on top
    // Force focus periodically to maintain top position
    const maintainTopPosition = () => {
        if (!mainWindow.isDestroyed() && mainWindow.isVisible()) {
            mainWindow.moveTop();
            // Re-apply always on top to ensure it stays above everything
            if (process.platform === 'win32') {
                mainWindow.setAlwaysOnTop(true, 'pop-up-menu', 1);
            }
        }
    };

    // Check and maintain top position every 2 seconds
    const topPositionInterval = setInterval(maintainTopPosition, 2000);

    // Clean up interval when window is closed
    mainWindow.on('closed', () => {
        clearInterval(topPositionInterval);
    });

    // Handle focus-lost event to immediately restore top position
    mainWindow.on('blur', () => {
        if (!mainWindow.isDestroyed() && mainWindow.isVisible()) {
            // Small delay to avoid conflicts with other apps
            setTimeout(() => {
                if (!mainWindow.isDestroyed() && mainWindow.isVisible()) {
                    mainWindow.moveTop();
                }
            }, 100);
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../index.html'));

    // Set window title to random name if provided
    if (randomNames && randomNames.windowTitle) {
        mainWindow.setTitle(randomNames.windowTitle);
        console.log(`Set window title to: ${randomNames.windowTitle}`);
    }

    // Apply stealth measures
    applyStealthMeasures(mainWindow);

    // Start periodic title randomization for additional stealth
    startTitleRandomization(mainWindow);

    // After window is created, check for layout preference and resize if needed
    mainWindow.webContents.once('dom-ready', () => {
        setTimeout(() => {
            const defaultKeybinds = getDefaultKeybinds();
            let keybinds = defaultKeybinds;

            mainWindow.webContents
                .executeJavaScript(
                    `
                try {
                    const savedKeybinds = localStorage.getItem('customKeybinds');
                    
                    return {
                        keybinds: savedKeybinds ? JSON.parse(savedKeybinds) : null
                    };
                } catch (e) {
                    return { keybinds: null };
                }
            `
                )
                .then(async savedSettings => {
                    if (savedSettings.keybinds) {
                        keybinds = { ...defaultKeybinds, ...savedSettings.keybinds };
                    }

                    // Apply content protection setting via IPC handler
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
                    // Default to content protection enabled
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
        copyCodeBlocks: isMac ? 'Cmd+Shift+C' : 'Ctrl+Shift+C',
        emergencyErase: isMac ? 'Cmd+Shift+E' : 'Ctrl+Shift+E',
    };
}

function updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef) {
    console.log('Updating global shortcuts with:', keybinds);

    // Unregister all existing shortcuts
    globalShortcut.unregisterAll();

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const moveIncrement = Math.floor(Math.min(width, height) * 0.1);

    // Register window movement shortcuts
    const movementActions = {
        moveUp: () => {
            if (!mainWindow.isVisible()) return;
            windowMoving = true;
            lastMoveTime = Date.now();
            const [currentX, currentY] = mainWindow.getPosition();
            // CRITICAL: Always use intendedWindowSize, NOT getSize()
            // This prevents cumulative size drift from repeated movements
            mainWindow.setBounds({
                x: currentX,
                y: currentY - moveIncrement,
                width: intendedWindowSize.width,
                height: intendedWindowSize.height
            }, false);
            setTimeout(() => { windowMoving = false; }, 100);
        },
        moveDown: () => {
            if (!mainWindow.isVisible()) return;
            windowMoving = true;
            lastMoveTime = Date.now();
            const [currentX, currentY] = mainWindow.getPosition();
            // CRITICAL: Always use intendedWindowSize, NOT getSize()
            mainWindow.setBounds({
                x: currentX,
                y: currentY + moveIncrement,
                width: intendedWindowSize.width,
                height: intendedWindowSize.height
            }, false);
            setTimeout(() => { windowMoving = false; }, 100);
        },
        moveLeft: () => {
            if (!mainWindow.isVisible()) return;
            windowMoving = true;
            lastMoveTime = Date.now();
            const [currentX, currentY] = mainWindow.getPosition();
            // CRITICAL: Always use intendedWindowSize, NOT getSize()
            mainWindow.setBounds({
                x: currentX - moveIncrement,
                y: currentY,
                width: intendedWindowSize.width,
                height: intendedWindowSize.height
            }, false);
            setTimeout(() => { windowMoving = false; }, 100);
        },
        moveRight: () => {
            if (!mainWindow.isVisible()) return;
            windowMoving = true;
            lastMoveTime = Date.now();
            const [currentX, currentY] = mainWindow.getPosition();
            // CRITICAL: Always use intendedWindowSize, NOT getSize()
            mainWindow.setBounds({
                x: currentX + moveIncrement,
                y: currentY,
                width: intendedWindowSize.width,
                height: intendedWindowSize.height
            }, false);
            setTimeout(() => { windowMoving = false; }, 100);
        },
    };

    // Register each movement shortcut
    Object.keys(movementActions).forEach(action => {
        const keybind = keybinds[action];
        if (keybind) {
            try {
                globalShortcut.register(keybind, movementActions[action]);
                console.log(`Registered ${action}: ${keybind}`);
            } catch (error) {
                console.error(`Failed to register ${action} (${keybind}):`, error);
            }
        }
    });

    // Register toggle visibility shortcut
    if (keybinds.toggleVisibility) {
        try {
            globalShortcut.register(keybinds.toggleVisibility, () => {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.showInactive();
                }
            });
            console.log(`Registered toggleVisibility: ${keybinds.toggleVisibility}`);
        } catch (error) {
            console.error(`Failed to register toggleVisibility (${keybinds.toggleVisibility}):`, error);
        }
    }

    // Register toggle click-through shortcut
    if (keybinds.toggleClickThrough) {
        try {
            globalShortcut.register(keybinds.toggleClickThrough, () => {
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
            console.log(`Registered toggleClickThrough: ${keybinds.toggleClickThrough}`);
        } catch (error) {
            console.error(`Failed to register toggleClickThrough (${keybinds.toggleClickThrough}):`, error);
        }
    }

    // Register next step shortcut (either starts session or takes screenshot based on view)
    if (keybinds.nextStep) {
        try {
            globalShortcut.register(keybinds.nextStep, async () => {
                console.log('Next step shortcut triggered');
                try {
                    // Determine the shortcut key format
                    const isMac = process.platform === 'darwin';
                    const shortcutKey = isMac ? 'cmd+enter' : 'ctrl+enter';

                    // Use the new handleShortcut function
                    mainWindow.webContents.executeJavaScript(`
                        cheddar.handleShortcut('${shortcutKey}');
                    `);
                } catch (error) {
                    console.error('Error handling next step shortcut:', error);
                }
            });
            console.log(`Registered nextStep: ${keybinds.nextStep}`);
        } catch (error) {
            console.error(`Failed to register nextStep (${keybinds.nextStep}):`, error);
        }
    }

    // Register previous response shortcut
    if (keybinds.previousResponse) {
        try {
            globalShortcut.register(keybinds.previousResponse, () => {
                console.log('Previous response shortcut triggered');
                sendToRenderer('navigate-previous-response');
            });
            console.log(`Registered previousResponse: ${keybinds.previousResponse}`);
        } catch (error) {
            console.error(`Failed to register previousResponse (${keybinds.previousResponse}):`, error);
        }
    }

    // Register next response shortcut
    if (keybinds.nextResponse) {
        try {
            globalShortcut.register(keybinds.nextResponse, () => {
                console.log('Next response shortcut triggered');
                sendToRenderer('navigate-next-response');
            });
            console.log(`Registered nextResponse: ${keybinds.nextResponse}`);
        } catch (error) {
            console.error(`Failed to register nextResponse (${keybinds.nextResponse}):`, error);
        }
    }

    // Register scroll up shortcut
    if (keybinds.scrollUp) {
        try {
            globalShortcut.register(keybinds.scrollUp, () => {
                console.log('Scroll up shortcut triggered');
                sendToRenderer('scroll-response-up');
            });
            console.log(`Registered scrollUp: ${keybinds.scrollUp}`);
        } catch (error) {
            console.error(`Failed to register scrollUp (${keybinds.scrollUp}):`, error);
        }
    }

    // Register scroll down shortcut
    if (keybinds.scrollDown) {
        try {
            globalShortcut.register(keybinds.scrollDown, () => {
                console.log('Scroll down shortcut triggered');
                sendToRenderer('scroll-response-down');
            });
            console.log(`Registered scrollDown: ${keybinds.scrollDown}`);
        } catch (error) {
            console.error(`Failed to register scrollDown (${keybinds.scrollDown}):`, error);
        }
    }

    // Register copy code blocks shortcut
    if (keybinds.copyCodeBlocks) {
        try {
            globalShortcut.register(keybinds.copyCodeBlocks, () => {
                console.log('Copy code blocks shortcut triggered');
                sendToRenderer('copy-code-blocks');
            });
            console.log(`Registered copyCodeBlocks: ${keybinds.copyCodeBlocks}`);
        } catch (error) {
            console.error(`Failed to register copyCodeBlocks (${keybinds.copyCodeBlocks}):`, error);
        }
    }

    // Register emergency erase shortcut
    if (keybinds.emergencyErase) {
        try {
            globalShortcut.register(keybinds.emergencyErase, () => {
                console.log('Emergency Erase triggered!');
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.hide();

                    if (geminiSessionRef.current) {
                        geminiSessionRef.current.close();
                        geminiSessionRef.current = null;
                    }

                    sendToRenderer('clear-sensitive-data');

                    setTimeout(() => {
                        const { app } = require('electron');
                        app.quit();
                    }, 300);
                }
            });
            console.log(`Registered emergencyErase: ${keybinds.emergencyErase}`);
        } catch (error) {
            console.error(`Failed to register emergencyErase (${keybinds.emergencyErase}):`, error);
        }
    }

    // Register restart session shortcut (Ctrl+Alt+R / Cmd+Option+R)
    const isMac = process.platform === 'darwin';
    const restartShortcut = isMac ? 'Cmd+Alt+R' : 'Ctrl+Alt+R';
    try {
        globalShortcut.register(restartShortcut, () => {
            console.log('Restart session shortcut triggered');
            if (mainWindow && !mainWindow.isDestroyed()) {
                // Trigger the clear and restart function in the renderer
                mainWindow.webContents.executeJavaScript(`
                    if (window.cheddar && window.cheddar.app) {
                        window.cheddar.app.handleClearAndRestart();
                    }
                `);
            }
        });
        console.log(`Registered restart session: ${restartShortcut}`);
    } catch (error) {
        console.error(`Failed to register restart session (${restartShortcut}):`, error);
    }
}

function setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef) {
    ipcMain.on('view-changed', (event, view) => {
        if (view !== 'assistant' && !mainWindow.isDestroyed()) {
            mainWindow.setIgnoreMouseEvents(false);
        }
    });

    ipcMain.handle('window-minimize', () => {
        if (!mainWindow.isDestroyed()) {
            mainWindow.minimize();
        }
    });

    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (!mainWindow.isDestroyed()) {
            updateGlobalShortcuts(newKeybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }
    });

    ipcMain.handle('toggle-window-visibility', async event => {
        try {
            if (mainWindow.isDestroyed()) {
                return { success: false, error: 'Window has been destroyed' };
            }

            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.showInactive();
            }
            return { success: true };
        } catch (error) {
            console.error('Error toggling window visibility:', error);
            return { success: false, error: error.message };
        }
    });

    function animateWindowResize(mainWindow, targetWidth, targetHeight, layoutMode) {
        return new Promise(resolve => {
            // Check if window is destroyed before starting animation
            if (mainWindow.isDestroyed()) {
                console.log('Cannot animate resize: window has been destroyed');
                resolve();
                return;
            }

            // Clear any existing animation
            if (resizeAnimation) {
                clearInterval(resizeAnimation);
                resizeAnimation = null;
            }

            const [startWidth, startHeight] = mainWindow.getSize();
            const [startX, startY] = mainWindow.getPosition(); // Save current position

            // If already at target size, no need to animate
            if (startWidth === targetWidth && startHeight === targetHeight) {
                console.log(`Window already at target size for ${layoutMode} mode`);
                resolve();
                return;
            }

            console.log(`Starting animated resize from ${startWidth}x${startHeight} to ${targetWidth}x${targetHeight}`);

            windowResizing = true;

            // CRITICAL FIX: Do NOT use setResizable(true) on Windows!
            // It causes DPI scaling and unpredictable size changes
            // We can resize without making window resizable by using setBounds

            const frameRate = 60; // 60 FPS
            const totalFrames = Math.floor(RESIZE_ANIMATION_DURATION / (1000 / frameRate));
            let currentFrame = 0;

            const widthDiff = targetWidth - startWidth;
            const heightDiff = targetHeight - startHeight;

            resizeAnimation = setInterval(() => {
                currentFrame++;
                const progress = currentFrame / totalFrames;

                // Use easing function (ease-out)
                const easedProgress = 1 - Math.pow(1 - progress, 3);

                const currentWidth = Math.round(startWidth + widthDiff * easedProgress);
                const currentHeight = Math.round(startHeight + heightDiff * easedProgress);

                if (!mainWindow || mainWindow.isDestroyed()) {
                    clearInterval(resizeAnimation);
                    resizeAnimation = null;
                    windowResizing = false;
                    return;
                }

                // Use setBounds instead of setSize to have more control
                // This prevents Windows from applying automatic scaling
                mainWindow.setBounds({
                    x: startX,
                    y: startY,
                    width: currentWidth,
                    height: currentHeight
                }, false); // false = don't animate (we're doing our own animation)

                if (currentFrame >= totalFrames) {
                    clearInterval(resizeAnimation);
                    resizeAnimation = null;
                    windowResizing = false;

                    // Check if window is still valid before final operations
                    if (!mainWindow.isDestroyed()) {
                        // Final size with exact dimensions
                        mainWindow.setBounds({
                            x: startX,
                            y: startY,
                            width: targetWidth,
                            height: targetHeight
                        }, false);

                        // Update intended size to match the new target
                        intendedWindowSize = { width: targetWidth, height: targetHeight };
                    }

                    console.log(`Animation complete: ${targetWidth}x${targetHeight}`);
                    resolve();
                }
            }, 1000 / frameRate);
        });
    }

    ipcMain.handle('update-sizes', async event => {
        try {
            if (mainWindow.isDestroyed()) {
                return { success: false, error: 'Window has been destroyed' };
            }

            // Skip resize if window is being moved manually
            if (windowMoving) {
                console.log('Skipping resize - window is being moved');
                return { success: true };
            }

            // Skip resize if recently moved (cooldown period)
            const timeSinceLastMove = Date.now() - lastMoveTime;
            if (timeSinceLastMove < MOVE_COOLDOWN) {
                console.log(`Skipping resize - moved ${timeSinceLastMove}ms ago (cooldown: ${MOVE_COOLDOWN}ms)`);
                return { success: true };
            }

            // Skip resize if already resizing
            if (windowResizing) {
                console.log('Skipping resize - resize already in progress');
                return { success: true };
            }

            // Get current view and layout mode from renderer
            let viewName, layoutMode;
            try {
                viewName = await event.sender.executeJavaScript('cheddar.getCurrentView()');
                layoutMode = await event.sender.executeJavaScript('cheddar.getLayoutMode()');
            } catch (error) {
                console.warn('Failed to get view/layout from renderer, using defaults:', error);
                viewName = 'main';
                layoutMode = 'normal';
            }

            console.log('Size update requested for view:', viewName, 'layout:', layoutMode);

            let targetWidth, targetHeight;

            // Determine base size from layout mode - Optimal height, comfortable width
            const baseWidth = layoutMode === 'compact' ? 650 : 800;
            const baseHeight = layoutMode === 'compact' ? 350 : 450;

            // Adjust height based on view
            switch (viewName) {
                case 'customize':
                case 'settings':
                    targetWidth = baseWidth;
                    targetHeight = layoutMode === 'compact' ? 480 : 580;
                    break;
                case 'help':
                    targetWidth = baseWidth;
                    targetHeight = layoutMode === 'compact' ? 450 : 550;
                    break;
                case 'history':
                    targetWidth = baseWidth;
                    targetHeight = layoutMode === 'compact' ? 450 : 550;
                    break;
                case 'advanced':
                    targetWidth = baseWidth;
                    targetHeight = layoutMode === 'compact' ? 400 : 500;
                    break;
                case 'main':
                case 'assistant':
                case 'onboarding':
                default:
                    targetWidth = baseWidth;
                    targetHeight = baseHeight;
                    break;
            }

            const [currentWidth, currentHeight] = mainWindow.getSize();
            console.log('Current window size:', currentWidth, 'x', currentHeight);

            // If currently resizing, the animation will start from current position
            if (windowResizing) {
                console.log('Interrupting current resize animation');
            }

            await animateWindowResize(mainWindow, targetWidth, targetHeight, `${viewName} view (${layoutMode})`);

            return { success: true };
        } catch (error) {
            console.error('Error updating sizes:', error);
            return { success: false, error: error.message };
        }
    });
}

module.exports = {
    ensureDataDirectories,
    createWindow,
    getDefaultKeybinds,
    updateGlobalShortcuts,
    setupWindowIpcHandlers,
};
