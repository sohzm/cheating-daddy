/**
 * Assistant IPC Handler
 *
 * Centralizes all assistant-related IPC channels (11 total):
 * - Session management (initialize-gemini, close-session, get-current-session, start-new-session)
 * - Content sending (send-audio-content, send-mic-audio-content, send-image-content, send-text-message)
 * - Audio control (start-macos-audio, stop-macos-audio)
 * - Settings (update-google-search-setting)
 *
 * Architecture Note:
 * The assistant handlers are tightly coupled with assistantManager's internal state
 * (geminiSessionRef, audioTextBuffer, VAD state, etc.). Rather than duplicating this
 * complex state management, we delegate to the assistantManager module which registers
 * its own handlers. This file serves as:
 *
 * 1. Documentation of all assistant IPC channels
 * 2. A central point for the gateway to invoke assistant handler registration
 * 3. A place to add cross-cutting concerns (logging, metrics, rate limiting)
 *
 * All handlers follow the response pattern:
 * {success: boolean, data?: any, error?: string}
 *
 * Channel List:
 * | Channel                       | Type   | Description                    |
 * |-------------------------------|--------|--------------------------------|
 * | initialize-gemini             | handle | Initialize Gemini session      |
 * | send-audio-content            | handle | Send system audio for STT      |
 * | send-mic-audio-content        | handle | Send mic audio for STT         |
 * | send-image-content            | handle | Send screenshot to AI          |
 * | send-text-message             | handle | Send text message to AI        |
 * | start-macos-audio             | handle | Start macOS system audio       |
 * | stop-macos-audio              | handle | Stop macOS system audio        |
 * | close-session                 | handle | Close Gemini session           |
 * | get-current-session           | handle | Get current session state      |
 * | start-new-session             | handle | Start fresh session            |
 * | update-google-search-setting  | handle | Toggle Google search grounding |
 */

const { ipcMain } = require('electron');

/**
 * Initialize assistant IPC handlers
 * @param {Object} deps - Dependencies
 * @param {Object} deps.assistantManager - Assistant manager module
 * @param {Object} deps.geminiSessionRef - Reference to Gemini session
 */
function registerAssistantHandlers({ assistantManager, geminiSessionRef }) {
    console.log('[AssistantHandler] Registering 11 assistant IPC handlers via assistantManager...');

    // Validate dependencies
    if (!assistantManager) {
        console.error('[AssistantHandler] ERROR: assistantManager dependency is required');
        return;
    }

    if (!geminiSessionRef) {
        console.error('[AssistantHandler] ERROR: geminiSessionRef dependency is required');
        return;
    }

    // Delegate to assistantManager which has the internal state
    if (typeof assistantManager.setupAssistantIpcHandlers === 'function') {
        assistantManager.setupAssistantIpcHandlers(geminiSessionRef);
        console.log('[AssistantHandler] Registered 11 assistant IPC handlers');
    } else {
        console.error('[AssistantHandler] ERROR: setupAssistantIpcHandlers not found in assistantManager');
    }
}

module.exports = { registerAssistantHandlers };
