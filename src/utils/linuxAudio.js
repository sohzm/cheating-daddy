const { spawn, execFile } = require('child_process');

const SAMPLE_RATE = 24000;
const BYTES_PER_SAMPLE = 2;
const CHANNELS = 1;
const CHUNK_DURATION = 0.1;
const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * CHUNK_DURATION;

const TAP_SINK_NAME = 'cd_tap';
const PW_RECORD_PREFIX = 'pw-record:input_';

const MAX_QUEUED_CHUNKS = 20;
const START_WATCHDOG_TIMEOUT = 1500;
const MAX_START_ATTEMPTS = 3;
const MAX_RESPAWN_ATTEMPTS = 3;
const RESPAWN_DELAY = 1000;
const SINK_POLL_INTERVAL = 5000;
const LINK_SETUP_TIMEOUT = 2000;
const OVERFLOW_WARN_INTERVAL = 1000;

let audioProc = null;
let audioBuffer = Buffer.alloc(0);
let receivedAnyData = false;
let linksConfirmed = false;
let capturedSink = null;
let mode = 'tap';
let stopped = true;

let sendQueue = [];
let sending = false;
let lastOverflowWarn = 0;

let startWatchdog = null;
let sinkPollTimer = null;
let respawnTimer = null;
let startAttempts = 0;
let respawnAttempts = 0;

let isIntercepting = false;
let originalDefaultSink = null;
let loopbackSink = null;

let onChunk = null;
let onStatus = null;

function execCommand(command, args, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
        execFile(command, args, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`${command} ${args.join(' ')} failed: ${error.message}${stderr ? ` - ${stderr.trim()}` : ''}`));
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

function emitStatus(level, message) {
    console.log(`[linux-audio:${level}] ${message}`);
    if (typeof onStatus === 'function') {
        onStatus(level, message);
    }
}

async function getDefaultSink() {
    return execCommand('pactl', ['get-default-sink']);
}

function findModuleIds(output, moduleName, argSubstring) {
    const ids = [];
    const re = /Module #(\d+)\n((?:[ \t].*\n?)*)/g;
    let match;
    while ((match = re.exec(output)) !== null) {
        const block = match[2];
        const nameMatch = block.match(/Name:\s*(\S+)/);
        if (!nameMatch || nameMatch[1] !== moduleName) continue;
        if (argSubstring && !block.includes(argSubstring)) continue;
        ids.push(match[1]);
    }
    return ids;
}

async function unloadModulesForTapSink() {
    try {
        const modulesOutput = await execCommand('pactl', ['list', 'modules'], 3000);
        const ids = [
            ...findModuleIds(modulesOutput, 'module-null-sink', TAP_SINK_NAME),
            ...findModuleIds(modulesOutput, 'module-loopback', `${TAP_SINK_NAME}.monitor`),
        ];
        for (const id of ids) {
            try {
                await execCommand('pactl', ['unload-module', id], 3000);
                emitStatus('info', `Unloaded stale module #${id}`);
            } catch (error) {
                console.warn('Failed to unload stale module', id, error.message);
            }
        }
    } catch (error) {
        console.warn('Failed to inspect pulse modules:', error.message);
    }
}

