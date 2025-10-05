if (require('electron-squirrel-startup')) {
    process.exit(0);
}

// Load environment variables
require('dotenv').config();

const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { createWindow, updateGlobalShortcuts } = require('./utils/window');
const { setupGeminiIpcHandlers, stopMacOSAudioCapture, sendToRenderer } = require('./utils/gemini');
const { cerebrasService } = require('./utils/cerebras');
const { initializeRandomProcessNames } = require('./utils/processRandomizer');
const { applyAntiAnalysisMeasures } = require('./utils/stealthFeatures');
const { getLocalConfig, writeConfig } = require('./config');

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

    // Cerebras AI integration
    ipcMain.handle('generate-cerebras-response', async (event, options) => {
        try {
            const { userMessage, systemPrompt, history, temperature, maxTokens } = options;
            
            if (!userMessage || typeof userMessage !== 'string') {
                throw new Error('Invalid user message provided');
            }

            const response = await cerebrasService.generateReply(userMessage, {
                systemPrompt,
                history,
                temperature,
                maxTokens
            });

            if (response) {
                return { success: true, response };
            } else {
                return { success: false, error: 'Failed to generate response from Cerebras' };
            }
        } catch (error) {
            console.error('Error generating Cerebras response:', error);
            return { success: false, error: error.message || 'Unknown error occurred' };
        }
    });

    // Gemini search integration (triggered by Cerebras)
    ipcMain.handle('perform-gemini-search', async (event, options) => {
        try {
            const { userMessage, initialResponse, profile } = options;
            
            if (!userMessage || typeof userMessage !== 'string') {
                throw new Error('Invalid user message provided');
            }

            // Use Gemini for web search with Google Search enabled
            const { GoogleGenAI } = require('@google/genai');
            const client = new GoogleGenAI({
                vertexai: false,
                apiKey: process.env.GEMINI_API_KEY,
            });

            const searchPrompt = `Based on the user's question: "${userMessage}" and the initial response: "${initialResponse}", please provide an enhanced response using current web search information. Include relevant, up-to-date details and cite sources when appropriate.`;

            const response = await client.models.generateContent({
                model: 'gemini-2.0-flash-001',
                contents: searchPrompt,
                tools: [{ googleSearch: {} }]
            });

            if (response && response.text) {
                return { success: true, response: response.text };
            } else {
                return { success: false, error: 'Failed to generate search-enhanced response from Gemini' };
            }
        } catch (error) {
            console.error('Error performing Gemini search:', error);
            return { success: false, error: error.message || 'Unknown error occurred' };
        }
    });
}
