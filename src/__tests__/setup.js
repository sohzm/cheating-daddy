/**
 * Test Setup - Global test configuration
 * Sets up mocks and test environment
 */

// Mock Electron IPC
jest.mock('electron', () => ({
    ipcRenderer: {
        invoke: jest.fn((event, data) => {
            // Mock responses for different events
            const mockResponses = {
                'initialize-openrouter-session': {
                    success: true,
                    model: 'deepseek/deepseek-r1',
                    sessionId: 'test-session-123'
                },
                'initialize-gemini-session': {
                    success: true,
                    sessionId: 'test-gemini-session-123'
                },
                'extract-text-from-image': {
                    success: true,
                    extractedText: 'Mock extracted text from screenshot'
                },
                'send-to-openrouter': {
                    success: true,
                    response: 'Mock OpenRouter response'
                },
                'send-text-message': {
                    success: true,
                    response: 'Mock Gemini response'
                }
            };
            
            return Promise.resolve(mockResponses[event] || { success: false, error: 'Unknown event' });
        })
    },
    ipcMain: {
        handle: jest.fn()
    }
}));

// Mock global variables
global.offscreenCanvas = null;
global.offscreenContext = null;
global.hiddenVideo = null;
global.mediaStream = null;

// Mock DOM methods
global.document = {
    createElement: jest.fn((tagName) => {
        if (tagName === 'video') {
            return {
                srcObject: null,
                muted: true,
                playsInline: true,
                play: jest.fn(),
                onloadedmetadata: null,
                readyState: 2,
                videoWidth: 1920,
                videoHeight: 1080
            };
        }
        if (tagName === 'canvas') {
            return {
                width: 1920,
                height: 1080,
                getContext: jest.fn(() => ({
                    drawImage: jest.fn(),
                    getImageData: jest.fn(() => ({
                        data: [255, 255, 255, 255] // Non-blank pixel
                    }))
                })),
                toBlob: jest.fn()
            };
        }
        return {};
    })
};

// Mock FileReader
global.FileReader = jest.fn(() => ({
    readAsDataURL: jest.fn(),
    onloadend: null,
    onerror: null,
    result: 'data:image/jpeg;base64,test-data'
}));

// Mock Blob
global.Blob = jest.fn((data, options) => ({
    data: data,
    type: options.type
}));

// Mock localStorage
global.localStorage = {
    getItem: jest.fn((key) => {
        const mockData = {
            'selectedProvider': 'openrouter',
            'selectedModel': 'deepseek-r1',
            'apiKey': 'test-gemini-key',
            'openrouterApiKey': 'test-openrouter-key'
        };
        return mockData[key] || null;
    }),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

// Mock window object
global.window = {
    captureManualScreenshot: jest.fn(() => Promise.resolve('mock-screenshot-data')),
    captureScreenshotForOpenRouter: jest.fn(() => Promise.resolve('mock-screenshot-data'))
};

// Setup test environment
beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset global variables
    global.offscreenCanvas = null;
    global.offscreenContext = null;
    global.hiddenVideo = null;
    global.mediaStream = { getVideoTracks: () => [{ getSettings: () => ({}) }] };
});

// Global test utilities
global.createMockScreenshot = (type = 'terminal') => {
    const base64String = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    return base64String;
};

global.mockApiResponse = (success = true, data = {}) => {
    return Promise.resolve({
        success: success,
        ...data
    });
};

global.mockErrorResponse = (message = 'Test error') => {
    return Promise.resolve({
        success: false,
        error: message
    });
};
