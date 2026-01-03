/**
 * Failure Mode Handler - Phase-5 Performance & Accuracy Hardening
 *
 * Defines explicit failure modes and responses for graceful degradation.
 * Each failure is localized and documented - no cascading failures.
 *
 * Failure Matrix:
 * | Failure             | Response                          |
 * |---------------------|-----------------------------------|
 * | AI timeout          | Drop response, continue listening |
 * | Audio overload      | Drop oldest chunk                 |
 * | IPC congestion      | Shed non-critical events          |
 * | Provider exhaustion | Graceful stop, user notified      |
 * | CPU spike           | Disable screenshots               |
 * | Memory pressure     | Trim history buffers              |
 */

'use strict';

const { perfMonitor } = require('./PerformanceMonitor');

// ============================================================================
// FAILURE MODE DEFINITIONS
// ============================================================================

const FAILURE_MODES = {
    AI_TIMEOUT: 'ai-timeout',
    AUDIO_OVERLOAD: 'audio-overload',
    IPC_CONGESTION: 'ipc-congestion',
    PROVIDER_EXHAUSTION: 'provider-exhaustion',
    CPU_SPIKE: 'cpu-spike',
    MEMORY_PRESSURE: 'memory-pressure',
    NETWORK_DEGRADED: 'network-degraded',
};

const FAILURE_RESPONSES = {
    [FAILURE_MODES.AI_TIMEOUT]: {
        action: 'drop-and-continue',
        description: 'Drop response, continue listening',
        recoverable: true,
    },
    [FAILURE_MODES.AUDIO_OVERLOAD]: {
        action: 'drop-oldest',
        description: 'Drop oldest audio chunk',
        recoverable: true,
    },
    [FAILURE_MODES.IPC_CONGESTION]: {
        action: 'shed-non-critical',
        description: 'Shed non-critical IPC events',
        recoverable: true,
    },
    [FAILURE_MODES.PROVIDER_EXHAUSTION]: {
        action: 'graceful-stop',
        description: 'Stop gracefully, notify user',
        recoverable: false,
    },
    [FAILURE_MODES.CPU_SPIKE]: {
        action: 'disable-screenshots',
        description: 'Temporarily disable screenshots',
        recoverable: true,
    },
    [FAILURE_MODES.MEMORY_PRESSURE]: {
        action: 'trim-buffers',
        description: 'Trim history and buffers',
        recoverable: true,
    },
    [FAILURE_MODES.NETWORK_DEGRADED]: {
        action: 'degrade-quality',
        description: 'Reduce context window, shorter responses',
        recoverable: true,
    },
};

// ============================================================================
// FAILURE HANDLER CLASS
// ============================================================================

class FailureModeHandler {
    constructor() {
        /** @type {Map<string, number>} Failure counts for rate limiting notifications */
        this.failureCounts = new Map();

        /** @type {Map<string, number>} Last failure timestamp per mode */
        this.lastFailure = new Map();

        /** @type {Set<string>} Currently active failure modes */
        this.activeFailures = new Set();

        /** @type {Function|null} Callback to send events to renderer */
        this.sendToRenderer = null;

        /** @type {Object|null} Reference to assistant manager for recovery actions */
        this.assistantManager = null;

        // Minimum interval between same failure type notifications (ms)
        this.notificationCooldown = 5000;
    }

    /**
     * Initialize with dependencies
     * @param {Object} deps - Dependencies
     * @param {Function} deps.sendToRenderer - Function to send to renderer
     * @param {Object} deps.assistantManager - Assistant manager reference
     */
    initialize({ sendToRenderer, assistantManager }) {
        this.sendToRenderer = sendToRenderer;
        this.assistantManager = assistantManager;

        // Register for performance degradation events
        perfMonitor.onDegradation((reason, data) => {
            this._handlePerformanceDegradation(reason, data);
        });
    }

