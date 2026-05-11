import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

export class ApiKeysView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .provider-section { margin-bottom: var(--space-lg); }
            .provider-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: var(--space-sm) 0; position: sticky; top: 0;
                background: var(--bg-surface); z-index: 2;
            }
            .provider-header-left { display: flex; align-items: center; gap: var(--space-sm); }
            .provider-count { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); }
            .search-input {
                width: 100%; background: var(--bg-elevated); color: var(--text-primary);
                border: 1px solid var(--border); border-radius: var(--radius-sm);
                padding: 6px 10px; font-size: var(--font-size-xs); margin-bottom: var(--space-sm);
            }
            .search-input:focus { outline: none; border-color: var(--accent); }
            .search-input::placeholder { color: var(--text-muted); }
            .key-table {
                display: flex; flex-direction: column; gap: 0;
                max-height: 400px; overflow-y: auto; scroll-behavior: smooth;
                border: 1px solid var(--border); border-radius: var(--radius-sm);
            }
            .key-row {
                display: grid; grid-template-columns: 10px 1fr 130px 60px 110px;
                align-items: center; gap: var(--space-sm); padding: 7px 10px;
                background: var(--bg-elevated); min-height: 38px;
                font-size: var(--font-size-xs); border-bottom: 1px solid var(--border);
            }
            .key-row:last-child { border-bottom: none; }
            .key-row:hover { background: var(--bg-hover); }
            .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
            .status-dot.ready { background: var(--success); }
            .status-dot.exhausted { background: var(--warning); }
            .status-dot.invalid { background: var(--danger); }
            .status-dot.unknown { background: var(--text-muted); }
            .key-identity { display: flex; flex-direction: column; gap: 1px; min-width: 0; overflow: hidden; }
            .key-name {
                font-size: var(--font-size-xs); color: var(--text-primary);
                font-weight: var(--font-weight-medium); white-space: nowrap;
                overflow: hidden; text-overflow: ellipsis;
            }
            .key-masked {
                font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .key-status { font-size: 10px; color: var(--text-secondary); white-space: nowrap; }
            .key-status.in-use { color: var(--success); font-weight: var(--font-weight-medium); }
            .key-status.countdown { color: var(--warning); font-family: var(--font-mono); }
            .key-status.error-text { color: var(--danger); }
            .key-state-label {
                font-size: 9px; font-weight: var(--font-weight-medium);
                padding: 2px 6px; border-radius: 999px; text-transform: uppercase;
                letter-spacing: 0.4px; white-space: nowrap; text-align: center;
            }
            .key-state-label.ready { color: var(--success); background: rgba(34,197,94,0.1); }
            .key-state-label.in-use { color: var(--success); background: rgba(34,197,94,0.15); font-weight: 600; }
            .key-state-label.exhausted { color: var(--warning); background: rgba(212,160,23,0.1); }
            .key-state-label.invalid { color: var(--danger); background: rgba(239,68,68,0.1); }
            .key-state-label.unknown { color: var(--text-muted); background: rgba(85,85,85,0.1); }
            .in-use-row { background: rgba(34,197,94,0.03); }
            .status-dot.pulse { animation: dotPulse 2s ease-in-out infinite; }
            @keyframes dotPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
            .edit-input {
                background: var(--bg-app); color: var(--text-primary); border: 1px solid var(--accent);
                border-radius: 3px; padding: 2px 6px; font-size: var(--font-size-xs); width: 100%;
                font-family: var(--font);
            }
            .edit-input:focus { outline: none; }
            .key-actions { display: flex; gap: 4px; justify-content: flex-end; }
            .sm-btn {
                background: transparent; border: 1px solid var(--border); border-radius: 3px;
                color: var(--text-secondary); padding: 2px 6px; font-size: 10px;
                cursor: pointer; transition: all var(--transition); white-space: nowrap;
            }
            .sm-btn:hover { border-color: var(--border-strong); color: var(--text-primary); background: var(--bg-hover); }
            .sm-btn.danger { color: var(--danger); border-color: rgba(239,68,68,0.3); }
            .sm-btn.danger:hover { background: rgba(239,68,68,0.08); }
            .add-row {
                display: flex; gap: var(--space-sm); margin-top: var(--space-sm); align-items: center;
            }
            .add-row input {
                flex: 1; background: var(--bg-elevated); color: var(--text-primary);
                border: 1px solid var(--border); border-radius: var(--radius-sm);
                padding: 6px 10px; font-size: var(--font-size-xs); font-family: var(--font-mono);
            }
            .add-row input:focus { outline: none; border-color: var(--accent); }
            .add-row input::placeholder { color: var(--text-muted); }
            .add-btn {
                background: var(--accent); color: var(--bg-app); border: none;
                border-radius: var(--radius-sm); padding: 6px 12px; font-size: var(--font-size-xs);
                font-weight: var(--font-weight-medium); cursor: pointer; white-space: nowrap;
            }
            .add-btn:hover { opacity: 0.85; }
            .add-btn:disabled { opacity: 0.4; cursor: not-allowed; }
            .refresh-btn {
                background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm);
                color: var(--text-secondary); padding: 3px 8px; font-size: 10px; cursor: pointer;
            }
            .refresh-btn:hover { border-color: var(--accent); color: var(--accent); }
            .empty-state { padding: var(--space-md); text-align: center; color: var(--text-muted); font-size: var(--font-size-xs); }
            .error-msg { color: var(--danger); font-size: var(--font-size-xs); padding: var(--space-xs) 0; }
            .notification {
                position: fixed; bottom: var(--space-lg); right: var(--space-lg);
                background: var(--bg-elevated); border: 1px solid var(--border);
                border-radius: var(--radius-md); padding: var(--space-sm) var(--space-md);
                font-size: var(--font-size-xs); color: var(--text-secondary);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000;
                animation: slideIn 0.3s ease;
            }
            @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `,
    ];

    static properties = {
        _geminiKeys: { state: true },
        _groqKeys: { state: true },
        _geminiInput: { state: true },
        _groqInput: { state: true },
        _geminiLabel: { state: true },
        _groqLabel: { state: true },
        _geminiFilter: { state: true },
        _groqFilter: { state: true },
        _error: { state: true },
        _loading: { state: true },
        _notification: { state: true },
        _now: { state: true },
        _editingId: { state: true },
        _editingProvider: { state: true },
        _editLabel: { state: true },
    };

    constructor() {
        super();
        this._geminiKeys = [];
        this._groqKeys = [];
        this._geminiInput = '';
        this._groqInput = '';
        this._geminiLabel = '';
        this._groqLabel = '';
        this._geminiFilter = '';
        this._groqFilter = '';
        this._error = '';
        this._loading = false;
        this._notification = null;
        this._now = Date.now();
        this._editingId = null;
        this._editingProvider = null;
        this._editLabel = '';
        this._unsubscribe = null;
        this._rotationListener = null;
        this._countdownInterval = null;
        this._loadKeys();
    }

    connectedCallback() {
        super.connectedCallback();
        this._unsubscribe = cheatingDaddy.apiKeys.onUpdated(payload => {
            if (payload.provider === 'gemini') this._geminiKeys = payload.keys;
            if (payload.provider === 'groq') this._groqKeys = payload.keys;
            this.requestUpdate();
        });
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            this._rotationListener = (_event, payload) => {
                this._showNotification(`${payload.provider}: switched from "${payload.from.label}" to "${payload.to.label}"`);
            };
            ipcRenderer.on('api-keys:rotated', this._rotationListener);
        }
        this._countdownInterval = setInterval(() => {
            this._now = Date.now();
            this.requestUpdate();
        }, 1000);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._unsubscribe) { this._unsubscribe(); this._unsubscribe = null; }
        if (this._rotationListener && window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeListener('api-keys:rotated', this._rotationListener);
        }
        if (this._countdownInterval) { clearInterval(this._countdownInterval); this._countdownInterval = null; }
    }

    _showNotification(msg) {
        this._notification = msg;
        this.requestUpdate();
        setTimeout(() => { this._notification = null; this.requestUpdate(); }, 4000);
    }

    async _loadKeys() {
        try {
            const all = await cheatingDaddy.apiKeys.listAll();
            this._geminiKeys = all.gemini || [];
            this._groqKeys = all.groq || [];
        } catch (e) { console.error('Failed to load API keys:', e); }
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
            if (!result.success) { this._error = result.error || 'Failed to add key'; }
            else {
                if (provider === 'gemini') { this._geminiInput = ''; this._geminiLabel = ''; }
                else { this._groqInput = ''; this._groqLabel = ''; }
                await this._loadKeys();
            }
        } catch (e) { this._error = e.message || 'Unexpected error'; }
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

    _formatCountdown(exhaustedUntil) {
        if (!exhaustedUntil) return '';
        const remaining = exhaustedUntil - this._now;
        if (remaining <= 0) return 'Retrying...';
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    _filterKeys(keys, filter) {
        if (!filter.trim()) return keys;
        const q = filter.toLowerCase();
        return keys.filter(k =>
            (k.label || '').toLowerCase().includes(q) ||
            (k.masked || '').toLowerCase().includes(q) ||
            (k.state || '').includes(q)
        );
    }

    _sortKeys(keys) {
        const order = { ready: 0, unknown: 1, exhausted: 2, invalid: 3 };
        return [...keys].sort((a, b) => (order[a.state] ?? 9) - (order[b.state] ?? 9));
    }

    _getStatusText(k, isFirstReady) {
        if (k.state === 'exhausted' && k.exhaustedUntil) {
            return { text: `Retry in: ${this._formatCountdown(k.exhaustedUntil)}`, cls: 'countdown' };
        }
        if (k.state === 'invalid') {
            return { text: k.errorReason || 'Invalid key', cls: 'error-text' };
        }
        if (k.state === 'ready' && isFirstReady) {
            return { text: 'In Use', cls: 'in-use' };
        }
        if (k.state === 'ready') {
            return { text: 'Standby', cls: '' };
        }
        if (k.state === 'unknown') {
            return { text: 'Validating...', cls: '' };
        }
        return { text: '', cls: '' };
    }

    _startEdit(provider, k) {
        this._editingId = k.id;
        this._editingProvider = provider;
        this._editLabel = k.label || '';
        this.requestUpdate();
    }

    _cancelEdit() {
        this._editingId = null;
        this._editingProvider = null;
        this._editLabel = '';
        this.requestUpdate();
    }

    async _saveEdit(provider, id) {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('api-keys:update-label', provider, id, this._editLabel);
        }
        this._editingId = null;
        this._editingProvider = null;
        this._editLabel = '';
        await this._loadKeys();
    }

    _renderKeyTable(provider, keys, filter) {
        const filtered = this._filterKeys(keys, filter);
        const sorted = this._sortKeys(filtered);

        if (sorted.length === 0) {
            return html`<div class="empty-state">${keys.length === 0 ? 'No keys added yet' : 'No keys match filter'}</div>`;
        }

        // Find the first ready key — that's the "in use" one
        let firstReadyFound = false;

        return html`
            <div class="key-table">
                ${sorted.map(k => {
                    const isFirstReady = (k.state === 'ready' || k.state === 'unknown') && !firstReadyFound;
                    if (isFirstReady) firstReadyFound = true;
                    const status = this._getStatusText(k, isFirstReady);
                    const isEditing = this._editingId === k.id && this._editingProvider === provider;

                    return html`
                    <div class="key-row ${isFirstReady ? 'in-use-row' : ''}">
                        <div class="status-dot ${k.state} ${isFirstReady ? 'pulse' : ''}"></div>
                        <div class="key-identity">
                            ${isEditing ? html`
                                <input class="edit-input" type="text" .value=${this._editLabel}
                                    @input=${e => { this._editLabel = e.target.value; }}
                                    @keydown=${e => { if (e.key === 'Enter') this._saveEdit(provider, k.id); if (e.key === 'Escape') this._cancelEdit(); }}
                                    autofocus
                                />
                            ` : html`
                                <div class="key-name">${k.label || 'Unnamed'}</div>
                            `}
                            <div class="key-masked">${k.masked}</div>
                        </div>
                        <div class="key-status ${status.cls}">${status.text}</div>
                        <span class="key-state-label ${k.state}">${isFirstReady ? 'in use' : k.state}</span>
                        <div class="key-actions">
                            ${isEditing ? html`
                                <button class="sm-btn" @click=${() => this._saveEdit(provider, k.id)}>Save</button>
                                <button class="sm-btn" @click=${() => this._cancelEdit()}>X</button>
                            ` : html`
                                <button class="sm-btn" @click=${() => this._startEdit(provider, k)} title="Edit">&#9998;</button>
                                <button class="sm-btn" @click=${() => this._revalidateKey(provider, k.id)} title="Test">Test</button>
                                <button class="sm-btn danger" @click=${() => this._removeKey(provider, k.id)} title="Remove">Del</button>
                            `}
                        </div>
                    </div>
                `})}
            </div>
        `;
    }

    _renderProvider(provider, keys, filter, input, label) {
        const readyCount = keys.filter(k => k.state === 'ready').length;
        const exhaustedCount = keys.filter(k => k.state === 'exhausted').length;
        const invalidCount = keys.filter(k => k.state === 'invalid').length;

        return html`
            <section class="surface provider-section">
                <div class="provider-header">
                    <div class="provider-header-left">
                        <div class="surface-title">${provider === 'gemini' ? 'Gemini' : 'Groq'}</div>
                        <span class="provider-count">${readyCount} ready / ${exhaustedCount} exhausted / ${invalidCount} invalid / ${keys.length} total</span>
                    </div>
                    <button class="refresh-btn" @click=${() => this._revalidateAll(provider)}>Refresh all</button>
                </div>
                ${keys.length > 5 ? html`
                    <input class="search-input" type="text" placeholder="Filter keys..."
                        .value=${filter}
                        @input=${e => { if (provider === 'gemini') this._geminiFilter = e.target.value; else this._groqFilter = e.target.value; }}
                    />
                ` : ''}
                ${this._renderKeyTable(provider, keys, filter)}
                <div class="add-row">
                    <input type="password" placeholder="Paste API key..."
                        .value=${input}
                        @input=${e => { if (provider === 'gemini') this._geminiInput = e.target.value; else this._groqInput = e.target.value; }}
                    />
                    <input type="text" placeholder="Label" style="max-width:100px;font-family:var(--font);"
                        .value=${label}
                        @input=${e => { if (provider === 'gemini') this._geminiLabel = e.target.value; else this._groqLabel = e.target.value; }}
                    />
                    <button class="add-btn" ?disabled=${this._loading || !input.trim()} @click=${() => this._addKey(provider)}>Add</button>
                </div>
            </section>
        `;
    }

    render() {
        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div>
                        <div class="page-title">API Keys</div>
                        <div class="page-subtitle">Manage multiple keys per provider. Exhausted keys auto-recover after 24h cooldown.</div>
                    </div>
                    ${this._error ? html`<div class="error-msg">${this._error}</div>` : ''}
                    ${this._renderProvider('gemini', this._geminiKeys, this._geminiFilter, this._geminiInput, this._geminiLabel)}
                    ${this._renderProvider('groq', this._groqKeys, this._groqFilter, this._groqInput, this._groqLabel)}
                </div>
            </div>
            ${this._notification ? html`<div class="notification">${this._notification}</div>` : ''}
        `;
    }
}

customElements.define('api-keys-view', ApiKeysView);
