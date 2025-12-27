// ollama.js - Ollama chat integration for local LLM support
// Provides chat-only functionality using Ollama as an alternative to Gemini

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

/**
 * Check if Ollama service is running and accessible
 * @param {string} ollamaUrl - Ollama API URL
 * @returns {Promise<boolean>} True if Ollama is available
 */
async function checkOllamaAvailable(ollamaUrl = DEFAULT_OLLAMA_URL) {
    try {
        const response = await fetch(`${ollamaUrl}/api/tags`, {
            method: 'GET',
        });
        return response.ok;
    } catch (error) {
        console.error('[Ollama] Connection check failed:', error.message);
        return false;
    }
}

/**
 * Get list of available Ollama models
 * @param {string} ollamaUrl - Ollama API URL
 * @returns {Promise<string[]>} Array of model names
 */
async function getOllamaModels(ollamaUrl = DEFAULT_OLLAMA_URL) {
    try {
        const response = await fetch(`${ollamaUrl}/api/tags`, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status}`);
        }

        const data = await response.json();
        const models = data.models?.map((model) => model.name) || [];
        console.log('[Ollama] Available models:', models);
        return models;
    } catch (error) {
        console.error('[Ollama] Error fetching models:', error.message);
        return [];
    }
}

/**
 * Automatically detect and return the first available Ollama model
 * @param {string} ollamaUrl - Ollama API URL
 * @returns {Promise<string|null>} First available model name or null
 */
async function detectActiveModel(ollamaUrl = DEFAULT_OLLAMA_URL) {
    try {
        const models = await getOllamaModels(ollamaUrl);
        if (models.length === 0) {
            console.warn('[Ollama] No models found');
            return null;
        }

        const activeModel = models[0];
        console.log('[Ollama] Auto-detected model:', activeModel);
        return activeModel;
    } catch (error) {
        console.error('[Ollama] Error detecting active model:', error.message);
        return null;
    }
}

/**
 * Send a chat message to Ollama and get response
 * @param {string} message - User message text
 * @param {string} model - Ollama model name
 * @param {string} ollamaUrl - Ollama API URL
 * @returns {Promise<string>} AI response text
 */
async function sendChatMessage(message, model, ollamaUrl = DEFAULT_OLLAMA_URL) {
    try {
        console.log(`[Ollama] Sending message to ${model}...`);

        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: message,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const responseText = data.response;

        console.log(`[Ollama] Response received: ${responseText.length} chars`);
        return responseText;
    } catch (error) {
        console.error('[Ollama] Error sending chat message:', error.message);
        throw new Error(`Failed to connect to Ollama: ${error.message}. Make sure Ollama is running.`);
    }
}

/**
 * Test Ollama connection and return detailed status
 * @param {string} ollamaUrl - Ollama API URL
 * @returns {Promise<{success: boolean, model?: string, error?: string}>}
 */
async function testOllamaConnection(ollamaUrl = DEFAULT_OLLAMA_URL) {
    try {
        // Check if Ollama is running
        const isAvailable = await checkOllamaAvailable(ollamaUrl);
        if (!isAvailable) {
            return {
                success: false,
                error: `Ollama not available at ${ollamaUrl}. Make sure Ollama is running.`,
            };
        }

        // Detect active model
        const activeModel = await detectActiveModel(ollamaUrl);
        if (!activeModel) {
            return {
                success: false,
                error: 'No Ollama models found. Install a model using: ollama pull llama3.2',
            };
        }

        // Test with a simple prompt
        const testResponse = await sendChatMessage('Hello', activeModel, ollamaUrl);
        if (!testResponse || testResponse.trim().length === 0) {
            return {
                success: false,
                error: 'Ollama returned empty response',
            };
        }

        return {
            success: true,
            model: activeModel,
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
        };
    }
}

module.exports = {
    checkOllamaAvailable,
    getOllamaModels,
    detectActiveModel,
    sendChatMessage,
    testOllamaConnection,
    DEFAULT_OLLAMA_URL,
};
