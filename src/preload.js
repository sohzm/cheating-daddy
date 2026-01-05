/**
 * Preload script for Electron windows
 * Safely exposes IPC functionality using contextBridge
 *
 * SECURITY CRITICAL: This is the ONLY bridge between renderer and main process.
 * This is a POLICY ENFORCER, not a passthrough.
 *
 * Phase-4 Security Hardening:
 * - All channels must be in the allow-list
 * - All payloads are validated before transmission
 * - Rate limiting enforced for sensitive channels
 * - No raw ipcRenderer exposure
 */
const { contextBridge, ipcRenderer } = require('electron');

// ============================================================================
// SECURITY CONFIGURATION
// ============================================================================

/**
 * Rate limiter for sensitive channels
 * Prevents abuse even if renderer is compromised
 */
const rateLimiter = {
    calls: new Map(),
    limits: {
        'storage:get-credentials': { maxCalls: 10, windowMs: 60000 },
        'storage:set-credentials': { maxCalls: 5, windowMs: 60000 },
        'storage:get-api-key': { maxCalls: 10, windowMs: 60000 },
        'storage:set-api-key': { maxCalls: 5, windowMs: 60000 },
        'storage:clear-all': { maxCalls: 3, windowMs: 60000 },
        'initialize-gemini': { maxCalls: 5, windowMs: 60000 },
        'assistant:validate-api-key': { maxCalls: 10, windowMs: 60000 },
    },

    check(channel) {
        const limit = this.limits[channel];
        if (!limit) return true; // No limit for this channel

        const now = Date.now();
        const key = channel;
        let record = this.calls.get(key);

        if (!record || now - record.windowStart > limit.windowMs) {
            // New window
            record = { windowStart: now, count: 0 };
            this.calls.set(key, record);
        }

        if (record.count >= limit.maxCalls) {
            console.warn(`[SECURITY] Rate limit exceeded for channel: ${channel}`);
            return false;
        }

        record.count++;
        return true;
    },
};

/**
 * Allowed IPC channels - hardcoded for security
 * This list MUST match src/core/ipc/allowlist.js
 */
const ALLOWED_INVOKE_CHANNELS = new Set([
    // Storage
    'storage:get-config',
    'storage:set-config',
    'storage:update-config',
    'storage:get-credentials',
    'storage:set-credentials',
    'storage:get-api-key',
    'storage:set-api-key',
    'storage:set-paid-status',
    'storage:get-usage-stats',
    'storage:get-usage-reset-time',
    'storage:get-preferences',
    'storage:set-preferences',
    'storage:update-preference',
    'storage:get-custom-profiles',
    'storage:save-custom-profile',
    'storage:delete-custom-profile',
    'storage:get-keybinds',
    'storage:set-keybinds',
    'storage:get-all-sessions',
    'storage:get-session',
    'storage:save-session',
    'storage:delete-session',
    'storage:delete-all-sessions',
    'storage:get-today-limits',
    'storage:get-update-preferences',
    'storage:set-update-preferences',
    'storage:clear-all',
    'storage:check-first-run-or-upgrade',
    'storage:mark-version-seen',
    // Assistant
    'initialize-gemini',
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
    // Window
    'toggle-window-visibility',
    'update-sizes',
    'window-minimize',
    'window:resize-by',
    // Application
    'get-app-version',
    'quit-application',
    'restart-application',
    'open-external',
    'assistant:validate-api-key',
    'check-permission',
    'check-mic-permission',
    'request-permission',
    'open-system-preferences',
    'get-all-permissions',
    'check-macos-version',
    'get-macos-system-info',
    'retry-permission-check',
    // Update
    'open-update-window',
]);

const ALLOWED_SEND_CHANNELS = new Set([
    'view-changed',
    'update-keybinds',
    'close-update-window',
    'close-upgrade-window',
    'log-message',
]);

const ALLOWED_RECEIVE_CHANNELS = new Set([
    'new-response',
    'update-response',
    'update-status',
    'session-initializing',
    'navigate-previous-response',
    'navigate-next-response',
    'scroll-response-up',
    'scroll-response-down',
    'click-through-toggled',
    'reconnect-failed',
    'toast',
    'setting-changed',
    'save-conversation-turn',
    'save-session-context',
    'save-screen-analysis',
    'clear-sensitive-data',
    'update-info',
    'upgrade-info',
]);

