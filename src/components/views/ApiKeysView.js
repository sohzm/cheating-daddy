import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

export class ApiKeysView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .key-list {
                display: flex;
                flex-direction: column;
                gap: var(--space-sm);
            }

            .key-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 12px;
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                background: var(--bg-elevated);
                gap: var(--space-sm);
            }

            .key-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
                flex: 1;
                min-width: 0;
            }

            .key-masked {
                font-family: var(--font-mono);
                font-size: var(--font-size-xs);
                color: var(--text-secondary);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .key-label {
                font-size: var(--font-size-sm);
                color: var(--text-primary);
                font-weight: var(--font-weight-medium);
            }

            .key-meta {
                font-size: 10px;
                color: var(--text-muted);
            }

            .key-actions {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-shrink: 0;
            }

            .icon-btn {
                background: transparent;
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                padding: 5px 8px;
                font-size: var(--font-size-xs);
                cursor: pointer;
                transition: all var(--transition);
                white-space: nowrap;
            }

            .icon-btn:hover {
                border-color: var(--border-strong);
                color: var(--text-primary);
                background: var(--bg-hover);
            }

            .icon-btn.danger {
                color: var(--danger);
                border-color: var(--danger);
            }

            .icon-btn.danger:hover {
                background: rgba(239, 68, 68, 0.08);
            }

            .state-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 10px;
                font-weight: var(--font-weight-medium);
                padding: 2px 8px;
                border-radius: 999px;
                white-space: nowrap;
            }

            .state-badge.ready {
                color: var(--success);
                border: 1px solid var(--success);
            }

            .state-badge.exhausted {
                color: var(--warning);
                border: 1px solid var(--warning);
            }

            .state-badge.invalid {
                color: var(--danger);
                border: 1px solid var(--danger);
            }

            .state-badge.unknown {
                color: var(--text-muted);
                border: 1px solid var(--border);
            }

            .add-row {
                display: flex;
                gap: var(--space-sm);
                align-items: stretch;
            }

            .add-row input {
                flex: 1;
                background: var(--bg-elevated);
                color: var(--text-primary);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                padding: 8px 12px;
                font-size: var(--font-size-sm);
                font-family: var(--font-mono);
            }

            .add-row input:focus {
                outline: none;
                border-color: var(--accent);
            }

            .add-row input::placeholder {
                color: var(--text-muted);
            }

            .add-btn {
                background: var(--accent);
                color: var(--bg-app);
                border: none;
                border-radius: var(--radius-sm);
                padding: 8px 14px;
                font-size: var(--font-size-sm);
                font-weight: var(--font-weight-medium);
                cursor: pointer;
                white-space: nowrap;
                transition: opacity var(--transition);
            }

            .add-btn:hover {
                opacity: 0.85;
            }

            .add-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .empty-state {
                padding: var(--space-md);
                text-align: center;
                color: var(--text-muted);
                font-size: var(--font-size-sm);
            }

            .error-msg {
                color: var(--danger);
                font-size: var(--font-size-xs);
                margin-top: 4px;
            }

            .provider-section {
                margin-bottom: var(--space-md);
            }

            .provider-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: var(--space-sm);
            }

            .refresh-all-btn {
                background: transparent;
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                padding: 4px 10px;
                font-size: 10px;
                cursor: pointer;
                transition: all var(--transition);
            }

            .refresh-all-btn:hover {
                border-color: var(--accent);
                color: var(--accent);
            }
        `,
    ];

    static properties = {
        _geminiKeys: { state: true },
        _groqKeys: { state: true },
        _geminiInput: { state: true },
        _groqInput: { state: true },
        _geminiLabel: { state: true },
        _groqLabel: { state: true },
        _error: { state: true },
        _loading: { state: true },
    };

    constructor() {
        super();
        this._geminiKeys = [];
        this._groqKeys = [];
        this._geminiInput = '';
        this._groqInput = '';
        this._geminiLabel = '';
        this._groqLabel = '';
        this._error = '';
        this._loading = false;
        this._unsubscribe = null;
        this._loadKeys();
    }

    connectedCallback() {
        super.connectedCallback();
        this._unsubscribe = cheatingDaddy.apiKeys.onUpdated(payload => {
            if (payload.provider === 'gemini') this._geminiKeys = payload.keys;
            if (payload.provider === 'groq') this._groqKeys = payload.keys;
            this.requestUpdate();
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
    }

    async _loadKeys() {
        try {
            const all = await cheatingDaddy.apiKeys.listAll();
            this._geminiKeys = all.gemini || [];
            this._groqKeys = all.groq || [];
        } catch (e) {
            console.error('Failed to load API keys:', e);
        }
        this.requestUpdate();
    }

    async _addKey(provider) {
        const input = provider === 'gemini' ? this._geminiInput : this._groqInput;
        const label = provider === 'gemini' ? this._geminiLabel : this._groqLabel;
        if (!input.trim()) return;

        this._error = '';
        this._loading = true;
        this.requestUpdate();

        try {
            const result = await cheatingDaddy.apiKeys.add(provider, input.trim(), label.trim());
            if (!result.success) {
                this._error = result.error || 'Failed to add key';
            } else {
                if (provider === 'gemini') { this._geminiInput = ''; this._geminiLabel = ''; }
                else { this._groqInput = ''; this._groqLabel = ''; }
                await this._loadKeys();
            }
        } catch (e) {
            this._error = e.message || 'Unexpected error';
        }

        this._loading = false;
        this.requestUpdate();
    }

    async _removeKey(provider, id) {
        await cheatingDaddy.apiKeys.remove(provider, id);
        await this._loadKeys();
    }

    async _revalidateKey(provider, id) {
        await cheatingDaddy.apiKeys.revalidate(provider, id);
        await this._loadKeys();
    }

    async _revalidateAll(provider) {
        await cheatingDaddy.apiKeys.revalidateAll(provider);
        await this._loadKeys();
    }

    _formatDate(ts) {
        if (!ts) return 'never';
        const d = new Date(ts);
        return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    }

    _renderKeyList(provider, keys) {
        if (!keys || keys.length === 0) {
            return html`<div class="empty-state">No keys added yet</div>`;
        }

        return html`
            <div class="key-list">
                ${keys.map(k => html`
                    <div class="key-row">
                        <div class="key-info">
                            <div class="key-label">${k.label || 'Unnamed'}</div>
                            <div class="key-masked">${k.masked}</div>
                            <div class="key-meta">
                                Checked: ${this._formatDate(k.lastCheckedAt)}
                                ${k.errorReason ? html` — <span style="color:var(--danger)">${k.errorReason}</span>` : ''}
                            </div>
                        </div>
                        <span class="state-badge ${k.state}">${k.state}</span>
                        <div class="key-actions">
                            <button class="icon-btn" @click=${() => this._revalidateKey(provider, k.id)} title="Revalidate">Test</button>
                            <button class="icon-btn danger" @click=${() => this._removeKey(provider, k.id)} title="Remove">Del</button>
                        </div>
                    </div>
                `)}
            </div>
        `;
    }

    _renderAddForm(provider) {
        const input = provider === 'gemini' ? this._geminiInput : this._groqInput;
        const label = provider === 'gemini' ? this._geminiLabel : this._groqLabel;

        return html`
            <div class="add-row" style="margin-top:var(--space-sm);">
                <input
                    type="password"
                    placeholder="Paste API key..."
                    .value=${input}
                    @input=${e => {
                        if (provider === 'gemini') this._geminiInput = e.target.value;
                        else this._groqInput = e.target.value;
                    }}
                />
                <input
                    type="text"
                    placeholder="Label (optional)"
                    style="max-width:120px;font-family:var(--font);"
                    .value=${label}
                    @input=${e => {
                        if (provider === 'gemini') this._geminiLabel = e.target.value;
                        else this._groqLabel = e.target.value;
                    }}
                />
                <button class="add-btn" ?disabled=${this._loading || !input.trim()} @click=${() => this._addKey(provider)}>Add</button>
            </div>
        `;
    }

    render() {
        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div>
                        <div class="page-title">API Keys</div>
                        <div class="page-subtitle">Manage multiple keys per provider. Exhausted keys auto-recover after 24h.</div>
                    </div>

                    ${this._error ? html`<div class="error-msg">${this._error}</div>` : ''}

                    <section class="surface provider-section">
                        <div class="provider-header">
                            <div class="surface-title">Gemini</div>
                            <button class="refresh-all-btn" @click=${() => this._revalidateAll('gemini')}>Refresh all</button>
                        </div>
                        <div class="surface-subtitle">Used for live sessions, screen analysis, and Gemma text responses</div>
                        ${this._renderKeyList('gemini', this._geminiKeys)}
                        ${this._renderAddForm('gemini')}
                    </section>

                    <section class="surface provider-section">
                        <div class="provider-header">
                            <div class="surface-title">Groq</div>
                            <button class="refresh-all-btn" @click=${() => this._revalidateAll('groq')}>Refresh all</button>
                        </div>
                        <div class="surface-subtitle">Used for fast text completions (Qwen, GPT-OSS, Kimi)</div>
                        ${this._renderKeyList('groq', this._groqKeys)}
                        ${this._renderAddForm('groq')}
                    </section>
                </div>
            </div>
        `;
    }
}

customElements.define('api-keys-view', ApiKeysView);
