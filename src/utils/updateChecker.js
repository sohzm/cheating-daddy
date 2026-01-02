/**
 * Update Checker Utility
 * Checks for new versions by fetching update.json from GitHub
 */

// Use 'main' branch for stable production updates
const UPDATE_URL = 'https://raw.githubusercontent.com/klaus-qodes/cheating-daddy/master/update.json';

// Version should match package.json - in a full build system, this would be imported
// For now, manually kept in sync with package.json version
const CURRENT_VERSION = '0.5.4';

/**
 * Check for updates by fetching the remote update.json
 * @returns {Promise<{hasUpdate: boolean, updateInfo: object|null, error: string|null, skipped: boolean}>}
 */
export async function checkForUpdates() {
    try {
        const response = await fetch(UPDATE_URL, {
            cache: 'no-store', // Always fetch fresh
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const updateInfo = await response.json();

        // Check if this is a forced notification or a version update
        const hasUpdate = updateInfo.forceShow === true || isNewerVersion(updateInfo.version, CURRENT_VERSION);

        // Check if user has skipped this version (only applies if not forced)
        const skippedVersion = await getSkippedVersion();
        if (!updateInfo.forceShow && skippedVersion === updateInfo.version) {
            return { hasUpdate: false, updateInfo: null, error: null, skipped: true };
        }

        return {
            hasUpdate,
            updateInfo: hasUpdate ? updateInfo : null,
            error: null,
            skipped: false
        };
    } catch (error) {
        console.error('Update check failed:', error);
        return {
            hasUpdate: false,
            updateInfo: null,
            error: error.message,
            skipped: false
        };
    }
}

/**
 * Compare version strings to determine if remote is newer
 * Properly handles semantic versioning including prereleases
 * Supports formats like "0.5.4", "1.0.0", "0.5.5-beta", "0.5.5-alpha.1"
 * 
 * Semantic versioning rules:
 * - Stable (no prerelease) > prerelease
 * - Higher major.minor.patch > lower
 */
function isNewerVersion(remote, current) {
    if (!remote || !current) return false;

    // Split version and prerelease
    const [remoteBase, remotePrerelease] = remote.split('-');
    const [currentBase, currentPrerelease] = current.split('-');

    const remoteParts = remoteBase.split('.').map(p => parseInt(p) || 0);
    const currentParts = currentBase.split('.').map(p => parseInt(p) || 0);

    // Compare each numeric part
    for (let i = 0; i < Math.max(remoteParts.length, currentParts.length); i++) {
        const r = remoteParts[i] || 0;
        const c = currentParts[i] || 0;

        if (r > c) return true;
        if (r < c) return false;
    }

    // Base versions are equal - check prerelease
    // No prerelease (stable) > prerelease
    if (!remotePrerelease && currentPrerelease) return true;
    if (remotePrerelease && !currentPrerelease) return false;

    return false; // Equal versions (including equal prereleases)
}

/**
 * Get the version that user chose to skip
 */
async function getSkippedVersion() {
    try {
        if (window.cheatingDaddy?.storage?.getUpdatePreferences) {
            const prefs = await window.cheatingDaddy.storage.getUpdatePreferences();
            return prefs?.skippedVersion || null;
        }
    } catch (e) {
        console.error('Error getting skipped version:', e);
    }
    return null;
}

/**
 * Skip a specific version (user chose "Skip This Version")
 * @throws {Error} if storage operation fails
 */
export async function skipVersion(version) {
    if (window.cheatingDaddy?.storage?.setUpdatePreferences) {
        await window.cheatingDaddy.storage.setUpdatePreferences({ skippedVersion: version });
    } else {
        throw new Error('Storage API not available');
    }
}

/**
 * Clear skipped version (useful for testing or reset)
 */
export async function clearSkippedVersion() {
    try {
        if (window.cheatingDaddy?.storage?.setUpdatePreferences) {
            await window.cheatingDaddy.storage.setUpdatePreferences({ skippedVersion: null });
        }
    } catch (e) {
        console.error('Error clearing skipped version:', e);
    }
}

/**
 * Get current app version
 */
export function getCurrentVersion() {
    return CURRENT_VERSION;
}
