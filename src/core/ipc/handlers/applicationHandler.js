/**
 * Application IPC Handler
 *
 * Contains the exact original logic from setupGeneralIpcHandlers in index.js.
 * This is a proper migration, not a delegation, because the original function
 * had inline dependencies that are now passed as parameters.
 *
 * Channels (9 total):
 * - get-app-version (handle) - Get application version
 * - quit-application (handle) - Quit the application
 * - restart-application (handle) - Restart the application
 * - open-external (handle) - Open external URL
 * - assistant:validate-api-key (handle) - Validate API key for provider
 * - log-message (on) - Log message from renderer
 * - open-update-window (handle) - Open update dialog
 * - check-permission (handle) - Check macOS permission
 * - request-permission (handle) - Request macOS permission
 */

const { ipcMain, app, shell, systemPreferences, BrowserWindow } = require('electron');

/**
 * Register application IPC handlers
 * @param {Object} deps - Dependencies
 * @param {BrowserWindow} deps.mainWindow - Main window reference
 * @param {Function} deps.createUpdateWindow - Function to create update window
 * @param {Function} deps.stopMacOSAudioCapture - Function to stop macOS audio capture
 * @param {Object} deps.storage - Storage module for saving keybinds
 */
function registerApplicationHandlers({ mainWindow, createUpdateWindow, stopMacOSAudioCapture, storage }) {
    console.log('[ApplicationHandler] Registering 9 application IPC handlers...');

    // ============ APP VERSION ============
    // Original: returns just the version string
    ipcMain.handle('get-app-version', async () => {
        return app.getVersion();
    });

    // ============ QUIT APPLICATION ============
    ipcMain.handle('quit-application', async () => {
        try {
            if (stopMacOSAudioCapture) {
                stopMacOSAudioCapture();
            }
            app.quit();
            return { success: true };
        } catch (error) {
            console.error('Error quitting application:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ RESTART APPLICATION ============
    ipcMain.handle('restart-application', async (event, options = {}) => {
        try {
            if (stopMacOSAudioCapture) {
                stopMacOSAudioCapture();
            }

            // In development mode (not packaged), just reload the window instead of full restart
            // This avoids killing the Electron Forge dev server
            if (!app.isPackaged) {
                console.log('restart-application: Development mode - reloading window instead of full restart');
                const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
                if (win) {
                    win.webContents.reload();
                }
                return { success: true, mode: 'reload' };
            }

            // Production mode: full restart with args
            const relaunchArgs = process.argv.slice(1).filter(arg => arg !== '--skip-upgrade-check');

            // If skipUpgradeCheck is requested, add the flag
            if (options.skipUpgradeCheck) {
                relaunchArgs.push('--skip-upgrade-check');
                console.log('restart-application: Relaunching with --skip-upgrade-check');
            }

            app.relaunch({ args: relaunchArgs.length > 0 ? relaunchArgs : undefined });
            app.quit();
            return { success: true, mode: 'relaunch' };
        } catch (error) {
            console.error('Error restarting application:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ OPEN EXTERNAL URL ============
    ipcMain.handle('open-external', async (event, url) => {
        try {
            await shell.openExternal(url);
            return { success: true };
        } catch (error) {
            console.error('Error opening external URL:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ VALIDATE API KEY ============
    ipcMain.handle('assistant:validate-api-key', async (event, providerName, apiKey) => {
        try {
            console.log(`Validating API key for ${providerName}...`);
            let provider;

            if (providerName === 'groq') {
                const GroqProvider = require('../../../utils/providers/groq');
                provider = new GroqProvider(apiKey);
            } else if (providerName === 'gemini') {
                const GeminiProvider = require('../../../utils/providers/gemini');
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

    // ============ LOG MESSAGE ============
    // Original: just logs the message
    ipcMain.on('log-message', (event, msg) => {
        console.log(msg);
    });

    // ============ OPEN UPDATE WINDOW ============
    ipcMain.handle('open-update-window', (event, updateInfo) => {
        if (createUpdateWindow) {
            createUpdateWindow(updateInfo);
        }
        return { success: true };
    });

    // ============ CHECK PERMISSION (macOS) ============
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

    // ============ REQUEST PERMISSION (macOS) ============
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

    // ============ OPEN SYSTEM PREFERENCES (macOS) ============
    ipcMain.handle('open-system-preferences', async (event, pane) => {
        if (process.platform !== 'darwin') {
            return { success: false, error: 'Only available on macOS' };
        }

        try {
            // Map pane names to macOS System Preferences URLs
            const paneUrls = {
                microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
                screen: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
                accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
                camera: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera',
                security: 'x-apple.systempreferences:com.apple.preference.security',
            };

            const url = paneUrls[pane] || paneUrls.security;
            await shell.openExternal(url);
            return { success: true };
        } catch (error) {
            console.error(`Error opening System Preferences:`, error);
            return { success: false, error: error.message };
        }
    });

    // ============ GET ALL PERMISSIONS STATUS (macOS) ============
    ipcMain.handle('get-all-permissions', async event => {
        if (process.platform !== 'darwin') {
            return {
                microphone: 'granted',
                screen: 'granted',
                camera: 'granted',
                isMac: false,
            };
        }

        try {
            return {
                microphone: systemPreferences.getMediaAccessStatus('microphone'),
                screen: systemPreferences.getMediaAccessStatus('screen'),
                camera: systemPreferences.getMediaAccessStatus('camera'),
                isMac: true,
            };
        } catch (error) {
            console.error('Error getting permissions:', error);
            return {
                microphone: 'unknown',
                screen: 'unknown',
                camera: 'unknown',
                isMac: true,
                error: error.message,
            };
        }
    });

    console.log('[ApplicationHandler] Registered 11 application IPC handlers');
}

module.exports = { registerApplicationHandlers };
