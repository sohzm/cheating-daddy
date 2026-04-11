const fs = require('fs');
const path = require('path');
const os = require('os');
const { app, safeStorage } = require('electron');

const CONFIG_VERSION = 2;

const DEFAULT_CONFIG = {
    configVersion: CONFIG_VERSION,
    onboarded: false,
    layout: 'normal',
};

const DEFAULT_CREDENTIALS = {
    apiKey: '',
    groqApiKey: '',
    cloudToken: '',
    openaiKey: '',
};

const DEFAULT_PREFERENCES = {
    customPrompt: '',
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
    providerMode: 'cloud',
    theme: 'dark',
};

const DEFAULT_KEYBINDS = null;

const DEFAULT_LIMITS = {
    data: [],
};

function getLegacyConfigDir() {
    const platform = os.platform();

    if (platform === 'win32') {
        return path.join(os.homedir(), 'AppData', 'Roaming', 'cheating-daddy-config');
    }
    if (platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'cheating-daddy-config');
    }
    return path.join(os.homedir(), '.config', 'cheating-daddy-config');
}

function getConfigDir() {
    return path.join(app.getPath('userData'), 'storage');
}

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

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

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

function writeJsonFile(filePath, data) {
    try {
        ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error.message);
        return false;
    }
}

function encryptString(value) {
    if (safeStorage.isEncryptionAvailable()) {
        return {
            encrypted: true,
            data: safeStorage.encryptString(value).toString('base64'),
        };
    }

    return {
        encrypted: false,
        data: value,
    };
}

function decryptString(payload) {
    if (!payload || typeof payload !== 'object' || typeof payload.data !== 'string') {
        return '';
    }

    if (!payload.encrypted) {
        return payload.data;
    }

    try {
        if (safeStorage.isEncryptionAvailable()) {
            return safeStorage.decryptString(Buffer.from(payload.data, 'base64'));
        }
    } catch (error) {
        console.warn('Failed to decrypt credential payload:', error.message);
    }

    return '';
}

function normalizeCredentials(credentials) {
    return { ...DEFAULT_CREDENTIALS, ...(credentials || {}) };
}

function readCredentialsFile() {
    const fallback = { ...DEFAULT_CREDENTIALS };

    try {
        if (!fs.existsSync(getCredentialsPath())) {
            return fallback;
        }

        const raw = JSON.parse(fs.readFileSync(getCredentialsPath(), 'utf8'));

        if (raw && raw.schemaVersion === 2) {
            return {
                apiKey: decryptString(raw.apiKey),
                groqApiKey: decryptString(raw.groqApiKey),
                cloudToken: decryptString(raw.cloudToken),
                openaiKey: decryptString(raw.openaiKey),
            };
        }

        return normalizeCredentials(raw);
    } catch (error) {
        console.warn(`Error reading credentials ${getCredentialsPath()}:`, error.message);
        return fallback;
    }
}

function writeCredentialsFile(credentials) {
    const normalized = normalizeCredentials(credentials);

    return writeJsonFile(getCredentialsPath(), {
        schemaVersion: 2,
        apiKey: encryptString(normalized.apiKey),
        groqApiKey: encryptString(normalized.groqApiKey),
        cloudToken: encryptString(normalized.cloudToken),
        openaiKey: encryptString(normalized.openaiKey),
    });
}

function ensureDefaultFile(filePath, defaultValue, readFn = readJsonFile, writeFn = writeJsonFile) {
    const current = readFn(filePath, null);
    if (current === null || current === undefined) {
        writeFn(filePath, defaultValue);
        return defaultValue;
    }
    return current;
}

function migrateLegacyStorage() {
    const legacyDir = getLegacyConfigDir();
    const configDir = getConfigDir();

    if (!fs.existsSync(legacyDir) || fs.existsSync(configDir)) {
        return;
    }

    console.log('Migrating legacy storage to userData...');
    fs.cpSync(legacyDir, configDir, { recursive: true });
}

function initializeStorage() {
    migrateLegacyStorage();

    ensureDir(getConfigDir());
    ensureDir(getHistoryDir());

    const config = ensureDefaultFile(getConfigPath(), DEFAULT_CONFIG);
    const updatedConfig = { ...DEFAULT_CONFIG, ...(config || {}), configVersion: CONFIG_VERSION };
    writeJsonFile(getConfigPath(), updatedConfig);

    const credentials = readCredentialsFile();
    writeCredentialsFile(credentials);

    const preferences = { ...DEFAULT_PREFERENCES, ...readJsonFile(getPreferencesPath(), {}) };
    writeJsonFile(getPreferencesPath(), preferences);

    if (!fs.existsSync(getKeybindsPath())) {
        writeJsonFile(getKeybindsPath(), DEFAULT_KEYBINDS);
    }

    const limits = readJsonFile(getLimitsPath(), DEFAULT_LIMITS);
    writeJsonFile(getLimitsPath(), limits);
}

function getConfig() {
    return readJsonFile(getConfigPath(), DEFAULT_CONFIG);
}

function setConfig(config) {
    const current = getConfig();
    return writeJsonFile(getConfigPath(), { ...current, ...config, configVersion: CONFIG_VERSION });
}

function updateConfig(key, value) {
    const config = getConfig();
    config[key] = value;
    config.configVersion = CONFIG_VERSION;
    return writeJsonFile(getConfigPath(), config);
}

function getCredentials() {
    return readCredentialsFile();
}

