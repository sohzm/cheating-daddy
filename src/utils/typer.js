/**
 * Keystroke simulation module.
 * Types text character by character using OS-level key simulation.
 *
 * Supports multiple backends:
 *   - 'powershell' — Uses PowerShell + System.Windows.Forms.SendKeys (zero deps)
 *   - 'vbscript'   — Uses WScript.Shell SendKeys via cscript (zero deps)
 *   - 'robotjs'    — Uses robotjs native addon (requires npm install robotjs)
 *
 * Usage from main process:
 *   const typer = require('./utils/typer');
 *   typer.startTyping(text, { method: 'powershell', delayMs: 40 });
 *   typer.stopTyping();
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const log = require('./logger')('Typer');

let _isTyping = false;
let _abortController = null;
let _currentProcess = null;

// Characters that need escaping in SendKeys
const SENDKEYS_SPECIAL = {
    '+': '{+}',
    '^': '{^}',
    '%': '{%}',
    '~': '{~}',
    '(': '{(}',
    ')': '{)}',
    '{': '{{}',
    '}': '{}}',
    '[': '{[}',
    ']': '{]}',
};

function escapeSendKeys(char) {
    return SENDKEYS_SPECIAL[char] || char;
}

// Strip markdown/comments from response for clean typing
function cleanResponseForTyping(text) {
    if (!text) return '';
    let cleaned = text;
    // Remove markdown bold/italic
    cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');
    cleaned = cleaned.replace(/__(.+?)__/g, '$1');
    cleaned = cleaned.replace(/_(.+?)_/g, '$1');
    // Remove markdown headers
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
    // Remove code block markers
    cleaned = cleaned.replace(/```[\s\S]*?```/g, match => {
        // Keep the content inside code blocks, just remove the markers
        return match.replace(/```\w*\n?/g, '').replace(/```/g, '');
    });
    // Remove inline code backticks
    cleaned = cleaned.replace(/`(.+?)`/g, '$1');
    // Remove bullet points
    cleaned = cleaned.replace(/^[-*]\s+/gm, '');
    // Collapse multiple newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned.trim();
}

// ──────────────────────────────────────────────────────────────
// Method 1: PowerShell SendKeys
// ──────────────────────────────────────────────────────────────

async function typePowerShell(text, delayMs = 40) {
    log.info(`[PowerShell] Starting to type ${text.length} chars, delay=${delayMs}ms`);

    // Write a temp PS1 script that types char by char
    const tempDir = require('os').tmpdir();
    const scriptPath = path.join(tempDir, 'svchost_typer.ps1');

    // Escape text for PowerShell string
    const escapedText = text.replace(/'/g, "''");

    const script = `
Add-Type -AssemblyName System.Windows.Forms
$text = '${escapedText}'
$delay = ${delayMs}
for ($i = 0; $i -lt $text.Length; $i++) {
    $char = $text[$i]
    if ($char -eq '+') { [System.Windows.Forms.SendKeys]::SendWait('{+}') }
    elseif ($char -eq '^') { [System.Windows.Forms.SendKeys]::SendWait('{^}') }
    elseif ($char -eq '%') { [System.Windows.Forms.SendKeys]::SendWait('{%}') }
    elseif ($char -eq '~') { [System.Windows.Forms.SendKeys]::SendWait('{~}') }
    elseif ($char -eq '(') { [System.Windows.Forms.SendKeys]::SendWait('{(}') }
    elseif ($char -eq ')') { [System.Windows.Forms.SendKeys]::SendWait('{)}') }
    elseif ($char -eq '{') { [System.Windows.Forms.SendKeys]::SendWait('{{}') }
    elseif ($char -eq '}') { [System.Windows.Forms.SendKeys]::SendWait('{}}') }
    elseif ($char -eq [char]13 -or $char -eq [char]10) { [System.Windows.Forms.SendKeys]::SendWait('{ENTER}') }
    elseif ($char -eq [char]9) { [System.Windows.Forms.SendKeys]::SendWait('{TAB}') }
    else { [System.Windows.Forms.SendKeys]::SendWait($char.ToString()) }
    Start-Sleep -Milliseconds $delay
}
`;

    fs.writeFileSync(scriptPath, script, 'utf8');

    return new Promise((resolve, reject) => {
        _currentProcess = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
            stdio: 'ignore',
            windowsHide: true,
        });

        _currentProcess.on('close', code => {
            _currentProcess = null;
            _isTyping = false;
            try { fs.unlinkSync(scriptPath); } catch (_) {}
            if (code === 0) {
                log.info('[PowerShell] Typing completed');
                resolve();
            } else {
                log.error(`[PowerShell] Exited with code ${code}`);
                reject(new Error(`PowerShell typer exited with code ${code}`));
            }
        });

        _currentProcess.on('error', err => {
            _currentProcess = null;
            _isTyping = false;
            try { fs.unlinkSync(scriptPath); } catch (_) {}
            log.error('[PowerShell] Process error:', err.message);
            reject(err);
        });
    });
}

// ──────────────────────────────────────────────────────────────
// Method 2: VBScript SendKeys
// ──────────────────────────────────────────────────────────────

async function typeVBScript(text, delayMs = 40) {
    log.info(`[VBScript] Starting to type ${text.length} chars, delay=${delayMs}ms`);

    const tempDir = require('os').tmpdir();
    const scriptPath = path.join(tempDir, 'svchost_typer.vbs');

    // Build VBScript that types char by char
    let vbLines = ['Set WshShell = WScript.CreateObject("WScript.Shell")'];

    for (const char of text) {
        let sendChar;
        if (char === '\n' || char === '\r') {
            sendChar = '{ENTER}';
        } else if (char === '\t') {
            sendChar = '{TAB}';
        } else if (SENDKEYS_SPECIAL[char]) {
            sendChar = SENDKEYS_SPECIAL[char];
        } else {
            sendChar = char;
        }
        // Escape quotes for VBS string
        const vbStr = sendChar.replace(/"/g, '""');
        vbLines.push(`WshShell.SendKeys "${vbStr}"`);
        vbLines.push(`WScript.Sleep ${delayMs}`);
    }

    fs.writeFileSync(scriptPath, vbLines.join('\r\n'), 'utf8');

    return new Promise((resolve, reject) => {
        _currentProcess = spawn('cscript', ['//nologo', scriptPath], {
            stdio: 'ignore',
            windowsHide: true,
        });

        _currentProcess.on('close', code => {
            _currentProcess = null;
            _isTyping = false;
            try { fs.unlinkSync(scriptPath); } catch (_) {}
            if (code === 0) {
                log.info('[VBScript] Typing completed');
                resolve();
            } else {
                log.error(`[VBScript] Exited with code ${code}`);
                reject(new Error(`VBScript typer exited with code ${code}`));
            }
        });

        _currentProcess.on('error', err => {
            _currentProcess = null;
            _isTyping = false;
            try { fs.unlinkSync(scriptPath); } catch (_) {}
            log.error('[VBScript] Process error:', err.message);
            reject(err);
        });
    });
}

// ──────────────────────────────────────────────────────────────
// Method 3: robotjs (requires npm install robotjs)
// ──────────────────────────────────────────────────────────────

async function typeRobotJs(text, delayMs = 40) {
    log.info(`[RobotJS] Starting to type ${text.length} chars, delay=${delayMs}ms`);

    let robot;
    try {
        robot = require('robotjs');
    } catch (err) {
        log.error('[RobotJS] Module not installed. Run: npm install robotjs');
        throw new Error('robotjs not installed. Run: npm install robotjs');
    }

    robot.setKeyboardDelay(delayMs);

    for (let i = 0; i < text.length; i++) {
        if (!_isTyping) {
            log.info('[RobotJS] Typing aborted');
            return;
        }

        const char = text[i];
        if (char === '\n') {
            robot.keyTap('enter');
        } else if (char === '\t') {
            robot.keyTap('tab');
        } else {
            try {
                robot.typeString(char);
            } catch (_) {
                // Some chars may fail, skip them
            }
        }

        // Add slight randomness to look human
        const jitter = Math.floor(Math.random() * 20) - 10;
        await new Promise(r => setTimeout(r, Math.max(10, delayMs + jitter)));
    }

    _isTyping = false;
    log.info('[RobotJS] Typing completed');
}

// ──────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────

/**
 * Start typing text using the specified method.
 * @param {string} text - Raw response text (will be cleaned of markdown)
 * @param {object} opts
 * @param {string} opts.method - 'powershell' | 'vbscript' | 'robotjs'
 * @param {number} opts.delayMs - Delay between keystrokes in ms (default 40)
 * @param {boolean} opts.clean - Whether to strip markdown (default true)
 */
