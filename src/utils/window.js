const { BrowserWindow, globalShortcut, ipcMain, screen, app } = require('electron');
const path = require('node:path');
const storage = require('../storage');

let mouseEventsIgnored = false;
let _programmaticMove = false;
let _moveDebounce = null;
let _pendingDx = 0;
let _pendingDy = 0;
let _moveScheduled = false;

const KEYBINDS_VERSION = 4; // Increment when default keybinds change

const DEFAULT_MAIN_WINDOW_SIZE = { width: 1100, height: 800 };
const MIN_WINDOW_SIZE = { width: 400, height: 260 };

// Hard safety limits - these cannot be exceeded regardless of user settings.
// Prevents GPU crashes from oversized transparent windows on Windows.
const HARD_LIMITS = {
    scaleMax: 1.5,
    scaleMin: 0.2,
    zoomMax: 2.0,
    zoomMin: 0.3,
    opacityMax: 1.0,
    opacityMin: 0.2,
    // Minimum step values to prevent rapid-fire redraws
    scaleStepMin: 0.05,
    zoomStepMin: 0.05,
    opacityStepMin: 0.05,
};

// ──────────────────────────────────────────────────────────────
// Default keybinds — full action set
// ──────────────────────────────────────────────────────────────

function getDefaultKeybinds() {
    const isMac = process.platform === 'darwin';
    return {
        // ── Window movement ──
        moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
        moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
        moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
        moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
        // ── Visibility ──
        toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
        toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
        // ── Scale (window size) ──
        scaleUp: isMac ? 'Cmd+Shift+=' : 'Ctrl+Shift+=',
        scaleDown: isMac ? 'Cmd+Shift+-' : 'Ctrl+Shift+-',
        // ── Zoom (content) ──
        zoomIn: isMac ? 'Cmd+=' : 'Ctrl+=',
        zoomOut: isMac ? 'Cmd+-' : 'Ctrl+-',
        zoomReset: isMac ? 'Cmd+0' : 'Ctrl+0',
        // ── Opacity ──
        opacityUp: isMac ? 'Cmd+Shift+]' : 'Ctrl+Shift+]',
        opacityDown: isMac ? 'Cmd+Shift+[' : 'Ctrl+Shift+[',
        // ── Session ──
        nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
        // Response navigation: Ctrl+Shift+Left / Ctrl+Shift+Right
        previousResponse: isMac ? 'Cmd+Shift+Left' : 'Ctrl+Shift+Left',
        nextResponse: isMac ? 'Cmd+Shift+Right' : 'Ctrl+Shift+Right',
        // Scroll: Ctrl+[ / Ctrl+]
        scrollUp: isMac ? 'Cmd+[' : 'Ctrl+[',
        scrollDown: isMac ? 'Cmd+]' : 'Ctrl+]',
        // ── Audio ──
        toggleVoice: isMac ? 'Cmd+Shift+L' : 'Ctrl+Shift+L',
        // ── Dev ──
        reloadApp: isMac ? 'Cmd+Shift+R' : 'Ctrl+Shift+R',
        devRefresh: isMac ? 'Cmd+Shift+E' : 'Ctrl+Shift+E',
        // ── Global Controls ──
        themeToggle: isMac ? 'Cmd+Shift+T' : 'Ctrl+Shift+T',
        fontSizeUp: isMac ? 'Cmd+Shift+0' : 'Ctrl+Shift+0',
        fontSizeDown: isMac ? 'Cmd+Shift+9' : 'Ctrl+Shift+9',
        aiModeToggle: isMac ? 'Cmd+Shift+U' : 'Ctrl+Shift+U',
        // ── Emergency ──
        emergencyQuit: isMac ? 'Cmd+Q' : 'Ctrl+Q',
        // ── Model Management ──
        debugToggle: 'Alt+D',
        cycleSolutionModel: isMac ? 'Cmd+Y' : 'Ctrl+Y',
        cycleExtractionModel: isMac ? "Cmd+'" : "Ctrl+'",
    };
}

// ──────────────────────────────────────────────────────────────
// Window creation
// ──────────────────────────────────────────────────────────────

