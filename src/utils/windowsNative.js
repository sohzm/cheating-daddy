// windowsNative.js - Native Windows API calls for advanced stealth features

/**
 * Set Windows extended window style to hide from screen capture picker
 * This uses the WS_EX_TOOLWINDOW style which excludes the window from
 * appearing in screen share/capture dialogs
 * @param {Buffer} nativeHandle - The native window handle from Electron
 */
function setWindowExStyle(nativeHandle) {
    if (process.platform !== 'win32') {
        console.warn('setWindowExStyle is only supported on Windows');
        return;
    }

    try {
        // Use node-ffi-napi or koffi to call Windows API
        // We'll use a simpler approach with edge-js or just native node addons

        // For now, we'll use a PowerShell script approach as a fallback
        // This is less ideal but works without additional dependencies

        const { execSync } = require('child_process');

        // Convert Buffer to hex string for the window handle
        let hwnd;
        if (Buffer.isBuffer(nativeHandle)) {
            // On 64-bit Windows, handle is 8 bytes
            if (nativeHandle.length === 8) {
                hwnd = nativeHandle.readBigUInt64LE(0);
            } else if (nativeHandle.length === 4) {
                hwnd = nativeHandle.readUInt32LE(0);
            } else {
                console.warn('Unexpected window handle size:', nativeHandle.length);
                return;
            }
        } else {
            hwnd = nativeHandle;
        }

        // Create a temporary PowerShell script file to avoid command line escaping issues
        const os = require('os');
        const path = require('path');
        const fs = require('fs');
        const tempDir = os.tmpdir();
        const scriptPath = path.join(tempDir, `set-window-style-${Date.now()}.ps1`);

        const psScript = `Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll")]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    public const int GWL_EXSTYLE = -20;
    public const int WS_EX_TOOLWINDOW = 0x00000080;
    public const int WS_EX_APPWINDOW = 0x00040000;
}
'@

$hwnd = [IntPtr]${hwnd}
$exStyle = [Win32]::GetWindowLong($hwnd, [Win32]::GWL_EXSTYLE)
$newStyle = ($exStyle -bor [Win32]::WS_EX_TOOLWINDOW) -band (-bnot [Win32]::WS_EX_APPWINDOW)
[Win32]::SetWindowLong($hwnd, [Win32]::GWL_EXSTYLE, $newStyle)
`;

        // Write script to temp file
        fs.writeFileSync(scriptPath, psScript, 'utf8');

        try {
            // Execute PowerShell script from file with shorter timeout and async cleanup
            execSync(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "${scriptPath}"`, {
                windowsHide: true,
                timeout: 2000,
                stdio: 'ignore'
            });
            console.log('Successfully applied WS_EX_TOOLWINDOW style to hide from screen capture picker');
        } catch (timeoutError) {
            // If timeout, the command might still complete, so don't treat as critical error
            console.log('PowerShell command timed out, but may have succeeded');
        } finally {
            // Clean up temp file asynchronously to avoid blocking
            setTimeout(() => {
                try {
                    fs.unlinkSync(scriptPath);
                } catch (err) {
                    // Ignore cleanup errors
                }
            }, 100);
        }
    } catch (error) {
        console.error('Failed to set Windows extended style:', error.message);

        // Try alternative approach using ffi-napi if available
        try {
            const ffi = require('ffi-napi');
            const ref = require('ref-napi');

            const user32 = ffi.Library('user32', {
                'GetWindowLongPtrA': ['long', ['long', 'int']],
                'SetWindowLongPtrA': ['long', ['long', 'int', 'long']]
            });

            const GWL_EXSTYLE = -20;
            const WS_EX_TOOLWINDOW = 0x00000080;
            const WS_EX_APPWINDOW = 0x00040000;

            let hwndLong;
            if (Buffer.isBuffer(nativeHandle)) {
                hwndLong = nativeHandle.length === 8
                    ? Number(nativeHandle.readBigUInt64LE(0))
                    : nativeHandle.readUInt32LE(0);
            } else {
                hwndLong = Number(nativeHandle);
            }

            const exStyle = user32.GetWindowLongPtrA(hwndLong, GWL_EXSTYLE);
            const newStyle = (exStyle | WS_EX_TOOLWINDOW) & ~WS_EX_APPWINDOW;
            user32.SetWindowLongPtrA(hwndLong, GWL_EXSTYLE, newStyle);

            console.log('Successfully applied WS_EX_TOOLWINDOW style using ffi-napi');
        } catch (ffiError) {
            console.warn('ffi-napi approach also failed:', ffiError.message);
            console.warn('Window may still appear in screen share picker. Install ffi-napi for better stealth.');
        }
    }
}

/**
 * Alternative approach: Use koffi if available
 * koffi is a faster, more modern alternative to ffi-napi
 */
function setWindowExStyleWithKoffi(nativeHandle) {
    try {
        const koffi = require('koffi');

        const lib = koffi.load('user32.dll');
        const GetWindowLongPtrA = lib.func('__stdcall', 'GetWindowLongPtrA', 'long', ['void*', 'int']);
        const SetWindowLongPtrA = lib.func('__stdcall', 'SetWindowLongPtrA', 'long', ['void*', 'int', 'long']);

        const GWL_EXSTYLE = -20;
        const WS_EX_TOOLWINDOW = 0x00000080;
        const WS_EX_APPWINDOW = 0x00040000;

        const hwndPtr = koffi.decode(nativeHandle, 'void*');
        const exStyle = GetWindowLongPtrA(hwndPtr, GWL_EXSTYLE);
        const newStyle = (exStyle | WS_EX_TOOLWINDOW) & ~WS_EX_APPWINDOW;
        SetWindowLongPtrA(hwndPtr, GWL_EXSTYLE, newStyle);

        console.log('Successfully applied WS_EX_TOOLWINDOW style using koffi');
        return true;
    } catch (error) {
        console.warn('koffi approach failed:', error.message);
        return false;
    }
}

module.exports = {
    setWindowExStyle,
    setWindowExStyleWithKoffi
};
