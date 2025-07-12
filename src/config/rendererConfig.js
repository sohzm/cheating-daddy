const { ipcRenderer } = require('electron');

// Simple debounce function for performance
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Config API for renderer process
const rendererConfig = {
    // Get all config
    getAll: async () => {
        return await ipcRenderer.invoke('config:getAll');
    },
    
    // Get specific config value
    get: async (key) => {
        return await ipcRenderer.invoke('config:get', key);
    },
    
    // Validate config values before setting
    _validateConfigValue: (key, value) => {
        // Basic validation rules
        const validationRules = {
            'app.apiKey': v => typeof v === 'string',
            'app.selectedProfile': v => typeof v === 'string' && ['interview', 'exam', 'general'].includes(v),
            'app.selectedLanguage': v => typeof v === 'string',
            'app.selectedScreenshotInterval': v => typeof v === 'string',
            'app.selectedImageQuality': v => typeof v === 'string' && ['low', 'medium', 'high'].includes(v),
            'app.advancedMode': v => typeof v === 'boolean',
            'app.onboardingCompleted': v => typeof v === 'boolean',
            'window.width': v => typeof v === 'number' && v > 0,
            'window.height': v => typeof v === 'number' && v > 0,
            'window.x': v => v === null || typeof v === 'number',
            'window.y': v => v === null || typeof v === 'number',
            'window.layoutMode': v => typeof v === 'string' && ['normal', 'compact'].includes(v),
            'advanced.contentProtection': v => typeof v === 'boolean',
            'advanced.throttleTokens': v => typeof v === 'boolean',
            'advanced.maxTokensPerMin': v => typeof v === 'number' && v > 0,
            'advanced.throttleAtPercent': v => typeof v === 'number' && v > 0 && v <= 100
        };
        
        const validator = validationRules[key];
        if (validator) {
            return validator(value);
        }
        
        // Allow unknown keys for flexibility
        return true;
    },

    // Debounced set for frequent updates
    _debouncedSet: null,
    _pendingUpdates: new Map(),

    // Set specific config value with validation and debouncing
    set: async (key, value) => {
        if (!rendererConfig._validateConfigValue(key, value)) {
            console.warn(`Invalid config value for ${key}:`, value);
            return false;
        }

        // For critical config (like window position), don't debounce
        const criticalKeys = ['window.x', 'window.y', 'app.apiKey'];
        if (criticalKeys.includes(key)) {
            return await ipcRenderer.invoke('config:set', key, value);
        }

        // For other configs, use debouncing to improve performance
        return new Promise((resolve) => {
            rendererConfig._pendingUpdates.set(key, { value, resolve });
            
            if (!rendererConfig._debouncedSet) {
                rendererConfig._debouncedSet = debounce(async () => {
                    const updates = Array.from(rendererConfig._pendingUpdates.entries());
                    rendererConfig._pendingUpdates.clear();
                    
                    // Batch process all pending updates
                    for (const [k, { value: v, resolve: r }] of updates) {
                        try {
                            const result = await ipcRenderer.invoke('config:set', k, v);
                            r(result);
                        } catch (error) {
                            console.error(`Failed to set config ${k}:`, error);
                            r(false);
                        }
                    }
                }, 300); // 300ms debounce
            }
            
            rendererConfig._debouncedSet();
        });
    },
    
    // Window config
    getWindowConfig: async () => {
        return await ipcRenderer.invoke('config:getWindowConfig');
    },
    
    setWindowConfig: async (config) => {
        return await ipcRenderer.invoke('config:setWindowConfig', config);
    },
    
    // App config
    getAppConfig: async () => {
        return await ipcRenderer.invoke('config:getAppConfig');
    },
    
    setAppConfig: async (config) => {
        return await ipcRenderer.invoke('config:setAppConfig', config);
    },
    
    // Keybinds
    getKeybinds: async () => {
        return await ipcRenderer.invoke('config:getKeybinds');
    },
    
    setKeybinds: async (keybinds) => {
        return await ipcRenderer.invoke('config:setKeybinds', keybinds);
    },
    
    resetKeybinds: async () => {
        return await ipcRenderer.invoke('config:resetKeybinds');
    },
    
    // Advanced settings
    getAdvancedConfig: async () => {
        return await ipcRenderer.invoke('config:getAdvancedConfig');
    },
    
    setAdvancedConfig: async (config) => {
        return await ipcRenderer.invoke('config:setAdvancedConfig', config);
    },
    
    // Reset all to defaults
    reset: async () => {
        return await ipcRenderer.invoke('config:reset');
    },
    
    // Check if first run
    isFirstRun: async () => {
        return await ipcRenderer.invoke('config:isFirstRun');
    },
    
    // Sync methods for initial load (cached values)
    _cache: {},
    _initialized: false,
    _initPromise: null,
    _initializationAttempts: 0,
    _maxAttempts: 3,
    
    // Initialize cache with better race condition handling
    initCache: async () => {
        // If already initialized, return immediately
        if (rendererConfig._initialized) {
            return;
        }
        
        // If initialization is in progress, wait for it
        if (rendererConfig._initPromise) {
            return rendererConfig._initPromise;
        }
        
        rendererConfig._initPromise = (async () => {
            while (rendererConfig._initializationAttempts < rendererConfig._maxAttempts && !rendererConfig._initialized) {
                rendererConfig._initializationAttempts++;
                
                try {
                    console.log(`Config init attempt ${rendererConfig._initializationAttempts}/${rendererConfig._maxAttempts}`);
                    
                    // Shorter timeout for each attempt
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Config initialization timeout')), 2000);
                    });
                    
                    const configPromise = rendererConfig.getAll();
                    rendererConfig._cache = await Promise.race([configPromise, timeoutPromise]);
                    rendererConfig._initialized = true;
                    console.log('Config cache loaded successfully:', Object.keys(rendererConfig._cache));
                    break;
                } catch (error) {
                    console.warn(`Config init attempt ${rendererConfig._initializationAttempts} failed:`, error);
                    
                    if (rendererConfig._initializationAttempts >= rendererConfig._maxAttempts) {
                        console.error('All config initialization attempts failed, using empty cache');
                        rendererConfig._cache = {};
                        rendererConfig._initialized = false;
                        break;
                    }
                    
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        })();
        
        await rendererConfig._initPromise;
        
        // Listen for config changes from main process
        ipcRenderer.on('config:changed', (event, { key, value }) => {
            // Update cache when config changes
            const keys = key.split('.');
            let current = rendererConfig._cache;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = value;
        });
    },
    
    // Sync getters for cached values
    getCached: (key) => {
        // If cache is not initialized, return undefined with warning
        if (!rendererConfig._initialized) {
            console.warn(`Config cache not initialized yet, returning undefined for key: ${key}`);
            return undefined;
        }
        
        const keys = key.split('.');
        let value = rendererConfig._cache;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return undefined;
            }
        }
        
        return value;
    }
};

module.exports = rendererConfig;