function createWindow(sendToRenderer, geminiSessionRef) {
    const winState = storage.getWindowState();
    const baseW = Math.round(DEFAULT_MAIN_WINDOW_SIZE.width * (winState.scale || 1.0));
    const baseH = Math.round(DEFAULT_MAIN_WINDOW_SIZE.height * (winState.scale || 1.0));

    const mainWindow = new BrowserWindow({
        width: Math.max(MIN_WINDOW_SIZE.width, baseW),
        height: Math.max(MIN_WINDOW_SIZE.height, baseH),
        x: winState.x ?? undefined,
        y: winState.y ?? undefined,
        minWidth: MIN_WINDOW_SIZE.width,
        minHeight: MIN_WINDOW_SIZE.height,
        resizable: true,
        frame: false,
        transparent: true,
        hasShadow: false,
        alwaysOnTop: true,
        paintWhenInitiallyHidden: false,
        opacity: winState.opacity ?? 1.0,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false,
            enableBlinkFeatures: 'GetDisplayMedia',
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        backgroundColor: '#01010101',
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

    if (process.platform === 'win32') {
        try {
            mainWindow.setSkipTaskbar(true);
        } catch (_) {}
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
        // Prevent DWM from initiating its own animation on programmatic moves
        mainWindow.on('will-move', e => {
            if (_programmaticMove) e.preventDefault();
        });
        // Disable user-drag to prevent OS rubber-banding; programmatic setBounds still works
        mainWindow.setMovable(false);
    }
    if (process.platform === 'darwin') {
        try {
            mainWindow.setHiddenInMissionControl(true);
        } catch (_) {}
    }

    mainWindow.loadFile(path.join(__dirname, '../index.html'));
    mainWindow.webContents.setFrameRate(60);

    // Apply persisted zoom after DOM ready
    mainWindow.webContents.once('dom-ready', () => {
        const z = storage.getWindowState().zoom ?? 1.0;
        try {
            mainWindow.webContents.setZoomFactor(z);
        } catch (_) {}

        setTimeout(() => {
            const defaultKB = getDefaultKeybinds();
            const saved = storage.getKeybinds();
            let keybinds;
            // If saved keybinds exist but are from an older version, reset to defaults
            if (saved && saved._version === KEYBINDS_VERSION) {
                keybinds = { ...defaultKB, ...saved };
            } else {
                keybinds = { ...defaultKB, _version: KEYBINDS_VERSION };
                storage.setKeybinds(keybinds);
            }
            updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }, 100);
    });

    // Persist window position on user-initiated move (drag) only
    let _userMoveTimer = null;
    mainWindow.on('moved', () => {
        if (_programmaticMove) return;
        if (_userMoveTimer) clearTimeout(_userMoveTimer);
        _userMoveTimer = setTimeout(() => {
            if (!mainWindow.isDestroyed()) {
                const [x, y] = mainWindow.getPosition();
                storage.setWindowState({ x, y });
            }
        }, 250);
    });

    // Persist window size on resize (debounced)
    let _resizeTimer = null;
    mainWindow.on('resized', () => {
        if (_resizeTimer) clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(() => {
            if (!mainWindow.isDestroyed()) {
                const [w, h] = mainWindow.getSize();
                const scale = w / DEFAULT_MAIN_WINDOW_SIZE.width;
                storage.setWindowState({ scale });
            }
        }, 250);
    });

    setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef);
    return mainWindow;
}

// ──────────────────────────────────────────────────────────────
// Hotkey registration
// ──────────────────────────────────────────────────────────────

function updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef) {
    globalShortcut.unregisterAll();

    const winState = () => storage.getWindowState();

    function tryRegister(action, kb, handler) {
        if (!kb) return;
        if (action.startsWith('_')) return;
        try {
            const success = globalShortcut.register(kb, handler);
            if (!success) {
                console.warn(`Shortcut ${action} (${kb}) failed to register`);
            }
        } catch (e) {
            console.error(`Failed to register ${action} (${kb}):`, e.message);
        }
    }

    // ── Emergency Quit — always registered, no guards ──
    tryRegister('emergencyQuit', keybinds.emergencyQuit, () => {
        try {
            const { stopMacOSAudioCapture } = require('./gemini');
            stopMacOSAudioCapture();
        } catch (_) {}
        app.exit(0);
    });

    // ── Movement ──
    const moveActions = {
        moveUp: () => safeMove(mainWindow, 0, -Math.max(10, winState().moveStep)),
        moveDown: () => safeMove(mainWindow, 0, +Math.max(10, winState().moveStep)),
        moveLeft: () => safeMove(mainWindow, -Math.max(10, winState().moveStep), 0),
        moveRight: () => safeMove(mainWindow, +Math.max(10, winState().moveStep), 0),
    };
    for (const [action, fn] of Object.entries(moveActions)) {
        if (winState().moveEnabled !== false) tryRegister(action, keybinds[action], fn);
    }

    // ── Visibility ──
    tryRegister('toggleVisibility', keybinds.toggleVisibility, () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.showInactive();
        }
        storage.updateWindowState('visible', mainWindow.isVisible());
    });

    tryRegister('toggleClickThrough', keybinds.toggleClickThrough, () => {
        mouseEventsIgnored = !mouseEventsIgnored;
        mainWindow.setIgnoreMouseEvents(mouseEventsIgnored, { forward: true });
        mainWindow.webContents.send('click-through-toggled', mouseEventsIgnored);
    });

    // ── Scale (window size — grows/shrinks from centre) ──
    if (winState().scaleEnabled !== false) {
        tryRegister('scaleUp', keybinds.scaleUp, () => {
            const step = Math.max(HARD_LIMITS.scaleStepMin, winState().scaleStep ?? 0.1);
            applyScale(mainWindow, step, winState().scaleMax ?? 1.5);
        });
        tryRegister('scaleDown', keybinds.scaleDown, () => {
            const step = Math.max(HARD_LIMITS.scaleStepMin, winState().scaleStep ?? 0.1);
            applyScale(mainWindow, -step, winState().scaleMin ?? 0.3);
        });
    }

    // ── Zoom (content) ──
    if (winState().zoomEnabled !== false) {
        tryRegister('zoomIn', keybinds.zoomIn, () => {
            const step = Math.max(HARD_LIMITS.zoomStepMin, winState().zoomStep ?? 0.1);
            applyZoom(mainWindow, step, winState().zoomMax ?? 2.0);
        });
        tryRegister('zoomOut', keybinds.zoomOut, () => {
            const step = Math.max(HARD_LIMITS.zoomStepMin, winState().zoomStep ?? 0.1);
            applyZoom(mainWindow, -step, winState().zoomMin ?? 0.5);
        });
        tryRegister('zoomReset', keybinds.zoomReset, () => {
            mainWindow.webContents.setZoomFactor(1.0);
            storage.updateWindowState('zoom', 1.0);
            sendToRenderer('zoom-changed', 1.0);
        });
    }

    // ── Opacity ──
    if (winState().opacityEnabled !== false) {
        tryRegister('opacityUp', keybinds.opacityUp, () => {
            const step = Math.max(HARD_LIMITS.opacityStepMin, winState().opacityStep ?? 0.05);
            applyOpacity(mainWindow, step, winState().opacityMax ?? 1.0);
        });
        tryRegister('opacityDown', keybinds.opacityDown, () => {
            const step = Math.max(HARD_LIMITS.opacityStepMin, winState().opacityStep ?? 0.05);
            applyOpacity(mainWindow, -step, winState().opacityMin ?? 0.2);
        });
    }

    // ── Session ──
    if (winState().sessionEnabled !== false) {
        tryRegister('nextStep', keybinds.nextStep, () => {
            const isMac = process.platform === 'darwin';
            const key = isMac ? 'cmd+enter' : 'ctrl+enter';
            mainWindow.webContents.executeJavaScript(`cheatingDaddy.handleShortcut('${key}');`).catch(() => {});
        });
        tryRegister('previousResponse', keybinds.previousResponse, () => sendToRenderer('navigate-previous-response'));
        tryRegister('nextResponse', keybinds.nextResponse, () => sendToRenderer('navigate-next-response'));
        tryRegister('scrollUp', keybinds.scrollUp, () => sendToRenderer('scroll-response-up'));
        tryRegister('scrollDown', keybinds.scrollDown, () => sendToRenderer('scroll-response-down'));
    }

    // ── Voice ──
    if (winState().voiceToggleEnabled !== false) {
        tryRegister('toggleVoice', keybinds.toggleVoice, () => {
            const enabled = !(winState().voiceEnabled ?? true);
            storage.updateWindowState('voiceEnabled', enabled);
            sendToRenderer('voice-toggled', enabled);
        });
    }

    // ── Dev / Reload ──
    if (winState().reloadEnabled !== false) {
        tryRegister('reloadApp', keybinds.reloadApp, () => {
            mainWindow.webContents.reload();
        });
        // devRefresh: full app restart
        tryRegister('devRefresh', keybinds.devRefresh, () => {
            app.relaunch();
            app.exit(0);
        });
    }

    // ── Global Controls ──
    tryRegister('themeToggle', keybinds.themeToggle, () => {
        sendToRenderer('theme-toggled');
    });

    tryRegister('fontSizeUp', keybinds.fontSizeUp, () => {
        const prefs = storage.getPreferences();
        let fontSize = parseInt(prefs.fontSize, 10);
        if (isNaN(fontSize)) fontSize = 20;
        const newSize = Math.min(48, fontSize + 1);
        storage.updatePreference('fontSize', newSize);
        sendToRenderer('font-size-changed', newSize);
    });

    tryRegister('fontSizeDown', keybinds.fontSizeDown, () => {
        const prefs = storage.getPreferences();
        let fontSize = parseInt(prefs.fontSize, 10);
        if (isNaN(fontSize)) fontSize = 20;
        const newSize = Math.max(8, fontSize - 1);
        storage.updatePreference('fontSize', newSize);
        sendToRenderer('font-size-changed', newSize);
    });

    tryRegister('aiModeToggle', keybinds.aiModeToggle, () => {
        if (geminiSessionRef && geminiSessionRef.current) {
            sendToRenderer('ai-mode-toggle-blocked');
            return;
        }
        const prefs = storage.getPreferences();
        const current = prefs.providerMode || 'byok';
        const newMode = current === 'byok' ? 'local' : 'byok';
        storage.updatePreference('providerMode', newMode);
        sendToRenderer('ai-mode-toggled', newMode);
    });

    // ── Model Management ──
    tryRegister('debugToggle', keybinds.debugToggle, () => {
        const prefs = storage.getPreferences();
        const enabled = !prefs.debugModeEnabled;
        storage.updatePreference('debugModeEnabled', enabled);
        sendToRenderer('debug-mode-toggled', enabled);
    });

    tryRegister('cycleSolutionModel', keybinds.cycleSolutionModel, () => {
        const prefs = storage.getPreferences();
        const models = storage.GEMINI_MODELS;
        const current = prefs.modelSolution || models[0].id;
        const idx = models.findIndex(m => m.id === current);
        const next = models[(idx + 1) % models.length].id;
        storage.updatePreference('modelSolution', next);
        sendToRenderer('model-changed', { task: 'solution', model: next });
    });

    tryRegister('cycleExtractionModel', keybinds.cycleExtractionModel, () => {
        const prefs = storage.getPreferences();
        const models = storage.GEMINI_MODELS;
        const current = prefs.modelExtraction || models[0].id;
        const idx = models.findIndex(m => m.id === current);
        const next = models[(idx + 1) % models.length].id;
        storage.updatePreference('modelExtraction', next);
        sendToRenderer('model-changed', { task: 'extraction', model: next });
    });
}

