import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';
import '../common/CustomDropdown.js';

export class CustomizeView extends LitElement {
    static styles = css`
        * {
            font-family:
                'Inter',
                -apple-system,
                BlinkMacSystemFont,
                sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            padding: 8px;
            margin: 0 auto;
            max-width: 750px;
            overflow: visible;
        }

        .settings-container {
            display: grid;
            gap: 8px;
            padding-bottom: 10px;
        }

        .settings-section {
            background: var(--card-background, rgba(255, 255, 255, 0.04));
            border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
            border-radius: 6px;
            padding: 12px;
            position: relative;
            overflow: visible;
        }

        .section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-color);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .section-title::before {
            content: '';
            width: 3px;
            height: 14px;
            background: var(--accent-color, #007aff);
            border-radius: 1.5px;
        }

        .form-grid {
            display: grid;
            gap: 8px;
            overflow: visible;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            align-items: start;
            overflow: visible;
        }

        @media (max-width: 600px) {
            .form-row {
                grid-template-columns: 1fr;
            }
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
            overflow: visible;
            position: relative;
        }

        .form-group.full-width {
            grid-column: 1 / -1;
        }

        .form-label {
            font-weight: 500;
            font-size: 12px;
            color: var(--label-color, rgba(255, 255, 255, 0.9));
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .form-description {
            font-size: 11px;
            color: var(--description-color, rgba(255, 255, 255, 0.5));
            line-height: 1.3;
            margin-top: 1px;
        }

        .form-control {
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            color: var(--text-color);
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.15));
            padding: 8px 10px;
            border-radius: 4px;
            font-size: 12px;
            transition: all 0.15s ease;
            min-height: 16px;
            font-weight: 400;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--focus-border-color, #007aff);
            box-shadow: 0 0 0 2px var(--focus-shadow, rgba(0, 122, 255, 0.1));
            background: var(--input-focus-background, rgba(0, 0, 0, 0.4));
        }

        .form-control:hover:not(:focus) {
            border-color: var(--input-hover-border, rgba(255, 255, 255, 0.2));
            background: var(--input-hover-background, rgba(0, 0, 0, 0.35));
        }

        /* Custom dropdown styling removed - now using custom-dropdown component */

        textarea.form-control {
            resize: vertical;
            min-height: 60px;
            line-height: 1.4;
            font-family: inherit;
        }

        textarea.form-control::placeholder {
            color: var(--placeholder-color, rgba(255, 255, 255, 0.4));
        }

        .profile-option {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .current-selection {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 10px;
            color: var(--success-color, #34d399);
            background: var(--success-background, rgba(52, 211, 153, 0.1));
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
            border: 1px solid var(--success-border, rgba(52, 211, 153, 0.2));
        }

        .current-selection::before {
            content: '✓';
            font-weight: 600;
        }

        .keybind-input {
            cursor: default;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
            text-align: center;
            letter-spacing: 0.5px;
            font-weight: 500;
        }

        .keybind-input:focus {
            cursor: default;
            background: var(--input-focus-background, rgba(0, 122, 255, 0.1));
        }

        .keybind-input::placeholder {
            color: var(--placeholder-color, rgba(255, 255, 255, 0.4));
            font-style: italic;
        }

        .reset-keybinds-button {
            background: var(--button-background, rgba(255, 255, 255, 0.1));
            color: var(--text-color);
            border: 1px solid var(--button-border, rgba(255, 255, 255, 0.15));
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            cursor: default;
            transition: all 0.15s ease;
        }

        .reset-keybinds-button:hover {
            background: var(--button-hover-background, rgba(255, 255, 255, 0.15));
            border-color: var(--button-hover-border, rgba(255, 255, 255, 0.25));
        }

        .reset-keybinds-button:active {
            transform: translateY(1px);
        }

        .keybinds-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            border-radius: 4px;
            overflow: hidden;
        }

        .keybinds-table th,
        .keybinds-table td {
            padding: 8px 10px;
            text-align: left;
            border-bottom: 1px solid var(--table-border, rgba(255, 255, 255, 0.08));
        }

        .keybinds-table th {
            background: var(--table-header-background, rgba(255, 255, 255, 0.04));
            font-weight: 600;
            font-size: 11px;
            color: var(--label-color, rgba(255, 255, 255, 0.8));
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .keybinds-table td {
            vertical-align: middle;
        }

        .keybinds-table .action-name {
            font-weight: 500;
            color: var(--text-color);
            font-size: 12px;
        }

        .keybinds-table .action-description {
            font-size: 10px;
            color: var(--description-color, rgba(255, 255, 255, 0.5));
            margin-top: 1px;
        }

        .keybinds-table .keybind-input {
            min-width: 100px;
            padding: 4px 8px;
            margin: 0;
            font-size: 11px;
        }

        .keybinds-table tr:hover {
            background: var(--table-row-hover, rgba(255, 255, 255, 0.02));
        }

        .keybinds-table tr:last-child td {
            border-bottom: none;
        }

        .table-reset-row {
            border-top: 1px solid var(--table-border, rgba(255, 255, 255, 0.08));
        }

        .table-reset-row td {
            padding-top: 10px;
            padding-bottom: 8px;
            border-bottom: none;
        }

        .settings-note {
            font-size: 10px;
            color: var(--note-color, rgba(255, 255, 255, 0.4));
            font-style: italic;
            text-align: center;
            margin-top: 6px;
            padding: 6px;
            background: var(--note-background, rgba(255, 255, 255, 0.02));
            border-radius: 4px;
            border: 1px solid var(--note-border, rgba(255, 255, 255, 0.08));
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
            padding: 6px;
            background: var(--checkbox-background, rgba(255, 255, 255, 0.02));
            border-radius: 4px;
            border: 1px solid var(--checkbox-border, rgba(255, 255, 255, 0.06));
        }

        .checkbox-input {
            width: 14px;
            height: 14px;
            accent-color: var(--focus-border-color, #007aff);
            cursor: default;
        }

        .checkbox-label {
            font-weight: 500;
            font-size: 12px;
            color: var(--label-color, rgba(255, 255, 255, 0.9));
            cursor: default;
            user-select: none;
        }

        /* Better focus indicators */
        .form-control:focus-visible {
            outline: none;
            border-color: var(--focus-border-color, #007aff);
            box-shadow: 0 0 0 2px var(--focus-shadow, rgba(0, 122, 255, 0.1));
        }

        /* Improved button states */
        .reset-keybinds-button:focus-visible {
            outline: none;
            border-color: var(--focus-border-color, #007aff);
            box-shadow: 0 0 0 2px var(--focus-shadow, rgba(0, 122, 255, 0.1));
        }

        /* Slider styles */
        .slider-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .slider-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .slider-value {
            font-size: 11px;
            color: var(--success-color, #34d399);
            background: var(--success-background, rgba(52, 211, 153, 0.1));
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
            border: 1px solid var(--success-border, rgba(52, 211, 153, 0.2));
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
        }

        .slider-input {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 4px;
            border-radius: 2px;
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            outline: none;
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.15));
            cursor: default;
        }

        .slider-input::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--focus-border-color, #007aff);
            cursor: default;
            border: 2px solid var(--text-color, white);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider-input::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--focus-border-color, #007aff);
            cursor: default;
            border: 2px solid var(--text-color, white);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider-input:hover::-webkit-slider-thumb {
            background: var(--text-input-button-hover, #0056b3);
        }

        .slider-input:hover::-moz-range-thumb {
            background: var(--text-input-button-hover, #0056b3);
        }

        .slider-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
            font-size: 10px;
            color: var(--description-color, rgba(255, 255, 255, 0.5));
        }

        .mode-display-box {
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.15));
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 12px;
            color: var(--text-color);
            cursor: default;
        }

        .warning-box {
            background: var(--warning-background, rgba(251, 191, 36, 0.08));
            border: 1px solid var(--warning-border, rgba(251, 191, 36, 0.2));
            border-radius: 4px;
            padding: 12px;
            font-size: 11px;
            color: var(--warning-color, #fbbf24);
            display: flex;
            align-items: flex-start;
            gap: 8px;
            line-height: 1.4;
        }

        .warning-icon {
            flex-shrink: 0;
            font-size: 12px;
            margin-top: 1px;
        }
    `;