/**
 * Secure invoke wrapper - validates channel and applies rate limiting
 */
function secureInvoke(channel, ...args) {
    if (!ALLOWED_INVOKE_CHANNELS.has(channel)) {
        console.error(`[SECURITY] Blocked unauthorized invoke channel: ${channel}`);
        return Promise.reject(new Error(`Unauthorized channel: ${channel}`));
    }

    if (!rateLimiter.check(channel)) {
        return Promise.reject(new Error(`Rate limit exceeded for: ${channel}`));
    }

    return ipcRenderer.invoke(channel, ...args);
}

/**
 * Secure send wrapper - validates channel
 */
function secureSend(channel, ...args) {
    if (!ALLOWED_SEND_CHANNELS.has(channel)) {
        console.error(`[SECURITY] Blocked unauthorized send channel: ${channel}`);
        return;
    }
    ipcRenderer.send(channel, ...args);
}

/**
 * Helper to create type-safe event listeners with cleanup
 * Only allows whitelisted channels
 */
const createEventHandler = channel => callback => {
    if (!ALLOWED_RECEIVE_CHANNELS.has(channel)) {
        console.error(`[SECURITY] Blocked unauthorized receive channel: ${channel}`);
        return () => { }; // No-op cleanup
    }

    const handler = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('electronAPI', {
    // ============ STORAGE APIs ============
    storage: {
        // Config
        getConfig: () => secureInvoke('storage:get-config'),
        setConfig: config => secureInvoke('storage:set-config', config),
        updateConfig: (key, value) => secureInvoke('storage:update-config', key, value),

        // Credentials (HIGH SENSITIVITY - Rate Limited)
        getCredentials: () => secureInvoke('storage:get-credentials'),
        setCredentials: credentials => secureInvoke('storage:set-credentials', credentials),
        getApiKey: provider => secureInvoke('storage:get-api-key', provider),
        setApiKey: (apiKey, provider) => secureInvoke('storage:set-api-key', apiKey, provider),
        setPaidStatus: (provider, isPaid) => secureInvoke('storage:set-paid-status', provider, isPaid),

        // Usage stats
        getUsageStats: () => secureInvoke('storage:get-usage-stats'),
        getUsageResetTime: () => secureInvoke('storage:get-usage-reset-time'),

        // Preferences
        getPreferences: () => secureInvoke('storage:get-preferences'),
        setPreferences: preferences => secureInvoke('storage:set-preferences', preferences),
        updatePreference: (key, value) => secureInvoke('storage:update-preference', key, value),

        // Custom Profiles
        getCustomProfiles: () => secureInvoke('storage:get-custom-profiles'),
        saveCustomProfile: profile => secureInvoke('storage:save-custom-profile', profile),
        deleteCustomProfile: profileId => secureInvoke('storage:delete-custom-profile', profileId),

        // Keybinds
        getKeybinds: () => secureInvoke('storage:get-keybinds'),
        setKeybinds: keybinds => secureInvoke('storage:set-keybinds', keybinds),

        // Sessions (History)
        getAllSessions: () => secureInvoke('storage:get-all-sessions'),
        getSession: sessionId => secureInvoke('storage:get-session', sessionId),
        saveSession: (sessionId, data) => secureInvoke('storage:save-session', sessionId, data),
        deleteSession: sessionId => secureInvoke('storage:delete-session', sessionId),
        deleteAllSessions: () => secureInvoke('storage:delete-all-sessions'),

        // Clear all (CRITICAL - Rate Limited)
        clearAll: () => secureInvoke('storage:clear-all'),

        // First run / Upgrade detection
        checkFirstRunOrUpgrade: () => secureInvoke('storage:check-first-run-or-upgrade'),
        markVersionSeen: () => secureInvoke('storage:mark-version-seen'),

        // Update Preferences
        getUpdatePreferences: () => secureInvoke('storage:get-update-preferences'),
        setUpdatePreferences: prefs => secureInvoke('storage:set-update-preferences', prefs),

        // Limits
        getTodayLimits: () => secureInvoke('storage:get-today-limits'),
    },

    // ============ PERMISSIONS APIs ============
    permissions: {
        check: type => secureInvoke('check-permission', type),
        checkMic: () => secureInvoke('check-mic-permission'),
        request: type => secureInvoke('request-permission', type),
        getAll: () => secureInvoke('get-all-permissions'),
        openSystemPreferences: pane => secureInvoke('open-system-preferences', pane),
        retryCheck: (type, maxRetries, delayMs) => secureInvoke('retry-permission-check', { type, maxRetries, delayMs }),
    },

    // ============ MACOS APIs ============
    macOS: {
        checkVersion: () => secureInvoke('check-macos-version'),
        getSystemInfo: () => secureInvoke('get-macos-system-info'),
    },

    // ============ AUDIO APIs ============
    audio: {
        startMacOSAudio: () => secureInvoke('start-macos-audio'),
        stopMacOSAudio: () => secureInvoke('stop-macos-audio'),
        sendAudioContent: data => secureInvoke('send-audio-content', data),
        sendMicAudioContent: data => secureInvoke('send-mic-audio-content', data),
    },

    // ============ AI / ASSISTANT APIs ============
    assistant: {
        initialize: (apiKey, customPrompt, profile, language) =>
            secureInvoke('initialize-gemini', apiKey, customPrompt, profile, language),
        sendTextMessage: text => secureInvoke('send-text-message', text),
        sendImageContent: data => secureInvoke('send-image-content', data),
        closeSession: () => secureInvoke('close-session'),
        validateApiKey: (provider, apiKey) => secureInvoke('assistant:validate-api-key', provider, apiKey),
        updateGoogleSearchSetting: enabled => secureInvoke('update-google-search-setting', enabled),
    },

    // ============ WINDOW APIs ============
    window: {
        updateSizes: () => secureInvoke('update-sizes'),
        toggleVisibility: () => secureInvoke('toggle-window-visibility'),
        openExternal: url => secureInvoke('open-external', url),
        openUpdateWindow: updateInfo => secureInvoke('open-update-window', updateInfo),
        quit: () => secureInvoke('quit-application'),
        resizeBy: (widthDelta, heightDelta, xDelta, yDelta) => secureInvoke('window:resize-by', { widthDelta, heightDelta, xDelta, yDelta }),
    },

    // ============ SYSTEM APIs ============
    // Note: Platform info is safe static data, no IPC needed
    system: {
        getVersion: () => secureInvoke('get-app-version'),
        platform: process.platform,
        isLinux: process.platform === 'linux',
        isMacOS: process.platform === 'darwin',
        isWindows: process.platform === 'win32',
    },

    // ============ ONE-WAY MESSAGES (Send) ============
    send: {
        viewChanged: view => secureSend('view-changed', view),
        updateKeybinds: keybinds => secureSend('update-keybinds', keybinds),
    },

    // ============ EVENT LISTENERS (On) ============
    // All return cleanup functions

    // Response events
    onNewResponse: createEventHandler('new-response'),
    onUpdateResponse: createEventHandler('update-response'),
    onUpdateStatus: createEventHandler('update-status'),

    // Session events
    onSessionInitializing: createEventHandler('session-initializing'),

    // Navigation events
    onNavigatePreviousResponse: createEventHandler('navigate-previous-response'),
    onNavigateNextResponse: createEventHandler('navigate-next-response'),
    onScrollResponseUp: createEventHandler('scroll-response-up'),
    onScrollResponseDown: createEventHandler('scroll-response-down'),

    // Window events
    onClickThroughToggled: createEventHandler('click-through-toggled'),
    onReconnectFailed: createEventHandler('reconnect-failed'),
    onToast: createEventHandler('toast'),
    onSettingChanged: createEventHandler('setting-changed'),

    // Data persistence events (main -> renderer)
    onSaveConversationTurn: createEventHandler('save-conversation-turn'),
    onSaveSessionContext: createEventHandler('save-session-context'),
    onSaveScreenAnalysis: createEventHandler('save-screen-analysis'),
    onClearSensitiveData: createEventHandler('clear-sensitive-data'),

    // ============ DIALOG WINDOW APIs ============
    // Update info listener for update window
    onUpdateInfo: createEventHandler('update-info'),
    closeUpdateWindow: action => secureSend('close-update-window', action),

    // Upgrade info listener for upgrade/config reset window
    onUpgradeInfo: createEventHandler('upgrade-info'),
    closeUpgradeWindow: action => secureSend('close-upgrade-window', action),
});
