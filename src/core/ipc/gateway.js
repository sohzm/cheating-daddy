/**
 * IPC Gateway
 *
 * Centralized registration point for all IPC handlers across subsystems.
 *
 * Architecture:
 * - Storage: 24 channels (config, credentials, preferences, sessions, limits)
 * - Assistant: 11 channels (session, content sending, audio control)
 * - Window: 7 channels (view, minimize, keybinds, visibility, sizes, dialogs)
 * - Application: 9 channels (version, quit, restart, external, permissions, validation)
 * - Update: 4 channels (open/close update/upgrade dialogs)
 * - Audio: Direct integration with AudioCaptureManager events
 *
 * Total: 58 IPC channels documented in docs/IPC-SURFACE.md
 *
 * Usage:
 * ```javascript
 * const { initializeIpcGateway } = require('./core/ipc/gateway');
 * initializeIpcGateway({
 *   storage,
 *   rateLimitManager,
 *   assistantManager,
 *   geminiSessionRef,
 *   mainWindow,
 *   sendToRenderer,
 *   updateGlobalShortcuts,
 *   createUpdateWindow
 * });
 * ```
 */

const { registerStorageHandlers } = require('./handlers/storageHandler');
const { registerAssistantHandlers } = require('./handlers/assistantHandler');
const { registerWindowHandlers } = require('./handlers/windowHandler');
const { registerApplicationHandlers } = require('./handlers/applicationHandler');
const { registerUpdateHandlers } = require('./handlers/updateHandler');

/**
 * Initialize all IPC handlers through the gateway
 * @param {Object} deps - Dependencies for IPC handlers
 * @param {Object} deps.storage - Storage module
 * @param {Object} deps.rateLimitManager - Rate limit manager
 * @param {Object} deps.assistantManager - Assistant manager module
 * @param {Object} deps.geminiSessionRef - Reference to Gemini session
 * @param {BrowserWindow} deps.mainWindow - Main window reference
 * @param {Function} deps.sendToRenderer - Function to send events to renderer
 * @param {Function} deps.updateGlobalShortcuts - Function to update keyboard shortcuts
 * @param {Function} deps.createUpdateWindow - Function to create update window
 */
function initializeIpcGateway({
    storage,
    rateLimitManager,
    assistantManager,
    geminiSessionRef,
    mainWindow,
    sendToRenderer,
    updateGlobalShortcuts,
    createUpdateWindow,
}) {
    console.log('[IPC Gateway] Initializing IPC handlers...');
    console.log('[IPC Gateway] Registering 58 total IPC channels across 5 subsystems');

    // ============ STORAGE SUBSYSTEM (24 channels) ============
    registerStorageHandlers(storage, rateLimitManager);
    console.log('[IPC Gateway] ✓ Storage handlers registered (24 channels)');

    // ============ ASSISTANT SUBSYSTEM (11 channels) ============
    registerAssistantHandlers({ assistantManager, geminiSessionRef });
    console.log('[IPC Gateway] ✓ Assistant handlers registered (11 channels)');

    // ============ WINDOW SUBSYSTEM (7 channels) ============
    registerWindowHandlers({
        mainWindow,
        sendToRenderer,
        geminiSessionRef,
        updateGlobalShortcuts,
    });
    console.log('[IPC Gateway] ✓ Window handlers registered (7 channels)');

    // ============ APPLICATION SUBSYSTEM (9 channels) ============
    registerApplicationHandlers({
        mainWindow,
        createUpdateWindow,
        stopMacOSAudioCapture: assistantManager.stopMacOSAudioCapture,
        storage,
    });
    console.log('[IPC Gateway] ✓ Application handlers registered (9 channels)');

    // ============ UPDATE SUBSYSTEM (4 channels) ============
    // Note: close-update-window and close-upgrade-window are registered
    // dynamically when dialogs are created via registerUpdateWindowCloseHandler
    // and registerUpgradeWindowCloseHandler
    registerUpdateHandlers({});
    console.log('[IPC Gateway] ✓ Update handlers registered (4 channels)');

    console.log('[IPC Gateway] ═══════════════════════════════════════════');
    console.log('[IPC Gateway] All IPC handlers initialized successfully');
    console.log('[IPC Gateway] Total channels: 58 (see docs/IPC-SURFACE.md)');
    console.log('[IPC Gateway] ═══════════════════════════════════════════');
}

// Re-export dialog close handlers for dynamic registration
const { registerUpdateWindowCloseHandler, registerUpgradeWindowCloseHandler } = require('./handlers/updateHandler');

module.exports = {
    initializeIpcGateway,
    registerUpdateWindowCloseHandler,
    registerUpgradeWindowCloseHandler,
};
