const MIN_WINDOW_SIZE = { width: 220, height: 120 };
const DEFAULT_WINDOW_SIZE = { width: 640, height: 420 };

function normalizeScale(value) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(150, Math.max(25, Math.round(value))) : 100;
}

function normalizeFontSize(value) {
    const legacy = { small: 12, medium: 20, large: 28 };
    const number = legacy[value] ?? Number(value);
    return Number.isFinite(number) && number > 0 ? Math.min(32, Math.max(6, Math.round(number))) : 14;
}

function normalizeWindowSize(value, workArea = { width: 4096, height: 2160 }) {
    const result = {};
    for (const dimension of ['width', 'height']) {
        const size = value?.[dimension];
        const proposed = typeof size === 'number' && Number.isFinite(size) ? Math.round(size) : DEFAULT_WINDOW_SIZE[dimension];
        result[dimension] = Math.max(MIN_WINDOW_SIZE[dimension], Math.min(workArea[dimension], proposed));
    }
    return result;
}

function attachDisplayControls(window, { storage, screen, ipcMain }) {
    let scale = normalizeScale(storage.getPreferences().uiScale);
    let resizeTimer;
    const publish = () => {
        if (!window.isDestroyed()) window.webContents.send('display-changed', { scale });
    };
    const saveSize = () => {
        if (window.isDestroyed() || window.isMaximized() || window.isMinimized()) return;
        const [width, height] = window.getSize();
        storage.updateConfig('windowSize', { width, height });
    };
    const setScale = next => {
        scale = normalizeScale(next);
        window.webContents.setZoomFactor(scale / 100);
        storage.updatePreference('uiScale', scale);
        publish();
    };
    const action = (name, value) => {
        if (window.isDestroyed()) return { success: false, error: 'Window is closed.' };
        if (name === 'scale' && (typeof value !== 'number' || !Number.isFinite(value))) {
            return { success: false, error: 'Invalid scale.' };
        }
        switch (name) {
            case 'scale':
                setScale(value);
                break;
            case 'zoom-in':
                setScale(scale + 5);
                break;
            case 'zoom-out':
                setScale(scale - 5);
                break;
            case 'mini':
            case 'reset': {
                if (window.isMaximized()) window.unmaximize();
                const bounds = screen.getDisplayMatching(window.getBounds()).workArea;
                const size = normalizeWindowSize(name === 'mini' ? { width: 320, height: 180 } : DEFAULT_WINDOW_SIZE, bounds);
                setScale(name === 'mini' ? 60 : 100);
                window.setBounds({
                    ...size,
                    x: Math.max(bounds.x, Math.min(window.getBounds().x, bounds.x + bounds.width - size.width)),
                    y: Math.max(bounds.y, Math.min(window.getBounds().y, bounds.y + bounds.height - size.height)),
                });
                saveSize();
                break;
            }
            default:
                return { success: false, error: 'Unknown display action.' };
        }
        return { success: true, scale };
    };
    window.webContents.on('did-finish-load', () => {
        window.webContents.setZoomFactor(scale / 100);
        publish();
    });
    window.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown' || !(input.control || input.meta) || input.alt) return;
        let name;
        if (input.key === '-' || input.key === '_' || input.code === 'NumpadSubtract') name = 'zoom-out';
        if (input.key === '+' || input.key === '=' || input.code === 'NumpadAdd') name = 'zoom-in';
        if (input.key === '0' || input.code === 'Digit0' || input.code === 'Numpad0') name = 'reset';
        if (name) {
            event.preventDefault();
            action(name);
        }
    });
    window.webContents.on('zoom-changed', (event, direction) => {
        event.preventDefault();
        action(direction === 'in' ? 'zoom-in' : 'zoom-out');
    });
    window.on('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(saveSize, 200);
    });
    window.on('close', () => {
        clearTimeout(resizeTimer);
        saveSize();
    });
    ipcMain.handle('window:get-display', event => (event.sender === window.webContents ? { success: true, scale } : { success: false }));
    ipcMain.handle('window:display-action', (event, name, value) => (event.sender === window.webContents ? action(name, value) : { success: false }));
    window.on('closed', () => {
        clearTimeout(resizeTimer);
        ipcMain.removeHandler('window:get-display');
        ipcMain.removeHandler('window:display-action');
    });
}

module.exports = { MIN_WINDOW_SIZE, DEFAULT_WINDOW_SIZE, normalizeScale, normalizeFontSize, normalizeWindowSize, attachDisplayControls };
