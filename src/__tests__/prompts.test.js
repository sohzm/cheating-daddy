const { getSystemPrompt, profilePrompts } = require('../utils/prompts');

describe('Prompt System Tests', () => {
    describe('Profile Prompts', () => {
        it('has all required interview profiles', () => {
            const requiredProfiles = ['interview', 'exam', 'sales', 'meeting', 'presentation', 'negotiation'];

            requiredProfiles.forEach(profile => {
                expect(profilePrompts[profile]).toBeDefined();
                expect(profilePrompts[profile].intro).toBeDefined();
                expect(profilePrompts[profile].formatRequirements).toBeDefined();
                expect(profilePrompts[profile].content).toBeDefined();
                expect(profilePrompts[profile].outputInstructions).toBeDefined();
            });
        });

        it('interview profile has enhanced code generation format', () => {
            const interviewPrompt = profilePrompts.interview.formatRequirements;

            // Check for LeetCode-style structured format
            expect(interviewPrompt).toContain('Approach:');
            expect(interviewPrompt).toContain('Intuition');
            expect(interviewPrompt).toContain('Implementation');
            expect(interviewPrompt).toContain('Complexity Analysis');
            expect(interviewPrompt).toContain('Algorithm:');
        });

        it('interview profile requires detailed intuition section', () => {
            const interviewPrompt = profilePrompts.interview.formatRequirements;

            expect(interviewPrompt).toContain('2-4 detailed paragraphs');
            expect(interviewPrompt).toContain('core logic and reasoning');
            expect(interviewPrompt).toContain('Key insights');
            expect(interviewPrompt).toContain('Mathematical concepts');
        });

        it('exam profile has comment-free code requirement', () => {
            const examIntro = profilePrompts.exam.intro;
            const examContent = profilePrompts.exam.content;
            const examOutputInstructions = profilePrompts.exam.outputInstructions;

            // Check that comment-free requirement is mentioned
            const fullPrompt = (examIntro + examContent + examOutputInstructions).toUpperCase();
            expect(fullPrompt).toContain('COMMENT-FREE');
            expect(fullPrompt).toContain('ZERO TOLERANCE');
            expect(fullPrompt).toContain('NO EXCEPTIONS');
        });
    });

    describe('System Prompt Generation', () => {
        it('generates interview prompt correctly', () => {
            const prompt = getSystemPrompt('interview', '', true);

            expect(prompt).toBeDefined();
            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(100);
        });

        it('includes custom prompt when provided', () => {
            const customPrompt = 'Focus on Python solutions';
            const prompt = getSystemPrompt('interview', customPrompt, true);

            expect(prompt).toContain(customPrompt);
        });

        it('includes search usage when enabled', () => {
            const promptWithSearch = getSystemPrompt('interview', '', true);
            const promptWithoutSearch = getSystemPrompt('interview', '', false);

            expect(promptWithSearch).toContain('SEARCH TOOL USAGE');
            expect(promptWithoutSearch).not.toContain('SEARCH TOOL USAGE');
        });

        it('defaults to interview prompt for unknown profiles', () => {
            const unknownPrompt = getSystemPrompt('unknown-profile', '', true);
            const interviewPrompt = getSystemPrompt('interview', '', true);

            expect(unknownPrompt).toBe(interviewPrompt);
        });
    });

    describe('Coding Question Format Requirements', () => {
        it('requires exact function signature preservation', () => {
            const interviewPrompt = profilePrompts.interview.formatRequirements;

            expect(interviewPrompt).toContain('EXACT FUNCTION SIGNATURE');
            expect(interviewPrompt).toContain('NEVER change parameter names');
            expect(interviewPrompt).toContain('PRESERVE');
        });

        it('specifies 5-section structure', () => {
            const outputInstructions = profilePrompts.interview.outputInstructions;

            expect(outputInstructions).toContain('Approach');
            expect(outputInstructions).toContain('Intuition');
            expect(outputInstructions).toContain('Implementation');
            expect(outputInstructions).toContain('Complexity Analysis');
            expect(outputInstructions).toContain('Algorithm');
        });

        it('requires complexity analysis with O notation', () => {
            const interviewPrompt = profilePrompts.interview.formatRequirements;

            expect(interviewPrompt).toContain('Time complexity: O(...)');
            expect(interviewPrompt).toContain('Space complexity: O(...)');
            expect(interviewPrompt).toContain('brief explanation');
        });
    });

    describe('Response Format Validation', () => {
        it('interview mode requires concise conversational responses', () => {
            const interviewPrompt = profilePrompts.interview.formatRequirements;

            expect(interviewPrompt).toContain('CONCISE');
            expect(interviewPrompt).toContain('2-4 sentences');
            expect(interviewPrompt).toContain('conversational');
        });

        it('specifies natural fillers for interview responses', () => {
            const interviewPrompt = profilePrompts.interview.formatRequirements;

            expect(interviewPrompt).toContain('Well,');
            expect(interviewPrompt).toContain('Actually,');
            expect(interviewPrompt).toContain('You know,');
        });

        it('exam mode requires direct answers only', () => {
            const examPrompt = profilePrompts.exam.formatRequirements;

            expect(examPrompt).toContain('MCQ');
            expect(examPrompt).toContain('NO explanations');
            expect(examPrompt).toContain('ONLY the final answer');
        });
    });

    describe('Language Support', () => {
        it('has language instruction section', () => {
            const prompt = getSystemPrompt('interview', '', true);

            // The language instruction is added dynamically in gemini.js
            // Here we just verify the base prompt structure supports it
            expect(prompt).toBeDefined();
        });
    });

    describe('Dual Mode Support', () => {
        it('interview profile supports both regular and coding questions', () => {
            const interviewPrompt = profilePrompts.interview.content;

            expect(interviewPrompt).toContain('CODING QUESTION');
            expect(interviewPrompt).toContain('APTITUDE');
        });

        it('exam profile has separate handling for different question types', () => {
            const examPrompt = profilePrompts.exam.content;

            expect(examPrompt).toContain('MCQ');
            expect(examPrompt).toContain('Coding');
            expect(examPrompt).toContain('Technical');
        });
    });
});
