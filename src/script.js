// script.js - Additional initialization script
// This file is loaded after the main app component and renderer utilities
// Currently used as a placeholder - add any additional initialization logic here if needed

// Ensure window.api is available (from preload.js)
if (typeof window.api === 'undefined') {
    console.warn('[script.js] window.api is not available. Make sure preload.js is loaded.');
}

// Log that script.js has loaded
console.log('[script.js] Loaded successfully');

