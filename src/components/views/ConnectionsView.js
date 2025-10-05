import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

// Static list of integrations from user-provided data
const INTEGRATIONS = [
    { logo: 'https://logos.composio.dev/api/trello', name: 'Trello', authConfigId: 'ac_2GM6bPzBIRbg', authType: 'OAUTH1', lastUpdated: 'Oct 4, 2025', status: 'ENABLED', connections: 0 },
    { logo: 'https://logos.composio.dev/api/googlecalendar', name: 'Google Calendar', authConfigId: 'ac_0neXn3m3-_Dm', authType: 'OAUTH2', lastUpdated: 'Oct 4, 2025', status: 'ENABLED', connections: 0 },
    { logo: 'https://logos.composio.dev/api/notion', name: 'Notion', authConfigId: 'ac_J-3lYoXZlArF', authType: 'OAUTH2', lastUpdated: 'Oct 4, 2025', status: 'ENABLED', connections: 0 },
    { logo: 'https://logos.composio.dev/api/linear', name: 'Linear', authConfigId: 'ac_C5mpd5r37bH4', authType: 'OAUTH2', lastUpdated: 'Oct 3, 2025', status: 'ENABLED', connections: 0 },
    { logo: 'https://logos.composio.dev/api/googledocs', name: 'Google Docs', authConfigId: 'ac_SMDf4M_jKYE1', authType: 'OAUTH2', lastUpdated: 'Oct 3, 2025', status: 'ENABLED', connections: 8 },
    { logo: 'https://logos.composio.dev/api/twitter', name: 'Twitter', authConfigId: 'ac_pTUxOmkyKFHJ', authType: 'OAUTH2', lastUpdated: 'Oct 3, 2025', status: 'ENABLED', connections: 2 },
    { logo: 'https://logos.composio.dev/api/googlesheets', name: 'Google Sheets', authConfigId: 'ac__DPVy8XWTDGX', authType: 'OAUTH2', lastUpdated: 'Oct 3, 2025', status: 'ENABLED', connections: 1 },
    { logo: 'https://cdn.jsdelivr.net/gh/ComposioHQ/open-logos@master/google-slides.svg', name: 'Google Slides', authConfigId: 'ac_b9UhoJR0WgT3', authType: 'OAUTH2', lastUpdated: 'Oct 3, 2025', status: 'ENABLED', connections: 1 },
    { logo: 'https://logos.composio.dev/api/github', name: 'GitHub', authConfigId: 'ac_b7RFgtr7s1Uf', authType: 'OAUTH2', lastUpdated: 'Oct 3, 2025', status: 'ENABLED', connections: 0 },
    { logo: 'https://logos.composio.dev/api/googledrive', name: 'Google Drive', authConfigId: 'ac_0yXGuyFmAacK', authType: 'OAUTH2', lastUpdated: 'Oct 3, 2025', status: 'ENABLED', connections: 1 },
    { logo: 'https://logos.composio.dev/api/linkedin', name: 'LinkedIn', authConfigId: 'ac_9NVcBfIIjuMU', authType: 'OAUTH2', lastUpdated: 'Oct 3, 2025', status: 'ENABLED', connections: 1 },
    { logo: 'https://logos.composio.dev/api/slack', name: 'Slack', authConfigId: 'ac_ohDLI9rewHgG', authType: 'OAUTH2', lastUpdated: 'Oct 3, 2025', status: 'ENABLED', connections: 4 },
    { logo: 'https://logos.composio.dev/api/gmail', name: 'Gmail', authConfigId: 'ac_AEOPhhO57Zsk', authType: 'OAUTH2', lastUpdated: 'Oct 1, 2025', status: 'ENABLED', connections: 7 },
];

