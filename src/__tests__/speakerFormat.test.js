const { formatSpeakerResults } = require('../utils/gemini');

describe('formatSpeakerResults', () => {
    it('formats diarization results', () => {
        const results = [
            { transcript: 'hello', speakerId: 1 },
            { transcript: 'hi', speakerId: 2 },
        ];
        const text = formatSpeakerResults(results);
        expect(text).toBe('[Interviewer]: hello\n[Candidate]: hi\n');
    });
});
