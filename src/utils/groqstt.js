// Groq Whisper transcription mode.
//
// Captures the same 24kHz mono PCM the other modes use, segments it into
// utterances with the shared VAD pipeline, then transcribes each utterance via
// Groq's hosted Whisper (open-source whisper-large-v3) over HTTP. The resulting
// text is handed to the existing reply queue (enqueueResponse -> Groq LLM).
//
// If Groq transcription fails (offline, rate-limited, server error) it falls
// back to local Whisper for the rest of the session so the user is never stuck.

const { getSystemPrompt } = require('./prompts');
const { getGroqApiKey } = require('../storage');
const { createSpeechSegmenter } = require('./audioPipeline');
const { sendToRenderer, enqueueResponse, setCurrentSystemPrompt, initializeNewSession } = require('./gemini');
const { transcribeWithLocalWhisper } = require('./localai');

const GROQ_STT_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
// whisper-large-v3-turbo: fastest Groq STT model, ideal for real-time use.
const GROQ_STT_MODEL = 'whisper-large-v3-turbo';
// Ignore utterances shorter than ~0.5s at 16kHz/16-bit (likely noise).
const MIN_AUDIO_BYTES = 16000;
// Abort a Groq STT request that hangs so we fall back to local Whisper instead
// of getting stuck on "Transcribing..." forever.
const GROQ_STT_TIMEOUT_MS = 15000;

// Groq mode is used for in-depth answers (not the quick teleprompter style),
// so we override the profile's brevity instructions with a request for a
// complete, thorough answer — matching the screen-capture experience.
const DETAILED_ANSWER_OVERRIDE = `**IMPORTANT — RESPONSE LENGTH OVERRIDE:**
Disregard any earlier instruction to keep responses short, brief, or limited to a few sentences. Instead, provide a COMPLETE, THOROUGH, and well-structured answer:
- Explain your reasoning and cover the topic in depth.
- Use markdown headings, **bold** text, bullet points, and numbered steps to organize the response.
- Include concrete examples, commands, or code where they help.
- Do not omit important details for the sake of brevity.`;

let isActive = false;
let segmenter = null;
let fallbackWhisperModel = 'Xenova/whisper-small';
// Once Groq transcription fails we stay on local Whisper for the rest of the
// session rather than retrying (and failing) on every single utterance.
let useLocalFallback = false;

// Coalescing state: a single spoken question is often split into several VAD
// utterances. We transcribe them one at a time (audioQueue), accumulate the
// text (pendingQuestion), and only fire ONE reply after a short quiet gap
// (replyTimer) — otherwise each fragment produced its own reply, with the last
// short one visibly replacing the good full answer.
let audioQueue = [];
let isTranscribing = false;
let pendingQuestion = '';
let replyTimer = null;
const REPLY_DEBOUNCE_MS = 1000;

// Wrap raw 16kHz mono PCM16 in a minimal 44-byte WAV header so Groq accepts it.
function pcm16ToWav(pcm, sampleRate = 16000) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;

    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // fmt chunk size
    header.writeUInt16LE(1, 20); // audio format = PCM
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);

    return Buffer.concat([header, pcm]);
}

