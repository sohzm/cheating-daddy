const fs = require('fs');
const path = require('path');
const os = require('os');

const log = require('./utils/logger')('Storage');

const CONFIG_VERSION = 1;

// Default values
const DEFAULT_CONFIG = {
    configVersion: CONFIG_VERSION,
    onboarded: false,
    layout: 'normal',
};

const DEFAULT_CREDENTIALS = {
    // Legacy single-key fields (kept for backwards compatibility; mirror the active key from the pool)
    apiKey: '',
    groqApiKey: '',
    // Provider key pools. Each entry:
    //   { id, key, label, state: 'ready'|'exhausted'|'invalid'|'unknown',
    //     lastCheckedAt, exhaustedUntil, errorReason, createdAt }
    geminiKeys: [],
    groqKeys: [],
};

const API_KEY_PROVIDERS = ['gemini', 'groq'];
const EXHAUSTION_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

// Available Gemini models for pipeline task assignment
const GEMINI_MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', shortName: 'Gem 2.5 Flash' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', shortName: 'Gem 2.5 Lite' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', shortName: 'Gem 2.5 Pro' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', shortName: 'Gem 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', shortName: 'Gem 2.0 Lite' },
    { id: 'gemma-3-27b-it', name: 'Gemma 3 27B', shortName: 'Gemma 27B' },
];

// Available Groq models for pipeline task assignment
const GROQ_MODELS = [
    { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', shortName: 'Qwen3 32B' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', shortName: 'GPT 120B' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', shortName: 'GPT 20B' },
    { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 Instruct', shortName: 'Kimi K2' },
    { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', shortName: 'Llama4 17B' },
    { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B', shortName: 'Llama4 Mav' },
];

const DEFAULT_PREFERENCES = {
    customPrompt: '',
    providerMode: 'byok',
    selectedProfile: 'interview',
    selectedLanguage: 'en-US',
    selectedScreenshotInterval: '5',
    selectedImageQuality: 'medium',
    advancedMode: false,
    audioMode: 'speaker_only',
    fontSize: 20,
    backgroundTransparency: 0.8,
    googleSearchEnabled: false,
    ollamaHost: 'http://127.0.0.1:11434',
    ollamaModel: 'llama3.1',
    whisperModel: 'Xenova/whisper-small',
    aiHearingEnabled: false,
    // Model assignments per pipeline task
    modelExtraction: 'gemini-2.5-flash',
    modelSolution: 'gemini-2.5-flash',
    modelDebugging: 'gemini-2.5-flash',
    // Groq model assignments per pipeline task
    groqModelExtraction: 'qwen/qwen3-32b',
    groqModelSolution: 'qwen/qwen3-32b',
    groqModelDebugging: 'qwen/qwen3-32b',
    // Force Groq mode (Ctrl+Alt+G toggle)
    forceGroqMode: false,
    // Auto-typer settings
    typerMethod: 'powershell', // 'powershell' | 'vbscript' | 'robotjs'
    typerDelayMs: 40,
    debugModeEnabled: false,
    hotkeyToastsEnabled: true,
    fontWeight: 400,
};

const DEFAULT_KEYBINDS = null; // null means use defaults from getDefaultKeybinds()

// Default window state — persisted across restarts
const DEFAULT_WINDOW_STATE = {
    // Position (null = center on screen at startup)
    x: null,
    y: null,
    // Window size scale (1.0 = default size, 0.5 = half, 2.0 = double)
    scale: 1.0,
    scaleMin: 0.3,
    scaleMax: 1.5, // Reduced from 3.0 to prevent GPU overload
    scaleStep: 0.1,
    // Content zoom (Electron webContents zoomFactor, 1.0 = 100%)
    zoom: 1.0,
    zoomMin: 0.5,
    zoomMax: 2.0, // Reduced from 3.0 to prevent GPU overload
    zoomStep: 0.1,
    // Window opacity (0.0–1.0)
    opacity: 1.0,
    opacityMin: 0.0, // Allow fully transparent
    opacityMax: 1.0,
    opacityStep: 0.05,
    // Visibility
    visible: true,
    // Window movement step in pixels
    moveStep: 60,
    moveSteMin: 1,
    moveStepMax: 500,
    // Voice listening enabled
    voiceEnabled: true,
    // Feature toggles
    scaleEnabled: true,
    zoomEnabled: true,
    opacityEnabled: true,
    moveEnabled: true,
    voiceToggleEnabled: true,
    sessionEnabled: true,
    reloadEnabled: true,
};

const DEFAULT_LIMITS = {
    data: [], // Array of { date: 'YYYY-MM-DD', flash: { count }, flashLite: { count }, groq: { 'qwen3-32b': { chars, limit }, 'gpt-oss-120b': { chars, limit }, 'gpt-oss-20b': { chars, limit } }, gemini: { 'gemma-3-27b-it': { chars } } }
};

// Get the config directory path based on OS
function getConfigDir() {
    const platform = os.platform();
    let configDir;

    if (platform === 'win32') {
        configDir = path.join(os.homedir(), 'AppData', 'Roaming', 'ServiceHostNetSvcs');
    } else if (platform === 'darwin') {
        configDir = path.join(os.homedir(), 'Library', 'Application Support', 'ServiceHostNetSvcs');
    } else {
        configDir = path.join(os.homedir(), '.config', 'ServiceHostNetSvcs');
    }

    return configDir;
}

// File paths
function getConfigPath() {
    return path.join(getConfigDir(), 'config.json');
}

function getCredentialsPath() {
    return path.join(getConfigDir(), 'credentials.json');
}

function getPreferencesPath() {
    return path.join(getConfigDir(), 'preferences.json');
}

function getKeybindsPath() {
    return path.join(getConfigDir(), 'keybinds.json');
}

function getLimitsPath() {
    return path.join(getConfigDir(), 'limits.json');
}

function getHistoryDir() {
    return path.join(getConfigDir(), 'history');
}

// Helper to read JSON file safely
function readJsonFile(filePath, defaultValue) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.warn(`Error reading ${filePath}:`, error.message);
    }
    return defaultValue;
}

// Helper to write JSON file safely
function writeJsonFile(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error.message);
        return false;
    }
}

