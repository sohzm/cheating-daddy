import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

/**
 * UpgradeDialog - Shows when app is first run or upgraded
 * Minimalistic design with sharp edges matching the app's formal style
 */
export class UpgradeDialog extends LitElement {
    static styles = css`
        :host {
            display: block;
            --bg-primary: #1e1e1e;
            --bg-secondary: #252526;
            --bg-tertiary: #2d2d2d;
            --text-color: #e5e5e5;
            --text-secondary: #a0a0a0;
            --text-muted: #6b6b6b;
            --border-color: #3c3c3c;
            --accent-color: #ffffff;
            --error-color: #f14c4c;
        }

        * {
            cursor: default;
            box-sizing: border-box;
        }

        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }

        .dialog {
            background: var(--bg-primary);
            padding: 24px;
            max-width: 400px;
            width: 90%;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            border: 1px solid var(--border-color);
            animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .dialog-header {
            margin-bottom: 20px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 16px;
        }

        .dialog-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-color);
            margin-bottom: 4px;
            letter-spacing: 0.3px;
        }

        .dialog-subtitle {
            font-size: 11px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .dialog-body {
            margin-bottom: 24px;
            overflow-y: auto;
            flex: 1;
        }

        .dialog-body::-webkit-scrollbar {
            width: 4px;
        }

        .dialog-body::-webkit-scrollbar-track {
            background: var(--bg-primary);
        }

        .dialog-body::-webkit-scrollbar-thumb {
            background: var(--border-color);
        }

        .info-section {
            background: var(--bg-secondary);
            padding: 16px;
            margin-bottom: 16px;
            border: 1px solid var(--border-color);
        }

        .info-title {
            font-size: 10px;
            font-weight: 600;
            color: var(--error-color);
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .data-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .data-list li {
            font-size: 12px;
            color: var(--text-secondary);
            padding: 6px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .data-list li:last-child {
            border-bottom: none;
        }

        .data-list li::before {
            content: '—';
            margin-right: 8px;
            color: var(--text-muted);
        }

        .note {
            font-size: 12px;
            color: var(--text-secondary);
            padding: 16px;
            background: var(--bg-secondary);
            line-height: 1.6;
            border-left: 2px solid var(--text-muted);
        }

        .release-notes-section {
            margin-top: 16px;
            padding: 16px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
        }

        .release-notes-title {
            font-size: 10px;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .release-notes-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .release-notes-list li {
            font-size: 12px;
            color: var(--text-secondary);
            padding: 6px 0;
            line-height: 1.5;
            border-bottom: 1px solid var(--border-color);
        }

        .release-notes-list li:last-child {
            border-bottom: none;
        }

        .release-notes-list li::before {
            content: '—';
            margin-right: 8px;
            color: var(--text-muted);
        }

        .release-channel-badge {
            display: inline-block;
            background: var(--bg-secondary);
            color: var(--text-muted);
            padding: 4px 8px;
            font-size: 10px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-left: 8px;
            border: 1px solid var(--border-color);
            vertical-align: middle;
        }

        .dialog-actions {
            display: flex;
            gap: 8px;
        }

        .btn {
            flex: 1;
            padding: 12px 16px;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.15s ease;
            border: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .btn-primary {
            background: var(--accent-color);
            color: var(--bg-primary);
            border-color: var(--accent-color);
        }

        .btn-primary:hover {
            background: #e0e0e0;
            border-color: #e0e0e0;
        }

        .btn-danger {
            background: transparent;
            color: var(--error-color);
            border-color: var(--error-color);
        }

        .btn-danger:hover {
            background: rgba(241, 76, 76, 0.1);
        }

        .btn-secondary {
            background: transparent;
            color: var(--text-muted);
        }

        .btn-secondary:hover {
            background: var(--bg-tertiary);
            color: var(--text-color);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .loading-spinner {
            width: 12px;
            height: 12px;
            border: 2px solid transparent;
            border-top-color: currentColor;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;

    static properties = {
        isFirstRun: { type: Boolean },
        isUpgrade: { type: Boolean },
        previousVersion: { type: String },
        currentVersion: { type: String },
        isProcessing: { type: Boolean },
        mode: { type: String }, // 'upgrade' or 'clear' (for Settings clear all data)
        releaseNotes: { type: Array },
        releaseChannel: { type: String }
    };

    constructor() {
        super();
        this.isFirstRun = false;
        this.isUpgrade = false;
        this.previousVersion = '';
        this.currentVersion = '';
        this.isProcessing = false;
        this.mode = 'upgrade';
        this.releaseNotes = [];
        this.releaseChannel = '';
    }

    get title() {
        if (this.mode === 'clear') {
            return 'Clear All Data';
        }
        if (this.isFirstRun) {
            return 'Welcome to Cheating Daddy On Steroids';
        }
        return `Updated to v${this.currentVersion}${this.releaseChannel ? ` (${this.releaseChannel})` : ''}`;
    }

    get subtitle() {
        if (this.mode === 'clear') {
            return 'This will reset the app to factory defaults';
        }
        if (this.isFirstRun) {
            return 'Get started with your AI assistant';
        }
        return `Previously v${this.previousVersion}`;
    }

    /**
     * Check if we're running in the separate upgrade window (context isolated)
     * or in the main app window (has cheatingDaddy global)
     */
    get isInSeparateWindow() {
        return typeof window.electronAPI !== 'undefined' && typeof window.cheatingDaddy === 'undefined';
    }

    async handleKeepConfig() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.requestUpdate();

        try {
            if (this.isInSeparateWindow) {
                // In separate window - just dispatch event, main process handles storage
                this.dispatchEvent(new CustomEvent('dialog-complete', {
                    detail: { action: 'keep' },
                    bubbles: true,
                    composed: true
                }));
            } else {
                // In main app - use cheatingDaddy API
                await cheatingDaddy.storage.markVersionSeen();
                this.dispatchEvent(new CustomEvent('dialog-complete', {
                    detail: { action: 'keep' },
                    bubbles: true,
                    composed: true
                }));
            }
        } catch (error) {
            console.error('Error marking version seen:', error);
            this.dispatchEvent(new CustomEvent('dialog-error', {
                detail: { error: error.message },
                bubbles: true,
                composed: true
            }));
        } finally {
            this.isProcessing = false;
            this.requestUpdate();
        }
    }

    async handleResetConfig() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.requestUpdate();

        try {
            if (this.isInSeparateWindow) {
                // In separate window - just dispatch event, main process handles storage & restart
                this.dispatchEvent(new CustomEvent('dialog-complete', {
                    detail: { action: 'reset' },
                    bubbles: true,
                    composed: true
                }));
            } else {
                // In main app - use cheatingDaddy API
                await cheatingDaddy.storage.clearAll();
                await cheatingDaddy.storage.markVersionSeen();

                this.dispatchEvent(new CustomEvent('dialog-complete', {
                    detail: { action: 'reset' },
                    bubbles: true,
                    composed: true
                }));

                // Restart app for clean state
                if (window.require) {
                    const { ipcRenderer } = window.require('electron');
                    await ipcRenderer.invoke('restart-application');
                }
            }
        } catch (error) {
            console.error('Error resetting config:', error);
            this.dispatchEvent(new CustomEvent('dialog-error', {
                detail: { error: error.message },
                bubbles: true,
                composed: true
            }));
        } finally {
            this.isProcessing = false;
            this.requestUpdate();
        }
    }

    async handleCancelClear() {
        this.dispatchEvent(new CustomEvent('dialog-complete', {
            detail: { action: 'cancel' },
            bubbles: true,
            composed: true
        }));
    }

    render() {
        const isClearMode = this.mode === 'clear';

        return html`
            <div class="overlay">
                <div class="dialog">
                    <div class="dialog-header">
                        <div class="dialog-title">${this.title}</div>
                        <div class="dialog-subtitle">${this.subtitle}</div>
                    </div>