// ──────────────────────────────────────────────────────────────
// Helpers — scale, zoom, opacity, move
// ──────────────────────────────────────────────────────────────

function safeMove(win, dx, dy) {
    if (!win.isVisible()) return;
    // Accumulate movement deltas for coalescing during rapid key repeat
    _pendingDx += dx;
    _pendingDy += dy;
    if (!_moveScheduled) {
        _moveScheduled = true;
        setImmediate(() => {
            _moveScheduled = false;
            const flushDx = _pendingDx;
            const flushDy = _pendingDy;
            _pendingDx = 0;
            _pendingDy = 0;
            if (win.isDestroyed() || !win.isVisible()) return;
            const bounds = win.getBounds();
            const nx = bounds.x + flushDx;
            const ny = bounds.y + flushDy;
            _programmaticMove = true;
            // Use setBounds with same width/height - this is atomic and avoids
            // the DWM stretch effect that happens with separate setPosition calls
            // on transparent frameless windows on Windows.
            win.setBounds({ x: nx, y: ny, width: bounds.width, height: bounds.height });
            setImmediate(() => {
                _programmaticMove = false;
            });
        });
    }
    // Debounce storage persistence to prevent disk thrashing during rapid key repeat
    if (_moveDebounce) clearTimeout(_moveDebounce);
    _moveDebounce = setTimeout(() => {
        if (!win.isDestroyed()) {
            const finalBounds = win.getBounds();
            storage.setWindowState({ x: finalBounds.x, y: finalBounds.y });
        }
    }, 150);
}

