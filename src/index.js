if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { createWindow, updateGlobalShortcuts } = require('./utils/window');
const { setupGeminiIpcHandlers, stopMacOSAudioCapture, sendToRenderer } = require('./utils/gemini');
const { initializeRandomProcessNames } = require('./utils/processRandomizer');
const { applyAntiAnalysisMeasures } = require('./utils/stealthFeatures');
const config = require('./config/store');

const geminiSessionRef = { current: null };
let mainWindow = null;

// Initialize random process names for stealth
const randomNames = initializeRandomProcessNames();

function createMainWindow() {
    mainWindow = createWindow(sendToRenderer, geminiSessionRef, randomNames);
    return mainWindow;
}

app.whenReady().then(async () => {
    // Apply anti-analysis measures with random delay
    await applyAntiAnalysisMeasures();

    createMainWindow();
    setupGeminiIpcHandlers(geminiSessionRef);
    setupGeneralIpcHandlers();
    setupConfigIpcHandlers();
    
    // Migrate from localStorage on first run after window is ready
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.once('dom-ready', async () => {
            // Add minimal delay to ensure renderer is initialized
            setTimeout(async () => {
                try {
                    await config.migrateFromLocalStorage(mainWindow.webContents);
                } catch (error) {
                    console.error('Migration failed:', error);
                }
            }, 200);
        });
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

function setupGeneralIpcHandlers() {
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
            updateGlobalShortcuts(newKeybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }
    });

    ipcMain.handle('update-content-protection', async (event, contentProtection) => {
        try {
            if (mainWindow) {

                // Get content protection setting from localStorage via cheddar
                const contentProtection = await mainWindow.webContents.executeJavaScript('cheddar.getContentProtection()');
                mainWindow.setContentProtection(contentProtection);
                console.log('Content protection updated:', contentProtection);
            }
            return { success: true };
        } catch (error) {
            console.error('Error updating content protection:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-random-display-name', async event => {
        try {
            return randomNames ? randomNames.displayName : 'System Monitor';
        } catch (error) {
            console.error('Error getting random display name:', error);
            return 'System Monitor';
        }
    });
}

function setupConfigIpcHandlers() {
    // Get all config
    ipcMain.handle('config:getAll', () => {
        return config.getAll();
    });
    
    // Get specific config value
    ipcMain.handle('config:get', (event, key) => {
        return config.get(key);
    });
    
    // Set specific config value
    ipcMain.handle('config:set', (event, key, value) => {
        config.set(key, value);
        // Notify renderer of change
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('config:changed', { key, value });
        }
        return true;
    });
    
    // Window config
    ipcMain.handle('config:getWindowConfig', () => {
        return config.getWindowConfig();
    });
    
    ipcMain.handle('config:setWindowConfig', (event, windowConfig) => {
        config.setWindowConfig(windowConfig);
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('config:changed', { key: 'window', value: config.getWindowConfig() });
        }
        return true;
    });
    
    // App config
    ipcMain.handle('config:getAppConfig', () => {
        return config.getAppConfig();
    });
    
    ipcMain.handle('config:setAppConfig', (event, appConfig) => {
        config.setAppConfig(appConfig);
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('config:changed', { key: 'app', value: config.getAppConfig() });
        }
        return true;
    });
    
    // Keybinds
    ipcMain.handle('config:getKeybinds', () => {
        return config.getKeybinds();
    });
    
    ipcMain.handle('config:setKeybinds', (event, keybinds) => {
        config.setKeybinds(keybinds);
        // Also update global shortcuts
        if (mainWindow) {
            updateGlobalShortcuts(config.getKeybinds(), mainWindow, sendToRenderer, geminiSessionRef);
        }
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('config:changed', { key: 'keybinds', value: config.getKeybinds() });
        }
        return true;
    });
    
    ipcMain.handle('config:resetKeybinds', () => {
        config.resetKeybinds();
        // Also update global shortcuts
        if (mainWindow) {
            updateGlobalShortcuts(config.getKeybinds(), mainWindow, sendToRenderer, geminiSessionRef);
        }
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('config:changed', { key: 'keybinds', value: config.getKeybinds() });
        }
        return true;
    });
    
    // Advanced settings
    ipcMain.handle('config:getAdvancedConfig', () => {
        return config.getAdvancedConfig();
    });
    
    ipcMain.handle('config:setAdvancedConfig', (event, advancedConfig) => {
        config.setAdvancedConfig(advancedConfig);
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('config:changed', { key: 'advanced', value: config.getAdvancedConfig() });
        }
        return true;
    });
    
    // Reset all
    ipcMain.handle('config:reset', () => {
        config.reset();
        // Also update global shortcuts
        if (mainWindow) {
            updateGlobalShortcuts(config.getKeybinds(), mainWindow, sendToRenderer, geminiSessionRef);
        }
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('config:changed', { key: 'all', value: config.getAll() });
        }
        return true;
    });
    
    // Check if first run
    ipcMain.handle('config:isFirstRun', () => {
        return config.isFirstRun();
    });
}
