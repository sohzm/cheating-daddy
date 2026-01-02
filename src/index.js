if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain, globalShortcut, systemPreferences } = require('electron');
const { createWindow, createUpdateWindow, createSplashWindow, updateGlobalShortcuts } = require('./utils/window');
const { checkForUpdates, isNewerVersion, getCurrentVersion } = require('./utils/updateChecker');
const { setupAssistantIpcHandlers, stopMacOSAudioCapture, sendToRenderer, toggleManualRecording } = require('./utils/core/assistantManager');
const storage = require('./storage');
const rateLimitManager = require('./utils/rateLimitManager');

const geminiSessionRef = { current: null };
let mainWindow = null;

function createMainWindow() {
    mainWindow = createWindow(sendToRenderer, geminiSessionRef);
    return mainWindow;
}

app.whenReady().then(async () => {
    // Initialize storage (ensures directory exists, resets if needed)
    storage.initializeStorage();

    // 1. Show Splash Screen
    const splashWindow = createSplashWindow();

    let shouldStartApp = true;
    try {
        // 2. Check for Updates
        console.log('App Startup: Checking for updates...');
        const updateResult = await checkForUpdates();

        if (updateResult.updateInfo) {
            let shouldShowUpdate = false;
            let contentId = null;
            const isNewer = isNewerVersion(updateResult.updateInfo.version, getCurrentVersion());

            if (isNewer) {
                // Always show if it's a version bump
                shouldShowUpdate = true;
            } else {
                // Not a version bump, but check if the content (message/buildDate) has changed
                const prefs = storage.getUpdatePreferences();
                contentId = updateResult.updateInfo.buildDate || updateResult.updateInfo.message || updateResult.updateInfo.version;

                if (prefs.lastSeenForcedId !== contentId) {
                    console.log(`App Startup: New update content detected (ID: ${contentId})`);
                    shouldShowUpdate = true;
                    // Note: Do NOT persist here - wait until user has acknowledged the update
                } else {
                    console.log('App Startup: Update content already seen, skipping');
                }
            }

            if (shouldShowUpdate) {
                console.log('App Startup: Showing update window');
                splashWindow.webContents.send('update-status', 'Update available');

                let userAction = 'later';
                const handleAction = (event, action) => {
                    userAction = action;
                };
                ipcMain.once('close-update-window', handleAction);

                // Show update window and wait for it to be closed
                const updateWindow = createUpdateWindow(updateResult.updateInfo);

                // Wait for update window to be closed before proceeding to app
                await new Promise((resolve) => {
                    updateWindow.on('closed', resolve);
                });

                // Clean up listener
                ipcMain.removeListener('close-update-window', handleAction);

                // Persist that we've seen this update content (after user has acknowledged)
                if (contentId) {
                    storage.setUpdatePreferences({ lastSeenForcedId: contentId });
                }

                if (userAction === 'download') {
                    console.log('App Startup: User chose download. Opening URL and quitting.');
                    await shell.openExternal(updateResult.updateInfo.downloadUrl);
                    shouldStartApp = false;
                    app.quit();
                } else {
                    console.log('App Startup: User chose later, proceeding to app');
                }
            } else {
                console.log('App Startup: No new applicable updates found');
                splashWindow.webContents.send('update-status', 'Starting app...');
                await new Promise(r => setTimeout(r, 800));
            }
        } else {
            console.log('App Startup: No updates found');
            splashWindow.webContents.send('update-status', 'Starting app...');
            // Small delay for better UX
            await new Promise(r => setTimeout(r, 800));
        }
    } catch (error) {
        console.error('App Startup: Update check failed:', error);
    } finally {
        // 3. Launch Main App if permitted
        if (!splashWindow.isDestroyed()) {
            splashWindow.close();
        }

        if (shouldStartApp) {
            createMainWindow();
            setupAssistantIpcHandlers(geminiSessionRef);
            setupStorageIpcHandlers();
            setupGeneralIpcHandlers();
        }
    }
});

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
        createMainWindow();
    }
});