async function setupInterception() {
    const realSink = await getDefaultSink();
    // Record before switching so restoreInterception can always put the
    // user's sink back, regardless of which call site started interception.
    originalDefaultSink = realSink;

    await unloadModulesForTapSink();

    const tapOutput = await execCommand('pactl', ['load-module', 'module-null-sink', `sink_name=${TAP_SINK_NAME}`], 3000);
    const tapModuleId = Number.parseInt(tapOutput, 10);
    if (!Number.isFinite(tapModuleId)) {
        throw new Error('Failed to create virtual sink (no module id returned)');
    }
    emitStatus('info', `Virtual sink created (module #${tapModuleId})`);

    // Mark early so a partial failure below still cleans up the tap sink.
    isIntercepting = true;

    try {
        const loopbackOutput = await execCommand(
            'pactl',
            ['load-module', 'module-loopback', `source=${TAP_SINK_NAME}.monitor`, `sink=${realSink}`],
            3000
        );
        const loopbackModuleId = Number.parseInt(loopbackOutput, 10);
        if (!Number.isFinite(loopbackModuleId)) {
            throw new Error('Failed to create loopback (no module id returned)');
        }
        loopbackSink = realSink;
        emitStatus('info', `Loopback created (module #${loopbackModuleId})`);

        const switched = await setDefaultSinkVerified(TAP_SINK_NAME);
        if (switched) {
            emitStatus('info', `Default sink temporarily switched to ${TAP_SINK_NAME}`);
        } else {
            emitStatus('warning', `Could not switch default sink to ${TAP_SINK_NAME} - interception may capture nothing`);
        }
    } catch (error) {
        await restoreInterception();
        throw error;
    }
}

async function setDefaultSinkVerified(sinkName, retries = 5) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        await execCommand('pactl', ['set-default-sink', sinkName], 3000);
        const current = await getDefaultSink();
        if (current === sinkName) return true;
        if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    return false;
}

async function restoreInterception() {
    if (!isIntercepting) return;
    isIntercepting = false;

    if (originalDefaultSink) {
        try {
            const currentDefault = await getDefaultSink();
            if (currentDefault === TAP_SINK_NAME) {
                const restored = await setDefaultSinkVerified(originalDefaultSink);
                emitStatus(
                    'info',
                    restored ? `Default sink restored to ${originalDefaultSink}` : `Failed to restore default sink to ${originalDefaultSink}`
                );
            }
        } catch (error) {
            console.warn('Failed to restore default sink:', error.message);
        }
        originalDefaultSink = null;
    }

    try {
        const modulesOutput = await execCommand('pactl', ['list', 'modules'], 3000);
        const loopbackIds = findModuleIds(modulesOutput, 'module-loopback', `${TAP_SINK_NAME}.monitor`);
        for (const id of loopbackIds) {
            await execCommand('pactl', ['unload-module', id], 3000);
        }
        const tapIds = findModuleIds(modulesOutput, 'module-null-sink', TAP_SINK_NAME);
        for (const id of tapIds) {
            await execCommand('pactl', ['unload-module', id], 3000);
        }
        emitStatus('info', 'Virtual sink modules unloaded');
    } catch (error) {
        console.warn('Failed to unload tap sink modules:', error.message);
    }

    loopbackSink = null;
}

async function rePointLoopback(newSink) {
    if (!isIntercepting || loopbackSink === newSink) return;
    try {
        const modulesOutput = await execCommand('pactl', ['list', 'modules'], 3000);
        const loopbackIds = findModuleIds(modulesOutput, 'module-loopback', `${TAP_SINK_NAME}.monitor`);
        for (const id of loopbackIds) {
            await execCommand('pactl', ['unload-module', id], 3000);
        }
        await execCommand('pactl', ['load-module', 'module-loopback', `source=${TAP_SINK_NAME}.monitor`, `sink=${newSink}`], 3000);
        loopbackSink = newSink;
        emitStatus('info', `Loopback re-pointed to ${newSink}`);
    } catch (error) {
        emitStatus('warning', `Failed to re-point loopback: ${error.message}`);
    }
}

function killProcess() {
    const proc = audioProc;
    audioProc = null;
    if (proc && !proc.killed) {
        proc.kill('SIGTERM');
    }
}

function dispatchChunk(chunk) {
    if (sendQueue.length >= MAX_QUEUED_CHUNKS) {
        sendQueue.shift();
        const now = Date.now();
        if (now - lastOverflowWarn >= OVERFLOW_WARN_INTERVAL) {
            lastOverflowWarn = now;
            emitStatus('warning', 'Audio send queue overflow - dropping oldest chunk');
        }
    }
    sendQueue.push(chunk);
    drainQueue();
}

