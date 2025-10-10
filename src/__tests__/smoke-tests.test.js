/**
 * Smoke Tests - Critical functionality verification
 * These tests ensure the core features work after major changes
 */

const { ipcRenderer } = require('electron');

describe('Smoke Tests - Core Functionality', () => {
    
    test('OpenRouter session initialization', async () => {
        const result = await ipcRenderer.invoke('initialize-openrouter-session', {
            apiKey: 'test-key',
            mode: 'coding',
            model: 'deepseek-r1'
        });
        
        expect(result.success).toBe(true);
        expect(result.model).toBe('deepseek/deepseek-r1');
    });
    
    test('Gemini session initialization', async () => {
        const result = await ipcRenderer.invoke('initialize-gemini-session', {
            apiKey: 'test-key',
            mode: 'interview',
            model: 'gemini-live-2.0'
        });
        
        expect(result.success).toBe(true);
    });
    
    test('Context-aware OCR extraction', async () => {
        // Mock screenshot data
        const mockScreenshotData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        
        const result = await ipcRenderer.invoke('extract-text-from-image', {
            imageData: mockScreenshotData,
            apiKey: 'test-key'
        });
        
        expect(result.success).toBe(true);
        expect(result.extractedText).toBeDefined();
    });
    
    test('LLM chaining with screenshot and message', async () => {
        const mockScreenshotData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        
        const result = await ipcRenderer.invoke('send-to-openrouter', {
            message: 'Help me debug this code',
            screenshotData: mockScreenshotData,
            selectedModel: 'deepseek-r1'
        });
        
        expect(result.success).toBe(true);
    });
    
    test('Screenshot capture for OpenRouter', async () => {
        // Test the new captureScreenshotForOpenRouter function
        const screenshotData = await window.captureScreenshotForOpenRouter('medium');
        
        expect(screenshotData).toBeDefined();
        expect(typeof screenshotData).toBe('string');
        expect(screenshotData.length).toBeGreaterThan(0);
    });
});