    static properties = {
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        selectedScreenshotInterval: { type: String },
        selectedImageQuality: { type: String },
        layoutMode: { type: String },
        keybinds: { type: Object },
        googleSearchEnabled: { type: Boolean },
        vadEnabled: { type: Boolean },
        vadMode: { type: String },
        backgroundTransparency: { type: Number },
        fontSize: { type: Number },
        onProfileChange: { type: Function },
        onLanguageChange: { type: Function },
        onScreenshotIntervalChange: { type: Function },
        onImageQualityChange: { type: Function },
        onLayoutModeChange: { type: Function },
        advancedMode: { type: Boolean },
        onAdvancedModeChange: { type: Function },
        selectedMode: { type: String },
        selectedModel: { type: String },
    };

    constructor() {
        super();
        this.selectedProfile = 'exam';
        this.selectedLanguage = 'en-US';
        this.selectedScreenshotInterval = '5';
        this.selectedImageQuality = 'high';
        this.layoutMode = 'compact';
        this.keybinds = this.getDefaultKeybinds();
        this.onProfileChange = () => {};
        this.onLanguageChange = () => {};
        this.onScreenshotIntervalChange = () => {};
        this.onImageQualityChange = () => {};
        this.onLayoutModeChange = () => {};
        this.onAdvancedModeChange = () => {};

        // Google Search default
        this.googleSearchEnabled = true;

        // Advanced mode default
        this.advancedMode = false;

        // VAD (Voice Activity Detection) default
        this.vadEnabled = true;
        this.vadMode = 'automatic'; // 'automatic' or 'manual'

        // Background transparency default
        this.backgroundTransparency = 0.61;

        // Font size default (in pixels)
        this.fontSize = 13;

        // Mode and model selection defaults
        this.selectedMode = 'interview';
        this.selectedModel = 'gemini-2.5-pro';

        this.loadKeybinds();
        this.loadGoogleSearchSettings();
        this.loadAdvancedModeSettings();
        this.loadVADSettings();
        this.loadBackgroundTransparency();
        this.loadFontSize();
        this.loadModeSettings();
        this.initializeDefaultInstructions();
    }

