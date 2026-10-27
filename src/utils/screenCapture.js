// Screenshots via desktopCapturer in the main process. Unlike a getDisplayMedia stream (ScreenCaptureKit on macOS 15+),
// desktopCapturer honors setContentProtection, so the app's own overlay window is left out and the model sees what is
// behind it. Electron modules are injected so this can be unit tested.

const MANUAL_JPEG_QUALITY = { high: 85, medium: 60, low: 40 };
const AUTO_JPEG_QUALITY = { high: 90, medium: 70, low: 50 };

function fitWithin(size, maxWidth) {
    if (size.width <= maxWidth) {
        return { width: Math.round(size.width), height: Math.round(size.height) };
    }
    return { width: maxWidth, height: Math.round(size.height * (maxWidth / size.width)) };
}

function pickSource(sources, displayId) {
    if (!sources || sources.length === 0) return null;
    return sources.find(source => source.display_id && source.display_id === String(displayId)) || sources[0];
}

function jpegQualityFor(quality, isManual) {
    const table = isManual ? MANUAL_JPEG_QUALITY : AUTO_JPEG_QUALITY;
    return table[quality] || table.medium;
}

// Captures the display that contains windowBounds (or the primary display) and returns { data, width, height, displayId },
// where data is base64 JPEG.
async function captureScreen({ desktopCapturer, screen, windowBounds = null, maxWidth, quality }) {
    const display = windowBounds ? screen.getDisplayMatching(windowBounds) : screen.getPrimaryDisplay();
    const scale = display.scaleFactor || 1;
    const thumbnailSize = fitWithin({ width: display.size.width * scale, height: display.size.height * scale }, maxWidth);

    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize });
    const source = pickSource(sources, display.id);
    if (!source) {
        throw new Error('No screen available to capture');
    }

    const image = source.thumbnail;
    if (!image || image.isEmpty()) {
        throw new Error('Screen capture is empty. Grant Screen Recording permission in System Settings → Privacy & Security.');
    }

    const { width, height } = image.getSize();
    return {
        data: image.toJPEG(quality).toString('base64'),
        width,
        height,
        displayId: display.id,
    };
}

module.exports = {
    fitWithin,
    pickSource,
    jpegQualityFor,
    captureScreen,
};
