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
];

export class ConnectionsView extends LitElement {
    static styles = css`
        * { 
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace; 
            cursor: default; 
            user-select: none;
            letter-spacing: -0.2px;
            font-feature-settings: "tnum", "zero";
        }
        :host { 
            display: block; 
            padding: 20px; 
            margin: 0 auto; 
            max-width: 900px; 
        }

        .card { 
            background: rgba(255, 255, 255, 0.03); 
            border: 0.5px solid rgba(255, 255, 255, 0.06); 
            border-radius: 16px; 
            padding: 16px; 
            backdrop-filter: blur(30px) saturate(120%);
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .title { 
            display: flex; 
            align-items: center; 
            gap: 8px; 
            font-size: 14px; 
            font-weight: 500; 
            margin-bottom: 16px; 
            color: rgba(255, 255, 255, 0.85);
        }
        .title::before { 
            content: ''; 
            width: 3px; 
            height: 16px; 
            background: rgba(0, 122, 255, 0.8); 
            border-radius: 1px; 
        }

        .api-row { 
            display: flex; 
            gap: 12px; 
            align-items: center; 
            margin-bottom: 16px; 
        }
        .api-row input { 
            flex: 1; 
        }
        input[type=password] { 
            background: rgba(255, 255, 255, 0.08); 
            color: rgba(255, 255, 255, 0.9); 
            border: 1px solid rgba(255, 255, 255, 0.12); 
            padding: 12px 16px; 
            border-radius: 12px; 
            font-size: 14px; 
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
        }
        input[type=password]:focus {
            outline: none;
            border-color: rgba(0, 122, 255, 0.5);
            background: rgba(255, 255, 255, 0.12);
            box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
        }
        .hint { 
            font-size: 12px; 
            color: rgba(255, 255, 255, 0.6); 
            margin-top: 8px; 
        }

        .toolbar { 
            display: flex; 
            gap: 12px; 
            margin-bottom: 16px; 
        }
        .home-btn { 
            margin-left: auto; 
        }
        
        .api-status {
            flex: 1;
            display: flex;
            align-items: center;
        }
        
        .status-indicator {
            font-size: 11px;
            font-weight: 400;
            padding: 4px 10px;
            border-radius: 6px;
            border: 0.5px solid;
            letter-spacing: 0.2px;
        }
        
        .status-indicator.success {
            color: #30D158;
            background: rgba(48, 209, 88, 0.05);
            border-color: rgba(48, 209, 88, 0.2);
        }
        
        .status-indicator.warning {
            color: #FF9500;
            background: rgba(255, 149, 0, 0.05);
            border-color: rgba(255, 149, 0, 0.2);
        }
        
        .grid { 
            margin-top: 20px; 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
            gap: 16px; 
        }
        .row { 
            display: grid; 
            grid-template-columns: auto 1fr; 
            grid-template-rows: auto auto auto; 
            column-gap: 12px; 
            row-gap: 6px; 
            align-items: center; 
            background: rgba(255, 255, 255, 0.02); 
            border: 0.5px solid rgba(255, 255, 255, 0.04); 
            padding: 12px; 
            border-radius: 10px; 
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(25px);
        }
        .row:hover {
            background: rgba(255, 255, 255, 0.03);
            border-color: rgba(255, 255, 255, 0.06);
            transform: translateY(-1px);
        }
        .logo { 
            width: 32px; 
            height: 32px; 
            border-radius: 8px; 
            background: rgba(0, 0, 0, 0.2); 
            grid-row: 1 / span 2; 
        }
        .name { 
            font-weight: 600; 
            font-size: 14px; 
            color: rgba(255, 255, 255, 0.9);
        }
        .meta { 
            display: flex; 
            gap: 8px; 
            font-size: 11px; 
            color: rgba(255, 255, 255, 0.6); 
            grid-column: 2; 
            flex-wrap: wrap; 
        }
        .actions { 
            display: flex; 
            gap: 12px; 
            align-items: center; 
            grid-column: 2; 
        }
        .spacer { 
            display: none; 
        }

        .pill { 
            font-size: 10px; 
            padding: 3px 8px; 
            border-radius: 8px; 
            border: 0.5px solid; 
            font-weight: 400;
            letter-spacing: 0.2px;
        }
        .ok { 
            color: #30D158; 
            border-color: rgba(48, 209, 88, 0.2); 
            background: rgba(48, 209, 88, 0.05); 
        }
        .fail { 
            color: #FF3B30; 
            border-color: rgba(255, 59, 48, 0.2); 
            background: rgba(255, 59, 48, 0.05); 
        }
        .unknown { 
            color: #FF9500; 
            border-color: rgba(255, 149, 0, 0.2); 
            background: rgba(255, 149, 0, 0.05); 
        }

        button { 
            background: rgba(255, 255, 255, 0.04); 
            color: rgba(255, 255, 255, 0.85); 
            border: 0.5px solid rgba(255, 255, 255, 0.08); 
            padding: 6px 12px; 
            border-radius: 8px; 
            font-size: 11px; 
            font-weight: 400; 
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(20px);
        }
        button:hover { 
            background: rgba(255, 255, 255, 0.06); 
            border-color: rgba(255, 255, 255, 0.12);
            transform: translateY(-1px);
        }
        button[disabled] { 
            opacity: 0.4; 
            cursor: not-allowed; 
            transform: none;
        }
    `;

    static properties = {
        connecting: { type: Object },
        statuses: { type: Object },
        error: { type: String },
        composioApiKey: { type: String },
    };

    constructor() {
        super();
        this.connecting = {}; // authConfigId -> boolean
        this.statuses = {}; // authConfigId -> { state: 'connected'|'failed'|'unknown', accountId?: string }
        this.error = '';
        this.composioApiKey = '';
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadStatusesFromStorage();
        this.loadComposioApiKey();
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

    async loadComposioApiKey() {
        try {
            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            if (ipcRenderer) {
                const result = await ipcRenderer.invoke('get-composio-api-key');
                if (result?.success && result.apiKey) {
                    this.composioApiKey = result.apiKey;
                    this.requestUpdate();
                }
            }
        } catch (error) {
            console.warn('Failed to load Composio API key from environment:', error);
        }
    }

    get apiKey() {
        return this.composioApiKey || localStorage.getItem('composioApiKey') || '';
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
                    <div class="api-status">
                        ${this.composioApiKey 
                            ? html`<div class="status-indicator success">✓ API Key loaded from environment</div>`
                            : html`<div class="status-indicator warning">⚠ No API key found in environment variables</div>`
                        }
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