    connectedCallback() {
        super.connectedCallback();
        // Load layout mode for display purposes
        this.loadLayoutMode();
        // Resize window for this view
        resizeLayout();
    }

    getProfiles() {
        return [
            {
                value: 'interview',
                name: 'Job Interview',
                description: 'Get help with answering interview questions',
            },
            {
                value: 'sales',
                name: 'Sales Call',
                description: 'Assist with sales conversations and objection handling',
            },
            {
                value: 'meeting',
                name: 'Business Meeting',
                description: 'Support for professional meetings and discussions',
            },
            {
                value: 'presentation',
                name: 'Presentation',
                description: 'Help with presentations and public speaking',
            },
            {
                value: 'negotiation',
                name: 'Negotiation',
                description: 'Guidance for business negotiations and deals',
            },
            {
                value: 'exam',
                name: 'Exam Assistant',
                description: 'Academic assistance for test-taking and exam questions',
            },
        ];
    }

    getLanguages() {
        return [
            { value: 'en-US', name: 'English (US)' },
            { value: 'en-GB', name: 'English (UK)' },
            { value: 'en-AU', name: 'English (Australia)' },
            { value: 'en-IN', name: 'English (India)' },
            { value: 'de-DE', name: 'German (Germany)' },
            { value: 'es-US', name: 'Spanish (United States)' },
            { value: 'es-ES', name: 'Spanish (Spain)' },
            { value: 'fr-FR', name: 'French (France)' },
            { value: 'fr-CA', name: 'French (Canada)' },
            { value: 'hi-IN', name: 'Hindi (India)' },
            { value: 'pt-BR', name: 'Portuguese (Brazil)' },
            { value: 'ar-XA', name: 'Arabic (Generic)' },
            { value: 'id-ID', name: 'Indonesian (Indonesia)' },
            { value: 'it-IT', name: 'Italian (Italy)' },
            { value: 'ja-JP', name: 'Japanese (Japan)' },
            { value: 'tr-TR', name: 'Turkish (Turkey)' },
            { value: 'vi-VN', name: 'Vietnamese (Vietnam)' },
            { value: 'bn-IN', name: 'Bengali (India)' },
            { value: 'gu-IN', name: 'Gujarati (India)' },
            { value: 'kn-IN', name: 'Kannada (India)' },
            { value: 'ml-IN', name: 'Malayalam (India)' },
            { value: 'mr-IN', name: 'Marathi (India)' },
            { value: 'ta-IN', name: 'Tamil (India)' },
            { value: 'te-IN', name: 'Telugu (India)' },
            { value: 'nl-NL', name: 'Dutch (Netherlands)' },
            { value: 'ko-KR', name: 'Korean (South Korea)' },
            { value: 'cmn-CN', name: 'Mandarin Chinese (China)' },
            { value: 'pl-PL', name: 'Polish (Poland)' },
            { value: 'ru-RU', name: 'Russian (Russia)' },
            { value: 'th-TH', name: 'Thai (Thailand)' },
        ];
    }

    getProfileNames() {
        return {
            interview: 'Job Interview',
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
            exam: 'Exam Assistant',
        };
    }

    handleProfileSelect(e) {
        // Save current textarea content to the previous profile before switching
        const currentTextareaValue = this.shadowRoot?.querySelector('textarea')?.value || localStorage.getItem('customPrompt') || '';
        if (this.selectedProfile && currentTextareaValue !== undefined) {
            this.setCustomPromptForProfile(this.selectedProfile, currentTextareaValue);
        }

        // Switch to new profile
        this.selectedProfile = e.target.value;
        localStorage.setItem('selectedProfile', this.selectedProfile);

        // Load instructions for the new profile
        const newProfileInstructions = this.getCustomPromptForProfile(this.selectedProfile);
        localStorage.setItem('customPrompt', newProfileInstructions);

        // Auto-set mode based on profile
        if (this.selectedProfile === 'exam') {
            // Exam Assistant -> Coding/OA mode
            this.selectedMode = 'coding';
            localStorage.setItem('selectedMode', 'coding');
        } else {
            // All other profiles -> Interview mode
            this.selectedMode = 'interview';
            localStorage.setItem('selectedMode', 'interview');
        }

        // Update the textarea value
        this.requestUpdate();

        this.onProfileChange(this.selectedProfile);
    }

    handleLanguageSelect(e) {
        this.selectedLanguage = e.target.value;
        localStorage.setItem('selectedLanguage', this.selectedLanguage);
        this.onLanguageChange(this.selectedLanguage);
    }

    handleScreenshotIntervalSelect(e) {
        this.selectedScreenshotInterval = e.target.value;
        localStorage.setItem('selectedScreenshotInterval', this.selectedScreenshotInterval);
        this.onScreenshotIntervalChange(this.selectedScreenshotInterval);
    }

    handleImageQualitySelect(e) {
        this.selectedImageQuality = e.target.value;
        this.onImageQualityChange(e.target.value);
    }

    handleLayoutModeSelect(e) {
        this.layoutMode = e.target.value;
        localStorage.setItem('layoutMode', this.layoutMode);
        this.onLayoutModeChange(e.target.value);
    }

