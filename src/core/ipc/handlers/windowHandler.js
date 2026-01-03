/**
 * Window IPC Handler
 *
 * Delegates to the original setupWindowIpcHandlers function in window.js.
 * This maintains the exact original behavior while providing a clean gateway interface.
 *
 * Channels (5 total from window.js):
 * - view-changed (on) - View change notification
 * - window-minimize (handle) - Minimize window
 * - update-keybinds (on) - Update keyboard shortcuts
 * - toggle-window-visibility (handle) - Show/hide window
 * - update-sizes (handle) - Update window dimensions with animation
 *
 * Architecture Note:
 * The original implementation in window.js includes complex window animation
 * logic with easing functions, frame-based resizing, and view-specific sizing.
 * Rather than duplicating this logic, we delegate to the original function
 * to preserve all behavior exactly.
 */

/**
 * Register window IPC handlers by delegating to the original implementation
 * @param {Object} deps - Dependencies
 * @param {BrowserWindow} deps.mainWindow - Main window reference
 * @param {Function} deps.sendToRenderer - Function to send events to renderer
 * @param {Object} deps.geminiSessionRef - Reference to Gemini session
 */
function registerWindowHandlers({ mainWindow, sendToRenderer, geminiSessionRef }) {
    console.log('[WindowHandler] Registering window IPC handlers via window.js...');

    // Validate dependencies
    if (!mainWindow) {
        console.error('[WindowHandler] ERROR: mainWindow dependency is required');
        return;
    }

    // Delegate to the original setupWindowIpcHandlers in window.js
    // This preserves all original behavior including:
    // - Animated window resizing with cubic ease-out
    // - View-based size calculations (main, customize, help, history, assistant, onboarding)
    // - Layout mode support (normal vs compact)
    // - Keyboard shortcut management via updateGlobalShortcuts
    const { setupWindowIpcHandlers } = require('../../../utils/window');
    setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef);

    console.log('[WindowHandler] Registered 5 window IPC handlers');
}

module.exports = { registerWindowHandlers };
