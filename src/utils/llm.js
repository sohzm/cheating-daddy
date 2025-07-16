class LLMService {
    constructor(apiKey, customPrompt, profile, language) {
        this.apiKey = apiKey;
        this.customPrompt = customPrompt;
        this.profile = profile;
        this.language = language;
    }

    async init() {
        throw new Error("init() not implemented");
    }

    sendAudio() {
        throw new Error("sendAudio() not implemented");
    }

    sendImage() {
        throw new Error("sendImage() not implemented");
    }

    sendText() {
        throw new Error("sendText() not implemented");
    }

    close() {
        throw new Error("close() not implemented");
    }
}

module.exports = {
    LLMService,
};
