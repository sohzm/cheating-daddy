// src/utils/apiKeys.js
//
// API key validation + rotation manager.
//
// State machine:
//   unknown   → (probe) → ready | exhausted | invalid
//   ready     → (429/quota error during use) → exhausted
//   ready     → (401/403 during use) → invalid
//   exhausted → (cooldown expires + probe succeeds) → ready
//   exhausted → (cooldown expires + probe fails) → exhausted (reset cooldown) | invalid
//   invalid   → (manual Test after 24h) → ready | exhausted | invalid
//   checking  → transient UI state during active probe (not persisted)
//
// Only keys with state === 'ready' are used for API calls.
// Keys with state === 'unknown' are NOT used until validated.
// Raw keys never leave the main process.

const { BrowserWindow } = require('electron');
const storage = require('../storage');

let _revalidationInterval = null;
const REVALIDATION_INTERVAL_MS = 5 * 60 * 1000; // 5 min sweep
const PROBE_TIMEOUT_MS = 10 * 1000; // 10s timeout per probe

// Track which keys are currently being validated so we don't double-probe
const _validating = new Set(); // Set<`${provider}:${id}`>

// ──────────────────────────────────────────────────────────────
// Timeout helper
// ──────────────────────────────────────────────────────────────

function withTimeout(promise, ms, label) {
    return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`Probe timeout after ${ms}ms: ${label}`)), ms))]);
}

// ──────────────────────────────────────────────────────────────
// Error classification
// ──────────────────────────────────────────────────────────────

function classifyError(err) {
    if (!err) return 'transient';
    const status = err.status || err.code || err.response?.status || err.cause?.status || null;
    const message = (err.message || err.toString() || '').toLowerCase();

    if (status === 401 || status === 403) return 'invalid';
    if (status === 429) return 'exhausted';
    if (/\b401\b|\bunauthorized\b|\bapi[_ ]key[_ ]invalid\b|\binvalid api key\b|\bpermission_denied\b/.test(message)) return 'invalid';
    if (/\b429\b|\bquota\b|\brate[_ ]?limit\b|\bresource_exhausted\b|\bexhausted\b|\btoo many requests\b/.test(message)) return 'exhausted';
    return 'transient';
}

async function classifyFetchResponse(response) {
    if (response.ok) return 'ok';
    if (response.status === 401 || response.status === 403) return 'invalid';
    if (response.status === 429) return 'exhausted';
    if (response.status === 400) {
        try {
            const text = await response.clone().text();
            if (/quota|rate[_ ]?limit|exhausted/i.test(text)) return 'exhausted';
        } catch (_) {}
    }
    return 'transient';
}

// ──────────────────────────────────────────────────────────────
// Probes (with timeout)
// ──────────────────────────────────────────────────────────────

async function probeGroqKey(key) {
    try {
        const response = await withTimeout(
            fetch('https://api.groq.com/openai/v1/models', {
                method: 'GET',
                headers: { Authorization: `Bearer ${key}` },
                signal: AbortSignal.timeout ? AbortSignal.timeout(PROBE_TIMEOUT_MS) : undefined,
            }),
            PROBE_TIMEOUT_MS,
            'groq:probe'
        );
        if (response.ok) return { state: 'ready', reason: null };
        const verdict = await classifyFetchResponse(response);
        if (verdict === 'invalid') return { state: 'invalid', reason: `HTTP ${response.status}` };
        if (verdict === 'exhausted') return { state: 'exhausted', reason: `HTTP ${response.status}` };
        return { state: 'invalid', reason: `Unexpected HTTP ${response.status}` };
    } catch (err) {
        const msg = err.message || 'Network error';
        // Timeout or network — don't permanently mark as invalid
        if (/timeout/i.test(msg) || /network/i.test(msg) || /fetch/i.test(msg)) {
            return { state: null, reason: msg };
        }
        return { state: 'invalid', reason: msg };
    }
}

async function probeGeminiKey(key) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
        const response = await withTimeout(
            fetch(url, {
                method: 'GET',
                signal: AbortSignal.timeout ? AbortSignal.timeout(PROBE_TIMEOUT_MS) : undefined,
            }),
            PROBE_TIMEOUT_MS,
            'gemini:probe'
        );
        if (response.ok) return { state: 'ready', reason: null };
        const verdict = await classifyFetchResponse(response);
        if (verdict === 'invalid') return { state: 'invalid', reason: `HTTP ${response.status}` };
        if (verdict === 'exhausted') return { state: 'exhausted', reason: `HTTP ${response.status}` };
        return { state: 'invalid', reason: `Unexpected HTTP ${response.status}` };
    } catch (err) {
        const msg = err.message || 'Network error';
        if (/timeout/i.test(msg) || /network/i.test(msg) || /fetch/i.test(msg)) {
            return { state: null, reason: msg };
        }
        return { state: 'invalid', reason: msg };
    }
}

