/**
 * Performance Monitor - Phase-5 Performance & Accuracy Hardening
 *
 * Provides timing instrumentation, resource monitoring, and budget enforcement.
 * All metrics are internal-only (no external telemetry) to preserve stealth.
 *
 * Architecture:
 * - Latency tracking with percentile stats
 * - Resource usage monitoring (CPU, memory)
 * - Budget violation detection
 * - Degradation triggers
 *
 * Usage:
 * ```javascript
 * const { perfMonitor, withTiming, BUDGETS } = require('./core/perf/PerformanceMonitor');
 *
 * // Track a timed operation
 * const stop = perfMonitor.startTiming('audio-chunk');
 * // ... do work ...
 * stop(); // Records duration
 *
 * // Or use the wrapper
 * const result = await withTiming('ipc-transfer', async () => {
 *   return await someAsyncOperation();
 * });
 * ```
 */

'use strict';

// ============================================================================
// PERFORMANCE BUDGETS (from Phase-5 spec)
// ============================================================================

const BUDGETS = {
    latency: {
        'audio-chunk': { target: 50, hardCap: 100 },      // Audio chunk capture
        'ipc-transfer': { target: 10, hardCap: 25 },      // IPC transfer
        'ai-ingestion': { target: 100, hardCap: 250 },    // AI ingestion (live)
        'first-token': { target: 800, hardCap: 1500 },    // First token response
        'ui-render': { target: 16, hardCap: 32 },         // UI render update
        'screenshot': { target: 100, hardCap: 200 },      // Screenshot capture
    },
    resources: {
        cpu: { idle: 3, active: 15, max: 25 },            // CPU percentage
        memory: { idle: 150, active: 300, max: 450 },     // Memory in MB
    },
};

// ============================================================================
// TIMING TRACKER
// ============================================================================

/**
 * Stores timing samples for percentile calculation
 * Ring buffer to prevent unbounded growth
 */
class TimingBuffer {
    constructor(maxSamples = 100) {
        this.maxSamples = maxSamples;
        this.samples = [];
        this.index = 0;
        this.violations = 0;
        this.total = 0;
    }

    add(durationMs, budget) {
        this.total++;

        // Ring buffer insert
        if (this.samples.length < this.maxSamples) {
            this.samples.push(durationMs);
        } else {
            this.samples[this.index] = durationMs;
            this.index = (this.index + 1) % this.maxSamples;
        }

        // Track violations
        if (budget && durationMs > budget.hardCap) {
            this.violations++;
        }
    }

    getStats() {
        if (this.samples.length === 0) {
            return { count: 0, avg: 0, p50: 0, p95: 0, p99: 0, max: 0, violations: 0 };
        }

        const sorted = [...this.samples].sort((a, b) => a - b);
        const len = sorted.length;

        return {
            count: this.total,
            avg: Math.round(sorted.reduce((a, b) => a + b, 0) / len),
            p50: sorted[Math.floor(len * 0.5)],
            p95: sorted[Math.floor(len * 0.95)] || sorted[len - 1],
            p99: sorted[Math.floor(len * 0.99)] || sorted[len - 1],
            max: sorted[len - 1],
            violations: this.violations,
        };
    }

    reset() {
        this.samples = [];
        this.index = 0;
        this.violations = 0;
        this.total = 0;
    }
}

// ============================================================================
// PERFORMANCE MONITOR CLASS
// ============================================================================

class PerformanceMonitor {
    constructor() {
        /** @type {Map<string, TimingBuffer>} */
        this.timings = new Map();

        /** @type {{cpu: number, memory: number, timestamp: number}|null} */
        this.lastResourceSample = null;

        /** @type {NodeJS.Timeout|null} */
        this.resourceMonitorInterval = null;

        /** @type {Function[]} */
        this.degradationCallbacks = [];

        /** @type {Set<string>} */
        this.activeThrottles = new Set();

        // Initialize timing buffers for known operations
        Object.keys(BUDGETS.latency).forEach(op => {
            this.timings.set(op, new TimingBuffer());
        });
    }