async function drainQueue() {
    if (sending) return;
    sending = true;
    try {
        while (sendQueue.length > 0) {
            const chunk = sendQueue.shift();
            try {
                await onChunk(chunk);
            } catch (error) {
                console.error('Linux audio chunk consumer error:', error.message);
            }
        }
    } finally {
        sending = false;
    }
}

function handleStdoutData(chunk) {
    if (!receivedAnyData) {
        receivedAnyData = true;
        if (startWatchdog) {
            clearTimeout(startWatchdog);
            startWatchdog = null;
        }
        startAttempts = 0;
        respawnAttempts = 0;
        emitStatus('info', 'Audio data flowing');
    }

    audioBuffer = audioBuffer.length === 0 ? chunk : Buffer.concat([audioBuffer, chunk]);

    while (audioBuffer.length >= CHUNK_SIZE) {
        const piece = audioBuffer.subarray(0, CHUNK_SIZE);
        audioBuffer = audioBuffer.subarray(CHUNK_SIZE);
        // Discard data captured before the monitor link is confirmed - it may
        // come from the microphone fallback
        if (linksConfirmed) {
            dispatchChunk(piece);
        }
    }

    const maxBuffered = CHUNK_SIZE * MAX_QUEUED_CHUNKS;
    if (audioBuffer.length > maxBuffered) {
        audioBuffer = audioBuffer.subarray(audioBuffer.length - maxBuffered);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function findRecordInputPeers() {
    const output = await execCommand('pw-link', ['-l'], 3000);
    const peers = {};
    const lines = output.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(new RegExp(`^${PW_RECORD_PREFIX}(FL|FR)$`));
        if (match) {
            for (let j = i + 1; j < lines.length && j < i + 4; j++) {
                const peerMatch = lines[j].match(/\|<\-\s*(.+)/);
                if (peerMatch) {
                    peers[match[1]] = peerMatch[1].trim();
                    break;
                }
            }
        }
    }
    return peers;
}

async function ensureCaptureLinks(target) {
    // Wait for the pw-record input ports to appear in the graph
    let appeared = false;
    const deadline = Date.now() + LINK_SETUP_TIMEOUT;
    while (Date.now() < deadline) {
        try {
            const ports = await execCommand('pw-link', ['-i'], 2000);
            if (ports.includes(`${PW_RECORD_PREFIX}FL`)) {
                appeared = true;
                break;
            }
        } catch (error) {
            console.warn('Port listing failed:', error.message);
        }
        await sleep(100);
    }
    if (!appeared) return false;

    // Disconnect any fallback links (pw-record falls back to the microphone
    // when the target sink's monitor is idle)
    try {
        const peers = await findRecordInputPeers();
        for (const channel of ['FL', 'FR']) {
            if (peers[channel]) {
                await execCommand('pw-link', ['-d', peers[channel], `${PW_RECORD_PREFIX}${channel}`], 2000);
            }
        }
    } catch (error) {
        console.warn('Failed to disconnect fallback links:', error.message);
    }

    // Force links from the target sink's monitor ports
    for (const channel of ['FL', 'FR']) {
        try {
            await execCommand('pw-link', [`${target}:monitor_${channel}`, `${PW_RECORD_PREFIX}${channel}`], 2000);
        } catch (error) {
            console.warn(`Failed to link ${target}:monitor_${channel}:`, error.message);
            return false;
        }
    }

    // Verify with retries - link creation is asynchronous
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const peers = await findRecordInputPeers();
            if (peers.FL && peers.FL.startsWith(`${target}:monitor_`)) return true;
        } catch (error) {
            console.warn('Link verification failed:', error.message);
        }
        await sleep(100);
    }
    return false;
}

async function getSinkState(target) {
    try {
        const sinks = await execCommand('pactl', ['list', 'sinks', 'short'], 3000);
        const line = sinks.split('\n').find(entry => entry.split('\t')[1] === target);
        if (!line) return 'MISSING';
        return line.includes('RUNNING') ? 'RUNNING' : 'IDLE';
    } catch (error) {
        return 'UNKNOWN';
    }
}

