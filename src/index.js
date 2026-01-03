if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain, globalShortcut, systemPreferences } = require('electron');
const { createWindow, createUpdateWindow, createUpgradeWindow, createSplashWindow, updateGlobalShortcuts } = require('./utils/window');
const { checkForUpdates, isNewerVersion, getCurrentVersion } = require('./utils/updateChecker');
const assistantManager = require('./utils/core/assistantManager');
const { stopMacOSAudioCapture, sendToRenderer, toggleManualRecording } = assistantManager;
const storage = require('./storage');
const rateLimitManager = require('./utils/rateLimitManager');
const { initializeIpcGateway } = require('./core/ipc/gateway');

const geminiSessionRef = { current: null };
let mainWindow = null;

// Check if we should skip the upgrade check (after a reset)
const skipUpgradeCheck = process.argv.includes('--skip-upgrade-check');
console.log('App Startup: process.argv =', process.argv);
console.log('App Startup: skipUpgradeCheck =', skipUpgradeCheck);

/**
 * Kill zombie processes from previous runs that might be holding global shortcuts
 * This prevents shortcut registration failures on Windows
 */
function killZombieProcesses() {
    if (process.platform !== 'win32') return;
    
    try {
        const { execSync } = require('child_process');
        const currentPid = process.pid;
        const appName = 'Cheating Daddy On Steroids';
        
        // Get list of processes with matching name, excluding current process
        const cmd = `powershell -Command "Get-Process -Name '${appName}' -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne ${currentPid} } | Select-Object -ExpandProperty Id"`;
        
        const result = execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim();
        
        if (result) {
            const pids = result.split('\n').map(p => p.trim()).filter(p => p);
            if (pids.length > 0) {
                console.log(`[Zombie Cleanup] Found ${pids.length} zombie process(es): ${pids.join(', ')}`);
                
                // Kill each zombie process
                pids.forEach(pid => {
                    try {
                        execSync(`taskkill /PID ${pid} /F`, { encoding: 'utf8', timeout: 3000 });
                        console.log(`[Zombie Cleanup] Killed process ${pid}`);
                    } catch (killError) {
                        // Process may have already exited
                        console.warn(`[Zombie Cleanup] Could not kill ${pid}:`, killError.message);
                    }
                });
                
                // Small delay to ensure shortcuts are released
                const waitSync = (ms) => {
                    const end = Date.now() + ms;
                    while (Date.now() < end) { /* busy wait */ }
                };
                waitSync(500);
            }
        }
    } catch (error) {
        // Silently ignore - this is a best-effort cleanup
        if (error.status !== 1) { // status 1 = no processes found, which is fine
            console.warn('[Zombie Cleanup] Error during cleanup:', error.message);
        }
    }
}

function createMainWindow() {
    mainWindow = createWindow(sendToRenderer, geminiSessionRef);
    return mainWindow;
}

// Kill any zombie processes before starting (prevents shortcut conflicts)
killZombieProcesses();

