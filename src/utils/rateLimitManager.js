/**
 * Rate Limit Manager
 * Tracks API usage per provider/model and provides proactive fallback
 * 
 * Uses async I/O with write batching to prevent UI stutter:
 * - In-memory cache for immediate reads
 * - Batched writes (every 5 updates or 5 seconds)
 * - Async file operations
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Rate limits per provider/model (December 2025)
const LIMITS = {
    groq: {
        'llama-3.3-70b-versatile': { rpm: 30, rpd: 1000, tpm: 12000, tpd: 100000 },
        'meta-llama/llama-4-maverick-17b-128e-instruct': { rpm: 30, rpd: 1000, tpm: 6000, tpd: 500000 },
        'meta-llama/llama-4-scout-17b-16e-instruct': { rpm: 30, rpd: 1000, tpm: 30000, tpd: 500000 },
        'llama-3.1-8b-instant': { rpm: 30, rpd: 14400, tpm: 6000, tpd: 500000 },
        'whisper-large-v3-turbo': { rpm: 20, rpd: 2000, tpm: Infinity, tpd: Infinity, ash: 7200, asd: 28800 }
    },
    gemini: {
        'gemini-2.5-flash': { rpm: 5, rpd: 20, tpm: 250000 },
        'gemini-2.5-flash-lite': { rpm: 10, rpd: 20, tpm: 250000 },
        'gemini-3-flash-preview': { rpm: 5, rpd: 20, tpm: 250000 },
        'gemini-2.5-flash-native-audio-preview-12-2025': { rpm: Infinity, rpd: Infinity, tpm: 1000000 }
    }
};

// Threshold to switch to fallback (90% of limit)
const FALLBACK_THRESHOLD = 0.9;

// Write batching configuration
const BATCH_CONFIG = {
    MAX_PENDING_WRITES: 5,  // Flush after this many writes
    FLUSH_INTERVAL_MS: 5000 // Or flush every 5 seconds
};

// Get config directory path
function getConfigDir() {
    const platform = os.platform();
    if (platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'cheating-daddy');
    } else if (platform === 'win32') {
        return path.join(process.env.APPDATA || os.homedir(), 'cheating-daddy');
    } else {
        return path.join(os.homedir(), '.config', 'cheating-daddy');
    }
}

function getRateLimitsPath() {
    return path.join(getConfigDir(), 'rateLimits.json');
}

// Default rate limits structure
function getDefaultRateLimits() {
    return {
        groq: {},
        gemini: {}
    };
}

// In-memory cache
let limitsCache = null;

// Write batching state
let pendingWriteCount = 0;
let flushTimer = null;
let isWriting = false;

/**
 * Schedule a batched write to disk
 * Writes happen after MAX_PENDING_WRITES updates or FLUSH_INTERVAL_MS, whichever comes first
 */
function scheduleBatchedWrite() {
    pendingWriteCount++;

    // Flush immediately if we've hit the batch limit
    if (pendingWriteCount >= BATCH_CONFIG.MAX_PENDING_WRITES) {
        flushToDisk();
        return;
    }

    // Otherwise, ensure a timer is running
    if (!flushTimer) {
        flushTimer = setTimeout(() => {
            flushToDisk();
        }, BATCH_CONFIG.FLUSH_INTERVAL_MS);
    }
}

/**
 * Flush the in-memory cache to disk asynchronously
 */