                    <div class="dialog-body">
                        <div class="info-section">
                            <div class="info-title">Warning: Data will be deleted</div>
                            <ul class="data-list">
                                <li>API Keys (Gemini & Groq)</li>
                                <li>All preferences & settings</li>
                                <li>Custom profiles</li>
                                <li>Keybind configurations</li>
                                <li>Session history</li>
                                <li>Usage statistics</li>
                            </ul>
                        </div>

                        ${!isClearMode ? html`
                            <div class="note">
                                ${this.isFirstRun
                    ? `Choose "Start Fresh" to begin with clean default settings.`
                    : `If you experienced bugs or issues in the previous version, resetting may help. Otherwise, keep your current config.`
                }
                            </div>

                            ${this.releaseNotes && this.releaseNotes.length > 0 ? html`
                                <div class="release-notes-section">
                                    <div class="release-notes-title">What's New</div>
                                    <ul class="release-notes-list">
                                        ${this.releaseNotes.map(note => html`<li>${note}</li>`)}
                                    </ul>
                                </div>
                            ` : ''}
                        ` : html`
                            <div class="note">
                                This action cannot be undone. The app will close after reset.
                            </div>
                        `}
                    </div>

                    <div class="dialog-actions">
                        ${isClearMode ? html`
                            <button
                                class="btn btn-secondary"
                                @click=${this.handleCancelClear}
                                ?disabled=${this.isProcessing}
                            >
                                Cancel
                            </button>
                            <button
                                class="btn btn-danger" 
                                @click=${this.handleResetConfig}
                                ?disabled=${this.isProcessing}
                            >
                                ${this.isProcessing ? html`
                                    <div class="loading-spinner"></div>
                                    Resetting...
                                ` : 'Delete Everything'}
                            </button>
                        ` : html`
                            <button 
                                class="btn btn-danger" 
                                @click=${this.handleResetConfig}
                                ?disabled=${this.isProcessing}
                            >
                                ${this.isProcessing ? html`
                                    <div class="loading-spinner"></div>
                                    Resetting...
                                ` : this.isFirstRun ? 'Start Fresh' : 'Reset Config'}
                            </button>
                            <button 
                                class="btn btn-primary" 
                                @click=${this.handleKeepConfig}
                                ?disabled=${this.isProcessing}
                            >
                                ${this.isFirstRun ? 'Continue' : 'Keep My Config'}
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('upgrade-dialog', UpgradeDialog);
