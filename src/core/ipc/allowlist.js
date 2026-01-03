/**
 * IPC Channel Allow-List - Security Boundary Enforcement
 *
 * SECURITY CRITICAL: This module defines the ONLY IPC channels that are permitted.
 * Any channel not explicitly listed here MUST be rejected.
 *
 * Phase-4 Security Hardening
 * @module core/ipc/allowlist
 */

'use strict';

// ============================================================================
// TYPE VALIDATORS
// ============================================================================

/**
 * Payload type validation functions
 * Each returns true if payload matches expected shape
 */
const validators = {
    // Primitives
    none: payload => payload === undefined || payload === null,
    string: payload => typeof payload === 'string',
    boolean: payload => typeof payload === 'boolean',
    object: payload => payload !== null && typeof payload === 'object' && !Array.isArray(payload),
    any: () => true,

    // Arrays
    'string[]': payload => Array.isArray(payload) && payload.every(item => typeof item === 'string'),

    // Complex types
    Config: payload =>
        payload !== null &&
        typeof payload === 'object' &&
        (payload.provider === undefined || typeof payload.provider === 'string') &&
        (payload.model === undefined || typeof payload.model === 'string'),

    Credentials: payload =>
        payload !== null &&
        typeof payload === 'object' &&
        (payload.groq === undefined || typeof payload.groq === 'string') &&
        (payload.gemini === undefined || typeof payload.gemini === 'string'),

    Preferences: payload => payload !== null && typeof payload === 'object',

    Profile: payload => payload !== null && typeof payload === 'object' && typeof payload.id === 'string' && typeof payload.name === 'string',

    Keybinds: payload => payload !== null && typeof payload === 'object',

    Session: payload => payload !== null && typeof payload === 'object' && typeof payload.id === 'string',

    UpdatePreferences: payload =>
        payload !== null && typeof payload === 'object' && (payload.enabled === undefined || typeof payload.enabled === 'boolean'),

    AudioInput: payload => payload !== null && typeof payload === 'object' && (payload.data !== undefined || payload.mimeType !== undefined),

    ImageInput: payload => payload !== null && typeof payload === 'object' && (payload.data !== undefined || typeof payload.prompt === 'string'),

    UpdateInfo: payload => payload !== null && typeof payload === 'object',

    RestartOptions: payload =>
        payload === undefined || payload === null || (typeof payload === 'object' && (payload.args === undefined || Array.isArray(payload.args))),
};

// ============================================================================
// CHANNEL DEFINITIONS
// ============================================================================

/**
 * Direction types:
 * - 'invoke': Two-way request/response (ipcRenderer.invoke)
 * - 'send': One-way to main (ipcRenderer.send)
 * - 'on': Event listener registration (main → renderer)
 *
 * Sensitivity levels:
 * - 'low': General operations
 * - 'medium': User data access
 * - 'high': Credentials/secrets
 * - 'critical': Emergency operations
 */

