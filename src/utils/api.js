const { getProvider } = require('./providers.js');

class BurnCloudAPI {
    constructor(apiKey, baseUrl) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }

    async sendMessage(messages, model = 'claude-sonnet-4-20250514') {
        try {
            // Use dynamic import for node-fetch in Node.js environment
            const fetch = (await import('node-fetch')).default;
            
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || 'No response received';
        } catch (error) {
            console.error('BurnCloud API error:', error);
            throw error;
        }
    }

    async sendStreamMessage(messages, model = 'claude-sonnet-4-20250514', onChunk) {
        try {
            // Use dynamic import for node-fetch in Node.js environment
            const fetch = (await import('node-fetch')).default;
            
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            return;
                        }
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) {
                                onChunk(content);
                            }
                        } catch (e) {
                            // Ignore parsing errors for malformed chunks
                        }
                    }
                }
            }
        } catch (error) {
            console.error('BurnCloud streaming API error:', error);
            throw error;
        }
    }
}

// Create API instance based on provider
function createAPIInstance(providerKey, apiKey) {
    const provider = getProvider(providerKey);
    
    if (provider.useGoogleSDK) {
        // Return Google SDK instance (handled in gemini.js)
        return null;
    } else {
        // Return BurnCloud API instance
        return new BurnCloudAPI(apiKey, provider.baseUrl);
    }
}

module.exports = {
    BurnCloudAPI,
    createAPIInstance
};