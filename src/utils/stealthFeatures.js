// stealthFeatures.js - Additional stealth features for process hiding

const { getCurrentRandomDisplayName } = require('./processNames');
const { exec } = require('node:child_process');

/**
 * Apply additional stealth measures to the Electron application
 * @param {BrowserWindow} mainWindow - The main application window
 */
function applyStealthMeasures(mainWindow) {
    console.log('Applying additional stealth measures...');

    // Hide from alt-tab on Windows
    if (process.platform === 'win32') {
        try {
            mainWindow.setSkipTaskbar(true);
            console.log('Hidden from Windows taskbar');
        } catch (error) {
            console.warn('Could not hide from taskbar:', error.message);
        }
    }

    // Hide from Mission Control on macOS
    if (process.platform === 'darwin') {
        try {
            mainWindow.setHiddenInMissionControl(true);
            console.log('Hidden from macOS Mission Control');
        } catch (error) {
            console.warn('Could not hide from Mission Control:', error.message);
        }
    }

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

    // Linux-specific stealth measures
    if (process.platform === 'linux') {
        try {
            // Skip taskbar on Linux
            mainWindow.setSkipTaskbar(true);
            console.log('Hidden from Linux taskbar');
        } catch (error) {
            console.warn('Could not hide from Linux taskbar:', error.message);
        }

        try {
            // Set random app name for Linux
            const { app } = require('electron');
            const randomName = getCurrentRandomDisplayName();
            app.setName(randomName);
            console.log(`Set Linux app name to: ${randomName}`);
        } catch (error) {
            console.warn('Could not set Linux app name:', error.message);
        }

        try {
            // Additional Linux window properties for stealth
            mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
            console.log('Set Linux window always-on-top with high priority');
        } catch (error) {
            console.warn('Could not set Linux always-on-top:', error.message);
        }
    }

    // Prevent screenshots if content protection is enabled
    try {
        mainWindow.setContentProtection(true);
        console.log('Content protection enabled');
    } catch (error) {
        console.warn('Could not enable content protection:', error.message);
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
    startLinuxStealthMonitor,
};

/**
 * Linux-only: Periodically detect common screen recorders and call apps,
 * auto-hide the overlay to avoid capture, and restore it afterwards.
 * This is a best-effort fallback because setContentProtection is not
 * effective on many Linux environments.
 * @param {BrowserWindow} mainWindow
 * @param {{ intervalMs?: number, extraProcesses?: string[] }} options
 */
function startLinuxStealthMonitor(mainWindow, options = {}) {
    try {
        if (process.platform !== 'linux') return () => {};
        if (!mainWindow || mainWindow.isDestroyed()) return () => {};

        const intervalMs = Number.isFinite(options.intervalMs) ? options.intervalMs : 2000;

        // Comprehensive list of recorder/call process names for Ubuntu/Linux
        const defaultTargets = [
            // Screen Recorders
            'obs',
            'obs-studio',
            'obs64',
            'simplescreenrecorder',
            'ssr',
            'kazam',
            'vokoscreen',
            'vokoscreenNG',
            'peek',
            'gtk-recordmydesktop',
            'recordmydesktop',
            'green-recorder',
            'kooha',
            'screenkey',
            'ffmpeg', // often used for recording
            'flameshot', // screenshot tool that can record
            
            // GNOME/Desktop environment tools
            'gnome-shell',
            'gnome-screenshot',
            'gjs', // GNOME JavaScript (used by extensions)
            
            // Video Call/Conferencing Apps
            'zoom',
            'zoom.real',
            'zoom-bin',
            'zoomus',
            'teams',
            'teams-for-linux',
            'teams-insiders',
            'skype',
            'skypeforlinux',
            'discord',
            'Discord',
            'slack',
            'webex',
            'webexapp',
            
            // Browsers (often used for calls/screen sharing)
            'google-chrome',
            'chrome',
            'chromium',
            'chromium-browser',
            'firefox',
            'firefox-esr',
            'brave',
            'brave-browser',
            'opera',
            'microsoft-edge',
            'vivaldi',
            
            // Other conferencing
            'jitsi',
            'jitsi-meet',
            'wire',
            'telegram',
            'signal',
            'element',
            'riot',
            
            // Streaming tools
            'streamlabs-obs',
            'streamlabs',
            'restream',
            
            // VNC/Remote desktop (can capture screen)
            'vncviewer',
            'remmina',
            'vinagre',
            'krdc',
            'xvnc',
        ];

        const extra = Array.isArray(options.extraProcesses) ? options.extraProcesses : [];
        const targets = new Set([...defaultTargets, ...extra].map(s => String(s).toLowerCase()));

        let hiddenByMonitor = false;
        let disposed = false;
        let lastDetectionState = false;

        console.log('[Linux Stealth] Monitor started, checking every', intervalMs, 'ms');
        console.log('[Linux Stealth] Watching for', targets.size, 'process patterns');

        const timer = setInterval(() => {
            if (disposed || !mainWindow || mainWindow.isDestroyed()) {
                clearInterval(timer);
                console.log('[Linux Stealth] Monitor stopped');
                return;
            }

            // Use ps aux for more comprehensive process information
            exec('ps aux', { windowsHide: true }, (err, stdout) => {
                if (err || !stdout) return;
                
                const lowerOutput = stdout.toLowerCase();
                
                // Check if any target process is running (search in full command line)
                const detected = Array.from(targets).some(target => lowerOutput.includes(target));

                // Log detection state changes
                if (detected !== lastDetectionState) {
                    lastDetectionState = detected;
                    if (detected) {
                        console.log('[Linux Stealth] ⚠️  Recording/call app detected - hiding overlay');
                    } else {
                        console.log('[Linux Stealth] ✓ No recording/call apps detected - showing overlay');
                    }
                }

                try {
                    if (detected) {
                        if (mainWindow.isVisible()) {
                            mainWindow.hide();
                            hiddenByMonitor = true;
                            
                            // Also set click-through as extra precaution
                            mainWindow.setIgnoreMouseEvents(true, { forward: true });
                        }
                    } else if (hiddenByMonitor) {
                        // Restore only if we hid it
                        mainWindow.showInactive();
                        mainWindow.setIgnoreMouseEvents(false);
                        hiddenByMonitor = false;
                    }
                } catch (error) {
                    // Ignore race conditions or destroyed window errors
                    console.warn('[Linux Stealth] Error toggling window visibility:', error.message);
                }
            });
        }, intervalMs);

        return () => {
            disposed = true;
            clearInterval(timer);
            console.log('[Linux Stealth] Monitor disposed');
        };
    } catch (error) {
        console.error('[Linux Stealth] Failed to start monitor:', error.message);
        return () => {};
    }
}