function flushToDisk() {
    // Clear timer if running
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }

    // Reset pending count
    const writeCount = pendingWriteCount;
    pendingWriteCount = 0;

    // Don't write if nothing to write or already writing
    if (!limitsCache || isWriting) return;

    isWriting = true;

    const filePath = getRateLimitsPath();
    const dir = path.dirname(filePath);
    const data = JSON.stringify(limitsCache, null, 2);

    // Ensure directory exists (synchronously - only happens once per session typically)
    if (!fs.existsSync(dir)) {
        try {
            fs.mkdirSync(dir, { recursive: true });
        } catch (error) {
            console.error('[RateLimitManager] Error creating directory:', error);
            isWriting = false;
            return;
        }
    }

    // Write asynchronously
    fs.writeFile(filePath, data, 'utf8', (error) => {
        isWriting = false;
        if (error) {
            console.error('[RateLimitManager] Error writing rate limits:', error);
        } else if (writeCount > 0) {
            // console.log(`[RateLimitManager] Flushed ${writeCount} updates to disk`);
        }
    });
}

/**
 * Force flush on app exit (called from main process)
 */
function flushSync() {
    if (!limitsCache) return;

    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }

    try {
        const filePath = getRateLimitsPath();
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(limitsCache, null, 2));
        console.log('[RateLimitManager] Sync flush completed');
    } catch (error) {
        console.error('[RateLimitManager] Error in sync flush:', error);
    }
}

// Read rate limits from file (with caching)
function getRateLimits() {
    if (limitsCache) return limitsCache;

    try {
        const filePath = getRateLimitsPath();
        if (fs.existsSync(filePath)) {
            limitsCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return limitsCache;
        }
    } catch (error) {
        console.error('Error reading rate limits:', error);
    }

    limitsCache = getDefaultRateLimits();
    return limitsCache;
}

// Write rate limits - now uses batched async writes
function setRateLimits(limits) {
    limitsCache = limits; // Update cache immediately (sync for reads)
    scheduleBatchedWrite(); // Schedule async disk write
}

// Get midnight UTC timestamp for today
function getMidnightUTC() {
    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    return midnight.getTime();
}

// Get usage for a specific model
function getUsage(provider, model) {
    const limits = getRateLimits();
    if (!limits[provider]) limits[provider] = {};
    if (!limits[provider][model]) {
        limits[provider][model] = {
            count: 0,
            tokens: 0,
            audioSeconds: 0,
            hourlyAudioSeconds: 0,
            lastHourReset: Date.now(),
            resetAt: getMidnightUTC()
        };
        setRateLimits(limits);
    }
    return limits[provider][model];
}

// Check and reset if needed (called before each request)
function checkAndResetIfNeeded(provider, model) {
    const limits = getRateLimits();
    if (!limits[provider]) limits[provider] = {};
    const now = Date.now();

    if (!limits[provider][model]) {
        limits[provider][model] = {
            count: 0,
            tokens: 0,
            audioSeconds: 0,
            hourlyAudioSeconds: 0,
            lastHourReset: now,
            resetAt: getMidnightUTC()
        };
        setRateLimits(limits);
        return;
    }

    const data = limits[provider][model];
    let changed = false;

    // Daily Reset
    if (now >= data.resetAt) {
        data.count = 0;
        data.tokens = 0;
        data.audioSeconds = 0;
        data.hourlyAudioSeconds = 0;
        data.lastHourReset = now;
        data.resetAt = getMidnightUTC();
        changed = true;
        console.log(`Daily rate limits reset for ${provider}/${model}`);
    }

    // Hourly Reset (for ASH)
    // If more than 1 hour has passed since last hour reset
    if (now - (data.lastHourReset || 0) >= 60 * 60 * 1000) {
        data.hourlyAudioSeconds = 0;
        data.lastHourReset = now;
        changed = true;
        // console.log(`Hourly rate limits reset for ${provider}/${model}`);
    }

    if (changed) setRateLimits(limits);
}

