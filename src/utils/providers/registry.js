/**
 * Provider Registry
 * Central entry point for all AI provider calls with automatic fallback
 */

const GroqProvider = require('./groq');
const GeminiProvider = require('./gemini');
const { getNextAvailableModel, incrementUsage } = require('../rateLimitManager');
const { RATE_LIMIT_EXCEEDED } = require('../core/errors');
const { getCredentials, getPreferences } = require('../../storage');

// Provider instances (lazy initialized)
const providers = {
    groq: null,
    gemini: null
};

// Get API keys from storage
function getApiKeys() {
    try {
        return getCredentials();
    } catch (error) {
        console.error('Error getting credentials:', error);
        return {};
    }
}

// Get preferences from storage
function getPreferencesForMode(mode) {
    try {
        const prefs = getPreferences();
        return prefs[mode] || {};
    } catch (error) {
        console.error('Error getting preferences:', error);
        return {};
    }
}

// Initialize and get a provider instance
function getProvider(providerName) {
    const keys = getApiKeys();

    if (providerName === 'groq') {
        if (!providers.groq) {
            providers.groq = new GroqProvider(keys.groq);
        }
        return providers.groq;
    } else if (providerName === 'gemini') {
        const geminiKey = keys.gemini || keys.apiKey;
        if (!providers.gemini) {
            providers.gemini = new GeminiProvider(geminiKey);
        }
        return providers.gemini;
    }

    throw new Error(`Unknown provider: ${providerName}`);
}

// Reset provider instances (call when API key changes)
function resetProviders() {
    providers.groq = null;
    providers.gemini = null;
}

/**
 * Normalize response from different providers
 * Handles both streaming (Groq) and non-streaming (Gemini) responses
 * @param {object} response - Raw response from provider
 * @param {string} provider - Provider name
 * @returns {AsyncGenerator|object} - Async generator for streaming, or response object for non-streaming
 */
function normalizeResponse(response, provider) {
    // Check if it's a non-streaming response (Gemini text/image)
    if (response && response.isStream === false) {
        // Return an async generator that yields the full text at once
        return (async function* () {
            if (response.text) {
                yield response.text;
            }
        })();
    }
    
    // Otherwise, it's a stream - use the streaming normalizer
    return normalizeStream(response, provider);
}

/**
 * Normalize stream output from different providers (for actual streaming)
 * @param {object} stream - Raw stream from provider
 * @param {string} provider - Provider name
 * @yields {string} Text chunks
 */
async function* normalizeStream(stream, provider) {
    if (provider === 'groq') {
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) yield content;
        }
    } else if (provider === 'gemini') {
        // This path is for Gemini streaming (if ever used)
        for await (const chunk of stream) {
            try {
                let content = '';
                
                if (typeof chunk.text === 'function') {
                    content = chunk.text();
                }
                
                if (!content && typeof chunk.text === 'string') {
                    content = chunk.text;
                }
                
                if (!content && chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
                    content = chunk.candidates[0].content.parts[0].text;
                }
                
                if (!content && chunk.parts?.[0]?.text) {
                    content = chunk.parts[0].text;
                }
                
                if (content) yield content;
            } catch (e) {
                console.error('[Gemini Streaming] Error extracting text:', e);
            }
        }
    }
}

/**
 * Generate text response with automatic fallback
 * @param {string} mode - 'textMessage' or 'screenAnalysis'
 * @param {string} prompt - User prompt
 * @param {string} systemPrompt - System prompt
 * @param {object} options - Additional options
 */
async function generateText(mode, prompt, systemPrompt, options = {}) {
    const prefs = getPreferencesForMode(mode);
    const available = getNextAvailableModel(prefs);

    if (!available) {
        throw new Error('All models exhausted for today. Please wait until midnight UTC for reset.');
    }

    const { provider, model } = available;
    const providerInstance = getProvider(provider);

    try {
        const response = await providerInstance.generateText(model, prompt, systemPrompt, options);
        incrementUsage(provider, model);
        return {
            response: normalizeResponse(response, provider),
            provider,
            model
        };
    } catch (error) {
        // If primary failed, try fallback if available
        if (provider === prefs.primaryProvider && prefs.fallbackProvider) {
            console.log(`Primary ${provider}/${model} failed, trying fallback...`);
            const fallbackProvider = getProvider(prefs.fallbackProvider);
            const fallbackResponse = await fallbackProvider.generateText(
                prefs.fallbackModel, prompt, systemPrompt, options
            );
            incrementUsage(prefs.fallbackProvider, prefs.fallbackModel);
            return {
                response: normalizeResponse(fallbackResponse, prefs.fallbackProvider),
                provider: prefs.fallbackProvider,
                model: prefs.fallbackModel
            };
        }
        throw error;
    }
}