async function transcribeWithGroq(pcm16kBuffer) {
    const apiKey = getGroqApiKey();
    if (!apiKey) throw new Error('No Groq API key configured');

    const wav = pcm16ToWav(pcm16kBuffer, 16000);

    const form = new FormData();
    form.append('file', new Blob([wav], { type: 'audio/wav' }), 'audio.wav');
    form.append('model', GROQ_STT_MODEL);
    form.append('response_format', 'json');
    form.append('language', 'en');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GROQ_STT_TIMEOUT_MS);

    let response;
    try {
        response = await fetch(GROQ_STT_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq STT ${response.status}: ${errorText}`);
    }

    const json = await response.json();
    return (json.text || '').trim();
}

// Transcribe one utterance via Groq Whisper, falling back to local Whisper.
// Returns trimmed text, or null if nothing usable was produced.
async function transcribeOne(pcm16kBuffer) {
    let text = null;

    // Primary path: Groq Whisper (unless we've already fallen back this session).
    if (!useLocalFallback) {
        try {
            text = await transcribeWithGroq(pcm16kBuffer);
        } catch (error) {
            console.error('[GroqSTT] Groq transcription failed, falling back to local Whisper:', error.message);
            sendToRenderer('update-status', 'Groq unavailable — switching to local Whisper...');
            useLocalFallback = true;
        }
    }

    // Fallback path: local Whisper (loads the model on first use).
    if (text === null) {
        try {
            text = await transcribeWithLocalWhisper(pcm16kBuffer, fallbackWhisperModel);
        } catch (error) {
            console.error('[GroqSTT] Local Whisper fallback failed:', error.message);
            sendToRenderer('update-status', 'Transcription failed: ' + error.message);
            return null;
        }
    }

    if (!text || text.trim().length < 2) return null;
    return text.trim();
}

// Called once per VAD utterance. Queue it for serialized transcription instead
// of replying immediately, so fragments of one question can be merged.
function handleSpeechEnd(pcm16kBuffer) {
    if (!isActive) return;
    if (pcm16kBuffer.length < MIN_AUDIO_BYTES) return;
    audioQueue.push(pcm16kBuffer);
    drainAudioQueue();
}

// Transcribe queued utterances one at a time, accumulating their text.
async function drainAudioQueue() {
    if (isTranscribing) return;
    isTranscribing = true;
    sendToRenderer('update-status', 'Transcribing...');
    try {
        while (audioQueue.length > 0) {
            const buffer = audioQueue.shift();
            const text = await transcribeOne(buffer);
            // Session may have been closed while we awaited transcription — if
            // so, drop the result rather than replying after the user stopped.
            if (!isActive) return;
            if (text) {
                pendingQuestion += (pendingQuestion ? ' ' : '') + text;
                console.log('[GroqSTT] Partial transcription:', text);
            }
        }
    } finally {
        isTranscribing = false;
    }
    // Queue drained — wait briefly for any trailing speech, then reply once.
    scheduleReply();
}

// Fire a single reply once transcription has been quiet for REPLY_DEBOUNCE_MS.
function scheduleReply() {
    if (replyTimer) clearTimeout(replyTimer);
    replyTimer = setTimeout(() => {
        replyTimer = null;
        // Session closed while we waited — don't reply after the user stopped.
        if (!isActive) {
            pendingQuestion = '';
            return;
        }
        // More audio arrived while we waited — let the drain finish first.
        if (isTranscribing || audioQueue.length > 0) {
            scheduleReply();
            return;
        }
        const question = pendingQuestion.trim();
        pendingQuestion = '';
        if (!question) {
            sendToRenderer('update-status', 'Listening...');
            return;
        }
        console.log('[GroqSTT] Final question:', question);
        sendToRenderer('update-status', 'Generating response...');
        // Route through the shared reply queue (serialized + uses Groq LLM).
        enqueueResponse(question);
    }, REPLY_DEBOUNCE_MS);
}

async function initializeGroqSession(profile = 'interview', customPrompt = '', whisperModel = 'Xenova/whisper-small') {
    console.log('[GroqSTT] Initializing Groq session:', { profile, whisperModel });
    sendToRenderer('session-initializing', true);

    try {
        if (!getGroqApiKey()) {
            sendToRenderer('session-initializing', false);
            sendToRenderer('update-status', 'No Groq API key configured');
            return false;
        }

        // The reply path (sendToGroq) reads the system prompt from gemini.js.
        // Append the detail override so Groq answers are complete, not terse.
        const basePrompt = getSystemPrompt(profile, customPrompt, false);
        setCurrentSystemPrompt(basePrompt + '\n\n' + DETAILED_ANSWER_OVERRIDE);
        initializeNewSession(profile, customPrompt);

        fallbackWhisperModel = whisperModel || 'Xenova/whisper-small';
        useLocalFallback = false;
        audioQueue = [];
        isTranscribing = false;
        pendingQuestion = '';
        if (replyTimer) clearTimeout(replyTimer);
        replyTimer = null;
        segmenter = createSpeechSegmenter({ onSpeechEnd: handleSpeechEnd, vadMode: 'VERY_AGGRESSIVE' });
        isActive = true;

        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'Groq AI ready - Listening...');
        console.log('[GroqSTT] Session initialized successfully');
        return true;
    } catch (error) {
        console.error('[GroqSTT] Initialization error:', error);
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'Groq init error: ' + error.message);
        return false;
    }
}

function processGroqAudio(monoChunk24k) {
    if (!isActive || !segmenter) return;
    segmenter.process(monoChunk24k);
}

function closeGroqSession() {
    console.log('[GroqSTT] Closing Groq session');
    isActive = false;
    if (segmenter) segmenter.reset();
    segmenter = null;
    useLocalFallback = false;
    audioQueue = [];
    isTranscribing = false;
    pendingQuestion = '';
    if (replyTimer) clearTimeout(replyTimer);
    replyTimer = null;
}

function isGroqSessionActive() {
    return isActive;
}

module.exports = {
    initializeGroqSession,
    processGroqAudio,
    closeGroqSession,
    isGroqSessionActive,
};