function restartCapture(target, reason, proc) {
    if (proc && proc !== audioProc) return;
    emitStatus('warning', `${reason} - restarting capture`);
    killProcess();
    if (startAttempts < MAX_START_ATTEMPTS) {
        startAttempts++;
        spawnCapture(target);
    } else {
        emitStatus('error', `Audio capture failed: ${reason}`);
        stopLinuxAudioCapture();
    }
}

async function postSpawnLinkSetup(target, proc) {
    const linked = await ensureCaptureLinks(target);
    if (stopped || proc !== audioProc) return;
    if (!linked) {
        restartCapture(target, 'Unable to link capture to the output monitor', proc);
        return;
    }
    linksConfirmed = true;
    emitStatus('info', 'Capture linked to output monitor');
    armDataWatchdog(target);
}

function armDataWatchdog(target) {
    if (startWatchdog) {
        clearTimeout(startWatchdog);
    }
    const proc = audioProc;
    startWatchdog = setTimeout(async () => {
        startWatchdog = null;
        if (stopped || proc !== audioProc) return;
        if (receivedAnyData) return;

        const sinkState = await getSinkState(target);
        if (sinkState === 'MISSING') {
            restartCapture(target, 'Capture target sink disappeared', proc);
            return;
        }
        if (sinkState === 'IDLE') {
            // Healthy but silent - keep waiting for audio to start
            armDataWatchdog(target);
            return;
        }
        // Sink is running but no data is flowing - capture is broken
        restartCapture(target, 'No audio data while sink is running', proc);
    }, START_WATCHDOG_TIMEOUT);
}

function handleUnexpectedClose(code) {
    if (stopped) return;
    audioProc = null;
    if (respawnAttempts >= MAX_RESPAWN_ATTEMPTS) {
        emitStatus('error', `Audio capture stopped unexpectedly (exit code ${code})`);
        stopLinuxAudioCapture();
        return;
    }
    respawnAttempts++;
    emitStatus('warning', `Audio capture exited (code ${code}) - respawning (${respawnAttempts}/${MAX_RESPAWN_ATTEMPTS})`);
    respawnTimer = setTimeout(async () => {
        respawnTimer = null;
        if (stopped) return;
        try {
            let target = capturedSink;
            if (isIntercepting) {
                target = TAP_SINK_NAME;
                const modulesOutput = await execCommand('pactl', ['list', 'modules'], 3000);
                if (findModuleIds(modulesOutput, 'module-null-sink', TAP_SINK_NAME).length === 0) {
                    await setupInterception();
                }
            }
            spawnCapture(target);
        } catch (error) {
            emitStatus('error', `Failed to restart audio capture: ${error.message}`);
            stopLinuxAudioCapture();
        }
    }, RESPAWN_DELAY);
}

