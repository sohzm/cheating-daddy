const { sendToRenderer } = require('./ipcUtils.js');

// Rate limiting and retry logic
class RateLimiter {
    constructor() {
        this.requests = new Map(); // Track requests per model
        this.retryDelays = new Map(); // Track retry delays
    }

    async checkRateLimit(model) {
        const now = Date.now();
        const modelRequests = this.requests.get(model) || [];
        
        // Clean old requests (older than 1 minute)
        const recentRequests = modelRequests.filter(time => now - time < 60000);
        this.requests.set(model, recentRequests);

        // Check rate limits based on model
        const rateLimits = {
            'deepseek/deepseek-r1': { rpm: 60, tpm: 1000000 },
            'openai/gpt-4o': { rpm: 10, tpm: 200000 },
            'anthropic/claude-3.5-sonnet': { rpm: 5, tpm: 100000 }
        };

        const limits = rateLimits[model] || { rpm: 10, tpm: 100000 };
        
        if (recentRequests.length >= limits.rpm) {
            const waitTime = 60000 - (now - recentRequests[0]);
            console.warn(`⚠️ Rate limit exceeded for ${model}. Waiting ${waitTime}ms`);
            await this.sleep(waitTime);
        }

        // Record this request
        recentRequests.push(now);
        this.requests.set(model, recentRequests);
    }

    async handleRateLimitError(error, model) {
        if (error.message.includes('429')) {
            const retryCount = this.retryDelays.get(model) || 0;
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s
            
            console.warn(`🔄 Rate limit hit for ${model}. Retrying in ${delay}ms (attempt ${retryCount + 1})`);
            
            this.retryDelays.set(model, retryCount + 1);
            await this.sleep(delay);
            
            return true; // Indicate retry should happen
        }
        
        // Reset retry count on success
        this.retryDelays.delete(model);
        return false;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getRateLimitStatus(model) {
        const modelRequests = this.requests.get(model) || [];
        const now = Date.now();
        const recentRequests = modelRequests.filter(time => now - time < 60000);
        
        const rateLimits = {
            'deepseek/deepseek-r1': { rpm: 60, tpm: 1000000 },
            'openai/gpt-4o': { rpm: 10, tpm: 200000 },
            'anthropic/claude-3.5-sonnet': { rpm: 5, tpm: 100000 }
        };

        const limits = rateLimits[model] || { rpm: 10, tpm: 100000 };
        
        return {
            current: recentRequests.length,
            limit: limits.rpm,
            remaining: Math.max(0, limits.rpm - recentRequests.length),
            resetTime: recentRequests.length > 0 ? recentRequests[0] + 60000 : now
        };
    }
}

const rateLimiter = new RateLimiter();

let openrouterClient = null;
let currentApiKey = null;

// Initialize OpenRouter client
function initializeOpenRouterClient(apiKey) {
    if (currentApiKey === apiKey && openrouterClient) {
        return openrouterClient;
    }

    currentApiKey = apiKey;
    
    // Create a simple fetch-based client since we can't use the official OpenRouter client in Electron
    openrouterClient = {
        apiKey: apiKey,
        baseUrl: 'https://openrouter.ai/api/v1',
        
        async chat(messages, model) {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://cheating-daddy.app', // Optional: for analytics
                    'X-Title': 'Cheating Daddy', // Optional: for analytics
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    stream: false, // We'll handle streaming manually
                    temperature: 0.7,
                    max_tokens: 4000,
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }

            return await response.json();
        },

        async streamChat(messages, model, onChunk) {
            console.log('OpenRouter streamChat called with model:', model);
            
            // Check rate limits before making request
            await rateLimiter.checkRateLimit(model);
            
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://cheating-daddy.app',
                    'X-Title': 'Cheating Daddy',
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 4000,
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
                
                // Handle rate limit errors with retry
                if (response.status === 429) {
                    const shouldRetry = await rateLimiter.handleRateLimitError(error, model);
                    if (shouldRetry) {
                        // Retry the entire request
                        return this.streamChat(messages, model, onChunk);
                    }
                }
                
                throw error;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // Keep the last incomplete line

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') {
                                return;
                            }

                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices?.[0]?.delta?.content;
                                if (content && onChunk) {
                                    onChunk(content);
                                }
                            } catch (e) {
                                // Ignore parsing errors for incomplete chunks
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
        }
    };

    return openrouterClient;
}

// Initialize OpenRouter session
async function initializeOpenRouterSession(apiKey, mode = 'coding', model = 'deepseek-r1') {
    try {
        console.log('Initializing OpenRouter session with model:', model);
        
        const client = initializeOpenRouterClient(apiKey);
        
        // Test the connection with a simple request
        const modelWithProvider = model.includes('/') ? model : `deepseek/${model}`;
        const testResponse = await client.chat([
            { role: 'user', content: 'Hello, this is a test message.' }
        ], modelWithProvider);
        
        console.log('OpenRouter connection test successful');
        sendToRenderer('update-status', 'OpenRouter connected');
        
        const finalModel = `deepseek/${model}`;
        console.log('OpenRouter session initialized with model:', finalModel);
        
        return {
            client,
            model: finalModel,
            mode,
            isConnected: true,
            // Add a simple identifier for debugging
            sessionId: Date.now().toString()
        };
        
    } catch (error) {
        console.error('Failed to initialize OpenRouter session:', error);
        sendToRenderer('update-status', `OpenRouter error: ${error.message}`);
        throw error;
    }
}

// Send message to OpenRouter
async function sendToOpenRouter(session, message, onChunk) {
    if (!session || !session.client) {
        throw new Error('OpenRouter session not initialized');
    }

    try {
        let messages;
        
        // Handle both string messages and multimodal messages
        if (typeof message === 'string') {
            messages = [
                { role: 'user', content: message }
            ];
        } else if (Array.isArray(message)) {
            // Multimodal message with text and images
            messages = message;
        } else {
            throw new Error('Invalid message format for OpenRouter');
        }

        if (onChunk) {
            // Use streaming for real-time responses
            await session.client.streamChat(messages, session.model, onChunk);
        } else {
            // Use regular chat for non-streaming
            const response = await session.client.chat(messages, session.model);
            return response.choices[0].message.content;
        }
    } catch (error) {
        console.error('Error sending message to OpenRouter:', error);
        sendToRenderer('update-status', `OpenRouter error: ${error.message}`);
        throw error;
    }
}

// Get available models
function getAvailableModels() {
    return [
        { id: 'deepseek-r1', name: 'DeepSeekR1', provider: 'deepseek', supportsVision: false },
        { id: 'deepseek-coder', name: 'DeepSeekCoder', provider: 'deepseek', supportsVision: false },
        { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', supportsVision: true },
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', supportsVision: true },
        { id: 'gpt-4-vision-preview', name: 'GPT-4 Vision', provider: 'openai', supportsVision: true },
        { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', provider: 'meta', supportsVision: false },
    ];
}

// Get model info
function getModelInfo(modelId) {
    const models = getAvailableModels();
    return models.find(m => m.id === modelId) || models[0];
}

// Get rate limit status for UI
function getRateLimitStatus(model) {
    return rateLimiter.getRateLimitStatus(model);
}

module.exports = {
    initializeOpenRouterSession,
    sendToOpenRouter,
    getAvailableModels,
    getModelInfo,
    getRateLimitStatus
};