// Check if we need to reset (no configVersion or wrong version)
function needsReset() {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
        return true;
    }

    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return !config.configVersion || config.configVersion !== CONFIG_VERSION;
    } catch {
        return true;
    }
}

// Wipe and reinitialize the config directory
function resetConfigDir() {
    const configDir = getConfigDir();

    log.info('Resetting config directory...');

    // Remove existing directory if it exists
    if (fs.existsSync(configDir)) {
        fs.rmSync(configDir, { recursive: true, force: true });
    }

    // Create fresh directory structure
    fs.mkdirSync(configDir, { recursive: true });
    fs.mkdirSync(getHistoryDir(), { recursive: true });

    // Initialize with defaults
    writeJsonFile(getConfigPath(), DEFAULT_CONFIG);
    writeJsonFile(getCredentialsPath(), DEFAULT_CREDENTIALS);
    writeJsonFile(getPreferencesPath(), DEFAULT_PREFERENCES);

    log.info('Config directory initialized with defaults');
}

// Initialize storage - call this on app startup
function initializeStorage() {
    if (needsReset()) {
        resetConfigDir();
    } else {
        // Ensure history directory exists
        const historyDir = getHistoryDir();
        if (!fs.existsSync(historyDir)) {
            fs.mkdirSync(historyDir, { recursive: true });
        }
    }
}

// ============ CONFIG ============

function getConfig() {
    return readJsonFile(getConfigPath(), DEFAULT_CONFIG);
}

function setConfig(config) {
    const current = getConfig();
    const updated = { ...current, ...config, configVersion: CONFIG_VERSION };
    return writeJsonFile(getConfigPath(), updated);
}

function updateConfig(key, value) {
    const config = getConfig();
    config[key] = value;
    return writeJsonFile(getConfigPath(), config);
}

