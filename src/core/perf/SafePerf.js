/**
 * Safe Performance Instrumentation - Phase-5
 *
 * DESIGN PRINCIPLES:
 * 1. NEVER break the app - all calls wrapped in try-catch
 * 2. ZERO overhead when disabled
 * 3. Minimal overhead when enabled (< 0.1ms per call)
 * 4. Pure observation - no behavior changes
 *
 * This module provides safe wrappers that gracefully degrade if perf
 * monitoring fails or is unavailable.
 */

'use strict';

// ============================================================================
// SAFE IMPORTS
// ============================================================================

let perfMonitor = null;
let failureHandler = null;
let BUDGETS = null;
let FAILURE_MODES = null;

// Try to load perf modules - fail silently if unavailable
try {
    const perf = require('./PerformanceMonitor');
    const failure = require('./FailureModeHandler');
    perfMonitor = perf.perfMonitor;
    BUDGETS = perf.BUDGETS;
    failureHandler = failure.failureHandler;
    FAILURE_MODES = failure.FAILURE_MODES;
} catch (e) {
    // Perf modules not available - that's OK
    if (process.env.NODE_ENV === 'development') {
        console.log('[SafePerf] Performance monitoring not available:', e.message);
    }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Whether instrumentation is enabled */
let enabled = true;

/**
 * Enable or disable instrumentation globally
 * @param {boolean} value - True to enable, false to disable
 */
function setEnabled(value) {
    enabled = value;
}

/**
 * Check if instrumentation is available and enabled
 * @returns {boolean}
 */
function isAvailable() {
    return enabled && perfMonitor !== null;
}

// ============================================================================
// SAFE TIMING API
// ============================================================================

/**
 * Start timing an operation. Returns a stop function.
 * Safe - never throws, returns no-op if disabled.
 *
 * @param {string} operation - Operation name
 * @returns {Function} Stop function (returns duration or 0)
 */
function safeStartTiming(operation) {
    if (!isAvailable()) {
        return () => 0; // No-op
    }

    try {
        const startTime = performance.now();
        return () => {
            try {
                const duration = performance.now() - startTime;
                perfMonitor.recordTiming(operation, duration);
                return duration;
            } catch (e) {
                return 0;
            }
        };
    } catch (e) {
        return () => 0;
    }
}

/**
 * Record a timing directly. Safe - never throws.
 *
 * @param {string} operation - Operation name
 * @param {number} durationMs - Duration in milliseconds
 */
function safeRecordTiming(operation, durationMs) {
    if (!isAvailable()) return;

    try {
        perfMonitor.recordTiming(operation, durationMs);
    } catch (e) {
        // Silently ignore
    }
}

/**
 * Wrap an async function with safe timing.
 * If timing fails, the function still executes normally.
 *
 * @param {string} operation - Operation name
 * @param {Function} fn - Async function to wrap
 * @returns {Promise<*>} Result of the function
 */
async function safeWithTiming(operation, fn) {
    const stop = safeStartTiming(operation);
    try {
        return await fn();
    } finally {
        stop();
    }
}

/**
 * Wrap a sync function with safe timing.
 *
 * @param {string} operation - Operation name
 * @param {Function} fn - Sync function to wrap
 * @returns {*} Result of the function
 */
function safeWithTimingSync(operation, fn) {
    const stop = safeStartTiming(operation);
    try {
        return fn();
    } finally {
        stop();
    }
}

// ============================================================================
// SAFE FAILURE HANDLING
// ============================================================================

/**
 * Report a failure safely. Never throws.
 *
 * @param {string} mode - Failure mode
 * @param {Object} context - Context data
 */
function safeReportFailure(mode, context = {}) {
    if (!enabled || !failureHandler) return;

    try {
        failureHandler.handleFailure(mode, context);
    } catch (e) {
        // Silently ignore
    }
}

/**
 * Check if screenshots should be throttled. Safe - returns false if unavailable.
 * @returns {boolean}
 */
function safeShouldThrottleScreenshots() {
    if (!enabled || !failureHandler) return false;

    try {
        return failureHandler.shouldDisableScreenshots();
    } catch (e) {
        return false;
    }
}

/**
 * Check if under memory pressure. Safe - returns false if unavailable.
 * @returns {boolean}
 */
function safeIsMemoryPressure() {
    if (!isAvailable()) return false;

    try {
        return perfMonitor.isUnderMemoryPressure();
    } catch (e) {
        return false;
    }
}

// ============================================================================
// SAFE RESOURCE MONITORING
// ============================================================================

/**
 * Start resource monitoring. Safe - no-op if unavailable.
 * @param {number} intervalMs - Check interval
 */
function safeStartResourceMonitoring(intervalMs = 10000) {
    if (!isAvailable()) return;

    try {
        perfMonitor.startResourceMonitoring(intervalMs);
    } catch (e) {
        // Silently ignore
    }
}

/**
 * Stop resource monitoring. Safe.
 */
function safeStopResourceMonitoring() {
    if (!isAvailable()) return;

    try {
        perfMonitor.stopResourceMonitoring();
    } catch (e) {
        // Silently ignore
    }
}

/**
 * Get resource usage. Safe - returns null if unavailable.
 * @returns {Object|null}
 */
function safeGetResourceUsage() {
    if (!isAvailable()) return null;

    try {
        return perfMonitor.getResourceUsage();
    } catch (e) {
        return null;
    }
}

// ============================================================================
// SAFE STATS & REPORTING
// ============================================================================

/**
 * Get timing stats for an operation. Safe.
 * @param {string} operation - Operation name
 * @returns {Object} Stats or empty object
 */
function safeGetTimingStats(operation) {
    if (!isAvailable()) {
        return { count: 0, avg: 0, p50: 0, p95: 0, p99: 0, max: 0, violations: 0 };
    }

    try {
        return perfMonitor.getTimingStats(operation);
    } catch (e) {
        return { count: 0, avg: 0, p50: 0, p95: 0, p99: 0, max: 0, violations: 0 };
    }
}

/**
 * Generate a full performance report. Safe.
 * @returns {Object|null}
 */
function safeGenerateReport() {
    if (!isAvailable()) return null;

    try {
        return perfMonitor.generateReport();
    } catch (e) {
        return null;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // Control
    setEnabled,
    isAvailable,

    // Safe timing
    safeStartTiming,
    safeRecordTiming,
    safeWithTiming,
    safeWithTimingSync,

    // Safe failure handling
    safeReportFailure,
    safeShouldThrottleScreenshots,
    safeIsMemoryPressure,

    // Safe resource monitoring
    safeStartResourceMonitoring,
    safeStopResourceMonitoring,
    safeGetResourceUsage,

    // Safe stats
    safeGetTimingStats,
    safeGenerateReport,

    // Re-export constants (if available)
    BUDGETS: BUDGETS || {},
    FAILURE_MODES: FAILURE_MODES || {},
};
