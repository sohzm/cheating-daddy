const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fitWithin, pickSource, jpegQualityFor, captureScreen } = require('../src/utils/screenCapture');

// ── fitWithin ──

test('fitWithin keeps sizes that already fit', () => {
    assert.deepEqual(fitWithin({ width: 1280, height: 800 }, 1920), { width: 1280, height: 800 });
});

test('fitWithin downscales to maxWidth preserving aspect ratio', () => {
    assert.deepEqual(fitWithin({ width: 3840, height: 2160 }, 1280), { width: 1280, height: 720 });
    assert.deepEqual(fitWithin({ width: 2940, height: 1912 }, 1280), { width: 1280, height: 832 });
});

// ── pickSource ──

const SOURCES = [
    { id: 'screen:1:0', display_id: '1', name: 'Built-in' },
    { id: 'screen:2:0', display_id: '2', name: 'External' },
];

test('pickSource picks the source for the given display', () => {
    assert.equal(pickSource(SOURCES, 2).id, 'screen:2:0');
});

test('pickSource falls back to the first source when display ids are unknown', () => {
    assert.equal(pickSource(SOURCES, 99).id, 'screen:1:0');
    assert.equal(pickSource([{ id: 'screen:x', display_id: '' }], 1).id, 'screen:x');
    assert.equal(pickSource([], 1), null);
});

// ── jpegQualityFor ──

test('jpegQualityFor maps quality presets (manual screenshots are lighter)', () => {
    assert.equal(jpegQualityFor('high', true), 85);
    assert.equal(jpegQualityFor('medium', true), 60);
    assert.equal(jpegQualityFor('low', true), 40);
    assert.equal(jpegQualityFor('high', false), 90);
    assert.equal(jpegQualityFor('medium', false), 70);
    assert.equal(jpegQualityFor('low', false), 50);
    assert.equal(jpegQualityFor('bogus', true), 60);
    assert.equal(jpegQualityFor(undefined, false), 70);
});

// ── captureScreen ──

function fakeImage({ width, height, empty = false }) {
    return {
        isEmpty: () => empty,
        getSize: () => ({ width, height }),
        toJPEG: quality => Buffer.from(`jpeg:${width}x${height}:q${quality}`),
    };
}

function fakeDeps({ empty = false } = {}) {
    const calls = { getSources: [], matching: [] };
    const displays = {
        1: { id: 1, size: { width: 1512, height: 982 }, scaleFactor: 2 },
        2: { id: 2, size: { width: 2560, height: 1440 }, scaleFactor: 1 },
    };
    const screen = {
        getPrimaryDisplay: () => displays[1],
        getDisplayMatching: bounds => {
            calls.matching.push(bounds);
            return bounds.x >= 1512 ? displays[2] : displays[1];
        },
    };
    const desktopCapturer = {
        getSources: async options => {
            calls.getSources.push(options);
            const { width, height } = options.thumbnailSize;
            return [
                { id: 'screen:1:0', display_id: '1', thumbnail: fakeImage({ width, height, empty }) },
                { id: 'screen:2:0', display_id: '2', thumbnail: fakeImage({ width, height: Math.round(height), empty }) },
            ];
        },
    };
    return { screen, desktopCapturer, calls };
}

test('captureScreen captures the display the app window is on, as JPEG base64', async () => {
    const { screen, desktopCapturer, calls } = fakeDeps();
    const result = await captureScreen({
        desktopCapturer,
        screen,
        windowBounds: { x: 1600, y: 100, width: 800, height: 600 },
        maxWidth: 1280,
        quality: 60,
    });

    assert.deepEqual(calls.matching, [{ x: 1600, y: 100, width: 800, height: 600 }]);
    assert.deepEqual(calls.getSources, [{ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } }]);
    assert.equal(result.width, 1280);
    assert.equal(result.height, 720);
    assert.equal(result.displayId, 2);
    assert.equal(Buffer.from(result.data, 'base64').toString(), 'jpeg:1280x720:q60');
});

test('captureScreen uses physical pixels (scale factor) before downscaling', async () => {
    const { screen, desktopCapturer, calls } = fakeDeps();
    await captureScreen({ desktopCapturer, screen, windowBounds: { x: 0, y: 0, width: 100, height: 100 }, maxWidth: 1920, quality: 70 });
    // 1512x982 @2x = 3024x1964 -> fit to 1920 wide
    assert.deepEqual(calls.getSources[0].thumbnailSize, { width: 1920, height: 1247 });
});

test('captureScreen uses the primary display when window bounds are unknown', async () => {
    const { screen, desktopCapturer } = fakeDeps();
    const result = await captureScreen({ desktopCapturer, screen, maxWidth: 1280, quality: 60 });
    assert.equal(result.displayId, 1);
});

test('captureScreen throws a permission hint when the capture is empty', async () => {
    const { screen, desktopCapturer } = fakeDeps({ empty: true });
    await assert.rejects(captureScreen({ desktopCapturer, screen, maxWidth: 1280, quality: 60 }), /Screen Recording permission/);
});

test('captureScreen throws when no screen sources are available', async () => {
    const { screen } = fakeDeps();
    const desktopCapturer = { getSources: async () => [] };
    await assert.rejects(captureScreen({ desktopCapturer, screen, maxWidth: 1280, quality: 60 }), /No screen/);
});
