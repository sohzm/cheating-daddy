/**
 * End-to-End Tests - Complete user workflows
 * Tests the entire user journey from start to finish
 */

const { ipcRenderer } = require('electron');

describe('End-to-End Tests', () => {
    
    test('Complete DeepSeekR1 workflow', async () => {
        // Step 1: Initialize OpenRouter session
        const initResult = await ipcRenderer.invoke('initialize-openrouter-session', {
            apiKey: 'test-openrouter-key',
            mode: 'coding',
            model: 'deepseek-r1'
        });
        expect(initResult.success).toBe(true);
        
        // Step 2: User sends message with screenshot
        const messageResult = await ipcRenderer.invoke('send-to-openrouter', {
            message: 'Help me debug this terminal error',
            screenshotData: createMockTerminalScreenshot(),
            selectedModel: 'deepseek-r1'
        });
        expect(messageResult.success).toBe(true);
        
        // Step 3: Verify response is received
        // (In real implementation, this would check the UI for response)
    });
    
    test('Complete Gemini workflow', async () => {
        // Step 1: Initialize Gemini session
        const initResult = await ipcRenderer.invoke('initialize-gemini-session', {
            apiKey: 'test-gemini-key',
            mode: 'interview',
            model: 'gemini-live-2.0'
        });
        expect(initResult.success).toBe(true);
        
        // Step 2: User sends text message
        const messageResult = await ipcRenderer.invoke('send-text-message', 'Tell me about your capabilities');
        expect(messageResult.success).toBe(true);
        
        // Step 3: User sends screenshot
        const screenshotResult = await ipcRenderer.invoke('send-image-content', {
            data: createMockTerminalScreenshot()
        });
        expect(screenshotResult.success).toBe(true);
    });
    
    test('Provider switching workflow', async () => {
        // Test switching between providers
        
        // Initialize Gemini
        const geminiInit = await ipcRenderer.invoke('initialize-gemini-session', {
            apiKey: 'test-gemini-key',
            mode: 'interview',
            model: 'gemini-live-2.0'
        });
        expect(geminiInit.success).toBe(true);
        
        // Send message via Gemini
        const geminiMessage = await ipcRenderer.invoke('send-text-message', 'Hello Gemini');
        expect(geminiMessage.success).toBe(true);
        
        // Switch to OpenRouter
        const openrouterInit = await ipcRenderer.invoke('initialize-openrouter-session', {
            apiKey: 'test-openrouter-key',
            mode: 'coding',
            model: 'deepseek-r1'
        });
        expect(openrouterInit.success).toBe(true);
        
        // Send message via OpenRouter
        const openrouterMessage = await ipcRenderer.invoke('send-to-openrouter', {
            message: 'Hello DeepSeekR1',
            screenshotData: createMockTerminalScreenshot(),
            selectedModel: 'deepseek-r1'
        });
        expect(openrouterMessage.success).toBe(true);
    });
    
    test('Error recovery workflow', async () => {
        // Test error handling and recovery
        
        // Test with invalid API key
        const invalidInit = await ipcRenderer.invoke('initialize-openrouter-session', {
            apiKey: 'invalid-key',
            mode: 'coding',
            model: 'deepseek-r1'
        });
        expect(invalidInit.success).toBe(false);
        
        // Test with valid API key (recovery)
        const validInit = await ipcRenderer.invoke('initialize-openrouter-session', {
            apiKey: 'valid-key',
            mode: 'coding',
            model: 'deepseek-r1'
        });
        expect(validInit.success).toBe(true);
        
        // Test message sending after recovery
        const messageResult = await ipcRenderer.invoke('send-to-openrouter', {
            message: 'Test after recovery',
            screenshotData: createMockTerminalScreenshot(),
            selectedModel: 'deepseek-r1'
        });
        expect(messageResult.success).toBe(true);
    });
    
    test('Context-aware OCR with different screen types', async () => {
        const screenTypes = [
            { type: 'terminal', data: createMockTerminalScreenshot() },
            { type: 'code_editor', data: createMockCodeEditorScreenshot() },
            { type: 'web_browser', data: createMockWebScreenshot() }
        ];
        
        for (const screenType of screenTypes) {
            // Initialize session
            await ipcRenderer.invoke('initialize-openrouter-session', {
                apiKey: 'test-key',
                mode: 'coding',
                model: 'deepseek-r1'
            });
            
            // Send screenshot and message
            const result = await ipcRenderer.invoke('send-to-openrouter', {
                message: `Analyze this ${screenType.type}`,
                screenshotData: screenType.data,
                selectedModel: 'deepseek-r1'
            });
            
            expect(result.success).toBe(true);
        }
    });
    
    test('Manual screenshot workflow', async () => {
        // Test manual screenshot capture
        
        // Initialize session
        await ipcRenderer.invoke('initialize-openrouter-session', {
            apiKey: 'test-key',
            mode: 'coding',
            model: 'deepseek-r1'
        });
        
        // Capture manual screenshot
        const screenshotData = await window.captureManualScreenshot('high');
        expect(screenshotData).toBeDefined();
        
        // Send screenshot with message
        const result = await ipcRenderer.invoke('send-to-openrouter', {
            message: 'Help me with this screenshot',
            screenshotData: screenshotData,
            selectedModel: 'deepseek-r1'
        });
        
        expect(result.success).toBe(true);
    });
});

// Helper functions
function createMockTerminalScreenshot() {
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
}

function createMockCodeEditorScreenshot() {
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
}

function createMockWebScreenshot() {
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
}
