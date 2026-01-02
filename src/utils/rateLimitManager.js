/**
 * Rate Limit Manager
 * Tracks API usage per provider/model and provides proactive fallback
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
        'gemini-2.5-flash-native-audio-preview-12-2025': { rpm: Infinity, rpd: Infinity, tpm: 1000000 }
    }
};

// Threshold to switch to fallback (90% of limit)
const FALLBACK_THRESHOLD = 0.9;

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

// Write rate limits to file (and update cache)
function setRateLimits(limits) {
    limitsCache = limits; // Update cache immediately

    try {
        const filePath = getRateLimitsPath();
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(limits, null, 2));
    } catch (error) {
        console.error('Error writing rate limits:', error);
    }
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
    checkAndResetIfNeeded
};
