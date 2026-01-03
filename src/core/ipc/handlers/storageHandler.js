/**
 * Storage IPC Handler
 *
 * Centralizes all storage-related IPC channels (24 total):
 * - Config management (get/set/update)
 * - Credentials management (get/set/get-api-key/set-api-key)
 * - Usage stats (get-usage-stats, get-usage-reset-time)
 * - Preferences management (get/set/update)
 * - Custom profiles (get/save/delete)
 * - Keybinds (get/set)
 * - Session history (get-all/get/save/delete/delete-all)
 * - Limits (get-today-limits)
 * - Update preferences (get/set)
 * - Emergency operations (clear-all, check-first-run-or-upgrade, mark-version-seen)
 *
 * All handlers follow the response pattern:
 * {success: boolean, data?: any, error?: string}
 */

const { ipcMain } = require('electron');

/**
 * Initialize storage IPC handlers
 * @param {Object} storage - Storage module (legacy) or StorageManager instance
 * @param {Object} rateLimitManager - Rate limit manager
 */
function registerStorageHandlers(storage, rateLimitManager) {
    // Support both legacy storage module and new StorageManager
    const isStorageManager = storage.config && typeof storage.config.get === 'function';

    // Use StorageManager API if available, fallback to legacy
    const getConfig = isStorageManager ? () => storage.config.get() : () => storage.getConfig();
    const setConfig = isStorageManager ? cfg => storage.config.set(cfg) : cfg => storage.setConfig(cfg);
    const updateConfig = isStorageManager ? (k, v) => storage.config.update(k, v) : (k, v) => storage.updateConfig(k, v);

    const getCredentials = isStorageManager ? () => storage.credentials.get() : () => storage.getCredentials();
    const setCredentials = isStorageManager ? cred => storage.credentials.set(cred) : cred => storage.setCredentials(cred);
    const getApiKey = isStorageManager ? p => storage.credentials.getApiKey(p) : p => storage.getApiKey(p);
    const setApiKey = isStorageManager ? (k, p) => storage.credentials.setApiKey(k, p) : (k, p) => storage.setApiKey(k, p);

    const getPreferences = isStorageManager ? () => storage.preferences.get() : () => storage.getPreferences();
    const setPreferences = isStorageManager ? pref => storage.preferences.set(pref) : pref => storage.setPreferences(pref);
    const updatePreference = isStorageManager ? (k, v) => storage.preferences.update(k, v) : (k, v) => storage.updatePreference(k, v);

    const getCustomProfiles = isStorageManager ? () => storage.profiles.getAll() : () => storage.getCustomProfiles();
    const saveCustomProfile = isStorageManager ? prof => storage.profiles.save(prof) : prof => storage.saveCustomProfile(prof);
    const deleteCustomProfile = isStorageManager ? id => storage.profiles.delete(id) : id => storage.deleteCustomProfile(id);

    const getKeybinds = isStorageManager ? () => storage.keybinds.get() : () => storage.getKeybinds();
    const setKeybinds = isStorageManager ? kb => storage.keybinds.set(kb) : kb => storage.setKeybinds(kb);

    const getAllSessions = isStorageManager ? () => storage.sessions.getAll() : () => storage.getAllSessions();
    const getSession = isStorageManager ? id => storage.sessions.get(id) : id => storage.getSession(id);
    const saveSession = isStorageManager ? (id, data) => storage.sessions.save(id, data) : (id, data) => storage.saveSession(id, data);
    const deleteSession = isStorageManager ? id => storage.sessions.delete(id) : id => storage.deleteSession(id);
    const deleteAllSessions = isStorageManager ? () => storage.sessions.deleteAll() : () => storage.deleteAllSessions();

    const getTodayLimits = isStorageManager ? () => storage.limits.getToday() : () => storage.getTodayLimits();

    const getUpdatePreferences = isStorageManager ? () => storage.updates.getPreferences() : () => storage.getUpdatePreferences();
    const setUpdatePreferences = isStorageManager ? prefs => storage.updates.setPreferences(prefs) : prefs => storage.setUpdatePreferences(prefs);

    const clearAllData = isStorageManager ? () => storage.emergency.clearAll() : () => storage.clearAllData();
    const checkFirstRunOrUpgrade = isStorageManager ? v => storage.initialization.checkFirstRunOrUpgrade(v) : v => storage.checkFirstRunOrUpgrade(v);
    const markVersionSeen = isStorageManager ? v => storage.initialization.markVersionSeen(v) : v => storage.markVersionSeen(v);
    // ============ CONFIG ============
    ipcMain.handle('storage:get-config', async () => {
        try {
            return { success: true, data: getConfig() };
        } catch (error) {
            console.error('[StorageHandler] Error getting config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-config', async (event, config) => {
        try {
            setConfig(config);
            return { success: true };
        } catch (error) {
            console.error('[StorageHandler] Error setting config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:update-config', async (event, key, value) => {
        try {
            updateConfig(key, value);
            return { success: true };
        } catch (error) {
            console.error('[StorageHandler] Error updating config:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CREDENTIALS ============
    ipcMain.handle('storage:get-credentials', async () => {
        try {
            return { success: true, data: getCredentials() };
        } catch (error) {
            console.error('[StorageHandler] Error getting credentials:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-credentials', async (event, credentials) => {
        try {
            setCredentials(credentials);
            return { success: true };
        } catch (error) {
            console.error('[StorageHandler] Error setting credentials:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-api-key', async (event, provider) => {
        try {
            return { success: true, data: getApiKey(provider) };
        } catch (error) {
            console.error('[StorageHandler] Error getting API key:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-api-key', async (event, apiKey, provider) => {
        try {
            setApiKey(apiKey, provider);

            // Reset provider instances so next use picks up new key
            const { resetProviders } = require('../../../utils/providers/registry');
            resetProviders();

            return { success: true };
        } catch (error) {
            console.error('[StorageHandler] Error setting API key:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ USAGE STATS ============
    ipcMain.handle('storage:get-usage-stats', async () => {
        try {
            return { success: true, data: rateLimitManager.getAllUsageStats() };
        } catch (error) {
            console.error('[StorageHandler] Error getting usage stats:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-usage-reset-time', async () => {
        try {
            return { success: true, data: rateLimitManager.getTimeUntilReset() };
        } catch (error) {
            console.error('[StorageHandler] Error getting usage reset time:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ PREFERENCES ============
    ipcMain.handle('storage:get-preferences', async () => {
        try {
            return { success: true, data: getPreferences() };
        } catch (error) {
            console.error('[StorageHandler] Error getting preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-preferences', async (event, preferences) => {
        try {
            setPreferences(preferences);
            return { success: true };
        } catch (error) {
            console.error('[StorageHandler] Error setting preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:update-preference', async (event, key, value) => {
        try {
            updatePreference(key, value);
            return { success: true };
        } catch (error) {
            console.error('[StorageHandler] Error updating preference:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CUSTOM PROFILES ============
    ipcMain.handle('storage:get-custom-profiles', async () => {
        try {
            return { success: true, data: getCustomProfiles() };
        } catch (error) {
            console.error('[StorageHandler] Error getting custom profiles:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:save-custom-profile', async (event, profile) => {
        try {
            saveCustomProfile(profile);
            return { success: true };
        } catch (error) {
            console.error('[StorageHandler] Error saving custom profile:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-custom-profile', async (event, profileId) => {
        try {
            deleteCustomProfile(profileId);
            return { success: true };
        } catch (error) {
            console.error('[StorageHandler] Error deleting custom profile:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ KEYBINDS ============
    ipcMain.handle('storage:get-keybinds', async () => {
        try {
            return { success: true, data: getKeybinds() };
        } catch (error) {
            console.error('[StorageHandler] Error getting keybinds:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-keybinds', async (event, keybinds) => {
        try {
            setKeybinds(keybinds);
            return { success: true };
        } catch (error) {
            console.error('[StorageHandler] Error setting keybinds:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ HISTORY ============
    ipcMain.handle('storage:get-all-sessions', async () => {
        try {
            return { success: true, data: getAllSessions() };
        } catch (error) {
            console.error('[StorageHandler] Error getting sessions:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-session', async (event, sessionId) => {
        try {
            return { success: true, data: getSession(sessionId) };
        } catch (error) {
            console.error('[StorageHandler] Error getting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:save-session', async (event, sessionId, data) => {
        try {
            saveSession(sessionId, data);
            return { success: true };
        } catch (error) {
            console.error('[StorageHandler] Error saving session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-session', async (event, sessionId) => {
        try {
            deleteSession(sessionId);
            return { success: true };
        } catch (error) {
            console.error('[StorageHandler] Error deleting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-all-sessions', async () => {
        try {
            deleteAllSessions();
            return { success: true };
        } catch (error) {
            console.error('[StorageHandler] Error deleting all sessions:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ LIMITS ============
    ipcMain.handle('storage:get-today-limits', async () => {
        try {
            return { success: true, data: getTodayLimits() };
        } catch (error) {
            console.error('[StorageHandler] Error getting today limits:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ UPDATE PREFERENCES ============
    ipcMain.handle('storage:get-update-preferences', async () => {
        try {
            return { success: true, data: getUpdatePreferences() };
        } catch (error) {
            console.error('[StorageHandler] Error getting update preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-update-preferences', async (event, prefs) => {
        try {
            setUpdatePreferences(prefs);
            return { success: true };
        } catch (error) {
            console.error('[StorageHandler] Error setting update preferences:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ EMERGENCY OPERATIONS ============
    ipcMain.handle('storage:clear-all', async () => {
        try {
            clearAllData();
            return { success: true };
        } catch (error) {
            console.error('[StorageHandler] Error clearing all data:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:check-first-run-or-upgrade', async () => {
        try {
            return { success: true, data: checkFirstRunOrUpgrade() };
        } catch (error) {
            console.error('[StorageHandler] Error checking first run or upgrade:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:mark-version-seen', async () => {
        try {
            markVersionSeen();
            return { success: true };
        } catch (error) {
            console.error('[StorageHandler] Error marking version seen:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('[StorageHandler] Registered 24 storage IPC handlers');
}

module.exports = { registerStorageHandlers };