const ALLOWED_CHANNELS = {
    // ========================================================================
    // STORAGE CHANNELS (24)
    // ========================================================================

    // Config
    'storage:get-config': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Get application config',
    },
    'storage:set-config': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'Config',
        sensitivity: 'medium',
        description: 'Set entire config',
    },
    'storage:update-config': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: ['string', 'any'],
        sensitivity: 'medium',
        description: 'Update single config key',
    },

    // Credentials (HIGH SENSITIVITY)
    'storage:get-credentials': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'none',
        sensitivity: 'high',
        description: 'Get API credentials (encrypted)',
        rateLimit: { maxCalls: 10, windowMs: 60000 },
    },
    'storage:set-credentials': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'Credentials',
        sensitivity: 'high',
        description: 'Set API credentials',
        rateLimit: { maxCalls: 5, windowMs: 60000 },
    },
    'storage:get-api-key': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'string',
        sensitivity: 'high',
        description: 'Get specific provider API key',
        rateLimit: { maxCalls: 10, windowMs: 60000 },
    },
    'storage:set-api-key': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: ['string', 'string'],
        sensitivity: 'high',
        description: 'Set specific provider API key',
        rateLimit: { maxCalls: 5, windowMs: 60000 },
    },

    // Usage stats
    'storage:get-usage-stats': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Get rate limit usage stats',
    },
    'storage:get-usage-reset-time': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Get time until rate limit reset',
    },

    // Preferences
    'storage:get-preferences': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Get user preferences',
    },
    'storage:set-preferences': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'Preferences',
        sensitivity: 'medium',
        description: 'Set entire preferences',
    },
    'storage:update-preference': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: ['string', 'any'],
        sensitivity: 'medium',
        description: 'Update single preference',
    },

    // Custom profiles
    'storage:get-custom-profiles': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Get custom prompt profiles',
    },
    'storage:save-custom-profile': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'Profile',
        sensitivity: 'medium',
        description: 'Save custom profile',
    },
    'storage:delete-custom-profile': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'string',
        sensitivity: 'medium',
        description: 'Delete custom profile',
    },

    // Keybinds
    'storage:get-keybinds': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Get keyboard shortcuts',
    },
    'storage:set-keybinds': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'Keybinds',
        sensitivity: 'medium',
        description: 'Set keyboard shortcuts',
    },

    // Sessions
    'storage:get-all-sessions': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'none',
        sensitivity: 'medium',
        description: 'Get all saved sessions',
    },
    'storage:get-session': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'string',
        sensitivity: 'medium',
        description: 'Get specific session',
    },
    'storage:save-session': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: ['string', 'object'],
        sensitivity: 'medium',
        description: 'Save session data',
    },
    'storage:delete-session': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'string',
        sensitivity: 'medium',
        description: 'Delete session',
    },
    'storage:delete-all-sessions': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'none',
        sensitivity: 'high',
        description: 'Delete all sessions',
    },

    // Limits
    'storage:get-today-limits': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Get today rate limits',
    },

    // Update preferences
    'storage:get-update-preferences': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Get update preferences',
    },
    'storage:set-update-preferences': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'UpdatePreferences',
        sensitivity: 'medium',
        description: 'Set update preferences',
    },

    // Emergency operations (CRITICAL)
    'storage:clear-all': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'none',
        sensitivity: 'critical',
        description: 'Emergency erase all data',
        rateLimit: { maxCalls: 3, windowMs: 60000 },
    },

    // First run detection
    'storage:check-first-run-or-upgrade': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Check if first run or upgrade',
    },
    'storage:mark-version-seen': {
        direction: 'invoke',
        subsystem: 'storage',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Mark current version as seen',
    },

    // ========================================================================
    // ASSISTANT CHANNELS (11)
    // ========================================================================

    'initialize-gemini': {
        direction: 'invoke',
        subsystem: 'assistant',
        payloadValidation: ['string', 'string', 'string', 'string'],
        sensitivity: 'high',
        description: 'Initialize Gemini session',
        rateLimit: { maxCalls: 5, windowMs: 60000 },
    },
    'send-audio-content': {
        direction: 'invoke',
        subsystem: 'assistant',
        payloadValidation: 'AudioInput',
        sensitivity: 'medium',
        description: 'Send system audio to AI',
        maxPayloadSize: 1024 * 1024, // 1MB
    },
    'send-mic-audio-content': {
        direction: 'invoke',
        subsystem: 'assistant',
        payloadValidation: 'AudioInput',
        sensitivity: 'medium',
        description: 'Send microphone audio to AI',
        maxPayloadSize: 1024 * 1024, // 1MB
    },
    'send-image-content': {
        direction: 'invoke',
        subsystem: 'assistant',
        payloadValidation: 'ImageInput',
        sensitivity: 'medium',
        description: 'Send screen image to AI',
        maxPayloadSize: 5 * 1024 * 1024, // 5MB
    },
    'send-text-message': {
        direction: 'invoke',
        subsystem: 'assistant',
        payloadValidation: 'string',
        sensitivity: 'medium',
        description: 'Send text prompt to AI',
        maxPayloadSize: 100 * 1024, // 100KB
    },
    'start-macos-audio': {
        direction: 'invoke',
        subsystem: 'assistant',
        payloadValidation: 'none',
        sensitivity: 'medium',
        description: 'Start macOS audio capture',
    },
    'stop-macos-audio': {
        direction: 'invoke',
        subsystem: 'assistant',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Stop macOS audio capture',
    },
    'close-session': {
        direction: 'invoke',
        subsystem: 'assistant',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Close current AI session',
    },
    'get-current-session': {
        direction: 'invoke',
        subsystem: 'assistant',
        payloadValidation: 'none',
        sensitivity: 'medium',
        description: 'Get current session data',
    },
    'start-new-session': {
        direction: 'invoke',
        subsystem: 'assistant',
        payloadValidation: 'none',
        sensitivity: 'medium',
        description: 'Start new session',
    },
    'update-google-search-setting': {
        direction: 'invoke',
        subsystem: 'assistant',
        payloadValidation: 'boolean',
        sensitivity: 'low',
        description: 'Toggle Google search integration',
    },

    // ========================================================================
    // WINDOW CHANNELS (7)
    // ========================================================================

    'view-changed': {
        direction: 'send',
        subsystem: 'window',
        payloadValidation: 'string',
        sensitivity: 'low',
        description: 'Notify view change',
    },
    'window-minimize': {
        direction: 'invoke',
        subsystem: 'window',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Minimize main window',
    },
    'update-keybinds': {
        direction: 'send',
        subsystem: 'window',
        payloadValidation: 'Keybinds',
        sensitivity: 'medium',
        description: 'Update keyboard shortcuts',
    },
    'toggle-window-visibility': {
        direction: 'invoke',
        subsystem: 'window',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Show/hide main window',
    },
    'update-sizes': {
        direction: 'invoke',
        subsystem: 'window',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Update window dimensions',
    },
    'window:resize-by': {
        direction: 'invoke',
        subsystem: 'window',
        payloadValidation: 'object',
        sensitivity: 'low',
        description: 'Resize window by delta values (drag resize)',
    },
    'close-update-window': {
        direction: 'send',
        subsystem: 'window',
        payloadValidation: 'any',
        sensitivity: 'low',
        description: 'Close update dialog',
    },
    'close-upgrade-window': {
        direction: 'send',
        subsystem: 'window',
        payloadValidation: 'any',
        sensitivity: 'low',
        description: 'Close upgrade dialog',
    },

    // ========================================================================
    // APPLICATION CHANNELS (9)
    // ========================================================================

    'get-app-version': {
        direction: 'invoke',
        subsystem: 'application',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Get app version number',
    },
    'quit-application': {
        direction: 'invoke',
        subsystem: 'application',
        payloadValidation: 'none',
        sensitivity: 'medium',
        description: 'Quit application gracefully',
    },
    'restart-application': {
        direction: 'invoke',
        subsystem: 'application',
        payloadValidation: 'RestartOptions',
        sensitivity: 'medium',
        description: 'Restart application',
    },
    'open-external': {
        direction: 'invoke',
        subsystem: 'application',
        payloadValidation: 'string',
        sensitivity: 'medium',
        description: 'Open URL in external browser',
        // URL validation happens in handler
    },
    'assistant:validate-api-key': {
        direction: 'invoke',
        subsystem: 'application',
        payloadValidation: ['string', 'string'],
        sensitivity: 'high',
        description: 'Validate API key',
        rateLimit: { maxCalls: 10, windowMs: 60000 },
    },
    'log-message': {
        direction: 'send',
        subsystem: 'application',
        payloadValidation: 'string',
        sensitivity: 'low',
        description: 'Log message from renderer',
        maxPayloadSize: 10 * 1024, // 10KB
    },
    'check-permission': {
        direction: 'invoke',
        subsystem: 'application',
        payloadValidation: 'string',
        sensitivity: 'low',
        description: 'Check if permission granted',
    },
    'request-permission': {
        direction: 'invoke',
        subsystem: 'application',
        payloadValidation: 'string',
        sensitivity: 'medium',
        description: 'Request system permission',
    },
    'open-system-preferences': {
        direction: 'invoke',
        subsystem: 'application',
        payloadValidation: 'string',
        sensitivity: 'low',
        description: 'Open macOS System Preferences to specific pane',
    },
    'get-all-permissions': {
        direction: 'invoke',
        subsystem: 'application',
        payloadValidation: 'none',
        sensitivity: 'low',
        description: 'Get all macOS permission statuses at once',
    },

    // ========================================================================
    // UPDATE CHANNELS (1)
    // ========================================================================

    'open-update-window': {
        direction: 'invoke',
        subsystem: 'update',
        payloadValidation: 'UpdateInfo',
        sensitivity: 'low',
        description: 'Show update available dialog',
    },
};

