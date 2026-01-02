/**
 * Preload script for Electron windows
 * Safely exposes IPC functionality using contextBridge
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Update status listener for splash screen
    onUpdateStatus: (callback) => {
        const handler = (event, status) => callback(status);
        ipcRenderer.on('update-status', handler);
        // Return cleanup function
        return () => ipcRenderer.removeListener('update-status', handler);
    },

    // Update info listener for update window
    onUpdateInfo: (callback) => {
        const handler = (event, updateInfo) => callback(updateInfo);
        ipcRenderer.on('update-info', handler);
        // Return cleanup function
        return () => ipcRenderer.removeListener('update-info', handler);
    },

    // Close update window with action
    closeUpdateWindow: (action) => {
        ipcRenderer.send('close-update-window', action);
    },

    // Upgrade info listener for upgrade/config reset window
    onUpgradeInfo: (callback) => {
        const handler = (event, upgradeInfo) => callback(upgradeInfo);
        ipcRenderer.on('upgrade-info', handler);
        // Return cleanup function
        return () => ipcRenderer.removeListener('upgrade-info', handler);
    },

    // Close upgrade window with action
    closeUpgradeWindow: (action) => {
        ipcRenderer.send('close-upgrade-window', action);
    },
});
