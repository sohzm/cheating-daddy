import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class MainView extends LitElement {
    static styles = css`
        * {
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
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

        .input-group input {
            flex: 1;
        }

        .api-keys-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 20px;
        }

        .api-key-row {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .api-key-label {
            font-size: 12px;
            color: var(--description-color);
            min-width: 80px;
            text-align: right;
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
            cursor: pointer;
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
        isConnectingGmail: { type: Boolean },
        gmailStatus: { type: String },
    };

    constructor() {
        super();
        this.onStart = () => {};
        this.onAPIKeyHelp = () => {};
        this.isInitializing = false;
        this.onLayoutModeChange = () => {};
        this.showApiKeyError = false;
        this.boundKeydownHandler = this.handleKeydown.bind(this);
        this.isConnectingGmail = false;
        this.gmailStatus = '';
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

    handleInput(e) {
        localStorage.setItem('apiKey', e.target.value);
        // Clear error state when user starts typing
        if (this.showApiKeyError) {
            this.showApiKeyError = false;
        }
    }

    handleComposioInput(e) {
        localStorage.setItem('composioApiKey', e.target.value);
    }

    async handleConnectGmail() {
        if (this.isConnectingGmail) return;
        
        // Try to get API key from environment first, then localStorage
        let composioApiKey = localStorage.getItem('composioApiKey');
        if (!composioApiKey) {
            try {
                const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
                if (ipcRenderer) {
                    const result = await ipcRenderer.invoke('get-composio-api-key');
                    if (result?.success && result.apiKey) {
                        composioApiKey = result.apiKey;
                    }
                }
            } catch (error) {
                console.warn('Failed to load Composio API key from environment:', error);
            }
        }
        
        if (!composioApiKey) {
            this.gmailStatus = 'No Composio API key found. Please set COMPOSIO_API_KEY in your .env file.';
            this.requestUpdate();
            return;
        }

        try {
            this.isConnectingGmail = true;
            this.gmailStatus = 'Initializing Composio...';
            this.requestUpdate();

            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            if (!ipcRenderer) {
                this.gmailStatus = 'IPC unavailable in renderer.';
                this.isConnectingGmail = false;
                this.requestUpdate();
                return;
            }

            const initResp = await ipcRenderer.invoke('initialize-composio', composioApiKey);
            if (!initResp?.success) {
                this.gmailStatus = `Failed to initialize Composio: ${initResp?.error || 'unknown error'}`;
                this.isConnectingGmail = false;
                this.requestUpdate();
                return;
            }

            this.gmailStatus = 'Starting Gmail connection...';
            this.requestUpdate();

            const externalUserId = 'nikhilprabhu06@gmail.com';
            const authConfigId = 'ac_AEOPhhO57Zsk';
            const connectResp = await ipcRenderer.invoke('connect-gmail', externalUserId, authConfigId);
            if (!connectResp?.success || !connectResp?.redirectUrl) {
                this.gmailStatus = `Failed to start Gmail auth: ${connectResp?.error || 'no redirect URL'}`;
                this.isConnectingGmail = false;
                this.requestUpdate();
                return;
            }

            // Open OAuth flow in system browser without blocking the window
            await ipcRenderer.invoke('open-external', connectResp.redirectUrl);
            this.gmailStatus = 'Waiting for Gmail authorization to complete...';
            this.requestUpdate();

            // Poll connection status non-blockingly
            const pollStart = Date.now();
            const timeoutMs = 5 * 60 * 1000;
            const poll = async () => {
                try {
                    const statusResp = await ipcRenderer.invoke('get-gmail-connection-status', externalUserId);
                    if (statusResp?.success && statusResp?.connectedAccount) {
                        this.gmailStatus = `Connected! Account id: ${statusResp.connectedAccount.id}`;
                        this.isConnectingGmail = false;
                        this.requestUpdate();
                        return;
                    }
                } catch (e) {
                    // Ignore intermittent errors during polling
                }
                if (Date.now() - pollStart < timeoutMs && this.isConnectingGmail) {
                    setTimeout(poll, 2000);
                } else if (this.isConnectingGmail) {
                    this.gmailStatus = 'Timed out waiting for Gmail authorization.';
                    this.isConnectingGmail = false;
                    this.requestUpdate();
                }
            };
            setTimeout(poll, 2000);
        } catch (err) {
            this.gmailStatus = `Unexpected error: ${err?.message || err}`;
            this.isConnectingGmail = false;
            this.requestUpdate();
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
        return html`
            <div class="welcome">Welcome</div>

            <div class="api-keys-container">
                <div class="api-key-row">
                    <div class="api-key-label">Gemini:</div>
                    <input
                        type="password"
                        placeholder="Gemini API Key (loaded from .env file)"
                        .value=${localStorage.getItem('apiKey') || ''}
                        @input=${this.handleInput}
                        class="${this.showApiKeyError ? 'api-key-error' : ''}"
                        disabled
                        title="Gemini API key is loaded from GEMINI_API_KEY environment variable"
                    />
                </div>
                <div class="api-key-row">
                    <div class="api-key-label">Composio:</div>
                    <input
                        type="password"
                        placeholder="Enter your Composio API Key (optional)"
                        .value=${localStorage.getItem('composioApiKey') || ''}
                        @input=${this.handleComposioInput}
                    />
                    <button class="start-button" @click=${this.handleConnectGmail} .disabled=${this.isConnectingGmail}>
                        ${this.isConnectingGmail ? 'Connecting…' : 'Connect Gmail'}
                    </button>
                </div>
                ${this.gmailStatus ? html`<div class="description">${this.gmailStatus}</div>` : ''}
            </div>

            <div class="input-group">
                <button @click=${this.handleStartClick} class="start-button ${this.isInitializing ? 'initializing' : ''}">
                    ${this.getStartButtonText()}
                </button>
            </div>
            <p class="description">
                Gemini API key is loaded from .env file. 
                <span @click=${this.handleAPIKeyHelpClick} class="link">Need help?</span>
            </p>
        `;
    }
}

customElements.define('main-view', MainView);
