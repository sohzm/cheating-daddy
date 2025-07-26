const fs = require('fs');

const { pcmToWav, analyzeAudioBuffer, saveDebugAudio } = require('../audioUtils');

describe('audioUtils unit tests', () => {
    beforeEach(() => {
        vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
        vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
        vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    });
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('pcmToWav', () => {
        it('writes a wav header and returns output path', () => {
            const buffer = Buffer.alloc(4);
            const outPath = '/tmp/test.wav';
            pcmToWav(buffer, outPath, 16000, 1, 16);
            expect(fs.writeFileSync).toHaveBeenCalled();
            const written = fs.writeFileSync.mock.calls[0][1];
            // RIFF header check
            expect(written.toString('ascii', 0, 4)).toBe('RIFF');
            expect(written.toString('ascii', 8, 12)).toBe('WAVE');
            expect(written.length).toBe(44 + buffer.length);
        });
    });

    describe('analyzeAudioBuffer', () => {
        it('calculates stats for given buffer', () => {
            const samples = new Int16Array([0, 1000, -1000, 0]);
            const buf = Buffer.from(samples.buffer);
            const info = analyzeAudioBuffer(buf, 'test');
            expect(info.minValue).toBeLessThan(0);
            expect(info.maxValue).toBeGreaterThan(0);
            expect(info.sampleCount).toBe(4);
        });
    });

    describe('saveDebugAudio', () => {
        it('saves pcm, wav and metadata files', () => {
            const buffer = Buffer.alloc(8);
            const paths = saveDebugAudio(buffer, 'unit');
            expect(fs.mkdirSync).toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalledTimes(3);
            expect(paths.pcmPath).toContain('unit_');
            expect(paths.wavPath).toContain('unit_');
            expect(paths.metaPath).toContain('unit_');
        });
    });
});
