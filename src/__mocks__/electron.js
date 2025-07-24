const mockWindow = {
    webContents: { send: vi.fn() },
};
module.exports = {
    BrowserWindow: {
        getAllWindows: vi.fn(() => [mockWindow]),
    },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
    shell: { openExternal: vi.fn() },
};
