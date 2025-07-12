const { ipcRenderer } = require('electron');

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
    
    // Set specific config value
    set: async (key, value) => {
        return await ipcRenderer.invoke('config:set', key, value);
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
    
    // Initialize cache
    initCache: async () => {
        if (rendererConfig._initPromise) {
            return rendererConfig._initPromise;
        }
        
        rendererConfig._initPromise = (async () => {
            try {
                // Add timeout to prevent hanging
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Config initialization timeout')), 5000);
                });
                
                const configPromise = rendererConfig.getAll();
                rendererConfig._cache = await Promise.race([configPromise, timeoutPromise]);
                rendererConfig._initialized = true;
                console.log('Config cache loaded:', Object.keys(rendererConfig._cache));
            } catch (error) {
                console.error('Failed to initialize config cache:', error);
                rendererConfig._cache = {};
                rendererConfig._initialized = false;
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