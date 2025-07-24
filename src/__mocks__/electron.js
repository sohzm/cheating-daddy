const mockWindow = {
    webContents: { send: vi.fn() },
};
const { EventEmitter } = require('events');
const ipcRenderer = new EventEmitter();
ipcRenderer.invoke = vi.fn(() => Promise.resolve());

module.exports = {
    BrowserWindow: {
        getAllWindows: vi.fn(() => [mockWindow]),
    },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
    ipcRenderer,
    shell: { openExternal: vi.fn() },
};
