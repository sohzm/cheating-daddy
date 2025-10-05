if (require('electron-squirrel-startup')) {
    process.exit(0);
}

// Load environment variables
require('dotenv').config();

const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { createWindow, updateGlobalShortcuts } = require('./utils/window');
const { setupGeminiIpcHandlers, stopMacOSAudioCapture, sendToRenderer } = require('./utils/gemini');
const { cerebrasService } = require('./utils/cerebras');
const { composioService, findWorkflowMatchFromText, getWorkflowMetadata } = require('./utils/composio');
const { initializeRandomProcessNames } = require('./utils/processRandomizer');
const { applyAntiAnalysisMeasures } = require('./utils/stealthFeatures');
const { getLocalConfig, writeConfig } = require('./config');

const geminiSessionRef = { current: null };
let mainWindow = null;

// Initialize random process names for stealth
const randomNames = initializeRandomProcessNames();

function createMainWindow() {
    const config = getLocalConfig();
    mainWindow = createWindow(sendToRenderer, geminiSessionRef, randomNames, config);
    return mainWindow;
}

app.whenReady().then(async () => {
    // Apply anti-analysis measures with random delay
    await applyAntiAnalysisMeasures();

    createMainWindow();
    setupGeminiIpcHandlers(geminiSessionRef, mainWindow);
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

    ipcMain.handle('update-content-protection', async (event, contentProtectionValue) => {
        try {
            if (!mainWindow) {
                return { success: false, error: 'No active window' };
            }

            let enabled;
            if (typeof contentProtectionValue === 'boolean') {
                enabled = contentProtectionValue;
            } else {
                try {
                    enabled = await mainWindow.webContents.executeJavaScript(
                        'window?.cheddar?.getContentProtection?.() ?? true'
                    );
                } catch (lookupError) {
                    console.warn('Falling back to default content protection value:', lookupError);
                    enabled = true;
                }
            }

            mainWindow.setContentProtection(Boolean(enabled));
            console.log('Content protection updated:', Boolean(enabled));
            return { success: true, contentProtection: Boolean(enabled) };
        } catch (error) {
            console.error('Error updating content protection:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-composio-api-key', async (event) => {
        try {
            return { success: true, apiKey: process.env.COMPOSIO_API_KEY || null };
        } catch (error) {
            console.error('Error getting Composio API key:', error);
            return { success: false, error: error.message };
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

            if (response && typeof response.text === 'string' && response.text.trim().length > 0) {
                return { success: true, response };
            } else {
                return { success: false, error: 'Failed to generate response from Cerebras' };
            }
        } catch (error) {
            console.error('Error generating Cerebras response:', error);
            return { success: false, error: error.message || 'Unknown error occurred' };
        }
    });

    ipcMain.handle('cerebras-trigger-workflow', async (event, payload = {}) => {
        try {
            const {
                workflowKey,
                targetText,
                taskSummary,
                userMessage,
                fallbackWorkflow,
                externalUserId = 'default-user',
            } = payload;

            let workflow = null;

            if (typeof workflowKey === 'string' && workflowKey.trim()) {
                const normalizedKey = workflowKey.trim().toLowerCase().replace(/[\s-]+/g, '_');
                workflow = getWorkflowMetadata(normalizedKey) || findWorkflowMatchFromText(normalizedKey);
            }

            if (!workflow && typeof targetText === 'string' && targetText.trim()) {
                workflow = findWorkflowMatchFromText(targetText);
            }

            if (!workflow && fallbackWorkflow && typeof fallbackWorkflow === 'object') {
                if (typeof fallbackWorkflow.key === 'string') {
                    workflow = getWorkflowMetadata(fallbackWorkflow.key) || fallbackWorkflow;
                }
            }

            if (!workflow && typeof taskSummary === 'string' && taskSummary.trim()) {
                workflow = findWorkflowMatchFromText(taskSummary);
            }

            if (!workflow && typeof userMessage === 'string' && userMessage.trim()) {
                workflow = findWorkflowMatchFromText(userMessage);
            }

            if (!workflow) {
                return { success: false, error: 'No matching Composio workflow found.' };
            }

            if (!composioService.isServiceInitialized()) {
                const apiKey = process.env.COMPOSIO_API_KEY;
                if (!apiKey) {
                    return { success: false, error: 'Composio API key is not configured.' };
                }
                const initialized = await composioService.initialize(apiKey, process.env.GEMINI_API_KEY);
                if (!initialized) {
                    return { success: false, error: 'Failed to initialize Composio service.' };
                }
            }

            const taskInstructions =
                (typeof taskSummary === 'string' && taskSummary.trim())
                    ? taskSummary.trim()
                    : (typeof userMessage === 'string' && userMessage.trim())
                        ? userMessage.trim()
                        : `Complete a ${workflow.label} task`;

            const execution = await composioService.executeWorkflowTask(externalUserId, workflow.key, taskInstructions, {
                tools: workflow.defaultTools,
            });

            if (execution?.success) {
                return {
                    success: true,
                    workflow,
                    execution,
                };
            }

            if (execution?.requiresConnection) {
                const linkResult = await composioService.startWorkflowLink(externalUserId, workflow.key);
                if (!linkResult || !linkResult.success) {
                    return {
                        success: false,
                        requiresConnection: true,
                        workflow,
                        error: execution.error || linkResult?.error || 'Failed to start Composio workflow.',
                    };
                }

                return {
                    success: true,
                    workflow: linkResult.workflow || workflow,
                    redirectUrl: linkResult.redirectUrl || null,
                    requiresConnection: true,
                    error: execution.error,
                };
            }

            return {
                success: false,
                workflow,
                error: execution?.error || 'Failed to execute workflow task.',
                execution,
            };
        } catch (error) {
            console.error('Error triggering Composio workflow:', error);
            return { success: false, error: error.message || 'Unknown error occurred' };
        }
    });

    // Gemini search integration (triggered by Cerebras)
    ipcMain.handle('perform-gemini-search', async (event, options) => {
        try {
            const { userMessage, initialResponse, profile, searchQuery } = options;
            
            if (!userMessage || typeof userMessage !== 'string') {
                throw new Error('Invalid user message provided');
            }

            const resolvedQuery = typeof searchQuery === 'string' && searchQuery.trim().length > 0 ? searchQuery.trim() : userMessage;

            // Use Gemini for web search with Google Search enabled
            const { GoogleGenAI } = require('@google/genai');
            const client = new GoogleGenAI({
                vertexai: false,
                apiKey: process.env.GEMINI_API_KEY,
            });

            const searchPrompt = `You are enhancing an assistant's reply using real-time data.
User question: "${userMessage}"
Initial assistant reply: "${initialResponse}"
Google search query to run: "${resolvedQuery}"

Instructions:
- Use the Google Search tool with the provided query (adapt if necessary).
- Synthesize the latest information into a helpful answer.
- Reference or cite sources when possible.
- Maintain the tone of the ${profile || 'assistant'} assistant.`;

            const response = await client.models.generateContent({
                model: 'gemini-2.0-flash-001',
                contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
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