async function probeKey(provider, key) {
    if (provider === 'gemini') return probeGeminiKey(key);
    if (provider === 'groq') return probeGroqKey(key);
    throw new Error(`Unknown provider: ${provider}`);
}

// ──────────────────────────────────────────────────────────────
// Broadcasting
// ──────────────────────────────────────────────────────────────

function broadcastUpdate(provider) {
    try {
        const windows = BrowserWindow.getAllWindows();
        const keys = storage.listProviderKeys(provider);
        for (const w of windows) {
            w.webContents.send('api-keys:updated', { provider, keys });
        }
    } catch (err) {
        console.error('Failed to broadcast api-keys:updated:', err.message);
    }
}

function broadcastRotation(provider, newKey, oldKey) {
    try {
        const windows = BrowserWindow.getAllWindows();
        const payload = {
            provider,
            from: { id: oldKey.id, label: oldKey.label || 'Unnamed' },
            to: { id: newKey.id, label: newKey.label || 'Unnamed' },
        };
        for (const w of windows) {
            w.webContents.send('api-keys:rotated', payload);
        }
    } catch (err) {
        console.error('Failed to broadcast rotation:', err.message);
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
    // Validate immediately in background — don't block
    setImmediate(() => {
        revalidateKey(provider, result.id, true).catch(err => {
            console.error('Initial validation failed:', err);
        });
    });
    broadcastUpdate(provider);
    return result;
}

function removeKey(provider, id) {
    _validating.delete(`${provider}:${id}`);
    const result = storage.removeProviderKey(provider, id);
    if (result.ok) broadcastUpdate(provider);
    return result;
}

/**
 * Validate a single key and update its state.
 * forceRevalidate=true bypasses the active-cooldown skip (used for manual "Test" button).
 */
async function revalidateKey(provider, id, forceRevalidate = false) {
    const lockKey = `${provider}:${id}`;

    // Don't double-probe
    if (_validating.has(lockKey)) {
        return { ok: true, skipped: true, reason: 'Already validating' };
    }

    const raw = storage.getProviderKeyRaw(provider, id);
    if (!raw) return { ok: false, error: 'Key not found' };

    const now = Date.now();

    // If exhausted and cooldown still active — skip unless forced
    if (!forceRevalidate && raw.state === 'exhausted' && raw.exhaustedUntil && raw.exhaustedUntil > now) {
        return { ok: true, skipped: true, reason: 'Cooldown active' };
    }

    // Mark as checking in storage immediately so UI shows it
    storage.updateProviderKey(provider, id, { state: 'checking', lastCheckedAt: now });
    broadcastUpdate(provider);

    _validating.add(lockKey);
    try {
        const verdict = await probeKey(provider, raw.key);

        // IMPORTANT: The probe only tests auth (401/403) and basic connectivity.
        // It CANNOT detect quota/rate-limit exhaustion — the /models endpoint always returns 200
        // for quota-exhausted keys because listing models doesn't consume quota.
        // Therefore: a 'ready' verdict from probe means "auth is valid" ONLY.
        // We must NEVER overwrite an existing 'exhausted' state with 'ready' from the probe,
        // because the exhaustion was set by an actual API call failure (the real signal).
        if (verdict.state === 'ready') {
            const current = storage.getProviderKeyRaw(provider, id);
            if (current?.state === 'exhausted' && current?.exhaustedUntil && current.exhaustedUntil > Date.now()) {
                // Key is exhausted by real usage — probe says auth is fine but quota is gone.
                // Leave as exhausted, just update lastCheckedAt.
                storage.updateProviderKey(provider, id, {
                    lastCheckedAt: Date.now(),
                    errorReason: 'Auth valid, but quota may still be exhausted',
                });
            } else {
                // Key was not exhausted, or cooldown has elapsed — mark ready.
                storage.markProviderKeyState(provider, id, 'ready', { errorReason: null });
            }
        } else if (verdict.state === 'exhausted') {
            storage.markProviderKeyState(provider, id, 'exhausted', { errorReason: verdict.reason });
        } else if (verdict.state === 'invalid') {
            storage.markProviderKeyState(provider, id, 'invalid', { errorReason: verdict.reason });
        } else {
            // null state = transient/timeout — restore state, don't mark ready or invalid
            const current = storage.getProviderKeyRaw(provider, id);
            const restoreState = current?.state === 'checking' ? 'unknown' : current?.state || 'unknown';
            storage.updateProviderKey(provider, id, {
                state: restoreState,
                lastCheckedAt: Date.now(),
                errorReason: verdict.reason,
            });
        }
    } finally {
        _validating.delete(lockKey);
    }

    broadcastUpdate(provider);
    return { ok: true };
}

async function revalidateAll(provider) {
    const keys = storage.listAllProviderKeysRaw(provider);
    await Promise.allSettled(keys.map(k => revalidateKey(provider, k.id, true)));
    return { ok: true, count: keys.length };
}

async function revalidateAllProviders() {
    await Promise.allSettled(storage.API_KEY_PROVIDERS.map(p => revalidateAll(p)));
}

/**
 * Sweep: revalidate keys that need attention.
 * - 'unknown' / 'checking' (stuck): validate now
 * - 'exhausted' with expired cooldown: force-revalidate
 * - 'invalid' older than 24h: retry
 */
async function revalidateStale() {
    const now = Date.now();
    for (const provider of storage.API_KEY_PROVIDERS) {
        const keys = storage.listAllProviderKeysRaw(provider);
        for (const k of keys) {
            let shouldRetry = false;

            if (k.state === 'unknown') {
                shouldRetry = true;
            } else if (k.state === 'checking') {
                // Stuck in checking state — something crashed, reset and retry
                storage.updateProviderKey(provider, k.id, { state: 'unknown' });
                _validating.delete(`${provider}:${k.id}`);
                shouldRetry = true;
            } else if (k.state === 'exhausted' && k.exhaustedUntil && k.exhaustedUntil <= now) {
                shouldRetry = true;
            } else if (k.state === 'invalid' && k.lastCheckedAt && now - k.lastCheckedAt > storage.EXHAUSTION_COOLDOWN_MS) {
                shouldRetry = true;
            }

            if (shouldRetry) {
                // Fire and forget — parallel validation, non-blocking
                revalidateKey(provider, k.id, true).catch(e => {
                    console.error(`Stale revalidation failed for ${provider}/${k.id}:`, e.message);
                });
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────
// Key rotation for actual API calls
// ──────────────────────────────────────────────────────────────

/**
 * Run fn(key, entry) with each READY key.
 * Only state === 'ready' keys are tried. 'unknown', 'checking', 'exhausted', 'invalid' are skipped.
 * On 401/403 → mark invalid, try next. On 429 → mark exhausted, try next. Transient → rethrow.
 */
async function withKeyRotation(provider, fn) {
    // ONLY use explicitly 'ready' keys — never 'unknown' or 'checking'
    const candidates = storage.listReadyProviderKeys(provider);
    if (candidates.length === 0) {
        const err = new Error(`No ready ${provider} API key available`);
        err.code = 'NO_READY_KEY';
        throw err;
    }

    let lastError = null;
    let attemptIndex = 0;
    for (const entry of candidates) {
        try {
            const result = await fn(entry.key, entry);
            if (attemptIndex > 0) {
                broadcastRotation(provider, entry, candidates[0]);
            }
            return result;
        } catch (err) {
            lastError = err;
            const verdict = classifyError(err);
            if (verdict === 'invalid') {
                storage.markProviderKeyState(provider, entry.id, 'invalid', { errorReason: err.message });
                broadcastUpdate(provider);
                attemptIndex++;
                continue;
            }
            if (verdict === 'exhausted') {
                storage.markProviderKeyState(provider, entry.id, 'exhausted', { errorReason: err.message });
                broadcastUpdate(provider);
                attemptIndex++;
                continue;
            }
            throw err;
        }
    }

    const err = new Error(`All ${provider} API keys exhausted or invalid`);
    err.code = 'ALL_KEYS_UNAVAILABLE';
    err.cause = lastError;
    throw err;
}

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

function handleKeyFailure(provider, keyId, statusCode, errorText = '') {
    let state = 'transient';
    if (statusCode === 401 || statusCode === 403) state = 'invalid';
    else if (statusCode === 429) state = 'exhausted';
    else if (statusCode === 400 && /quota|rate[_ ]?limit|exhausted/i.test(errorText)) state = 'exhausted';

    if (state === 'invalid') {
        storage.markProviderKeyState(provider, keyId, 'invalid', { errorReason: `HTTP ${statusCode}` });
        broadcastUpdate(provider);
    } else if (state === 'exhausted') {
        storage.markProviderKeyState(provider, keyId, 'exhausted', { errorReason: `HTTP ${statusCode}` });
        broadcastUpdate(provider);
    }
    return state;
}

// ──────────────────────────────────────────────────────────────
// Lifecycle
// ──────────────────────────────────────────────────────────────

function startBackgroundValidation() {
    setImmediate(() => {
        revalidateAllProviders().catch(err => {
            console.error('Startup key validation failed:', err);
        });
    });

    if (_revalidationInterval) clearInterval(_revalidationInterval);
    _revalidationInterval = setInterval(() => {
        revalidateStale().catch(err => {
            console.error('Scheduled revalidation failed:', err);
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
    listKeys,
    addKey,
    removeKey,
    revalidateKey,
    revalidateAll,
    revalidateAllProviders,
    revalidateStale,
    withKeyRotation,
    classifyError,
    classifyFetchResponse,
    handleResponseStatus,
    handleKeyFailure,
    startBackgroundValidation,
    stopBackgroundValidation,
    broadcastUpdate,
    broadcastRotation,
};
