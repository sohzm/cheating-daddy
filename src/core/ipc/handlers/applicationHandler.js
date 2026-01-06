/**
 * Application IPC Handler
 *
 * Contains the exact original logic from setupGeneralIpcHandlers in index.js.
 * This is a proper migration, not a delegation, because the original function
 * had inline dependencies that are now passed as parameters.
 *
 * Channels (12 total):
 * - get-app-version (handle) - Get application version
 * - quit-application (handle) - Quit the application
 * - restart-application (handle) - Restart the application
 * - open-external (handle) - Open external URL
 * - assistant:validate-api-key (handle) - Validate API key for provider
 * - log-message (on) - Log message from renderer
 * - open-update-window (handle) - Open update dialog
 * - check-permission (handle) - Check macOS permission
 * - request-permission (handle) - Request macOS permission
 * - check-macos-version (handle) - Check macOS version and audio support
 * - get-macos-system-info (handle) - Get detailed macOS system info
 * - retry-permission-check (handle) - Retry permission check with delay
 */

const { ipcMain, app, shell, systemPreferences, BrowserWindow, desktopCapturer } = require('electron');
const macOS = require('../../../utils/core/macOS');

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

    // ============ CHECK MIC PERMISSION (macOS) ============
    // Quick check for microphone permission - same pattern as InterviewCoder
    // Returns boolean for simpler usage in renderer
    ipcMain.handle('check-mic-permission', async () => {
        // On non-macOS platforms, always return true
        if (process.platform !== 'darwin') {
            return true;
        }
        try {
            return systemPreferences.getMediaAccessStatus('microphone') === 'granted';
        } catch (error) {
            console.error('Error checking mic permission:', error);
            return false;
        }
    });

    // ============ REQUEST PERMISSION (macOS) ============
    // Pattern from InterviewCoder: check status first, only prompt if 'not-determined'
    // For screen permission, use desktopCapturer.getSources() to trigger the system prompt
    ipcMain.handle('request-permission', async (event, type) => {
        console.log(`[ApplicationHandler] request-permission called for: ${type}`);

        // On non-macOS platforms, always return true
        if (process.platform !== 'darwin') {
            console.log('[ApplicationHandler] Not macOS, returning true');
            return true;
        }

        try {
            // For screen permission, use desktopCapturer.getSources() to trigger prompt
            // This is the same pattern InterviewCoder uses
            if (type === 'screen') {
                try {
                    console.log('[ApplicationHandler] Triggering screen permission via desktopCapturer...');
                    await desktopCapturer.getSources({ types: ['screen'] });
                    console.log('[ApplicationHandler] Screen permission check completed');
                    return true;
                } catch (error) {
                    console.error('[ApplicationHandler] Screen permission denied:', error);
                    return false;
                }
            }

            // For microphone, check status first then request
            if (type === 'microphone') {
                const currentStatus = systemPreferences.getMediaAccessStatus(type);
                console.log(`[ApplicationHandler] Current ${type} status: ${currentStatus}`);

                // Only prompt if 'not-determined' - this is key!
                // If already denied, the system won't show a dialog
                if (currentStatus === 'not-determined') {
                    console.log(`[ApplicationHandler] ${type} not determined, requesting access...`);
                    const result = await systemPreferences.askForMediaAccess(type);
                    console.log(`[ApplicationHandler] askForMediaAccess result: ${result}`);
                    return result;
                }

                // Return true if already granted, false otherwise
                return currentStatus === 'granted';
            }

            // For other types, just check status
            return systemPreferences.getMediaAccessStatus(type) === 'granted';
        } catch (error) {
            console.error(`[ApplicationHandler] Error requesting ${type} permission:`, error);
            return false;
        }
    });

    // ============ OPEN SYSTEM PREFERENCES (macOS) ============
    ipcMain.handle('open-system-preferences', async (event, pane) => {
        console.log(`[ApplicationHandler] open-system-preferences called for: ${pane}`);

        if (process.platform !== 'darwin') {
            console.log('[ApplicationHandler] Not macOS, returning error');
            return { success: false, error: 'Only available on macOS' };
        }

        try {
            // Map pane names to macOS System Preferences URLs
            const paneUrls = {
                microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
                screen: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
                accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
                security: 'x-apple.systempreferences:com.apple.preference.security',
            };

            const url = paneUrls[pane] || paneUrls.security;
            console.log(`[ApplicationHandler] Opening URL: ${url}`);
            await shell.openExternal(url);
            console.log('[ApplicationHandler] Successfully opened System Preferences');
            return { success: true };
        } catch (error) {
            console.error(`[ApplicationHandler] Error opening System Preferences:`, error);
            return { success: false, error: error.message };
        }
    });

    // ============ GET ALL PERMISSIONS STATUS (macOS) ============
    ipcMain.handle('get-all-permissions', async event => {
        if (process.platform !== 'darwin') {
            return {
                microphone: 'granted',
                screen: 'granted',
                isMac: false,
            };
        }

        try {
            return {
                microphone: systemPreferences.getMediaAccessStatus('microphone'),
                screen: systemPreferences.getMediaAccessStatus('screen'),
                isMac: true,
            };
        } catch (error) {
            console.error('Error getting permissions:', error);
            return {
                microphone: 'unknown',
                screen: 'unknown',
                isMac: true,
                error: error.message,
            };
        }
    });

    // ============ CHECK MACOS VERSION (macOS) ============
    ipcMain.handle('check-macos-version', async () => {
        console.log('[ApplicationHandler] check-macos-version called');

        const support = macOS.checkAudioSupport();
        const statusMessage = macOS.getVersionStatusMessage();

        console.log('[ApplicationHandler] macOS audio support:', support);

        return {
            ...support,
            ...statusMessage,
            platform: process.platform,
        };
    });

    // ============ GET MACOS SYSTEM INFO (macOS) ============
    ipcMain.handle('get-macos-system-info', async () => {
        console.log('[ApplicationHandler] get-macos-system-info called');
        return macOS.getSystemInfo();
    });

    // ============ RETRY PERMISSION CHECK (macOS) ============
    // Useful after user grants permission in System Settings
    ipcMain.handle('retry-permission-check', async (event, { type, maxRetries = 3, delayMs = 1000 }) => {
        console.log(`[ApplicationHandler] retry-permission-check for ${type} (max: ${maxRetries}, delay: ${delayMs}ms)`);

        if (process.platform !== 'darwin') {
            return { status: 'granted', retries: 0 };
        }

        let lastStatus = 'unknown';

        for (let i = 0; i < maxRetries; i++) {
            try {
                lastStatus = systemPreferences.getMediaAccessStatus(type);
                console.log(`[ApplicationHandler] Retry ${i + 1}/${maxRetries}: ${type} status = ${lastStatus}`);

                if (lastStatus === 'granted') {
                    return { status: 'granted', retries: i };
                }

                // Wait before next retry
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            } catch (error) {
                console.error(`[ApplicationHandler] Error checking ${type}:`, error);
                lastStatus = 'error';
            }
        }

        return { status: lastStatus, retries: maxRetries };
    });

    console.log('[ApplicationHandler] Registered 12 application IPC handlers');
}

module.exports = { registerApplicationHandlers };
