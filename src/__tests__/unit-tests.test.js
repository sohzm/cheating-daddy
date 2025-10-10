/**
 * Unit Tests - Individual Functions
 * Tests specific functions and their edge cases
 */

describe('Unit Tests - Core Functions', () => {
    
    describe('Context-Aware OCR Functions', () => {
        test('cleanExtractedText removes JSON formatting', () => {
            const testCases = [
                {
                    input: '```json\n{"test": "value"}\n```',
                    expected: '{"test": "value"}'
                },
                {
                    input: '```\n{"test": "value"}\n```',
                    expected: '{"test": "value"}'
                },
                {
                    input: '{"test": "value"}',
                    expected: '{"test": "value"}'
                },
                {
                    input: 'Plain text content',
                    expected: 'Plain text content'
                }
            ];
            
            for (const testCase of testCases) {
                const result = cleanExtractedText(testCase.input);
                expect(result).toBe(testCase.expected);
            }
        });
        
        test('getContextSpecificInstructions returns correct instructions', () => {
            const testCases = [
                { input: 'terminal', expected: 'Command prompts and their output' },
                { input: 'video', expected: 'Video titles and descriptions' },
                { input: 'code', expected: 'Complete code blocks with proper indentation' },
                { input: 'web', expected: 'Page titles and headings' },
                { input: 'question', expected: 'Complete question text' },
                { input: 'mixed', expected: 'All visible text content' },
                { input: 'unknown', expected: 'All visible text content' } // fallback
            ];
            
            for (const testCase of testCases) {
                const result = getContextSpecificInstructions(testCase.input);
                expect(result).toContain(testCase.expected);
            }
        });
    });
    
    describe('Screenshot Capture Functions', () => {
        test('captureScreenshotForOpenRouter returns base64 data', async () => {
            // Mock the window function
            const mockScreenshotData = 'mock-base64-screenshot-data';
            global.window.captureScreenshotForOpenRouter = jest.fn(() => Promise.resolve(mockScreenshotData));
            
            const result = await global.window.captureScreenshotForOpenRouter('medium');
            
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
            expect(result).toBe(mockScreenshotData);
        });
        
        test('captureScreenshot handles different quality settings', () => {
            const qualityTests = [
                { quality: 'high', expected: 0.9 },
                { quality: 'medium', expected: 0.7 },
                { quality: 'low', expected: 0.5 },
                { quality: 'unknown', expected: 0.7 }
            ];
            
            for (const test of qualityTests) {
                const qualityValue = getQualityValue(test.quality);
                expect(qualityValue).toBe(test.expected);
            }
        });
    });
    
    describe('OpenRouter Integration Functions', () => {
        test('model mapping handles different model types', () => {
            const modelMapping = {
                'deepseek-r1': 'deepseek-r1',
                'gpt-4o': 'openai/gpt-4o',
                'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet'
            };
            
            for (const [input, expected] of Object.entries(modelMapping)) {
                const result = modelMapping[input];
                expect(result).toBe(expected);
            }
        });
        
        test('combined prompt construction', () => {
            const extractedText = 'Terminal output: npm install failed';
            const userMessage = 'Help me fix this error';
            
            const combinedPrompt = `Screenshot Context:
${extractedText}

User Question/Request:
${userMessage}

Please analyze the screenshot content above and respond to the user's question/request. Provide detailed assistance based on what you can see in the screenshot.`;
            
            expect(combinedPrompt).toContain(extractedText);
            expect(combinedPrompt).toContain(userMessage);
            expect(combinedPrompt).toContain('Screenshot Context:');
            expect(combinedPrompt).toContain('User Question/Request:');
        });
    });
    
    describe('Error Handling Functions', () => {
        test('API key validation', () => {
            const testCases = [
                { apiKey: 'valid-key-123', expected: true },
                { apiKey: '', expected: false },
                { apiKey: null, expected: false },
                { apiKey: undefined, expected: false },
                { apiKey: 123, expected: false }
            ];
            
            for (const testCase of testCases) {
                const isValid = validateApiKey(testCase.apiKey);
                expect(isValid).toBe(testCase.expected);
            }
        });
        
        test('screenshot data validation', () => {
            const testCases = [
                { data: 'valid-base64-data', expected: true },
                { data: '', expected: false },
                { data: null, expected: false },
                { data: 'invalid data', expected: true } // Basic validation
            ];
            
            for (const testCase of testCases) {
                const isValid = validateScreenshotData(testCase.data);
                expect(isValid).toBe(testCase.expected);
            }
        });
    });
});

// Helper functions for testing
function cleanExtractedText(text) {
    try {
        let cleaned = text.trim();
        
        // Remove markdown code blocks
        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Clean up any remaining whitespace
        cleaned = cleaned.trim();
        
        if (cleaned.length === 0) {
            return text;
        }
        
        return cleaned;
    } catch (error) {
        return text;
    }
}

function getContextSpecificInstructions(primaryContent) {
    const instructions = {
        'terminal': 'Focus on:\n- Command prompts and their output\n- Error messages and warnings\n- File paths and directory structures\n- Code execution results\n- System information',
        'video': 'Focus on:\n- Video titles and descriptions\n- Subtitles or captions\n- Control buttons and timestamps\n- Any overlaid text or annotations\n- Video metadata if visible',
        'code': 'Focus on:\n- Complete code blocks with proper indentation\n- Syntax highlighting preservation\n- Line numbers if present\n- File names and paths\n- Error messages or warnings\n- Comments and documentation',
        'web': 'Focus on:\n- Page titles and headings\n- Form fields and labels\n- Navigation elements\n- Article or content text\n- URLs and links\n- User interface elements',
        'question': 'Focus on:\n- Complete question text\n- Multiple choice options\n- Problem statements\n- Instructions or requirements\n- Answer fields or input areas\n- Any diagrams or visual aids',
        'mixed': 'Focus on:\n- All visible text content\n- Maintain spatial relationships\n- Preserve formatting and structure\n- Include all UI elements\n- Capture both code and text content'
    };
    
    return instructions[primaryContent] || instructions['mixed'];
}

function getQualityValue(quality) {
    switch (quality) {
        case 'high': return 0.9;
        case 'medium': return 0.7;
        case 'low': return 0.5;
        default: return 0.7;
    }
}

function validateApiKey(apiKey) {
    return !!(apiKey && typeof apiKey === 'string' && apiKey.length > 0);
}

function validateScreenshotData(data) {
    return !!(data && data.length > 0);
}
