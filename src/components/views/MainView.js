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
    };

    constructor() {
        super();
        this.onStart = () => {};
        this.onAPIKeyHelp = () => {};
        this.isInitializing = false;
        this.onLayoutModeChange = () => {};
        this.showApiKeyError = false;
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
                <button @click=${this.handleStartClick} class="start-button ${this.isInitializing ? 'initializing' : ''}">
                    ${this.getStartButtonText()}
                </button>
            </div>
            <p class="description">
                dont have an api key?
                <span @click=${this.handleAPIKeyHelpClick} class="link">get one here</span>
            </p>
        `;
    }
}

customElements.define('main-view', MainView);
