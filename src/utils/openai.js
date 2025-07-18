const { LLMService } = require('./llm.js');
const { OpenAI } = require('openai');

class OpenAIService extends LLMService {
    constructor(apiKey, baseURL, model, customPrompt, profile, language) {
        super(apiKey, customPrompt, profile, language);
        this.baseURL = baseURL;
        this.model = model;
        this.openai = new OpenAI({ apiKey, baseURL });
    }

    async init() {
        // No specific initialization needed for OpenAI using REST API
        return true;
    }

    async sendAudio(data, mimeType) {
        // Implement audio sending logic for OpenAI
    }

    async sendImage(data) {
        // Implement image sending logic for OpenAI
    }

    async sendText(text) {
        const response = await this.openai.chat.completions.create({
            model: this.model,
            messages: [{ role: 'user', content: text }],
        });
        return response.choices[0].message.content;
    }

    close() {
        // No specific closing needed
    }
}

module.exports = {
    OpenAIService,
};
