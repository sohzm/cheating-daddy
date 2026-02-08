import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class CustomizeView extends LitElement {
    static styles = css`
        * {
            font-family: var(--font);
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            height: 100%;
        }

        .settings-layout {
            display: flex;
            height: 100%;
        }

        /* Sidebar */
        .settings-sidebar {
            width: 160px;
            min-width: 160px;
            border-right: 1px solid var(--border);
            padding: var(--space-sm) 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .sidebar-item {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-sm) var(--space-md);
            margin: 0 var(--space-sm);
            border-radius: var(--radius-md);
            font-size: var(--font-size-sm);
            color: var(--text-secondary);
            cursor: pointer;
            transition: color var(--transition), background var(--transition);
            border: none;
            background: transparent;
            text-align: left;
            width: calc(100% - var(--space-md));
        }

        .sidebar-item:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }

        .sidebar-item.active {
            background: var(--bg-elevated);
            color: var(--text-primary);
        }

        .sidebar-item svg {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }

        .sidebar-item.danger {
            color: var(--danger);
        }

        .sidebar-item.danger:hover,
        .sidebar-item.danger.active {
            color: var(--danger);
        }

        /* Main content */
        .settings-content {
            flex: 1;
            padding: var(--space-md) 0;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }

        .settings-content > * {
            flex-shrink: 0;
        }

        .settings-content > .profile-section {
            flex: 1;
            min-height: 0;
        }

        .settings-content::-webkit-scrollbar {
            width: 8px;
        }

        .settings-content::-webkit-scrollbar-track {
            background: transparent;
        }

        .settings-content::-webkit-scrollbar-thumb {
            background: var(--border-strong);
            border-radius: 4px;
        }

        .settings-content::-webkit-scrollbar-thumb:hover {
            background: #444444;
        }

        .content-header {
            font-size: var(--font-size-xl);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
            margin-bottom: var(--space-md);
            padding: 0 var(--space-md) var(--space-sm) var(--space-md);
            border-bottom: 1px solid var(--border);
        }

        .settings-section {
            padding: var(--space-sm) var(--space-md);
        }

        .section-title {
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-semibold);
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: var(--space-sm);
        }

        .form-grid {
            display: grid;
            gap: var(--space-md);
            padding: 0 var(--space-md);
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--space-md);
            align-items: start;
        }

        @media (max-width: 600px) {
            .form-row {
                grid-template-columns: 1fr;
            }
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);
        }

        .form-group.full-width {
            grid-column: 1 / -1;
        }

        .form-label {
            font-weight: var(--font-weight-medium);
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: var(--space-xs);
        }

        .form-description {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            line-height: var(--line-height);
            margin-top: 2px;
        }

        .form-control {
            background: var(--bg-elevated);
            color: var(--text-primary);
            border: 1px solid var(--border);
            padding: 10px 12px;
            border-radius: var(--radius-sm);
            font-size: var(--font-size-sm);
            transition: border-color var(--transition), box-shadow var(--transition);
        }

        .form-control:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 1px var(--accent);
        }

        .form-control:hover:not(:focus) {
            border-color: var(--border-strong);
        }

        select.form-control {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b6b6b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 8px center;
            background-repeat: no-repeat;
            background-size: 12px;
            padding-right: 28px;
        }

        textarea.form-control {
            resize: vertical;
            min-height: 60px;
            line-height: 1.4;
            font-family: inherit;
        }

        /* Profile section with expanding textarea */
        .profile-section {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .profile-section .form-grid {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .profile-section .form-group.expand {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .profile-section .form-group.expand textarea {
            flex: 1;
            resize: none;
        }

        textarea.form-control::placeholder {
            color: var(--text-muted);
        }

        .current-selection {
            display: inline-flex;
            align-items: center;
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            background: var(--bg-elevated);
            padding: 2px var(--space-xs);
            border-radius: var(--radius-sm);
            font-weight: var(--font-weight-medium);
            text-transform: none;
            letter-spacing: 0;
        }

        .keybind-input {
            cursor: pointer;
            font-family: var(--font-mono);
            text-align: center;
            letter-spacing: 0.5px;
            font-weight: 500;
        }

        .keybind-input:focus {
            cursor: text;
        }

        .keybind-input::placeholder {
            color: var(--text-muted);
            font-style: italic;
        }

        .reset-keybinds-button {
            background: transparent;
            color: var(--text-primary);
            border: 1px solid var(--border);
            padding: var(--space-xs) var(--space-sm);
            border-radius: var(--radius-sm);
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-medium);
            cursor: pointer;
            transition: background var(--transition);
        }

        .reset-keybinds-button:hover {
            background: var(--bg-hover);
        }

        .keybinds-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: var(--space-sm);
        }

        .keybinds-table th,
        .keybinds-table td {
            padding: var(--space-sm) 0;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }

        .keybinds-table th {
            font-weight: var(--font-weight-semibold);
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .keybinds-table td {
            vertical-align: middle;
        }

        .keybinds-table .action-name {
            font-weight: var(--font-weight-medium);
            color: var(--text-primary);
            font-size: var(--font-size-sm);
        }

        .keybinds-table .action-description {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            margin-top: 1px;
        }

        .keybinds-table .keybind-input {
            min-width: 100px;
            padding: var(--space-xs) var(--space-sm);
            margin: 0;
            font-size: var(--font-size-xs);
        }

        .keybinds-table tr:hover {
            background: var(--bg-hover);
        }

        .keybinds-table tr:last-child td {
            border-bottom: none;
        }

        .table-reset-row {
            border-top: 1px solid var(--border);
        }

        .table-reset-row td {
            padding-top: var(--space-sm);
            padding-bottom: var(--space-sm);
            border-bottom: none;
        }

        .table-reset-row:hover {
            background: transparent;
        }

        .settings-note {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            text-align: center;
            margin-top: var(--space-md);
            padding: var(--space-sm);
            border-top: 1px solid var(--border);
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-sm) 0;
        }

        .checkbox-input {
            width: 14px;
            height: 14px;
            accent-color: var(--text-primary);
            cursor: pointer;
        }

        .checkbox-label {
            font-weight: var(--font-weight-medium);
            font-size: var(--font-size-sm);
            color: var(--text-primary);
            cursor: pointer;
            user-select: none;
        }

        /* Slider styles */
        .slider-container {
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
        }

        .slider-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .slider-value {
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            background: var(--bg-elevated);
            padding: 2px var(--space-xs);
            border-radius: var(--radius-sm);
            font-weight: var(--font-weight-medium);
            font-family: var(--font-mono);
        }

        .slider-input {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 4px;
            border-radius: 2px;
            background: var(--border);
            outline: none;
            cursor: pointer;
        }

        .slider-input::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--text-primary);
            cursor: pointer;
            border: none;
        }

        .slider-input::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--text-primary);
            cursor: pointer;
            border: none;
        }

        .slider-labels {
            display: flex;
            justify-content: space-between;
            margin-top: var(--space-xs);
            font-size: var(--font-size-xs);
            color: var(--text-muted);
        }

        /* Color picker styles */
        .color-picker-container {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .color-picker-input {
            -webkit-appearance: none;
            appearance: none;
            width: 40px;
            height: 32px;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            cursor: pointer;
            padding: 2px;
            background: var(--bg-elevated);
        }

        .color-picker-input::-webkit-color-swatch-wrapper {
            padding: 0;
        }

        .color-picker-input::-webkit-color-swatch {
            border: none;
            border-radius: 2px;
        }

        .color-hex-input {
            width: 80px;
            font-family: var(--font-mono);
            text-transform: uppercase;
        }

        .reset-color-button {
            background: transparent;
            color: var(--text-secondary);
            border: 1px solid var(--border);
            padding: var(--space-xs) var(--space-sm);
            border-radius: var(--radius-sm);
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-medium);
            cursor: pointer;
            transition: all var(--transition);
        }

        .reset-color-button:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }

        /* Danger button and status */
        .danger-button {
            background: transparent;
            color: var(--danger);
            border: 1px solid var(--danger);
            padding: var(--space-sm) var(--space-md);
            border-radius: var(--radius-sm);
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-medium);
            cursor: pointer;
            transition: background var(--transition);
        }

        .danger-button:hover {
            background: rgba(241, 76, 76, 0.1);
        }

        .danger-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .status-message {
            margin-top: var(--space-sm);
            padding: var(--space-sm) var(--space-md);
            border-radius: var(--radius-sm);
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-medium);
        }

        .status-success {
            background: var(--bg-surface);
            color: var(--success);
            border-left: 2px solid var(--success);
        }

        .status-error {
            background: var(--bg-surface);
            color: var(--danger);
            border-left: 2px solid var(--danger);
        }
    `;

    static properties = {
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        selectedImageQuality: { type: String },
        layoutMode: { type: String },
        keybinds: { type: Object },
        googleSearchEnabled: { type: Boolean },
        backgroundTransparency: { type: Number },
        fontSize: { type: Number },
        theme: { type: String },
        onProfileChange: { type: Function },
        onLanguageChange: { type: Function },
        onImageQualityChange: { type: Function },
        onLayoutModeChange: { type: Function },
        activeSection: { type: String },
        isClearing: { type: Boolean },
        clearStatusMessage: { type: String },
        clearStatusType: { type: String },
    };

    constructor() {
        super();
        this.selectedProfile = 'interview';
        this.selectedLanguage = 'en-US';
        this.selectedImageQuality = 'medium';
        this.layoutMode = 'normal';
        this.keybinds = this.getDefaultKeybinds();
        this.onProfileChange = () => {};
        this.onLanguageChange = () => {};
        this.onImageQualityChange = () => {};
        this.onLayoutModeChange = () => {};

        // Google Search default
        this.googleSearchEnabled = true;

        // Clear data state
        this.isClearing = false;
        this.clearStatusMessage = '';
        this.clearStatusType = '';

        // Background transparency default
        this.backgroundTransparency = 0.8;

        // Font size default (in pixels)
        this.fontSize = 20;

        // Audio mode default
        this.audioMode = 'speaker_only';

        // Custom prompt
        this.customPrompt = '';

        // Active section for sidebar navigation
        this.activeSection = 'profile';

        // Theme default
        this.theme = 'dark';

        this._loadFromStorage();
    }

    getThemes() {
        return cheatingDaddy.theme.getAll();
    }

    setActiveSection(section) {
        this.activeSection = section;
        this.requestUpdate();
    }

    getSidebarSections() {
        return [
            { id: 'profile', name: 'Profile', icon: 'user' },
            { id: 'appearance', name: 'Appearance', icon: 'display' },
            { id: 'audio', name: 'Audio', icon: 'mic' },
            { id: 'language', name: 'Language', icon: 'globe' },
            { id: 'capture', name: 'Capture', icon: 'camera' },
            { id: 'keyboard', name: 'Keyboard', icon: 'keyboard' },
            { id: 'search', name: 'Search', icon: 'search' },
            { id: 'advanced', name: 'Advanced', icon: 'warning', danger: true },
        ];
    }

    renderSidebarIcon(icon) {
        const icons = {
            user: html`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0-8 0M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>`,
            mic: html`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12.9A5 5 0 1 0 11.098 9M15 12.9l-3.902-3.899l-7.513 8.584a2 2 0 1 0 2.827 2.83z"/></svg>`,
            globe: html`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M9 6.371C9 10.789 6.761 13 4 13m0-6.629h7"/><path d="M5 9c0 2.144 2.252 3.908 6 4m1 7l4-9l4 9m-.9-2h-6.2M6.694 3l.793.582"/></g></svg>`,
            display: html`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zm4 15h10m-8-4v4m6-4v4"/></svg>`,
            camera: html`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2m8-16h2a2 2 0 0 1 2 2v2m-4 12h2a2 2 0 0 0 2-2v-2M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0"/></svg>`,
            keyboard: html`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm4 2v.01m4-.01v.01m4-.01v.01m4-.01v.01M6 14v.01M18 14v.01M10 14l4 .01"/></svg>`,
            search: html`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0-14 0m18 11l-6-6"/></svg>`,
            warning: html`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M10.363 3.591L2.257 17.125a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636-2.87L13.637 3.59a1.914 1.914 0 0 0-3.274 0M12 9h.01"/><path d="M11 12h1v4h1"/></g></svg>`,
        };
        return icons[icon] || '';
    }

    async _loadFromStorage() {
        try {
            const [prefs, keybinds] = await Promise.all([
                cheatingDaddy.storage.getPreferences(),
                cheatingDaddy.storage.getKeybinds()
            ]);

            this.googleSearchEnabled = prefs.googleSearchEnabled ?? true;
            this.backgroundTransparency = prefs.backgroundTransparency ?? 0.8;
            this.fontSize = prefs.fontSize ?? 20;
            this.audioMode = prefs.audioMode ?? 'speaker_only';
            this.customPrompt = prefs.customPrompt ?? '';
            this.theme = prefs.theme ?? 'dark';

            if (keybinds) {
                this.keybinds = { ...this.getDefaultKeybinds(), ...keybinds };
            }

            this.updateBackgroundTransparency();
            this.updateFontSize();
            this.requestUpdate();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    connectedCallback() {
        super.connectedCallback();
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
        this.selectedProfile = e.target.value;
        this.onProfileChange(this.selectedProfile);
    }

    handleLanguageSelect(e) {
        this.selectedLanguage = e.target.value;
        this.onLanguageChange(this.selectedLanguage);
    }

    handleImageQualitySelect(e) {
        this.selectedImageQuality = e.target.value;
        this.onImageQualityChange(e.target.value);
    }

    handleLayoutModeSelect(e) {
        this.layoutMode = e.target.value;
        this.onLayoutModeChange(e.target.value);
    }

    async handleCustomPromptInput(e) {
        this.customPrompt = e.target.value;
        await cheatingDaddy.storage.updatePreference('customPrompt', e.target.value);
    }

    async handleAudioModeSelect(e) {
        this.audioMode = e.target.value;
        await cheatingDaddy.storage.updatePreference('audioMode', e.target.value);
        this.requestUpdate();
    }

    async handleThemeChange(e) {
        this.theme = e.target.value;
        await cheatingDaddy.theme.save(this.theme);
        this.updateBackgroundAppearance();
        this.requestUpdate();
    }

    getDefaultKeybinds() {
        const isMac = cheatingDaddy.isMacOS || navigator.platform.includes('Mac');
        return {
            moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
            moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
            moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
            moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
            toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
            toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
            nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
            previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
            nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
            scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
            scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
        };
    }

    async saveKeybinds() {
        await cheatingDaddy.storage.setKeybinds(this.keybinds);
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

    async resetKeybinds() {
        this.keybinds = this.getDefaultKeybinds();
        await cheatingDaddy.storage.setKeybinds(null);
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

    async handleGoogleSearchChange(e) {
        this.googleSearchEnabled = e.target.checked;
        await cheatingDaddy.storage.updatePreference('googleSearchEnabled', this.googleSearchEnabled);

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

    async clearLocalData() {
        if (this.isClearing) return;

        this.isClearing = true;
        this.clearStatusMessage = '';
        this.clearStatusType = '';
        this.requestUpdate();

        try {
            await cheatingDaddy.storage.clearAll();

            this.clearStatusMessage = 'Successfully cleared all local data';
            this.clearStatusType = 'success';
            this.requestUpdate();

            // Close the application after a short delay
            setTimeout(() => {
                this.clearStatusMessage = 'Closing application...';
                this.requestUpdate();
                setTimeout(async () => {
                    if (window.require) {
                        const { ipcRenderer } = window.require('electron');
                        await ipcRenderer.invoke('quit-application');
                    }
                }, 1000);
            }, 2000);
        } catch (error) {
            console.error('Error clearing data:', error);
            this.clearStatusMessage = `Error clearing data: ${error.message}`;
            this.clearStatusType = 'error';
        } finally {
            this.isClearing = false;
            this.requestUpdate();
        }
    }

    async handleBackgroundTransparencyChange(e) {
        this.backgroundTransparency = parseFloat(e.target.value);
        await cheatingDaddy.storage.updatePreference('backgroundTransparency', this.backgroundTransparency);
        this.updateBackgroundAppearance();
        this.requestUpdate();
    }

    updateBackgroundAppearance() {
        // Use theme's background color
        const colors = cheatingDaddy.theme.get(this.theme);
        cheatingDaddy.theme.applyBackgrounds(colors.background, this.backgroundTransparency);
    }

    // Keep old function name for backwards compatibility
    updateBackgroundTransparency() {
        this.updateBackgroundAppearance();
    }

    async handleFontSizeChange(e) {
        this.fontSize = parseInt(e.target.value, 10);
        await cheatingDaddy.storage.updatePreference('fontSize', this.fontSize);
        this.updateFontSize();
        this.requestUpdate();
    }

    updateFontSize() {
        const root = document.documentElement;
        root.style.setProperty('--response-font-size', `${this.fontSize}px`);
    }

    renderProfileSection() {
        const profiles = this.getProfiles();
        const profileNames = this.getProfileNames();
        const currentProfile = profiles.find(p => p.value === this.selectedProfile);

        return html`
            <div class="profile-section">
                <div class="content-header">AI Profile</div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">
                            Profile Type
                            <span class="current-selection">${currentProfile?.name || 'Unknown'}</span>
                        </label>
                        <select class="form-control" .value=${this.selectedProfile} @change=${this.handleProfileSelect}>
                            ${profiles.map(
                                profile => html`
                                    <option value=${profile.value} ?selected=${this.selectedProfile === profile.value}>
                                        ${profile.name}
                                    </option>
                                `
                            )}
                        </select>
                    </div>

                    <div class="form-group expand">
                        <label class="form-label">Custom AI Instructions</label>
                        <textarea
                            class="form-control"
                            placeholder="Add specific instructions for how you want the AI to behave during ${
                                profileNames[this.selectedProfile] || 'this interaction'
                            }..."
                            .value=${this.customPrompt}
                            @input=${this.handleCustomPromptInput}
                        ></textarea>
                        <div class="form-description">
                            Personalize the AI's behavior with specific instructions
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAudioSection() {
        return html`
            <div class="content-header">Audio Settings</div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Audio Mode</label>
                    <select class="form-control" .value=${this.audioMode} @change=${this.handleAudioModeSelect}>
                        <option value="speaker_only">Speaker Only (Interviewer)</option>
                        <option value="mic_only">Microphone Only (Me)</option>
                        <option value="both">Both Speaker & Microphone</option>
                    </select>
                    <div class="form-description">
                        Choose which audio sources to capture for the AI.
                    </div>
                </div>
            </div>
        `;
    }

    renderLanguageSection() {
        const languages = this.getLanguages();
        const currentLanguage = languages.find(l => l.value === this.selectedLanguage);

        return html`
            <div class="content-header">Language</div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">
                        Speech Language
                        <span class="current-selection">${currentLanguage?.name || 'Unknown'}</span>
                    </label>
                    <select class="form-control" .value=${this.selectedLanguage} @change=${this.handleLanguageSelect}>
                        ${languages.map(
                            language => html`
                                <option value=${language.value} ?selected=${this.selectedLanguage === language.value}>
                                    ${language.name}
                                </option>
                            `
                        )}
                    </select>
                    <div class="form-description">Language for speech recognition and AI responses</div>
                </div>
            </div>
        `;
    }

    renderAppearanceSection() {
        const themes = this.getThemes();
        const currentTheme = themes.find(t => t.value === this.theme);

        return html`
            <div class="content-header">Appearance</div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">
                        Theme
                        <span class="current-selection">${currentTheme?.name || 'Dark'}</span>
                    </label>
                    <select class="form-control" .value=${this.theme} @change=${this.handleThemeChange}>
                        ${themes.map(
                            theme => html`
                                <option value=${theme.value} ?selected=${this.theme === theme.value}>
                                    ${theme.name}
                                </option>
                            `
                        )}
                    </select>
                    <div class="form-description">
                        Choose a color theme for the interface
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        Layout Mode
                        <span class="current-selection">${this.layoutMode === 'compact' ? 'Compact' : 'Normal'}</span>
                    </label>
                    <select class="form-control" .value=${this.layoutMode} @change=${this.handleLayoutModeSelect}>
                        <option value="normal" ?selected=${this.layoutMode === 'normal'}>Normal</option>
                        <option value="compact" ?selected=${this.layoutMode === 'compact'}>Compact</option>
                    </select>
                    <div class="form-description">
                        ${this.layoutMode === 'compact'
                            ? 'Smaller window with reduced padding'
                            : 'Standard layout with comfortable spacing'
                        }
                    </div>
                </div>

                <div class="form-group">
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
                    </div>
                </div>

                <div class="form-group">
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
                    </div>
                </div>
            </div>
        `;
    }

    renderCaptureSection() {
        return html`
            <div class="content-header">Screen Capture</div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">
                        Image Quality
                        <span class="current-selection">${this.selectedImageQuality.charAt(0).toUpperCase() + this.selectedImageQuality.slice(1)}</span>
                    </label>
                    <select class="form-control" .value=${this.selectedImageQuality} @change=${this.handleImageQualitySelect}>
                        <option value="high" ?selected=${this.selectedImageQuality === 'high'}>High Quality</option>
                        <option value="medium" ?selected=${this.selectedImageQuality === 'medium'}>Medium Quality</option>
                        <option value="low" ?selected=${this.selectedImageQuality === 'low'}>Low Quality</option>
                    </select>
                    <div class="form-description">
                        ${this.selectedImageQuality === 'high'
                            ? 'Best quality, uses more tokens'
                            : this.selectedImageQuality === 'medium'
                              ? 'Balanced quality and token usage'
                              : 'Lower quality, uses fewer tokens'
                        }
                    </div>
                </div>
            </div>
        `;
    }

    renderKeyboardSection() {
        return html`
            <div class="content-header">Keyboard Shortcuts</div>
            <div class="form-grid">
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
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    renderSearchSection() {
        return html`
            <div class="content-header">Search</div>
            <div class="form-grid">
                <div class="checkbox-group">
                    <input
                        type="checkbox"
                        class="checkbox-input"
                        id="google-search-enabled"
                        .checked=${this.googleSearchEnabled}
                        @change=${this.handleGoogleSearchChange}
                    />
                    <label for="google-search-enabled" class="checkbox-label">Enable Google Search</label>
                </div>
                <div class="form-description" style="margin-left: 24px; margin-top: -8px;">
                    Allow the AI to search Google for up-to-date information during conversations.
                    <br /><strong>Note:</strong> Changes take effect when starting a new AI session.
                </div>
            </div>
        `;
    }

    renderAdvancedSection() {
        return html`
            <div class="content-header" style="color: var(--danger);">Advanced</div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label" style="color: var(--danger);">Data Management</label>
                    <div class="form-description" style="margin-bottom: 12px;">
                        <strong>Warning:</strong> This action will permanently delete all local data including API keys, preferences, and session history. This cannot be undone.
                    </div>
                    <button
                        class="danger-button"
                        @click=${this.clearLocalData}
                        ?disabled=${this.isClearing}
                    >
                        ${this.isClearing ? 'Clearing...' : 'Clear All Local Data'}
                    </button>
                    ${this.clearStatusMessage ? html`
                        <div class="status-message ${this.clearStatusType === 'success' ? 'status-success' : 'status-error'}">
                            ${this.clearStatusMessage}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderSectionContent() {
        switch (this.activeSection) {
            case 'profile':
                return this.renderProfileSection();
            case 'appearance':
                return this.renderAppearanceSection();
            case 'audio':
                return this.renderAudioSection();
            case 'language':
                return this.renderLanguageSection();
            case 'capture':
                return this.renderCaptureSection();
            case 'keyboard':
                return this.renderKeyboardSection();
            case 'search':
                return this.renderSearchSection();
            case 'advanced':
                return this.renderAdvancedSection();
            default:
                return this.renderProfileSection();
        }
    }

    render() {
        const sections = this.getSidebarSections();

        return html`
            <div class="settings-layout">
                <nav class="settings-sidebar">
                    ${sections.map(
                        section => html`
                            <button
                                class="sidebar-item ${this.activeSection === section.id ? 'active' : ''} ${section.danger ? 'danger' : ''}"
                                @click=${() => this.setActiveSection(section.id)}
                            >
                                ${this.renderSidebarIcon(section.icon)}
                                <span>${section.name}</span>
                            </button>
                        `
                    )}
                </nav>
                <div class="settings-content">
                    ${this.renderSectionContent()}
                </div>
            </div>
        `;
    }
}

customElements.define('customize-view', CustomizeView);
