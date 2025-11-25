describe('Session Timer Formatting', () => {
    // Simulate the getElapsedTime function from AppHeader.js
    function getElapsedTime(startTime) {
        if (!startTime) return '';

        const totalSeconds = Math.floor((Date.now() - startTime) / 1000);

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (num) => String(num).padStart(2, '0');

        if (hours > 0) {
            return `${hours}:${pad(minutes)}:${pad(seconds)}`;
        } else {
            return `${minutes}:${pad(seconds)}`;
        }
    }

    describe('Timer Display Format', () => {
        it('formats seconds correctly (0-59 seconds)', () => {
            const startTime = Date.now() - 45 * 1000; // 45 seconds ago
            const elapsed = getElapsedTime(startTime);

            expect(elapsed).toMatch(/^0:\d{2}$/);
            expect(elapsed).toBe('0:45');
        });

        it('formats minutes correctly (1-59 minutes)', () => {
            const startTime = Date.now() - (23 * 60 + 15) * 1000; // 23 minutes 15 seconds ago
            const elapsed = getElapsedTime(startTime);

            expect(elapsed).toMatch(/^\d{1,2}:\d{2}$/);
            expect(elapsed).toBe('23:15');
        });

        it('formats hours correctly (1+ hours)', () => {
            const startTime = Date.now() - (2 * 3600 + 15 * 60 + 30) * 1000; // 2:15:30 ago
            const elapsed = getElapsedTime(startTime);

            expect(elapsed).toMatch(/^\d{1,2}:\d{2}:\d{2}$/);
            expect(elapsed).toBe('2:15:30');
        });

        it('pads single digits with zeros', () => {
            const startTime = Date.now() - (5 * 60 + 3) * 1000; // 5:03
            const elapsed = getElapsedTime(startTime);

            expect(elapsed).toBe('5:03');
            expect(elapsed).not.toBe('5:3');
        });

        it('handles zero time correctly', () => {
            const startTime = Date.now();
            const elapsed = getElapsedTime(startTime);

            expect(elapsed).toBe('0:00');
        });

        it('returns empty string when no start time', () => {
            const elapsed = getElapsedTime(null);
            expect(elapsed).toBe('');
        });
    });

    describe('Timer Edge Cases', () => {
        it('handles long sessions (10+ hours)', () => {
            const startTime = Date.now() - (10 * 3600 + 30 * 60 + 45) * 1000; // 10:30:45
            const elapsed = getElapsedTime(startTime);

            expect(elapsed).toBe('10:30:45');
        });

        it('handles maximum values correctly', () => {
            const startTime = Date.now() - (99 * 3600 + 59 * 60 + 59) * 1000; // 99:59:59
            const elapsed = getElapsedTime(startTime);

            expect(elapsed).toBe('99:59:59');
        });
    });
});