    handleCustomPromptInput(e) {
        // Store custom prompt for the current profile
        this.setCustomPromptForProfile(this.selectedProfile, e.target.value);
    }

    getCustomPromptForProfile(profile) {
        const key = `customPrompt_${profile}`;
        const saved = localStorage.getItem(key);
        if (saved !== null) {
            return saved;
        }
        // If no custom prompt exists for this profile, return default instructions
        return this.getDefaultInstructions(profile);
    }

    setCustomPromptForProfile(profile, value) {
        const key = `customPrompt_${profile}`;
        localStorage.setItem(key, value);
        // Also update the legacy customPrompt for compatibility
        localStorage.setItem('customPrompt', value);
    }

    getDefaultInstructions(profile) {
        const defaultInstructions = {
            exam: `Help me with MCQ, coding and aptitude questions. Provide clear answers.`,
            interview: `Help me with technical and HR interview questions. Give natural, professional responses.`,
            sales: `Help me with sales calls and client conversations. Provide persuasive, relationship-building responses.`,
            meeting: `Help me in business meetings and discussions. Give professional, collaborative input.`,
            presentation: `Help me with presentations and public speaking. Provide engaging, confident responses.`,
            negotiation: `Help me with business negotiations and deals. Give strategic, win-win focused advice.`
        };
        return defaultInstructions[profile] || '';
    }

    getDefaultKeybinds() {
        const isMac = cheddar.isMacOS || navigator.platform.includes('Mac');
        return {
            moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
            moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
            moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
            moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
            toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
            toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
            toggleMicrophone: isMac ? 'Cmd+Shift+M' : 'Ctrl+Shift+M',
            nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
            previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
            nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
            scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
            scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
            copyCodeBlocks: isMac ? 'Cmd+Shift+C' : 'Ctrl+Shift+C',
            emergencyErase: isMac ? 'Cmd+Shift+E' : 'Ctrl+Shift+E',
        };
    }

    loadKeybinds() {
        const savedKeybinds = localStorage.getItem('customKeybinds');
        if (savedKeybinds) {
            try {
                this.keybinds = { ...this.getDefaultKeybinds(), ...JSON.parse(savedKeybinds) };
            } catch (e) {
                console.error('Failed to parse saved keybinds:', e);
                this.keybinds = this.getDefaultKeybinds();
            }
        }
    }