/**
 * Scale the window uniformly from its centre.
 * delta: positive = grow, negative = shrink
 */
function applyScale(win, delta, limit) {
    const ws = storage.getWindowState();
    const current = ws.scale ?? 1.0;
    // Enforce hard limits
    const effectiveLimit = delta > 0 ? Math.min(limit, HARD_LIMITS.scaleMax) : Math.max(limit, HARD_LIMITS.scaleMin);
    const next = delta > 0 ? Math.min(current + Math.abs(delta), effectiveLimit) : Math.max(current - Math.abs(delta), effectiveLimit);
    if (next === current) return;

    const [cx, cy] = win.getPosition();
    const [cw, ch] = win.getSize();

    const nw = Math.round(DEFAULT_MAIN_WINDOW_SIZE.width * next);
    const nh = Math.round(DEFAULT_MAIN_WINDOW_SIZE.height * next);
    const nw2 = Math.max(MIN_WINDOW_SIZE.width, nw);
    const nh2 = Math.max(MIN_WINDOW_SIZE.height, nh);

    const nx = Math.round(cx + (cw - nw2) / 2);
    const ny = Math.round(cy + (ch - nh2) / 2);

    win.setBounds({ x: nx, y: ny, width: nw2, height: nh2 });
    storage.setWindowState({ scale: next, x: nx, y: ny });

    const { BrowserWindow: BW } = require('electron');
    const windows = BW.getAllWindows();
    for (const w of windows) w.webContents.send('scale-changed', next);
}

