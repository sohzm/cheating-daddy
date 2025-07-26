const electronPath = require.resolve('electron');
require.cache[electronPath] = {
    exports: {
        BrowserWindow: {
            getAllWindows: vi.fn(() => [{ webContents: { send: vi.fn() } }]),
        },
        ipcMain: { handle: vi.fn(), on: vi.fn() },
        shell: { openExternal: vi.fn() },
    },
};
const { initializeNewSession, saveConversationTurn, getCurrentSessionData } = require('../utils/gemini');

describe('gemini conversation helpers', () => {
    beforeEach(() => {
        initializeNewSession();
    });

    it('saves conversation turns and retrieves history', () => {
        saveConversationTurn('hello', 'hi');
        saveConversationTurn('how are you', "i'm fine");

        const data = getCurrentSessionData();
        expect(data.history).toHaveLength(2);
        expect(data.history[0].transcription).toBe('hello');
        expect(data.history[1].ai_response).toBe("i'm fine");
    });
});