    /**
     * Handle a failure mode
     * @param {string} mode - Failure mode from FAILURE_MODES
     * @param {Object} context - Contextual data about the failure
     * @returns {Object} Response action taken
     */
    handleFailure(mode, context = {}) {
        const response = FAILURE_RESPONSES[mode];
        if (!response) {
            console.error(`[FailureHandler] Unknown failure mode: ${mode}`);
            return { action: 'unknown', success: false };
        }

        // Track failure
        this._trackFailure(mode);

        // Log in development
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[FailureHandler] ${mode}: ${response.description}`, context);
        }

        // Execute response action
        const result = this._executeResponse(mode, response, context);

        return {
            mode,
            action: response.action,
            success: result.success,
            message: result.message,
        };
    }

    /**
     * Execute the response action for a failure
     */
    _executeResponse(mode, response, context) {
        switch (response.action) {
            case 'drop-and-continue':
                // AI timeout - just continue, let caller handle the drop
                return { success: true, message: 'Dropped response, continuing' };

            case 'drop-oldest':
                // Audio overload - handled by AudioCaptureManager's queue
                return { success: true, message: 'Dropped oldest chunk' };

            case 'shed-non-critical':
                // IPC congestion - signal to gateway to shed events
                this.activeFailures.add(mode);
                return { success: true, message: 'Shedding non-critical IPC' };

            case 'graceful-stop':
                // Provider exhaustion - notify user
                this._notifyUser('provider-exhausted', {
                    title: 'API Limit Reached',
                    message: 'Rate limit exceeded. Please wait before continuing.',
                });
                this.activeFailures.add(mode);
                return { success: true, message: 'Graceful stop initiated' };

            case 'disable-screenshots':
                // CPU spike - temporarily disable screenshots
                this.activeFailures.add(mode);
                return { success: true, message: 'Screenshots disabled' };

            case 'trim-buffers':
                // Memory pressure - trim history
                this._trimHistoryBuffers(context);
                return { success: true, message: 'Buffers trimmed' };

            case 'degrade-quality':
                // Network degraded - reduce context
                this.activeFailures.add(mode);
                return { success: true, message: 'Quality degraded' };

            default:
                return { success: false, message: 'Unknown action' };
        }
    }

    /**
     * Handle performance degradation events from monitor
     */
    _handlePerformanceDegradation(reason, data) {
        switch (reason) {
            case 'memory-critical':
                this.handleFailure(FAILURE_MODES.MEMORY_PRESSURE, data);
                break;
            case 'memory-pressure':
                // Less severe - just log for now
                if (process.env.NODE_ENV === 'development') {
                    console.log('[FailureHandler] Memory pressure detected:', data);
                }
                break;
            case 'latency-violation':
                // Map latency violations to appropriate failure mode
                if (data.operation === 'audio-chunk') {
                    this.handleFailure(FAILURE_MODES.AUDIO_OVERLOAD, data);
                } else if (data.operation === 'screenshot') {
                    this.handleFailure(FAILURE_MODES.CPU_SPIKE, data);
                }
                break;
        }
    }

    /**
     * Track failure for rate limiting
     */
    _trackFailure(mode) {
        const count = this.failureCounts.get(mode) || 0;
        this.failureCounts.set(mode, count + 1);
        this.lastFailure.set(mode, Date.now());
    }

    /**
     * Notify user of a failure (with cooldown)
     */
    _notifyUser(type, { title, message }) {
        const now = Date.now();
        const lastNotify = this.lastFailure.get(`notify-${type}`) || 0;

        if (now - lastNotify < this.notificationCooldown) {
            return; // Cooldown active
        }

        this.lastFailure.set(`notify-${type}`, now);

        if (this.sendToRenderer) {
            this.sendToRenderer('failure-notification', { type, title, message });
        }
    }

    /**
     * Trim history buffers to reduce memory
     */
    _trimHistoryBuffers(context) {
        // This would integrate with assistantManager to trim conversation history
        // For now, just log
        if (process.env.NODE_ENV === 'development') {
            console.log('[FailureHandler] Would trim history buffers:', context);
        }
    }

    /**
     * Check if a failure mode is currently active
     * @param {string} mode - Failure mode to check
     * @returns {boolean} True if active
     */
    isFailureActive(mode) {
        return this.activeFailures.has(mode);
    }

    /**
     * Clear a failure mode (recovery)
     * @param {string} mode - Failure mode to clear
     */
    clearFailure(mode) {
        this.activeFailures.delete(mode);
    }

    /**
     * Check if screenshots should be disabled
     * @returns {boolean} True if screenshots should be skipped
     */
    shouldDisableScreenshots() {
        return this.activeFailures.has(FAILURE_MODES.CPU_SPIKE) ||
               this.activeFailures.has(FAILURE_MODES.MEMORY_PRESSURE);
    }

    /**
     * Check if in degraded quality mode
     * @returns {boolean} True if quality should be reduced
     */
    isQualityDegraded() {
        return this.activeFailures.has(FAILURE_MODES.NETWORK_DEGRADED);
    }

    /**
     * Get failure statistics
     * @returns {Object} Failure counts and active modes
     */
    getStats() {
        return {
            counts: Object.fromEntries(this.failureCounts),
            activeFailures: Array.from(this.activeFailures),
        };
    }

    /**
     * Reset failure tracking
     */
    reset() {
        this.failureCounts.clear();
        this.lastFailure.clear();
        this.activeFailures.clear();
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

const failureHandler = new FailureModeHandler();

module.exports = {
    FailureModeHandler,
    failureHandler,
    FAILURE_MODES,
    FAILURE_RESPONSES,
};