function applyZoom(win, delta, limit) {
    const ws = storage.getWindowState();
    const current = ws.zoom ?? 1.0;
    // Enforce hard limits
    const effectiveLimit = delta > 0 ? Math.min(limit, HARD_LIMITS.zoomMax) : Math.max(limit, HARD_LIMITS.zoomMin);
    const next =
        delta > 0
            ? Math.min(parseFloat((current + Math.abs(delta)).toFixed(2)), effectiveLimit)
            : Math.max(parseFloat((current - Math.abs(delta)).toFixed(2)), effectiveLimit);
    if (next === current) return;
    try {
        win.webContents.setZoomFactor(next);
    } catch (_) {}
    storage.updateWindowState('zoom', next);
    win.webContents.send('zoom-changed', next);
}

function applyOpacity(win, delta, limit) {
    const ws = storage.getWindowState();
    const current = ws.opacity ?? 1.0;
    // Enforce hard limits
    const effectiveLimit = delta > 0 ? Math.min(limit, HARD_LIMITS.opacityMax) : Math.max(limit, HARD_LIMITS.opacityMin);
    const next =
        delta > 0
            ? Math.min(parseFloat((current + Math.abs(delta)).toFixed(2)), effectiveLimit)
            : Math.max(parseFloat((current - Math.abs(delta)).toFixed(2)), effectiveLimit);
    if (next === current) return;
    try {
        win.setOpacity(next);
    } catch (_) {}
    storage.updateWindowState('opacity', next);
    win.webContents.send('opacity-changed', next);
}

// ──────────────────────────────────────────────────────────────
// IPC handlers
// ──────────────────────────────────────────────────────────────

function setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef) {
    ipcMain.on('view-changed', (event, view) => {
        if (!mainWindow.isDestroyed() && view !== 'assistant') {
            mainWindow.setIgnoreMouseEvents(false);
        }
    });

    ipcMain.handle('window-minimize', () => {
        if (!mainWindow.isDestroyed()) mainWindow.minimize();
    });

    ipcMain.handle('toggle-window-visibility', () => {
        if (mainWindow.isDestroyed()) return { success: false };
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.showInactive();
        }
        return { success: true };
    });

    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (!mainWindow.isDestroyed()) {
            storage.setKeybinds(newKeybinds);
            updateGlobalShortcuts(newKeybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }
    });

    // ── Window state getters/setters ──
    ipcMain.handle('window:get-state', () => storage.getWindowState());

    ipcMain.handle('window:set-state', (event, patch) => {
        storage.setWindowState(patch);
        _applyStatePatch(mainWindow, patch);
        return { success: true };
    });

    ipcMain.handle('window:update-keybinds', (event, keybinds) => {
        storage.setKeybinds(keybinds);
        updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef);
        return { success: true };
    });

    ipcMain.handle('window:reset-keybinds', () => {
        const defaults = getDefaultKeybinds();
        storage.setKeybinds(defaults);
        updateGlobalShortcuts(defaults, mainWindow, sendToRenderer, geminiSessionRef);
        return { success: true, keybinds: defaults };
    });

    ipcMain.handle('window:set-scale', (event, scale) => {
        const clamped = Math.max(HARD_LIMITS.scaleMin, Math.min(HARD_LIMITS.scaleMax, scale));
        const ws = storage.getWindowState();
        applyScale(mainWindow, clamped - (ws.scale ?? 1.0), HARD_LIMITS.scaleMax);
        return { success: true };
    });

    ipcMain.handle('window:set-zoom', (event, zoom) => {
        const clamped = Math.max(HARD_LIMITS.zoomMin, Math.min(HARD_LIMITS.zoomMax, zoom));
        try {
            mainWindow.webContents.setZoomFactor(clamped);
        } catch (_) {}
        storage.updateWindowState('zoom', clamped);
        mainWindow.webContents.send('zoom-changed', clamped);
        return { success: true };
    });

    ipcMain.handle('window:set-opacity', (event, opacity) => {
        const clamped = Math.max(HARD_LIMITS.opacityMin, Math.min(HARD_LIMITS.opacityMax, opacity));
        try {
            mainWindow.setOpacity(clamped);
        } catch (_) {}
        storage.updateWindowState('opacity', clamped);
        mainWindow.webContents.send('opacity-changed', clamped);
        return { success: true };
    });

    ipcMain.handle('window:set-voice', (event, enabled) => {
        storage.updateWindowState('voiceEnabled', enabled);
        sendToRenderer('voice-toggled', enabled);
        return { success: true };
    });
}

function _applyStatePatch(win, patch) {
    if (patch.opacity !== undefined) {
        const clamped = Math.max(HARD_LIMITS.opacityMin, Math.min(HARD_LIMITS.opacityMax, patch.opacity));
        try {
            win.setOpacity(clamped);
        } catch (_) {}
    }
    if (patch.zoom !== undefined) {
        const clamped = Math.max(HARD_LIMITS.zoomMin, Math.min(HARD_LIMITS.zoomMax, patch.zoom));
        try {
            win.webContents.setZoomFactor(clamped);
        } catch (_) {}
    }
    if (patch.scale !== undefined) {
        const clamped = Math.max(HARD_LIMITS.scaleMin, Math.min(HARD_LIMITS.scaleMax, patch.scale));
        const nw = Math.max(MIN_WINDOW_SIZE.width, Math.round(DEFAULT_MAIN_WINDOW_SIZE.width * clamped));
        const nh = Math.max(MIN_WINDOW_SIZE.height, Math.round(DEFAULT_MAIN_WINDOW_SIZE.height * clamped));
        const [cx, cy] = win.getPosition();
        const [cw, ch] = win.getSize();
        const nx = Math.round(cx + (cw - nw) / 2);
        const ny = Math.round(cy + (ch - nh) / 2);
        win.setBounds({ x: nx, y: ny, width: nw, height: nh });
    }
}

module.exports = {
    createWindow,
    getDefaultKeybinds,
    updateGlobalShortcuts,
    setupWindowIpcHandlers,
    applyScale,
    applyZoom,
    applyOpacity,
    HARD_LIMITS,
};
