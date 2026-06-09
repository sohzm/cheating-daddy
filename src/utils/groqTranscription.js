// Cloud speech-to-text via Groq's OpenAI-compatible audio API (whisper-large-v3-turbo).
// large-v3 quality (much better on Russian / technical terms than local tiny/base/small) at
// Groq's very high speed. Reuses the existing groqApiKey. Per-utterance batch call: the VAD in
// chatgptai segments speech, we wrap the PCM into a WAV and POST it.

const { getGroqApiKey } = require('../storage');

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const MODEL = 'whisper-large-v3-turbo';

// Wrap raw little-endian PCM16 mono into an in-memory WAV buffer.
function pcm16ToWavBuffer(pcm, sampleRate = 16000, channels = 1) {
    const bitDepth = 16;
    const byteRate = (sampleRate * channels * bitDepth) / 8;
    const blockAlign = (channels * bitDepth) / 8;
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitDepth, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([header, pcm]);
}

// pcm16kBuffer: little-endian PCM16 mono @ 16kHz (what chatgptai's VAD accumulates). lang: 'ru', 'en', ...
async function transcribeWithGroq(pcm16kBuffer, lang = '') {
    const apiKey = getGroqApiKey();
    if (!apiKey) {
        throw new Error('No Groq API key set (add it on the main screen)');
    }
    const wav = pcm16ToWavBuffer(pcm16kBuffer, 16000, 1);
    const form = new FormData();
    form.append('file', new Blob([wav], { type: 'audio/wav' }), 'audio.wav');
    form.append('model', MODEL);
    form.append('response_format', 'json');
    if (lang) {
        form.append('language', lang);
    }

    const resp = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        const message = data?.error?.message || `Groq transcription failed (${resp.status})`;
        throw new Error(message);
    }
    return (data.text || '').trim();
}

module.exports = { transcribeWithGroq };