function spawnCapture(target) {
    capturedSink = target;
    audioBuffer = Buffer.alloc(0);
    receivedAnyData = false;
    linksConfirmed = false;

    const proc = spawn(
        'pw-record',
        ['--target', target, '--format', 's16', '--rate', String(SAMPLE_RATE), '--channels', String(CHANNELS), '--container', 'raw', '-'],
        { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    audioProc = proc;

    proc.stdout.on('data', chunk => {
        if (proc !== audioProc) return;
        handleStdoutData(chunk);
    });

    proc.stderr.on('data', data => {
        const message = data.toString().trim();
        if (message) console.error('[pw-record stderr]', message);
    });

    proc.on('error', error => {
        if (proc !== audioProc) return;
        if (stopped) return;
        emitStatus('error', `Failed to start pw-record: ${error.message}. Install PipeWire (and pipewire-pulse for sink monitoring).`);
        stopLinuxAudioCapture();
    });

    proc.on('close', code => {
        if (proc !== audioProc) return;
        handleUnexpectedClose(code);
    });

    postSpawnLinkSetup(target, proc);
}

function startSinkPolling() {
    stopSinkPolling();
    sinkPollTimer = setInterval(async () => {
        if (stopped) return;
        try {
            const currentDefault = await getDefaultSink();
            if (isIntercepting) {
                if (currentDefault !== TAP_SINK_NAME && currentDefault !== loopbackSink) {
                    // The user picked a new output while intercepting - remember
                    // it as the real sink to restore and re-assert the tap so
                    // capture keeps working.
                    originalDefaultSink = currentDefault;
                    await rePointLoopback(currentDefault);
                    const switched = await setDefaultSinkVerified(TAP_SINK_NAME);
                    if (!switched) {
                        emitStatus('warning', 'Could not re-assert tap sink after output change');
                    }
                }
            } else if (currentDefault !== capturedSink) {
                emitStatus('info', `Default sink changed to ${currentDefault} - restarting capture`);
                killProcess();
                spawnCapture(currentDefault);
            }
        } catch (error) {
            console.warn('Sink polling failed:', error.message);
        }
    }, SINK_POLL_INTERVAL);
}

function stopSinkPolling() {
    if (sinkPollTimer) {
        clearInterval(sinkPollTimer);
        sinkPollTimer = null;
    }
}

async function recoverStaleInterception() {
    try {
        const modulesOutput = await execCommand('pactl', ['list', 'modules'], 3000);
        const staleIds = [
            ...findModuleIds(modulesOutput, 'module-loopback', `${TAP_SINK_NAME}.monitor`),
            ...findModuleIds(modulesOutput, 'module-null-sink', TAP_SINK_NAME),
        ];
        if (staleIds.length === 0) return;
        console.log('Found stale interception modules from a previous session - cleaning up');
        for (const id of staleIds) {
            try {
                await execCommand('pactl', ['unload-module', id], 3000);
            } catch (error) {
                console.warn('Failed to unload stale module', id, error.message);
            }
        }
    } catch (error) {
        console.warn('Stale interception cleanup failed:', error.message);
    }
}

async function startLinuxAudioCapture(options) {
    const { mode: requestedMode = 'tap', onChunk: chunkCallback, onStatus: statusCallback } = options || {};

    if (typeof chunkCallback !== 'function') {
        throw new Error('onChunk callback is required');
    }

    if (stopped === false) {
        await stopLinuxAudioCapture();
    }

    mode = requestedMode === 'intercept' ? 'intercept' : 'tap';
    onChunk = chunkCallback;
    onStatus = statusCallback;
    stopped = false;
    startAttempts = 0;
    respawnAttempts = 0;
    sendQueue = [];
    sending = false;

    try {
        if (mode === 'intercept') {
            originalDefaultSink = await getDefaultSink();
            await setupInterception();
            spawnCapture(TAP_SINK_NAME);
        } else {
            const defaultSink = await getDefaultSink();
            spawnCapture(defaultSink);
        }

        startSinkPolling();
        emitStatus('info', `Capture started (${mode} mode)`);
        return { success: true, mode, target: capturedSink };
    } catch (error) {
        stopped = true;
        await restoreInterception().catch(() => {});
        throw error;
    }
}

async function stopLinuxAudioCapture() {
    if (stopped) return;
    stopped = true;

    if (startWatchdog) {
        clearTimeout(startWatchdog);
        startWatchdog = null;
    }
    if (respawnTimer) {
        clearTimeout(respawnTimer);
        respawnTimer = null;
    }
    stopSinkPolling();

    killProcess();
    audioBuffer = Buffer.alloc(0);
    linksConfirmed = false;
    sendQueue = [];
    sending = false;

    if (isIntercepting) {
        await restoreInterception();
    }

    capturedSink = null;
    emitStatus('info', 'Capture stopped');
}

module.exports = {
    startLinuxAudioCapture,
    stopLinuxAudioCapture,
    recoverStaleInterception,
    getDefaultSink,
};
