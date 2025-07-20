const { contextBridge, ipcRenderer } = require('electron');

// Get platform information safely
const platform = process.platform;

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Platform information
    platform: platform,
    isLinux: platform === 'linux',
    isMacOS: platform === 'darwin',
    isWindows: platform === 'win32',
    
    // Gemini API
    initializeGemini: (apiKey, customPrompt, profile, language) => 
        ipcRenderer.invoke('initialize-gemini', apiKey, customPrompt, profile, language),
    
    sendAudioContent: (data) => 
        ipcRenderer.invoke('send-audio-content', data),
    
    sendImageContent: (data) => 
        ipcRenderer.invoke('send-image-content', data),
    
    sendTextMessage: (text) => 
        ipcRenderer.invoke('send-text-message', text),
    
    closeSession: () => 
        ipcRenderer.invoke('close-session'),
    
    // System API
    quitApplication: () => 
        ipcRenderer.invoke('quit-application'),
    
    openExternal: (url) => 
        ipcRenderer.invoke('open-external', url),
    
    updateContentProtection: (enabled) => 
        ipcRenderer.invoke('update-content-protection', enabled),
    
    getRandomDisplayName: () => 
        ipcRenderer.invoke('get-random-display-name'),
    
    // Window API
    windowMinimize: () => 
        ipcRenderer.invoke('window-minimize'),
    
    toggleWindowVisibility: () => 
        ipcRenderer.invoke('toggle-window-visibility'),
    
    updateSizes: () => 
        ipcRenderer.invoke('update-sizes'),
    
    // macOS Audio API
    startMacOSAudio: () => 
        ipcRenderer.invoke('start-macos-audio'),
    
    stopMacOSAudio: () => 
        ipcRenderer.invoke('stop-macos-audio'),
    
    // Event listeners
    onUpdateResponse: (callback) => {
        ipcRenderer.on('update-response', (_, response) => callback(response));
        return () => ipcRenderer.removeAllListeners('update-response');
    },
    
    onUpdateStatus: (callback) => {
        ipcRenderer.on('update-status', (_, status) => callback(status));
        return () => ipcRenderer.removeAllListeners('update-status');
    },
    
    onClickThroughToggled: (callback) => {
        ipcRenderer.on('click-through-toggled', (_, isEnabled) => callback(isEnabled));
        return () => ipcRenderer.removeAllListeners('click-through-toggled');
    },
    
    onSaveConversationTurn: (callback) => {
        ipcRenderer.on('save-conversation-turn', (_, data) => callback(data));
        return () => ipcRenderer.removeAllListeners('save-conversation-turn');
    },
    
    // One-way communications
    updateKeybinds: (keybinds) => 
        ipcRenderer.send('update-keybinds', keybinds),
    
    viewChanged: (view) => 
        ipcRenderer.send('view-changed', view),
});

// Secure localStorage wrapper that validates data
contextBridge.exposeInMainWorld('secureStorage', {
    setItem: (key, value) => {
        // Validate key and value
        if (typeof key !== 'string' || key.length === 0) {
            throw new Error('Invalid storage key');
        }
        if (typeof value !== 'string') {
            throw new Error('Storage value must be a string');
        }
        localStorage.setItem(key, value);
    },
    
    getItem: (key) => {
        if (typeof key !== 'string' || key.length === 0) {
            throw new Error('Invalid storage key');
        }
        return localStorage.getItem(key);
    },
    
    removeItem: (key) => {
        if (typeof key !== 'string' || key.length === 0) {
            throw new Error('Invalid storage key');
        }
        localStorage.removeItem(key);
    },
    
    clear: () => localStorage.clear()
});