app.whenReady().then(async () => {
    // Initialize storage (ensures directory exists, resets if needed)
    storage.initializeStorage();

    // 1. Show Splash Screen
    const splashWindow = createSplashWindow();

    let shouldStartApp = true;
    try {
        // 2. Check for Updates
        console.log('App Startup: Checking for updates...');
        const updateResult = await checkForUpdates();

        if (updateResult.updateInfo) {
            let shouldShowUpdate = false;
            let contentId = null;
            const isNewer = isNewerVersion(updateResult.updateInfo.version, getCurrentVersion());

            if (isNewer) {
                // Always show if it's a version bump
                shouldShowUpdate = true;
            } else {
                // Not a version bump, but check if the content (message/buildDate) has changed
                const prefs = storage.getUpdatePreferences();
                contentId = updateResult.updateInfo.buildDate || updateResult.updateInfo.message || updateResult.updateInfo.version;

                if (prefs.lastSeenForcedId !== contentId) {
                    console.log(`App Startup: New update content detected (ID: ${contentId})`);
                    shouldShowUpdate = true;
                    // Note: Do NOT persist here - wait until user has acknowledged the update
                } else {
                    console.log('App Startup: Update content already seen, skipping');
                }
            }

            if (shouldShowUpdate) {
                console.log('App Startup: Showing update window');
                splashWindow.webContents.send('update-status', 'Update available');

                let userAction = 'later';
                const handleAction = (event, action) => {
                    userAction = action;
                };
                ipcMain.once('close-update-window', handleAction);

                // Show update window and wait for it to be closed
                const updateWindow = createUpdateWindow(updateResult.updateInfo);

                // Wait for update window to be closed before proceeding to app
                await new Promise((resolve) => {
                    updateWindow.on('closed', resolve);
                });

                // Clean up listener
                ipcMain.removeListener('close-update-window', handleAction);

                // Persist that we've seen this update content (after user has acknowledged)
                if (contentId) {
                    storage.setUpdatePreferences({ lastSeenForcedId: contentId });
                }

                if (userAction === 'download') {
                    console.log('App Startup: User chose download. Opening URL and quitting.');
                    await shell.openExternal(updateResult.updateInfo.downloadUrl);
                    shouldStartApp = false;
                    app.quit();
                } else {
                    console.log('App Startup: User chose later, proceeding to app');
                }
            } else {
                console.log('App Startup: No new applicable updates found');
                splashWindow.webContents.send('update-status', 'Starting app...');
                await new Promise(r => setTimeout(r, 800));
            }
        } else {
            console.log('App Startup: No updates found');
            splashWindow.webContents.send('update-status', 'Starting app...');
            // Small delay for better UX
            await new Promise(r => setTimeout(r, 800));
        }
    } catch (error) {
        console.error('App Startup: Update check failed:', error);
    }

    // 3. Check for first run or version upgrade (config reset dialog)
    // Skip if launched with --skip-upgrade-check (after a data reset)
    if (shouldStartApp && !skipUpgradeCheck) {
        try {
            splashWindow.webContents.send('update-status', 'Checking configuration...');
            const currentVersion = app.getVersion();
            const upgradeCheck = storage.checkFirstRunOrUpgrade(currentVersion);

            if (upgradeCheck.isFirstRun || upgradeCheck.isUpgrade) {
                console.log('App Startup: Showing upgrade/config dialog', upgradeCheck);

                // Fetch release notes if available
                let releaseNotes = [];
                let releaseChannel = '';
                try {
                    const updateResult = await checkForUpdates();
                    if (updateResult.updateInfo) {
                        releaseNotes = updateResult.updateInfo.releaseNotes || [];
                        releaseChannel = updateResult.updateInfo.releaseChannel || '';
                    }
                } catch (e) {
                    console.warn('Could not fetch release notes:', e);
                }

                const upgradeInfo = {
                    ...upgradeCheck,
                    releaseNotes,
                    releaseChannel
                };

                let userAction = 'keep';
                const handleUpgradeAction = (event, action) => {
                    userAction = action;
                };
                ipcMain.once('close-upgrade-window', handleUpgradeAction);

                // Show upgrade window and wait for it to be closed
                const upgradeWindow = createUpgradeWindow(upgradeInfo);

                await new Promise((resolve) => {
                    upgradeWindow.on('closed', resolve);
                });

                // Clean up listener
                ipcMain.removeListener('close-upgrade-window', handleUpgradeAction);

                console.log('App Startup: User completed upgrade dialog with action:', userAction);

                // Handle user's choice
                if (userAction === 'reset') {
                    console.log('App Startup: Config reset requested, clearing data and restarting...');
                    // Clear all data
                    storage.clearAllData();
                    // Mark version as seen AFTER clearing so dialog won't show on restart
                    const currentVersion = app.getVersion();
                    storage.markVersionSeen(currentVersion);
                    
                    // Build relaunch args - preserve existing args and add skip flag
                    const relaunchArgs = process.argv.slice(1).filter(arg => arg !== '--skip-upgrade-check');
                    relaunchArgs.push('--skip-upgrade-check');
                    console.log('App Startup: Relaunching with args:', relaunchArgs);
                    
                    // Restart the app with flag to skip upgrade check
                    app.relaunch({ args: relaunchArgs });
                    app.quit();
                    shouldStartApp = false;
                } else if (userAction === 'keep' || userAction === 'error') {
                    // Mark version as seen so dialog won't show again
                    const currentVersion = app.getVersion();
                    storage.markVersionSeen(currentVersion);
                    console.log('App Startup: Version marked as seen, proceeding to app');
                }
            } else {
                console.log('App Startup: No upgrade dialog needed');
            }
        } catch (error) {
            console.error('App Startup: Upgrade check failed:', error);
        }
    }

    // 4. Launch Main App if permitted
    if (!splashWindow.isDestroyed()) {
        splashWindow.close();
    }

    if (shouldStartApp) {
        createMainWindow();
        
        // Initialize IPC Gateway (Phase-3 refactoring)
        // This centralizes all IPC handler registration for 58 channels
        initializeIpcGateway({
            storage,
            rateLimitManager,
            assistantManager,
            geminiSessionRef,
            mainWindow,
            sendToRenderer,
            updateGlobalShortcuts,
            createUpdateWindow,
        });
        
        // Note: All IPC handlers are now registered through the gateway
        // Legacy setup functions have been migrated:
        // - setupStorageIpcHandlers() -> storageHandler.js (24 channels)
        // - setupAssistantIpcHandlers() -> assistantHandler.js (11 channels)
        // - setupGeneralIpcHandlers() -> applicationHandler.js (9 channels)
        // - setupWindowIpcHandlers() -> windowHandler.js (7 channels)
        // - update handlers -> updateHandler.js (4 channels)
    }
});

app.on('window-all-closed', () => {
    stopMacOSAudioCapture();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopMacOSAudioCapture();
    // Flush rate limit data to disk before quitting
    rateLimitManager.flushSync();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

// ============ DEAD CODE REMOVED (Phase-3 Cleanup) ============
// setupStorageIpcHandlers() - Migrated to src/core/ipc/handlers/storageHandler.js
// setupGeneralIpcHandlers() - Migrated to src/core/ipc/handlers/applicationHandler.js
// All 58 IPC handlers are now registered through the IPC Gateway (src/core/ipc/gateway.js)