    // ========================================================================
    // TIMING API
    // ========================================================================

    /**
     * Start timing an operation. Returns a stop function.
     * @param {string} operation - Operation name (must be in BUDGETS.latency)
     * @returns {Function} Stop function that records the duration
     */
    startTiming(operation) {
        const startTime = performance.now();
        const budget = BUDGETS.latency[operation];

        return () => {
            const duration = performance.now() - startTime;
            this._recordTiming(operation, duration, budget);
            return duration;
        };
    }

    /**
     * Record a timing sample directly
     * @param {string} operation - Operation name
     * @param {number} durationMs - Duration in milliseconds
     */
    recordTiming(operation, durationMs) {
        const budget = BUDGETS.latency[operation];
        this._recordTiming(operation, durationMs, budget);
    }

    /**
     * Internal: record timing and check for violations
     */
    _recordTiming(operation, durationMs, budget) {
        let buffer = this.timings.get(operation);
        if (!buffer) {
            buffer = new TimingBuffer();
            this.timings.set(operation, buffer);
        }

        buffer.add(durationMs, budget);

        // Check for hard cap violation
        if (budget && durationMs > budget.hardCap) {
            this._onBudgetViolation(operation, durationMs, budget);
        }
    }

    /**
     * Get timing statistics for an operation
     * @param {string} operation - Operation name
     * @returns {Object} Stats object with count, avg, percentiles, violations
     */
    getTimingStats(operation) {
        const buffer = this.timings.get(operation);
        if (!buffer) {
            return { count: 0, avg: 0, p50: 0, p95: 0, p99: 0, max: 0, violations: 0 };
        }
        return buffer.getStats();
    }

    /**
     * Get all timing statistics
     * @returns {Object} Map of operation -> stats
     */
    getAllTimingStats() {
        const result = {};
        this.timings.forEach((buffer, operation) => {
            result[operation] = buffer.getStats();
        });
        return result;
    }

    // ========================================================================
    // RESOURCE MONITORING
    // ========================================================================

    /**
     * Start periodic resource monitoring
     * @param {number} intervalMs - Check interval (default 5000ms)
     */
    startResourceMonitoring(intervalMs = 5000) {
        if (this.resourceMonitorInterval) return;

        this.resourceMonitorInterval = setInterval(() => {
            this._sampleResources();
        }, intervalMs);

        // Initial sample
        this._sampleResources();
    }

    /**
     * Stop resource monitoring
     */
    stopResourceMonitoring() {
        if (this.resourceMonitorInterval) {
            clearInterval(this.resourceMonitorInterval);
            this.resourceMonitorInterval = null;
        }
    }

    /**
     * Sample current resource usage
     */
    _sampleResources() {
        const memUsage = process.memoryUsage();
        const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);

        // CPU usage estimation (rough - measures event loop lag)
        // For accurate CPU, would need os-utils or native module
        const cpuUsage = process.cpuUsage();
        const cpuPercent = Math.round((cpuUsage.user + cpuUsage.system) / 1000000);

