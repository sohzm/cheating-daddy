// Shared speech-segmentation helpers.
//
// Both the local Whisper path and the Groq Whisper path need the same thing:
// take the 24 kHz mono PCM the renderer captures, resample it to the 16 kHz
// Whisper expects, and cut it into utterances on silence. Gemini Live does this
// server-side, which is why it needs none of this.

const VAD_MODES = {
    NORMAL: { energyThreshold: 0.01, speechFramesRequired: 3, silenceFramesRequired: 30 },
    LOW_BITRATE: { energyThreshold: 0.008, speechFramesRequired: 4, silenceFramesRequired: 35 },
    AGGRESSIVE: { energyThreshold: 0.015, speechFramesRequired: 2, silenceFramesRequired: 20 },
    VERY_AGGRESSIVE: { energyThreshold: 0.02, speechFramesRequired: 2, silenceFramesRequired: 15 },
};

function calculateRms(pcm16Buffer) {
    const samples = pcm16Buffer.length / 2;
    if (samples === 0) return 0;

    let sumSquares = 0;
    for (let i = 0; i < samples; i++) {
        const sample = pcm16Buffer.readInt16LE(i * 2) / 32768;
        sumSquares += sample * sample;
    }

    return Math.sqrt(sumSquares / samples);
}

function createWavBuffer(pcm16Buffer, sampleRate = 16000) {
    const header = Buffer.alloc(44);
    const byteRate = sampleRate * 2;

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm16Buffer.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm16Buffer.length, 40);

    return Buffer.concat([header, pcm16Buffer]);
}

/**
 * Stateful 24 kHz -> 16 kHz resampler. Keeps the trailing partial sample across
 * calls so chunk boundaries don't introduce clicks.
 */
function createResampler24kTo16k() {
    let remainder = Buffer.alloc(0);

    return {
        reset() {
            remainder = Buffer.alloc(0);
        },
        process(inputBuffer) {
            const combined = Buffer.concat([remainder, inputBuffer]);
            const inputSamples = Math.floor(combined.length / 2);
            const outputSamples = Math.floor((inputSamples * 2) / 3);
            const outputBuffer = Buffer.alloc(outputSamples * 2);

            for (let i = 0; i < outputSamples; i++) {
                const sourcePosition = (i * 3) / 2;
                const sourceIndex = Math.floor(sourcePosition);
                const fraction = sourcePosition - sourceIndex;
                const firstSample = combined.readInt16LE(sourceIndex * 2);
                const secondSample = sourceIndex + 1 < inputSamples ? combined.readInt16LE((sourceIndex + 1) * 2) : firstSample;
                const interpolated = Math.round(firstSample + fraction * (secondSample - firstSample));
                outputBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, interpolated)), i * 2);
            }

            const consumedInputSamples = Math.ceil((outputSamples * 3) / 2);
            const remainderStart = consumedInputSamples * 2;
            remainder = remainderStart < combined.length ? combined.slice(remainderStart) : Buffer.alloc(0);

            return outputBuffer;
        },
    };
}

/**
 * Energy-gated utterance detector.
 *
 * Feed it raw 24 kHz mono chunks; `onSpeechEnd(pcm16k, { voicedBytes })` fires
 * with one complete utterance once the speaker goes quiet.
 *
 * An utterance always carries the trailing silence that closed it, so its total
 * length says little about how much was actually spoken - `voicedBytes` counts
 * only the frames that passed the energy gate, which is what callers should use
 * to decide whether a blip is worth transcribing.
 */
function createSpeechDetector({ onSpeechEnd, onSpeechStart = null, vadMode = 'VERY_AGGRESSIVE' } = {}) {
    const vadConfig = VAD_MODES[vadMode] || VAD_MODES.VERY_AGGRESSIVE;
    const resampler = createResampler24kTo16k();

    let isSpeaking = false;
    let speechBuffers = [];
    let silenceFrameCount = 0;
    let speechFrameCount = 0;
    let voicedBytes = 0;

    function reset() {
        isSpeaking = false;
        speechBuffers = [];
        silenceFrameCount = 0;
        speechFrameCount = 0;
        voicedBytes = 0;
        resampler.reset();
    }

    function process(monoChunk24k) {
        const pcm16k = resampler.process(monoChunk24k);
        if (pcm16k.length === 0) return;

        const rms = calculateRms(pcm16k);
        const isVoice = rms > vadConfig.energyThreshold;

        if (isVoice) {
            speechFrameCount += 1;
            silenceFrameCount = 0;

            if (!isSpeaking && speechFrameCount >= vadConfig.speechFramesRequired) {
                isSpeaking = true;
                speechBuffers = [];
                voicedBytes = 0;
                if (onSpeechStart) onSpeechStart(rms);
            }
        } else {
            silenceFrameCount += 1;
            speechFrameCount = 0;

            if (isSpeaking && silenceFrameCount >= vadConfig.silenceFramesRequired) {
                isSpeaking = false;
                const audioData = Buffer.concat(speechBuffers);
                const spokenBytes = voicedBytes;
                speechBuffers = [];
                voicedBytes = 0;
                if (onSpeechEnd) onSpeechEnd(audioData, { voicedBytes: spokenBytes });
                return;
            }
        }

        if (isSpeaking) {
            speechBuffers.push(Buffer.from(pcm16k));
            if (isVoice) {
                voicedBytes += pcm16k.length;
            }
        }
    }

    return { process, reset };
}

module.exports = {
    VAD_MODES,
    calculateRms,
    createWavBuffer,
    createResampler24kTo16k,
    createSpeechDetector,
};
