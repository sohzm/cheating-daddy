const fs = require('fs');
const path = require('path');
const os = require('os');

// Default configuration
const DEFAULT_CONFIG = {
    onboarded: false,
    stealthLevel: "balanced",
    layout: "normal"
};

// Get the config directory path based on OS
function getConfigDir() {
    const platform = os.platform();
    let configDir;
    
    if (platform === 'win32') {
        // Windows: %APPDATA%\cheating-daddy-config
        configDir = path.join(os.homedir(), 'AppData', 'Roaming', 'cheating-daddy-config');
    } else if (platform === 'darwin') {
        // macOS: ~/Library/Application Support/cheating-daddy-config
        configDir = path.join(os.homedir(), 'Library', 'Application Support', 'cheating-daddy-config');
    } else {
        // Linux and others: ~/.config/cheating-daddy-config
        configDir = path.join(os.homedir(), '.config', 'cheating-daddy-config');
    }
    
    return configDir;
}

function getConfigFilePath() {
    return path.join(getConfigDir(), 'config.json');
}

// Ensure the config directory exists
function ensureConfigDir() {
    const configDir = getConfigDir();
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
}

// Read existing config or return empty object
function readExistingConfig() {
    const configFilePath = getConfigFilePath();
    
    try {
        if (fs.existsSync(configFilePath)) {
            const configData = fs.readFileSync(configFilePath, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        console.warn('Error reading config file:', error.message);
    }
    
    return {};
}

// Write config to file
function writeConfig(config) {
    ensureConfigDir();
    const configFilePath = getConfigFilePath();
    
    try {
        fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing config file:', error.message);
        throw error;
    }
}

// Merge default config with existing config
function mergeWithDefaults(existingConfig) {
    const mergedConfig = { ...DEFAULT_CONFIG };
    
    // Add any existing values that match default keys
    for (const key in DEFAULT_CONFIG) {
        if (existingConfig.hasOwnProperty(key)) {
            mergedConfig[key] = existingConfig[key];
        }
    }
    
    return mergedConfig;
}

// Main function to get local config
function getLocalConfig() {
    try {
        // Ensure config directory exists
        ensureConfigDir();
        
        // Read existing config
        const existingConfig = readExistingConfig();
        
        // Merge with defaults
        const finalConfig = mergeWithDefaults(existingConfig);
        
        // Check if we need to update the config file
        const needsUpdate = JSON.stringify(existingConfig) !== JSON.stringify(finalConfig);
        
        if (needsUpdate) {
            writeConfig(finalConfig);
            console.log('Config updated with missing fields');
        }
        
        return finalConfig;
    } catch (error) {
        console.error('Error in getLocalConfig:', error.message);
        // Return default config if anything fails
        return { ...DEFAULT_CONFIG };
    }
}

// Export only the necessary functions
module.exports = {
    getLocalConfig,
    writeConfig
}; 