        this.lastResourceSample = {
            cpu: cpuPercent,
            memory: memoryMB,
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024),
            timestamp: Date.now(),
        };

        // Check for resource violations
        this._checkResourceBudgets();
    }

    /**
     * Get current resource usage
     * @returns {Object|null} Resource sample or null if not monitoring
     */
    getResourceUsage() {
        return this.lastResourceSample;
    }

    /**
     * Check if under memory pressure
     * @returns {boolean} True if memory exceeds active threshold
     */
    isUnderMemoryPressure() {
        if (!this.lastResourceSample) return false;
        return this.lastResourceSample.memory > BUDGETS.resources.memory.active;
    }

    /**
     * Check if memory is critical
     * @returns {boolean} True if memory exceeds max threshold
     */
    isMemoryCritical() {
        if (!this.lastResourceSample) return false;
        return this.lastResourceSample.memory > BUDGETS.resources.memory.max;
    }

    /**
     * Check resource budgets and trigger degradation if needed
     */
    _checkResourceBudgets() {
        if (!this.lastResourceSample) return;

        const { memory } = this.lastResourceSample;
        const memBudget = BUDGETS.resources.memory;

        // Memory pressure - trigger throttling
        if (memory > memBudget.max && !this.activeThrottles.has('memory-critical')) {
            this.activeThrottles.add('memory-critical');
            this._triggerDegradation('memory-critical', { memory, threshold: memBudget.max });
        } else if (memory > memBudget.active && !this.activeThrottles.has('memory-pressure')) {
            this.activeThrottles.add('memory-pressure');
            this._triggerDegradation('memory-pressure', { memory, threshold: memBudget.active });
        } else if (memory <= memBudget.active) {
            // Clear throttles if we're back to normal
            this.activeThrottles.delete('memory-pressure');
            this.activeThrottles.delete('memory-critical');
        }
    }

    // ========================================================================
    // DEGRADATION CALLBACKS
    // ========================================================================

    /**
     * Register a callback for degradation events
     * @param {Function} callback - Called with (reason, data)
     */
    onDegradation(callback) {
        this.degradationCallbacks.push(callback);
    }

    /**
     * Handle budget violation
     */
    _onBudgetViolation(operation, durationMs, budget) {
        // Log in development
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[PerfMonitor] Budget violation: ${operation} took ${Math.round(durationMs)}ms (cap: ${budget.hardCap}ms)`);
        }

        this._triggerDegradation('latency-violation', {
            operation,
            duration: durationMs,
            budget: budget.hardCap,
        });
    }

    /**
     * Trigger degradation callbacks
     */
    _triggerDegradation(reason, data) {
        for (const callback of this.degradationCallbacks) {
            try {
                callback(reason, data);
            } catch (err) {
                console.error('[PerfMonitor] Degradation callback error:', err);
            }
        }
    }

    // ========================================================================
    // THROTTLE HELPERS
    // ========================================================================

    /**
     * Check if screenshots should be throttled
     * @returns {boolean} True if should throttle
     */
    shouldThrottleScreenshots() {
        return this.activeThrottles.has('memory-pressure') ||
               this.activeThrottles.has('memory-critical');
    }

    /**
     * Check if non-critical IPC should be shed
     * @returns {boolean} True if should shed
     */
    shouldShedNonCriticalIpc() {
        return this.activeThrottles.has('memory-critical');
    }

    // ========================================================================
    // REPORTING
    // ========================================================================

    /**
     * Generate a performance report
     * @returns {Object} Full performance report
     */
    generateReport() {
        return {
            timestamp: Date.now(),
            timings: this.getAllTimingStats(),
            resources: this.lastResourceSample,
            activeThrottles: Array.from(this.activeThrottles),
            budgets: BUDGETS,
        };
    }

    /**
     * Reset all statistics
     */
    reset() {
        this.timings.forEach(buffer => buffer.reset());
        this.activeThrottles.clear();
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Wrap an async function with timing
 * @param {string} operation - Operation name
 * @param {Function} fn - Async function to wrap
 * @returns {Promise<*>} Result of the function
 */
async function withTiming(operation, fn) {
    const stop = perfMonitor.startTiming(operation);
    try {
        return await fn();
    } finally {
        stop();
    }
}

/**
 * Wrap a sync function with timing
 * @param {string} operation - Operation name
 * @param {Function} fn - Sync function to wrap
 * @returns {*} Result of the function
 */
function withTimingSync(operation, fn) {
    const stop = perfMonitor.startTiming(operation);
    try {
        return fn();
    } finally {
        stop();
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

const perfMonitor = new PerformanceMonitor();

module.exports = {
    PerformanceMonitor,
    perfMonitor,
    withTiming,
    withTimingSync,
    BUDGETS,
};
