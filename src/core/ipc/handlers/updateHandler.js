/**
 * Update IPC Handler
 *
 * Centralizes all update-related IPC channels (4 total):
 * - close-update-window (once) - Close update dialog
 * - close-upgrade-window (once) - Close upgrade dialog
 * - start-update-download (handle) - Start downloading update
 * - apply-update (handle) - Apply downloaded update
 *
 * Note: The close-*-window handlers are registered with ipcMain.once()
 * and must be re-registered each time a dialog is created.
 *
 * All handlers follow the response pattern:
 * {success: boolean, data?: any, error?: string}
 */

const { ipcMain, app, shell } = require('electron');
const path = require('path');

// Track active dialog windows
let activeUpdateWindow = null;
let activeUpgradeWindow = null;

/**
 * Initialize update IPC handlers
 * @param {Object} deps - Dependencies
 */
function registerUpdateHandlers({}) {
    console.log('[UpdateHandler] Registering 2 persistent update IPC handlers...');

    // ============ START UPDATE DOWNLOAD ============
    ipcMain.handle('start-update-download', async (event, updateUrl) => {
        try {
            // Validate URL
            const parsed = new URL(updateUrl);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return { success: false, error: 'Invalid URL protocol' };
            }

            // Open the download URL in the browser
            await shell.openExternal(updateUrl);
            return { success: true };
        } catch (error) {
            console.error('Error starting update download:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ APPLY UPDATE ============
    ipcMain.handle('apply-update', async () => {
        try {
            // In Electron Forge, we typically just quit and let the user
            // install the new version manually (or use auto-updater)
            console.log('Apply update requested - quitting application');
            app.quit();
            return { success: true };
        } catch (error) {
            console.error('Error applying update:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('[UpdateHandler] Registered 2 persistent update IPC handlers');
    console.log('[UpdateHandler] Dialog close handlers will be registered dynamically');
}

/**
 * Register one-time close handler for update window
 * @param {BrowserWindow} updateWindow - The update window instance
 */
function registerUpdateWindowCloseHandler(updateWindow) {
    if (!updateWindow) return;

    activeUpdateWindow = updateWindow;

    ipcMain.once('close-update-window', () => {
        console.log('[UpdateHandler] Closing update window');
        if (activeUpdateWindow && !activeUpdateWindow.isDestroyed()) {
            activeUpdateWindow.close();
        }
        activeUpdateWindow = null;
    });
}

/**
 * Register one-time close handler for upgrade window
 * @param {BrowserWindow} upgradeWindow - The upgrade window instance
 */
function registerUpgradeWindowCloseHandler(upgradeWindow) {
    if (!upgradeWindow) return;

    activeUpgradeWindow = upgradeWindow;

    ipcMain.once('close-upgrade-window', () => {
        console.log('[UpdateHandler] Closing upgrade window');
        if (activeUpgradeWindow && !activeUpgradeWindow.isDestroyed()) {
            activeUpgradeWindow.close();
        }
        activeUpgradeWindow = null;
    });
}

module.exports = {
    registerUpdateHandlers,
    registerUpdateWindowCloseHandler,
    registerUpgradeWindowCloseHandler,
};
