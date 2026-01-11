import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class MainView extends LitElement {
    static styles = css`
        * {
            font-family: 'Inter', sans-serif;
            cursor: default;
            user-select: none;
        }

        .welcome {
            font-size: 24px;
            margin-bottom: 8px;
            font-weight: 600;
            margin-top: auto;
        }

        .input-group {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
        }

        .input-group .input-wrapper {
            flex: 1;
            position: relative;
            display: flex;
            align-items: center;
        }

        .input-group input {
            flex: 1;
            padding-right: 40px;
        }

        .eye-toggle {
            position: absolute;
            right: 10px;
            background: none;
            border: none;
            padding: 4px;
            border-radius: 4px;
            color: var(--icon-button-color);
            opacity: 0.6;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.2s ease, background 0.2s ease;
        }

        .eye-toggle:hover {
            opacity: 1;
            background: var(--hover-background);
        }

        .eye-toggle svg {
            width: 18px;
            height: 18px;
        }

        input {
            background: var(--input-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 10px 14px;
            width: 100%;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s ease;
        }

        input:focus {
            outline: none;
            border-color: var(--focus-border-color);
            box-shadow: 0 0 0 3px var(--focus-box-shadow);
            background: var(--input-focus-background);
        }

        input::placeholder {
            color: var(--placeholder-color);
        }

        /* Red blink animation for empty API key */
        input.api-key-error {
            animation: blink-red 1s ease-in-out;
            border-color: #ff4444;
        }

        @keyframes blink-red {
            0%,
            100% {
                border-color: var(--button-border);
                background: var(--input-background);
            }
            25%,
            75% {
                border-color: #ff4444;
                background: rgba(255, 68, 68, 0.1);
            }
            50% {
                border-color: #ff6666;
                background: rgba(255, 68, 68, 0.15);
            }
        }

        .start-button {
            background: var(--start-button-background);
            color: var(--start-button-color);
            border: 1px solid var(--start-button-border);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .start-button:hover {
            background: var(--start-button-hover-background);
            border-color: var(--start-button-hover-border);
        }

        .start-button.initializing {
            opacity: 0.5;
        }

        .start-button.initializing:hover {
            background: var(--start-button-background);
            border-color: var(--start-button-border);
        }

        .shortcut-icons {
            display: flex;
            align-items: center;
            gap: 2px;
            margin-left: 4px;
        }

        .shortcut-icons svg {
            width: 14px;
            height: 14px;
        }

        .shortcut-icons svg path {
            stroke: currentColor;
        }

        .description {
            color: var(--description-color);
            font-size: 14px;
            margin-bottom: 24px;
            line-height: 1.5;
        }

        .link {
            color: var(--link-color);
            text-decoration: underline;
            cursor: default;
        }

        .shortcut-hint {
            color: var(--description-color);
            font-size: 11px;
            opacity: 0.8;
        }

        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 500px;
        }
    `;

    static properties = {
        onStart: { type: Function },
        onAPIKeyHelp: { type: Function },
        isInitializing: { type: Boolean },
        onLayoutModeChange: { type: Function },
        showApiKeyError: { type: Boolean },
        onClearAndRestart: { type: Function },
        selectedModel: { type: String },
        showApiKey: { type: Boolean },
    };

    constructor() {
        super();
        this.onStart = () => {};
        this.onAPIKeyHelp = () => {};
        this.isInitializing = false;
        this.onLayoutModeChange = () => {};
        this.showApiKeyError = false;
        this.onClearAndRestart = () => {};
        this.boundKeydownHandler = this.handleKeydown.bind(this);
        this.selectedModel = localStorage.getItem('selectedModel') || 'gemini-2.0-flash-exp';
        this.showApiKey = false;
    }

    toggleApiKeyVisibility() {
        this.showApiKey = !this.showApiKey;
    }

    // Helper to check if selected model is a Groq/Llama model
    isGroqModel() {
        return this.selectedModel && (this.selectedModel.includes('llama') || this.selectedModel.includes('groq'));
    }

    // Get the appropriate API key based on model
    getApiKey() {
        if (this.isGroqModel()) {
            return localStorage.getItem('groqApiKey') || '';
        }
        return localStorage.getItem('apiKey') || '';
    }

    // Get the appropriate API key storage key
    getApiKeyStorageKey() {
        return this.isGroqModel() ? 'groqApiKey' : 'apiKey';
    }

    connectedCallback() {
        super.connectedCallback();
        window.electron?.ipcRenderer?.on('session-initializing', (event, isInitializing) => {
            this.isInitializing = isInitializing;
        });

        // Add keyboard event listener for Ctrl+Enter (or Cmd+Enter on Mac)
        document.addEventListener('keydown', this.boundKeydownHandler);

        // Load and apply layout mode on startup
        this.loadLayoutMode();

        // Load current model selection
        this.selectedModel = localStorage.getItem('selectedModel') || 'gemini-2.0-flash-exp';

        // Listen for storage changes (when model is changed in settings)
        this.storageHandler = (e) => {
            if (e.key === 'selectedModel') {
                this.selectedModel = e.newValue || 'gemini-2.0-flash-exp';
                this.requestUpdate();
            }
        };
        window.addEventListener('storage', this.storageHandler);

        // Resize window for this view
        resizeLayout();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.electron?.ipcRenderer?.removeAllListeners('session-initializing');
        // Remove keyboard event listener
        document.removeEventListener('keydown', this.boundKeydownHandler);
        // Remove storage listener
        if (this.storageHandler) {
            window.removeEventListener('storage', this.storageHandler);
        }
    }

    handleKeydown(e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isStartShortcut = isMac ? e.metaKey && e.key === 'Enter' : e.ctrlKey && e.key === 'Enter';

        if (isStartShortcut) {
            e.preventDefault();
            this.handleStartClick();
        }
    }

    handleInput(e) {
        // Save to the appropriate key based on selected model
        const storageKey = this.getApiKeyStorageKey();
        localStorage.setItem(storageKey, e.target.value);
        // Clear error state when user starts typing
        if (this.showApiKeyError) {
            this.showApiKeyError = false;
        }
    }

    handleStartClick() {
        if (this.isInitializing) {
            return;
        }
        this.onStart();
    }

    handleAPIKeyHelpClick() {
        this.onAPIKeyHelp();
    }

    handleClearAndRestart() {
        this.onClearAndRestart();
    }

    handleResetOnboarding() {
        localStorage.removeItem('onboardingCompleted');
        // Refresh the page to trigger onboarding
        window.location.reload();
    }

    loadLayoutMode() {
        const savedLayoutMode = localStorage.getItem('layoutMode');
        if (savedLayoutMode && savedLayoutMode !== 'normal') {
            // Notify parent component to apply the saved layout mode
            this.onLayoutModeChange(savedLayoutMode);
        }
    }

    // Method to trigger the red blink animation
    triggerApiKeyError() {
        this.showApiKeyError = true;
        // Remove the error class after 1 second
        setTimeout(() => {
            this.showApiKeyError = false;
        }, 1000);
    }

    getStartButtonText() {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

        const cmdIcon = html`<svg width="14px" height="14px" viewBox="0 0 24 24" stroke-width="2" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 6V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M15 6V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path
                d="M9 6C9 4.34315 7.65685 3 6 3C4.34315 3 3 4.34315 3 6C3 7.65685 4.34315 9 6 9H18C19.6569 9 21 7.65685 21 6C21 4.34315 19.6569 3 18 3C16.3431 3 15 4.34315 15 6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></path>
            <path
                d="M9 18C9 19.6569 7.65685 21 6 21C4.34315 21 3 19.6569 3 18C3 16.3431 4.34315 15 6 15H18C19.6569 15 21 16.3431 21 18C21 19.6569 19.6569 21 18 21C16.3431 21 15 19.6569 15 18"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></path>
        </svg>`;

        const enterIcon = html`<svg width="14px" height="14px" stroke-width="2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M10.25 19.25L6.75 15.75L10.25 12.25"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></path>
            <path
                d="M6.75 15.75H12.75C14.9591 15.75 16.75 13.9591 16.75 11.75V4.75"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></path>
        </svg>`;

        if (isMac) {
            return html`Start Session <span class="shortcut-icons">${cmdIcon}${enterIcon}</span>`;
        } else {
            return html`Start Session <span class="shortcut-icons">Ctrl${enterIcon}</span>`;
        }
    }

    render() {
        const isGroq = this.isGroqModel();
        const apiKeyPlaceholder = isGroq ? 'Enter your Groq API Key' : 'Enter your Gemini API Key';
        const apiKeyValue = this.getApiKey();
        const modelName = isGroq
            ? (this.selectedModel === 'llama-4-maverick' ? 'Llama 4 Maverick' : 'Llama 4 Scout')
            : 'Gemini';

        return html`
            <div class="welcome">Welcome</div>

            <div class="input-group">
                <div class="input-wrapper">
                    <input
                        type="${this.showApiKey ? 'text' : 'password'}"
                        placeholder="${apiKeyPlaceholder}"
                        .value=${apiKeyValue}
                        @input=${this.handleInput}
                        class="${this.showApiKeyError ? 'api-key-error' : ''}"
                    />
                    <button class="eye-toggle" @click=${this.toggleApiKeyVisibility} title="${this.showApiKey ? 'Hide API Key' : 'Show API Key'}">
                        ${this.showApiKey
                            ? html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>`
                            : html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>`
                        }
                    </button>
                </div>
                <button @click=${this.handleStartClick} class="start-button ${this.isInitializing ? 'initializing' : ''}">
                    ${this.getStartButtonText()}
                </button>
            </div>
            <p class="description">
                dont have an api key?
                <span @click=${this.handleAPIKeyHelpClick} class="link">get one here</span>
                ${isGroq ? html` (Using ${modelName} via Groq)` : html` (Using ${modelName})`}
            </p>
                    <p class="shortcut-hint">
            Press <strong>Ctrl+Alt+R</strong> to clear session and automatically restart
        </p>
        `;
    }
}

customElements.define('main-view', MainView);
