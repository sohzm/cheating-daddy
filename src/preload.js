const { contextBridge, ipcRenderer } = require('electron');

const validInvokeChannels = new Set([
    'storage:get-config',
    'storage:set-config',
    'storage:update-config',
    'storage:get-credentials',
    'storage:set-credentials',
    'storage:get-api-key',
    'storage:set-api-key',
    'storage:get-groq-api-key',
    'storage:set-groq-api-key',
    'storage:get-preferences',
    'storage:set-preferences',
    'storage:update-preference',
    'storage:get-keybinds',
    'storage:set-keybinds',
    'storage:get-all-sessions',
    'storage:get-session',
    'storage:save-session',
    'storage:delete-session',
    'storage:delete-all-sessions',
    'storage:get-today-limits',
    'storage:clear-all',
    'get-app-version',
    'quit-application',
    'open-external',
    'window-minimize',
    'window-toggle-maximize',
    'toggle-window-visibility',
    'update-sizes',
    'initialize-cloud',
    'initialize-gemini',
    'initialize-local',
    'send-audio-content',
    'send-mic-audio-content',
    'send-image-content',
    'send-text-message',
    'start-macos-audio',
    'stop-macos-audio',
    'close-session',
    'get-current-session',
    'start-new-session',
    'update-google-search-setting',
]);

const validSendChannels = new Set(['update-keybinds', 'view-changed', 'log-message']);

const validEventChannels = new Set([
    'new-response',
    'update-response',
    'update-status',
    'partial-question',
    'click-through-toggled',
    'reconnect-failed',
    'whisper-downloading',
    'navigate-previous-response',
    'navigate-next-response',
    'scroll-response-up',
    'scroll-response-down',
    'save-conversation-turn',
    'save-session-context',
    'save-screen-analysis',
    'clear-sensitive-data',
    'shortcut-triggered',
]);

contextBridge.exposeInMainWorld('cheatingDaddyAPI', {
    platform: {
        isMacOS: process.platform === 'darwin',
        isLinux: process.platform === 'linux',
        isWindows: process.platform === 'win32',
    },
    invoke(channel, ...args) {
        if (!validInvokeChannels.has(channel)) {
            throw new Error(`Blocked IPC invoke channel: ${channel}`);
        }
        return ipcRenderer.invoke(channel, ...args);
    },
    send(channel, ...args) {
        if (!validSendChannels.has(channel)) {
            throw new Error(`Blocked IPC send channel: ${channel}`);
        }
        ipcRenderer.send(channel, ...args);
    },
    on(channel, listener) {
        if (!validEventChannels.has(channel)) {
            throw new Error(`Blocked IPC event channel: ${channel}`);
        }

        const wrappedListener = (_event, ...args) => listener(...args);
        ipcRenderer.on(channel, wrappedListener);
        return () => ipcRenderer.removeListener(channel, wrappedListener);
    },
});
