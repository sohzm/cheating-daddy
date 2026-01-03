import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

/**
 * MacPermissionsSetup - A helper component for Mac users to grant permissions
 * Shows permission status and provides one-click access to System Preferences
 */
export class MacPermissionsSetup extends LitElement {
    static styles = css`
        :host {
            display: block;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .permissions-container {
            background: var(--bg-secondary, #1e1e1e);
            border: 1px solid var(--border-color, #3a3a3a);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
        }

        .permissions-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
        }

        .permissions-header svg {
            width: 20px;
            height: 20px;
            color: var(--accent-color, #00e6cc);
        }

        .permissions-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-color, #e0e0e0);
        }

        .permission-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid var(--border-color, #3a3a3a);
        }

        .permission-row:last-child {
            border-bottom: none;
        }

        .permission-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .permission-name {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-color, #e0e0e0);
        }

        .permission-desc {
            font-size: 11px;
            color: var(--text-muted, #888);
        }

        .permission-status {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
        }

        .status-granted {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }

        .status-denied {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }

        .status-unknown {
            background: rgba(234, 179, 8, 0.2);
            color: #eab308;
        }

        .grant-button {
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .grant-button.request {
            background: var(--accent-color, #00e6cc);
            color: #000;
        }

        .grant-button.request:hover {
            opacity: 0.9;
        }

        .grant-button.open-settings {
            background: var(--btn-secondary-bg, #333);
            color: var(--text-color, #e0e0e0);
            border: 1px solid var(--border-color, #3a3a3a);
        }

        .grant-button.open-settings:hover {
            background: var(--hover-background, #444);
        }

        .all-granted {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px;
            background: rgba(34, 197, 94, 0.1);
            border-radius: 6px;
            color: #22c55e;
            font-size: 13px;
        }

        .all-granted svg {
            width: 18px;
            height: 18px;
        }

        .refresh-button {
            margin-top: 12px;
            padding: 8px 16px;
            background: transparent;
            border: 1px solid var(--border-color, #3a3a3a);
            border-radius: 4px;
            color: var(--text-secondary, #aaa);
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .refresh-button:hover {
            background: var(--hover-background, #333);
            color: var(--text-color, #e0e0e0);
        }

        .not-mac {
            padding: 12px;
            background: rgba(59, 130, 246, 0.1);
            border-radius: 6px;
            color: #3b82f6;
            font-size: 12px;
        }
    `;

    static properties = {
        permissions: { type: Object },
        loading: { type: Boolean },
    };

    constructor() {
        super();
        this.permissions = null;
        this.loading = true;
    }

    connectedCallback() {
        super.connectedCallback();
        this.checkPermissions();
    }

    async checkPermissions() {
        this.loading = true;
        try {
            if (window.electronAPI?.permissions?.getAll) {
                this.permissions = await window.electronAPI.permissions.getAll();
            }
        } catch (error) {
            console.error('Error checking permissions:', error);
        }
        this.loading = false;
    }

    async requestMicrophone() {
        try {
            await window.electronAPI.permissions.request('microphone');
            // Wait a moment for OS to update
            setTimeout(() => this.checkPermissions(), 500);
        } catch (error) {
            console.error('Error requesting microphone:', error);
        }
    }

    async openSettings(pane) {
        try {
            await window.electronAPI.permissions.openSystemPreferences(pane);
        } catch (error) {
            console.error('Error opening System Preferences:', error);
        }
    }

    getStatusBadge(status) {
        if (status === 'granted') {
            return html`<span class="status-badge status-granted">✓ Granted</span>`;
        } else if (status === 'denied') {
            return html`<span class="status-badge status-denied">✗ Denied</span>`;
        } else {
            return html`<span class="status-badge status-unknown">? Not Set</span>`;
        }
    }

    render() {
        if (this.loading) {
            return html`<div class="permissions-container">Loading permissions...</div>`;
        }

        if (!this.permissions?.isMac) {
            return html`
                <div class="permissions-container">
                    <div class="not-mac">
                        ℹ️ Permission setup is only needed on macOS. Your system handles permissions automatically.
                    </div>
                </div>
            `;
        }

        const allGranted = 
            this.permissions.microphone === 'granted' && 
            this.permissions.screen === 'granted';

        return html`
            <div class="permissions-container">
                <div class="permissions-header">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    <span class="permissions-title">macOS Permissions</span>
                </div>

                ${allGranted 
                    ? html`
                        <div class="all-granted">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            All permissions granted! Audio capture is ready.
                        </div>
                    `
                    : html`
                        <!-- Microphone Permission -->
                        <div class="permission-row">
                            <div class="permission-info">
                                <span class="permission-name">🎤 Microphone</span>
                                <span class="permission-desc">Required for voice input</span>
                            </div>
                            <div class="permission-status">
                                ${this.getStatusBadge(this.permissions.microphone)}
                                ${this.permissions.microphone !== 'granted' 
                                    ? html`
                                        <button class="grant-button request" @click=${this.requestMicrophone}>
                                            Grant Access
                                        </button>
                                    ` 
                                    : ''}
                            </div>
                        </div>

                        <!-- Screen Recording Permission -->
                        <div class="permission-row">
                            <div class="permission-info">
                                <span class="permission-name">🖥️ Screen Recording</span>
                                <span class="permission-desc">Required for system audio capture</span>
                            </div>
                            <div class="permission-status">
                                ${this.getStatusBadge(this.permissions.screen)}
                                ${this.permissions.screen !== 'granted' 
                                    ? html`
                                        <button class="grant-button open-settings" @click=${() => this.openSettings('screen')}>
                                            Open Settings
                                        </button>
                                    ` 
                                    : ''}
                            </div>
                        </div>
                    `}

                <button class="refresh-button" @click=${() => this.checkPermissions()}>
                    ↻ Refresh Status
                </button>
            </div>
        `;
    }
}

customElements.define('mac-permissions-setup', MacPermissionsSetup);
