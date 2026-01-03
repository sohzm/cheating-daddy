/**
 * Audio Utilities
 * Provides WAV header creation for audio processing
 */

'use strict';

/**
 * Create WAV header buffer for PCM audio data
 * @param {number} dataSize - Size of PCM data in bytes
 * @param {number} sampleRate - Sample rate (default 24000)
 * @param {number} channels - Number of channels (default 1)
 * @param {number} bitDepth - Bits per sample (default 16)
 * @returns {Buffer} WAV header buffer (44 bytes)
 */
function createWavHeader(dataSize, sampleRate = 24000, channels = 1, bitDepth = 16) {
    const byteRate = sampleRate * channels * (bitDepth / 8);
    const blockAlign = channels * (bitDepth / 8);

    const header = Buffer.alloc(44);

    // "RIFF" chunk descriptor
    header.write('RIFF', 0);
    header.writeUInt32LE(dataSize + 36, 4);
    header.write('WAVE', 8);

    // "fmt " sub-chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitDepth, 34);

    // "data" sub-chunk
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return header;
}

module.exports = {
    createWavHeader,
};