export class ConnectionsView extends LitElement {
    static styles = css`
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; cursor: default; user-select: none; }
        :host { display: block; padding: 12px; margin: 0 auto; max-width: 900px; }

        .card { background: var(--card-background, rgba(255,255,255,0.04)); border: 1px solid var(--card-border, rgba(255,255,255,0.1)); border-radius: 6px; padding: 14px; backdrop-filter: blur(10px); }
        .title { display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; margin-bottom:10px; text-transform: uppercase; }
        .title::before { content:''; width:3px; height:14px; background: var(--accent-color, #007aff); border-radius: 2px; }

        .api-row { display:flex; gap:10px; align-items:center; margin-bottom:12px; }
        .api-row input { flex:1; }
        input[type=password] { background: rgba(0,0,0,0.3); color: var(--text-color); border: 1px solid rgba(255,255,255,0.15); padding: 8px 10px; border-radius: 4px; font-size: 12px; }
        .hint { font-size:11px; color: rgba(255,255,255,0.6); margin-top:6px; }

        .toolbar { display:flex; gap:8px; margin-bottom: 8px; }
        .home-btn { margin-left: auto; }
        
        .grid { margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
        .row { display:grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto auto; column-gap: 10px; row-gap: 6px; align-items:center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 8px; }
        .logo { width: 28px; height: 28px; border-radius: 6px; background: rgba(0,0,0,0.2); grid-row: 1 / span 2; }
        .name { font-weight: 700; font-size: 13px; }
        .meta { display:flex; gap:8px; font-size: 10px; color: rgba(255,255,255,0.7); grid-column: 2; flex-wrap: wrap; }
        .actions { display:flex; gap:8px; align-items:center; grid-column: 2; }
        .spacer { display:none; }

        .pill { font-size: 11px; padding: 2px 8px; border-radius: 999px; border:1px solid; }
        .ok { color:#34d399; border-color: rgba(52,211,153,0.3); background: rgba(52,211,153,0.12); }
        .fail { color:#f87171; border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.12); }
        .unknown { color:#f59e0b; border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.12); }

        button { background: rgba(255,255,255,0.1); color: var(--text-color); border: 1px solid rgba(255,255,255,0.15); padding: 6px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; }
        button:hover { background: rgba(255,255,255,0.15); }
        button[disabled] { opacity: 0.6; cursor: not-allowed; }
    `;

    static properties = {
        connecting: { type: Object },
        statuses: { type: Object },
        error: { type: String },
    };

    constructor() {
        super();
        this.connecting = {}; // authConfigId -> boolean
        this.statuses = {}; // authConfigId -> { state: 'connected'|'failed'|'unknown', accountId?: string }
        this.error = '';
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadStatusesFromStorage();
    }

    loadStatusesFromStorage() {
        try {
            const s = JSON.parse(localStorage.getItem('composio.connections') || '{}');
            this.statuses = s;
        } catch (_) {
            this.statuses = {};
        }
    }

    saveStatusesToStorage() {
        localStorage.setItem('composio.connections', JSON.stringify(this.statuses));
    }

    get apiKey() {
        return localStorage.getItem('composioApiKey') || '';
    }

    handleApiKeyInput(e) {
        localStorage.setItem('composioApiKey', e.target.value || '');
    }

    async ensureInitialized() {
        const apiKey = this.apiKey.trim();
        if (!apiKey) {
            this.error = 'Enter your Composio API key first.';
            this.requestUpdate();
            return false;
        }
        try {
            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            if (!ipcRenderer) {
                this.error = 'IPC unavailable in renderer.';
                return false;
            }
            const initResp = await ipcRenderer.invoke('initialize-composio', apiKey);
            if (!initResp?.success) {
                this.error = `Failed to initialize Composio: ${initResp?.error || 'unknown error'}`;
                return false;
            }
            this.error = '';
            return true;
        } catch (e) {
            this.error = e?.message || String(e);
            return false;
        }
    }

