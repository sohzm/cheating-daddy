if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('node:path');
const { createWindow, updateGlobalShortcuts } = require('./utils/window');
const { setupGeminiIpcHandlers, stopMacOSAudioCapture, sendToRenderer } = require('./utils/gemini');
const { initializeRandomProcessNames } = require('./utils/processRandomizer');
const { applyAntiAnalysisMeasures } = require('./utils/stealthFeatures');
const { getLocalConfig, writeConfig } = require('./config');

const geminiSessionRef = { current: null };
let mainWindow = null;
let randomNames = null; // Store random names globally

function createMainWindow() {
    // Get config to check stealth level
    const config = getLocalConfig();
    const isUltraStealth = config.stealthLevel === 'ultra';

    // Only initialize random process names for ultra stealth
    if (isUltraStealth) {
        randomNames = initializeRandomProcessNames();
    } else {
        randomNames = null;
    }
    
    mainWindow = createWindow(sendToRenderer, geminiSessionRef, randomNames);
    return mainWindow;
}

app.whenReady().then(async () => {
    // Get config to check stealth level
    const config = getLocalConfig();
    const isUltraStealth = config.stealthLevel === 'ultra';

    // Only apply anti-analysis measures if ultra stealth mode is enabled
    if (isUltraStealth) {
        await applyAntiAnalysisMeasures();
    }

    createMainWindow();
    setupGeminiIpcHandlers(geminiSessionRef);
    setupGeneralIpcHandlers();
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
    // Config-related IPC handlers
    ipcMain.handle('set-onboarded', async (event) => {
        try {
            const config = getLocalConfig();
            config.onboarded = true;
            writeConfig(config);
            return { success: true, config };
        } catch (error) {
            console.error('Error setting onboarded:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('set-stealth-level', async (event, stealthLevel) => {
        try {
            const validLevels = ['visible', 'balanced', 'ultra'];
            if (!validLevels.includes(stealthLevel)) {
                throw new Error(`Invalid stealth level: ${stealthLevel}. Must be one of: ${validLevels.join(', ')}`);
            }
            
            const config = getLocalConfig();
            config.stealthLevel = stealthLevel;
            writeConfig(config);
            return { success: true, config };
        } catch (error) {
            console.error('Error setting stealth level:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('set-layout', async (event, layout) => {
        try {
            const validLayouts = ['normal', 'compact'];
            if (!validLayouts.includes(layout)) {
                throw new Error(`Invalid layout: ${layout}. Must be one of: ${validLayouts.join(', ')}`);
            }
            
            const config = getLocalConfig();
            config.layout = layout;
            writeConfig(config);
            return { success: true, config };
        } catch (error) {
            console.error('Error setting layout:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-config', async (event) => {
        try {
            const config = getLocalConfig();
            return { success: true, config };
        } catch (error) {
            console.error('Error getting config:', error);
            return { success: false, error: error.message };
        }
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
                // Get config to check stealth level
                const config = getLocalConfig();
                const enableContentProtection = config.stealthLevel !== 'visible'; // true for 'balanced' and 'ultra', false for 'visible'

                if (enableContentProtection) {
                    // Get content protection setting from localStorage via cheddar
                    const contentProtection = await mainWindow.webContents.executeJavaScript('cheddar.getContentProtection()');
                    mainWindow.setContentProtection(contentProtection);
                    console.log('Content protection updated:', contentProtection);
                } else {
                    // Disable content protection for 'no' stealth level
                    mainWindow.setContentProtection(false);
                    console.log('Content protection disabled (stealth level: no)');
                }
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

    ipcMain.handle('change-page-to', async (event, pageName) => {
        console.log('Received change-page-to request for:', pageName);
        try {
            const pageMap = {
                'home': 'home.html',
                'main': 'home.html',
                'onboarding': 'onboarding.html',
                'settings': 'settings.html',
                'customize': 'settings.html',
                'live': 'live.html',
                'assistant': 'live.html',
                'history': 'history.html',
                'advanced': 'advanced.html',
                'help': 'help.html'
            };

            const htmlFile = pageMap[pageName];
            if (!htmlFile) {
                throw new Error(`Unknown page: ${pageName}`);
            }

            if (mainWindow) {
                const pagePath = path.join(__dirname, '../web/pages', htmlFile);
                console.log('Loading page:', pagePath);
                await mainWindow.loadFile(pagePath);
                console.log('Page loaded successfully');
                return { success: true };
            } else {
                throw new Error('Main window not available');
            }
        } catch (error) {
            console.error('Error changing page:', error);
            return { success: false, error: error.message };
        }
    });
}
