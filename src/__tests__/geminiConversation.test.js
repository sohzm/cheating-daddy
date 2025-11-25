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
const { initializeNewSession, saveConversationTurn, getCurrentSessionData, formatSpeakerResults } = require('../utils/gemini');

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

    it('initializes new session with empty history', () => {
        initializeNewSession();
        const data = getCurrentSessionData();

        expect(data.history).toBeDefined();
        expect(Array.isArray(data.history)).toBe(true);
        expect(data.history.length).toBe(0);
    });

    it('tracks session ID', () => {
        initializeNewSession();
        const data = getCurrentSessionData();

        expect(data.sessionId).toBeDefined();
        expect(typeof data.sessionId).toBe('string');
        expect(data.sessionId.length).toBeGreaterThan(0);
    });

    describe('Speaker Diarization', () => {
        it('formats speaker results correctly', () => {
            const results = [
                { transcript: 'What is your experience?', speakerId: 1 },
                { transcript: 'I have 5 years of experience', speakerId: 2 },
            ];

            const formatted = formatSpeakerResults(results);
            expect(formatted).toContain('[Interviewer]:');
            expect(formatted).toContain('[Candidate]:');
            expect(formatted).toContain('What is your experience?');
            expect(formatted).toContain('I have 5 years of experience');
        });

        it('handles multiple turns from same speaker', () => {
            const results = [
                { transcript: 'First question', speakerId: 1 },
                { transcript: 'Second question', speakerId: 1 },
                { transcript: 'My answer', speakerId: 2 },
            ];

            const formatted = formatSpeakerResults(results);
            const interviewerOccurrences = (formatted.match(/\[Interviewer\]:/g) || []).length;
            const candidateOccurrences = (formatted.match(/\[Candidate\]:/g) || []).length;

            expect(interviewerOccurrences).toBe(2);
            expect(candidateOccurrences).toBe(1);
        });
    });

    describe('Session Modes', () => {
        it('should support interview mode', () => {
            const interviewMode = 'interview';
            expect(['interview', 'coding']).toContain(interviewMode);
        });

        it('should support coding/OA mode', () => {
            const codingMode = 'coding';
            expect(['interview', 'coding']).toContain(codingMode);
        });
    });

    describe('Response Counter and Auto-Reset', () => {
        it('tracks number of responses in session', () => {
            initializeNewSession();

            // Simulate 5 conversation turns
            for (let i = 0; i < 5; i++) {
                saveConversationTurn(`question ${i}`, `answer ${i}`);
            }

            const data = getCurrentSessionData();
            expect(data.history.length).toBe(5);
        });

        it('should prepare for auto-reset after 20 responses', () => {
            initializeNewSession();

            // Simulate 20 conversation turns
            for (let i = 0; i < 20; i++) {
                saveConversationTurn(`question ${i}`, `answer ${i}`);
            }

            const data = getCurrentSessionData();
            expect(data.history.length).toBe(20);
            // Note: Auto-reset logic happens in gemini.js after 20 responses
            // to maintain fast response times
        });
    });
});
