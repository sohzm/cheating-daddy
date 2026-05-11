const { BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('node:path');
const storage = require('../storage');

let mouseEventsIgnored = false;

const DEFAULT_MAIN_WINDOW_SIZE = { width: 1100, height: 800 };
const MIN_WINDOW_SIZE = { width: 700, height: 320 };

// ══════════════════════════════════════════════════════════════════════════════
// RIGID-BODY MOVEMENT SYSTEM v2
// ══════════════════════════════════════════════════════════════════════════════
//
// Problem: On transparent+frameless Electron windows, calling setPosition() or
// setBounds() causes the OS window compositor (DWM on Windows, Quartz on macOS)
// to recomposite the entire window surface with per-pixel alpha blending.
// This takes 1-3 frames, during which the OLD texture lingers at the old position
// creating a visible "stretching" or "trailing edge" artifact.
//
// Solution: A multi-layered approach that eliminates compositor lag:
//
// 1. OPACITY TRICK: Set opacity to 0.99 during movement. This switches the
//    compositor from expensive per-pixel-alpha path to the fast opaque-window
//    path. The 0.01 difference is visually imperceptible but changes the
//    underlying rendering pipeline entirely.
//
// 2. CSS FREEZE: Inject a style that disables ALL CSS transitions/animations
//    in the renderer during movement. This prevents any layout thrashing or
//    transition-induced repaints that could compound the compositor lag.
//
// 3. POSITION-ONLY UPDATES: Use setPosition() instead of setBounds() to avoid
//    any possible size recalculation. Lock resizable=false during movement.
//
// 4. VSYNC-GATED: Only allow one position update per animation frame tick (16ms)
//    to prevent queue buildup in the compositor's message pipe.
//
// 5. INTEGER SNAPPING: All coordinates are Math.round()'d to avoid subpixel
//    positioning which forces additional anti-aliasing passes.
//
// 6. ATOMIC SETTLE: After movement ends, restore opacity and transitions in a
//    single synchronous batch to prevent intermediate flicker states.
//
// ══════════════════════════════════════════════════════════════════════════════

let _isMoving = false;
let _moveThrottled = false;
let _settleTimer = null;
let _cachedSize = null; // { width, height } frozen during movement
const MOVE_SETTLE_MS = 80; // Time after last move before restoring full compositing

function createWindow(sendToRenderer, geminiSessionRef) {
    let windowWidth = DEFAULT_MAIN_WINDOW_SIZE.width;
    let windowHeight = DEFAULT_MAIN_WINDOW_SIZE.height;

    const mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        minWidth: MIN_WINDOW_SIZE.width,
        minHeight: MIN_WINDOW_SIZE.height,
        resizable: true,
        frame: false,
        transparent: true,
        hasShadow: false,
        alwaysOnTop: true,
        show: false,
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

    // ── Resize guard: block ALL resize during movement ──
    mainWindow.on('will-resize', (event) => {
        if (_isMoving) {
            event.preventDefault();
        }
    });

    // Hide from Windows taskbar
    if (process.platform === 'win32') {
        try {
            mainWindow.setSkipTaskbar(true);
        } catch (error) {
            console.warn('Could not hide from taskbar:', error.message);
        }
    }

    // Hide from Mission Control on macOS
    if (process.platform === 'darwin') {
        try {
            mainWindow.setHiddenInMissionControl(true);
        } catch (error) {
            console.warn('Could not hide from Mission Control:', error.message);
        }
    }

    if (process.platform === 'win32') {
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }

    mainWindow.loadFile(path.join(__dirname, '../index.html'));

    // Show window only when renderer is painted (eliminates white flash)
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Initialize keybinds after DOM is ready
    mainWindow.webContents.once('dom-ready', () => {
        setImmediate(() => {
            const defaultKeybinds = getDefaultKeybinds();
            let keybinds = defaultKeybinds;

            const savedKeybinds = storage.getKeybinds();
            if (savedKeybinds) {
                keybinds = { ...defaultKeybinds, ...savedKeybinds };
            }

            updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef);
        });
    });

    setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef);

    return mainWindow;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOVEMENT ENGINE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Enter movement mode: switches compositor to fast path and freezes layout.
 */
function enterMovementMode(mainWindow) {
    if (_isMoving) return;
    _isMoving = true;

    // Cache current size to enforce immutability
    const bounds = mainWindow.getBounds();
    _cachedSize = { width: bounds.width, height: bounds.height };

    // Lock resize to prevent ANY size change
    mainWindow.setResizable(false);

    // ─── COMPOSITOR TRICK ───
    // Setting opacity to 0.99 on a transparent window switches DWM/Quartz
    // from per-pixel-alpha compositing (expensive, causes trailing) to
    // near-opaque fast path. Visually indistinguishable from 1.0.
    mainWindow.setOpacity(0.99);

    // ─── CSS FREEZE ───
    // Inject a style that kills ALL transitions/animations in the renderer.
    // This prevents any CSS-driven repaints during movement.
    mainWindow.webContents.insertCSS(
        `*, *::before, *::after { transition: none !important; animation: none !important; }`,
        { cssOrigin: 'user' }
    ).then(key => {
        // Store the key so we can remove it later
        mainWindow._movementCssKey = key;
    }).catch(() => {});
}

/**
 * Exit movement mode: restores full transparency and CSS transitions.
 */
