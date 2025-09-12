// Provider configurations
const PROVIDERS = {
    gemini: {
        name: 'Google Gemini',
        apiKeyPlaceholder: 'Enter your Gemini API Key',
        helpText: 'dont have an api key?',
        helpLink: 'get one here',
        models: ['gemini-live-2.5-flash-preview'],
        baseUrl: null, // Uses Google's SDK
        useGoogleSDK: true
    },
    burncloud: {
        name: 'BurnCloud',
        apiKeyPlaceholder: 'Enter your BurnCloud API Key',
        helpText: 'dont have an api key?',
        helpLink: 'get one here',
        baseUrl: 'https://ai.burncloud.com/v1/chat/completions',
        useGoogleSDK: false,
        models: [
            'claude-opus-4-1-20250805',
            'claude-sonnet-4-20250514', 
            'claude-opus-4-20250514',
            'claude-3-7-sonnet-20250219',
            'claude-3-5-sonnet-20241022',
            'gpt-5-chat-latest',
            'gpt-5',
            'gpt-4.1',
            'gpt-4.1-mini',
            'chatgpt-4o-latest',
            'gpt-4o-2024-11-20',
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-image-1',
            'text-embedding-3-large',
            'o3',
            'o3-mini',
            'gemini-2.5-pro',
            'gemini-2.5-flash',
            'gemini-2.5-flash-nothink',
            'gemini-2.5-pro-search',
            'gemini-2.5-pro-preview-06-05',
            'gemini-2.5-pro-preview-05-06',
            'DeepSeek-V3'
        ]
    }
};

// Get provider configuration
function getProvider(providerKey) {
    return PROVIDERS[providerKey] || PROVIDERS.gemini;
}

// Get all available providers
function getAllProviders() {
    return PROVIDERS;
}

// Get provider keys for dropdown
function getProviderKeys() {
    return Object.keys(PROVIDERS);
}

// Get default provider
function getDefaultProvider() {
    return 'gemini';
}

module.exports = {
    PROVIDERS,
    getProvider,
    getAllProviders,
    getProviderKeys,
    getDefaultProvider
};