    saveKeybinds() {
        localStorage.setItem('customKeybinds', JSON.stringify(this.keybinds));
        // Send to main process to update global shortcuts
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('update-keybinds', this.keybinds);
        }
    }

    handleKeybindChange(action, value) {
        this.keybinds = { ...this.keybinds, [action]: value };
        this.saveKeybinds();
        this.requestUpdate();
    }

    resetKeybinds() {
        this.keybinds = this.getDefaultKeybinds();
        localStorage.removeItem('customKeybinds');
        this.requestUpdate();
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('update-keybinds', this.keybinds);
        }
    }

    getKeybindActions() {
        return [
            {
                key: 'moveUp',
                name: 'Move Window Up',
                description: 'Move the application window up',
            },
            {
                key: 'moveDown',
                name: 'Move Window Down',
                description: 'Move the application window down',
            },
            {
                key: 'moveLeft',
                name: 'Move Window Left',
                description: 'Move the application window left',
            },
            {
                key: 'moveRight',
                name: 'Move Window Right',
                description: 'Move the application window right',
            },
            {
                key: 'toggleVisibility',
                name: 'Toggle Window Visibility',
                description: 'Show/hide the application window',
            },
            {
                key: 'toggleClickThrough',
                name: 'Toggle Click-through Mode',
                description: 'Enable/disable click-through functionality',
            },
            {
                key: 'toggleMicrophone',
                name: 'Toggle Microphone',
                description: 'Toggle microphone ON/OFF (Manual VAD mode only)',
            },
            {
                key: 'nextStep',
                name: 'Ask Next Step',
                description: 'Take screenshot and ask AI for the next step suggestion',
            },
            {
                key: 'previousResponse',
                name: 'Previous Response',
                description: 'Navigate to the previous AI response',
            },
            {
                key: 'nextResponse',
                name: 'Next Response',
                description: 'Navigate to the next AI response',
            },
            {
                key: 'scrollUp',
                name: 'Scroll Response Up',
                description: 'Scroll the AI response content up',
            },
            {
                key: 'scrollDown',
                name: 'Scroll Response Down',
                description: 'Scroll the AI response content down',
            },
            {
                key: 'copyCodeBlocks',
                name: 'Copy AI Response',
                description: 'Copy the current AI response to clipboard',
            },
            {
                key: 'emergencyErase',
                name: 'Emergency Erase',
                description: 'Immediately hide window, clear data, and quit application',
            },
        ];
    }

    handleKeybindFocus(e) {
        e.target.placeholder = 'Press key combination...';
        e.target.select();
    }

    handleKeybindInput(e) {
        e.preventDefault();

        const modifiers = [];
        const keys = [];

        // Check modifiers
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.metaKey) modifiers.push('Cmd');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');

        // Get the main key
        let mainKey = e.key;

        // Handle special keys
        switch (e.code) {
            case 'ArrowUp':
                mainKey = 'Up';
                break;
            case 'ArrowDown':
                mainKey = 'Down';
                break;
            case 'ArrowLeft':
                mainKey = 'Left';
                break;
            case 'ArrowRight':
                mainKey = 'Right';
                break;
            case 'Enter':
                mainKey = 'Enter';
                break;
            case 'Space':
                mainKey = 'Space';
                break;
            case 'Backslash':
                mainKey = '\\';
                break;
            case 'KeyS':
                if (e.shiftKey) mainKey = 'S';
                break;
            case 'KeyM':
                mainKey = 'M';
                break;
            default:
                if (e.key.length === 1) {
                    mainKey = e.key.toUpperCase();
                }
                break;
        }

        // Skip if only modifier keys are pressed
        if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
            return;
        }

        // Construct keybind string
        const keybind = [...modifiers, mainKey].join('+');

        // Get the action from the input's data attribute
        const action = e.target.dataset.action;

        // Update the keybind
        this.handleKeybindChange(action, keybind);

        // Update the input value
        e.target.value = keybind;
        e.target.blur();
    }

    loadGoogleSearchSettings() {
        const googleSearchEnabled = localStorage.getItem('googleSearchEnabled');
        if (googleSearchEnabled !== null) {
            this.googleSearchEnabled = googleSearchEnabled === 'true';
        }
    }

    async handleGoogleSearchChange(e) {
        this.googleSearchEnabled = e.target.checked;
        localStorage.setItem('googleSearchEnabled', this.googleSearchEnabled.toString());

        // Notify main process if available
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('update-google-search-setting', this.googleSearchEnabled);
            } catch (error) {
                console.error('Failed to notify main process:', error);
            }
        }

        this.requestUpdate();
    }

    loadLayoutMode() {
        const savedLayoutMode = localStorage.getItem('layoutMode');
        if (savedLayoutMode) {
            this.layoutMode = savedLayoutMode;
        }
    }

    loadAdvancedModeSettings() {
        const advancedMode = localStorage.getItem('advancedMode');
        if (advancedMode !== null) {
            this.advancedMode = advancedMode === 'true';
        }
    }

    loadVADSettings() {
        const vadEnabled = localStorage.getItem('vadEnabled');
        if (vadEnabled !== null) {
            this.vadEnabled = vadEnabled === 'true';
        }

        const vadMode = localStorage.getItem('vadMode');
        if (vadMode !== null) {
            this.vadMode = vadMode;
        }
    }

    async handleVADChange(e) {
        this.vadEnabled = e.target.checked;
        localStorage.setItem('vadEnabled', this.vadEnabled.toString());

        // Notify main process if available
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('update-vad-setting', this.vadEnabled);
            } catch (error) {
                console.error('Failed to notify main process of VAD setting change:', error);
            }
        }

        this.requestUpdate();
    }

    async handleVADModeChange(e) {
        this.vadMode = e.detail.value;
        localStorage.setItem('vadMode', this.vadMode);

        // Notify main process if available
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('update-vad-mode', this.vadMode);
            } catch (error) {
                console.error('Failed to notify main process of VAD mode change:', error);
            }
        }

        this.requestUpdate();
    }

    async handleAdvancedModeChange(e) {
        this.advancedMode = e.target.checked;
        localStorage.setItem('advancedMode', this.advancedMode.toString());
        this.onAdvancedModeChange(this.advancedMode);
        this.requestUpdate();
    }

    loadBackgroundTransparency() {
        const backgroundTransparency = localStorage.getItem('backgroundTransparency');
        if (backgroundTransparency !== null) {
            this.backgroundTransparency = parseFloat(backgroundTransparency) || 0.8;
        }
        this.updateBackgroundTransparency();
    }

    handleBackgroundTransparencyChange(e) {
        this.backgroundTransparency = parseFloat(e.target.value);
        localStorage.setItem('backgroundTransparency', this.backgroundTransparency.toString());
        this.updateBackgroundTransparency();
        this.requestUpdate();
    }

    updateBackgroundTransparency() {
        const root = document.documentElement;
        root.style.setProperty('--header-background', `rgba(0, 0, 0, ${this.backgroundTransparency})`);
        root.style.setProperty('--main-content-background', `rgba(0, 0, 0, ${this.backgroundTransparency})`);
        root.style.setProperty('--card-background', `rgba(255, 255, 255, ${this.backgroundTransparency * 0.05})`);
        root.style.setProperty('--input-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.375})`);
        root.style.setProperty('--input-focus-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.625})`);
        root.style.setProperty('--button-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.625})`);
        root.style.setProperty('--preview-video-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 1.125})`);
        root.style.setProperty('--screen-option-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.5})`);
        root.style.setProperty('--screen-option-hover-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.75})`);
        root.style.setProperty('--scrollbar-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.5})`);
    }

    loadFontSize() {
        const fontSize = localStorage.getItem('fontSize');
        if (fontSize !== null) {
            this.fontSize = parseInt(fontSize, 10) || 20;
        }
        this.updateFontSize();
    }

    handleFontSizeChange(e) {
        this.fontSize = parseInt(e.target.value, 10);
        localStorage.setItem('fontSize', this.fontSize.toString());
        this.updateFontSize();
        this.requestUpdate();
    }

    updateFontSize() {
        const root = document.documentElement;
        root.style.setProperty('--response-font-size', `${this.fontSize}px`);
    }

    initializeDefaultInstructions() {
        // Load saved profile or use default
        const savedProfile = localStorage.getItem('selectedProfile');
        if (savedProfile) {
            this.selectedProfile = savedProfile;
        }

        // Load instructions for the current profile
        const profileInstructions = this.getCustomPromptForProfile(this.selectedProfile);
        localStorage.setItem('customPrompt', profileInstructions);
    }

    // Mode and model selection methods
    loadModeSettings() {
        const selectedMode = localStorage.getItem('selectedMode');
        const selectedModel = localStorage.getItem('selectedModel');

        this.selectedMode = selectedMode || 'interview';
        this.selectedModel = selectedModel || 'gemini-2.5-pro';
    }

    async handleModeChange(e) {
        this.selectedMode = e.target.value;
        localStorage.setItem('selectedMode', this.selectedMode);

        // In interview mode, always use live API
        // In coding mode, user can choose between flash and pro
        if (this.selectedMode === 'interview') {
            this.selectedModel = 'gemini-2.5-flash';
        } else {
            // Keep current model selection for coding mode
            if (this.selectedModel === 'gemini-2.5-flash' || this.selectedModel === 'gemini-2.5-pro') {
                // Keep the selection
            } else {
                // Default to pro for coding mode
                this.selectedModel = 'gemini-2.5-pro';
            }
        }
        localStorage.setItem('selectedModel', this.selectedModel);

        this.requestUpdate();
    }

    async handleModelChange(e) {
        this.selectedModel = e.target.value;
        localStorage.setItem('selectedModel', this.selectedModel);

        this.requestUpdate();
    }

    render() {
        const profiles = this.getProfiles();
        const languages = this.getLanguages();
        const profileNames = this.getProfileNames();
        const currentProfile = profiles.find(p => p.value === this.selectedProfile);
        const currentLanguage = languages.find(l => l.value === this.selectedLanguage);

        return html`
            <div class="settings-container">
                <!-- Profile & Behavior Section -->
                <div class="settings-section">
                    <div class="section-title">
                        <span>AI Profile & Behavior</span>
                    </div>

                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    Profile Type
                                    <span class="current-selection">${currentProfile?.name || 'Unknown'}</span>
                                </label>
                                <custom-dropdown
                                    .value=${this.selectedProfile}
                                    .options=${profiles.map(p => ({ value: p.value, label: p.name }))}
                                    @change=${e => this.handleProfileSelect({ target: { value: e.detail.value } })}
                                ></custom-dropdown>
                            </div>
                        </div>

                        <div class="form-group full-width">
                            <label class="form-label">Custom AI Instructions</label>
                            <textarea
                                class="form-control"
                                placeholder="Add specific instructions for how you want the AI to behave during ${
                                    profileNames[this.selectedProfile] || 'this interaction'
                                }..."
                                .value=${localStorage.getItem('customPrompt') || ''}
                                rows="4"
                                @input=${this.handleCustomPromptInput}
                            ></textarea>
                            <div class="form-description">
                                Personalize the AI's behavior with specific instructions that will be added to the
                                ${profileNames[this.selectedProfile] || 'selected profile'} base prompts
                </div>
                </div>
            </div>
        </div>

                <!-- Mode Selection Section (Coding vs Interview) -->
                <div class="settings-section">
                    <div class="section-title">
                        <span>Application Mode</span>
                    </div>

                    <div class="form-grid">
                        ${this.selectedProfile === 'exam' ? html`
                            <!-- Exam Assistant mode: Only Coding/OA mode available -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Mode (Fixed for Exam Assistant)</label>
                                    <div class="mode-display-box">
                                        💻 Coding/OA Mode (Screenshot-based)
                                    </div>
                                    <div class="form-description">
                                        Exam Assistant profile uses Gemini API 2.5 Flash or 2.5 Pro for better problem-solving responses.
                                    </div>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Model Selection</label>
                                    <custom-dropdown
                                        .value=${this.selectedModel}
                                        .options=${[
                                            { value: 'gemini-2.5-flash', label: '⚡ Gemini 2.5 Flash (Faster, Balanced)' },
                                            { value: 'gemini-2.5-pro', label: '🚀 Gemini 2.5 Pro (Slower, More Accurate)' }
                                        ]}
                                        @change=${e => this.handleModelChange({ target: { value: e.detail.value } })}
                                    ></custom-dropdown>
                                    <div class="form-description">
                                        ${this.selectedModel === 'gemini-2.5-flash'
                                            ? 'Gemini 2.5 Flash: Faster responses, good for time-sensitive coding assessments.'
                                            : 'Gemini 2.5 Pro: More accurate and detailed responses, better for complex problems.'}
                                    </div>
                                </div>
                            </div>
                        ` : html`
                            <!-- Other profiles: Only Interview mode available -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Mode (Fixed for ${this.getProfileNames()[this.selectedProfile]})</label>
                                    <div class="mode-display-box">
                                        🎤 Interview Mode (Real-time Audio/Video)
                                    </div>
                                    <div class="form-description">
                                        ${this.getProfileNames()[this.selectedProfile]} profile uses Interview mode with Gemini 2.5 Flash for real-time audio processing and live interactions.
                                    </div>
                                </div>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Audio Section -->
                <div class="settings-section">
                    <div class="section-title">
                        <span>Audio</span>
                    </div>
                    <div class="form-grid">

                        <div class="form-group full-width">
                            <div class="checkbox-group">
                                <input
                                    type="checkbox"
                                    class="checkbox-input"
                                    id="vad-enabled"
                                    .checked=${this.vadEnabled}
                                    @change=${this.handleVADChange}
                                />
                                <label for="vad-enabled" class="checkbox-label">Enable Voice Activity Detection (VAD)</label>
                            </div>
                            <div class="form-description">
                                Intelligently detect when you're speaking and only capture audio during speech.
                                Improves privacy by avoiding recording of silence and background noise.
                                <br /><strong>Benefits:</strong> Better privacy, reduced processing, natural conversation flow
                            </div>
                        </div>

                        ${this.selectedProfile === 'interview' && this.vadEnabled ? html`
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">
                                        VAD Control Mode
                                        <span class="current-selection">${this.vadMode === 'automatic' ? 'Smart Detection' : 'Manual Control'}</span>
                                    </label>
                                    <custom-dropdown
                                        .value=${this.vadMode}
                                        .options=${[
                                            { value: 'automatic', label: 'Smart Detection (Auto)' },
                                            { value: 'manual', label: 'Manual Control (Push-to-Talk)' }
                                        ]}
                                        @change=${this.handleVADModeChange}
                                    ></custom-dropdown>
                                </div>
                            </div>
                            <div class="form-group full-width">
                                <div class="form-description">
                                    ${this.vadMode === 'automatic'
                                        ? html`<strong>Smart Detection:</strong> VAD automatically detects speech and silence. Best for natural conversations where the interviewer speaks continuously.`
                                        : html`<strong>Manual Control:</strong> Click the microphone button to start listening. VAD captures the entire question (including pauses) until you click again to generate the response. Perfect for interviewers who pause frequently mid-sentence.`
                                    }
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Stealth Profile Section -->
                <div class="settings-section">
                    <div class="section-title">
                        <span>Stealth Profile</span>
                    </div>
                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Profile</label>
                                <custom-dropdown
                                    .value=${localStorage.getItem('stealthProfile') || 'ultra'}
                                    .options=${[
                                        { value: 'visible', label: 'Visible' },
                                        { value: 'balanced', label: 'Balanced' },
                                        { value: 'ultra', label: 'Ultra-Stealth' }
                                    ]}
                                    @change=${e => {
                                        localStorage.setItem('stealthProfile', e.detail.value);
                                        // We need to notify the main process to restart for some settings to apply
                                        alert('Restart the application for stealth changes to take full effect.');
                                        this.requestUpdate();
                                    }}
                                ></custom-dropdown>
                                <div class="form-description">
                                    Adjusts visibility and detection resistance. A restart is required for changes to apply.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                <!-- Language & Audio Section -->
                <div class="settings-section">
                    <div class="section-title">
                        <span>Language & Audio</span>
                    </div>

                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    Speech Language
                                    <span class="current-selection">${currentLanguage?.name || 'Unknown'}</span>
                                </label>
                                <custom-dropdown
                                    .value=${this.selectedLanguage}
                                    .options=${languages.map(l => ({ value: l.value, label: l.name }))}
                                    @change=${e => this.handleLanguageSelect({ target: { value: e.detail.value } })}
                                ></custom-dropdown>
                                <div class="form-description">Language for speech recognition and AI responses</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Interface Layout Section -->
                <div class="settings-section">
                    <div class="section-title">
                        <span>Interface Layout</span>
                    </div>

                    <div class="form-grid">
                        <div class="form-group full-width">
                            <div class="slider-container">
                                <div class="slider-header">
                                    <label class="form-label">Background Transparency</label>
                                    <span class="slider-value">${Math.round(this.backgroundTransparency * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    class="slider-input"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    .value=${this.backgroundTransparency}
                                    @input=${this.handleBackgroundTransparencyChange}
                                />
                                <div class="slider-labels">
                                    <span>Transparent</span>
                                    <span>Opaque</span>
                                </div>
                                <div class="form-description">
                                    Adjust the transparency of the interface background elements
                                </div>
                            </div>
                        </div>

                        <div class="form-group full-width">
                            <div class="slider-container">
                                <div class="slider-header">
                                    <label class="form-label">Response Font Size</label>
                                    <span class="slider-value">${this.fontSize}px</span>
                                </div>
                                <input
                                    type="range"
                                    class="slider-input"
                                    min="12"
                                    max="32"
                                    step="1"
                                    .value=${this.fontSize}
                                    @input=${this.handleFontSizeChange}
                                />
                                <div class="slider-labels">
                                    <span>12px</span>
                                    <span>32px</span>
                                </div>
                                <div class="form-description">
                                    Adjust the font size of AI response text in the assistant view
                                </div>
                            </div>
                        </div>


                    </div>
                </div>

                <!-- Screen Capture Section -->
                <div class="settings-section">
                    <div class="section-title">
                        <span>Screen Capture Settings</span>
                    </div>

                    <div class="form-grid">
                        ${this.selectedProfile !== 'exam' ? html`
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">
                                        Capture Interval
                                        <span class="current-selection"
                                            >${this.selectedScreenshotInterval === 'manual' ? 'Manual' : this.selectedScreenshotInterval + 's'}</span
                                        >
                                    </label>
                                    <custom-dropdown
                                        .value=${this.selectedScreenshotInterval}
                                        .options=${[
                                            { value: 'manual', label: 'Manual (On demand)' },
                                            { value: '1', label: 'Every 1 second' },
                                            { value: '2', label: 'Every 2 seconds' },
                                            { value: '5', label: 'Every 5 seconds' },
                                            { value: '10', label: 'Every 10 seconds' }
                                        ]}
                                        @change=${e => this.handleScreenshotIntervalSelect({ target: { value: e.detail.value } })}
                                    ></custom-dropdown>
                                    <div class="form-description">
                                        ${
                                            this.selectedScreenshotInterval === 'manual'
                                                ? 'Screenshots will only be taken when you use the "Ask Next Step" shortcut'
                                                : 'Automatic screenshots will be taken at the specified interval'
                                        }
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    Image Quality
                                    <span class="current-selection"
                                        >${this.selectedImageQuality.charAt(0).toUpperCase() + this.selectedImageQuality.slice(1)}</span
                                    >
                                </label>
                                <custom-dropdown
                                    .value=${this.selectedImageQuality}
                                    .options=${[
                                        { value: 'high', label: 'High Quality' },
                                        { value: 'medium', label: 'Medium Quality' },
                                        { value: 'low', label: 'Low Quality' }
                                    ]}
                                    @change=${e => this.handleImageQualitySelect({ target: { value: e.detail.value } })}
                                ></custom-dropdown>
                                <div class="form-description">
                                    ${
                                        this.selectedImageQuality === 'high'
                                            ? 'Best quality, uses more tokens'
                                            : this.selectedImageQuality === 'medium'
                                              ? 'Balanced quality and token usage'
                                              : 'Lower quality, uses fewer tokens'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Keyboard Shortcuts Section -->
                <div class="settings-section">
                    <div class="section-title">
                        <span>Keyboard Shortcuts</span>
                    </div>

                    <table class="keybinds-table">
                        <thead>
                            <tr>
                                <th>Action</th>
                                <th>Shortcut</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.getKeybindActions().map(
                                action => html`
                                    <tr>
                                        <td>
                                            <div class="action-name">${action.name}</div>
                                            <div class="action-description">${action.description}</div>
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                class="form-control keybind-input"
                                                .value=${this.keybinds[action.key]}
                                                placeholder="Press keys..."
                                                data-action=${action.key}
                                                @keydown=${this.handleKeybindInput}
                                                @focus=${this.handleKeybindFocus}
                                                readonly
                                            />
                                        </td>
                                    </tr>
                                `
                            )}
                            <tr class="table-reset-row">
                                <td colspan="2">
                                    <button class="reset-keybinds-button" @click=${this.resetKeybinds}>Reset to Defaults</button>
                                    <div class="form-description" style="margin-top: 8px;">
                                        Restore all keyboard shortcuts to their default values
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>



                <!-- Google Search Section -->
                <div class="settings-section">
                    <div class="section-title">
                        <span>Google Search</span>
                    </div>

                    <div class="form-grid">
                        <div class="checkbox-group">
                            <input
                                type="checkbox"
                                class="checkbox-input"
                                id="google-search-enabled"
                                .checked=${this.googleSearchEnabled}
                                @change=${this.handleGoogleSearchChange}
                            />
                            <label for="google-search-enabled" class="checkbox-label"> Enable Google Search </label>
                        </div>
                        <div class="form-description" style="margin-left: 24px; margin-top: -8px;">
                            Allow the AI to search Google for up-to-date information and facts during conversations
                            <br /><strong>Note:</strong> Changes take effect when starting a new AI session
                        </div>
                    </div>
                </div>

                <div class="settings-note">
                    💡 Settings are automatically saved as you change them. Changes will take effect immediately or on the next session start.
                </div>

                <!-- Advanced Mode Section (Danger Zone) -->
                <div class="settings-section" style="border-color: var(--danger-border, rgba(239, 68, 68, 0.3)); background: var(--danger-background, rgba(239, 68, 68, 0.05));">
                    <div class="section-title" style="color: var(--danger-color, #ef4444);">
                        <span>⚠️ Advanced Mode</span>
                    </div>

                    <div class="form-grid">
                        <div class="checkbox-group">
                                <input
                                    type="checkbox"
                                    class="checkbox-input"
                                    id="advanced-mode"
                                    .checked=${this.advancedMode}
                                    @change=${this.handleAdvancedModeChange}
                                />
                                <label for="advanced-mode" class="checkbox-label"> Enable Advanced Mode </label>
                            </div>
                            <div class="form-description" style="margin-left: 24px; margin-top: -8px;">
                                Unlock experimental features, developer tools, and advanced configuration options
                                <br /><strong>Note:</strong> Advanced mode adds a new icon to the main navigation bar
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('customize-view', CustomizeView);
