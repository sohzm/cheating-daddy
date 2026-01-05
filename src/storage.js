const fs = require('fs');
const path = require('path');
const os = require('os');
const { safeStorage } = require('electron');

const CONFIG_VERSION = 1;

// ============ ENCRYPTION HELPERS ============

/**
 * Check if encryption is available on this system.
 * safeStorage uses OS keychain (Windows Credential Manager, macOS Keychain, etc.)
 */
function isEncryptionAvailable() {
    try {
        return safeStorage.isEncryptionAvailable();
    } catch (error) {
        console.warn('safeStorage not available:', error.message);
        return false;
    }
}

/**
 * Encrypt a string using the OS keychain.
 * Returns a base64-encoded encrypted string.
 */
function encryptString(plaintext) {
    if (!plaintext) return '';
    if (!isEncryptionAvailable()) {
        console.warn('Encryption not available, storing in plain text');
        return plaintext;
    }
    try {
        const encrypted = safeStorage.encryptString(plaintext);
        return encrypted.toString('base64');
    } catch (error) {
        console.error('Encryption failed:', error.message);
        return plaintext; // Fallback to plain text
    }
}

/**
 * Decrypt a base64-encoded encrypted string.
 * Returns the original plaintext.
 */
function decryptString(encryptedBase64) {
    if (!encryptedBase64) return '';
    if (!isEncryptionAvailable()) {
        // If encryption isn't available, assume it's plain text
        return encryptedBase64;
    }
    try {
        const buffer = Buffer.from(encryptedBase64, 'base64');
        return safeStorage.decryptString(buffer);
    } catch (error) {
        // If decryption fails, it might be plain text from before encryption was enabled
        // Try to detect if it looks like a valid API key (not encrypted)
        if (isLikelyPlainTextApiKey(encryptedBase64)) {
            console.log('Detected plain text credential, will encrypt on next save');
            return encryptedBase64;
        }
        console.error('Decryption failed:', error.message);
        return '';
    }
}

/**
 * Heuristic to detect if a string looks like a plain text API key.
 * Encrypted data in base64 typically has different patterns than API keys.
 */
function isLikelyPlainTextApiKey(str) {
    if (!str || str.length === 0) return false;
    // Common API key patterns: alphanumeric with dashes/underscores, specific prefixes
    // Groq keys start with 'gsk_', Gemini keys are typically alphanumeric
    if (str.startsWith('gsk_')) return true;
    if (str.startsWith('AIza')) return true; // Google/Gemini keys often start with this
    // If it's short and mostly alphanumeric, likely a key
    if (str.length < 100 && /^[A-Za-z0-9_-]+$/.test(str)) return true;
    return false;
}

// Default values
const DEFAULT_CONFIG = {
    configVersion: CONFIG_VERSION,
    appVersion: null, // Will be set during initialization
    onboarded: false,
    layout: 'normal'
};

const DEFAULT_CREDENTIALS = {
    apiKey: '',  // Legacy - kept for backwards compatibility
    gemini: '',  // Gemini API key
    groq: '',    // Groq API key
    geminiPaid: false,  // Whether Gemini key has billing enabled
    groqPaid: false     // Whether Groq key has billing enabled
};

const DEFAULT_PREFERENCES = {
    customPrompt: '',
    selectedProfile: 'interview',
    selectedLanguage: 'en-US',
    selectedScreenshotInterval: '5',
    selectedImageQuality: 'medium',
    advancedMode: false,
    audioMode: 'speaker_only',
    fontSize: 'medium',
    backgroundTransparency: 0.8,
    responseViewMode: 'continuous',
    autoScroll: true,
    showSidebar: true, // Navigation slide
    googleSearchEnabled: false,
    // Conversation context for follow-up questions
    conversationContextEnabled: false,
    conversationContextCount: 2, // Number of recent Q&A pairs (1-5)
    // Audio processing mode (live vs audio-to-text)
    audioProcessingMode: 'audio-to-text',
    audioTriggerMethod: 'vad',

    // Multi-provider model preferences
    textMessage: {
        primaryProvider: 'groq',
        primaryModel: 'llama-3.3-70b-versatile',
        fallbackProvider: 'groq',
        fallbackModel: 'llama-3.1-8b-instant'
    },
    screenAnalysis: {
        primaryProvider: 'groq',
        primaryModel: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        fallbackProvider: 'groq',
        fallbackModel: 'meta-llama/llama-4-scout-17b-16e-instruct'
    },
    liveAudio: {
        provider: 'gemini',
        model: 'gemini-2.5-flash-native-audio-preview-12-2025'
    },
    audioToText: {
        primaryProvider: 'groq',
        primaryModel: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        fallbackProvider: 'groq',
        fallbackModel: 'meta-llama/llama-4-scout-17b-16e-instruct'
    }
};

