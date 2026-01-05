/**
 * macOS Utilities Module
 * 
 * Provides macOS-specific utilities including:
 * - Version detection and validation
 * - Feature compatibility checking
 * - Permission handling helpers
 * 
 * Audio capture uses audiotee (Core Audio Taps API) which requires macOS 14.2+
 * This provides a better user experience than ScreenCaptureKit:
 * - No app restart required after granting permission
 * - Uses NSAudioCaptureUsageDescription instead of Screen Recording
 */

const { execSync } = require('child_process');

/**
 * Minimum macOS version requirements for audio features
 * 
 * audiotee uses Core Audio Taps API which requires macOS 14.2+
 * Released December 2023 with macOS Sonoma 14.2
 */
const MACOS_REQUIREMENTS = {
    // Minimum version for Core Audio Taps (audiotee)
    MIN_MAJOR_VERSION: 14,
    MIN_MINOR_VERSION: 2,
    // Full version string for display
    MIN_VERSION_STRING: '14.2',
    // Code name for display
    MIN_VERSION_CODENAME: 'Sonoma',
};

/**
 * Parse macOS version string into components
 * @param {string} versionString - Version string like "14.2.1"
 * @returns {{ major: number, minor: number, patch: number }}
 */
function parseVersion(versionString) {
    const parts = versionString.trim().split('.').map(p => parseInt(p, 10) || 0);
    return {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0,
    };
}

/**
 * Get the current macOS version
 * Uses sw_vers command for reliable detection
 * 
 * @returns {{ version: string, major: number, minor: number, patch: number } | null}
 */
function getMacOSVersion() {
    if (process.platform !== 'darwin') {
        return null;
    }

    try {
        const versionOutput = execSync('sw_vers -productVersion', {
            encoding: 'utf8',
            timeout: 5000,
        }).trim();

        const parsed = parseVersion(versionOutput);
        
        console.log(`[macOS] Detected version: ${versionOutput} (major: ${parsed.major})`);
        
        return {
            version: versionOutput,
            ...parsed,
        };
    } catch (error) {
        console.error('[macOS] Error detecting version:', error.message);
        return null;
    }
}

/**
 * Check if the current macOS version supports audio capture
 * Requires macOS 14.2+ for Core Audio Taps API (audiotee)
 * 
 * @returns {{ isSupported: boolean, version: string | null, reason: string | null }}
 */
function checkAudioSupport() {
    if (process.platform !== 'darwin') {
        return {
            isSupported: true,
            version: null,
            reason: 'Not macOS - audio capture uses different method',
        };
    }

    const versionInfo = getMacOSVersion();
    
    if (!versionInfo) {
        return {
            isSupported: false,
            version: null,
            reason: 'Could not detect macOS version',
        };
    }

    // Check if version is 14.2 or higher
    const meetsRequirement = 
        versionInfo.major > MACOS_REQUIREMENTS.MIN_MAJOR_VERSION ||
        (versionInfo.major === MACOS_REQUIREMENTS.MIN_MAJOR_VERSION && 
         versionInfo.minor >= MACOS_REQUIREMENTS.MIN_MINOR_VERSION);

    if (!meetsRequirement) {
        return {
            isSupported: false,
            version: versionInfo.version,
            minRequired: MACOS_REQUIREMENTS.MIN_VERSION_STRING,
            reason: `macOS ${versionInfo.version} is not supported. System audio capture requires macOS ${MACOS_REQUIREMENTS.MIN_VERSION_STRING} (${MACOS_REQUIREMENTS.MIN_VERSION_CODENAME}) or later. Please update your macOS.`,
        };
    }

    return {
        isSupported: true,
        version: versionInfo.version,
        reason: null,
    };
}

/**
 * Get a user-friendly message about macOS version support
 * 
 * @returns {{ title: string, message: string, severity: 'error' | 'warning' | 'info' | 'success' }}
 */
function getVersionStatusMessage() {
    const support = checkAudioSupport();
    
    if (!support.version) {
        return {
            title: 'macOS Version Unknown',
            message: 'Could not detect your macOS version. Audio capture may not work correctly.',
            severity: 'warning',
        };
    }

    if (!support.isSupported) {
        return {
            title: `macOS ${support.version} Not Supported`,
            message: `System audio capture requires macOS ${MACOS_REQUIREMENTS.MIN_VERSION_STRING} (${MACOS_REQUIREMENTS.MIN_VERSION_CODENAME}) or later. Your version: ${support.version}. Please update macOS to use audio features.`,
            severity: 'error',
        };
    }

    return {
        title: `macOS ${support.version} ✓`,
        message: 'Your macOS version fully supports audio capture via Core Audio Taps.',
        severity: 'success',
    };
}

/**
 * Get macOS code name from major version
 * @param {number} majorVersion 
 * @returns {string}
 */
function getMacOSCodeName(majorVersion) {
    const codeNames = {
        11: 'Big Sur',
        12: 'Monterey',
        13: 'Ventura',
        14: 'Sonoma',
        15: 'Sequoia',
    };
    return codeNames[majorVersion] || 'Unknown';
}

/**
 * Get detailed system info for debugging
 * @returns {Object}
 */
function getSystemInfo() {
    if (process.platform !== 'darwin') {
        return {
            platform: process.platform,
            isMac: false,
        };
    }

    const versionInfo = getMacOSVersion();
    let chipType = 'unknown';
    
    try {
        // Check if running on Apple Silicon
        const archOutput = execSync('uname -m', { encoding: 'utf8', timeout: 3000 }).trim();
        chipType = archOutput === 'arm64' ? 'Apple Silicon' : 'Intel';
    } catch (e) {
        console.warn('[macOS] Could not detect chip type:', e.message);
    }

    return {
        platform: 'darwin',
        isMac: true,
        version: versionInfo?.version || 'unknown',
        majorVersion: versionInfo?.major || 0,
        codeName: versionInfo ? getMacOSCodeName(versionInfo.major) : 'unknown',
        chipType,
        audioSupport: checkAudioSupport(),
    };
}

module.exports = {
    MACOS_REQUIREMENTS,
    getMacOSVersion,
    checkAudioSupport,
    getVersionStatusMessage,
    getMacOSCodeName,
    getSystemInfo,
    parseVersion,
};
