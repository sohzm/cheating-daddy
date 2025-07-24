const fs = require('fs');
const os = require('os');
const path = require('path');
const { pcmToWav, saveDebugAudio } = require('../audioUtils');

describe('audioUtils e2e', () => {
    it('creates wav and metadata files on disk', () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-e2e-'));
        const origHome = vi.spyOn(require('os'), 'homedir').mockReturnValue(tmpDir);

        const samples = new Int16Array(16000).fill(1000); // 1s constant tone
        const buffer = Buffer.from(samples.buffer);
        const outWav = path.join(tmpDir, 'test.wav');

        pcmToWav(buffer, outWav);
        expect(fs.existsSync(outWav)).toBe(true);

        const result = saveDebugAudio(buffer, 'e2e');
        expect(fs.existsSync(result.pcmPath)).toBe(true);
        expect(fs.existsSync(result.wavPath)).toBe(true);
        expect(fs.existsSync(result.metaPath)).toBe(true);

        origHome.mockRestore();
    });
});