const DEFAULT_KEYBINDS = null; // null means use system defaults

const DEFAULT_LIMITS = {
    data: [] // Array of { date: 'YYYY-MM-DD', flash: { count: 0 }, flashLite: { count: 0 } }
};

// Get the config directory path based on OS
function getConfigDir() {
    const platform = os.platform();
    let configDir;

    if (platform === 'win32') {
        configDir = path.join(os.homedir(), 'AppData', 'Roaming', 'cheating-daddy-config');
    } else if (platform === 'darwin') {
        configDir = path.join(os.homedir(), 'Library', 'Application Support', 'cheating-daddy-config');
    } else {
        configDir = path.join(os.homedir(), '.config', 'cheating-daddy-config');
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

function getUpdatePreferencesPath() {
    return path.join(getConfigDir(), 'updatePreferences.json');
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

    console.log('Resetting config directory...');

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

    console.log('Config directory initialized with defaults');
}

// Initialize storage - call this on app startup
// This only ensures the storage directory and files exist - it does NOT handle first-run detection.
// For first-run/upgrade detection, use checkFirstRunOrUpgrade() after this is called.
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

// Get the executable's creation timestamp (birthtime)
function getExecutableTimestamp() {
    try {
        const stats = fs.statSync(process.execPath);
        return stats.birthtimeMs;
    } catch (error) {
        console.warn('Could not get executable timestamp:', error);
        return null; // Fallback
    }
}

// Check if this is a first run or version upgrade
// This is the SINGLE SOURCE OF TRUTH for first-run/upgrade detection.
// first-run = no installId or no lastExeTimestamp
// upgrade = appVersion differs
// reinstall = same version but executor timestamp changed (new file)
function checkFirstRunOrUpgrade(currentVersion) {
    const config = getConfig();
    const previousVersion = config.appVersion;
    const installId = config.installId;
    const lastExeTimestamp = config.lastExeTimestamp;

    // Get current executable timestamp
    const currentExeTimestamp = getExecutableTimestamp();

    // Fresh install: no install ID present
    if (!installId) {
        return {
            isFirstRun: true,
            isUpgrade: false,
            isReinstall: false,
            previousVersion: null,
            currentVersion
        };
    }

    // TIMESTAMP CHECK: Detect same-version reinstalls
    if (currentExeTimestamp && lastExeTimestamp && currentExeTimestamp > lastExeTimestamp + 1000) {
        // If executable is newer than last recorded time (with 1s buffer), it's a reinstall/update
        console.log(`Detected binary update: ${lastExeTimestamp} -> ${currentExeTimestamp}`);
        return {
            isFirstRun: false,
            // If version matches, treat as "reinstall" (show dialog?), or "upgrade" if generic handling desired
            // The upgrade dialog handles both.
            isUpgrade: true, // Returning isUpgrade=true triggers the dialog
            isReinstall: true,
            previousVersion,
            currentVersion
        };
    }

    // Start handling normal version check

    // First run: no previous version stored
    if (!previousVersion) {
        return {
            isFirstRun: true,
            isUpgrade: false,
            isReinstall: false,
            previousVersion: null,
            currentVersion
        };
    }

    // Upgrade: previous version differs from current
    if (previousVersion !== currentVersion) {
        return {
            isFirstRun: false,
            isUpgrade: true,
            isReinstall: false,
            previousVersion,
            currentVersion
        };
    }

    // Same version and no binary change
    return {
        isFirstRun: false,
        isUpgrade: false,
        isReinstall: false,
        previousVersion,
        currentVersion
    };
}

// Generate a unique install ID
function generateInstallId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Mark that the user has completed the first-run/upgrade flow
function markVersionSeen(appVersion) {
    const config = getConfig();
    config.appVersion = appVersion;

    // Generate install ID if not present
    if (!config.installId) {
        config.installId = generateInstallId();
    }

    // Store current executable timestamp
    const exeTime = getExecutableTimestamp();
    if (exeTime) {
        config.lastExeTimestamp = exeTime;
    }

    writeJsonFile(getConfigPath(), config);
    console.log(`App version marked as seen: ${appVersion} (ExeTime: ${exeTime})`);
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

/**
 * Get credentials path for encrypted storage.
 * Uses .encrypted.json extension to distinguish from plain text.
 */
function getEncryptedCredentialsPath() {
    return path.join(getConfigDir(), 'credentials.encrypted.json');
}

/**
 * Internal: Read credentials without triggering migration.
 * Used by setCredentials to avoid recursive calls.
 */
function _readCredentialsRaw() {
    const encryptedPath = getEncryptedCredentialsPath();
    const plainPath = getCredentialsPath();

    // Check for encrypted credentials first
    if (fs.existsSync(encryptedPath)) {
        const encrypted = readJsonFile(encryptedPath, {});
        return {
            apiKey: decryptString(encrypted.apiKey || ''),
            gemini: decryptString(encrypted.gemini || ''),
            groq: decryptString(encrypted.groq || '')
        };
    }

    // Fall back to plain text credentials (legacy)
    if (fs.existsSync(plainPath)) {
        return readJsonFile(plainPath, DEFAULT_CREDENTIALS);
    }

    return DEFAULT_CREDENTIALS;
}

/**
 * Read and decrypt credentials.
 * Handles migration from plain text to encrypted format.
 */
function getCredentials() {
    const encryptedPath = getEncryptedCredentialsPath();
    const plainPath = getCredentialsPath();

    // Check for encrypted credentials first
    if (fs.existsSync(encryptedPath)) {
        const encrypted = readJsonFile(encryptedPath, {});
        return {
            apiKey: decryptString(encrypted.apiKey || ''),
            gemini: decryptString(encrypted.gemini || ''),
            groq: decryptString(encrypted.groq || ''),
            geminiPaid: encrypted.geminiPaid || false,
            groqPaid: encrypted.groqPaid || false
        };
    }

    // Fall back to plain text credentials (legacy)
    if (fs.existsSync(plainPath)) {
        const plain = readJsonFile(plainPath, DEFAULT_CREDENTIALS);
        // Migrate to encrypted format on first read (only if there are actual credentials)
        if (plain.apiKey || plain.gemini || plain.groq) {
            console.log('Migrating plain text credentials to encrypted storage...');
            // Write encrypted file directly (don't call setCredentials to avoid recursion)
            const encrypted = {
                apiKey: encryptString(plain.apiKey || ''),
                gemini: encryptString(plain.gemini || ''),
                groq: encryptString(plain.groq || '')
            };
            writeJsonFile(encryptedPath, encrypted);
            // Remove plain text file after successful migration
            try {
                fs.unlinkSync(plainPath);
                console.log('Plain text credentials file removed after migration');
            } catch (error) {
                console.warn('Could not remove plain text credentials file:', error.message);
            }
        }
        return plain;
    }

    return DEFAULT_CREDENTIALS;
}

/**
 * Encrypt and save credentials.
 */
function setCredentials(credentials) {
    // Use raw read to avoid triggering migration
    const current = _readCredentialsRaw();
    const merged = { ...current, ...credentials };

    // Encrypt each credential (paid status is not encrypted, just boolean)
    const encrypted = {
        apiKey: encryptString(merged.apiKey || ''),
        gemini: encryptString(merged.gemini || ''),
        groq: encryptString(merged.groq || ''),
        geminiPaid: merged.geminiPaid || false,
        groqPaid: merged.groqPaid || false
    };

    return writeJsonFile(getEncryptedCredentialsPath(), encrypted);
}

function getApiKey(provider = null) {
    const creds = getCredentials();
    if (provider === 'groq') {
        return creds.groq || '';
    } else if (provider === 'gemini') {
        return creds.gemini || creds.apiKey || ''; // Fallback to legacy apiKey
    }
    // Legacy: return gemini key by default
    return creds.gemini || creds.apiKey || '';
}

function setApiKey(apiKey, provider = null) {
    if (provider === 'groq') {
        return setCredentials({ groq: apiKey });
    } else if (provider === 'gemini') {
        return setCredentials({ gemini: apiKey, apiKey: apiKey }); // Also set legacy for compatibility
    }
    // Legacy
    return setCredentials({ apiKey, gemini: apiKey });
}

// Get paid status for a provider
function getPaidStatus(provider) {
    const creds = getCredentials();
    if (provider === 'groq') {
        return creds.groqPaid || false;
    } else if (provider === 'gemini') {
        return creds.geminiPaid || false;
    }
    return false;
}

// Set paid status for a provider
function setPaidStatus(provider, isPaid) {
    if (provider === 'groq') {
        return setCredentials({ groqPaid: isPaid });
    } else if (provider === 'gemini') {
        return setCredentials({ geminiPaid: isPaid });
    }
    return false;
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
        return todayEntry;
    }

    // No entry for today - clean old entries and create new one
    limits.data = limits.data.filter(entry => entry.date === today);
    const newEntry = {
        date: today,
        flash: { count: 0 },
        flashLite: { count: 0 }
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
            flashLite: { count: 0 }
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
    } else if (model === 'gemini-3-flash-preview') {
        // Track under flash for now (same limits)
        todayEntry.flash.count++;
    }

    setLimits(limits);
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
        profile: data.profile || existingSession?.profile || null,
        customPrompt: data.customPrompt || existingSession?.customPrompt || null,
        // Conversation data
        conversationHistory: data.conversationHistory || existingSession?.conversationHistory || [],
        screenAnalysisHistory: data.screenAnalysisHistory || existingSession?.screenAnalysisHistory || []
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

        const files = fs.readdirSync(historyDir)
            .filter(f => f.endsWith('.json'))
            .sort((a, b) => {
                // Sort by timestamp descending (newest first)
                const tsA = parseInt(a.replace('.json', ''));
                const tsB = parseInt(b.replace('.json', ''));
                return tsB - tsA;
            });

        return files.map(file => {
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
                    customPrompt: data.customPrompt || null
                };
            }
            return null;
        }).filter(Boolean);
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

// ============ CUSTOM PROFILES ============

function getCustomProfilesPath() {
    return path.join(getConfigDir(), 'customProfiles.json');
}

function getCustomProfiles() {
    return readJsonFile(getCustomProfilesPath(), []);
}

function setCustomProfiles(profiles) {
    return writeJsonFile(getCustomProfilesPath(), profiles);
}

function saveCustomProfile(profile) {
    const profiles = getCustomProfiles();
    const existingIndex = profiles.findIndex(p => p.id === profile.id);

    if (existingIndex >= 0) {
        profiles[existingIndex] = profile;
    } else {
        profiles.push(profile);
    }

    return setCustomProfiles(profiles);
}

function deleteCustomProfile(profileId) {
    const profiles = getCustomProfiles();
    const filtered = profiles.filter(p => p.id !== profileId);
    return setCustomProfiles(filtered);
}

// ============ UPDATE PREFERENCES ============

function getUpdatePreferences() {
    return readJsonFile(getUpdatePreferencesPath(), {
        skippedVersion: null,
        lastSeenReleaseNotesVersion: null,
        lastSeenForcedId: null // Tracks which specific forced update was shown
    });
}

function setUpdatePreferences(prefs) {
    const current = getUpdatePreferences();
    const updated = { ...current, ...prefs };
    return writeJsonFile(getUpdatePreferencesPath(), updated);
}

// ============ CLEAR ALL DATA ============

function clearAllData() {
    resetConfigDir();
    return true;
}

module.exports = {
    // Initialization
    initializeStorage,
    checkFirstRunOrUpgrade,
    markVersionSeen,
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
    getPaidStatus,
    setPaidStatus,

    // Preferences
    getPreferences,
    setPreferences,
    updatePreference,

    // Custom Profiles
    getCustomProfiles,
    setCustomProfiles,
    saveCustomProfile,
    deleteCustomProfile,

    // Keybinds
    getKeybinds,
    setKeybinds,

    // Limits (Rate Limiting)
    getLimits,
    setLimits,
    getTodayLimits,
    incrementLimitCount,
    getAvailableModel,

    // History
    saveSession,
    getSession,
    getAllSessions,
    deleteSession,
    deleteAllSessions,

    // Update Preferences
    getUpdatePreferences,
    setUpdatePreferences,

    // Clear all
    clearAllData
};
