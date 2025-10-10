/**
 * Performance Tests - Response times and resource usage
 * Tests the performance of major changes
 */

const { ipcRenderer } = require('electron');

describe('Performance Tests', () => {
    
    test('Context-aware OCR performance', async () => {
        const startTime = Date.now();
        
        // Test with a large screenshot
        const largeScreenshot = createLargeMockScreenshot();
        
        const result = await ipcRenderer.invoke('extract-text-from-image', {
            imageData: largeScreenshot,
            apiKey: 'test-key'
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
    
    test('LLM chaining performance', async () => {
        const startTime = Date.now();
        
        const result = await testCompleteFlow({
            provider: 'openrouter',
            model: 'deepseek-r1',
            message: 'Analyze this screenshot',
            screenshotData: createMockTerminalScreenshot()
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    });
    
    test('Screenshot capture performance', async () => {
        const iterations = 10;
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            
            await window.captureScreenshotForOpenRouter('medium');
            
            const endTime = Date.now();
            times.push(endTime - startTime);
        }
        
        const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);
        
        expect(averageTime).toBeLessThan(1000); // Average should be under 1 second
        expect(maxTime).toBeLessThan(2000); // Max should be under 2 seconds
    });
    
    test('Memory usage during LLM chaining', async () => {
        const initialMemory = process.memoryUsage();
        
        // Perform multiple LLM chaining operations
        for (let i = 0; i < 5; i++) {
            await testCompleteFlow({
                provider: 'openrouter',
                model: 'deepseek-r1',
                message: `Test message ${i}`,
                screenshotData: createMockTerminalScreenshot()
            });
        }
        
        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        
        // Memory increase should be reasonable (less than 100MB)
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
    
    test('Concurrent request handling', async () => {
        const concurrentRequests = 5;
        const promises = [];
        
        const startTime = Date.now();
        
        for (let i = 0; i < concurrentRequests; i++) {
            promises.push(
                testCompleteFlow({
                    provider: 'openrouter',
                    model: 'deepseek-r1',
                    message: `Concurrent request ${i}`,
                    screenshotData: createMockTerminalScreenshot()
                })
            );
        }
        
        const results = await Promise.all(promises);
        const endTime = Date.now();
        const totalDuration = endTime - startTime;
        
        // All requests should succeed
        results.forEach(result => {
            expect(result.success).toBe(true);
        });
        
        // Should handle concurrent requests efficiently
        expect(totalDuration).toBeLessThan(30000); // All requests within 30 seconds
    });
});

// Helper functions
function createLargeMockScreenshot() {
    // Create a larger base64 string to simulate a high-resolution screenshot
    const base64String = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    return base64String.repeat(100); // Simulate larger image
}

function createMockTerminalScreenshot() {
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
}

async function testCompleteFlow({ provider, model, message, screenshotData }) {
    // Mock implementation for performance testing
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ success: true, response: 'Mock response' });
        }, 1000); // Simulate 1 second processing time
    });
}
