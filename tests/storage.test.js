const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { createStorage } = require('./helpers');

test('new installations use current Live and Groq defaults', t => {
    const storage = createStorage(t);
    storage.initializeStorage();
    const config = storage.getConfig();
    assert.equal(config.geminiLiveModel, 'gemini-3.8-live');
    assert.equal(config.groqModel, 'qwen/qwen3.8-27b');
    assert.equal(config.groqImageModel, 'qwen/qwen3.8-27b');
});

test('known shipped defaults migrate without resetting keys, preferences, or history', t => {
    const storage = createStorage(t);
    storage.initializeStorage();
    storage.setConfig({
        geminiLiveModel: 'gemini-3.1-flash-live-preview',
        groqModel: 'qwen/qwen3.6-27b',
        groqImageModel: 'qwen/qwen3.6-27b',
        onboarded: true,
        layout: 'compact',
    });
    storage.setCredentials({ apiKey: 'synthetic-google-key', groqApiKey: 'synthetic-groq-key' });
    storage.updatePreference('customPrompt', 'Keep my preferences');
    storage.saveSession('123', { profile: 'interview', history: [{ transcription: 'Saved question' }] });
    const names = ['credentials.json', 'preferences.json', 'history/123.json'];
    const snapshots = names.map(name => fs.readFileSync(path.join(storage.getConfigDir(), name), 'utf8'));

    storage.initializeStorage();
    const config = storage.getConfig();
    assert.equal(config.configVersion, 1);
    assert.equal(config.geminiLiveModel, 'gemini-3.8-live');
    assert.equal(config.groqModel, 'qwen/qwen3.8-27b');
    assert.equal(config.groqImageModel, 'qwen/qwen3.8-27b');
    assert.equal(config.onboarded, true);
    assert.equal(config.layout, 'compact');
    names.forEach((name, i) => assert.equal(fs.readFileSync(path.join(storage.getConfigDir(), name), 'utf8'), snapshots[i]));
});

test('custom provider models survive configuration loading and updates', t => {
    const storage = createStorage(t);
    storage.initializeStorage();
    storage.setConfig({ geminiLiveModel: 'custom-live-model', groqModel: 'openai/gpt-oss-20b', groqImageModel: 'custom-vision-model' });
    storage.updateConfig('layout', 'compact');
    const config = storage.getConfig();
    assert.equal(config.geminiLiveModel, 'custom-live-model');
    assert.equal(config.groqModel, 'openai/gpt-oss-20b');
    assert.equal(config.groqImageModel, 'custom-vision-model');
});

test('screenshot selection and counters use the same current model IDs', t => {
    const storage = createStorage(t);
    storage.initializeStorage();
    assert.equal(storage.getAvailableModel(), 'gemini-3.8-flash');
    for (let i = 0; i < 20; i++) storage.incrementLimitCount('gemini-3.8-flash');
    assert.equal(storage.getTodayLimits().flash.count, 20);
    assert.equal(storage.getAvailableModel(), 'gemini-3.5-flash-lite');
    for (let i = 0; i < 20; i++) storage.incrementLimitCount('gemini-3.5-flash-lite');
    assert.equal(storage.getTodayLimits().flashLite.count, 20);
    assert.equal(storage.getAvailableModel(), 'gemini-3.8-flash');
});
