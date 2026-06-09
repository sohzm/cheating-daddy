// ── Shared Whisper/VAD audio-transcription pipeline ──
//
// Extracted from localai.js so multiple providers (localai.js, chatgptai.js, ...) can
// reuse the same resampling, VAD energy calc, and Whisper transcription logic.
//
// This module MUST NOT require ./gemini or ./localai (no circular deps). Any renderer
// messaging is done via a `sendToRenderer` function passed in by the caller.

// ── Whisper cache state ──

let whisperPipeline = null;
let isWhisperLoading = false;

// Whisper transcription language (ISO 639-1), derived from the configured Speech Language.
// transformers.js does NOT auto-detect when omitted — it silently defaults to English, which
// mis-transcribes/translates non-English speech. So we set it explicitly from the user's setting.
let transcribeLanguage = 'en';

// Audio resampling buffer
let resampleRemainder = Buffer.alloc(0);

function setTranscribeLanguage(language) {
    transcribeLanguage =
        String(language || 'en')
            .split('-')[0]
            .toLowerCase() || 'en';
}

function resetResampleState() {
    resampleRemainder = Buffer.alloc(0);
}

// ── Audio Resampling (24kHz → 16kHz) ──

function resample24kTo16k(inputBuffer) {
    // Combine with any leftover samples from previous call
    const combined = Buffer.concat([resampleRemainder, inputBuffer]);
    const inputSamples = Math.floor(combined.length / 2); // 16-bit = 2 bytes per sample
    // Ratio: 16000/24000 = 2/3, so for every 3 input samples we produce 2 output samples
    const outputSamples = Math.floor((inputSamples * 2) / 3);
    const outputBuffer = Buffer.alloc(outputSamples * 2);

    for (let i = 0; i < outputSamples; i++) {
        // Map output sample index to input position
        const srcPos = (i * 3) / 2;
        const srcIndex = Math.floor(srcPos);
        const frac = srcPos - srcIndex;

        const s0 = combined.readInt16LE(srcIndex * 2);
        const s1 = srcIndex + 1 < inputSamples ? combined.readInt16LE((srcIndex + 1) * 2) : s0;
        const interpolated = Math.round(s0 + frac * (s1 - s0));
        outputBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, interpolated)), i * 2);
    }

    // Store remainder for next call
    const consumedInputSamples = Math.ceil((outputSamples * 3) / 2);
    const remainderStart = consumedInputSamples * 2;
    resampleRemainder = remainderStart < combined.length ? combined.slice(remainderStart) : Buffer.alloc(0);

    return outputBuffer;
}

// ── VAD (Voice Activity Detection) ──

function calculateRMS(pcm16Buffer) {
    const samples = pcm16Buffer.length / 2;
    if (samples === 0) return 0;
    let sumSquares = 0;
    for (let i = 0; i < samples; i++) {
        const sample = pcm16Buffer.readInt16LE(i * 2) / 32768;
        sumSquares += sample * sample;
    }
    return Math.sqrt(sumSquares / samples);
}

// ── Whisper Transcription ──

async function loadWhisperPipeline(modelName, sendToRenderer) {
    if (whisperPipeline) return whisperPipeline;
    if (isWhisperLoading) return null;

    isWhisperLoading = true;
    console.log('[LocalAI] Loading Whisper model:', modelName);
    sendToRenderer('whisper-downloading', true);
    sendToRenderer('update-status', 'Loading Whisper model (first time may take a while)...');

    try {
        // Dynamic import for ESM module
        const { pipeline, env } = await import('@huggingface/transformers');
        // Cache models outside the asar archive so ONNX runtime can load them
        const { app } = require('electron');
        const path = require('path');
        env.cacheDir = path.join(app.getPath('userData'), 'whisper-models');
        whisperPipeline = await pipeline('automatic-speech-recognition', modelName, {
            dtype: 'q8',
            device: 'auto',
            // onnxruntime-node's CPU arena allocator (BFCArena) aborts during q8 Whisper inference
            // on macOS/Apple Silicon, hard-crashing the whole app with a native EXC_BREAKPOINT
            // (SIGTRAP in CPUAllocator::Alloc — uncatchable by try/catch). Disabling the arena and
            // mem pattern sidesteps the abort with no transcription-quality loss.
            session_options: { enableCpuMemArena: false, enableMemPattern: false },
        });
        console.log('[LocalAI] Whisper model loaded successfully');
        sendToRenderer('whisper-downloading', false);
        isWhisperLoading = false;
        return whisperPipeline;
    } catch (error) {
        console.error('[LocalAI] Failed to load Whisper model:', error);
        sendToRenderer('whisper-downloading', false);
        sendToRenderer('update-status', 'Failed to load Whisper model: ' + error.message);
        isWhisperLoading = false;
        return null;
    }
}

function pcm16ToFloat32(pcm16Buffer) {
    const samples = pcm16Buffer.length / 2;
    const float32 = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
        float32[i] = pcm16Buffer.readInt16LE(i * 2) / 32768;
    }
    return float32;
}

async function transcribeAudio(pcm16kBuffer, sendToRenderer) {
    if (!whisperPipeline) {
        console.error('[LocalAI] Whisper pipeline not loaded');
        return null;
    }

    try {
        const float32Audio = pcm16ToFloat32(pcm16kBuffer);

        // Whisper expects audio at 16kHz which is what we have. Language follows the configured
        // Speech Language (was hardcoded 'en'). chunk_length_s lets it handle utterances >30s
        // instead of silently truncating them.
        const result = await whisperPipeline(float32Audio, {
            sampling_rate: 16000,
            language: transcribeLanguage,
            task: 'transcribe',
            chunk_length_s: 30,
            stride_length_s: 5,
        });

        const text = result.text?.trim();
        console.log('[LocalAI] Transcription:', text);
        return text;
    } catch (error) {
        console.error('[LocalAI] Transcription error:', error);
        return null;
    }
}

function isNoiseTranscription(text) {
    const stripped = text.replace(/[[(][^\])]*[\])]/g, '').replace(/[\s.,!?…—-]+/g, '');
    return stripped.length < 2;
}

function resetWhisper() {
    whisperPipeline = null;
    isWhisperLoading = false;
}

module.exports = {
    resample24kTo16k,
    calculateRMS,
    pcm16ToFloat32,
    loadWhisperPipeline,
    transcribeAudio,
    isNoiseTranscription,
    resetWhisper,
    setTranscribeLanguage,
    resetResampleState,
};