function exitMovementMode(mainWindow) {
    if (!_isMoving) return;
    _isMoving = false;

    // Restore full transparency (re-enables per-pixel alpha path)
    mainWindow.setOpacity(1.0);

    // Re-enable resize
    mainWindow.setResizable(true);

    // Remove the injected CSS freeze
    if (mainWindow._movementCssKey) {
        mainWindow.webContents.removeInsertedCSS(mainWindow._movementCssKey).catch(() => {});
        mainWindow._movementCssKey = null;
    }

    // Final size enforcement: snap back if OS drifted dimensions
    if (_cachedSize) {
        const finalBounds = mainWindow.getBounds();
        if (finalBounds.width !== _cachedSize.width || finalBounds.height !== _cachedSize.height) {
            mainWindow.setBounds({
                x: finalBounds.x,
                y: finalBounds.y,
                width: _cachedSize.width,
                height: _cachedSize.height,
            });
        }
        _cachedSize = null;
    }
}

/**
 * Core movement function. Performs a single rigid-body translation.
 * - Vsync-gated (max 1 update per 16ms frame)
 * - Integer-snapped coordinates
 * - No size changes permitted
 */
function rigidMove(mainWindow, deltaX, deltaY) {
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) return;

    // ─── VSYNC GATE ───
    // Only allow one position update per frame (~16ms).
    // This prevents compositor queue buildup from rapid key repeats.
    if (_moveThrottled) return;
    _moveThrottled = true;
    setTimeout(() => { _moveThrottled = false; }, 16);

    // Enter movement mode on first call
    if (!_isMoving) {
        enterMovementMode(mainWindow);
    }

    // ─── POSITION UPDATE ───
    // Use getPosition + setPosition (NOT getBounds/setBounds) to avoid
    // any internal size recalculation path.
    const [currentX, currentY] = mainWindow.getPosition();
    const newX = Math.round(currentX + deltaX);
    const newY = Math.round(currentY + deltaY);

    // setPosition with explicit integer coordinates.
    // On macOS, passing `false` as third arg (animate) prevents AppKit animation.
    mainWindow.setPosition(newX, newY, false);

    // ─── SETTLE DEBOUNCE ───
    // Reset the settle timer on every movement. Only exit movement mode
    // after the user stops moving for MOVE_SETTLE_MS.
    clearTimeout(_settleTimer);
    _settleTimer = setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            exitMovementMode(mainWindow);
        }
    }, MOVE_SETTLE_MS);
}

// ══════════════════════════════════════════════════════════════════════════════

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

function updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef) {
    console.log('Updating global shortcuts with:', keybinds);

    globalShortcut.unregisterAll();

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    // Movement step: 5% of smallest screen dimension, integer-snapped
    const moveIncrement = Math.round(Math.min(width, height) * 0.05);

    const movementActions = {
        moveUp: () => rigidMove(mainWindow, 0, -moveIncrement),
        moveDown: () => rigidMove(mainWindow, 0, moveIncrement),
        moveLeft: () => rigidMove(mainWindow, -moveIncrement, 0),
        moveRight: () => rigidMove(mainWindow, moveIncrement, 0),
    };

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
        } catch (error) {
            console.error(`Failed to register toggleVisibility:`, error);
        }
    }

    // Register toggle click-through shortcut
    if (keybinds.toggleClickThrough) {
        try {
            globalShortcut.register(keybinds.toggleClickThrough, () => {
                mouseEventsIgnored = !mouseEventsIgnored;
                if (mouseEventsIgnored) {
                    mainWindow.setIgnoreMouseEvents(true, { forward: true });
                } else {
                    mainWindow.setIgnoreMouseEvents(false);
                }
                mainWindow.webContents.send('click-through-toggled', mouseEventsIgnored);
            });
        } catch (error) {
            console.error(`Failed to register toggleClickThrough:`, error);
        }
    }

    // Register next step shortcut
    if (keybinds.nextStep) {
        try {
            globalShortcut.register(keybinds.nextStep, async () => {
                try {
                    const isMac = process.platform === 'darwin';
                    const shortcutKey = isMac ? 'cmd+enter' : 'ctrl+enter';
                    mainWindow.webContents.executeJavaScript(`
                        cheatingDaddy.handleShortcut('${shortcutKey}');
                    `);
                } catch (error) {
                    console.error('Error handling next step shortcut:', error);
                }
            });
        } catch (error) {
            console.error(`Failed to register nextStep:`, error);
        }
    }

    // Register previous response shortcut
    if (keybinds.previousResponse) {
        try {
            globalShortcut.register(keybinds.previousResponse, () => {
                sendToRenderer('navigate-previous-response');
            });
        } catch (error) {
            console.error(`Failed to register previousResponse:`, error);
        }
    }

    // Register next response shortcut
    if (keybinds.nextResponse) {
        try {
            globalShortcut.register(keybinds.nextResponse, () => {
                sendToRenderer('navigate-next-response');
            });
        } catch (error) {
            console.error(`Failed to register nextResponse:`, error);
        }
    }

    // Register scroll up shortcut
    if (keybinds.scrollUp) {
        try {
            globalShortcut.register(keybinds.scrollUp, () => {
                sendToRenderer('scroll-response-up');
            });
        } catch (error) {
            console.error(`Failed to register scrollUp:`, error);
        }
    }

    // Register scroll down shortcut
    if (keybinds.scrollDown) {
        try {
            globalShortcut.register(keybinds.scrollDown, () => {
                sendToRenderer('scroll-response-down');
            });
        } catch (error) {
            console.error(`Failed to register scrollDown:`, error);
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
        } catch (error) {
            console.error(`Failed to register emergencyErase:`, error);
        }
    }
}

function setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef) {
    ipcMain.on('view-changed', (event, view) => {
        if (!mainWindow.isDestroyed()) {
            if (view !== 'assistant') {
                mainWindow.setIgnoreMouseEvents(false);
            }
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
}

module.exports = {
    createWindow,
    getDefaultKeybinds,
    updateGlobalShortcuts,
    setupWindowIpcHandlers,
};
