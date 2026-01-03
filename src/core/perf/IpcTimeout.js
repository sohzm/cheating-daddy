/**
 * IPC Timeout Wrapper - Phase-5 Performance & Accuracy Hardening
 *
 * Provides timeout-wrapped IPC operations to prevent cascading delays.
 * No IPC operation should block indefinitely.
 *
 * Usage:
 * ```javascript
 * const { ipcWithTimeout } = require('./core/perf/IpcTimeout');
 *
 * // Wrap an async IPC call with 250ms timeout
 * const result = await ipcWithTimeout(
 *   'ai-ingestion',
 *   () => session.sendContent(...),
 *   { timeout: 250, fallback: null }
 * );
 * ```
 */

'use strict';

const { perfMonitor, BUDGETS } = require('./PerformanceMonitor');
const { failureHandler, FAILURE_MODES } = require('./FailureModeHandler');

// ============================================================================
// TIMEOUT UTILITIES
// ============================================================================

/**
 * Create a promise that rejects after timeout
 * @param {number} ms - Timeout in milliseconds
 * @param {string} operation - Operation name for error message
 * @returns {Promise<never>}
 */
function createTimeout(ms, operation) {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`IPC timeout: ${operation} exceeded ${ms}ms`));
        }, ms);
    });
}

/**
 * Execute an async operation with timeout
 * @param {string} operation - Operation name (for timing and budgets)
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Options
 * @param {number} options.timeout - Timeout in ms (uses budget hardCap if not specified)
 * @param {*} options.fallback - Value to return on timeout (default: undefined)
 * @param {boolean} options.silent - Don't log timeout (default: false)
 * @returns {Promise<*>} Result or fallback value
 */
async function ipcWithTimeout(operation, fn, options = {}) {
    const budget = BUDGETS.latency[operation];
    const timeout = options.timeout || (budget ? budget.hardCap : 1000);
    const fallback = options.fallback;
    const silent = options.silent || false;

    const stopTiming = perfMonitor.startTiming(operation);

    try {
        const result = await Promise.race([
            fn(),
            createTimeout(timeout, operation),
        ]);
        stopTiming();
        return result;
    } catch (error) {
        const duration = stopTiming();

        if (error.message.startsWith('IPC timeout:')) {
            // Handle timeout
            if (!silent && process.env.NODE_ENV === 'development') {
                console.warn(`[IpcTimeout] ${operation} timed out after ${Math.round(duration)}ms`);
            }

            // Report to failure handler
            failureHandler.handleFailure(FAILURE_MODES.IPC_CONGESTION, {
                operation,
                timeout,
                duration,
            });

            return fallback;
        }

        // Re-throw non-timeout errors
        throw error;
    }
}

/**
 * Execute a sync operation with deadline check
 * @param {string} operation - Operation name
 * @param {Function} fn - Sync function to execute
 * @param {Object} options - Options
 * @param {number} options.deadline - Max execution time in ms
 * @returns {*} Result of function
 */
function ipcWithDeadline(operation, fn, options = {}) {
    const budget = BUDGETS.latency[operation];
    const deadline = options.deadline || (budget ? budget.hardCap : 100);

    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    perfMonitor.recordTiming(operation, duration);

    if (duration > deadline) {
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[IpcTimeout] ${operation} exceeded deadline: ${Math.round(duration)}ms > ${deadline}ms`);
        }
    }

    return result;
}

// ============================================================================
// BATCH EXECUTOR
// ============================================================================

/**
 * Execute multiple operations with overall timeout
 * @param {Array<{name: string, fn: Function}>} operations - Operations to execute
 * @param {number} overallTimeout - Total time budget in ms
 * @returns {Promise<Object>} Results keyed by operation name
 */
async function batchWithTimeout(operations, overallTimeout = 1000) {
    const start = performance.now();
    const results = {};
    const errors = {};

    for (const op of operations) {
        const elapsed = performance.now() - start;
        const remaining = overallTimeout - elapsed;

        if (remaining <= 0) {
            // Time exhausted - skip remaining
            errors[op.name] = 'Time exhausted';
            continue;
        }

        try {
            results[op.name] = await ipcWithTimeout(op.name, op.fn, {
                timeout: Math.min(remaining, op.timeout || remaining),
                fallback: op.fallback,
            });
        } catch (error) {
            errors[op.name] = error.message;
        }
    }

    return { results, errors, duration: performance.now() - start };
}

// ============================================================================
// QUEUE WITH SHEDDING
// ============================================================================

/**
 * Queue that sheds old items under pressure
 * Wraps items in objects to track criticality
 */
class SheddingQueue {
    /**
     * @param {number} maxSize - Maximum queue size
     * @param {string} name - Queue name for logging
     */
    constructor(maxSize = 100, name = 'queue') {
        this.maxSize = maxSize;
        this.name = name;
        this.items = []; // Array of { value, critical }
        this.droppedCount = 0;
    }

    /**
     * Add item to queue, dropping oldest if full
     * @param {*} item - Item to add
     * @param {boolean} critical - If true, never drop this item
     * @returns {boolean} True if added without dropping
     */
    add(item, critical = false) {
        if (this.items.length >= this.maxSize) {
            if (critical) {
                // Drop oldest non-critical to make room
                const nonCriticalIndex = this.items.findIndex(i => !i.critical);
                if (nonCriticalIndex >= 0) {
                    this.items.splice(nonCriticalIndex, 1);
                    this.droppedCount++;
                } else {
                    // All critical - drop oldest anyway
                    this.items.shift();
                    this.droppedCount++;
                }
            } else {
                // Drop oldest
                this.items.shift();
                this.droppedCount++;
            }

            if (this.droppedCount % 10 === 0 && process.env.NODE_ENV === 'development') {
                console.warn(`[SheddingQueue:${this.name}] Dropped ${this.droppedCount} items total`);
            }
        }

        this.items.push({ value: item, critical });
        return this.items.length < this.maxSize;
    }

    /**
     * Get next item from queue
     * @returns {*|undefined} Next item or undefined if empty
     */
    next() {
        const wrapper = this.items.shift();
        return wrapper ? wrapper.value : undefined;
    }

    /**
     * Get queue stats
     * @returns {Object} Stats
     */
    getStats() {
        return {
            size: this.items.length,
            maxSize: this.maxSize,
            dropped: this.droppedCount,
            utilization: Math.round((this.items.length / this.maxSize) * 100),
        };
    }

    /**
     * Clear the queue
     */
    clear() {
        this.items = [];
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    ipcWithTimeout,
    ipcWithDeadline,
    batchWithTimeout,
    SheddingQueue,
    createTimeout,
};
