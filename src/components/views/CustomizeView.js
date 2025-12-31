import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class CustomizeView extends LitElement {
    static styles = css`
        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
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
            border-right: 1px solid var(--border-color);
            padding: 8px 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .sidebar-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            margin: 0 8px;
            border-radius: 3px;
            font-size: 12px;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.1s ease;
            border: none;
            background: transparent;
            text-align: left;
            width: calc(100% - 16px);
        }

        .sidebar-item:hover {
            background: var(--hover-background);
            color: var(--text-color);
        }

        .sidebar-item.active {
            background: var(--bg-tertiary);
            color: var(--text-color);
        }

        .sidebar-item svg {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }

        .sidebar-item.danger {
            color: var(--error-color);
        }

        .sidebar-item.danger:hover,
        .sidebar-item.danger.active {
            color: var(--error-color);
        }

        /* Main content */
        .settings-content {
            flex: 1;
            padding: 16px 0;
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
            background: var(--scrollbar-thumb);
            border-radius: 4px;
        }

        .settings-content::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }

        .content-header {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-color);
            margin-bottom: 16px;
            padding: 0 16px 12px 16px;
            border-bottom: 1px solid var(--border-color);
        }

        .settings-section {
            padding: 12px 16px;
        }

        .section-title {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }

        .form-grid {
            display: grid;
            gap: 12px;
            padding: 0 16px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
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
            gap: 6px;
        }

        .form-group.full-width {
            grid-column: 1 / -1;
        }

        .form-label {
            font-weight: 500;
            font-size: 12px;
            color: var(--text-color);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .form-description {
            font-size: 11px;
            color: var(--text-muted);
            line-height: 1.4;
            margin-top: 2px;
        }

        .form-control {
            background: var(--input-background);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 8px 10px;
            border-radius: 3px;
            font-size: 12px;
            transition: border-color 0.1s ease;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--border-default);
        }

        .form-control:hover:not(:focus) {
            border-color: var(--border-default);
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
            color: var(--placeholder-color);
        }

        .current-selection {
            display: inline-flex;
            align-items: center;
            font-size: 10px;
            color: var(--text-secondary);
            background: var(--bg-tertiary);
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
        }

        .keybind-input {
            cursor: pointer;
            font-family: 'SF Mono', Monaco, monospace;
            text-align: center;
            letter-spacing: 0.5px;
            font-weight: 500;
        }

        .keybind-input:focus {
            cursor: text;
        }

        .keybind-input::placeholder {
            color: var(--placeholder-color);
            font-style: italic;
        }

        .reset-keybinds-button {
            background: transparent;
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 6px 10px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.1s ease;
        }

        .reset-keybinds-button:hover {
            background: var(--hover-background);
        }

        .toggle-btn {
            background: transparent;
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 8px 10px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.1s ease;
        }

        .toggle-btn:hover {
            background: var(--hover-background);
        }

        .keybinds-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
        }

        .keybinds-table th,
        .keybinds-table td {
            padding: 8px 0;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }

        .keybinds-table th {
            font-weight: 600;
            font-size: 11px;
            color: var(--text-muted);
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
            color: var(--text-muted);
            margin-top: 1px;
        }

        .keybinds-table .keybind-input {
            min-width: 100px;
            padding: 4px 8px;
            margin: 0;
            font-size: 11px;
        }

        .keybinds-table tr:hover {
            background: var(--hover-background);
        }

        .keybinds-table tr:last-child td {
            border-bottom: none;
        }

        .table-reset-row {
            border-top: 1px solid var(--border-color);
        }

        .table-reset-row td {
            padding-top: 10px;
            padding-bottom: 8px;
            border-bottom: none;
        }

        .table-reset-row:hover {
            background: transparent;
        }

        .settings-note {
            font-size: 11px;
            color: var(--text-muted);
            text-align: center;
            margin-top: 16px;
            padding: 12px;
            border-top: 1px solid var(--border-color);
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 0;
        }

        .checkbox-input {
            width: 14px;
            height: 14px;
            accent-color: var(--text-color);
            cursor: pointer;
        }

        .checkbox-label {
            font-weight: 500;
            font-size: 12px;
            color: var(--text-color);
            cursor: pointer;
            user-select: none;
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
            color: var(--text-secondary);
            background: var(--bg-tertiary);
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
            font-family: 'SF Mono', Monaco, monospace;
        }

        .slider-input {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 4px;
            border-radius: 2px;
            background: var(--border-color);
            outline: none;
            cursor: pointer;
        }

        .slider-input::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--text-color);
            cursor: pointer;
            border: none;
        }

        .slider-input::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--text-color);
            cursor: pointer;
            border: none;
        }

        .slider-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
            font-size: 10px;
            color: var(--text-muted);
        }

        /* Color picker styles */
        .color-picker-container {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .color-picker-input {
            -webkit-appearance: none;
            appearance: none;
            width: 40px;
            height: 32px;
            border: 1px solid var(--border-color);
            border-radius: 3px;
            cursor: pointer;
            padding: 2px;
            background: var(--input-background);
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
            font-family: 'SF Mono', Monaco, monospace;
            text-transform: uppercase;
        }

        .reset-color-button {
            background: transparent;
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
            padding: 6px 10px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.1s ease;
        }

        .reset-color-button:hover {
            background: var(--hover-background);
            color: var(--text-color);
        }

        /* Danger button and status */
        .danger-button {
            background: transparent;
            color: var(--error-color);
            border: 1px solid var(--error-color);
            padding: 8px 14px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.1s ease;
        }

        .danger-button:hover {
            background: rgba(241, 76, 76, 0.1);
        }

        .danger-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .status-message {
            margin-top: 12px;
            padding: 8px 12px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
        }

        .status-success {
            background: var(--bg-secondary);
            color: var(--success-color);
            border-left: 2px solid var(--success-color);
        }

        .status-error {
            background: var(--bg-secondary);
            color: var(--error-color);
            border-left: 2px solid var(--error-color);
        }

        /* API Keys toggle button */
        .toggle-btn {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 6px 10px;
            cursor: pointer;
            font-size: 14px;
        }

        .toggle-btn:hover {
            background: var(--hover-background);
        }

        /* Status indicator */
        .status-indicator {
            font-size: 11px;
            margin-top: 6px;
            opacity: 0.8;
        }

        .status-indicator.valid {
            color: var(--success-color);
        }

        .status-indicator.invalid {
            color: var(--error-color);
        }

        .status-indicator.checking {
            color: var(--text-secondary);
        }

        .status-indicator.notset {
            color: var(--warning-color, #fbbf24);
        }

        /* Usage bars */
        .usage-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .usage-row {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .usage-model {
            flex: 0 0 140px;
            font-size: 11px;
            opacity: 0.8;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .usage-bar {
            flex: 1;
            height: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
            overflow: hidden;
        }

        .usage-bar-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        .usage-bar-fill.green {
            background: #4ade80;
        }

        .usage-bar-fill.yellow {
            background: #fbbf24;
        }

        .usage-bar-fill.red {
            background: #ef4444;
        }

        .usage-count {
            flex: 0 0 70px;
            font-size: 11px;
            text-align: right;
            opacity: 0.7;
        }

        /* Secondary button */
        .secondary-button {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            color: var(--text-color);
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.15s ease;
        }

        .secondary-button:hover {
            background: var(--hover-background);
        }

        /* Radio card for audio mode selection */
        .radio-card {
            display: flex;
            gap: 12px;
            padding: 12px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .radio-card:hover {
            background: var(--hover-background);
        }

        .radio-card.selected {
            border-color: var(--accent-primary);
            background: rgba(var(--accent-primary-rgb, 99, 102, 241), 0.1);
        }

        .radio-card input[type="radio"] {
            margin-top: 2px;
            accent-color: var(--accent-primary);
        }

        .radio-content {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .radio-content strong {
            font-size: 13px;
        }

        .radio-description {
            font-size: 11px;
            opacity: 0.7;
            line-height: 1.4;
        }

        .radio-badge {
            display: inline-block;
            font-size: 10px;
            padding: 2px 6px;
            background: rgba(255,255,255,0.1);
            border-radius: 3px;
            margin-top: 4px;
            width: fit-content;
        }

        .radio-badge.green {
            background: rgba(74, 222, 128, 0.2);
            color: #4ade80;
        }
    `;

    static properties = {
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        selectedImageQuality: { type: String },
        layoutMode: { type: String },
        keybinds: { type: Object },
        googleSearchEnabled: { type: Boolean },
        detailedAnswers: { type: Boolean },
        backgroundTransparency: { type: Number },
        responseViewMode: { type: String },
        autoScroll: { type: Boolean },
        showSidebar: { type: Boolean },
        fontSize: { type: Number },
        theme: { type: String },
        onProfileChange: { type: Function },
        onLanguageChange: { type: Function },
        onImageQualityChange: { type: Function },
        onLayoutModeChange: { type: Function },
        onResponseViewModeChange: { type: Function },
        activeSection: { type: String },
        isClearing: { type: Boolean },
        clearStatusMessage: { type: String },
        clearStatusType: { type: String },
        customProfiles: { type: Array },
        isEditingProfile: { type: Boolean },
        editingProfileData: { type: Object },
        // API Keys
        geminiApiKey: { type: String },
        groqApiKey: { type: String },
        showGeminiKey: { type: Boolean },
        showGroqKey: { type: Boolean },
        geminiKeyStatus: { type: String },
        groqKeyStatus: { type: String },
        // Model preferences
        modelPrefs: { type: Object },
        // Usage stats
        usageStats: { type: Object },
        usageResetTime: { type: String },
        // Audio processing mode
        audioProcessingMode: { type: String },
        audioTriggerMethod: { type: String },
        validationError: { type: String },
    };

    constructor() {
        super();
        this.selectedProfile = 'interview';
        this.selectedLanguage = 'en-US';
        this.selectedImageQuality = 'medium';
        this.layoutMode = 'normal';
        this.keybinds = this.getDefaultKeybinds();
        this.onProfileChange = () => { };
        this.onLanguageChange = () => { };
        this.onImageQualityChange = () => { };
        this.onLayoutModeChange = () => { };
        this.onResponseViewModeChange = () => { };

        // Google Search default
        this.googleSearchEnabled = true;

        // Detailed answers mode default
        this.detailedAnswers = false;

        // Clear data state
        this.isClearing = false;
        this.clearStatusMessage = '';
        this.clearStatusType = '';

        // Background transparency default
        this.backgroundTransparency = 0.8;

        // Response view mode default
        this.responseViewMode = 'paged';
        this.autoScroll = true;
        this.showSidebar = true;

        // Font size default (in pixels)
        this.fontSize = 20;

        // Audio mode default
        this.audioMode = 'speaker_only';

        // Custom prompt
        this.customPrompt = '';

        // Validation state
        this.validationError = null;

        // Active section for sidebar navigation
        this.activeSection = 'profile';

        // Theme default
        this.theme = 'dark';

        // Custom Profiles State
        this.customProfiles = [];
        this.isEditingProfile = false;
        this.editingProfileData = {
            id: '',
            name: '',
            settings: { persona: 'interview', length: 'concise', format: 'teleprompter' }
        };

        // API Keys state
        this.geminiApiKey = '';
        this.groqApiKey = '';
        this.showGeminiKey = false;
        this.showGroqKey = false;
        this.geminiKeyStatus = 'notset';
        this.groqKeyStatus = 'notset';

        // Model preferences state
        this.modelPrefs = {};

        // Usage stats state
        this.usageStats = { groq: [], gemini: [] };
        this.usageResetTime = '';

        // Audio Processing defaults
        this.audioProcessingMode = 'live-conversation';
        this.audioTriggerMethod = 'vad';

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
            { id: 'apikeys', name: 'API Keys', icon: 'key' },
            { id: 'aimodels', name: 'AI Models', icon: 'brain' },
            { id: 'usage', name: 'Usage', icon: 'chart' },
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
            user: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21V19C19 17.9391 18.5786 16.9217 17.8284 16.1716C17.0783 15.4214 16.0609 15 15 15H9C7.93913 15 6.92172 15.4214 6.17157 16.1716C5.42143 16.9217 5 17.9391 5 19V21"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>`,
            mic: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>`,
            globe: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>`,
            display: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>`,
            camera: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
            </svg>`,
            keyboard: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                <path d="M6 8h.001"></path>
                <path d="M10 8h.001"></path>
                <path d="M14 8h.001"></path>
                <path d="M18 8h.001"></path>
                <path d="M8 12h.001"></path>
                <path d="M12 12h.001"></path>
                <path d="M16 12h.001"></path>
                <path d="M7 16h10"></path>
            </svg>`,
            search: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>`,
            warning: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>`,
            key: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
            </svg>`,
            brain: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z"></path>
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z"></path>
            </svg>`,
            chart: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>`,
        };
        return icons[icon] || '';
    }

    async _loadFromStorage() {
        try {
            const [prefs, keybinds, customProfiles, credentials] = await Promise.all([
                cheatingDaddy.storage.getPreferences(),
                cheatingDaddy.storage.getKeybinds(),
                cheatingDaddy.storage.getCustomProfiles(),
                cheatingDaddy.storage.getCredentials()
            ]);

            this.googleSearchEnabled = prefs.googleSearchEnabled ?? true;
            this.detailedAnswers = prefs.detailedAnswers ?? false;
            this.backgroundTransparency = prefs.backgroundTransparency ?? 0.8;
            this.responseViewMode = prefs.responseViewMode ?? 'paged';
            this.autoScroll = prefs.autoScroll ?? true;
            this.showSidebar = prefs.showSidebar ?? true;
            this.fontSize = prefs.fontSize ?? 20;
            this.audioMode = prefs.audioMode ?? 'speaker_only';
            this.customPrompt = prefs.customPrompt ?? '';
            this.theme = prefs.theme ?? 'dark';

            // Load API keys
            this.geminiApiKey = credentials?.gemini || credentials?.apiKey || '';
            this.groqApiKey = credentials?.groq || '';

            // Set initial status based on presence, then validate async
            this.geminiKeyStatus = this.geminiApiKey ? 'checking' : 'notset';
            this.groqKeyStatus = this.groqApiKey ? 'checking' : 'notset';

            if (this.geminiApiKey) this.validateStoredKey('gemini', this.geminiApiKey);
            if (this.groqApiKey) this.validateStoredKey('groq', this.groqApiKey);

            // Load model preferences
            this.modelPrefs = {
                textMessage: prefs.textMessage || {
                    primaryProvider: 'groq',
                    primaryModel: 'llama-3.3-70b-versatile',
                    fallbackProvider: 'groq',
                    fallbackModel: 'llama-3.1-8b-instant'
                },
                screenAnalysis: prefs.screenAnalysis || {
                    primaryProvider: 'groq',
                    primaryModel: 'meta-llama/llama-4-maverick-17b-128e-instruct',
                    fallbackProvider: 'gemini',
                    fallbackModel: 'gemini-2.5-flash'
                },
                liveAudio: prefs.liveAudio || {
                    provider: 'gemini',
                    model: 'gemini-2.5-flash-native-audio-preview-12-2025'
                }
            };

            // Load audio processing settings
            this.audioProcessingMode = prefs.audioProcessingMode ?? 'live-conversation';
            this.audioTriggerMethod = prefs.audioTriggerMethod ?? 'vad';

            // Load usage stats
            this.loadUsageStats();

            if (keybinds) {
                this.keybinds = { ...this.getDefaultKeybinds(), ...keybinds };
            }

            this.customProfiles = customProfiles || [];

            this.updateBackgroundTransparency();
            this.updateFontSize();
            this.requestUpdate();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    // Helper for validating stored keys on load
    async validateStoredKey(provider, key) {
        try {
            const result = await cheatingDaddy.assistant.validateApiKey(provider, key);
            if (provider === 'gemini') {
                this.geminiKeyStatus = result.valid ? 'valid' : 'invalid';
            } else {
                this.groqKeyStatus = result.valid ? 'valid' : 'invalid';
            }
            this.requestUpdate();
        } catch (e) {
            console.error(`Error validating stored ${provider} key:`, e);
            if (provider === 'gemini') this.geminiKeyStatus = 'error';
            else this.groqKeyStatus = 'error';
            this.requestUpdate();
        }
    }

    // API Key handlers
    async handleApiKeyChange(provider, value) {
        if (provider === 'gemini') {
            this.geminiApiKey = value;
            if (value) {
                this.geminiKeyStatus = 'checking';
                this.requestUpdate();

                try {
                    const result = await cheatingDaddy.assistant.validateApiKey('gemini', value);
                    if (result.valid) {
                        await cheatingDaddy.storage.setApiKey(value, 'gemini');
                        this.geminiKeyStatus = 'valid';
                    } else {
                        this.geminiKeyStatus = 'invalid';
                        // Ideally we don't save invalid keys, or we allow saving but mark as invalid?
                        // User request said "do not persist the key" if invalid.
                    }
                } catch (error) {
                    console.error('Error validating Gemini key:', error);
                    this.geminiKeyStatus = 'error';
                }
            } else {
                this.geminiKeyStatus = 'notset';
                await cheatingDaddy.storage.setApiKey('', 'gemini'); // Clear it
            }
        } else if (provider === 'groq') {
            this.groqApiKey = value;
            if (value) {
                this.groqKeyStatus = 'checking';
                this.requestUpdate();

                try {
                    const result = await cheatingDaddy.assistant.validateApiKey('groq', value);
                    if (result.valid) {
                        await cheatingDaddy.storage.setApiKey(value, 'groq');
                        this.groqKeyStatus = 'valid';
                    } else {
                        this.groqKeyStatus = 'invalid';
                    }
                } catch (error) {
                    console.error('Error validating Groq key:', error);
                    this.groqKeyStatus = 'error';
                }
            } else {
                this.groqKeyStatus = 'notset';
                await cheatingDaddy.storage.setApiKey('', 'groq'); // Clear it
            }
        }
        this.requestUpdate();
    }

    // Model preference handlers
    async handleModelChange(mode, type, value) {
        if (value !== 'none' && !value.includes(':')) {
            console.error('Invalid model value format:', value);
            return;
        }
        const [provider, model] = value === 'none' ? [null, null] : value.split(':');

        if (!this.modelPrefs[mode]) {
            this.modelPrefs[mode] = {};
        }

        if (type === 'primary') {
            this.modelPrefs[mode].primaryProvider = provider;
            this.modelPrefs[mode].primaryModel = model;
        } else {
            this.modelPrefs[mode].fallbackProvider = provider;
            this.modelPrefs[mode].fallbackModel = model;
        }

        await cheatingDaddy.storage.updatePreference(mode, this.modelPrefs[mode]);
        this.requestUpdate();
    }

    isModelSelected(mode, type, value) {
        const prefs = this.modelPrefs[mode];
        if (!prefs) return false;

        if (type === 'primary') {
            return value === `${prefs.primaryProvider}:${prefs.primaryModel}`;
        } else {
            if (!prefs.fallbackProvider) return value === 'none';
            return value === `${prefs.fallbackProvider}:${prefs.fallbackModel}`;
        }
    }

    async resetModelPreferences() {
        this.modelPrefs = {
            textMessage: {
                primaryProvider: 'groq',
                primaryModel: 'llama-3.3-70b-versatile',
                fallbackProvider: 'groq',
                fallbackModel: 'llama-3.1-8b-instant'
            },
            screenAnalysis: {
                primaryProvider: 'groq',
                primaryModel: 'meta-llama/llama-4-maverick-17b-128e-instruct',
                fallbackProvider: 'gemini',
                fallbackModel: 'gemini-2.5-flash'
            },
            liveAudio: {
                provider: 'gemini',
                model: 'gemini-2.5-flash-native-audio-preview-12-2025'
            }
        };

        await cheatingDaddy.storage.updatePreference('textMessage', this.modelPrefs.textMessage);
        await cheatingDaddy.storage.updatePreference('screenAnalysis', this.modelPrefs.screenAnalysis);
        await cheatingDaddy.storage.updatePreference('liveAudio', this.modelPrefs.liveAudio);
        this.requestUpdate();
    }

    // Usage stats handlers
    async loadUsageStats() {
        try {
            const stats = await cheatingDaddy.storage.getUsageStats?.() || { groq: [], gemini: [] };
            this.usageStats = stats;

            const resetTime = await cheatingDaddy.storage.getUsageResetTime?.() || { hours: 0, minutes: 0 };
            this.usageResetTime = `${resetTime.hours}h ${resetTime.minutes}m remaining`;
        } catch (error) {
            console.error('Error loading usage stats:', error);
        }
        this.requestUpdate();
    }

    async refreshUsageStats() {
        await this.loadUsageStats();
    }

    connectedCallback() {
        super.connectedCallback();
        // Resize window for this view
        resizeLayout();
    }

    getProfiles() {
        const builtIn = [
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

        const custom = (this.customProfiles || []).map(p => ({
            value: p.id,
            name: p.name,
            description: `Custom: ${p.settings.persona} • ${p.settings.length} • ${p.settings.format}`,
            isCustom: true
        }));

        return [...builtIn, ...custom];
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
        const names = {
            interview: 'Job Interview',
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
            exam: 'Exam Assistant',
        };

        (this.customProfiles || []).forEach(p => {
            names[p.id] = p.name;
        });

        return names;
    }



    handleProfileSelect(e) {
        this.selectedProfile = e.target.value;
        this.onProfileChange(this.selectedProfile);
    }

    handleLanguageSelect(e) {
        this.selectedLanguage = e.target.value;
        this.onLanguageChange(this.selectedLanguage);
    }

    async handleResponseViewModeSelect(e) {
        this.responseViewMode = e.target.value;
        await cheatingDaddy.storage.updatePreference('responseViewMode', this.responseViewMode);
        this.onResponseViewModeChange(this.responseViewMode);
        this.requestUpdate();
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

    async handleAudioProcessingModeChange(mode) {
        this.audioProcessingMode = mode;
        await cheatingDaddy.storage.updatePreference('audioProcessingMode', mode);
        this.requestUpdate();
    }

    async handleAudioTriggerChange(e) {
        this.audioTriggerMethod = e.target.value;
        await cheatingDaddy.storage.updatePreference('audioTriggerMethod', e.target.value);
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
            manualTrigger: isMac ? 'Cmd+/' : 'Ctrl+/',
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
            {
                key: 'manualTrigger',
                name: 'Manual Audio Trigger',
                description: 'Toggle manual audio recording',
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

    async handleDetailedAnswersChange(e) {
        this.detailedAnswers = e.target.checked;
        await cheatingDaddy.storage.updatePreference('detailedAnswers', this.detailedAnswers);
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

    // ============ PROFILE MANAGEMENT ============

    handleCreateProfile() {
        // Initialize with deep copies of default templates
        const deepCopy = (obj) => {
            const copy = JSON.parse(JSON.stringify(obj));
            if (copy && copy.name && !copy.name.startsWith('Custom ')) {
                copy.name = `Custom ${copy.name}`;
            }
            return copy;
        };

        const defaults = window.cheatingDaddy?.prompts || { PERSONAS: {}, LENGTHS: {}, FORMATS: {} };
        const p = defaults.PERSONAS?.interview || { name: 'Interview' };
        const l = defaults.LENGTHS?.concise || { name: 'Concise' };
        const f = defaults.FORMATS?.teleprompter || { name: 'Teleprompter' };

        this.editingProfileData = {
            id: '',
            name: '',
            settings: {
                persona: deepCopy(p),
                length: deepCopy(l),
                format: deepCopy(f)
            }
        };
        // Add template trackers to dropdowns
        this.editingProfileTemplates = {
            persona: 'interview',
            length: 'concise',
            format: 'teleprompter'
        };

        this.isEditingProfile = true;
        this.requestUpdate();
    }

    handleEditProfile(profile) {
        // Find the profile data from customProfiles
        const data = this.customProfiles.find(p => p.id === profile.value);
        if (data) {
            this.editingProfileData = JSON.parse(JSON.stringify(data)); // Deep copy

            // Try to guess templates or default to 'custom'
            this.editingProfileTemplates = {
                persona: 'custom',
                length: 'custom',
                format: 'custom'
            };

            this.isEditingProfile = true;
            this.requestUpdate();
        }
    }

    async handleDeleteProfile(profileId) {
        if (confirm('Are you sure you want to delete this profile?')) {
            await cheatingDaddy.storage.deleteCustomProfile(profileId);
            const profiles = await cheatingDaddy.storage.getCustomProfiles();
            this.customProfiles = profiles || [];

            // Allow time for state update
            this.selectedProfile = 'interview';
            this.onProfileChange('interview');

            this.requestUpdate();
        }
    }

    updateEditingProfile(field, value) {
        this.editingProfileData = { ...this.editingProfileData, [field]: value };
        this.requestUpdate();
    }

    // Helper to update a specific property inside a component (e.g., settings.persona.intro)
    updateComponentProperty(component, property, value) {
        this.editingProfileData = {
            ...this.editingProfileData,
            settings: {
                ...this.editingProfileData.settings,
                [component]: {
                    ...this.editingProfileData.settings[component],
                    [property]: value
                }
            }
        };
        this.requestUpdate();
    }

    // When template dropdown changes, load that template's data
    updateComponentTemplate(component, templateKey) {
        this.editingProfileTemplates = {
            ...this.editingProfileTemplates,
            [component]: templateKey
        };

        const defaults = window.cheatingDaddy?.prompts || { PERSONAS: {}, LENGTHS: {}, FORMATS: {} };

        if (templateKey !== 'custom') {
            let templateData;
            switch (component) {
                case 'persona':
                    templateData = defaults.PERSONAS[templateKey];
                    break;
                case 'length':
                    templateData = defaults.LENGTHS[templateKey];
                    break;
                case 'format':
                    templateData = defaults.FORMATS[templateKey];
                    break;
            }

            if (templateData) {
                const copy = JSON.parse(JSON.stringify(templateData));
                if (copy && copy.name && !copy.name.startsWith('Custom ')) {
                    copy.name = `Custom ${copy.name}`;
                }

                this.editingProfileData = {
                    ...this.editingProfileData,
                    settings: {
                        ...this.editingProfileData.settings,
                        [component]: copy
                    }
                };
            }
        }
        this.requestUpdate();
    }

    async saveProfile() {
        if (!this.editingProfileData.name) {
            // Show non-blocking validation message
            this.validationError = 'Please enter a profile name';
            this.requestUpdate();
            return;
        }

        const profileToSave = {
            ...this.editingProfileData,
            id: this.editingProfileData.id || crypto.randomUUID()
        };

        try {
            await cheatingDaddy.storage.saveCustomProfile(profileToSave);
        } catch (error) {
            console.error('Failed to save profile:', error);
            this.validationError = 'Failed to save profile. Please try again.';
            this.requestUpdate();
            return;
        }

        // Refresh list
        const profiles = await cheatingDaddy.storage.getCustomProfiles();
        this.customProfiles = profiles || [];

        // Select the new profile
        this.selectedProfile = profileToSave.id;
        this.onProfileChange(profileToSave.id);

        this.isEditingProfile = false;
        this.validationError = null; // Clear error
        this.requestUpdate();
    }

    renderProfileEditor() {
        // Access prompts definitions - ensure they are available
        // We'll need to expose them from main process or have them in renderer? 
        // For now, assuming they are available via cheatingDaddy.prompts which we'll add
        const PROMPTS = window.cheatingDaddy?.prompts || { PERSONAS: {}, LENGTHS: {}, FORMATS: {} };

        const renderTextArea = (label, value, onChange, placeholder, rows = 3) => html`
            <div class="form-group" style="margin-top: 8px;">
                <label class="form-label" style="font-size: 11px; color: var(--text-secondary);">${label}</label>
                <textarea 
                    class="form-control" 
                    style="font-family: monospace; font-size: 12px; line-height: 1.4;"
                    rows="${rows}"
                    .value=${value || ''}
                    placeholder="${placeholder}"
                    @input=${onChange}
                ></textarea>
            </div>
        `;

        return html`
            <div class="profile-section">
                <div class="content-header" style="display: flex; align-items: center; gap: 10px;">
                    <button class="reset-keybinds-button" @click=${() => { this.isEditingProfile = false; this.requestUpdate(); }}>
                        &larr; Back
                    </button>
                    <span>${this.editingProfileData.id ? 'Edit Profile' : 'New Profile'}</span>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Profile Name</label>
                        <input type="text" class="form-control" .value=${this.editingProfileData.name} 
                            @input=${(e) => this.updateEditingProfile('name', e.target.value)} 
                            placeholder="e.g. Technical Interview" />
                    </div>

                    <!-- PERSONA EDITOR -->
                    <div class="form-group" style="border: 1px solid var(--border-color); padding: 12px; border-radius: 6px;">
                        <label class="form-label" style="margin-bottom: 8px;">Persona Configuration</label>
                        
                        <div class="form-group">
                            <label class="form-label" style="font-size: 12px;">Base Template</label>
                            <select class="form-control" 
                                .value=${this.editingProfileTemplates?.persona || 'interview'}
                                @change=${(e) => this.updateComponentTemplate('persona', e.target.value)}>
                                ${Object.entries(PROMPTS.PERSONAS).map(([key, p]) => html`
                                    <option value="${key}">${p.name}</option>
                                `)}
                                <option value="custom">Custom (Edited)</option>
                            </select>
                        </div>

                        <details>
                            <summary style="cursor: pointer; font-size: 12px; color: var(--accent-color); margin: 8px 0;">Advanced: Edit Prompt Instructions</summary>
                            ${renderTextArea(
            'Intro Instruction',
            this.editingProfileData.settings.persona.intro,
            (e) => {
                this.updateComponentProperty('persona', 'intro', e.target.value);
                this.editingProfileTemplates.persona = 'custom';
            },
            'Who is the AI?'
        )}
                            ${renderTextArea(
            'Context Instruction',
            this.editingProfileData.settings.persona.contextInstruction,
            (e) => {
                this.updateComponentProperty('persona', 'contextInstruction', e.target.value);
                this.editingProfileTemplates.persona = 'custom';
            },
            'How should user context be used?'
        )}
                            ${renderTextArea(
            'Search Rules',
            this.editingProfileData.settings.persona.searchFocus,
            (e) => {
                this.updateComponentProperty('persona', 'searchFocus', e.target.value);
                this.editingProfileTemplates.persona = 'custom';
            },
            'When should it search?'
        )}
                        </details>
                    </div>

                    <!-- LENGTH EDITOR -->
                    <div class="form-group" style="border: 1px solid var(--border-color); padding: 12px; border-radius: 6px;">
                        <label class="form-label" style="margin-bottom: 8px;">Length Configuration</label>
                        
                        <div class="form-group">
                            <label class="form-label" style="font-size: 12px;">Base Template</label>
                            <select class="form-control" 
                                .value=${this.editingProfileTemplates?.length || 'concise'}
                                @change=${(e) => this.updateComponentTemplate('length', e.target.value)}>
                                ${Object.entries(PROMPTS.LENGTHS).map(([key, l]) => html`
                                    <option value="${key}">${l.name}</option>
                                `)}
                                <option value="custom">Custom (Edited)</option>
                            </select>
                        </div>
                        
                        <details>
                            <summary style="cursor: pointer; font-size: 12px; color: var(--accent-color); margin: 8px 0;">Advanced: Edit Length Rules</summary>
                            ${renderTextArea(
            'Length Instruction',
            this.editingProfileData.settings.length.instruction,
            (e) => {
                this.updateComponentProperty('length', 'instruction', e.target.value);
                this.editingProfileTemplates.length = 'custom';
            },
            'How long should responses be?'
        )}
                        </details>
                    </div>

                    <!-- FORMAT EDITOR -->
                    <div class="form-group" style="border: 1px solid var(--border-color); padding: 12px; border-radius: 6px;">
                        <label class="form-label" style="margin-bottom: 8px;">Format Configuration</label>
                        
                        <div class="form-group">
                            <label class="form-label" style="font-size: 12px;">Base Template</label>
                            <select class="form-control" 
                                .value=${this.editingProfileTemplates?.format || 'teleprompter'}
                                @change=${(e) => this.updateComponentTemplate('format', e.target.value)}>
                                ${Object.entries(PROMPTS.FORMATS).map(([key, f]) => html`
                                    <option value="${key}">${f.name}</option>
                                `)}
                                <option value="custom">Custom (Edited)</option>
                            </select>
                        </div>
                        
                        <details>
                            <summary style="cursor: pointer; font-size: 12px; color: var(--accent-color); margin: 8px 0;">Advanced: Edit Formatting Rules</summary>
                            ${renderTextArea(
            'Format Instruction',
            this.editingProfileData.settings.format.instruction,
            (e) => {
                this.updateComponentProperty('format', 'instruction', e.target.value);
                this.editingProfileTemplates.format = 'custom';
            },
            'How should text be styled?'
        )}
                        </details>
                    </div>

                    <div class="form-group" style="margin-top: 20px;">
                        <button class="reset-keybinds-button" style="width: 100%; background: var(--btn-primary-bg); color: var(--btn-primary-text); text-align: center; padding: 10px; font-weight: bold; border: none;" @click=${this.saveProfile}>
                            Save Custom Profile
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderProfileSection() {
        if (this.isEditingProfile) {
            return this.renderProfileEditor();
        }

        const profiles = this.getProfiles();
        const profileNames = this.getProfileNames();
        const currentProfile = profiles.find(p => p.value === this.selectedProfile);
        const isCustomProfile = currentProfile?.isCustom;

        return html`
            <div class="profile-section">
                <div class="content-header">AI Profile</div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">
                            Profile Type
                            <span class="current-selection">${currentProfile?.name || 'Unknown'}</span>
                        </label>
                        <div style="display: flex; gap: 8px;">
                            <select class="form-control" style="flex: 1;" .value=${this.selectedProfile} @change=${this.handleProfileSelect}>
                                ${profiles.map(
            profile => html`
                                        <option value=${profile.value} ?selected=${this.selectedProfile === profile.value}>
                                            ${profile.name}
                                        </option>
                                    `
        )}
                            </select>
                            
                            <button class="reset-keybinds-button" @click=${this.handleCreateProfile} title="Create New Profile">
                                +
                            </button>
                            
                            ${isCustomProfile ? html`
                                <button class="reset-keybinds-button" @click=${() => this.handleEditProfile(currentProfile)} title="Edit Profile">
                                    Edit
                                </button>
                                <button class="danger-button" @click=${() => this.handleDeleteProfile(currentProfile.value)} style="padding: 6px 10px;" title="Delete Profile">
                                    X
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    ${!isCustomProfile ? html`
                    <div class="form-group">
                        <div class="checkbox-group">
                            <input
                                type="checkbox"
                                id="detailedAnswers"
                                class="checkbox-input"
                                .checked=${this.detailedAnswers}
                                @change=${this.handleDetailedAnswersChange}
                            />
                            <label class="checkbox-label" for="detailedAnswers">Detailed Answers Mode</label>
                        </div>
                        <div class="form-description">
                            When enabled, AI provides comprehensive, in-depth responses instead of concise answers
                        </div>
                    </div>
                    ` : ''}

                    <div class="form-group expand">
                        <label class="form-label">User Context / Background Info</label>
                        <textarea
                            class="form-control"
                            placeholder="Add specific details about you, your role, or the situation (e.g., 'I am a Senior Dev', 'This is a technical interview')..."
                            .value=${this.customPrompt}
                            @input=${this.handleCustomPromptInput}
                        ></textarea>
                        <div class="form-description">
                            This context is appended to the system prompt to help the AI understand your specific situation.
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
                    <label class="form-label">Audio Source</label>
                    <select class="form-control" .value=${this.audioMode} @change=${this.handleAudioModeSelect}>
                        <option value="mic_only">Microphone Only</option>
                        <option value="both">Mic & Speaker (System)</option>
                        <option value="speaker_only">Speaker Only</option>
                    </select>
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
                    <label class="form-label">View Mode</label>
                    <div class="form-description">Choose how responses are displayed</div>
                    <select class="form-control" .value=${this.responseViewMode} @change=${this.handleResponseViewModeSelect}>
                        <option value="paged">Paged (One at a time)</option>
                        <option value="continuous">Continuous (Scrollable list)</option>
                    </select>
                </div>

                ${this.responseViewMode === 'continuous' ? html`
                    <div class="form-group" style="padding-left: 12px; border-left: 2px solid var(--border-color);">
                        <div class="checkbox-group">
                            <input
                                type="checkbox"
                                id="autoScroll"
                                class="checkbox-input"
                                .checked=${this.autoScroll}
                                @change=${this.handleAutoScrollChange}
                            />
                            <label class="checkbox-label" for="autoScroll">Auto-scroll to New Responses</label>
                        </div>
                        <div class="form-description">
                            Automatically scroll to the bottom when a new response arrives
                        </div>
                    </div>
                ` : ''}

                <div class="form-group">
                    <div class="checkbox-group">
                        <input
                            type="checkbox"
                            id="showSidebar"
                            class="checkbox-input"
                            .checked=${this.showSidebar}
                            @change=${this.handleShowSidebarChange}
                        />
                        <label class="checkbox-label" for="showSidebar">Show Response Navigator</label>
                    </div>
                    <div class="form-description">
                        Display a sidebar to navigate between responses
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
            </div >
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
                    </select >
    <div class="form-description">
        ${this.selectedImageQuality === 'high'
                ? 'Best quality, uses more tokens'
                : this.selectedImageQuality === 'medium'
                    ? 'Balanced quality and token usage'
                    : 'Lower quality, uses fewer tokens'
            }
    </div>
                </div >
            </div >
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
            </div >
    `;
    }

    renderSearchSection() {
        const profiles = this.getProfiles();
        const currentProfile = profiles.find(p => p.value === this.selectedProfile);
        const isCustomProfile = currentProfile?.isCustom;

        if (isCustomProfile) {
            return html`
                <div class="content-header">Search</div>
                <div class="form-grid">
                    <div class="form-group">
                        <div class="form-description">
                            Search behavior for this profile is configured in the <strong>Persona > Advanced</strong> settings.
                        </div>
                    </div>
                </div>
            `;
        }

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

    renderApiKeysSection() {
        return html`
            <div class="content-header">API Keys</div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Gemini API Key</label>
                    <div class="form-description">Required for Live Audio mode. Get free key at <a href="https://aistudio.google.com" target="_blank" style="color: var(--accent-primary);">aistudio.google.com</a></div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input
                            type="${this.showGeminiKey ? 'text' : 'password'}"
                            class="form-control"
                            .value=${this.geminiApiKey || ''}
                            @input=${(e) => this.handleApiKeyChange('gemini', e.target.value)}
                            placeholder="Enter Gemini API key..."
                            style="flex: 1;"
                        />
                        <button class="toggle-btn" @click=${() => { this.showGeminiKey = !this.showGeminiKey; this.requestUpdate(); }}>
                            ${this.showGeminiKey ? 'Hide' : 'Show'}
                        </button>
                    </div>
                    <div class="status-indicator ${this.geminiKeyStatus}">
                        ${this.geminiKeyStatus === 'valid' ? 'Connected' :
                this.geminiKeyStatus === 'invalid' ? 'Invalid key' :
                    this.geminiKeyStatus === 'checking' ? 'Checking...' : 'Not set'}
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Groq API Key</label>
                    <div class="form-description">Recommended for Text & Vision. Get free key at <a href="https://console.groq.com" target="_blank" style="color: var(--accent-primary);">console.groq.com</a></div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input
                            type="${this.showGroqKey ? 'text' : 'password'}"
                            class="form-control"
                            .value=${this.groqApiKey || ''}
                            @input=${(e) => this.handleApiKeyChange('groq', e.target.value)}
                            placeholder="Enter Groq API key..."
                            style="flex: 1;"
                        />
                        <button class="toggle-btn" @click=${() => { this.showGroqKey = !this.showGroqKey; this.requestUpdate(); }}>
                            ${this.showGroqKey ? 'Hide' : 'Show'}
                        </button>
                    </div>
                    <div class="status-indicator ${this.groqKeyStatus}">
                        ${this.groqKeyStatus === 'valid' ? 'Connected' :
                this.groqKeyStatus === 'invalid' ? 'Invalid key' :
                    this.groqKeyStatus === 'checking' ? 'Checking...' : 'Not set'}
                    </div>
                </div>

                <div class="form-description" style="margin-top: 12px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <strong>Tip:</strong> Both keys are recommended. Groq has 50x more daily requests (1,000 vs 20), while Gemini is required for Live Audio mode.
                </div>
            </div>
        `;
    }

    renderAiModelsSection() {
        const textModels = [
            { value: 'groq:llama-3.3-70b-versatile', label: 'Groq: llama-3.3-70b (1K/day)', recommended: true },
            { value: 'groq:llama-3.1-8b-instant', label: 'Groq: llama-3.1-8b (14K/day)' },
            { value: 'gemini:gemini-2.5-flash', label: 'Gemini: 2.5-flash (20/day)' },
            { value: 'none', label: 'None (No fallback)' }
        ];

        const visionModels = [
            { value: 'groq:meta-llama/llama-4-maverick-17b-128e-instruct', label: 'Groq: llama-4-maverick (1K/day)', recommended: true },
            { value: 'groq:meta-llama/llama-4-scout-17b-16e-instruct', label: 'Groq: llama-4-scout (1K/day)' },
            { value: 'gemini:gemini-2.5-flash', label: 'Gemini: 2.5-flash (20/day)' },
            { value: 'none', label: 'None (No fallback)' }
        ];

        return html`
            <div class="content-header">AI Models</div>
            <div class="form-grid">
                
                <div class="form-group" style="margin-bottom: 20px;">
                    <label class="form-label">Audio Processing Mode</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <label class="radio-card ${this.audioProcessingMode === 'live-conversation' ? 'selected' : ''}"
                            @click=${() => this.handleAudioProcessingModeChange('live-conversation')}>
                            <input type="radio" name="audioProcessingMode" value="live-conversation"
                                ?checked=${this.audioProcessingMode === 'live-conversation'} />
                            <div class="radio-content">
                                <strong>Live Conversation</strong>
                                <span class="radio-description">Real-time bidirectional audio</span>
                            </div>
                        </label>
                        <label class="radio-card ${this.audioProcessingMode === 'audio-to-text' ? 'selected' : ''}"
                            @click=${() => this.handleAudioProcessingModeChange('audio-to-text')}>
                            <input type="radio" name="audioProcessingMode" value="audio-to-text"
                                ?checked=${this.audioProcessingMode === 'audio-to-text'} />
                            <div class="radio-content">
                                <strong>Audio → Text</strong>
                                <span class="radio-description">Discrete requests & responses</span>
                            </div>
                        </label>
                    </div>
                </div>

                ${this.audioProcessingMode === 'audio-to-text' ? html`
                    <div class="form-group">
                        <label class="form-label">Audio Model</label>
                        <select class="form-control" 
                            .value=${(this.modelPrefs?.audioToText?.primaryProvider || 'groq') + ':' + (this.modelPrefs?.audioToText?.primaryModel || 'meta-llama/llama-4-maverick-17b-128e-instruct')} 
                            @change=${(e) => this.handleModelChange('audioToText', 'primary', e.target.value)}>
                            <optgroup label="Groq">
                                <option value="groq:meta-llama/llama-4-maverick-17b-128e-instruct">Llama 4 Maverick</option>
                                <option value="groq:meta-llama/llama-4-scout-17b-16e-instruct">Llama 4 Scout</option>
                            </optgroup>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Evaluation Mode</label>
                        <select class="form-control" .value=${this.audioTriggerMethod} @change=${this.handleAudioTriggerChange}>
                            <option value="vad">Auto (Voice Activity)</option>
                            <option value="manual">Manual Trigger</option>
                        </select>
                         ${this.audioTriggerMethod === 'manual' ? html`
                            <div class="form-description" style="margin-top: 5px; color: var(--accent-color);">
                                <strong>Shortcut:</strong> ${this.keybinds.manualTrigger} (Toggle Rec/Stop)
                            </div>
                        ` : ''}
                    </div>
                ` : html`
                     <div class="form-group">
                        <label class="form-label">Live Audio</label>
                        <div class="form-description">Real-time conversation mode</div>
                        <div style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="opacity: 0.7;">Provider:</span>
                                <span style="color: var(--accent-primary);">Gemini</span>
                                <span style="font-size: 10px; opacity: 0.5;">Only option</span>
                            </div>
                            <div style="margin-top: 8px; font-size: 12px; opacity: 0.7;">
                                Model: gemini-2.5-flash-native-audio
                            </div>
                            <div style="margin-top: 8px; font-size: 11px; color: var(--success-color);">
                                Unlimited requests • Real-time • Speaker ID
                            </div>
                        </div>
                    </div>
                `}

                <div class="form-group">
                    <label class="form-label">Text Messages</label>
                    <div class="form-description">Models for chat responses</div>
                    <div style="display: grid; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="width: 70px; font-size: 12px; opacity: 0.7;">Primary:</span>
                            <select class="form-control" style="flex: 1;" 
                                @change=${(e) => this.handleModelChange('textMessage', 'primary', e.target.value)}
                                .value=${this.modelPrefs?.textMessage?.primaryProvider + ':' + this.modelPrefs?.textMessage?.primaryModel}>
                                ${textModels.filter(m => m.value !== 'none').map(m => html`
                                    <option value="${m.value}" ?selected=${this.isModelSelected('textMessage', 'primary', m.value)}>
                                        ${m.label}${m.recommended ? ' (Rec)' : ''}
                                    </option>
                                `)}
                            </select>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="width: 70px; font-size: 12px; opacity: 0.7;">Fallback:</span>
                            <select class="form-control" style="flex: 1;"
                                @change=${(e) => this.handleModelChange('textMessage', 'fallback', e.target.value)}
                                .value=${this.modelPrefs?.textMessage?.fallbackProvider + ':' + this.modelPrefs?.textMessage?.fallbackModel}>
                                ${textModels.map(m => html`
                                    <option value="${m.value}" ?selected=${this.isModelSelected('textMessage', 'fallback', m.value)}>
                                        ${m.label}
                                    </option>
                                `)}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Screen Analysis</label>
                    <div class="form-description">Vision models for screenshots</div>
                    <div style="display: grid; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="width: 70px; font-size: 12px; opacity: 0.7;">Primary:</span>
                            <select class="form-control" style="flex: 1;"
                                @change=${(e) => this.handleModelChange('screenAnalysis', 'primary', e.target.value)}
                                .value=${this.modelPrefs?.screenAnalysis?.primaryProvider + ':' + this.modelPrefs?.screenAnalysis?.primaryModel}>
                                ${visionModels.filter(m => m.value !== 'none').map(m => html`
                                    <option value="${m.value}" ?selected=${this.isModelSelected('screenAnalysis', 'primary', m.value)}>
                                        ${m.label}${m.recommended ? ' (Rec)' : ''}
                                    </option>
                                `)}
                            </select>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="width: 70px; font-size: 12px; opacity: 0.7;">Fallback:</span>
                            <select class="form-control" style="flex: 1;"
                                @change=${(e) => this.handleModelChange('screenAnalysis', 'fallback', e.target.value)}
                                .value=${this.modelPrefs?.screenAnalysis?.fallbackProvider + ':' + this.modelPrefs?.screenAnalysis?.fallbackModel}>
                                ${visionModels.map(m => html`
                                    <option value="${m.value}" ?selected=${this.isModelSelected('screenAnalysis', 'fallback', m.value)}>
                                        ${m.label}
                                    </option>
                                `)}
                            </select>
                        </div>
                    </div>
                </div>

                <button class="secondary-button" @click=${this.resetModelPreferences} style="margin-top: 12px;">
                    Reset to Defaults
                </button>
            </div>
        `;
    }

    renderUsageSection() {
        return html`
            <div class="content-header">Usage Today</div>
            <div class="form-grid">
                <div class="form-description" style="margin-bottom: 12px;">
                    Resets at midnight UTC • ${this.usageResetTime || 'Loading...'}
                </div>

                <div class="form-group">
                    <label class="form-label">GROQ</label>
                    <div class="usage-container">
                        ${(this.usageStats?.groq || []).map(stat => html`
                            <div class="usage-row">
                                <span class="usage-model">${stat.model.split('/').pop()}</span>
                                <div class="usage-bar">
                                    <div class="usage-bar-fill ${stat.percentage >= 90 ? 'red' : stat.percentage >= 50 ? 'yellow' : 'green'}"
                                        style="width: ${Math.min(stat.percentage, 100)}%"></div>
                                </div>
                                <span class="usage-count">${stat.count}/${stat.limit === Infinity ? 'Unlim' : stat.limit}</span>
                            </div>
                        `)}
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">GEMINI</label>
                    <div class="usage-container">
                        ${(this.usageStats?.gemini || []).map(stat => html`
                            <div class="usage-row">
                                <span class="usage-model">${stat.model.replace('gemini-', '')}</span>
                                <div class="usage-bar">
                                    ${stat.limit === Infinity ? html`
                                        <span style="font-size: 11px; opacity: 0.7;">Unlimited</span>
                                    ` : html`
                                        <div class="usage-bar-fill ${stat.percentage >= 90 ? 'red' : stat.percentage >= 50 ? 'yellow' : 'green'}"
                                            style="width: ${Math.min(stat.percentage, 100)}%"></div>
                                    `}
                                </div>
                                <span class="usage-count">${stat.limit === Infinity ? 'Unlim' : `${stat.count}/${stat.limit}`}</span>
                            </div>
                        `)}
                    </div>
                </div>

                <div class="form-description" style="margin-top: 12px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                     Groq has 50x more daily requests than Gemini Flash models
                </div>

                <button class="secondary-button" @click=${this.refreshUsageStats} style="margin-top: 12px;">
                    Refresh Usage
                </button>
            </div>
        `;
    }

    renderAdvancedSection() {
        return html`
    <div class="content-header" style="color: var(--error-color);">Advanced</div>
        <div class="form-grid">
            <div class="form-group">
                <label class="form-label" style="color: var(--error-color);">Data Management</label>
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
            </div >
    `;
    }

    renderSectionContent() {
        switch (this.activeSection) {
            case 'profile':
                return this.renderProfileSection();
            case 'apikeys':
                return this.renderApiKeysSection();
            case 'aimodels':
                return this.renderAiModelsSection();
            case 'usage':
                return this.renderUsageSection();
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

    async handleAutoScrollChange(e) {
        this.autoScroll = e.target.checked;
        await cheatingDaddy.storage.updatePreference('autoScroll', this.autoScroll);
        this.requestUpdate();
    }

    async handleShowSidebarChange(e) {
        this.showSidebar = e.target.checked;
        await cheatingDaddy.storage.updatePreference('showSidebar', this.showSidebar);
        this.requestUpdate();
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
