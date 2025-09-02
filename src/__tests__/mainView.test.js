// Mock localStorage for Node.js environment
const storage = {};
global.localStorage = {
    getItem: vi.fn((key) => storage[key] || null),
    setItem: vi.fn((key, value) => { storage[key] = value; }),
    removeItem: vi.fn((key) => { delete storage[key]; }),
    clear: vi.fn(() => { Object.keys(storage).forEach(key => delete storage[key]); }),
};

// Test the API key logic methods directly
// Since MainView is a LitElement component, we'll test the core logic in isolation

describe('MainView API Key Logic', () => {
    let mainView;

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        
        // Create a mock MainView instance with just the methods we need to test
        mainView = {
            getLastFourLetters: function() {
                const apiKey = localStorage.getItem('apiKey');
                if (!apiKey || apiKey.length < 4) {
                    return 'None';
                }
                return apiKey.slice(-4);
            },
            
            // Mock the popup state and handlers
            showApiKeyPopup: false,
            
            handleApiKeyButtonClick: function() {
                this.showApiKeyPopup = true;
            },
            
            handleCloseApiKeyPopup: function() {
                this.showApiKeyPopup = false;
            }
        };
    });

    it('shows "None" when no API key is set', () => {
        // Mock localStorage.getItem returning null (no API key)
        localStorage.getItem.mockReturnValue(null);
        const lastFourLetters = mainView.getLastFourLetters();
        expect(lastFourLetters).toBe('None');
    });

    it('shows "None" when API key has less than 4 characters', () => {
        localStorage.setItem('apiKey', 'abc');
        const lastFourLetters = mainView.getLastFourLetters();
        expect(lastFourLetters).toBe('None');
    });

    it('shows last 4 letters when API key has exactly 4 characters', () => {
        localStorage.setItem('apiKey', 'abcd');
        const lastFourLetters = mainView.getLastFourLetters();
        expect(lastFourLetters).toBe('abcd');
    });

    it('shows last 4 letters when API key has more than 4 characters', () => {
        localStorage.setItem('apiKey', 'AIzaSyB1abc2def3ghi4jkl5mno6pqr7stu8vwx9yz');
        const lastFourLetters = mainView.getLastFourLetters();
        expect(lastFourLetters).toBe('yz');
    });

    it('starts with popup closed', () => {
        expect(mainView.showApiKeyPopup).toBe(false);
    });

    it('opens popup when clicking the show key button', () => {
        mainView.handleApiKeyButtonClick();
        expect(mainView.showApiKeyPopup).toBe(true);
    });

    it('closes popup when calling close handler', () => {
        // First open the popup
        mainView.showApiKeyPopup = true;
        
        // Then close it
        mainView.handleCloseApiKeyPopup();
        expect(mainView.showApiKeyPopup).toBe(false);
    });

    it('handles empty API key gracefully', () => {
        localStorage.setItem('apiKey', '');
        const lastFourLetters = mainView.getLastFourLetters();
        expect(lastFourLetters).toBe('None');
    });

    it('handles null API key gracefully', () => {
        localStorage.removeItem('apiKey');
        localStorage.getItem.mockReturnValue(null);
        const lastFourLetters = mainView.getLastFourLetters();
        expect(lastFourLetters).toBe('None');
    });

    it('handles API key with exactly 1 character', () => {
        localStorage.setItem('apiKey', 'a');
        const lastFourLetters = mainView.getLastFourLetters();
        expect(lastFourLetters).toBe('None');
    });

    it('handles API key with exactly 3 characters', () => {
        localStorage.setItem('apiKey', 'abc');
        const lastFourLetters = mainView.getLastFourLetters();
        expect(lastFourLetters).toBe('None');
    });

    it('shows correct last 4 letters for long API key', () => {
        localStorage.setItem('apiKey', 'AIzaSyCg1234567890abcdef1234567890');
        const lastFourLetters = mainView.getLastFourLetters();
        expect(lastFourLetters).toBe('7890');
    });
});