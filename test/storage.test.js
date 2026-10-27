const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// storage.js resolves its directory from os.homedir(); point HOME at a temp dir before loading it.
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-storage-test-'));
const originalHome = process.env.HOME;
const originalUserProfile = process.env.USERPROFILE;
let storage;

before(() => {
    process.env.HOME = tmpHome;
    process.env.USERPROFILE = tmpHome;
    storage = require('../src/storage');
    storage.initializeStorage();
});

after(() => {
    process.env.HOME = originalHome;
    process.env.USERPROFILE = originalUserProfile;
    fs.rmSync(tmpHome, { recursive: true, force: true });
});

test('config dir lives under the temp HOME', () => {
    assert.ok(storage.getConfigDir().startsWith(tmpHome));
});

test('response text color defaults to null (use the theme color)', () => {
    assert.equal(storage.getPreferences().responseTextColor, null);
});

test('response text color persists and can be reset to null', () => {
    storage.updatePreference('responseTextColor', '#ff8800');
    assert.equal(storage.getPreferences().responseTextColor, '#ff8800');
    storage.updatePreference('responseTextColor', null);
    assert.equal(storage.getPreferences().responseTextColor, null);
});