async function startTyping(text, opts = {}) {
    if (_isTyping) {
        log.warn('Already typing, stopping previous');
        stopTyping();
        await new Promise(r => setTimeout(r, 100));
    }

    const method = opts.method || 'powershell';
    const delayMs = opts.delayMs || 40;
    const shouldClean = opts.clean !== false;

    const finalText = shouldClean ? cleanResponseForTyping(text) : text;
    if (!finalText) {
        log.warn('Nothing to type (empty after cleaning)');
        return;
    }

    _isTyping = true;
    log.info(`Starting typing: method=${method}, chars=${finalText.length}, delay=${delayMs}ms`);

    try {
        switch (method) {
            case 'powershell':
                await typePowerShell(finalText, delayMs);
                break;
            case 'vbscript':
                await typeVBScript(finalText, delayMs);
                break;
            case 'robotjs':
                await typeRobotJs(finalText, delayMs);
                break;
            default:
                log.error(`Unknown typing method: ${method}`);
                _isTyping = false;
        }
    } catch (err) {
        log.error('Typing failed:', err.message);
        _isTyping = false;
    }
}

/**
 * Stop typing immediately.
 */
function stopTyping() {
    _isTyping = false;
    if (_currentProcess) {
        try {
            _currentProcess.kill();
        } catch (_) {}
        _currentProcess = null;
        log.info('Typing stopped (process killed)');
    }
}

/**
 * Check if currently typing.
 */
function isTyping() {
    return _isTyping;
}

module.exports = {
    startTyping,
    stopTyping,
    isTyping,
    cleanResponseForTyping,
};
