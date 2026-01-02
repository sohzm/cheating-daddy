import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class UpgradeDialog extends LitElement {
    static styles = css`
        :host {
            display: block;
        }

        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(4px);
        }

        .dialog {
            background: var(--bg-secondary, #2a2a2a);
            border-radius: 4px;
            padding: 24px;
            max-width: 420px;
            width: 90%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            border: 1px solid var(--border-color, #404040);
            animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .dialog-header {
            margin-bottom: 20px;
            border-bottom: 1px solid var(--border-color, #404040);
            padding-bottom: 16px;
        }

        .dialog-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-color, #fff);
            margin-bottom: 4px;
        }

        .dialog-subtitle {
            font-size: 12px;
            color: var(--text-secondary, #aaa);
        }

        .dialog-body {
            margin-bottom: 20px;
        }

        .info-section {
            background: var(--bg-tertiary, #333);
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 12px;
            border: 1px solid var(--border-color, #404040);
        }

        .info-title {
            font-size: 12px;
            font-weight: 600;
            color: var(--error-color, #f14c4c);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .data-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .data-list li {
            font-size: 12px;
            color: var(--text-secondary, #aaa);
            padding: 3px 0;
            padding-left: 16px;
            position: relative;
        }

        .data-list li::before {
            content: "•";
            position: absolute;
            left: 4px;
            color: var(--text-muted, #666);
        }

        .note {
            font-size: 11px;
            color: var(--text-muted, #666);
            padding: 10px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 4px;
            line-height: 1.5;
            border: 1px solid var(--border-color, #404040);
        }

        .dialog-actions {
            display: flex;
            gap: 10px;
        }

        .btn {
            flex: 1;
            padding: 10px 16px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            border: 1px solid transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .btn-primary {
            background: var(--btn-primary-bg, #fff);
            color: var(--btn-primary-text, #000);
            border-color: var(--btn-primary-bg, #fff);
        }

        .btn-primary:hover {
            background: var(--btn-primary-hover, #e0e0e0);
            border-color: var(--btn-primary-hover, #e0e0e0);
        }

        .btn-danger {
            background: transparent;
            color: var(--error-color, #f14c4c);
            border: 1px solid var(--error-color, #f14c4c);
        }

        .btn-danger:hover {
            background: rgba(241, 76, 76, 0.1);
        }

        .btn-secondary {
            background: var(--bg-tertiary, #333);
            color: var(--text-color, #fff);
            border: 1px solid var(--border-color, #404040);
        }

        .btn-secondary:hover {
            background: var(--bg-hover, #3a3a3a);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .loading-spinner {
            width: 14px;
            height: 14px;
            border: 2px solid transparent;
            border-top-color: currentColor;
            border-radius: 50%;
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
        mode: { type: String } // 'upgrade' or 'clear' (for Settings clear all data)
    };

    constructor() {
        super();
        this.isFirstRun = false;
        this.isUpgrade = false;
        this.previousVersion = '';
        this.currentVersion = '';
        this.isProcessing = false;
        this.mode = 'upgrade';
    }

    get title() {
        if (this.mode === 'clear') {
            return 'Clear All Data';
        }
        if (this.isFirstRun) {
            return 'Welcome to Cheating Daddy On Steroids';
        }
        return `Updated to v${this.currentVersion}`;
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

    async handleKeepConfig() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.requestUpdate();

        try {
            // Mark version as seen so dialog won't show again
            await cheatingDaddy.storage.markVersionSeen();
            this.dispatchEvent(new CustomEvent('dialog-complete', {
                detail: { action: 'keep' },
                bubbles: true,
                composed: true
            }));
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
            // Clear all data
            await cheatingDaddy.storage.clearAll();

            // Mark version as seen so dialog doesn't reappear on next launch
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
        } catch (error) {
            console.error('Error resetting config:', error);
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