/**
 * Analyze image with automatic fallback
 * @param {string} mode - 'screenAnalysis'
 * @param {string} base64Image - Base64 encoded image
 * @param {string} prompt - User prompt
 * @param {string} systemPrompt - System prompt
 * @param {object} options - Additional options
 */
async function analyzeImage(mode, base64Image, prompt, systemPrompt, options = {}) {
    const prefs = getPreferencesForMode(mode);
    const available = getNextAvailableModel(prefs);

    if (!available) {
        throw new Error(RATE_LIMIT_EXCEEDED);
    }

    const { provider, model } = available;
    const providerInstance = getProvider(provider);

    try {
        const response = await providerInstance.analyzeImage(model, base64Image, prompt, systemPrompt, options);
        incrementUsage(provider, model);
        return {
            response: normalizeResponse(response, provider),
            provider,
            model
        };
    } catch (error) {
        // If primary failed, try fallback
        if (provider === prefs.primaryProvider && prefs.fallbackProvider) {
            console.log(`Primary ${provider}/${model} failed, trying fallback...`);
            const fallbackProvider = getProvider(prefs.fallbackProvider);
            const fallbackResponse = await fallbackProvider.analyzeImage(
                prefs.fallbackModel, base64Image, prompt, systemPrompt, options
            );
            incrementUsage(prefs.fallbackProvider, prefs.fallbackModel);
            return {
                response: normalizeResponse(fallbackResponse, prefs.fallbackProvider),
                provider: prefs.fallbackProvider,
                model: prefs.fallbackModel
            };
        }
        throw error;
    }
}

/**
 * Process audio input (Audio→Text mode)
 * @param {string} base64Audio - Base64 encoded audio
 * @param {string} prompt - Processing prompt
 * @param {object} options - Additional options
 */
async function processAudio(base64Audio, prompt, options = {}) {
    const prefs = getPreferencesForMode('audioToText');
    const available = getNextAvailableModel(prefs);

    if (!available) {
        throw new Error(RATE_LIMIT_EXCEEDED);
    }

    const { provider, model } = available;
    const providerInstance = getProvider(provider);

    try {
        const result = await providerInstance.processAudio(model, base64Audio, prompt, options);
        incrementUsage(provider, model);
        
        // Handle both streaming (Groq) and non-streaming (Gemini) responses
        if (result.isStream === false) {
            // Gemini non-streaming response
            return {
                response: normalizeResponse(result, provider),
                transcription: result.transcription || '',
                provider,
                model
            };
        } else {
            // Groq streaming response
            return {
                response: normalizeStream(result.stream, provider),
                transcription: result.transcription,
                provider,
                model
            };
        }
    } catch (error) {
        // Try fallback
        if (provider === prefs.primaryProvider && prefs.fallbackProvider) {
            const fallbackProvider = getProvider(prefs.fallbackProvider);
            const fallbackResult = await fallbackProvider.processAudio(
                prefs.fallbackModel, base64Audio, prompt, options
            );
            incrementUsage(prefs.fallbackProvider, prefs.fallbackModel);
            
            if (fallbackResult.isStream === false) {
                return {
                    response: normalizeResponse(fallbackResult, prefs.fallbackProvider),
                    transcription: fallbackResult.transcription || '',
                    provider: prefs.fallbackProvider,
                    model: prefs.fallbackModel
                };
            } else {
                return {
                    response: normalizeStream(fallbackResult.stream, prefs.fallbackProvider),
                    transcription: fallbackResult.transcription,
                    provider: prefs.fallbackProvider,
                    model: prefs.fallbackModel
                };
            }
        }
        throw error;
    }
}

/**
 * Validate an API key
 * @param {string} providerName - 'groq' or 'gemini'
 * @param {string} apiKey - API key to validate
 */
async function validateApiKey(providerName, apiKey) {
    let provider;
    if (providerName === 'groq') {
        provider = new GroqProvider(apiKey);
    } else if (providerName === 'gemini') {
        provider = new GeminiProvider(apiKey);
    } else {
        return { valid: false, error: 'Unknown provider' };
    }

    return await provider.validateApiKey();
}

module.exports = {
    getProvider,
    resetProviders,
    generateText,
    analyzeImage,
    processAudio,
    validateApiKey
};
