const Store = require('electron-store');

// Default keybinds constant
const DEFAULT_KEYBINDS = {
    moveUp: process.platform === 'darwin' ? 'Alt+Up' : 'Ctrl+Up',
    moveDown: process.platform === 'darwin' ? 'Alt+Down' : 'Ctrl+Down',
    moveLeft: process.platform === 'darwin' ? 'Alt+Left' : 'Ctrl+Left',
    moveRight: process.platform === 'darwin' ? 'Alt+Right' : 'Ctrl+Right',
    toggleVisibility: process.platform === 'darwin' ? 'Cmd+\\' : 'Ctrl+\\',
    toggleClickThrough: process.platform === 'darwin' ? 'Cmd+M' : 'Ctrl+M',
    nextStep: process.platform === 'darwin' ? 'Cmd+Enter' : 'Ctrl+Enter',
    previousResponse: process.platform === 'darwin' ? 'Cmd+[' : 'Ctrl+[',
    nextResponse: process.platform === 'darwin' ? 'Cmd+]' : 'Ctrl+]',
    scrollUp: process.platform === 'darwin' ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
    scrollDown: process.platform === 'darwin' ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down'
};

// Create store instance with schema validation
const store = new Store({
    name: 'cheating-daddy-config',
    defaults: {
        window: {
            width: 1100,
            height: 600,
            x: null,
            y: null,
            layoutMode: 'normal'
        },
        app: {
            onboardingCompleted: false,
            selectedProfile: 'interview',
            selectedLanguage: 'en-US',
            selectedScreenshotInterval: '5',
            selectedImageQuality: 'medium',
            advancedMode: false,
            apiKey: '',
            customPrompt: ''
        },
        keybinds: DEFAULT_KEYBINDS,
        advanced: {
            throttleTokens: false,
            maxTokensPerMin: 1000000,
            throttleAtPercent: 75,
            contentProtection: true,
            googleSearchEnabled: true,
            backgroundTransparency: 0.8,
            fontSize: 20
        }
    },
    schema: {
        window: {
            type: 'object',
            properties: {
                width: { type: 'number', minimum: 300, maximum: 3000 },
                height: { type: 'number', minimum: 200, maximum: 2000 },
                x: { type: ['number', 'null'] },
                y: { type: ['number', 'null'] },
                layoutMode: { type: 'string', enum: ['normal', 'compact'] }
            }
        },
        app: {
            type: 'object',
            properties: {
                onboardingCompleted: { type: 'boolean' },
                selectedProfile: { type: 'string' },
                selectedLanguage: { type: 'string' },
                selectedScreenshotInterval: { type: 'string' },
                selectedImageQuality: { type: 'string', enum: ['low', 'medium', 'high'] },
                advancedMode: { type: 'boolean' },
                apiKey: { type: 'string' },
                customPrompt: { type: 'string' }
            }
        },
        keybinds: {
            type: 'object',
            additionalProperties: { type: 'string' }
        },
        advanced: {
            type: 'object',
            properties: {
                throttleTokens: { type: 'boolean' },
                maxTokensPerMin: { type: 'number', minimum: 1000 },
                throttleAtPercent: { type: 'number', minimum: 1, maximum: 100 },
                contentProtection: { type: 'boolean' },
                googleSearchEnabled: { type: 'boolean' },
                backgroundTransparency: { type: 'number', minimum: 0, maximum: 1 },
                fontSize: { type: 'number', minimum: 8, maximum: 32 }
            }
        }
    },
    migrations: {
        '0.0.1': store => {
            // Migration to handle old localStorage data if needed
            console.log('Running config migration 0.0.1');
        }
    }
});

