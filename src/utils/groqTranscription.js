// Groq-only speech-to-text.
//
// In BYOK mode the Gemini Live socket is what listens - Groq never sees audio,
// only the text Gemini already transcribed. That makes a Groq key alone useless
// for a session. This module closes the gap by segmenting captured audio
// locally and posting each utterance to Groq's Whisper endpoint, so Groq can
// both hear and answer without a Gemini key.

const { createSpeechDetector, createWavBuffer } = require('./audioPipeline');
const { getGroqApiKey, getConfig } = require('../storage');
const { logTransportEvent } = require('./transportLogger');
const { parseErrorBody } = require('./providerCheck');

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

// Whisper bills per second of audio and a very short blip is almost always a
// keyboard tap or a door. Measured against the *voiced* part of the utterance,
// since every utterance also carries the trailing silence that closed it.
// 16000 bytes = 0.5s at 16 kHz mono 16-bit.
const MIN_VOICED_BYTES = 16000;

let detector = null;
let isActive = false;
let onTranscription = null;
let inFlight = 0;

function createDetector(sendToRenderer) {
    return createSpeechDetector({
        onSpeechStart: () => {
            sendToRenderer('update-status', 'Listening... (speech detected)');
        },
        onSpeechEnd: (audioData, meta) => {
            handleUtterance(audioData, meta, sendToRenderer);
        },
    });
}

async function transcribeUtterance(pcm16kBuffer) {
    const apiKey = getGroqApiKey();
    if (!apiKey) {
        throw new Error('No Groq API key configured');
    }

    const config = getConfig();
    const model = config.groqTranscriptionModel;
    const wavBuffer = createWavBuffer(pcm16kBuffer);

    const formData = new FormData();
    formData.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'speech.wav');
    formData.append('model', model);
    formData.append('response_format', 'json');
    formData.append('temperature', '0');

    const response = await fetch(GROQ_TRANSCRIPTION_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        logTransportEvent('groq.transcription.http_error', {
            status: response.status,
            body: errorText,
            model,
        });

        const message = parseErrorBody(errorText);
        if (response.status === 401) {
            throw new Error(`Groq rejected the API key: ${message}`);
        }
        if (response.status === 404) {
            throw new Error(`Groq has no transcription model "${model}": ${message}`);
        }
        throw new Error(`Groq transcription error ${response.status}: ${message}`);
    }

    const result = await response.json();
    return (result.text || '').trim();
}

async function handleUtterance(audioData, meta, sendToRenderer) {
    if (!isActive) return;

    if ((meta?.voicedBytes || 0) < MIN_VOICED_BYTES) {
        console.log('[Groq] Utterance too short, skipping:', meta?.voicedBytes || 0, 'voiced bytes');
        sendToRenderer('update-status', 'Listening...');
        return;
    }

    inFlight += 1;
    sendToRenderer('update-status', 'Transcribing...');

    try {
        const transcription = await transcribeUtterance(audioData);

        if (!isActive) return;

        if (!transcription || transcription.length < 2) {
            sendToRenderer('update-status', 'Listening...');
            return;
        }

        logTransportEvent('groq.transcription.completed', {
            text: transcription,
            audioBytes: audioData.length,
        });
        console.log('[Groq] Transcription:', transcription);

        sendToRenderer('update-status', 'Generating response...');
        if (onTranscription) {
            await onTranscription(transcription);
        }
    } catch (error) {
        console.error('[Groq] Transcription error:', error);
        logTransportEvent('groq.transcription.error', { error: error.message });
        sendToRenderer('update-status', error.message);
    } finally {
        inFlight -= 1;
    }
}

function startGroqTranscription({ sendToRenderer, onText }) {
    onTranscription = onText;
    detector = createDetector(sendToRenderer);
    isActive = true;
    inFlight = 0;
}

function processGroqAudio(monoChunk24k) {
    if (!isActive || !detector) return;
    detector.process(monoChunk24k);
}

function stopGroqTranscription() {
    isActive = false;
    onTranscription = null;
    if (detector) {
        detector.reset();
        detector = null;
    }
}

function isGroqTranscriptionActive() {
    return isActive;
}

module.exports = {
    startGroqTranscription,
    processGroqAudio,
    stopGroqTranscription,
    isGroqTranscriptionActive,
    transcribeUtterance,
};