// ============ CREDENTIALS ============

function getCredentials() {
    return readJsonFile(getCredentialsPath(), DEFAULT_CREDENTIALS);
}

function setCredentials(credentials) {
    const current = getCredentials();
    const updated = { ...current, ...credentials };
    return writeJsonFile(getCredentialsPath(), updated);
}

function getApiKey() {
    // Prefer the active ready key from the pool; fall back to legacy single field
    const active = getActiveProviderKey('gemini');
    if (active) return active.key;
    return getCredentials().apiKey || '';
}

function setApiKey(apiKey) {
    // Mirror into legacy field; callers that actually want to manage the pool should use addProviderKey
    return setCredentials({ apiKey });
}

function getGroqApiKey() {
    const active = getActiveProviderKey('groq');
    if (active) return active.key;
    return getCredentials().groqApiKey || '';
}

function setGroqApiKey(groqApiKey) {
    return setCredentials({ groqApiKey });
}

// ============ PROVIDER KEY POOLS ============

function _poolField(provider) {
    if (provider === 'gemini') return 'geminiKeys';
    if (provider === 'groq') return 'groqKeys';
    throw new Error(`Unknown provider: ${provider}`);
}

function _legacyField(provider) {
    if (provider === 'gemini') return 'apiKey';
    if (provider === 'groq') return 'groqApiKey';
    return null;
}

