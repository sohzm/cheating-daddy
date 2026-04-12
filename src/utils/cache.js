// Simple Question Cache - Hash-based exact match caching
// Uses Map with time-to-live for simple caching

class SimpleCache {
    constructor(maxSize = 500, ttlMs = 3600000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
        this.hits = 0;
        this.misses = 0;
    }

    hashQuestion(text) {
        const normalized = text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
            const char = normalized.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    get(question) {
        const key = this.hashQuestion(question);
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.misses++;
            return null;
        }

        // Check if expired
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }

        this.hits++;
        return entry.response;
    }

    set(question, response) {
        // Remove oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        const key = this.hashQuestion(question);
        this.cache.set(key, {
            question: question,
            response: response,
            timestamp: Date.now()
        });
    }

    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? (this.hits / total) * 100 : 0
        };
    }

    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }
}

const cache = new SimpleCache(500, 3600000);

function getCachedResponse(question) {
    const response = cache.get(question);
    if (response) {
        console.log('[Cache] HIT for question:', question.substring(0, 50) + '...');
        return { response };
    }
    return null;
}

function setCachedResponse(question, response) {
    cache.set(question, response);
    console.log('[Cache] SET for question:', question.substring(0, 50) + '...');
}

function getCacheStats() {
    return cache.getStats();
}

function clearCache() {
    cache.clear();
    console.log('[Cache] Cleared');
}

module.exports = {
    getCachedResponse,
    setCachedResponse,
    getCacheStats,
    clearCache
};