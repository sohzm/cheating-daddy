const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createKeyStore } = require('../src/utils/deepseekCredentials');

function fixture(t, overrides = {}, env = {}) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'deepseek-test-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const safeStorage = {
        isEncryptionAvailable: () => true,
        encryptString: value => Buffer.from(value).map(byte => byte ^ 0xa5),
        decryptString: value =>
            Buffer.from(value)
                .map(byte => byte ^ 0xa5)
                .toString(),
        ...overrides,
    };
    const restart = () => createKeyStore({ safeStorage, directory, env });
    return { directory, store: restart(), restart, safeStorage };
}

test('key storage delegates encryption to OS and supports replacement/removal', t => {
    const { store, directory } = fixture(t);
    store.set('sk-test-key');
    assert.equal(store.get(), 'sk-test-key');
    assert.deepEqual(store.status(), { hasKey: true, storage: 'encrypted' });
    assert.equal(fs.readFileSync(path.join(directory, 'deepseek-key.enc')).includes(Buffer.from('sk-test-key')), false);
    store.set('sk-replacement');
    assert.equal(store.get(), 'sk-replacement');
    store.set('');
    assert.equal(store.get(), '');
    assert.deepEqual(fs.readdirSync(directory), []);
});

test('unavailable, basic_text, or locked keyring uses memory without persisting plaintext', t => {
    for (const overrides of [
        { isEncryptionAvailable: () => false },
        { getSelectedStorageBackend: () => 'basic_text' },
        {
            encryptString: () => {
                throw new Error('Keyring locked');
            },
        },
    ]) {
        const { store, directory, restart } = fixture(t, overrides, { DEEPSEEK_API_KEY: 'env-key' });
        store.set('secret');
        assert.equal(store.get(), 'secret');
        assert.deepEqual(store.status(), { hasKey: true, storage: 'memory' });
        assert.deepEqual(fs.readdirSync(directory), []);
        assert.equal(restart().get(), 'env-key');
        store.set('replacement');
        assert.equal(store.get(), 'replacement');
        store.set('');
        assert.equal(store.get(), 'env-key');
        assert.deepEqual(store.status(), { hasKey: true, storage: 'environment' });
    }
});

test('temporary key is lost on restart, can be forgotten, and moves to encryption when available', t => {
    const { store, restart, safeStorage, directory } = fixture(t, { isEncryptionAvailable: () => false });
    store.set('temporary');
    assert.equal(restart().get(), '');
    for (const value of [null, {}, 'a\nb']) assert.throws(() => store.set(value));
    assert.equal(store.get(), 'temporary');
    store.set('');
    assert.deepEqual(store.status(), { hasKey: false, storage: 'none' });
    store.set('temporary');
    safeStorage.isEncryptionAvailable = () => true;
    store.set('persisted');
    assert.deepEqual(store.status(), { hasKey: true, storage: 'encrypted' });
    assert.equal(restart().get(), 'persisted');
    assert.equal(fs.readFileSync(path.join(directory, 'deepseek-key.enc')).includes(Buffer.from('persisted')), false);
});

test('an unreadable saved key does not block environment or newly entered temporary keys', t => {
    const { store, safeStorage, directory } = fixture(t, {}, { DEEPSEEK_API_KEY: 'env-key' });
    store.set('old-key');
    safeStorage.isEncryptionAvailable = () => false;
    assert.equal(store.get(), 'env-key');
    store.set('new-key');
    assert.equal(store.get(), 'new-key');
    assert.deepEqual(store.status(), { hasKey: true, storage: 'memory' });
    store.set('');
    assert.deepEqual(fs.readdirSync(directory), []);
    assert.equal(store.get(), 'env-key');
});

test('corrupt ciphertext is recoverable with an environment or temporary key', t => {
    const { store, directory, safeStorage } = fixture(t);
    fs.writeFileSync(path.join(directory, 'deepseek-key.enc'), 'broken-ciphertext');
    safeStorage.decryptString = () => {
        throw new Error('Invalid encrypted data');
    };
    assert.throws(() => store.get(), /Enter your key again/);
    const environmentStore = createKeyStore({ safeStorage, directory, env: { DEEPSEEK_API_KEY: 'env-key' } });
    assert.equal(environmentStore.get(), 'env-key');
    safeStorage.isEncryptionAvailable = () => false;
    store.set('new-key');
    assert.equal(store.get(), 'new-key');
});

test('saved key takes precedence over environment and rejects invalid IPC values', t => {
    const { store } = fixture(t, {}, { DEEPSEEK_API_KEY: 'env-key' });
    assert.equal(store.get(), 'env-key');
    store.set('saved-key');
    assert.equal(store.get(), 'saved-key');
    for (const value of [null, 42, {}, 'a'.repeat(513), 'a\nb']) assert.throws(() => store.set(value));
    assert.equal(store.get(), 'saved-key');
});