    async connectIntegration(intg) {
        if (this.connecting[intg.authConfigId]) return;
        if (!(await this.ensureInitialized())) return;

        const authConfigId = intg.authConfigId;
        this.connecting = { ...this.connecting, [authConfigId]: true };
        this.requestUpdate();
        try {
            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            const externalUserId = 'default-user';
            const start = await ipcRenderer.invoke('composio-start-connection', externalUserId, authConfigId, intg.name);
            if (!start?.success || !start?.redirectUrl) {
                this.statuses = { ...this.statuses, [authConfigId]: { state: 'failed' } };
                this.saveStatusesToStorage();
                this.connecting = { ...this.connecting, [authConfigId]: false };
                return;
            }
            await ipcRenderer.invoke('open-external', start.redirectUrl);
            // Poll for status
            const pollStart = Date.now();
            const timeoutMs = 5 * 60 * 1000;
            const poll = async () => {
                try {
                    const status = await ipcRenderer.invoke('composio-get-connection-status', externalUserId, authConfigId);
                    if (status?.success && status?.connectedAccount) {
                        this.statuses = { ...this.statuses, [authConfigId]: { state: 'connected', accountId: status.connectedAccount.id, ts: Date.now() } };
                        this.saveStatusesToStorage();
                        this.connecting = { ...this.connecting, [authConfigId]: false };
                        this.requestUpdate();
                        return;
                    }
                } catch (_) {}
                if (Date.now() - pollStart < timeoutMs && this.connecting[authConfigId]) {
                    setTimeout(poll, 2000);
                } else if (this.connecting[authConfigId]) {
                    this.statuses = { ...this.statuses, [authConfigId]: { state: 'failed' } };
                    this.saveStatusesToStorage();
                    this.connecting = { ...this.connecting, [authConfigId]: false };
                    this.requestUpdate();
                }
            };
            setTimeout(poll, 2000);
        } catch (e) {
            this.statuses = { ...this.statuses, [authConfigId]: { state: 'failed' } };
            this.saveStatusesToStorage();
            this.connecting = { ...this.connecting, [authConfigId]: false };
        }
    }

    async disconnectIntegration(intg) {
        const authConfigId = intg.authConfigId;
        try {
            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            const externalUserId = 'default-user';
            await ipcRenderer.invoke('composio-disconnect', externalUserId, authConfigId);
        } catch (_) {}
        const s = { ...this.statuses };
        delete s[authConfigId];
        this.statuses = s;
        this.saveStatusesToStorage();
        this.requestUpdate();
    }

    renderRow(intg) {
        const st = this.statuses[intg.authConfigId]?.state || 'unknown';
        const pillClass = st === 'connected' ? 'pill ok' : st === 'failed' ? 'pill fail' : 'pill unknown';
        const pillText = st === 'connected' ? 'Connected' : st === 'failed' ? 'Failed' : 'Not Connected';
        const isBusy = !!this.connecting[intg.authConfigId];
        return html`
            <div class="row">
                <img class="logo" src="${intg.logo}" alt="${intg.name}" />
                <div class="name">${intg.name}</div>
                <div class="meta">
                    <span>${intg.authType}</span>
                    <span>${intg.status}</span>
                    <span>${intg.lastUpdated}</span>
                </div>
                <div class="actions">
                    <span class="${pillClass}">${pillText}</span>
                    ${st === 'connected'
                        ? html`<button @click=${() => this.disconnectIntegration(intg)}>Disconnect</button>`
                        : html`<button @click=${() => this.connectIntegration(intg)} .disabled=${isBusy}>${isBusy ? 'Connecting…' : 'Connect'}</button>`}
                </div>
            </div>
        `;
    }

    render() {
        return html`
            <div class="card">
                <div class="title">Composio Integrations</div>
                <div class="toolbar">
                    <div class="api-row" style="flex:1;">
                        <input type="password" placeholder="Composio API Key" .value=${this.apiKey} @input=${e => this.handleApiKeyInput(e)} />
                        <button @click=${() => this.ensureInitialized()}>Initialize</button>
                    </div>
                    <button class="home-btn" @click=${() => this.dispatchEvent(new CustomEvent('navigate-home', { bubbles: true, composed: true }))}>Home</button>
                </div>
                ${this.error ? html`<div class="hint">${this.error}</div>` : ''}
                <div class="grid">
                    ${INTEGRATIONS.map(intg => this.renderRow(intg))}
                </div>
                <div class="hint">We remember connections locally so you won’t be asked twice.</div>
            </div>
        `;
    }
}

customElements.define('connections-view', ConnectionsView);
