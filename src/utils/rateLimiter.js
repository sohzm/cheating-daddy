// rateLimiter.js - Advanced rate limiting with exponential backoff

class RateLimiter {
    constructor(maxRequests = 60, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
        this.backoffDelay = 1000; // Start with 1 second
        this.maxBackoffDelay = 30000; // Max 30 seconds
        this.consecutiveFailures = 0;
    }

    async checkLimit() {
        this.cleanOldRequests();
        
        if (this.requests.length >= this.maxRequests) {
            // Apply exponential backoff
            const delay = Math.min(
                this.backoffDelay * Math.pow(2, this.consecutiveFailures),
                this.maxBackoffDelay
            );
            
            console.log(`Rate limit exceeded. Waiting ${delay}ms before retry...`);
            this.consecutiveFailures++;
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.checkLimit(); // Recursive check after delay
        }
        
        // Reset backoff on successful request
        this.consecutiveFailures = 0;
        this.backoffDelay = 1000;
        
        this.requests.push(Date.now());
        return true;
    }

    cleanOldRequests() {
        const now = Date.now();
        this.requests = this.requests.filter(timestamp => 
            now - timestamp < this.windowMs
        );
    }

    getRemainingRequests() {
        this.cleanOldRequests();
        return Math.max(0, this.maxRequests - this.requests.length);
    }

    getResetTime() {
        if (this.requests.length === 0) return 0;
        
        const oldestRequest = Math.min(...this.requests);
        return oldestRequest + this.windowMs;
    }

    reset() {
        this.requests = [];
        this.consecutiveFailures = 0;
        this.backoffDelay = 1000;
    }
}

// Create rate limiters for different API endpoints
const geminiRateLimiter = new RateLimiter(60, 60000); // 60 requests per minute
const imageRateLimiter = new RateLimiter(10, 60000);  // 10 images per minute  
const audioRateLimiter = new RateLimiter(120, 60000); // 120 audio chunks per minute

module.exports = {
    RateLimiter,
    geminiRateLimiter,
    imageRateLimiter,
    audioRateLimiter
};
