const { BrowserWindow, globalShortcut, ipcMain, screen, app } = require('electron');
const path = require('node:path');
const storage = require('../storage');

let mouseEventsIgnored = false;

const DEFAULT_MAIN_WINDOW_SIZE = { width: 1100, height: 800 };
const MIN_WINDOW_SIZE = { width: 400, height: 260 };

// ──────────────────────────────────────────────────────────────
// Default keybinds — full action set
// ──────────────────────────────────────────────────────────────

function getDefaultKeybinds() {
    const isMac = process.platform === 'darwin';
    return {
        // ── Window movement ──
        moveUp:             isMac ? 'Alt+Up'         : 'Ctrl+Up',
        moveDown:           isMac ? 'Alt+Down'       : 'Ctrl+Down',
        moveLeft:           isMac ? 'Alt+Left'       : 'Ctrl+Left',
        moveRight:          isMac ? 'Alt+Right'      : 'Ctrl+Right',
        // ── Visibility ──
        toggleVisibility:   isMac ? 'Cmd+\\'         : 'Ctrl+\\',
        toggleClickThrough: isMac ? 'Cmd+M'          : 'Ctrl+M',
        // ── Scale (window size) ──
        scaleUp:            isMac ? 'Cmd+Shift+='    : 'Ctrl+Shift+=',
        scaleDown:          isMac ? 'Cmd+Shift+-'    : 'Ctrl+Shift+-',
        // ── Zoom (content) ──
        zoomIn:             isMac ? 'Cmd+='          : 'Ctrl+=',
        zoomOut:            isMac ? 'Cmd+-'          : 'Ctrl+-',
        zoomReset:          isMac ? 'Cmd+0'          : 'Ctrl+0',
        // ── Opacity ──
        opacityUp:          isMac ? 'Cmd+Shift+]'    : 'Ctrl+Shift+]',
        opacityDown:        isMac ? 'Cmd+Shift+['    : 'Ctrl+Shift+[',
        // ── Session ──
        nextStep:           isMac ? 'Cmd+Enter'      : 'Ctrl+Enter',
        // Response navigation: Ctrl+Shift+Left / Ctrl+Shift+Right
        previousResponse:   isMac ? 'Cmd+Shift+Left' : 'Ctrl+Shift+Left',
        nextResponse:       isMac ? 'Cmd+Shift+Right': 'Ctrl+Shift+Right',
        // Scroll: Ctrl+[ / Ctrl+]
        scrollUp:           isMac ? 'Cmd+['          : 'Ctrl+[',
        scrollDown:         isMac ? 'Cmd+]'          : 'Ctrl+]',
        // ── Audio ──
        toggleVoice:        isMac ? 'Cmd+Shift+L'    : 'Ctrl+Shift+L',
        // ── Dev ──
        reloadApp:          isMac ? 'Cmd+Shift+R'    : 'Ctrl+Shift+R',
        devRefresh:         isMac ? 'Cmd+Shift+E'    : 'Ctrl+Shift+E',
        // ── Global Controls ──
        themeToggle:        isMac ? 'Cmd+Shift+T'    : 'Ctrl+Shift+T',
        fontSizeUp:         isMac ? 'Cmd+Shift+0'    : 'Ctrl+Shift+0',
        fontSizeDown:       isMac ? 'Cmd+Shift+9'    : 'Ctrl+Shift+9',
        aiModeToggle:       isMac ? 'Cmd+Shift+U'    : 'Ctrl+Shift+U',
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
        width:  Math.max(MIN_WINDOW_SIZE.width,  baseW),
        height: Math.max(MIN_WINDOW_SIZE.height, baseH),
        x: winState.x ?? undefined,
        y: winState.y ?? undefined,
        minWidth:  MIN_WINDOW_SIZE.width,
        minHeight: MIN_WINDOW_SIZE.height,
        resizable:   true,
        frame:       false,
        transparent: true,
        hasShadow:   false,
        alwaysOnTop: true,
        opacity: winState.opacity ?? 1.0,
        webPreferences: {
            nodeIntegration:      true,
            contextIsolation:     false,
            backgroundThrottling: false,
            enableBlinkFeatures:  'GetDisplayMedia',
            webSecurity:          true,
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

    if (process.platform === 'win32') {
        try { mainWindow.setSkipTaskbar(true); } catch (_) {}
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }
    if (process.platform === 'darwin') {
        try { mainWindow.setHiddenInMissionControl(true); } catch (_) {}
    }

    mainWindow.loadFile(path.join(__dirname, '../index.html'));

    // Apply persisted zoom after DOM ready
    mainWindow.webContents.once('dom-ready', () => {
        const z = storage.getWindowState().zoom ?? 1.0;
        try { mainWindow.webContents.setZoomFactor(z); } catch (_) {}

        setTimeout(() => {
            const defaultKB = getDefaultKeybinds();
            const saved     = storage.getKeybinds();
            const keybinds  = saved ? { ...defaultKB, ...saved } : defaultKB;
            updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }, 150);
    });

    // Persist window position on move
    mainWindow.on('moved', () => {
        const [x, y] = mainWindow.getPosition();
        storage.setWindowState({ x, y });
    });

    // Persist window size on resize
    mainWindow.on('resized', () => {
        const [w, h] = mainWindow.getSize();
        const scale = w / DEFAULT_MAIN_WINDOW_SIZE.width;
        storage.setWindowState({ scale });
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
        try {
            const success = globalShortcut.register(kb, handler);
            if (!success) {
                console.error(`Failed to register shortcut ${action} (${kb}): registration returned false`);
            }
        } catch (e) {
            console.error(`Failed to register ${action} (${kb}):`, e.message);
        }
    }

    // ── Movement ──
    const moveActions = {
        moveUp:    () => safeMove(mainWindow, 0, -winState().moveStep),
        moveDown:  () => safeMove(mainWindow, 0, +winState().moveStep),
        moveLeft:  () => safeMove(mainWindow, -winState().moveStep, 0),
        moveRight: () => safeMove(mainWindow, +winState().moveStep, 0),
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
            applyScale(mainWindow, winState().scaleStep ?? 0.1, winState().scaleMax ?? 3.0);
        });
        tryRegister('scaleDown', keybinds.scaleDown, () => {
            applyScale(mainWindow, -(winState().scaleStep ?? 0.1), winState().scaleMin ?? 0.3);
        });
    }

    // ── Zoom (content) ──
    if (winState().zoomEnabled !== false) {
        tryRegister('zoomIn', keybinds.zoomIn, () => {
            applyZoom(mainWindow, winState().zoomStep ?? 0.1, winState().zoomMax ?? 3.0);
        });
        tryRegister('zoomOut', keybinds.zoomOut, () => {
            applyZoom(mainWindow, -(winState().zoomStep ?? 0.1), winState().zoomMin ?? 0.5);
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
            applyOpacity(mainWindow, winState().opacityStep ?? 0.05, winState().opacityMax ?? 1.0);
        });
        tryRegister('opacityDown', keybinds.opacityDown, () => {
            applyOpacity(mainWindow, -(winState().opacityStep ?? 0.05), winState().opacityMin ?? 0.1);
        });
    }

    // ── Session ──
    if (winState().sessionEnabled !== false) {
        tryRegister('nextStep', keybinds.nextStep, () => {
            const isMac = process.platform === 'darwin';
            const key   = isMac ? 'cmd+enter' : 'ctrl+enter';
            mainWindow.webContents.executeJavaScript(`cheatingDaddy.handleShortcut('${key}');`).catch(() => {});
        });
        tryRegister('previousResponse', keybinds.previousResponse, () => sendToRenderer('navigate-previous-response'));
        tryRegister('nextResponse',     keybinds.nextResponse,     () => sendToRenderer('navigate-next-response'));
        tryRegister('scrollUp',         keybinds.scrollUp,         () => sendToRenderer('scroll-response-up'));
        tryRegister('scrollDown',       keybinds.scrollDown,       () => sendToRenderer('scroll-response-down'));
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
}

// ──────────────────────────────────────────────────────────────
// Helpers — scale, zoom, opacity, move
// ──────────────────────────────────────────────────────────────

function safeMove(win, dx, dy) {
    if (!win.isVisible()) return;
    const [x, y] = win.getPosition();
    const nx = x + dx;
    const ny = y + dy;
    win.setPosition(nx, ny);
    storage.setWindowState({ x: nx, y: ny });
}

/**
 * Scale the window uniformly from its centre.
 * delta: positive = grow, negative = shrink
 */
function applyScale(win, delta, limit) {
    const ws = storage.getWindowState();
    const current = ws.scale ?? 1.0;
    const next = delta > 0
        ? Math.min(current + Math.abs(delta), limit)
        : Math.max(current - Math.abs(delta), limit);
    if (next === current) return;

    const [cx, cy] = win.getPosition();
    const [cw, ch] = win.getSize();

    const nw = Math.round(DEFAULT_MAIN_WINDOW_SIZE.width  * next);
    const nh = Math.round(DEFAULT_MAIN_WINDOW_SIZE.height * next);
    const nw2 = Math.max(MIN_WINDOW_SIZE.width, nw);
    const nh2 = Math.max(MIN_WINDOW_SIZE.height, nh);

    // Grow/shrink from centre: adjust position so centre stays fixed
    const nx = Math.round(cx + (cw - nw2) / 2);
    const ny = Math.round(cy + (ch - nh2) / 2);

    win.setSize(nw2, nh2);
    win.setPosition(nx, ny);
    storage.setWindowState({ scale: next, x: nx, y: ny });

    // Notify renderer
    const { BrowserWindow: BW } = require('electron');
    const windows = BW.getAllWindows();
    for (const w of windows) w.webContents.send('scale-changed', next);
}

function applyZoom(win, delta, limit) {
    const ws = storage.getWindowState();
    const current = ws.zoom ?? 1.0;
    const next = delta > 0
        ? Math.min(parseFloat((current + Math.abs(delta)).toFixed(2)), limit)
        : Math.max(parseFloat((current - Math.abs(delta)).toFixed(2)), limit);
    if (next === current) return;
    try { win.webContents.setZoomFactor(next); } catch (_) {}
    storage.updateWindowState('zoom', next);
    win.webContents.send('zoom-changed', next);
}

function applyOpacity(win, delta, limit) {
    const ws = storage.getWindowState();
    const current = ws.opacity ?? 1.0;
    const next = delta > 0
        ? Math.min(parseFloat((current + Math.abs(delta)).toFixed(2)), limit)
        : Math.max(parseFloat((current - Math.abs(delta)).toFixed(2)), limit);
    if (next === current) return;
    try { win.setOpacity(next); } catch (_) {}
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
        if (mainWindow.isVisible()) { mainWindow.hide(); }
        else { mainWindow.showInactive(); }
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
        const ws = storage.getWindowState();
        const clamped = Math.max(ws.scaleMin ?? 0.3, Math.min(ws.scaleMax ?? 3.0, scale));
        applyScale(mainWindow, clamped - (ws.scale ?? 1.0), ws.scaleMax ?? 3.0);
        return { success: true };
    });

    ipcMain.handle('window:set-zoom', (event, zoom) => {
        const ws = storage.getWindowState();
        const clamped = Math.max(ws.zoomMin ?? 0.5, Math.min(ws.zoomMax ?? 3.0, zoom));
        try { mainWindow.webContents.setZoomFactor(clamped); } catch (_) {}
        storage.updateWindowState('zoom', clamped);
        mainWindow.webContents.send('zoom-changed', clamped);
        return { success: true };
    });

    ipcMain.handle('window:set-opacity', (event, opacity) => {
        const ws = storage.getWindowState();
        const clamped = Math.max(ws.opacityMin ?? 0.1, Math.min(ws.opacityMax ?? 1.0, opacity));
        try { mainWindow.setOpacity(clamped); } catch (_) {}
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
        try { win.setOpacity(patch.opacity); } catch (_) {}
    }
    if (patch.zoom !== undefined) {
        try { win.webContents.setZoomFactor(patch.zoom); } catch (_) {}
    }
    if (patch.scale !== undefined) {
        const nw = Math.max(MIN_WINDOW_SIZE.width,  Math.round(DEFAULT_MAIN_WINDOW_SIZE.width  * patch.scale));
        const nh = Math.max(MIN_WINDOW_SIZE.height, Math.round(DEFAULT_MAIN_WINDOW_SIZE.height * patch.scale));
        const [cx, cy] = win.getPosition();
        const [cw, ch] = win.getSize();
        const nx = Math.round(cx + (cw - nw) / 2);
        const ny = Math.round(cy + (ch - nh) / 2);
        win.setSize(nw, nh);
        win.setPosition(nx, ny);
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
};
