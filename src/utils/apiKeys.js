// src/utils/apiKeys.js
//
// API key validation + rotation manager.
//
// Responsibilities:
//   - Validate raw keys against Gemini / Groq with lightweight "list models" probes.
//   - Classify failures from real API calls (401/403 => invalid, 429/quota => exhausted, other => transient).
//   - Provide withKeyRotation(provider, fn) which retries across every ready key in the pool.
//   - On app startup, asynchronously validate every stored key in the background.
//   - Periodically revalidate keys whose 24h cooldown has elapsed.
//
// Raw keys never leave the main process — the renderer only ever sees sanitized entries.

const { BrowserWindow } = require('electron');
const storage = require('../storage');

let _broadcastEnabled = true;
let _revalidationInterval = null;
const REVALIDATION_INTERVAL_MS = 60 * 60 * 1000; // 1h

// ──────────────────────────────────────────────────────────────
// Error classification
// ──────────────────────────────────────────────────────────────

/**
 * Classify an error thrown by the SDK or a fetch() response into a key state.
 * Returns one of: 'invalid' | 'exhausted' | 'transient'.
 * 'transient' means "leave the key alone, could be a network blip".
 */
function classifyError(err) {
    if (!err) return 'transient';

    // Extract status and message from a variety of error shapes
    const status =
        err.status ||
        err.code ||
        err.response?.status ||
        err.cause?.status ||
        null;
    const message = (err.message || err.toString() || '').toLowerCase();

    if (status === 401 || status === 403) return 'invalid';
    if (status === 429) return 'exhausted';

    // Google SDK tends to surface codes inside the message
    if (/\b401\b|\bunauthorized\b|\bapi[_ ]key[_ ]invalid\b|\binvalid api key\b|\bpermission_denied\b/.test(message)) {
        return 'invalid';
    }
    if (/\b429\b|\bquota\b|\brate[_ ]?limit\b|\bresource_exhausted\b|\bexhausted\b|\btoo many requests\b/.test(message)) {
        return 'exhausted';
    }

    return 'transient';
}

/**
 * Classify a fetch Response (for the Groq REST call path) into a state.
 * Returns 'invalid' | 'exhausted' | 'transient' | 'ok'.
 */
async function classifyFetchResponse(response) {
    if (response.ok) return 'ok';
    if (response.status === 401 || response.status === 403) return 'invalid';
    if (response.status === 429) return 'exhausted';
    // Some providers use 400 with a quota body
    if (response.status === 400) {
        try {
            const cloned = response.clone();
            const text = await cloned.text();
            if (/quota|rate[_ ]?limit|exhausted/i.test(text)) return 'exhausted';
        } catch (_) { /* ignore */ }
    }
    return 'transient';
}

// ──────────────────────────────────────────────────────────────
// Probes
// ──────────────────────────────────────────────────────────────

async function probeGroqKey(key) {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
            method: 'GET',
            headers: { Authorization: `Bearer ${key}` },
        });
        if (response.ok) return { state: 'ready', reason: null };
        const verdict = await classifyFetchResponse(response);
        if (verdict === 'invalid') return { state: 'invalid', reason: `HTTP ${response.status}` };
        if (verdict === 'exhausted') return { state: 'exhausted', reason: `HTTP ${response.status}` };
        // Transient — do not touch the state
        return { state: null, reason: `HTTP ${response.status}` };
    } catch (err) {
        // Network error — don't mark invalid/exhausted
        return { state: null, reason: err.message || 'Network error' };
    }
}

async function probeGeminiKey(key) {
    // Lightweight endpoint: models.list
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
        const response = await fetch(url, { method: 'GET' });
        if (response.ok) return { state: 'ready', reason: null };
        const verdict = await classifyFetchResponse(response);
        if (verdict === 'invalid') return { state: 'invalid', reason: `HTTP ${response.status}` };
        if (verdict === 'exhausted') return { state: 'exhausted', reason: `HTTP ${response.status}` };
        return { state: null, reason: `HTTP ${response.status}` };
    } catch (err) {
        return { state: null, reason: err.message || 'Network error' };
    }
}

async function probeKey(provider, key) {
    if (provider === 'gemini') return probeGeminiKey(key);
    if (provider === 'groq') return probeGroqKey(key);
    throw new Error(`Unknown provider: ${provider}`);
}

// ──────────────────────────────────────────────────────────────
// Broadcasting changes to renderer
// ──────────────────────────────────────────────────────────────

function broadcastUpdate(provider) {
    if (!_broadcastEnabled) return;
    try {
        const windows = BrowserWindow.getAllWindows();
        const payload = {
            provider,
            keys: storage.listProviderKeys(provider),
        };
        for (const w of windows) {
            w.webContents.send('api-keys:updated', payload);
        }
    } catch (err) {
        console.error('Failed to broadcast api-keys:updated:', err.message);
    }
}

// ──────────────────────────────────────────────────────────────
// Public operations
// ──────────────────────────────────────────────────────────────

function listKeys(provider) {
    return storage.listProviderKeys(provider);
}

async function addKey(provider, rawKey, label = '') {
    const result = storage.addProviderKey(provider, rawKey, label);
    if (!result.ok) return result;
    // Fire-and-forget validation; don't block the caller.
    setImmediate(() => {
        revalidateKey(provider, result.id).catch(err => {
            console.error('Initial validation failed:', err);
        });
    });
    broadcastUpdate(provider);
    return result;
}

function removeKey(provider, id) {
    const result = storage.removeProviderKey(provider, id);
    if (result.ok) broadcastUpdate(provider);
    return result;
}

