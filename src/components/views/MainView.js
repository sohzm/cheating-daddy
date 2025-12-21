import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class MainView extends LitElement {
    static styles = css`
        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            cursor: default;
            user-select: none;
        }

        .welcome {
            font-size: 20px;
            margin-bottom: 6px;
            font-weight: 500;
            color: var(--text-color);
            margin-top: auto;
        }

        .input-group {
            display: flex;
            gap: 10px;
            margin-bottom: 16px;
        }

        .input-group input {
            flex: 1;
        }

        input {
            background: var(--input-background);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 10px 12px;
            width: 100%;
            border-radius: 3px;
            font-size: 13px;
            transition: border-color 0.1s ease;
        }

        input:focus {
            outline: none;
            border-color: var(--border-default);
        }

        input::placeholder {
            color: var(--placeholder-color);
        }

        /* Red blink animation for empty API key */
        input.api-key-error {
            animation: blink-red 0.6s ease-in-out;
            border-color: var(--error-color);
        }

        @keyframes blink-red {
            0%, 100% {
                border-color: var(--border-color);
            }
            50% {
                border-color: var(--error-color);
                background: rgba(241, 76, 76, 0.1);
            }
        }

        .start-button {
            background: var(--start-button-background);
            color: var(--start-button-color);
            border: none;
            padding: 10px 16px;
            border-radius: 3px;
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background 0.1s ease;
        }

        .start-button:hover {
            background: var(--start-button-hover-background);
        }

        .start-button.initializing {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .start-button.initializing:hover {
            background: var(--start-button-background);
        }

        .shortcut-hint {
            font-size: 11px;
            color: var(--text-muted);
            font-family: 'SF Mono', Monaco, monospace;
        }

        .description {
            color: var(--text-secondary);
            font-size: 13px;
            margin-bottom: 20px;
            line-height: 1.5;
        }

        .link {
            color: var(--text-color);
            text-decoration: underline;
            cursor: pointer;
            text-underline-offset: 2px;
        }

        .link:hover {
            color: var(--text-color);
        }

        /* API Key Popup Styles */
        .api-key-popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .api-key-popup-overlay.show {
            opacity: 1;
        }

        .api-key-popup {
            background: var(--input-background);
            border: 1px solid var(--button-border);
            border-radius: 12px;
            padding: 24px;
            min-width: 280px;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            transform: scale(0.9);
            transition: transform 0.2s ease;
        }

        .api-key-popup-overlay.show .api-key-popup {
            transform: scale(1);
        }

        .api-key-popup-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-color);
            margin-bottom: 16px;
            text-align: center;
        }

        .api-key-popup-content {
            font-size: 14px;
            color: var(--description-color);
            margin-bottom: 16px;
            line-height: 1.5;
        }

        .api-key-display {
            background: var(--input-background);
            border: 1px solid var(--button-border);
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            font-family: monospace;
            font-size: 18px;
            font-weight: 600;
            color: var(--text-color);
            margin-bottom: 16px;
            letter-spacing: 2px;
        }

        .api-key-info {
            font-size: 12px;
            color: var(--description-color);
            opacity: 0.8;
            text-align: center;
            margin-top: 8px;
        }

        .api-key-popup-bottom {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 20px;
        }

        .api-key-button {
            background: var(--start-button-background);
            color: var(--start-button-color);
            border: 1px solid var(--start-button-border);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            align-self: flex-end;
            margin-left: auto;
        }

        .api-key-button:hover {
            background: var(--start-button-hover-background);
            border-color: var(--start-button-hover-border);
        }

        .show-key-button {
            background: var(--start-button-background);
            color: var(--start-button-color);
            border: 1px solid var(--start-button-border);
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
        }

        .show-key-button:hover {
            background: var(--start-button-hover-background);
            border-color: var(--start-button-hover-border);
        }

        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 480px;
        }
    `;

    static properties = {
        onStart: { type: Function },
        onAPIKeyHelp: { type: Function },
        isInitializing: { type: Boolean },
        onLayoutModeChange: { type: Function },
        showApiKeyError: { type: Boolean },
        showApiKeyPopup: { type: Boolean },
    };

    constructor() {
        super();
        this.onStart = () => {};
        this.onAPIKeyHelp = () => {};
        this.isInitializing = false;
        this.onLayoutModeChange = () => {};
        this.showApiKeyError = false;
        this.showApiKeyPopup = false;
        this.boundKeydownHandler = this.handleKeydown.bind(this);
        this.apiKey = '';
        this._loadApiKey();
    }

    async _loadApiKey() {
        this.apiKey = await cheatingDaddy.storage.getApiKey();
        this.requestUpdate();
    }

    connectedCallback() {
        super.connectedCallback();
        window.electron?.ipcRenderer?.on('session-initializing', (event, isInitializing) => {
            this.isInitializing = isInitializing;
        });

        // Add keyboard event listener for Ctrl+Enter (or Cmd+Enter on Mac)
        document.addEventListener('keydown', this.boundKeydownHandler);

        // Resize window for this view
        resizeLayout();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.electron?.ipcRenderer?.removeAllListeners('session-initializing');
        // Remove keyboard event listener
        document.removeEventListener('keydown', this.boundKeydownHandler);
    }

    handleKeydown(e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isStartShortcut = isMac ? e.metaKey && e.key === 'Enter' : e.ctrlKey && e.key === 'Enter';

        if (isStartShortcut) {
            e.preventDefault();
            this.handleStartClick();
        }
    }

    async handleInput(e) {
        this.apiKey = e.target.value;
        await cheatingDaddy.storage.setApiKey(e.target.value);
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

    handleResetOnboarding() {
        localStorage.removeItem('onboardingCompleted');
        // Refresh the page to trigger onboarding
        window.location.reload();
    }

    handleApiKeyButtonClick() {
        this.showApiKeyPopup = true;
    }

    handleCloseApiKeyPopup() {
        this.showApiKeyPopup = false;
    }

    getLastFourLetters() {
        const apiKey = localStorage.getItem('apiKey');
        if (!apiKey || apiKey.length < 4) {
            return 'None';
        }
        return apiKey.slice(-4);
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
        const shortcut = isMac ? 'Cmd+Enter' : 'Ctrl+Enter';
        return html`Start <span class="shortcut-hint">${shortcut}</span>`;
    }

    render() {
        return html`
            <div class="welcome">Welcome</div>

            <div class="input-group">
                <input
                    type="password"
                    placeholder="Enter your Gemini API Key"
                    .value=${this.apiKey}
                    @input=${this.handleInput}
                    class="${this.showApiKeyError ? 'api-key-error' : ''}"
                />
                <button @click=${this.handleApiKeyButtonClick} class="show-key-button" title="Show the last 4 letters of the API key">
                    👁️
                </button>
                <button @click=${this.handleStartClick} class="start-button ${this.isInitializing ? 'initializing' : ''}">
                    ${this.getStartButtonText()}
                </button>
            </div>
            <p class="description">
                dont have an api key?
                <span @click=${this.handleAPIKeyHelpClick} class="link">get one here</span>
            </p>

            <!-- API Key Popup -->
            ${this.showApiKeyPopup ? html`
                <div class="api-key-popup-overlay show" @click=${this.handleCloseApiKeyPopup}>
                    <div class="api-key-popup" @click=${(e) => e.stopPropagation()}>
                        <div class="api-key-popup-title">API Key Identifier</div>
                        <div class="api-key-popup-content">
                            Last 4 letters of your API key to help identify which Google account you're using:
                        </div>
                        <div class="api-key-display">
                            ${this.getLastFourLetters()}
                        </div>
                        <div class="api-key-popup-bottom">
                            <div class="api-key-info">
                                This only shows the last 4 letters for identification purposes
                            </div>
                            <button @click=${this.handleCloseApiKeyPopup} class="api-key-button">
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}
        `;
    }
}

customElements.define('main-view', MainView);
