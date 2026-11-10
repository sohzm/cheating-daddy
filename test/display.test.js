const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { normalizeFontSize, normalizeScale, normalizeWindowSize, attachDisplayControls } = require('../src/utils/display');

test('display preferences clamp invalid or legacy settings to usable values', () => {
    assert.equal(normalizeScale(1), 25);
    assert.equal(normalizeScale(500), 150);
    assert.equal(normalizeScale(NaN), 100);
    assert.equal(normalizeFontSize('medium'), 20);
    assert.equal(normalizeFontSize('6'), 6);
    assert.equal(normalizeFontSize('bad'), 14);
    assert.deepEqual(normalizeWindowSize({ width: 5, height: 1 }), { width: 220, height: 120 });
    assert.deepEqual(normalizeWindowSize({ width: 9999, height: 9999 }, { width: 1920, height: 1080 }), { width: 1920, height: 1080 });
    assert.deepEqual(normalizeWindowSize(null), { width: 640, height: 420 });
});

test('mini preset, keyboard recovery, IPC validation and saved scale restoration', () => {
    const window = new EventEmitter();
    const contents = new EventEmitter();
    const preferences = { uiScale: 35 };
    const config = {};
    let bounds = { x: 1850, y: 1040, width: 640, height: 420 };
    let zoom;
    contents.send = () => {};
    contents.setZoomFactor = value => (zoom = value);
    Object.assign(window, {
        webContents: contents,
        isDestroyed: () => false,
        isMaximized: () => false,
        isMinimized: () => false,
        getBounds: () => bounds,
        setBounds: value => (bounds = value),
        getSize: () => [bounds.width, bounds.height],
    });
    const handlers = new Map();
    attachDisplayControls(window, {
        storage: {
            getPreferences: () => preferences,
            updatePreference: (key, value) => (preferences[key] = value),
            updateConfig: (key, value) => (config[key] = value),
        },
        screen: { getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }) },
        ipcMain: { handle: (name, callback) => handlers.set(name, callback), removeHandler: name => handlers.delete(name) },
    });
    const invoke = (name, value, sender = contents) => handlers.get('window:display-action')({ sender }, name, value);
    contents.emit('did-finish-load');
    assert.equal(zoom, 0.35);
    assert.equal(invoke('scale', NaN).success, false);
    assert.equal(invoke('scale', 70, {}).success, false);
    assert.equal(invoke('unexpected').success, false);
    invoke('mini');
    assert.equal(zoom, 0.6);
    assert.deepEqual(bounds, { x: 1600, y: 900, width: 320, height: 180 });
    assert.deepEqual(config.windowSize, { width: 320, height: 180 });
    invoke('scale', 25);
    let prevented = false;
    const event = { preventDefault: () => (prevented = true) };
    contents.emit('before-input-event', event, { type: 'keyDown', key: '-', control: true });
    assert.equal(zoom, 0.25);
    assert.equal(prevented, true);
    contents.emit('before-input-event', event, { type: 'keyDown', key: '0', control: true });
    assert.equal(zoom, 1);
    assert.equal(preferences.uiScale, 100);
    assert.deepEqual(config.windowSize, { width: 640, height: 420 });
    invoke('scale', 45);
    contents.emit('did-finish-load');
    assert.equal(zoom, 0.45);
    window.emit('closed');
    assert.equal(handlers.size, 0);
});
