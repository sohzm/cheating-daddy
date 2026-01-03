import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class MainView extends LitElement {
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

        .welcome {
            font-size: 20px;
            margin-bottom: 6px;
            font-weight: 500;
            color: var(--text-color);
            margin-top: auto;
        }

        .input-group {
            display: flex;
            margin-bottom: 16px;
            width: 100%;
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
            justify-content: center;
            gap: 8px;
            transition: background 0.1s ease;
            width: 100%;
            cursor: default;
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
            cursor: default;
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
        // Set up IPC listener via preload bridge
        if (window.electronAPI) {
            this._cleanupSessionInitializing = window.electronAPI.onSessionInitializing(isInitializing => {
                this.isInitializing = isInitializing;
            });
        }

        // Add keyboard event listener for Ctrl+Enter (or Cmd+Enter on Mac)
        document.addEventListener('keydown', this.boundKeydownHandler);

        // Resize window for this view
        resizeLayout();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        // Clean up IPC listener via stored cleanup function
        if (this._cleanupSessionInitializing) {
            this._cleanupSessionInitializing();
        }
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

    getStartButtonText() {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const shortcut = isMac ? 'Cmd+Enter' : 'Ctrl+Enter';
        return html`Start <span class="shortcut-hint">${shortcut}</span>`;
    }

    render() {
        return html`
            <div class="welcome">Welcome</div>

            <div class="input-group">
                <button @click=${this.handleStartClick} class="start-button ${this.isInitializing ? 'initializing' : ''}">
                    ${this.getStartButtonText()}
                </button>
            </div>
            <p class="description">
                Press Start to begin.
                <span @click=${this.handleAPIKeyHelpClick} class="link">Need help?</span>
            </p>
        `;
    }
}

customElements.define('main-view', MainView);
