const fs = require('node:fs');
const path = require('node:path');

// Keys stay in the main process; the renderer can only query whether a key exists.
function createKeyStore({ safeStorage, directory, env = process.env }) {
    const keyPath = path.join(directory, 'deepseek-key.enc');
    let memoryKey = '';
    function isSecure() {
        try {
            return safeStorage.isEncryptionAvailable() && safeStorage.getSelectedStorageBackend?.() !== 'basic_text';
        } catch {
            return false;
        }
    }
    function current() {
        if (memoryKey) return { key: memoryKey, storage: 'memory' };
        if (fs.existsSync(keyPath)) {
            try {
                if (!isSecure()) throw new Error('Keyring unavailable');
                return { key: safeStorage.decryptString(fs.readFileSync(keyPath)), storage: 'encrypted' };
            } catch {
                if (!env.DEEPSEEK_API_KEY) {
                    throw new Error('Cannot unlock the saved key. Enter your key again for this run, or set DEEPSEEK_API_KEY.');
                }
            }
        }
        return { key: env.DEEPSEEK_API_KEY || '', storage: env.DEEPSEEK_API_KEY ? 'environment' : 'none' };
    }
    return {
        get() {
            return current().key;
        },
        status() {
            const { key, storage } = current();
            return { hasKey: Boolean(key), storage };
        },
        set(value) {
            if (typeof value !== 'string' || value.length > 512 || /\s/.test(value.trim())) throw new Error('Invalid DeepSeek API key.');
            const key = value.trim();
            if (!key) {
                fs.rmSync(keyPath, { force: true });
                memoryKey = '';
                return;
            }
            if (isSecure()) {
                const temporaryPath = `${keyPath}.tmp`;
                try {
                    const encrypted = safeStorage.encryptString(key);
                    fs.mkdirSync(directory, { recursive: true });
                    fs.writeFileSync(temporaryPath, encrypted, { mode: 0o600 });
                    fs.renameSync(temporaryPath, keyPath);
                    memoryKey = '';
                    return;
                } catch {
                    // Locked keyrings and unwritable config folders must not prevent a session.
                    try {
                        fs.rmSync(temporaryPath, { force: true });
                    } catch {}
                }
            }
            // Never write a plaintext fallback. This value disappears when the app exits.
            memoryKey = key;
        },
    };
}

module.exports = { createKeyStore };