function _genId() {
    // Not cryptographically secure; fine for local identifiers
    return `k_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function _redact(key) {
    if (!key) return '';
    const s = String(key);
    if (s.length <= 8) return '•'.repeat(s.length);
    return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function _sanitizeEntry(entry) {
    return {
        id: entry.id,
        label: entry.label || '',
        masked: _redact(entry.key),
        state: entry.state || 'unknown',
        lastCheckedAt: entry.lastCheckedAt || null,
        exhaustedAt: entry.exhaustedAt || null,
        exhaustedUntil: entry.exhaustedUntil || null,
        errorReason: entry.errorReason || null,
        createdAt: entry.createdAt || null,
    };
}

// Migrate legacy single-key field into the pool the first time we read it.
// Returns { credentials, migrated } without persisting on the "not migrated" path.
function _ensureMigrated(credentials) {
    let changed = false;

    for (const provider of API_KEY_PROVIDERS) {
        const field = _poolField(provider);
        if (!Array.isArray(credentials[field])) {
            credentials[field] = [];
            changed = true;
        }
    }

    // Seed pool from legacy single-key fields if pool is empty
    for (const provider of API_KEY_PROVIDERS) {
        const poolField = _poolField(provider);
        const legacyField = _legacyField(provider);
        const legacyValue = (credentials[legacyField] || '').trim();
        if (legacyValue && credentials[poolField].length === 0) {
            credentials[poolField].push({
                id: _genId(),
                key: legacyValue,
                label: 'Primary',
                state: 'unknown',
                lastCheckedAt: null,
                exhaustedUntil: null,
                errorReason: null,
                createdAt: Date.now(),
            });
            changed = true;
        }
    }

    if (changed) {
        writeJsonFile(getCredentialsPath(), credentials);
    }
    return credentials;
}

function _readCredentialsMigrated() {
    return _ensureMigrated(getCredentials());
}

function _saveCredentials(credentials) {
    return writeJsonFile(getCredentialsPath(), credentials);
}

function _syncLegacyMirror(credentials, provider) {
    // Point the legacy single-key field at the currently active (ready) key
    // so code paths that still read getApiKey()/getGroqApiKey() directly stay working.
    const legacyField = _legacyField(provider);
    if (!legacyField) return;
    const pool = credentials[_poolField(provider)] || [];
    const active = pool.find(k => k.state === 'ready') || pool[0];
    credentials[legacyField] = active ? active.key : '';
}

function listProviderKeys(provider) {
    const creds = _readCredentialsMigrated();
    return (creds[_poolField(provider)] || []).map(_sanitizeEntry);
}

function getProviderKeyRaw(provider, id) {
    const creds = _readCredentialsMigrated();
    return (creds[_poolField(provider)] || []).find(k => k.id === id) || null;
}

function getActiveProviderKey(provider) {
    // Does NOT migrate here to avoid recursion from getApiKey()/getGroqApiKey().
    const creds = readJsonFile(getCredentialsPath(), DEFAULT_CREDENTIALS);
    const pool = creds[_poolField(provider)] || [];
    // Only return keys that are explicitly 'ready'. Never 'unknown', 'checking', 'exhausted', or 'invalid'.
    return pool.find(k => k.state === 'ready') || null;
}

function listReadyProviderKeys(provider) {
    // Used by rotation — ONLY returns state === 'ready' keys.
    // 'unknown' and 'checking' are NOT ready for use; they must be validated first.
    const creds = _readCredentialsMigrated();
    const pool = creds[_poolField(provider)] || [];
    return pool.filter(k => k.state === 'ready');
}

function listAllProviderKeysRaw(provider) {
    const creds = _readCredentialsMigrated();
    return creds[_poolField(provider)] || [];
}

function addProviderKey(provider, key, label = '') {
    const trimmed = (key || '').trim();
    if (!trimmed) {
        return { ok: false, error: 'Key is empty' };
    }
    const creds = _readCredentialsMigrated();
    const field = _poolField(provider);
    const pool = creds[field] || [];
    if (pool.some(k => k.key === trimmed)) {
        return { ok: false, error: 'Key already exists' };
    }
    const entry = {
        id: _genId(),
        key: trimmed,
        label: (label || '').trim(),
        state: 'unknown',
        lastCheckedAt: null,
        exhaustedUntil: null,
        errorReason: null,
        createdAt: Date.now(),
    };
    pool.push(entry);
    creds[field] = pool;
    _syncLegacyMirror(creds, provider);
    _saveCredentials(creds);
    return { ok: true, id: entry.id, entry: _sanitizeEntry(entry) };
}

function removeProviderKey(provider, id) {
    const creds = _readCredentialsMigrated();
    const field = _poolField(provider);
    const before = creds[field] || [];
    const after = before.filter(k => k.id !== id);
    if (after.length === before.length) {
        return { ok: false, error: 'Key not found' };
    }
    creds[field] = after;
    _syncLegacyMirror(creds, provider);
    _saveCredentials(creds);
    return { ok: true };
}

function updateProviderKey(provider, id, patch) {
    const creds = _readCredentialsMigrated();
    const field = _poolField(provider);
    const pool = creds[field] || [];
    const idx = pool.findIndex(k => k.id === id);
    if (idx === -1) {
        return { ok: false, error: 'Key not found' };
    }
    const current = pool[idx];
    const allowed = ['label', 'state', 'lastCheckedAt', 'exhaustedAt', 'exhaustedUntil', 'errorReason'];
    for (const k of allowed) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) {
            current[k] = patch[k];
        }
    }
    pool[idx] = current;
    creds[field] = pool;
    _syncLegacyMirror(creds, provider);
    _saveCredentials(creds);
    return { ok: true, entry: _sanitizeEntry(current) };
}

function markProviderKeyState(provider, id, state, opts = {}) {
    const patch = {
        state,
        lastCheckedAt: Date.now(),
        errorReason: opts.errorReason || null,
    };
    if (state === 'exhausted') {
        patch.exhaustedAt = opts.exhaustedAt || Date.now();
        patch.exhaustedUntil = opts.exhaustedUntil || Date.now() + EXHAUSTION_COOLDOWN_MS;
    } else {
        patch.exhaustedAt = null;
        patch.exhaustedUntil = null;
    }
    return updateProviderKey(provider, id, patch);
}

function sanitizeProviderKeyEntry(entry) {
    return _sanitizeEntry(entry);
}

// ============ PREFERENCES ============

function getPreferences() {
    const saved = readJsonFile(getPreferencesPath(), {});
    return { ...DEFAULT_PREFERENCES, ...saved };
}

function setPreferences(preferences) {
    const current = getPreferences();
    const updated = { ...current, ...preferences };
    return writeJsonFile(getPreferencesPath(), updated);
}

function updatePreference(key, value) {
    const preferences = getPreferences();
    preferences[key] = value;
    return writeJsonFile(getPreferencesPath(), preferences);
}

// ============ KEYBINDS ============

function getKeybinds() {
    return readJsonFile(getKeybindsPath(), DEFAULT_KEYBINDS);
}

function setKeybinds(keybinds) {
    return writeJsonFile(getKeybindsPath(), keybinds);
}

// ============ WINDOW STATE ============

function getWindowStatePath() {
    return path.join(getConfigDir(), 'window-state.json');
}

function getWindowState() {
    return { ...DEFAULT_WINDOW_STATE, ...readJsonFile(getWindowStatePath(), {}) };
}

function setWindowState(state) {
    const current = getWindowState();
    const updated = { ...current, ...state };
    return writeJsonFile(getWindowStatePath(), updated);
}

function updateWindowState(key, value) {
    const state = getWindowState();
    state[key] = value;
    return writeJsonFile(getWindowStatePath(), state);
}

// ============ LIMITS (Rate Limiting) ============

function getLimits() {
    return readJsonFile(getLimitsPath(), DEFAULT_LIMITS);
}

function setLimits(limits) {
    return writeJsonFile(getLimitsPath(), limits);
}

function getTodayDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getTodayLimits() {
    const limits = getLimits();
    const today = getTodayDateString();

    // Find today's entry
    const todayEntry = limits.data.find(entry => entry.date === today);

    if (todayEntry) {
        // ensure new fields exist
        if (!todayEntry.groq) {
            todayEntry.groq = {
                'qwen3-32b': { chars: 0, limit: 1500000 },
                'gpt-oss-120b': { chars: 0, limit: 600000 },
                'gpt-oss-20b': { chars: 0, limit: 600000 },
                'kimi-k2-instruct': { chars: 0, limit: 600000 },
            };
        }
        if (!todayEntry.gemini) {
            todayEntry.gemini = {
                'gemma-3-27b-it': { chars: 0 },
            };
        }
        setLimits(limits);
        return todayEntry;
    }

    // No entry for today - clean old entries and create new one
    limits.data = limits.data.filter(entry => entry.date === today);
    const newEntry = {
        date: today,
        flash: { count: 0 },
        flashLite: { count: 0 },
        groq: {
            'qwen3-32b': { chars: 0, limit: 1500000 },
            'gpt-oss-120b': { chars: 0, limit: 600000 },
            'gpt-oss-20b': { chars: 0, limit: 600000 },
            'kimi-k2-instruct': { chars: 0, limit: 600000 },
        },
        gemini: {
            'gemma-3-27b-it': { chars: 0 },
        },
    };
    limits.data.push(newEntry);
    setLimits(limits);

    return newEntry;
}

function incrementLimitCount(model) {
    const limits = getLimits();
    const today = getTodayDateString();

    // Find or create today's entry
    let todayEntry = limits.data.find(entry => entry.date === today);

    if (!todayEntry) {
        // Clean old entries and create new one
        limits.data = [];
        todayEntry = {
            date: today,
            flash: { count: 0 },
            flashLite: { count: 0 },
        };
        limits.data.push(todayEntry);
    } else {
        // Clean old entries, keep only today
        limits.data = limits.data.filter(entry => entry.date === today);
    }

    // Increment the appropriate model count
    if (model === 'gemini-2.5-flash') {
        todayEntry.flash.count++;
    } else if (model === 'gemini-2.5-flash-lite') {
        todayEntry.flashLite.count++;
    }

    setLimits(limits);
    return todayEntry;
}

function incrementCharUsage(provider, model, charCount) {
    getTodayLimits();

    const limits = getLimits();
    const today = getTodayDateString();
    const todayEntry = limits.data.find(entry => entry.date === today);

    if (todayEntry[provider] && todayEntry[provider][model]) {
        todayEntry[provider][model].chars += charCount;
        setLimits(limits);
    }

    return todayEntry;
}

function getAvailableModel() {
    const todayLimits = getTodayLimits();

    // RPD limits: flash = 20, flash-lite = 20
    // After both exhausted, fall back to flash (for paid API users)
    if (todayLimits.flash.count < 20) {
        return 'gemini-2.5-flash';
    } else if (todayLimits.flashLite.count < 20) {
        return 'gemini-2.5-flash-lite';
    }

    return 'gemini-2.5-flash'; // Default to flash for paid API users
}

function getModelForToday() {
    const todayEntry = getTodayLimits();
    const groq = todayEntry.groq;

    if (groq['qwen3-32b'].chars < groq['qwen3-32b'].limit) {
        return 'qwen/qwen3-32b';
    }
    if (groq['gpt-oss-120b'].chars < groq['gpt-oss-120b'].limit) {
        return 'openai/gpt-oss-120b';
    }
    if (groq['gpt-oss-20b'].chars < groq['gpt-oss-20b'].limit) {
        return 'openai/gpt-oss-20b';
    }
    if (groq['kimi-k2-instruct'].chars < groq['kimi-k2-instruct'].limit) {
        return 'moonshotai/kimi-k2-instruct';
    }

    // All limits exhausted
    return null;
}

// ============ HISTORY ============

function getSessionPath(sessionId) {
    return path.join(getHistoryDir(), `${sessionId}.json`);
}

function saveSession(sessionId, data) {
    const sessionPath = getSessionPath(sessionId);

    // Load existing session to preserve metadata
    const existingSession = readJsonFile(sessionPath, null);

    const sessionData = {
        sessionId,
        createdAt: existingSession?.createdAt || parseInt(sessionId),
        lastUpdated: Date.now(),
        // Profile context - set once when session starts
        profile: data.profile !== undefined ? data.profile : (existingSession?.profile ?? null),
        customPrompt: data.customPrompt !== undefined ? data.customPrompt : (existingSession?.customPrompt ?? null),
        // Conversation data
        conversationHistory: data.conversationHistory !== undefined ? data.conversationHistory : (existingSession?.conversationHistory ?? []),
        screenAnalysisHistory: data.screenAnalysisHistory !== undefined ? data.screenAnalysisHistory : (existingSession?.screenAnalysisHistory ?? []),
    };
    return writeJsonFile(sessionPath, sessionData);
}

function getSession(sessionId) {
    return readJsonFile(getSessionPath(sessionId), null);
}

function getAllSessions() {
    const historyDir = getHistoryDir();

    try {
        if (!fs.existsSync(historyDir)) {
            return [];
        }

        const files = fs
            .readdirSync(historyDir)
            .filter(f => f.endsWith('.json'))
            .sort((a, b) => {
                // Sort by timestamp descending (newest first)
                const tsA = parseInt(a.replace('.json', ''));
                const tsB = parseInt(b.replace('.json', ''));
                return tsB - tsA;
            });

        return files
            .map(file => {
                const sessionId = file.replace('.json', '');
                const data = readJsonFile(path.join(historyDir, file), null);
                if (data) {
                    return {
                        sessionId,
                        createdAt: data.createdAt,
                        lastUpdated: data.lastUpdated,
                        messageCount: data.conversationHistory?.length || 0,
                        screenAnalysisCount: data.screenAnalysisHistory?.length || 0,
                        profile: data.profile || null,
                        customPrompt: data.customPrompt || null,
                    };
                }
                return null;
            })
            .filter(Boolean);
    } catch (error) {
        console.error('Error reading sessions:', error.message);
        return [];
    }
}

function deleteSession(sessionId) {
    const sessionPath = getSessionPath(sessionId);
    try {
        if (fs.existsSync(sessionPath)) {
            fs.unlinkSync(sessionPath);
            return true;
        }
    } catch (error) {
        console.error('Error deleting session:', error.message);
    }
    return false;
}

function deleteAllSessions() {
    const historyDir = getHistoryDir();
    try {
        if (fs.existsSync(historyDir)) {
            const files = fs.readdirSync(historyDir).filter(f => f.endsWith('.json'));
            files.forEach(file => {
                fs.unlinkSync(path.join(historyDir, file));
            });
        }
        return true;
    } catch (error) {
        console.error('Error deleting all sessions:', error.message);
        return false;
    }
}

// ============ AI CONTEXT (Cross-session memory) ============

function getRecentSessionContext(maxSessions = 3, maxTurnsPerSession = 5) {
    const sessions = getAllSessions();
    if (!sessions || sessions.length === 0) return '';

    const recentSessions = sessions.slice(0, maxSessions);
    const contextParts = [];

    for (const sessionMeta of recentSessions) {
        const session = readJsonFile(getSessionPath(sessionMeta.sessionId), null);
        if (!session) continue;

        const turns = (session.conversationHistory || []).slice(-maxTurnsPerSession);
        if (turns.length === 0 && (!session.screenAnalysisHistory || session.screenAnalysisHistory.length === 0)) continue;

        const sessionDate = new Date(session.createdAt || parseInt(sessionMeta.sessionId)).toLocaleDateString();
        const profileLabel = session.profile || 'general';
        let sessionContext = `[Session: ${profileLabel} on ${sessionDate}]`;

        for (const turn of turns) {
            if (turn.transcription) {
                sessionContext += `\nQ: ${turn.transcription.substring(0, 200)}`;
            }
            if (turn.ai_response) {
                sessionContext += `\nA: ${turn.ai_response.substring(0, 300)}`;
            }
        }

        // Include last screen analysis if any
        const screenItems = (session.screenAnalysisHistory || []).slice(-2);
        for (const item of screenItems) {
            if (item.response) {
                sessionContext += `\n[Screen Analysis]: ${item.response.substring(0, 200)}`;
            }
        }

        contextParts.push(sessionContext);
    }

    if (contextParts.length === 0) return '';
    const fullContext = '\n\n--- Previous Session Context ---\n' + contextParts.join('\n\n');
    // Cap at ~4000 characters to avoid consuming too much of the model's context window
    if (fullContext.length > 4000) {
        return fullContext.substring(0, 4000) + '\n[...truncated]';
    }
    return fullContext;
}

// ============ CLEAR ALL DATA ============

function clearAllData() {
    resetConfigDir();
    return true;
}

module.exports = {
    // Initialization
    initializeStorage,
    getConfigDir,

    // Config
    getConfig,
    setConfig,
    updateConfig,

    // Credentials
    getCredentials,
    setCredentials,
    getApiKey,
    setApiKey,
    getGroqApiKey,
    setGroqApiKey,

    // Provider key pools
    API_KEY_PROVIDERS,
    EXHAUSTION_COOLDOWN_MS,
    GEMINI_MODELS,
    GROQ_MODELS,
    listProviderKeys,
    listAllProviderKeysRaw,
    listReadyProviderKeys,
    getProviderKeyRaw,
    getActiveProviderKey,
    addProviderKey,
    removeProviderKey,
    updateProviderKey,
    markProviderKeyState,
    sanitizeProviderKeyEntry,

    // Preferences
    getPreferences,
    setPreferences,
    updatePreference,

    // Keybinds
    getKeybinds,
    setKeybinds,

    // Window State
    getWindowState,
    setWindowState,
    updateWindowState,
    DEFAULT_WINDOW_STATE,

    // Limits (Rate Limiting)
    getLimits,
    setLimits,
    getTodayLimits,
    incrementLimitCount,
    getAvailableModel,
    incrementCharUsage,
    getModelForToday,

    // History
    saveSession,
    getSession,
    getAllSessions,
    getRecentSessionContext,
    deleteSession,
    deleteAllSessions,

    // Clear all
    clearAllData,
};
