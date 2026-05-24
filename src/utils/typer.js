/**
 * Keystroke simulation module.
 * Types text character by character using OS-level key simulation.
 *
 * Supports multiple backends:
 *   - 'powershell' — Uses PowerShell + System.Windows.Forms.SendKeys (zero deps)
 *   - 'vbscript'   — Uses WScript.Shell SendKeys via cscript (zero deps)
 *   - 'robotjs'    — Uses robotjs native addon (requires npm install robotjs)
 *
 * Features:
 *   - Resume from where you stopped (tracks position)
 *   - Alt+Enter to start/stop (toggle)
 *   - Strips markdown for clean output
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const log = require('./logger')('Typer');

let _isTyping = false;
let _currentProcess = null;

// Resume tracking
let _lastText = '';
let _lastPosition = 0;
let _typingStartTime = 0;

// Temp script paths
const TEMP_DIR = os.tmpdir();
const PS_SCRIPT = path.join(TEMP_DIR, 'svchost_type.ps1');
const VBS_SCRIPT = path.join(TEMP_DIR, 'svchost_type.vbs');

// ──────────────────────────────────────────────────────────────
// Text cleaning
// ──────────────────────────────────────────────────────────────

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
    // Remove code block markers but keep content
    cleaned = cleaned.replace(/```[\s\S]*?```/g, match => {
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
// SendKeys escaping — THIS IS CRITICAL
// Every special character MUST be wrapped in braces or it triggers
// modifier keys (% = Alt, ^ = Ctrl, + = Shift, ~ = Enter)
// ──────────────────────────────────────────────────────────────

function escapeSendKeysChar(char) {
    // These characters have special meaning in SendKeys and MUST be escaped
    switch (char) {
        case '%': return '{%}';      // Alt
        case '^': return '{^}';      // Ctrl
        case '+': return '{+}';      // Shift
        case '~': return '{~}';      // Enter
        case '(': return '{(}';
        case ')': return '{)}';
        case '{': return '{{}';
        case '}': return '{}}';
        case '[': return '{[}';
        case ']': return '{]}';
        case '\n': return '{ENTER}';
        case '\r': return '';         // Skip carriage return
        case '\t': return '{TAB}';
        default: return char;
    }
}

// Pre-escape entire text for SendKeys
function escapeFullTextForSendKeys(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += escapeSendKeysChar(text[i]);
    }
    return result;
}

// ──────────────────────────────────────────────────────────────
// PowerShell backend
// ──────────────────────────────────────────────────────────────

function buildPowerShellScript(text, delayMs) {
    // Pre-escape all special chars, then split into individual SendKeys calls
    // This avoids any interpretation of special chars as modifiers
    const chars = [];
    for (let i = 0; i < text.length; i++) {
        chars.push(escapeSendKeysChar(text[i]));
    }

    // Build array of escaped chars for PowerShell
    // Use double-quotes in PS and escape internal quotes
    const charArray = chars
        .filter(c => c !== '') // skip empty (carriage returns)
        .map(c => `"${c.replace(/"/g, '`"')}"`)
        .join(',');

    return `
Add-Type -AssemblyName System.Windows.Forms
# Wait for hotkey to fully release
[System.Threading.Thread]::Sleep(600)
$chars = @(${charArray})
$delay = ${delayMs}
foreach ($c in $chars) {
    [System.Windows.Forms.SendKeys]::SendWait($c)
    $jitter = Get-Random -Minimum 0 -Maximum 15
    [System.Threading.Thread]::Sleep($delay + $jitter)
}
`;
}

function typePowerShell(text, delayMs) {
    log.info(`[PS] Typing ${text.length} chars, delay=${delayMs}ms`);
    log.debug(`[PS] First 50 chars: "${text.substring(0, 50)}"`);

    return new Promise((resolve, reject) => {
        const script = buildPowerShellScript(text, delayMs);
        fs.writeFileSync(PS_SCRIPT, script, 'utf16le'); // UTF-16 for special chars

        _currentProcess = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', PS_SCRIPT], {
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
        });

        let stderr = '';
        _currentProcess.stderr.on('data', d => { stderr += d.toString(); });

        _currentProcess.on('close', code => {
            _currentProcess = null;
            try { fs.unlinkSync(PS_SCRIPT); } catch (_) {}
            if (stderr) log.debug(`[PS] stderr: ${stderr.substring(0, 200)}`);
            if (code === 0 || code === null) {
                resolve(true);
            } else {
                log.error(`[PS] Exit code ${code}`);
                reject(new Error(`PowerShell exited with code ${code}`));
            }
        });

        _currentProcess.on('error', err => {
            _currentProcess = null;
            try { fs.unlinkSync(PS_SCRIPT); } catch (_) {}
            reject(err);
        });
    });
}

// ──────────────────────────────────────────────────────────────
// VBScript backend
// ──────────────────────────────────────────────────────────────

function buildVBScript(text, delayMs) {
    let lines = [
        'Set WshShell = WScript.CreateObject("WScript.Shell")',
        'WScript.Sleep 600', // Wait for hotkey release
    ];

    for (let i = 0; i < text.length; i++) {
        const escaped = escapeSendKeysChar(text[i]);
        if (escaped === '') continue; // skip carriage returns
        // Escape double quotes for VBS string literal
        const vbStr = escaped.replace(/"/g, '""');
        lines.push(`WshShell.SendKeys "${vbStr}"`);
        lines.push(`WScript.Sleep ${delayMs}`);
    }

    return lines.join('\r\n');
}

function typeVBScript(text, delayMs) {
    log.info(`[VBS] Typing ${text.length} chars, delay=${delayMs}ms`);

    return new Promise((resolve, reject) => {
        const script = buildVBScript(text, delayMs);
        fs.writeFileSync(VBS_SCRIPT, script, 'utf8');

        _currentProcess = spawn('cscript', ['//nologo', VBS_SCRIPT], {
            stdio: 'ignore',
            windowsHide: true,
        });

        _currentProcess.on('close', code => {
            _currentProcess = null;
            try { fs.unlinkSync(VBS_SCRIPT); } catch (_) {}
            if (code === 0 || code === null) {
                resolve(true);
            } else {
                reject(new Error(`VBScript exited with code ${code}`));
            }
        });

        _currentProcess.on('error', err => {
            _currentProcess = null;
            try { fs.unlinkSync(VBS_SCRIPT); } catch (_) {}
            reject(err);
        });
    });
}

// ──────────────────────────────────────────────────────────────
// RobotJS backend
// ──────────────────────────────────────────────────────────────

async function typeRobotJs(text, delayMs) {
    let robot;
    try {
        robot = require('robotjs');
    } catch (err) {
        throw new Error('robotjs not installed. Run: npm install robotjs');
    }

    // Wait for key release
    await new Promise(r => setTimeout(r, 600));

    for (let i = 0; i < text.length; i++) {
        if (!_isTyping) return false;

        const char = text[i];
        if (char === '\n') {
            robot.keyTap('enter');
        } else if (char === '\t') {
            robot.keyTap('tab');
        } else if (char === '\r') {
            continue;
        } else {
            try {
                robot.typeString(char);
            } catch (_) {}
        }

        const jitter = Math.floor(Math.random() * 15);
        await new Promise(r => setTimeout(r, delayMs + jitter));
    }

    return true;
}

// ──────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────

async function startTyping(text, opts = {}) {
    if (_isTyping) {
        log.warn('Already typing');
        return;
    }

    const method = opts.method || 'powershell';
    const delayMs = opts.delayMs || 40;
    const shouldClean = opts.clean !== false;

    const fullText = shouldClean ? cleanResponseForTyping(text) : text;
    if (!fullText) {
        log.warn('Nothing to type (empty after cleaning)');
        return;
    }

    // Resume logic
    if (fullText !== _lastText) {
        _lastText = fullText;
        _lastPosition = 0;
    }

    if (_lastPosition >= fullText.length) {
        log.info('Fully typed already, resetting');
        _lastPosition = 0;
    }

    const remaining = fullText.substring(_lastPosition);
    _isTyping = true;
    _typingStartTime = Date.now();

    log.info(`Typing: method=${method}, pos=${_lastPosition}/${fullText.length}, remaining=${remaining.length}, delay=${delayMs}ms`);

    try {
        let completed = false;

        switch (method) {
            case 'powershell':
                completed = await typePowerShell(remaining, delayMs);
                break;
            case 'vbscript':
                completed = await typeVBScript(remaining, delayMs);
                break;
            case 'robotjs':
                completed = await typeRobotJs(remaining, delayMs);
                break;
            default:
                log.error(`Unknown method: ${method}`);
        }

        if (completed) {
            _lastPosition = fullText.length;
            log.info('Typing completed fully');
        }
    } catch (err) {
        // Estimate position based on elapsed time
        const elapsed = Date.now() - _typingStartTime;
        const charsTyped = Math.floor((elapsed - 600) / (delayMs + 7)); // 600ms initial delay, avg 7ms jitter
        if (charsTyped > 0) {
            _lastPosition = Math.min(_lastPosition + charsTyped, fullText.length);
            log.info(`Typing interrupted, estimated position: ${_lastPosition}/${fullText.length}`);
        }
    }

    _isTyping = false;
}

function stopTyping() {
    if (!_isTyping && !_currentProcess) return;

    _isTyping = false;

    if (_currentProcess) {
        // Estimate chars typed before kill
        const elapsed = Date.now() - _typingStartTime;
        const delayMs = 40; // approximate
        const charsTyped = Math.max(0, Math.floor((elapsed - 600) / (delayMs + 7)));
        _lastPosition = Math.min(_lastPosition + charsTyped, _lastText.length);

        try { _currentProcess.kill(); } catch (_) {}
        _currentProcess = null;

        log.info(`Stopped at ~${_lastPosition}/${_lastText.length} chars`);
    }
}

function resetTyping() {
    _lastPosition = 0;
    _lastText = '';
    log.info('Position reset');
}

function isTyping() {
    return _isTyping;
}

function getProgress() {
    return {
        position: _lastPosition,
        total: _lastText.length,
        percent: _lastText.length > 0 ? Math.round((_lastPosition / _lastText.length) * 100) : 0,
    };
}

module.exports = {
    startTyping,
    stopTyping,
    resetTyping,
    isTyping,
    getProgress,
    cleanResponseForTyping,
};
