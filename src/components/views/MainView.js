import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class MainView extends LitElement {
    static styles = css`
        * {
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
            cursor: default;
            user-select: none;
        }

        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            width: 100%;
            padding: 40px;
            background: transparent;
        }

        .main-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            max-width: 500px;
            width: 100%;
            text-align: center;
        }

        .welcome {
            font-size: 32px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 8px;
            letter-spacing: -0.5px;
        }

        .subtitle {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 40px;
            font-weight: 400;
            line-height: 1.5;
        }

        .shortcut-hint {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.4);
            margin-top: 20px;
            font-weight: 400;
        }

        .shortcut-key {
            background: rgba(255, 255, 255, 0.1);
            border: 0.5px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 10px;
            font-weight: 500;
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
            background: rgba(0, 122, 255, 0.6);
            color: rgba(255, 255, 255, 0.95);
            border: 0.5px solid rgba(0, 122, 255, 0.3);
            padding: 16px 32px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(20px);
            min-width: 200px;
            letter-spacing: 0.2px;
        }

        .start-button:hover {
            background: rgba(0, 122, 255, 0.7);
            border-color: rgba(0, 122, 255, 0.4);
            transform: translateY(-2px);
        }

        .start-button:active {
            transform: translateY(0);
        }

        .start-button.initializing {
            opacity: 0.7;
            cursor: not-allowed;
        }

        .start-button.initializing:hover {
            transform: none;
            background: rgba(0, 122, 255, 0.6);
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
    };

    constructor() {
        super();
        this.onStart = () => {};
        this.onAPIKeyHelp = () => {};
        this.isInitializing = false;
        this.onLayoutModeChange = () => {};
        this.boundKeydownHandler = this.handleKeydown.bind(this);
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
            <div class="main-container">
                <div class="welcome">Welcome</div>
                <div class="subtitle">Your intelligent assistant is ready to help</div>
                
                <button @click=${this.handleStartClick} class="start-button ${this.isInitializing ? 'initializing' : ''}">
                    ${this.getStartButtonText()}
                </button>
                
                <div class="shortcut-hint">
                    Press <span class="shortcut-key">Ctrl</span> + <span class="shortcut-key">Enter</span> to start
                </div>
            </div>
        `;
    }
}

customElements.define('main-view', MainView);
