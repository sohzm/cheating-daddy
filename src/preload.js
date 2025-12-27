// Preload script - Exposes IPC handlers to renderer process
// Since contextIsolation: false, we can set window.api directly

const { ipcRenderer } = require('electron');

// Expose window.api with all IPC handlers
window.api = {
    // ========================================================================
    // PSEUDO-LIVE ORCHESTRATOR METHODS (Production-Grade STT Pipeline)
    // ========================================================================
    
    enablePseudoLive: (enabled) => ipcRenderer.invoke('enable-pseudo-live', enabled),
    
    initializePseudoLive: (config) => ipcRenderer.invoke('initialize-pseudo-live', config),
    
    stopPseudoLive: () => ipcRenderer.invoke('stop-pseudo-live'),
    
    getPseudoLiveStatus: () => ipcRenderer.invoke('get-pseudo-live-status'),
    
    getPseudoLiveMetrics: () => ipcRenderer.invoke('get-pseudo-live-metrics'),
    
    updatePseudoLiveVADMode: (mode) => ipcRenderer.invoke('update-pseudo-live-vad-mode', mode),
    
    updatePseudoLiveLanguage: (language) => ipcRenderer.invoke('update-pseudo-live-language', language),
    
    togglePseudoLiveMicrophone: (enabled) => ipcRenderer.invoke('toggle-pseudo-live-microphone', enabled),
    
    // ========================================================================
    // GEMINI SESSION METHODS
    // ========================================================================
    
    initializeGemini: (apiKey, customPrompt, profile, language, mode, model) => 
        ipcRenderer.invoke('initialize-gemini', apiKey, customPrompt, profile, language, mode, model),
    
    sendAudioContent: ({ data, mimeType }) => 
        ipcRenderer.invoke('send-audio-content', { data, mimeType }),
    
    sendImageContent: ({ data, debug, isManual }) => 
        ipcRenderer.invoke('send-image-content', { data, debug, isManual }),
    
    sendTextMessage: (text) => 
        ipcRenderer.invoke('send-text-message', text),
    
    sendScreenshotWithText: ({ imageData, text }) => 
        ipcRenderer.invoke('send-screenshot-with-text', { imageData, text }),
    
    closeSession: () => 
        ipcRenderer.invoke('close-session'),
    
    getCurrentSession: () => 
        ipcRenderer.invoke('get-current-session'),
    
    startNewSession: () => 
        ipcRenderer.invoke('start-new-session'),
    
    // ========================================================================
    // macOS AUDIO CAPTURE METHODS
    // ========================================================================
    
    startMacOSAudio: (vadEnabled, vadMode) => 
        ipcRenderer.invoke('start-macos-audio', vadEnabled, vadMode),
    
    stopMacOSAudio: () => 
        ipcRenderer.invoke('stop-macos-audio'),
    
    toggleMacOSMicrophone: (enabled) => 
        ipcRenderer.invoke('toggle-macos-microphone', enabled),
    
    // ========================================================================
    // VAD (Voice Activity Detection) METHODS
    // ========================================================================
    
    updateVADMode: (vadMode) => 
        ipcRenderer.invoke('update-vad-mode', vadMode),
    
    updateVADSetting: (vadEnabled) => 
        ipcRenderer.invoke('update-vad-setting', vadEnabled),
    
    sendVADAudioSegment: (audioSegment) => 
        ipcRenderer.invoke('send-vad-audio-segment', audioSegment),
    
    // ========================================================================
    // CONFIGURATION METHODS
    // ========================================================================
    
    setOnboarded: () => 
        ipcRenderer.invoke('set-onboarded'),
    
    setStealthLevel: (stealthLevel) => 
        ipcRenderer.invoke('set-stealth-level', stealthLevel),
    
    setLayout: (layout) => 
        ipcRenderer.invoke('set-layout', layout),
    
    getConfig: () => 
        ipcRenderer.invoke('get-config'),
    
    updateContentProtection: (contentProtection) => 
        ipcRenderer.invoke('update-content-protection', contentProtection),
    
    updateGoogleSearchSetting: (enabled) => 
        ipcRenderer.invoke('update-google-search-setting', enabled),
    
    // ========================================================================
    // APPLICATION METHODS
    // ========================================================================
    
    quitApplication: () => 
        ipcRenderer.invoke('quit-application'),
    
    openExternal: (url) => 
        ipcRenderer.invoke('open-external', url),
    
    getRandomDisplayName: () => 
        ipcRenderer.invoke('get-random-display-name'),
    
    // ========================================================================
    // EVENT LISTENERS
    // ========================================================================
    
    /**
     * Register an event listener for IPC events
     * @param {string} channel - Event channel name
     * @param {function} callback - Callback function
     */
    on: (channel, callback) => {
        // Validate channel to prevent security issues
        const validChannels = [
            // Pseudo-live orchestrator events
            'transcript-partial',
            'transcript-complete',
            'gemini-processing',
            'update-response',
            'vad-state-change',
            'microphone-toggled',
            'orchestrator-status',
            'orchestrator-error',
            // General events
            'update-status',
            'click-through-toggled',
            'navigate-previous-response',
            'navigate-next-response',
            'scroll-response-up',
            'scroll-response-down',
            'copy-code-blocks',
            'clear-sensitive-data',
            'view-changed',
        ];
        
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (_, data) => callback(data));
        } else {
            console.warn(`[preload] Invalid event channel: ${channel}`);
        }
    },
    
    /**
     * Remove an event listener
     * @param {string} channel - Event channel name
     * @param {function} callback - Callback function to remove
     */
    off: (channel, callback) => {
        if (callback) {
            ipcRenderer.removeListener(channel, callback);
        } else {
            ipcRenderer.removeAllListeners(channel);
        }
    },
    
    /**
     * Remove all listeners for a channel
     * @param {string} channel - Event channel name
     */
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    },
    
    // ========================================================================
    // PLATFORM & UTILITIES
    // ========================================================================
    
    platform: process.platform,
    
    /**
     * Send a message to main process (for one-way communication)
     * @param {string} channel - Channel name
     * @param {any} data - Data to send
     */
    send: (channel, data) => {
        ipcRenderer.send(channel, data);
    },
};

// Log that preload script has loaded
console.log('[preload] window.api exposed with', Object.keys(window.api).length, 'methods');