async function revalidateKey(provider, id) {
    const raw = storage.getProviderKeyRaw(provider, id);
    if (!raw) return { ok: false, error: 'Key not found' };

    // Best-effort probe
    const verdict = await probeKey(provider, raw.key);
    if (verdict.state === 'ready') {
        storage.markProviderKeyState(provider, id, 'ready', { errorReason: null });
    } else if (verdict.state === 'exhausted') {
        storage.markProviderKeyState(provider, id, 'exhausted', { errorReason: verdict.reason });
    } else if (verdict.state === 'invalid') {
        storage.markProviderKeyState(provider, id, 'invalid', { errorReason: verdict.reason });
    } else {
        // Transient — just touch lastCheckedAt
        storage.updateProviderKey(provider, id, { lastCheckedAt: Date.now(), errorReason: verdict.reason });
    }
    broadcastUpdate(provider);
    return { ok: true };
}

async function revalidateAll(provider) {
    const keys = storage.listAllProviderKeysRaw(provider);
    await Promise.allSettled(keys.map(k => revalidateKey(provider, k.id)));
    return { ok: true, count: keys.length };
}

async function revalidateAllProviders() {
    await Promise.allSettled(
        storage.API_KEY_PROVIDERS.map(p => revalidateAll(p))
    );
}

/**
 * Scan all providers and revalidate any keys whose 24h cooldown has elapsed,
 * plus any keys in 'unknown' state that haven't been checked yet.
 */
async function revalidateStale() {
    const now = Date.now();
    for (const provider of storage.API_KEY_PROVIDERS) {
        const keys = storage.listAllProviderKeysRaw(provider);
        for (const k of keys) {
            const shouldRetry =
                (k.state === 'exhausted' && k.exhaustedUntil && k.exhaustedUntil <= now) ||
                (k.state === 'unknown') ||
                (k.state === 'invalid' && k.lastCheckedAt && (now - k.lastCheckedAt) > storage.EXHAUSTION_COOLDOWN_MS);
            if (shouldRetry) {
                // Fire-and-forget; don't chain serially to avoid long walls
                revalidateKey(provider, k.id).catch(() => {});
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────
// Rotation
// ──────────────────────────────────────────────────────────────

/**
 * Run `fn(key, entry)` with each ready key from `provider` in order.
 * If `fn` throws and the error classifies as invalid/exhausted, mark the key,
 * broadcast, and try the next ready key. Otherwise rethrow (transient).
 *
 * Returns the function's resolved value. Throws if every key is exhausted
 * or if a transient error bubbles up.
 */
async function withKeyRotation(provider, fn) {
    const candidates = storage.listReadyProviderKeys(provider);
    if (candidates.length === 0) {
        const err = new Error(`No ready ${provider} API key available`);
        err.code = 'NO_READY_KEY';
        throw err;
    }

    let lastError = null;
    for (const entry of candidates) {
        try {
            return await fn(entry.key, entry);
        } catch (err) {
            lastError = err;
            const verdict = classifyError(err);
            if (verdict === 'invalid') {
                storage.markProviderKeyState(provider, entry.id, 'invalid', { errorReason: err.message });
                broadcastUpdate(provider);
                continue;
            }
            if (verdict === 'exhausted') {
                storage.markProviderKeyState(provider, entry.id, 'exhausted', { errorReason: err.message });
                broadcastUpdate(provider);
                continue;
            }
            // Transient — bubble up; we don't know if next key would help
            throw err;
        }
    }

    // All keys consumed without success
    const err = new Error(`All ${provider} API keys exhausted or invalid`);
    err.code = 'ALL_KEYS_UNAVAILABLE';
    err.cause = lastError;
    throw err;
}

/**
 * Handle a fetch Response from a call that used `key`. If the response indicates
 * invalid/exhausted, mark the key and broadcast. Returns the verdict so the caller
 * can decide whether to retry with another key.
 */
async function handleResponseStatus(provider, keyId, response) {
    const verdict = await classifyFetchResponse(response);
    if (verdict === 'invalid') {
        storage.markProviderKeyState(provider, keyId, 'invalid', { errorReason: `HTTP ${response.status}` });
        broadcastUpdate(provider);
    } else if (verdict === 'exhausted') {
        storage.markProviderKeyState(provider, keyId, 'exhausted', { errorReason: `HTTP ${response.status}` });
        broadcastUpdate(provider);
    }
    return verdict;
}

// ──────────────────────────────────────────────────────────────
// Lifecycle
// ──────────────────────────────────────────────────────────────

/**
 * Kick off background validation of every stored key without blocking startup.
 * Also schedules a periodic revalidation sweep for keys whose cooldown has passed.
 */
function startBackgroundValidation() {
    // Fire-and-forget — never awaited
    setImmediate(() => {
        revalidateAllProviders().catch(err => {
            console.error('Startup key validation failed:', err);
        });
    });

    if (_revalidationInterval) clearInterval(_revalidationInterval);
    _revalidationInterval = setInterval(() => {
        revalidateStale().catch(err => {
            console.error('Scheduled key revalidation failed:', err);
        });
    }, REVALIDATION_INTERVAL_MS);
    _revalidationInterval.unref?.();
}

function stopBackgroundValidation() {
    if (_revalidationInterval) {
        clearInterval(_revalidationInterval);
        _revalidationInterval = null;
    }
}

module.exports = {
    // Public operations
    listKeys,
    addKey,
    removeKey,
    revalidateKey,
    revalidateAll,
    revalidateAllProviders,
    revalidateStale,

    // Rotation / error handling
    withKeyRotation,
    classifyError,
    classifyFetchResponse,
    handleResponseStatus,

    // Lifecycle
    startBackgroundValidation,
    stopBackgroundValidation,

    // For IPC layer
    broadcastUpdate,
};