function setupStorageIpcHandlers() {
    // ============ CONFIG ============
    ipcMain.handle('storage:get-config', async () => {
        try {
            return { success: true, data: storage.getConfig() };
        } catch (error) {
            console.error('Error getting config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-config', async (event, config) => {
        try {
            storage.setConfig(config);
            return { success: true };
        } catch (error) {
            console.error('Error setting config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:update-config', async (event, key, value) => {
        try {
            storage.updateConfig(key, value);
            return { success: true };
        } catch (error) {
            console.error('Error updating config:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CREDENTIALS ============
    ipcMain.handle('storage:get-credentials', async () => {
        try {
            return { success: true, data: storage.getCredentials() };
        } catch (error) {
            console.error('Error getting credentials:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-credentials', async (event, credentials) => {
        try {
            storage.setCredentials(credentials);
            return { success: true };
        } catch (error) {
            console.error('Error setting credentials:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-api-key', async (event, provider) => {
        try {
            return { success: true, data: storage.getApiKey(provider) };
        } catch (error) {
            console.error('Error getting API key:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-api-key', async (event, apiKey, provider) => {
        try {
            storage.setApiKey(apiKey, provider);

            // Reset provider instances so next use picks up new key
            const { resetProviders } = require('./utils/providers/registry');
            resetProviders();

            return { success: true };
        } catch (error) {
            console.error('Error setting API key:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ USAGE STATS ============
    ipcMain.handle('storage:get-usage-stats', async () => {
        try {
            return { success: true, data: rateLimitManager.getAllUsageStats() };
        } catch (error) {
            console.error('Error getting usage stats:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-usage-reset-time', async () => {
        try {
            return { success: true, data: rateLimitManager.getTimeUntilReset() };
        } catch (error) {
            console.error('Error getting usage reset time:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ PREFERENCES ============
    ipcMain.handle('storage:get-preferences', async () => {
        try {
            return { success: true, data: storage.getPreferences() };
        } catch (error) {
            console.error('Error getting preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-preferences', async (event, preferences) => {
        try {
            storage.setPreferences(preferences);
            return { success: true };
        } catch (error) {
            console.error('Error setting preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:update-preference', async (event, key, value) => {
        try {
            storage.updatePreference(key, value);
            return { success: true };
        } catch (error) {
            console.error('Error updating preference:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CUSTOM PROFILES ============
    ipcMain.handle('storage:get-custom-profiles', async () => {
        try {
            return { success: true, data: storage.getCustomProfiles() };
        } catch (error) {
            console.error('Error getting custom profiles:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:save-custom-profile', async (event, profile) => {
        try {
            storage.saveCustomProfile(profile);
            return { success: true };
        } catch (error) {
            console.error('Error saving custom profile:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-custom-profile', async (event, profileId) => {
        try {
            storage.deleteCustomProfile(profileId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting custom profile:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ KEYBINDS ============
    ipcMain.handle('storage:get-keybinds', async () => {
        try {
            return { success: true, data: storage.getKeybinds() };
        } catch (error) {
            console.error('Error getting keybinds:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-keybinds', async (event, keybinds) => {
        try {
            storage.setKeybinds(keybinds);
            return { success: true };
        } catch (error) {
            console.error('Error setting keybinds:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ HISTORY ============
    ipcMain.handle('storage:get-all-sessions', async () => {
        try {
            return { success: true, data: storage.getAllSessions() };
        } catch (error) {
            console.error('Error getting sessions:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-session', async (event, sessionId) => {
        try {
            return { success: true, data: storage.getSession(sessionId) };
        } catch (error) {
            console.error('Error getting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:save-session', async (event, sessionId, data) => {
        try {
            storage.saveSession(sessionId, data);
            return { success: true };
        } catch (error) {
            console.error('Error saving session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-session', async (event, sessionId) => {
        try {
            storage.deleteSession(sessionId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-all-sessions', async () => {
        try {
            storage.deleteAllSessions();
            return { success: true };
        } catch (error) {
            console.error('Error deleting all sessions:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ LIMITS ============
    ipcMain.handle('storage:get-today-limits', async () => {
        try {
            return { success: true, data: storage.getTodayLimits() };
        } catch (error) {
            console.error('Error getting today limits:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ UPDATE PREFERENCES ============
    ipcMain.handle('storage:get-update-preferences', async () => {
        try {
            return { success: true, data: storage.getUpdatePreferences() };
        } catch (error) {
            console.error('Error getting update preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-update-preferences', async (event, prefs) => {
        try {
            storage.setUpdatePreferences(prefs);
            return { success: true };
        } catch (error) {
            console.error('Error setting update preferences:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CLEAR ALL ============
    ipcMain.handle('storage:clear-all', async () => {
        try {
            storage.clearAllData();
            return { success: true };
        } catch (error) {
            console.error('Error clearing all data:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ FIRST RUN / UPGRADE ============
    ipcMain.handle('storage:check-first-run-or-upgrade', async () => {
        try {
            const currentVersion = app.getVersion();
            const result = storage.checkFirstRunOrUpgrade(currentVersion);
            return { success: true, data: result };
        } catch (error) {
            console.error('Error checking first run/upgrade:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:mark-version-seen', async () => {
        try {
            const currentVersion = app.getVersion();
            storage.markVersionSeen(currentVersion);
            return { success: true };
        } catch (error) {
            console.error('Error marking version seen:', error);
            return { success: false, error: error.message };
        }
    });
}

function setupGeneralIpcHandlers() {
    ipcMain.handle('get-app-version', async () => {
        return app.getVersion();
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

    ipcMain.handle('restart-application', async event => {
        try {
            stopMacOSAudioCapture();
            app.relaunch();
            app.quit();
            return { success: true };
        } catch (error) {
            console.error('Error restarting application:', error);
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

    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (mainWindow) {
            // Also save to storage
            storage.setKeybinds(newKeybinds);
            updateGlobalShortcuts(newKeybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }
    });

    // Validates an API key against the provider
    ipcMain.handle('assistant:validate-api-key', async (event, providerName, apiKey) => {
        try {
            console.log(`Validating API key for ${providerName}...`);
            let provider;

            if (providerName === 'groq') {
                const GroqProvider = require('./utils/providers/groq');
                provider = new GroqProvider(apiKey);
            } else if (providerName === 'gemini') {
                const GeminiProvider = require('./utils/providers/gemini');
                provider = new GeminiProvider(apiKey);
            } else {
                return { valid: false, error: 'Unknown provider' };
            }

            const result = await provider.validateApiKey();
            console.log(`Validation result for ${providerName}:`, result);
            return result;
        } catch (error) {
            console.error(`Error validating ${providerName} key:`, error);
            return { valid: false, error: error.message };
        }
    });

    // Debug logging from renderer
    ipcMain.on('log-message', (event, msg) => {
        console.log(msg);
    });

    ipcMain.handle('open-update-window', (event, updateInfo) => {
        createUpdateWindow(updateInfo);
        return { success: true };
    });

    // ============ macOS PERMISSION CHECKS ============
    // Check if a permission is granted (screen, microphone, camera)
    ipcMain.handle('check-permission', async (event, type) => {
        // On non-macOS platforms, always return granted
        if (process.platform !== 'darwin') {
            return 'granted';
        }
        try {
            return systemPreferences.getMediaAccessStatus(type);
        } catch (error) {
            console.error(`Error checking ${type} permission:`, error);
            return 'unknown';
        }
    });

    // Request permission (microphone, camera - screen recording must be done in System Preferences)
    ipcMain.handle('request-permission', async (event, type) => {
        // On non-macOS platforms, always return true
        if (process.platform !== 'darwin') {
            return true;
        }
        try {
            // Note: askForMediaAccess only works for 'microphone' and 'camera'
            // Screen recording permission must be granted manually in System Preferences
            if (type === 'microphone' || type === 'camera') {
                return await systemPreferences.askForMediaAccess(type);
            }
            // For screen, we can only check - not request
            return systemPreferences.getMediaAccessStatus(type) === 'granted';
        } catch (error) {
            console.error(`Error requesting ${type} permission:`, error);
            return false;
        }
    });
}
