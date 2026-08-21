const { BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('node:path');
const storage = require('../storage');

let mouseEventsIgnored = false;

/**
 * Fallback topmost enforcer using Electron's own API.
 * Used on macOS/Linux, or on Windows when the native PowerShell helper fails.
 * Toggles setAlwaysOnTop false→true to bypass Electron's internal state cache
 * and force a native Z-order update every 50 ms.
 */
function _startElectronTopmostLoop(mainWindow) {
    const id = setInterval(() => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            clearInterval(id);
            return;
        }
        if (mainWindow.isVisible()) {
            mainWindow.setAlwaysOnTop(false);
            mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
            if (mainWindow.moveTop) mainWindow.moveTop();
        }
    }, 50);
    mainWindow.on('closed', () => clearInterval(id));
}

function createWindow(sendToRenderer, geminiSessionRef) {
    // Get layout preference (default to 'normal')
    let windowWidth = 1100;
    let windowHeight = 800;

    const mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        frame: false,
        transparent: true,
        hasShadow: false,
        alwaysOnTop: true,
        type: 'toolbar',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // TODO: change to true
            backgroundThrottling: false,
            enableBlinkFeatures: 'GetDisplayMedia',
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        backgroundColor: '#00000000',
    });

    const { session, desktopCapturer } = require('electron');
    session.defaultSession.setDisplayMediaRequestHandler(
        (request, callback) => {
            desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
                callback({ video: sources[0], audio: 'loopback' });
            });
        },
        { useSystemPicker: true }
    );
    mainWindow.setResizable(true);
    mainWindow.setContentProtection(true);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Hide from Windows taskbar
    if (process.platform === 'win32') {
        try {
            mainWindow.setSkipTaskbar(true);
        } catch (error) {
            console.warn('Could not hide from taskbar:', error.message);
        }
    }

    // Hide from Mission Control on macOS
    if (process.platform === 'darwin') {
        try {
            mainWindow.setHiddenInMissionControl(true);
        } catch (error) {
            console.warn('Could not hide from Mission Control:', error.message);
        }
    }

    // Center window at the top of the screen
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const x = Math.floor((screenWidth - windowWidth) / 2);
    const y = 0;
    mainWindow.setPosition(x, y);

    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);

    if (process.platform === 'win32') {
        // ── Native Win32 topmost enforcer ────────────────────────────────────────
        // SEB fights for HWND_TOPMOST at the Win32 level. Electron's
        // setAlwaysOnTop caches its own state, so repeated calls with the same
        // value are no-ops natively and SEB wins the Z-order battle.
        //
        // Fix: grab the raw HWND and spawn a lightweight PowerShell process that
        // calls SetWindowPos(HWND_TOPMOST) in a native loop every 30 ms, beating
        // SEB at its own game without going through Electron's abstraction.
        mainWindow.webContents.once('did-finish-load', () => {
            try {
                const hwndBuffer = mainWindow.getNativeWindowHandle();
                // HWND is a 64-bit pointer on x64 Windows; read as BigInt then convert.
                const hwnd = hwndBuffer.readBigInt64LE(0).toString();

                const { spawn } = require('child_process');

                // Inline C# that PInvokes SetWindowPos in a tight loop.
                const csCode = `
using System;
using System.Runtime.InteropServices;
using System.Threading;
class T {
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr i, int x, int y, int cx, int cy, uint f);
    static void Main(string[] a) {
        IntPtr hwnd = new IntPtr(long.Parse(a[0]));
        IntPtr HWND_TOPMOST = new IntPtr(-1);
        const uint SWP_FLAGS = 0x0002 | 0x0001 | 0x0010; // NOMOVE|NOSIZE|NOACTIVATE
        while (true) {
            SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_FLAGS);
            Thread.Sleep(30);
        }
    }
}`;

                // Write the C# source to a temp file and compile+run it via PowerShell.
                // We use Add-Type inline so no file is left on disk.
                const psScript = `
$code = @'
${csCode}
'@
Add-Type -TypeDefinition $code -Language CSharp
[T]::Main(@('${hwnd}'))
`;

                const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', psScript], {
                    detached: false,
                    stdio: 'ignore',
                });

                child.on('error', err => {
                    console.warn('[topmost-enforcer] PowerShell spawn error:', err.message);
                    _startElectronTopmostLoop(mainWindow);
                });

                child.on('exit', code => {
                    // If the native helper dies unexpectedly, fall back to the
                    // Electron-level toggle loop so we keep fighting.
                    if (code !== 0 && !mainWindow.isDestroyed()) {
                        console.warn('[topmost-enforcer] native helper exited, falling back to Electron loop');
                        _startElectronTopmostLoop(mainWindow);
                    }
                });

                // Kill the native helper when our window is destroyed.
                mainWindow.on('closed', () => {
                    try {
                        child.kill();
                    } catch (_) {}
                });

                console.log('[topmost-enforcer] native Win32 loop started for HWND', hwnd);
            } catch (err) {
                console.warn('[topmost-enforcer] could not start native loop, falling back:', err.message);
                _startElectronTopmostLoop(mainWindow);
            }
        });
    } else {
        // macOS / Linux: use the Electron-level toggle loop.
        _startElectronTopmostLoop(mainWindow);
    }

    // Ensure we fight back instantly if focus is lost (lockdown software claiming focus).
    mainWindow.on('blur', () => {
        if (!mainWindow.isDestroyed() && mainWindow.isVisible()) {
            mainWindow.setAlwaysOnTop(false);
            mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
            if (mainWindow.moveTop) mainWindow.moveTop();
        }
    });

    // Re-apply if the OS strips the topmost flag.
    mainWindow.on('always-on-top-changed', (event, isAlwaysOnTop) => {
        if (!isAlwaysOnTop && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
            mainWindow.setAlwaysOnTop(false);
            mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
            if (mainWindow.moveTop) mainWindow.moveTop();
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../index.html'));

    // After window is created, initialize keybinds
    mainWindow.webContents.once('dom-ready', () => {
        setTimeout(() => {
            const defaultKeybinds = getDefaultKeybinds();
            let keybinds = defaultKeybinds;

            // Load keybinds from storage
            const savedKeybinds = storage.getKeybinds();
            if (savedKeybinds) {
                keybinds = { ...defaultKeybinds, ...savedKeybinds };
            }

            updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }, 150);
    });

    setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef);

    return mainWindow;
}

function getDefaultKeybinds() {
    const isMac = process.platform === 'darwin';
    return {
        moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
        moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
        moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
        moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
        toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
        toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
        nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
        nextStepLong: isMac ? 'Cmd+Shift+Enter' : 'Ctrl+Shift+Enter',
        previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
        nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
        scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
        scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
        emergencyErase: isMac ? 'Cmd+Shift+E' : 'Ctrl+Shift+E',
        increaseSize: isMac ? 'Cmd+=' : 'Ctrl+=',
        decreaseSize: isMac ? 'Cmd+-' : 'Ctrl+-',
    };
}

function updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef) {
    console.log('Updating global shortcuts with:', keybinds);

    // Unregister all existing shortcuts
    globalShortcut.unregisterAll();

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const moveIncrement = Math.floor(Math.min(width, height) * 0.1);

    // Register window movement shortcuts
    const movementActions = {
        moveUp: () => {
            if (!mainWindow.isVisible()) return;
            const [currentX, currentY] = mainWindow.getPosition();
            mainWindow.setPosition(currentX, currentY - moveIncrement);
        },
        moveDown: () => {
            if (!mainWindow.isVisible()) return;
            const [currentX, currentY] = mainWindow.getPosition();
            mainWindow.setPosition(currentX, currentY + moveIncrement);
        },
        moveLeft: () => {
            if (!mainWindow.isVisible()) return;
            const [currentX, currentY] = mainWindow.getPosition();
            mainWindow.setPosition(currentX - moveIncrement, currentY);
        },
        moveRight: () => {
            if (!mainWindow.isVisible()) return;
            const [currentX, currentY] = mainWindow.getPosition();
            mainWindow.setPosition(currentX + moveIncrement, currentY);
        },
    };

    // Register size change shortcuts
    const sizeActions = {
        increaseSize: () => {
            if (!mainWindow.isVisible()) return;
            const [w, h] = mainWindow.getSize();
            const growW = Math.floor(w * 0.1);
            const growH = Math.floor(h * 0.1);
            mainWindow.setSize(Math.min(w + growW, 3000), Math.min(h + growH, 2000));
        },
        decreaseSize: () => {
            if (!mainWindow.isVisible()) return;
            const [w, h] = mainWindow.getSize();
            const shrinkW = Math.floor(w * 0.1);
            const shrinkH = Math.floor(h * 0.1);
            mainWindow.setSize(Math.max(w - shrinkW, 400), Math.max(h - shrinkH, 300));
        },
    };

    Object.keys(sizeActions).forEach(action => {
        const keybind = keybinds[action];
        if (keybind) {
            try {
                globalShortcut.register(keybind, sizeActions[action]);
                console.log(`Registered ${action}: ${keybind}`);
            } catch (error) {
                console.error(`Failed to register ${action} (${keybind}):`, error);
            }
        }
    });

    // Register each movement shortcut
    Object.keys(movementActions).forEach(action => {
        const keybind = keybinds[action];
        if (keybind) {
            try {
                globalShortcut.register(keybind, movementActions[action]);
                console.log(`Registered ${action}: ${keybind}`);
            } catch (error) {
                console.error(`Failed to register ${action} (${keybind}):`, error);
            }
        }
    });

    // Register toggle visibility shortcut
    if (keybinds.toggleVisibility) {
        try {
            globalShortcut.register(keybinds.toggleVisibility, () => {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.showInactive();
                }
            });
            console.log(`Registered toggleVisibility: ${keybinds.toggleVisibility}`);
        } catch (error) {
            console.error(`Failed to register toggleVisibility (${keybinds.toggleVisibility}):`, error);
        }
    }

    // Register toggle click-through shortcut
    if (keybinds.toggleClickThrough) {
        try {
            globalShortcut.register(keybinds.toggleClickThrough, () => {
                mouseEventsIgnored = !mouseEventsIgnored;
                if (mouseEventsIgnored) {
                    mainWindow.setIgnoreMouseEvents(true, { forward: true });
                    console.log('Mouse events ignored');
                } else {
                    mainWindow.setIgnoreMouseEvents(false);
                    console.log('Mouse events enabled');
                }
                mainWindow.webContents.send('click-through-toggled', mouseEventsIgnored);
            });
            console.log(`Registered toggleClickThrough: ${keybinds.toggleClickThrough}`);
        } catch (error) {
            console.error(`Failed to register toggleClickThrough (${keybinds.toggleClickThrough}):`, error);
        }
    }

    // Register next step shortcut (either starts session or takes screenshot based on view)
    if (keybinds.nextStep) {
        try {
            globalShortcut.register(keybinds.nextStep, async () => {
                console.log('Next step shortcut triggered');
                try {
                    // Determine the shortcut key format
                    const isMac = process.platform === 'darwin';
                    const shortcutKey = isMac ? 'cmd+enter' : 'ctrl+enter';

                    // Use the new handleShortcut function
                    mainWindow.webContents.executeJavaScript(`
                        cheatingDaddy.handleShortcut('${shortcutKey}');
                    `);
                } catch (error) {
                    console.error('Error handling next step shortcut:', error);
                }
            });
            console.log(`Registered nextStep: ${keybinds.nextStep}`);
        } catch (error) {
            console.error(`Failed to register nextStep (${keybinds.nextStep}):`, error);
        }
    }

    // Register long step shortcut
    if (keybinds.nextStepLong) {
        try {
            globalShortcut.register(keybinds.nextStepLong, async () => {
                console.log('Long step shortcut triggered');
                try {
                    const isMac = process.platform === 'darwin';
                    const shortcutKey = isMac ? 'cmd+shift+enter' : 'ctrl+shift+enter';

                    mainWindow.webContents.executeJavaScript(`
                        cheatingDaddy.handleShortcut('${shortcutKey}');
                    `);
                } catch (error) {
                    console.error('Error handling long step shortcut:', error);
                }
            });
            console.log(`Registered nextStepLong: ${keybinds.nextStepLong}`);
        } catch (error) {
            console.error(`Failed to register nextStepLong (${keybinds.nextStepLong}):`, error);
        }
    }

    // Register previous response shortcut
    if (keybinds.previousResponse) {
        try {
            globalShortcut.register(keybinds.previousResponse, () => {
                console.log('Previous response shortcut triggered');
                sendToRenderer('navigate-previous-response');
            });
            console.log(`Registered previousResponse: ${keybinds.previousResponse}`);
        } catch (error) {
            console.error(`Failed to register previousResponse (${keybinds.previousResponse}):`, error);
        }
    }

    // Register next response shortcut
    if (keybinds.nextResponse) {
        try {
            globalShortcut.register(keybinds.nextResponse, () => {
                console.log('Next response shortcut triggered');
                sendToRenderer('navigate-next-response');
            });
            console.log(`Registered nextResponse: ${keybinds.nextResponse}`);
        } catch (error) {
            console.error(`Failed to register nextResponse (${keybinds.nextResponse}):`, error);
        }
    }

    // Register scroll up shortcut
    if (keybinds.scrollUp) {
        try {
            globalShortcut.register(keybinds.scrollUp, () => {
                console.log('Scroll up shortcut triggered');
                sendToRenderer('scroll-response-up');
            });
            console.log(`Registered scrollUp: ${keybinds.scrollUp}`);
        } catch (error) {
            console.error(`Failed to register scrollUp (${keybinds.scrollUp}):`, error);
        }
    }

    // Register scroll down shortcut
    if (keybinds.scrollDown) {
        try {
            globalShortcut.register(keybinds.scrollDown, () => {
                console.log('Scroll down shortcut triggered');
                sendToRenderer('scroll-response-down');
            });
            console.log(`Registered scrollDown: ${keybinds.scrollDown}`);
        } catch (error) {
            console.error(`Failed to register scrollDown (${keybinds.scrollDown}):`, error);
        }
    }

    // Register emergency erase shortcut
    if (keybinds.emergencyErase) {
        try {
            globalShortcut.register(keybinds.emergencyErase, () => {
                console.log('Emergency Erase triggered!');
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.hide();

                    if (geminiSessionRef.current) {
                        geminiSessionRef.current.close();
                        geminiSessionRef.current = null;
                    }

                    sendToRenderer('clear-sensitive-data');

                    setTimeout(() => {
                        const { app } = require('electron');
                        app.quit();
                    }, 300);
                }
            });
            console.log(`Registered emergencyErase: ${keybinds.emergencyErase}`);
        } catch (error) {
            console.error(`Failed to register emergencyErase (${keybinds.emergencyErase}):`, error);
        }
    }
}

function setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef) {
    ipcMain.on('view-changed', (event, view) => {
        if (!mainWindow.isDestroyed()) {
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width: screenWidth } = primaryDisplay.workAreaSize;

            if (view === 'assistant') {
                // Shrink window for live view
                const liveWidth = 850;
                const liveHeight = 400;
                const x = Math.floor((screenWidth - liveWidth) / 2);
                mainWindow.setSize(liveWidth, liveHeight);
                mainWindow.setPosition(x, 0);
                mainWindow.setFocusable(false); // Prevent stealing focus from lockdown browser
            } else {
                // Restore full size
                const fullWidth = 1100;
                const fullHeight = 800;
                const x = Math.floor((screenWidth - fullWidth) / 2);
                mainWindow.setSize(fullWidth, fullHeight);
                mainWindow.setPosition(x, 0);

                mainWindow.setIgnoreMouseEvents(false);
                mainWindow.setFocusable(true); // Allow normal interactions like typing
            }
        }
    });

    ipcMain.handle('window-minimize', () => {
        if (!mainWindow.isDestroyed()) {
            mainWindow.minimize();
        }
    });

    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (!mainWindow.isDestroyed()) {
            updateGlobalShortcuts(newKeybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }
    });

    ipcMain.handle('toggle-window-visibility', async event => {
        try {
            if (mainWindow.isDestroyed()) {
                return { success: false, error: 'Window has been destroyed' };
            }

            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.showInactive();
            }
            return { success: true };
        } catch (error) {
            console.error('Error toggling window visibility:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('update-sizes', async event => {
        // With the sidebar layout, the window size is user-controlled.
        // This handler is kept for compatibility but is a no-op now.
        return { success: true };
    });

    ipcMain.handle('simulate-pagedown', async event => {
        return new Promise(resolve => {
            if (process.platform === 'win32') {
                const { exec } = require('child_process');
                // Using native keybd_event is much more reliable and circumvents WScript restrictions
                const psCommand = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo); }'; [Win32]::keybd_event(0x22, 0, 0, 0); Start-Sleep -Milliseconds 50; [Win32]::keybd_event(0x22, 0, 2, 0);`;

                exec(`powershell.exe -NoProfile -NonInteractive -Command "${psCommand}"`, err => {
                    resolve({ success: !err });
                });
            } else {
                // Not supported on mac/linux yet via powershell
                resolve({ success: false, error: 'Unsupported platform' });
            }
        });
    });
}

module.exports = {
    createWindow,
    getDefaultKeybinds,
    updateGlobalShortcuts,
    setupWindowIpcHandlers,
};