// Check if a model can be used (under threshold)
function canUseModel(provider, model) {
    checkAndResetIfNeeded(provider, model);

    const usage = getUsage(provider, model);
    const modelLimits = LIMITS[provider]?.[model];

    if (!modelLimits) {
        console.warn(`No limits defined for ${provider}/${model}, allowing by default`);
        return true;
    }

    // Check daily requests
    if (modelLimits.rpd !== Infinity) {
        if (usage.count >= modelLimits.rpd * FALLBACK_THRESHOLD) {
            console.log(`${provider}/${model} request limit reached (${usage.count}/${modelLimits.rpd})`);
            return false;
        }
    }

    // Check daily audio seconds (ASD)
    if (modelLimits.asd && modelLimits.asd !== Infinity) {
        if ((usage.audioSeconds || 0) >= modelLimits.asd * FALLBACK_THRESHOLD) {
            console.log(`${provider}/${model} daily audio limit reached (${usage.audioSeconds}/${modelLimits.asd})`);
            return false;
        }
    }

    // Check hourly audio seconds (ASH)
    if (modelLimits.ash && modelLimits.ash !== Infinity) {
        if ((usage.hourlyAudioSeconds || 0) >= modelLimits.ash * FALLBACK_THRESHOLD) {
            console.log(`${provider}/${model} hourly audio limit reached (${usage.hourlyAudioSeconds}/${modelLimits.ash})`);
            return false;
        }
    }

    return true;
}

// Increment usage counter after successful request
function incrementUsage(provider, model, tokens = 0, audioSeconds = 0) {
    checkAndResetIfNeeded(provider, model);

    const limits = getRateLimits();
    if (!limits[provider]) limits[provider] = {};
    // Structure is guaranteed by checkAndResetIfNeeded called above

    const data = limits[provider][model];
    data.count++;
    data.tokens += tokens;
    if (audioSeconds > 0) {
        data.audioSeconds = (data.audioSeconds || 0) + audioSeconds;
        data.hourlyAudioSeconds = (data.hourlyAudioSeconds || 0) + audioSeconds;
    }

    setRateLimits(limits);
}

// Get next available model based on preferences and limits
function getNextAvailableModel(preferences) {
    // Try primary
    if (preferences.primaryProvider && preferences.primaryModel) {
        if (canUseModel(preferences.primaryProvider, preferences.primaryModel)) {
            return {
                provider: preferences.primaryProvider,
                model: preferences.primaryModel
            };
        }
    }

    // Try fallback
    if (preferences.fallbackProvider && preferences.fallbackModel) {
        if (canUseModel(preferences.fallbackProvider, preferences.fallbackModel)) {
            console.log(`Using fallback: ${preferences.fallbackProvider}/${preferences.fallbackModel}`);
            return {
                provider: preferences.fallbackProvider,
                model: preferences.fallbackModel
            };
        }
    }

    // All exhausted
    return null;
}

// Get all usage stats for UI display
function getAllUsageStats() {
    const limits = getRateLimits();
    const stats = { groq: [], gemini: [] };

    for (const [provider, models] of Object.entries(LIMITS)) {
        for (const [model, modelLimits] of Object.entries(models)) {
            checkAndResetIfNeeded(provider, model);
            const usage = limits[provider]?.[model] || { count: 0, tokens: 0, audioSeconds: 0 };

            // Determine limit type for UI display
            const isAudioModel = !!modelLimits.asd;
            let count = usage.count;
            let limit = modelLimits.rpd;
            let percentage = 0;

            // Calculate percentage based on requests per day
            percentage = modelLimits.rpd === Infinity ? 0 : Math.round((usage.count / modelLimits.rpd) * 100);

            stats[provider].push({
                model,
                count: usage.count,
                limit: modelLimits.rpd,
                percentage
            });
        }
    }

    return stats;
}



// Get time until reset
function getTimeUntilReset() {
    const now = Date.now();
    const midnight = getMidnightUTC();
    const diff = midnight - now;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, timestamp: midnight };
}

module.exports = {
    LIMITS,
    canUseModel,
    incrementUsage,
    getNextAvailableModel,
    getAllUsageStats,
    getTimeUntilReset,
    getUsage,
    checkAndResetIfNeeded,
    flushSync, // Call on app exit to ensure data is saved
    flushToDisk // Force async flush
};
