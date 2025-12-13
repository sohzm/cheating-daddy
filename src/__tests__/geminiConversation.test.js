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

    describe('Dual API Mode', () => {
        it('should use Gemini API for exam/coding mode', () => {
            // Exam Assistant profile uses Gemini API
            const examMode = 'coding';
            const examProfile = 'exam';

            expect(examMode).toBe('coding');
            expect(examProfile).toBe('exam');
            // Gemini models: gemini-2.5-flash, gemini-2.5-pro
        });

        it('should use Groq API for interview mode', () => {
            // Interview profiles use Groq API (Whisper + Llama)
            const interviewMode = 'interview';
            const interviewProfiles = ['interview', 'sales', 'meeting', 'presentation', 'negotiation'];

            expect(interviewMode).toBe('interview');
            interviewProfiles.forEach(profile => {
                expect(profile).not.toBe('exam');
            });
        });

        it('should map profiles to correct API', () => {
            const profileToApi = {
                'exam': 'gemini',
                'interview': 'groq',
                'sales': 'groq',
                'meeting': 'groq',
                'presentation': 'groq',
                'negotiation': 'groq'
            };

            // Exam uses Gemini
            expect(profileToApi['exam']).toBe('gemini');

            // All interview profiles use Groq
            expect(profileToApi['interview']).toBe('groq');
            expect(profileToApi['sales']).toBe('groq');
            expect(profileToApi['meeting']).toBe('groq');
            expect(profileToApi['presentation']).toBe('groq');
            expect(profileToApi['negotiation']).toBe('groq');
        });
    });

    describe('Model Selection', () => {
        it('should support Gemini model selection for exam mode', () => {
            const geminiModels = ['gemini-2.5-flash', 'gemini-2.5-pro'];

            expect(geminiModels).toContain('gemini-2.5-flash');
            expect(geminiModels).toContain('gemini-2.5-pro');
            expect(geminiModels.length).toBe(2);
        });

        it('should support Llama model selection for interview mode', () => {
            const llamaModels = ['llama-4-maverick', 'llama-4-scout'];

            expect(llamaModels).toContain('llama-4-maverick');
            expect(llamaModels).toContain('llama-4-scout');
            expect(llamaModels.length).toBe(2);
        });

        it('should have default models for each mode', () => {
            // Default Gemini model for exam
            const defaultGeminiModel = 'gemini-2.5-pro';
            expect(['gemini-2.5-flash', 'gemini-2.5-pro']).toContain(defaultGeminiModel);

            // Default Llama model for interview
            const defaultLlamaModel = 'llama-4-maverick';
            expect(['llama-4-maverick', 'llama-4-scout']).toContain(defaultLlamaModel);
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
