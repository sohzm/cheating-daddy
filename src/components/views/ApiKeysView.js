import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

// State display config
const STATE_CONFIG = {
    ready:     { dot: '#22C55E', badge: 'rgba(34,197,94,0.12)',  text: '#22C55E', label: 'READY'     },
    checking:  { dot: '#3B82F6', badge: 'rgba(59,130,246,0.12)', text: '#3B82F6', label: 'CHECKING'  },
    exhausted: { dot: '#D4A017', badge: 'rgba(212,160,23,0.12)', text: '#D4A017', label: 'EXHAUSTED' },
    invalid:   { dot: '#EF4444', badge: 'rgba(239,68,68,0.12)',  text: '#EF4444', label: 'INVALID'   },
    unknown:   { dot: '#555',    badge: 'rgba(85,85,85,0.12)',   text: '#777',    label: 'UNKNOWN'   },
};

export class ApiKeysView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            /* ── Layout ── */
            .provider-block { margin-bottom: var(--space-lg); }

            .prov-header {
                display: flex; align-items: center; justify-content: space-between;
                margin-bottom: var(--space-sm);
            }
            .prov-title { font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); color: var(--text-primary); }

            /* ── Tab filter bar ── */
            .tab-bar {
                display: flex; gap: 6px; margin-bottom: var(--space-sm);
                flex-wrap: wrap;
            }
            .tab-btn {
                display: inline-flex; align-items: center; gap: 5px;
                background: var(--bg-elevated); border: 1px solid var(--border);
                border-radius: var(--radius-sm); padding: 4px 10px; font-size: 11px;
                color: var(--text-secondary); cursor: pointer; transition: all var(--transition);
                white-space: nowrap;
            }
            .tab-btn:hover { border-color: var(--border-strong); color: var(--text-primary); }
            .tab-btn.active { border-color: var(--accent); color: var(--text-primary); background: rgba(59,130,246,0.08); }
            .tab-count {
                display: inline-flex; align-items: center; justify-content: center;
                background: var(--bg-hover); border-radius: 999px;
                min-width: 18px; height: 16px; padding: 0 4px;
                font-size: 10px; font-family: var(--font-mono);
            }
            .tab-btn.active .tab-count { background: var(--accent); color: var(--bg-app); }

            /* ── Key table ── */
            .key-table {
                border: 1px solid var(--border); border-radius: var(--radius-sm);
                overflow: hidden; max-height: 340px; overflow-y: auto; scroll-behavior: smooth;
            }
            .key-row {
                display: grid; grid-template-columns: 8px 1fr 140px 64px 106px;
                align-items: center; gap: 8px; padding: 7px 10px;
                background: var(--bg-elevated); border-bottom: 1px solid var(--border);
                min-height: 36px; font-size: 11px;
            }
            .key-row:last-child { border-bottom: none; }
            .key-row:hover { background: var(--bg-hover); }
            .key-row.in-use { background: rgba(34,197,94,0.04); }

            /* ── Status dot ── */
            .dot {
                width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
                transition: background var(--transition);
            }
            .dot.pulse { animation: blink 1.8s ease-in-out infinite; }
            @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

            /* ── Key identity ── */
            .key-id { display: flex; flex-direction: column; gap: 1px; min-width: 0; overflow: hidden; }
            .key-name {
                font-size: 11px; font-weight: var(--font-weight-medium); color: var(--text-primary);
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .key-mask {
                font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .edit-input {
                background: var(--bg-app); color: var(--text-primary);
                border: 1px solid var(--accent); border-radius: 3px;
                padding: 1px 5px; font-size: 11px; width: 100%; font-family: var(--font);
            }
            .edit-input:focus { outline: none; }

            /* ── Status cell ── */
            .key-status { font-size: 10px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .key-status.in-use  { color: #22C55E; font-weight: 600; }
            .key-status.countdown { font-family: var(--font-mono); color: #D4A017; }
            .key-status.err { color: #EF4444; }

            /* ── Badge ── */
            .badge {
                font-size: 9px; font-weight: 600; padding: 1px 6px;
                border-radius: 999px; text-align: center; white-space: nowrap;
                letter-spacing: 0.3px; text-transform: uppercase;
            }

            /* ── Actions ── */
            .actions { display: flex; gap: 3px; justify-content: flex-end; }
            .btn {
                background: transparent; border: 1px solid var(--border); border-radius: 3px;
                color: var(--text-secondary); padding: 2px 5px; font-size: 10px;
                cursor: pointer; transition: all var(--transition); white-space: nowrap;
            }
            .btn:hover { border-color: var(--border-strong); color: var(--text-primary); background: var(--bg-hover); }
            .btn.del { color: var(--danger); border-color: rgba(239,68,68,0.25); }
            .btn.del:hover { background: rgba(239,68,68,0.08); }

            /* ── Add row ── */
            .add-row {
                display: flex; gap: 6px; margin-top: var(--space-sm); align-items: center;
            }
            .add-row input {
                flex: 1; background: var(--bg-elevated); color: var(--text-primary);
                border: 1px solid var(--border); border-radius: var(--radius-sm);
                padding: 5px 9px; font-size: 11px; font-family: var(--font-mono);
            }
            .add-row input:focus { outline: none; border-color: var(--accent); }
            .add-row input::placeholder { color: var(--text-muted); font-family: var(--font); }
            .add-btn {
                background: var(--accent); color: var(--bg-app); border: none;
                border-radius: var(--radius-sm); padding: 5px 12px; font-size: 11px;
                font-weight: var(--font-weight-medium); cursor: pointer; white-space: nowrap;
            }
            .add-btn:hover { opacity: 0.85; }
            .add-btn:disabled { opacity: 0.4; cursor: not-allowed; }

            /* ── Misc ── */
            .empty { padding: 18px; text-align: center; color: var(--text-muted); font-size: 11px; }
            .err-msg { color: var(--danger); font-size: 11px; padding: 4px 0; }
            .refresh-btn {
                background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm);
                color: var(--text-secondary); padding: 3px 8px; font-size: 10px; cursor: pointer;
            }
            .refresh-btn:hover { border-color: var(--accent); color: var(--accent); }

            /* ── Toast ── */
            .toast {
                position: fixed; bottom: 24px; right: 24px;
                background: var(--bg-elevated); border: 1px solid var(--border);
                border-radius: var(--radius-md); padding: 8px 14px;
                font-size: 11px; color: var(--text-secondary);
                box-shadow: 0 4px 16px rgba(0,0,0,0.35); z-index: 9999;
                animation: toastIn 0.25s ease;
            }
            @keyframes toastIn { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `,
    ];

    static properties = {
        _geminiKeys:  { state: true },
        _groqKeys:    { state: true },
        _geminiTab:   { state: true }, // 'all' | 'ready' | 'exhausted' | 'invalid' | 'checking'
        _groqTab:     { state: true },
        _geminiInput: { state: true },
        _geminiLabel: { state: true },
        _groqInput:   { state: true },
        _groqLabel:   { state: true },
        _error:       { state: true },
        _loading:     { state: true },
        _toast:       { state: true },
        _now:         { state: true },
        _editId:      { state: true },
        _editProv:    { state: true },
        _editLabel:   { state: true },
    };

    constructor() {
        super();
        this._geminiKeys  = [];
        this._groqKeys    = [];
        this._geminiTab   = 'all';
        this._groqTab     = 'all';
        this._geminiInput = '';
        this._geminiLabel = '';
        this._groqInput   = '';
        this._groqLabel   = '';
        this._error       = '';
        this._loading     = false;
        this._toast       = null;
        this._now         = Date.now();
        this._editId      = null;
        this._editProv    = null;
        this._editLabel   = '';
        this._unsub       = null;
        this._rotLis      = null;
        this._tick        = null;
        this._loadKeys();
    }

    connectedCallback() {
        super.connectedCallback();
        this._unsub = cheatingDaddy.apiKeys.onUpdated(({ provider, keys }) => {
            if (provider === 'gemini') this._geminiKeys = keys;
            if (provider === 'groq')   this._groqKeys   = keys;
            this.requestUpdate();
        });
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            this._rotLis = (_e, p) =>
                this._showToast(`${p.provider}: switched from "${p.from.label}" → "${p.to.label}"`);
            ipcRenderer.on('api-keys:rotated', this._rotLis);
        }
        this._tick = setInterval(() => { this._now = Date.now(); this.requestUpdate(); }, 1000);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsub?.();
        if (this._rotLis && window.require)
            window.require('electron').ipcRenderer.removeListener('api-keys:rotated', this._rotLis);
        if (this._tick) clearInterval(this._tick);
    }

    _showToast(msg) {
        this._toast = msg;
        this.requestUpdate();
        setTimeout(() => { this._toast = null; this.requestUpdate(); }, 4000);
    }

    async _loadKeys() {
        try {
            const all = await cheatingDaddy.apiKeys.listAll();
            this._geminiKeys = all.gemini || [];
            this._groqKeys   = all.groq   || [];
        } catch (e) { console.error('Failed to load API keys:', e); }
        this.requestUpdate();
    }

    async _addKey(prov) {
        const input = prov === 'gemini' ? this._geminiInput : this._groqInput;
        const label = prov === 'gemini' ? this._geminiLabel : this._groqLabel;
        if (!input.trim()) return;
        this._error = '';
        this._loading = true;
        this.requestUpdate();
        try {
            const r = await cheatingDaddy.apiKeys.add(prov, input.trim(), label.trim());
            if (!r.success) { this._error = r.error || 'Failed to add key'; }
            else {
                if (prov === 'gemini') { this._geminiInput = ''; this._geminiLabel = ''; }
                else                   { this._groqInput   = ''; this._groqLabel   = ''; }
                await this._loadKeys();
            }
        } catch (e) { this._error = e.message || 'Unexpected error'; }
        this._loading = false;
        this.requestUpdate();
    }

    async _remove(prov, id)     { await cheatingDaddy.apiKeys.remove(prov, id);     await this._loadKeys(); }
    async _test(prov, id)       { await cheatingDaddy.apiKeys.revalidate(prov, id); await this._loadKeys(); }
    async _testAll(prov)        { await cheatingDaddy.apiKeys.revalidateAll(prov);  await this._loadKeys(); }

    _startEdit(prov, k)  { this._editId = k.id; this._editProv = prov; this._editLabel = k.label || ''; this.requestUpdate(); }
    _cancelEdit()        { this._editId = null; this._editProv = null; this._editLabel = ''; this.requestUpdate(); }
    async _saveEdit(prov, id) {
        if (window.require)
            await window.require('electron').ipcRenderer.invoke('api-keys:update-label', prov, id, this._editLabel);
        this._cancelEdit();
        await this._loadKeys();
    }

    _countdown(until) {
        const r = until - this._now;
        if (r <= 0) return 'Retry soon…';
        const h = Math.floor(r / 3600000);
        const m = Math.floor((r % 3600000) / 60000);
        const s = Math.floor((r % 60000) / 1000);
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    _counts(keys) {
        return {
            all:       keys.length,
            ready:     keys.filter(k => k.state === 'ready').length,
            checking:  keys.filter(k => k.state === 'checking' || k.state === 'unknown').length,
            exhausted: keys.filter(k => k.state === 'exhausted').length,
            invalid:   keys.filter(k => k.state === 'invalid').length,
        };
    }

    _filterKeys(keys, tab) {
        if (tab === 'all')       return keys;
        if (tab === 'ready')     return keys.filter(k => k.state === 'ready');
        if (tab === 'checking')  return keys.filter(k => k.state === 'checking' || k.state === 'unknown');
        if (tab === 'exhausted') return keys.filter(k => k.state === 'exhausted');
        if (tab === 'invalid')   return keys.filter(k => k.state === 'invalid');
        return keys;
    }

    _sortKeys(keys) {
        const order = { ready: 0, checking: 1, unknown: 1, exhausted: 2, invalid: 3 };
        return [...keys].sort((a, b) => (order[a.state] ?? 9) - (order[b.state] ?? 9));
    }

    _renderRow(prov, k, isInUse) {
        const cfg = STATE_CONFIG[k.state] || STATE_CONFIG.unknown;
        const isEditing = this._editId === k.id && this._editProv === prov;

        let statusText = '';
        let statusCls = '';
        if (isInUse) {
            statusText = 'In Use'; statusCls = 'in-use';
        } else if (k.state === 'exhausted' && k.exhaustedUntil) {
            statusText = `Retry in: ${this._countdown(k.exhaustedUntil)}`; statusCls = 'countdown';
        } else if (k.state === 'invalid') {
            statusText = k.errorReason ? k.errorReason.slice(0, 30) : 'Invalid'; statusCls = 'err';
        } else if (k.state === 'checking' || k.state === 'unknown') {
            statusText = 'Validating…';
        } else if (k.state === 'ready') {
            statusText = 'Standby';
        }

        const badgeLabel = isInUse ? 'IN USE' : cfg.label;

        return html`
            <div class="key-row ${isInUse ? 'in-use' : ''}">
                <div class="dot ${isInUse ? 'pulse' : ''}" style="background:${cfg.dot}"></div>
                <div class="key-id">
                    ${isEditing ? html`
                        <input class="edit-input" type="text" .value=${this._editLabel}
                            @input=${e => { this._editLabel = e.target.value; }}
                            @keydown=${e => { if (e.key === 'Enter') this._saveEdit(prov, k.id); if (e.key === 'Escape') this._cancelEdit(); }}
                            autofocus />
                    ` : html`<div class="key-name">${k.label || 'Unnamed'}</div>`}
                    <div class="key-mask">${k.masked}</div>
                </div>
                <div class="key-status ${statusCls}">${statusText}</div>
                <div class="badge" style="color:${cfg.text};background:${cfg.badge}">${badgeLabel}</div>
                <div class="actions">
                    ${isEditing ? html`
                        <button class="btn" @click=${() => this._saveEdit(prov, k.id)}>Save</button>
                        <button class="btn" @click=${() => this._cancelEdit()}>✕</button>
                    ` : html`
                        <button class="btn" @click=${() => this._startEdit(prov, k)} title="Edit name">✎</button>
                        <button class="btn" @click=${() => this._test(prov, k.id)} title="Revalidate">Test</button>
                        <button class="btn del" @click=${() => this._remove(prov, k.id)} title="Remove">Del</button>
                    `}
                </div>
            </div>
        `;
    }

    _renderProvider(prov, keys, tab, input, label) {
        const counts = this._counts(keys);
        const filtered = this._sortKeys(this._filterKeys(keys, tab));
        // The "in use" key is strictly the first ready key
        const firstReadyId = keys.find(k => k.state === 'ready')?.id || null;

        const tabs = [
            { id: 'all',       label: 'All',       count: counts.all       },
            { id: 'ready',     label: 'Ready',     count: counts.ready     },
            { id: 'checking',  label: 'Checking',  count: counts.checking  },
            { id: 'exhausted', label: 'Exhausted', count: counts.exhausted },
            { id: 'invalid',   label: 'Invalid',   count: counts.invalid   },
        ];

        return html`
            <section class="surface provider-block">
                <div class="prov-header">
                    <span class="prov-title">${prov === 'gemini' ? 'Gemini' : 'Groq'}</span>
                    <button class="refresh-btn" @click=${() => this._testAll(prov)}>Refresh all</button>
                </div>

                <!-- Tab filter buttons -->
                <div class="tab-bar">
                    ${tabs.map(t => html`
                        <button class="tab-btn ${tab === t.id ? 'active' : ''}"
                            @click=${() => { if (prov === 'gemini') this._geminiTab = t.id; else this._groqTab = t.id; }}>
                            ${t.label}
                            <span class="tab-count">${t.count}</span>
                        </button>
                    `)}
                </div>

                <!-- Key list -->
                ${filtered.length === 0 ? html`
                    <div class="empty">${keys.length === 0 ? 'No keys added yet' : 'No keys in this group'}</div>
                ` : html`
                    <div class="key-table">
                        ${filtered.map(k => this._renderRow(prov, k, k.id === firstReadyId))}
                    </div>
                `}

                <!-- Add new key -->
                <div class="add-row" style="margin-top:var(--space-sm);">
                    <input type="password" placeholder="Paste API key…"
                        .value=${input}
                        @input=${e => { if (prov === 'gemini') this._geminiInput = e.target.value; else this._groqInput = e.target.value; }} />
                    <input type="text" placeholder="Label" style="max-width:100px;font-family:var(--font);"
                        .value=${label}
                        @input=${e => { if (prov === 'gemini') this._geminiLabel = e.target.value; else this._groqLabel = e.target.value; }} />
                    <button class="add-btn" ?disabled=${this._loading || !input.trim()} @click=${() => this._addKey(prov)}>Add</button>
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
                    ${this._error ? html`<div class="err-msg">${this._error}</div>` : ''}
                    ${this._renderProvider('gemini', this._geminiKeys, this._geminiTab, this._geminiInput, this._geminiLabel)}
                    ${this._renderProvider('groq',   this._groqKeys,   this._groqTab,   this._groqInput,   this._groqLabel)}
                </div>
            </div>
            ${this._toast ? html`<div class="toast">${this._toast}</div>` : ''}
        `;
    }
}

customElements.define('api-keys-view', ApiKeysView);
