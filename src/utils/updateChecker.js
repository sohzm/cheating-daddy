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
 * @returns {Promise<{hasUpdate: boolean, updateInfo: object|null, error: string|null}>}
 */
async function checkForUpdates() {
    try {
        // Use global fetch (available in both Electron renderer and modern Node/main)
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

        // Check if there is a version update
        const hasUpdate = isNewerVersion(updateInfo.version, CURRENT_VERSION);

        return {
            hasUpdate,
            updateInfo: updateInfo, // Always return info if we successfully fetched it
            error: null
        };
    } catch (error) {
        console.error('Update check failed:', error);
        return {
            hasUpdate: false,
            updateInfo: null,
            error: error.message
        };
    }
}

/**
 * Compare version strings to determine if remote is newer
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
    if (!remotePrerelease && currentPrerelease) return true;
    if (remotePrerelease && !currentPrerelease) return false;

    return false;
}

module.exports = {
    checkForUpdates,
    isNewerVersion,
    getCurrentVersion: () => CURRENT_VERSION
};
