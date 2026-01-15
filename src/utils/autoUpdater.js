const { app, dialog, shell } = require('electron');
const https = require('https');

// GitHub repository info
const GITHUB_OWNER = 'Sushma1969';
const GITHUB_REPO = 'cheating-daddy';

/**
 * Compare two semantic version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
    // Remove 'v' prefix if present
    const version1 = v1.replace(/^v/, '').split('.').map(Number);
    const version2 = v2.replace(/^v/, '').split('.').map(Number);

    for (let i = 0; i < Math.max(version1.length, version2.length); i++) {
        const num1 = version1[i] || 0;
        const num2 = version2[i] || 0;

        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }

    return 0;
}

/**
 * Fetch latest release from GitHub API
 */
function fetchLatestRelease() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
            method: 'GET',
            headers: {
                'User-Agent': 'Cheating-Daddy-App',
                'Accept': 'application/vnd.github.v3+json',
            },
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const release = JSON.parse(data);
                        resolve(release);
                    } catch (error) {
                        reject(new Error('Failed to parse release data'));
                    }
                } else if (res.statusCode === 404) {
                    reject(new Error('No releases found'));
                } else {
                    reject(new Error(`GitHub API error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        // Set a timeout of 10 seconds
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

/**
 * Show update available dialog
 */
async function showUpdateDialog(currentVersion, latestVersion, releaseUrl) {
    const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `Cheating Daddy ${latestVersion} is now available!`,
        detail: `You're currently on v${currentVersion}. Download the latest version to enjoy new features, improvements, and bug fixes.`,
        buttons: ['Download Update', 'Remind Me Later', 'Skip This Version'],
        defaultId: 0,
        cancelId: 1,
    });

    if (result.response === 0) {
        // Open GitHub releases page in default browser
        shell.openExternal(releaseUrl);
    } else if (result.response === 2) {
        // Skip this version - store in localStorage via main window
        return { skipped: true, version: latestVersion };
    }

    return { skipped: false };
}

/**
 * Check for updates from GitHub releases
 */
async function checkForUpdates(silent = false, mainWindow = null) {
    try {
        const currentVersion = app.getVersion();
        console.log(`[AutoUpdater] Current version: v${currentVersion}`);
        console.log(`[AutoUpdater] Checking for updates from GitHub...`);

        const release = await fetchLatestRelease();
        const latestVersion = release.tag_name;
        const releaseUrl = release.html_url;

        console.log(`[AutoUpdater] Latest version on GitHub: ${latestVersion}`);

        // Compare versions
        const comparison = compareVersions(latestVersion, currentVersion);

        if (comparison > 0) {
            console.log(`[AutoUpdater] Update available: ${latestVersion}`);

            // Send update-available event to renderer BEFORE showing dialog
            // So the red dot appears at the same time as the dialog
            if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.send('update-available', true);
            }

            // Check if user has skipped this version
            // This would need to be stored somewhere - for now, always show
            await showUpdateDialog(currentVersion, latestVersion, releaseUrl);
        } else {
            console.log(`[AutoUpdater] App is up to date`);

            if (!silent) {
                dialog.showMessageBox({
                    type: 'info',
                    title: 'No Updates Available',
                    message: 'You are running the latest version!',
                    detail: `Current version: v${currentVersion}`,
                    buttons: ['OK'],
                });
            }
        }

        return {
            updateAvailable: comparison > 0,
            currentVersion,
            latestVersion,
            releaseUrl
        };
    } catch (error) {
        console.error(`[AutoUpdater] Error checking for updates:`, error.message);

        if (!silent) {
            dialog.showMessageBox({
                type: 'error',
                title: 'Update Check Failed',
                message: 'Could not check for updates',
                detail: `Error: ${error.message}\n\nPlease check your internet connection or try again later.`,
                buttons: ['OK'],
            });
        }

        return { updateAvailable: false, error: error.message };
    }
}

/**
 * Setup IPC handler for manual update check from renderer
 */
function setupAutoUpdaterIpc(ipcMain) {
    ipcMain.handle('check-for-updates', async () => {
        return await checkForUpdates(false);
    });

    ipcMain.handle('check-for-updates-silent', async () => {
        return await checkForUpdates(true);
    });
}

module.exports = {
    checkForUpdates,
    setupAutoUpdaterIpc,
    compareVersions,
};
