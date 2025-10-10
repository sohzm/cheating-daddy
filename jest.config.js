/**
 * Test Configuration and Setup
 * Configuration for running all tests
 */

// Jest configuration for Electron testing
module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
    testMatch: [
        '<rootDir>/src/__tests__/**/*.test.js'
    ],
    testPathIgnorePatterns: [
        '<rootDir>/src/__tests__/geminiConversation.test.js',
        '<rootDir>/src/__tests__/audioUtils.test.js',
        '<rootDir>/src/__tests__/audioUtils.e2e.test.js',
        '<rootDir>/src/__tests__/speakerFormat.test.js',
        '<rootDir>/src/__tests__/syntaxHighlight.e2e.test.js'
    ],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/__tests__/**',
        '!src/__mocks__/**',
        '!src/assets/**'
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    testTimeout: 30000, // 30 seconds for AI API calls
    verbose: true
};
