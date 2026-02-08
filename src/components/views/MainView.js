import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class MainView extends LitElement {
    static styles = css`
        * {
            font-family: var(--font);
            cursor: default;
            user-select: none;
            box-sizing: border-box;
        }

        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--space-xl) var(--space-lg);
        }

        .form-wrapper {
            width: 100%;
            max-width: 420px;
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
        }

        .page-title {
            font-size: var(--font-size-xl);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
            margin-bottom: var(--space-xs);
        }

        .page-subtitle {
            font-size: var(--font-size-sm);
            color: var(--text-muted);
            margin-bottom: var(--space-md);
        }

        /* ── Warning banner ── */

        .warning-banner {
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
            padding: var(--space-md);
            border-radius: var(--radius-md);
            border: 1px solid var(--warning);
            background: rgba(212, 160, 23, 0.06);
        }

        .warning-text {
            font-size: var(--font-size-sm);
            color: var(--warning);
            line-height: var(--line-height);
        }

        .switch-cloud-btn {
            background: var(--accent);
            color: var(--btn-primary-text, #fff);
            border: none;
            padding: var(--space-sm) var(--space-md);
            border-radius: var(--radius-sm);
            font-size: var(--font-size-sm);
            font-weight: var(--font-weight-medium);
            cursor: pointer;
            transition: background var(--transition);
            align-self: flex-start;
        }

        .switch-cloud-btn:hover {
            background: var(--accent-hover);
        }

        /* ── Form controls ── */

        .form-group {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);
        }

        .form-label {
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-medium);
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        input, select, textarea {
            background: var(--bg-elevated);
            color: var(--text-primary);
            border: 1px solid var(--border);
            padding: 10px 12px;
            width: 100%;
            border-radius: var(--radius-sm);
            font-size: var(--font-size-sm);
            font-family: var(--font);
            transition: border-color var(--transition), box-shadow var(--transition);
        }

        input:hover:not(:focus), select:hover:not(:focus), textarea:hover:not(:focus) {
            border-color: var(--text-muted);
        }

        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 1px var(--accent);
        }

        input::placeholder, textarea::placeholder {
            color: var(--text-muted);
        }

        input.error {
            border-color: var(--danger, #EF4444);
        }

        select {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23999' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 8px center;
            background-repeat: no-repeat;
            background-size: 14px;
            padding-right: 28px;
        }

        textarea {
            resize: vertical;
            min-height: 80px;
            line-height: var(--line-height);
        }

        .form-hint {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
        }

        .form-hint a, .form-hint span.link {
            color: var(--accent);
            text-decoration: none;
            cursor: pointer;
        }

        .form-hint span.link:hover {
            text-decoration: underline;
        }

        /* ── Start button ── */

        .start-button {
            background: var(--accent);
            color: var(--btn-primary-text, #fff);
            border: none;
            padding: 12px var(--space-md);
            border-radius: var(--radius-sm);
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-semibold);
            cursor: pointer;
            transition: background var(--transition);
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-sm);
        }

        .start-button:hover {
            background: var(--accent-hover);
        }

        .start-button.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .start-button.disabled:hover {
            background: var(--accent);
        }

        .shortcut-hint {
            font-size: var(--font-size-xs);
            opacity: 0.6;
            font-family: var(--font-mono);
        }

        /* ── Divider ── */

        .divider {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            margin: var(--space-sm) 0;
        }

        .divider-line {
            flex: 1;
            height: 1px;
            background: var(--border);
        }

        .divider-text {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            text-transform: lowercase;
        }

        /* ── Mode switch links ── */

        .mode-links {
            display: flex;
            justify-content: center;
            gap: var(--space-lg);
        }

        .mode-link {
            font-size: var(--font-size-sm);
            color: var(--text-secondary);
            cursor: pointer;
            background: none;
            border: none;
            padding: 0;
            transition: color var(--transition);
        }

        .mode-link:hover {
            color: var(--text-primary);
        }
    `;

    static properties = {
        onStart: { type: Function },
        onExternalLink: { type: Function },
        selectedProfile: { type: String },
        onProfileChange: { type: Function },
        isInitializing: { type: Boolean },
        // Internal state
        _mode: { state: true },
        _token: { state: true },
        _geminiKey: { state: true },
        _groqKey: { state: true },
        _openaiKey: { state: true },
        _tokenError: { state: true },
        _keyError: { state: true },
    };

    constructor() {
        super();
        this.onStart = () => {};
        this.onExternalLink = () => {};
        this.selectedProfile = 'interview';
        this.onProfileChange = () => {};
        this.isInitializing = false;

        this._mode = 'cloud';
        this._token = '';
        this._geminiKey = '';
        this._groqKey = '';
        this._openaiKey = '';
        this._tokenError = false;
        this._keyError = false;

        this.boundKeydownHandler = this._handleKeydown.bind(this);
        this._loadFromStorage();
    }

    async _loadFromStorage() {
        try {
            const [prefs, creds] = await Promise.all([
                cheatingDaddy.storage.getPreferences(),
                cheatingDaddy.storage.getCredentials().catch(() => ({})),
            ]);

            this._mode = prefs.providerMode || 'cloud';

            // Load keys
            this._token = creds.cloudToken || '';
            this._geminiKey = await cheatingDaddy.storage.getApiKey().catch(() => '') || '';
            this._groqKey = await cheatingDaddy.storage.getGroqApiKey().catch(() => '') || '';
            this._openaiKey = creds.openaiKey || '';

            this.requestUpdate();
        } catch (e) {
            console.error('Error loading MainView storage:', e);
        }
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('keydown', this.boundKeydownHandler);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('keydown', this.boundKeydownHandler);
    }

    _handleKeydown(e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            this._handleStart();
        }
    }

    // ── Persistence ──

    async _saveMode(mode) {
        this._mode = mode;
        this._tokenError = false;
        this._keyError = false;
        await cheatingDaddy.storage.updatePreference('providerMode', mode);
        this.requestUpdate();
    }

    async _saveToken(val) {
        this._token = val;
        this._tokenError = false;
        try {
            const creds = await cheatingDaddy.storage.getCredentials().catch(() => ({}));
            await cheatingDaddy.storage.setCredentials({ ...creds, cloudToken: val });
        } catch (e) {}
        this.requestUpdate();
    }

    async _saveGeminiKey(val) {
        this._geminiKey = val;
        this._keyError = false;
        await cheatingDaddy.storage.setApiKey(val);
        this.requestUpdate();
    }

    async _saveGroqKey(val) {
        this._groqKey = val;
        await cheatingDaddy.storage.setGroqApiKey(val);
        this.requestUpdate();
    }

    async _saveOpenaiKey(val) {
        this._openaiKey = val;
        try {
            const creds = await cheatingDaddy.storage.getCredentials().catch(() => ({}));
            await cheatingDaddy.storage.setCredentials({ ...creds, openaiKey: val });
        } catch (e) {}
        this.requestUpdate();
    }

    _handleProfileChange(e) {
        this.onProfileChange(e.target.value);
    }

    // ── Start ──

    _handleStart() {
        if (this.isInitializing) return;

        if (this._mode === 'cloud') {
            if (!this._token.trim()) {
                this._tokenError = true;
                this.requestUpdate();
                return;
            }
        } else if (this._mode === 'byok') {
            if (!this._geminiKey.trim()) {
                this._keyError = true;
                this.requestUpdate();
                return;
            }
        }

        this.onStart();
    }

    triggerApiKeyError() {
        if (this._mode === 'cloud') {
            this._tokenError = true;
        } else {
            this._keyError = true;
        }
        this.requestUpdate();
        setTimeout(() => {
            this._tokenError = false;
            this._keyError = false;
            this.requestUpdate();
        }, 2000);
    }

    // ── Render helpers ──

    _renderStartButton() {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const shortcut = isMac ? '⌘↵' : 'Ctrl+↵';

        return html`
            <button
                class="start-button ${this.isInitializing ? 'disabled' : ''}"
                @click=${() => this._handleStart()}
            >
                Start Session
                <span class="shortcut-hint">${shortcut}</span>
            </button>
        `;
    }

    _renderDivider() {
        return html`
            <div class="divider">
                <div class="divider-line"></div>
                <span class="divider-text">or</span>
                <div class="divider-line"></div>
            </div>
        `;
    }

    // ── Cloud mode ──

    _renderCloudMode() {
        return html`
            <div class="form-group">
                <label class="form-label">Token</label>
                <input
                    type="password"
                    placeholder="Enter your access token"
                    .value=${this._token}
                    @input=${e => this._saveToken(e.target.value)}
                    class=${this._tokenError ? 'error' : ''}
                />
                <div class="form-hint">
                    <span class="link" @click=${() => this.onExternalLink('https://cheatingdaddy.com/token')}>Get a token</span>
                </div>
            </div>

            ${this._renderStartButton()}
            ${this._renderDivider()}

            <div class="mode-links">
                <button class="mode-link" @click=${() => this._saveMode('byok')}>Use own API keys</button>
                <button class="mode-link" @click=${() => this._saveMode('local')}>Use local AI</button>
            </div>
        `;
    }

    // ── BYOK mode ──

    _renderByokMode() {
        return html`
            <div class="warning-banner">
                <div class="warning-text">Results may vary across providers. You manage your own billing.</div>
                <button class="switch-cloud-btn" @click=${() => this._saveMode('cloud')}>Switch to Cloud — it just works</button>
            </div>

            <div class="form-group">
                <label class="form-label">Gemini API Key</label>
                <input
                    type="password"
                    placeholder="Required"
                    .value=${this._geminiKey}
                    @input=${e => this._saveGeminiKey(e.target.value)}
                    class=${this._keyError ? 'error' : ''}
                />
                <div class="form-hint">
                    <span class="link" @click=${() => this.onExternalLink('https://aistudio.google.com/apikey')}>Get Gemini key</span>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Groq API Key</label>
                <input
                    type="password"
                    placeholder="Optional"
                    .value=${this._groqKey}
                    @input=${e => this._saveGroqKey(e.target.value)}
                />
                <div class="form-hint">
                    <span class="link" @click=${() => this.onExternalLink('https://console.groq.com/keys')}>Get Groq key</span>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">OpenAI API Key</label>
                <input
                    type="password"
                    placeholder="Optional"
                    .value=${this._openaiKey}
                    @input=${e => this._saveOpenaiKey(e.target.value)}
                />
            </div>

            ${this._renderStartButton()}
        `;
    }

    // ── Local AI mode ──

    _renderLocalMode() {
        return html`
            <div class="warning-banner">
                <div class="warning-text">Local models need decent hardware. Responses will be slower.</div>
                <button class="switch-cloud-btn" @click=${() => this._saveMode('cloud')}>Switch to Cloud — fast & reliable</button>
            </div>

            <div class="form-group">
                <label class="form-label">Model</label>
                <select>
                    <option value="" disabled selected>No local models available</option>
                </select>
                <div class="form-hint">Local model support coming soon.</div>
            </div>

            ${this._renderStartButton()}
        `;
    }

    // ── Main render ──

    render() {
        return html`
            <div class="form-wrapper">
                <div class="page-title">
                    ${this._mode === 'cloud' ? 'Start a session' : this._mode === 'byok' ? 'Own API keys' : 'Local AI'}
                </div>
                <div class="page-subtitle">
                    ${this._mode === 'cloud' ? 'Connect with your token to get started' : this._mode === 'byok' ? 'Bring your own API keys' : 'Run models locally on your machine'}
                </div>
                ${this._mode === 'cloud' ? this._renderCloudMode() : ''}
                ${this._mode === 'byok' ? this._renderByokMode() : ''}
                ${this._mode === 'local' ? this._renderLocalMode() : ''}
            </div>
        `;
    }
}

customElements.define('main-view', MainView);
