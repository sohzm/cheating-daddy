// stealthFeatures.js - Additional stealth features for process hiding

const { getCurrentRandomDisplayName } = require('./processNames');

/**
 * Apply additional stealth measures to the Electron application
 * @param {BrowserWindow} mainWindow - The main application window
 * @param {boolean} enableContentProtection - Whether to enable content protection
 */
function applyStealthMeasures(mainWindow, enableContentProtection = false) {
    console.log('Applying additional stealth measures...');

    // Note: skipTaskbar and hiddenInMissionControl are set in BrowserWindow options
    // during window creation, so we don't need to set them here again

    // Set random app name in menu bar (macOS)
    if (process.platform === 'darwin') {
        try {
            const { app } = require('electron');
            const randomName = getCurrentRandomDisplayName();
            app.setName(randomName);
            console.log(`Set app name to: ${randomName}`);
        } catch (error) {
            console.warn('Could not set app name:', error.message);
        }
    }

    // Prevent screenshots if content protection is enabled
    if (enableContentProtection) {
        try {
            mainWindow.setContentProtection(true);
            console.log('Content protection enabled');
        } catch (error) {
            console.warn('Could not enable content protection:', error.message);
        }
    }

    // Randomize window user agent
    try {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        ];
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
        mainWindow.webContents.setUserAgent(randomUA);
        console.log('Set random user agent');
    } catch (error) {
        console.warn('Could not set user agent:', error.message);
    }
}

/**
 * Periodically randomize window title to avoid detection
 * @param {BrowserWindow} mainWindow - The main application window
 */
function startTitleRandomization(mainWindow) {
    const titles = [
        'System Configuration',
        'Audio Settings',
        'Network Monitor',
        'Performance Monitor',
        'System Information',
        'Device Manager',
        'Background Services',
        'System Updates',
        'Security Center',
        'Task Manager',
        'Resource Monitor',
        'System Properties',
        'Network Connections',
        'Audio Devices',
        'Display Settings',
        'Power Options',
        'System Tools',
        'Hardware Monitor',
    ];

    // Change title every 30-60 seconds
    const interval = setInterval(() => {
        try {
            if (!mainWindow.isDestroyed()) {
                const randomTitle = titles[Math.floor(Math.random() * titles.length)];
                mainWindow.setTitle(randomTitle);
            } else {
                clearInterval(interval);
            }
        } catch (error) {
            console.warn('Could not update window title:', error.message);
            clearInterval(interval);
        }
    }, 30000 + Math.random() * 30000); // 30-60 seconds

    return interval;
}

/**
 * Anti-debugging and anti-analysis measures
 */
function applyAntiAnalysisMeasures() {
    console.log('Applying anti-analysis measures...');

    // Clear console on production
    if (process.env.NODE_ENV === 'production') {
        console.clear();
    }

    // Randomize startup delay to avoid pattern detection
    const delay = 1000 + Math.random() * 3000; // 1-4 seconds
    return new Promise(resolve => {
        setTimeout(resolve, delay);
    });
}

module.exports = {
    applyStealthMeasures,
    startTitleRandomization,
    applyAntiAnalysisMeasures,
};