// Helper functions for config access
const config = {
    // Get all config
    getAll: () => store.store,
    
    // Get specific section
    get: (key) => {
        try {
            return store.get(key);
        } catch (error) {
            console.error(`Failed to get config for key '${key}':`, error);
            return undefined;
        }
    },
    
    // Set specific value
    set: (key, value) => {
        try {
            return store.set(key, value);
        } catch (error) {
            console.error(`Failed to set config for key '${key}':`, error);
            return false;
        }
    },
    
    // Window config
    getWindowConfig: () => {
        try {
            return store.get('window');
        } catch (error) {
            console.error('Failed to get window config:', error);
            return { width: 1100, height: 600, x: null, y: null, layoutMode: 'normal' };
        }
    },
    setWindowConfig: (config) => {
        try {
            return store.set('window', { ...store.get('window'), ...config });
        } catch (error) {
            console.error('Failed to set window config:', error);
            return false;
        }
    },
    
    // App config
    getAppConfig: () => {
        try {
            return store.get('app');
        } catch (error) {
            console.error('Failed to get app config:', error);
            return {
                onboardingCompleted: false,
                selectedProfile: 'interview',
                selectedLanguage: 'en-US',
                selectedScreenshotInterval: '5',
                selectedImageQuality: 'medium',
                advancedMode: false,
                apiKey: '',
                customPrompt: ''
            };
        }
    },
    setAppConfig: (config) => {
        try {
            return store.set('app', { ...store.get('app'), ...config });
        } catch (error) {
            console.error('Failed to set app config:', error);
            return false;
        }
    },
    
    // Keybinds
    getKeybinds: () => {
        try {
            return store.get('keybinds');
        } catch (error) {
            console.error('Failed to get keybinds:', error);
            return DEFAULT_KEYBINDS;
        }
    },
    setKeybinds: (keybinds) => {
        try {
            return store.set('keybinds', { ...store.get('keybinds'), ...keybinds });
        } catch (error) {
            console.error('Failed to set keybinds:', error);
            return false;
        }
    },
    resetKeybinds: () => {
        try {
            return store.set('keybinds', DEFAULT_KEYBINDS);
        } catch (error) {
            console.error('Failed to reset keybinds:', error);
            return false;
        }
    },
    
    // Advanced settings
    getAdvancedConfig: () => store.get('advanced'),
    setAdvancedConfig: (config) => store.set('advanced', { ...store.get('advanced'), ...config }),
    
    // Reset all to defaults
    reset: () => store.clear(),
    
    // Check if first run
    isFirstRun: () => !store.get('app.onboardingCompleted'),
    
    // Migration from localStorage (to be called once during app startup)
    migrateFromLocalStorage: async (webContents) => {
        try {
            // Wait for the renderer to be fully ready
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check if webContents is still valid
            if (!webContents || webContents.isDestroyed()) {
                console.log('WebContents not available for migration');
                return;
            }
            
            const localStorageData = await webContents.executeJavaScript(`
                (function() {
                    try {
                        // Check if localStorage is available
                        if (typeof localStorage === 'undefined') {
                            console.log('localStorage not available yet');
                            return {};
                        }
                        
                        const data = {};
                        const keys = [
                            'onboardingCompleted', 'selectedProfile', 'selectedLanguage',
                            'selectedScreenshotInterval', 'selectedImageQuality', 'layoutMode',
                            'advancedMode', 'apiKey', 'customPrompt', 'customKeybinds',
                            'throttleTokens', 'maxTokensPerMin', 'throttleAtPercent',
                            'contentProtection', 'googleSearchEnabled', 'backgroundTransparency',
                            'fontSize'
                        ];
                        
                        keys.forEach(key => {
                            try {
                                const value = localStorage.getItem(key);
                                if (value !== null) {
                                    data[key] = value;
                                }
                            } catch (e) {
                                console.warn('Failed to get localStorage item:', key, e);
                            }
                        });
                        
                        return data;
                    } catch (error) {
                        console.error('Error in migration script:', error);
                        return {};
                    }
                })()
            `);
            
            // Migrate app settings
            if (localStorageData.onboardingCompleted === 'true') {
                store.set('app.onboardingCompleted', true);
            }
            if (localStorageData.selectedProfile) {
                store.set('app.selectedProfile', localStorageData.selectedProfile);
            }
            if (localStorageData.selectedLanguage) {
                store.set('app.selectedLanguage', localStorageData.selectedLanguage);
            }
            if (localStorageData.selectedScreenshotInterval) {
                store.set('app.selectedScreenshotInterval', localStorageData.selectedScreenshotInterval);
            }
            if (localStorageData.selectedImageQuality) {
                store.set('app.selectedImageQuality', localStorageData.selectedImageQuality);
            }
            if (localStorageData.advancedMode === 'true') {
                store.set('app.advancedMode', true);
            }
            if (localStorageData.apiKey) {
                store.set('app.apiKey', localStorageData.apiKey);
            }
            if (localStorageData.customPrompt) {
                store.set('app.customPrompt', localStorageData.customPrompt);
            }
            
            // Migrate window settings
            if (localStorageData.layoutMode) {
                store.set('window.layoutMode', localStorageData.layoutMode);
            }
            
            // Migrate keybinds
            if (localStorageData.customKeybinds) {
                try {
                    const keybinds = JSON.parse(localStorageData.customKeybinds);
                    store.set('keybinds', { ...store.get('keybinds'), ...keybinds });
                } catch (e) {
                    console.error('Failed to parse custom keybinds:', e);
                }
            }
            
            // Migrate advanced settings
            if (localStorageData.throttleTokens === 'true') {
                store.set('advanced.throttleTokens', true);
            }
            if (localStorageData.maxTokensPerMin) {
                store.set('advanced.maxTokensPerMin', parseInt(localStorageData.maxTokensPerMin, 10));
            }
            if (localStorageData.throttleAtPercent) {
                store.set('advanced.throttleAtPercent', parseInt(localStorageData.throttleAtPercent, 10));
            }
            if (localStorageData.contentProtection === 'false') {
                store.set('advanced.contentProtection', false);
            }
            if (localStorageData.googleSearchEnabled === 'true') {
                store.set('advanced.googleSearchEnabled', true);
            }
            if (localStorageData.backgroundTransparency) {
                store.set('advanced.backgroundTransparency', parseInt(localStorageData.backgroundTransparency, 10));
            }
            if (localStorageData.fontSize) {
                store.set('advanced.fontSize', parseInt(localStorageData.fontSize, 10));
            }
            
            console.log('Successfully migrated localStorage data to electron-store');
            
            // Clear localStorage after successful migration
            if (!webContents.isDestroyed()) {
                await webContents.executeJavaScript(`
                    (function() {
                        try {
                            if (typeof localStorage === 'undefined') {
                                console.log('localStorage not available for cleanup');
                                return;
                            }
                            
                            const keys = [
                                'onboardingCompleted', 'selectedProfile', 'selectedLanguage',
                                'selectedScreenshotInterval', 'selectedImageQuality', 'layoutMode',
                                'advancedMode', 'apiKey', 'customPrompt', 'customKeybinds',
                                'throttleTokens', 'maxTokensPerMin', 'throttleAtPercent',
                                'contentProtection', 'googleSearchEnabled', 'backgroundTransparency',
                                'fontSize'
                            ];
                            
                            keys.forEach(key => {
                                try {
                                    localStorage.removeItem(key);
                                } catch (e) {
                                    console.warn('Failed to remove localStorage item:', key, e);
                                }
                            });
                            
                            console.log('Cleared migrated keys from localStorage');
                        } catch (error) {
                            console.error('Error cleaning up localStorage:', error);
                        }
                    })()
                `);
            }
            
        } catch (error) {
            console.error('Error migrating from localStorage:', error);
        }
    }
};

module.exports = config;