// Shared audio pipeline: 24kHz → 16kHz resampling + energy-based voice activity
// detection (VAD) that segments a continuous PCM stream into individual
// utterances. Used by both the local-Whisper and Groq-Whisper transcription
// paths so the chunking behaviour stays identical across providers.
//
// createSpeechSegmenter returns an isolated instance (its own resample/VAD
// state) so multiple modes can't clobber each other's buffers.

const VAD_MODES = {
    NORMAL: { energyThreshold: 0.01, speechFramesRequired: 3, silenceFramesRequired: 30 },
    LOW_BITRATE: { energyThreshold: 0.008, speechFramesRequired: 4, silenceFramesRequired: 35 },
    AGGRESSIVE: { energyThreshold: 0.015, speechFramesRequired: 2, silenceFramesRequired: 20 },
    VERY_AGGRESSIVE: { energyThreshold: 0.02, speechFramesRequired: 2, silenceFramesRequired: 15 },
};

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

// onSpeechEnd(pcm16kBuffer) is called once per detected utterance with the
// accumulated 16kHz mono PCM. vadMode picks a sensitivity profile.
function createSpeechSegmenter({ onSpeechEnd, vadMode = 'VERY_AGGRESSIVE' } = {}) {
    const vad = VAD_MODES[vadMode] || VAD_MODES.VERY_AGGRESSIVE;

    let resampleRemainder = Buffer.alloc(0);
    let isSpeaking = false;
    let speechBuffers = [];
    let silenceFrameCount = 0;
    let speechFrameCount = 0;
    // Rolling window of the most recent idle frames. When speech is detected we
    // seed the utterance with these so the leading ~200-400ms (the frames that
    // triggered detection, plus a little lead-in) isn't clipped off the start.
    let preRoll = [];
    const PRE_ROLL_FRAMES = vad.speechFramesRequired + 2;

    // 24kHz → 16kHz linear-interpolation resample. Ratio is 2/3, so every 3
    // input samples produce 2 output samples; leftover samples carry over.
    function resample24kTo16k(inputBuffer) {
        const combined = Buffer.concat([resampleRemainder, inputBuffer]);
        const inputSamples = Math.floor(combined.length / 2);
        const outputSamples = Math.floor((inputSamples * 2) / 3);
        const outputBuffer = Buffer.alloc(outputSamples * 2);

        for (let i = 0; i < outputSamples; i++) {
            const srcPos = (i * 3) / 2;
            const srcIndex = Math.floor(srcPos);
            const frac = srcPos - srcIndex;

            const s0 = combined.readInt16LE(srcIndex * 2);
            const s1 = srcIndex + 1 < inputSamples ? combined.readInt16LE((srcIndex + 1) * 2) : s0;
            const interpolated = Math.round(s0 + frac * (s1 - s0));
            outputBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, interpolated)), i * 2);
        }

        const consumedInputSamples = Math.ceil((outputSamples * 3) / 2);
        const remainderStart = consumedInputSamples * 2;
        resampleRemainder = remainderStart < combined.length ? combined.slice(remainderStart) : Buffer.alloc(0);

        return outputBuffer;
    }

    function process(monoChunk24k) {
        const pcm16k = resample24kTo16k(monoChunk24k);
        if (pcm16k.length === 0) return;
        const frame = Buffer.from(pcm16k);

        const rms = calculateRMS(pcm16k);
        const isVoice = rms > vad.energyThreshold;

        if (isVoice) {
            speechFrameCount++;
            silenceFrameCount = 0;

            if (!isSpeaking && speechFrameCount >= vad.speechFramesRequired) {
                isSpeaking = true;
                // Seed with the recent pre-roll frames (which include the ones
                // that triggered detection) so no leading audio is lost.
                speechBuffers = preRoll.slice();
            }
        } else {
            silenceFrameCount++;
            speechFrameCount = 0;

            if (isSpeaking && silenceFrameCount >= vad.silenceFramesRequired) {
                isSpeaking = false;
                const audioData = Buffer.concat(speechBuffers);
                speechBuffers = [];
                preRoll = [];
                if (typeof onSpeechEnd === 'function') onSpeechEnd(audioData);
                return;
            }
        }

        if (isSpeaking) {
            speechBuffers.push(frame);
        } else {
            // Maintain the rolling pre-roll window while idle.
            preRoll.push(frame);
            if (preRoll.length > PRE_ROLL_FRAMES) preRoll.shift();
        }
    }

    function reset() {
        resampleRemainder = Buffer.alloc(0);
        isSpeaking = false;
        speechBuffers = [];
        silenceFrameCount = 0;
        speechFrameCount = 0;
        preRoll = [];
    }

    return { process, reset };
}

module.exports = { createSpeechSegmenter, VAD_MODES };
