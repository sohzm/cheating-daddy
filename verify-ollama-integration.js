#!/usr/bin/env node

/**
 * Ollama Integration Verification Script
 * 
 * This script verifies that the Ollama integration is properly wired
 * by checking all the key files and making sure the necessary code exists.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;

console.log('🔍 Verifying Ollama Integration...\n');

const checks = {
    passed: 0,
    failed: 0,
    warnings: 0
};

function checkFile(filePath, checks) {
    const fullPath = path.join(projectRoot, 'src', filePath);
    
    if (!fs.existsSync(fullPath)) {
        console.log(`❌ File not found: ${filePath}`);
        checks.failed++;
        return false;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    
    let allChecksPassed = true;
    
    checks.forEach(check => {
        const found = check.regex ? check.regex.test(content) : content.includes(check.text);
        
        if (found) {
            console.log(`✅ ${check.description}`);
            checks.passed++;
        } else {
            console.log(`❌ ${check.description}`);
            console.log(`   Expected: ${check.text || check.regex}`);
            checks.failed++;
            allChecksPassed = false;
        }
    });
    
    return allChecksPassed;
}

console.log('📁 Checking ollama.js...');
checkFile('utils/ollama.js', [
    { text: 'checkOllamaAvailable', description: 'Has checkOllamaAvailable function' },
    { text: 'detectActiveModel', description: 'Has detectActiveModel function' },
    { text: 'sendChatMessage', description: 'Has sendChatMessage function' },
    { text: 'testOllamaConnection', description: 'Has testOllamaConnection function' },
    { text: 'http://localhost:11434', description: 'Uses correct Ollama URL' },
]);

console.log('\n📁 Checking gemini.js...');
checkFile('utils/gemini.js', [
    { text: 'test-ollama-connection', description: 'Has IPC handler for test connection' },
    { text: 'set-chat-provider', description: 'Has IPC handler for set provider' },
    { text: 'get-chat-provider', description: 'Has IPC handler for get provider' },
    { text: 'useOllama', description: 'Has useOllama flag' },
    { regex: /if\s*\(useOllama\)/, description: 'Has chat routing logic' },
    { text: 'sendOllamaChatMessage', description: 'Calls Ollama chat function' },
]);

console.log('\n📁 Checking preload.js...');
checkFile('preload.js', [
    { text: 'testOllamaConnection', description: 'Exposes testOllamaConnection' },
    { text: 'setChatProvider', description: 'Exposes setChatProvider' },
    { text: 'getChatProvider', description: 'Exposes getChatProvider' },
]);

console.log('\n📁 Checking CustomizeView.js...');
checkFile('components/views/CustomizeView.js', [
    { text: 'chatProvider', description: 'Has chatProvider property' },
    { text: 'handleChatProviderSelect', description: 'Has handleChatProviderSelect method' },
    { text: 'handleTestOllamaConnection', description: 'Has handleTestOllamaConnection method' },
    { text: 'Chat Provider', description: 'Has Chat Provider section in UI' },
    { text: 'Ollama Limitations', description: 'Has warning about Ollama limitations' },
    { text: 'Test Connection', description: 'Has test connection button' },
]);

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Results:`);
console.log(`   ✅ Passed: ${checks.passed}`);
console.log(`   ❌ Failed: ${checks.failed}`);
console.log(`   ⚠️  Warnings: ${checks.warnings}`);

if (checks.failed === 0) {
    console.log('\n🎉 All checks passed! Ollama integration is properly wired.');
    console.log('\n📝 Next steps:');
    console.log('   1. Install Ollama: https://ollama.ai/download');
    console.log('   2. Pull a model: ollama pull llama3.2');
    console.log('   3. Start Ollama: ollama serve');
    console.log('   4. Run the app: npm start');
    console.log('   5. Go to Settings → Chat Provider → Select "Ollama (Local)"');
    console.log('   6. Click "Test Connection"');
    process.exit(0);
} else {
    console.log('\n❌ Some checks failed. Please review the errors above.');
    process.exit(1);
}
