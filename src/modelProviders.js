const { GoogleGenAI } = require('@google/genai');

class BaseModelProvider {
    constructor(apiKey, config = {}) {
        this.apiKey = apiKey;
        this.config = config;
        this.session = null;
        this.messageBuffer = '';
    }

    async initialize() {
        throw new Error('initialize() must be implemented by provider');
    }

    async sendAudio(data, mimeType) {
        throw new Error('sendAudio() must be implemented by provider');
    }

    async sendImage(data, mimeType) {
        throw new Error('sendImage() must be implemented by provider');
    }

    async sendText(text) {
        throw new Error('sendText() must be implemented by provider');
    }

    async close() {
        if (this.session) {
            this.session = null;
        }
    }
}

class GeminiProvider extends BaseModelProvider {
    constructor(apiKey, config = {}) {
        super(apiKey, config);
        this.client = new GoogleGenAI({
            vertexai: false,
            apiKey: this.apiKey,
        });
    }

    async initialize() {
        try {
            const session = await this.client.live.connect({
                model: 'gemini-2.0-flash-live-001',
                callbacks: {
                    onopen: () => {
                        this.config.onStatusUpdate?.('Connected to Gemini - Starting recording...');
                    },
                    onmessage: (message) => {
                        console.log(message);
                        if (message.serverContent?.modelTurn?.parts) {
                            for (const part of message.serverContent.modelTurn.parts) {
                                console.log(part);
                                if (part.text) {
                                    this.messageBuffer += part.text;
                                }
                            }
                        }

                        if (message.serverContent?.generationComplete) {
                            this.config.onResponse?.(this.messageBuffer);
                            this.messageBuffer = '';
                        }

                        if (message.serverContent?.turnComplete) {
                            this.config.onStatusUpdate?.('Listening...');
                        }
                    },
                    onerror: (e) => {
                        console.debug('Error:', e.message);
                        this.config.onStatusUpdate?.('Error: ' + e.message);
                    },
                    onclose: (e) => {
                        console.debug('Session closed:', e.reason);
                        this.config.onStatusUpdate?.('Session closed');
                    },
                },
                config: {
                    responseModalities: ['TEXT'],
                    speechConfig: { languageCode: this.config.language },
                    systemInstruction: {
                        parts: [{ text: this.config.systemPrompt }],
                    },
                },
            });

            this.session = session;
            return true;
        } catch (error) {
            console.error('Failed to initialize Gemini session:', error);
            return false;
        }
    }

    async sendAudio(data, mimeType) {
        if (!this.session) return { success: false, error: 'No active session' };
        try {
            await this.session.sendRealtimeInput({
                audio: { data: data, mimeType: mimeType },
            });
            return { success: true };
        } catch (error) {
            console.error('Error sending audio:', error);
            return { success: false, error: error.message };
        }
    }

    async sendImage(data, mimeType) {
        if (!this.session) return { success: false, error: 'No active session' };
        try {
            await this.session.sendRealtimeInput({
                media: { data: data, mimeType: mimeType },
            });
            return { success: true };
        } catch (error) {
            console.error('Error sending image:', error);
            return { success: false, error: error.message };
        }
    }

    async sendText(text) {
        if (!this.session) return { success: false, error: 'No active session' };
        try {
            await this.session.sendRealtimeInput({ text: text });
            return { success: true };
        } catch (error) {
            console.error('Error sending text:', error);
            return { success: false, error: error.message };
        }
    }

    async close() {
        if (this.session) {
            try {
                this.session.close?.();
            } catch (error) {
                console.error('Error closing Gemini session:', error);
            }
            this.session = null;
        }
    }
}

class OpenAIProvider extends BaseModelProvider {
    constructor(apiKey, config = {}) {
        super(apiKey, config);
        this.model = config.model || 'gpt-4o';
        this.conversationHistory = [];
        this.isStreaming = false;
    }

    async initialize() {
        try {
            // Add system message to conversation history
            if (this.config.systemPrompt) {
                this.conversationHistory = [
                    { role: 'system', content: this.config.systemPrompt }
                ];
            }
            
            this.config.onStatusUpdate?.('Connected to OpenAI - Ready for input...');
            return true;
        } catch (error) {
            console.error('Failed to initialize OpenAI session:', error);
            return false;
        }
    }

    async sendAudio(data, mimeType) {
        // For now, OpenAI provider doesn't support real-time audio
        // This could be enhanced in the future with Whisper API
        return { success: false, error: 'Audio input not supported for OpenAI provider yet' };
    }

    async sendImage(data, mimeType) {
        if (this.isStreaming) return { success: false, error: 'Already processing request' };
        
        try {
            this.isStreaming = true;
            this.config.onStatusUpdate?.('Processing image...');
            
            // Add image to conversation history
            const imageMessage = {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:${mimeType};base64,${data}`
                        }
                    }
                ]
            };
            
            this.conversationHistory.push(imageMessage);
            await this._streamResponse();
            
            return { success: true };
        } catch (error) {
            console.error('Error sending image:', error);
            return { success: false, error: error.message };
        } finally {
            this.isStreaming = false;
        }
    }

    async sendText(text) {
        if (this.isStreaming) return { success: false, error: 'Already processing request' };
        
        try {
            this.isStreaming = true;
            this.config.onStatusUpdate?.('Processing...');
            
            // Add user message to conversation history
            this.conversationHistory.push({ role: 'user', content: text });
            await this._streamResponse();
            
            return { success: true };
        } catch (error) {
            console.error('Error sending text:', error);
            return { success: false, error: error.message };
        } finally {
            this.isStreaming = false;
        }
    }

    async _streamResponse() {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: this.conversationHistory,
                    stream: true,
                    max_tokens: 4000,
                }),
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let responseText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            this.config.onStatusUpdate?.('Listening...');
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) {
                                responseText += content;
                                this.messageBuffer += content;
                            }

                            // Check if this is the last chunk
                            if (parsed.choices?.[0]?.finish_reason) {
                                this.config.onResponse?.(this.messageBuffer);
                                // Add assistant response to conversation history
                                this.conversationHistory.push({
                                    role: 'assistant',
                                    content: this.messageBuffer
                                });
                                this.messageBuffer = '';
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error streaming response:', error);
            this.config.onStatusUpdate?.('Error: ' + error.message);
        }
    }

    async close() {
        this.conversationHistory = [];
        this.messageBuffer = '';
        this.isStreaming = false;
    }
}

function createModelProvider(providerType, apiKey, config) {
    switch (providerType) {
        case 'gemini':
            return new GeminiProvider(apiKey, config);
        case 'openai':
            return new OpenAIProvider(apiKey, config);
        default:
            throw new Error(`Unknown provider type: ${providerType}`);
    }
}

module.exports = {
    BaseModelProvider,
    GeminiProvider,
    OpenAIProvider,
    createModelProvider
}; 