function setCredentials(credentials) {
    const current = getCredentials();
    return writeCredentialsFile({ ...current, ...credentials });
}

function getApiKey() {
    return getCredentials().apiKey || '';
}

function setApiKey(apiKey) {
    return setCredentials({ apiKey });
}

function getGroqApiKey() {
    return getCredentials().groqApiKey || '';
}

function setGroqApiKey(groqApiKey) {
    return setCredentials({ groqApiKey });
}

function getPreferences() {
    return { ...DEFAULT_PREFERENCES, ...readJsonFile(getPreferencesPath(), {}) };
}

function setPreferences(preferences) {
    const current = getPreferences();
    return writeJsonFile(getPreferencesPath(), { ...current, ...preferences });
}

function updatePreference(key, value) {
    const preferences = getPreferences();
    preferences[key] = value;
    return writeJsonFile(getPreferencesPath(), preferences);
}

function getKeybinds() {
    return readJsonFile(getKeybindsPath(), DEFAULT_KEYBINDS);
}

function setKeybinds(keybinds) {
    return writeJsonFile(getKeybindsPath(), keybinds);
}

function getLimits() {
    return readJsonFile(getLimitsPath(), DEFAULT_LIMITS);
}

function setLimits(limits) {
    return writeJsonFile(getLimitsPath(), limits);
}

function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

function getTodayLimits() {
    const limits = getLimits();
    const today = getTodayDateString();
    const todayEntry = limits.data.find(entry => entry.date === today);

    if (todayEntry) {
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
    let todayEntry = limits.data.find(entry => entry.date === today);

    if (!todayEntry) {
        limits.data = [];
        todayEntry = {
            date: today,
            flash: { count: 0 },
            flashLite: { count: 0 },
        };
        limits.data.push(todayEntry);
    } else {
        limits.data = limits.data.filter(entry => entry.date === today);
    }

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
    const todayEntry = limits.data.find(entry => entry.date === getTodayDateString());

    if (todayEntry?.[provider]?.[model]) {
        todayEntry[provider][model].chars += charCount;
        setLimits(limits);
    }

    return todayEntry;
}

function getAvailableModel() {
    const todayLimits = getTodayLimits();

    if (todayLimits.flash.count < 20) {
        return 'gemini-2.5-flash';
    }
    if (todayLimits.flashLite.count < 20) {
        return 'gemini-2.5-flash-lite';
    }

    return 'gemini-2.5-flash';
}

function getModelForToday() {
    const groq = getTodayLimits().groq;

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

    return null;
}

function getSessionPath(sessionId) {
    return path.join(getHistoryDir(), `${sessionId}.json`);
}

function saveSession(sessionId, data) {
    const sessionPath = getSessionPath(sessionId);
    const existingSession = readJsonFile(sessionPath, null);

    return writeJsonFile(sessionPath, {
        sessionId,
        createdAt: existingSession?.createdAt || parseInt(sessionId, 10),
        lastUpdated: Date.now(),
        profile: data.profile || existingSession?.profile || null,
        customPrompt: data.customPrompt || existingSession?.customPrompt || null,
        conversationHistory: data.conversationHistory || existingSession?.conversationHistory || [],
        screenAnalysisHistory: data.screenAnalysisHistory || existingSession?.screenAnalysisHistory || [],
    });
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

        return fs
            .readdirSync(historyDir)
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => parseInt(b.replace('.json', ''), 10) - parseInt(a.replace('.json', ''), 10))
            .map(file => {
                const sessionId = file.replace('.json', '');
                const data = readJsonFile(path.join(historyDir, file), null);

                if (!data) {
                    return null;
                }

                return {
                    sessionId,
                    createdAt: data.createdAt,
                    lastUpdated: data.lastUpdated,
                    messageCount: data.conversationHistory?.length || 0,
                    screenAnalysisCount: data.screenAnalysisHistory?.length || 0,
                    profile: data.profile || null,
                    customPrompt: data.customPrompt || null,
                };
            })
            .filter(Boolean);
    } catch (error) {
        console.error('Error reading sessions:', error.message);
        return [];
    }
}

function deleteSession(sessionId) {
    try {
        const sessionPath = getSessionPath(sessionId);
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
            fs.readdirSync(historyDir)
                .filter(file => file.endsWith('.json'))
                .forEach(file => {
                    fs.unlinkSync(path.join(historyDir, file));
                });
        }
        return true;
    } catch (error) {
        console.error('Error deleting all sessions:', error.message);
        return false;
    }
}

function clearAllData() {
    try {
        if (fs.existsSync(getConfigDir())) {
            fs.rmSync(getConfigDir(), { recursive: true, force: true });
        }
        initializeStorage();
        return true;
    } catch (error) {
        console.error('Error clearing local data:', error.message);
        return false;
    }
}

module.exports = {
    initializeStorage,
    getConfigDir,
    getConfig,
    setConfig,
    updateConfig,
    getCredentials,
    setCredentials,
    getApiKey,
    setApiKey,
    getGroqApiKey,
    setGroqApiKey,
    getPreferences,
    setPreferences,
    updatePreference,
    getKeybinds,
    setKeybinds,
    getLimits,
    setLimits,
    getTodayLimits,
    incrementLimitCount,
    getAvailableModel,
    incrementCharUsage,
    getModelForToday,
    saveSession,
    getSession,
    getAllSessions,
    deleteSession,
    deleteAllSessions,
    clearAllData,
};