// ============================================================================
// MAIN → RENDERER EVENT CHANNELS (Outbound Only)
// These are events the main process sends to renderer
// Renderer can only LISTEN, not invoke
// ============================================================================

const OUTBOUND_EVENTS = {
    'new-response': { subsystem: 'assistant', description: 'New AI response' },
    'update-response': { subsystem: 'assistant', description: 'AI response update' },
    'update-status': { subsystem: 'assistant', description: 'Status update' },
    'session-initializing': { subsystem: 'assistant', description: 'Session initializing' },
    'navigate-previous-response': { subsystem: 'navigation', description: 'Navigate to previous' },
    'navigate-next-response': { subsystem: 'navigation', description: 'Navigate to next' },
    'scroll-response-up': { subsystem: 'navigation', description: 'Scroll up' },
    'scroll-response-down': { subsystem: 'navigation', description: 'Scroll down' },
    'click-through-toggled': { subsystem: 'window', description: 'Click-through state changed' },
    'reconnect-failed': { subsystem: 'assistant', description: 'Reconnection failed' },
    toast: { subsystem: 'ui', description: 'Show toast notification' },
    'setting-changed': { subsystem: 'settings', description: 'Setting changed' },
    'save-conversation-turn': { subsystem: 'session', description: 'Save conversation turn' },
    'save-session-context': { subsystem: 'session', description: 'Save session context' },
    'save-screen-analysis': { subsystem: 'session', description: 'Save screen analysis' },
    'clear-sensitive-data': { subsystem: 'security', description: 'Clear sensitive data' },
    'update-info': { subsystem: 'update', description: 'Update info' },
    'upgrade-info': { subsystem: 'update', description: 'Upgrade info' },
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if a channel is in the allow-list
 * @param {string} channel - Channel name to check
 * @returns {boolean} True if allowed
 */
function isChannelAllowed(channel) {
    return Object.prototype.hasOwnProperty.call(ALLOWED_CHANNELS, channel);
}

/**
 * Check if an outbound event is valid
 * @param {string} event - Event name to check
 * @returns {boolean} True if valid outbound event
 */
function isValidOutboundEvent(event) {
    return Object.prototype.hasOwnProperty.call(OUTBOUND_EVENTS, event);
}

/**
 * Get channel configuration
 * @param {string} channel - Channel name
 * @returns {object|null} Channel config or null if not found
 */
function getChannelConfig(channel) {
    return ALLOWED_CHANNELS[channel] || null;
}

/**
 * Validate payload against channel's expected type
 * @param {string} channel - Channel name
 * @param {any[]} args - Payload arguments
 * @returns {{valid: boolean, error?: string}}
 */
function validatePayload(channel, args) {
    const config = ALLOWED_CHANNELS[channel];
    if (!config) {
        return { valid: false, error: `Unknown channel: ${channel}` };
    }

    const validation = config.payloadValidation;

    // Handle array of types (multiple arguments)
    if (Array.isArray(validation)) {
        if (args.length !== validation.length) {
            return {
                valid: false,
                error: `Expected ${validation.length} arguments, got ${args.length}`,
            };
        }

        for (let i = 0; i < validation.length; i++) {
            const validator = validators[validation[i]];
            if (!validator) {
                console.warn(`[IPC-ALLOWLIST] Unknown validator: ${validation[i]}`);
                continue;
            }
            if (!validator(args[i])) {
                return {
                    valid: false,
                    error: `Argument ${i + 1} failed ${validation[i]} validation`,
                };
            }
        }

        return { valid: true };
    }

    // Handle single type validation
    const validator = validators[validation];
    if (!validator) {
        console.warn(`[IPC-ALLOWLIST] Unknown validator: ${validation}`);
        return { valid: true }; // Fail open for unknown validators (log warning)
    }

    // For 'none', args should be empty
    if (validation === 'none') {
        return { valid: true };
    }

    // For single argument validation
    if (!validator(args[0])) {
        return {
            valid: false,
            error: `Payload failed ${validation} validation`,
        };
    }

    return { valid: true };
}

/**
 * Check payload size against channel limits
 * @param {string} channel - Channel name
 * @param {any[]} args - Payload arguments
 * @returns {{valid: boolean, error?: string}}
 */
function validatePayloadSize(channel, args) {
    const config = ALLOWED_CHANNELS[channel];
    if (!config || !config.maxPayloadSize) {
        return { valid: true };
    }

    // Rough size estimation using JSON
    try {
        const size = JSON.stringify(args).length;
        if (size > config.maxPayloadSize) {
            return {
                valid: false,
                error: `Payload size ${size} exceeds limit ${config.maxPayloadSize}`,
            };
        }
    } catch {
        // If we can't stringify (e.g., circular refs), let handler deal with it
        return { valid: true };
    }

    return { valid: true };
}

/**
 * Get sensitivity level for a channel
 * @param {string} channel - Channel name
 * @returns {'low'|'medium'|'high'|'critical'|null}
 */
function getChannelSensitivity(channel) {
    const config = ALLOWED_CHANNELS[channel];
    return config ? config.sensitivity : null;
}

/**
 * Get rate limit configuration for a channel
 * @param {string} channel - Channel name
 * @returns {{maxCalls: number, windowMs: number}|null}
 */
function getChannelRateLimit(channel) {
    const config = ALLOWED_CHANNELS[channel];
    return config ? config.rateLimit || null : null;
}

/**
 * Get all channels by subsystem
 * @param {string} subsystem - Subsystem name
 * @returns {string[]} Array of channel names
 */
function getChannelsBySubsystem(subsystem) {
    return Object.entries(ALLOWED_CHANNELS)
        .filter(([_, config]) => config.subsystem === subsystem)
        .map(([channel]) => channel);
}

/**
 * Get all high-sensitivity channels
 * @returns {string[]} Array of channel names
 */
function getHighSensitivityChannels() {
    return Object.entries(ALLOWED_CHANNELS)
        .filter(([_, config]) => config.sensitivity === 'high' || config.sensitivity === 'critical')
        .map(([channel]) => channel);
}

/**
 * Full validation for an IPC call
 * @param {string} channel - Channel name
 * @param {'invoke'|'send'} direction - Call direction
 * @param {any[]} args - Payload arguments
 * @returns {{allowed: boolean, error?: string, config?: object}}
 */
function validateIpcCall(channel, direction, args) {
    // Check if channel exists
    if (!isChannelAllowed(channel)) {
        return { allowed: false, error: `Channel not in allow-list: ${channel}` };
    }

    const config = ALLOWED_CHANNELS[channel];

    // Check direction matches
    if (config.direction !== direction && config.direction !== 'send') {
        // 'send' channels can be invoked either way
        if (!(config.direction === 'invoke' && direction === 'invoke')) {
            return {
                allowed: false,
                error: `Invalid direction ${direction} for channel ${channel} (expected ${config.direction})`,
            };
        }
    }

    // Validate payload
    const payloadResult = validatePayload(channel, args);
    if (!payloadResult.valid) {
        return { allowed: false, error: payloadResult.error };
    }

    // Validate payload size
    const sizeResult = validatePayloadSize(channel, args);
    if (!sizeResult.valid) {
        return { allowed: false, error: sizeResult.error };
    }

    return { allowed: true, config };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // Constants
    ALLOWED_CHANNELS,
    OUTBOUND_EVENTS,

    // Core validation
    isChannelAllowed,
    isValidOutboundEvent,
    getChannelConfig,
    validatePayload,
    validatePayloadSize,
    validateIpcCall,

    // Helpers
    getChannelSensitivity,
    getChannelRateLimit,
    getChannelsBySubsystem,
    getHighSensitivityChannels,

    // Validators (for testing)
    validators,
};
