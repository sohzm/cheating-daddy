import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

/**
 * UpdateDialog - Shows when a new version is available
 */
export class UpdateDialog extends LitElement {
    static styles = css`
        :host {
            display: block;
        }

        * {
            cursor: default;
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
            border-radius: 0;
            padding: 24px;
            max-width: 440px;
            width: 90%;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
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
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }

        .update-icon {
            width: 32px;
            height: 32px;
            background: #4ade80;
            border-radius: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .update-icon svg {
            width: 24px;
            height: 24px;
            color: white;
        }

        .header-text {
            flex: 1;
        }

        .dialog-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-color, #fff);
            margin-bottom: 2px;
        }

        .dialog-subtitle {
            font-size: 12px;
            color: var(--text-muted, #888);
        }

        .dialog-body {
            margin-bottom: 20px;
            overflow-y: auto;
            flex: 1;
            padding-right: 8px;
        }

        .dialog-body::-webkit-scrollbar {
            width: 4px;
        }

        .dialog-body::-webkit-scrollbar-thumb {
            background: var(--border-color, #404040);
        }

        .version-badge {
            display: inline-block;
            background: rgba(74, 222, 128, 0.1);
            color: #4ade80;
            padding: 2px 8px;
            border-radius: 0;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 12px;
            border: 1px solid rgba(74, 222, 128, 0.2);
        }

        .update-message {
            font-size: 13px;
            color: var(--text-secondary, #bbb);
            line-height: 1.5;
            padding: 12px;
            background: var(--bg-tertiary, #333);
            border-radius: 0;
            border-left: 2px solid #4ade80;
        }

        .build-date {
            font-size: 11px;
            color: var(--text-muted, #666);
            margin-top: 8px;
        }

        .release-channel {
            display: inline-block;
            background: rgba(99, 102, 241, 0.1);
            color: #818cf8;
            padding: 2px 8px;
            border-radius: 0;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            margin-left: 8px;
            border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .release-notes {
            margin-top: 12px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 0;
            border: 1px solid var(--border-color, #404040);
        }

        .release-notes-title {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-muted, #888);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .release-notes-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .release-notes-list li {
            font-size: 12px;
            color: var(--text-secondary, #bbb);
            padding: 4px 0;
            line-height: 1.4;
        }

        .dialog-actions {
            display: flex;
            gap: 10px;
        }

        .btn {
            flex: 1;
            padding: 10px 16px;
            border-radius: 0;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.15s ease;
            border: 1px solid transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .btn-primary {
            background: #fff;
            color: #000;
        }

        .btn-primary:hover {
            background: #e0e0e0;
        }

        .btn-secondary {
            background: transparent;
            color: var(--text-muted, #888);
            border: 1px solid var(--border-color, #404040);
        }

        .btn-secondary:hover {
            background: var(--bg-tertiary, #333);
            color: var(--text-color, #fff);
        }


    `;

    static properties = {
        updateInfo: { type: Object },
        onClose: { type: Function },
    };

    constructor() {
        super();
        this.updateInfo = null;
        this.onClose = () => { };
    }

    handleDownload() {
        this.onClose('download');
    }

    handleLater() {
        this.onClose('later');
    }



    render() {
        if (!this.updateInfo) return html``;

        return html`
            <div class="overlay">
                <div class="dialog">
                    <div class="dialog-header">
                        <div class="update-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </div>
                        <div class="header-text">
                            <div class="dialog-title">Update Available!</div>
                            <div class="dialog-subtitle">A new version is ready to download</div>
                        </div>
                    </div>

                    <div class="dialog-body">
                        <div class="version-badge">v${this.updateInfo.version}</div>
                        ${this.updateInfo.releaseChannel ? html`
                            <span class="release-channel">${this.updateInfo.releaseChannel}</span>
                        ` : ''}
                        <div class="update-message">
                            ${this.updateInfo.message || 'Bug fixes and improvements'}
                        </div>
                        ${this.updateInfo.buildDate ? html`
                            <div class="build-date">Released: ${this.updateInfo.buildDate}</div>
                        ` : ''}
                        ${this.updateInfo.releaseNotes && this.updateInfo.releaseNotes.length > 0 ? html`
                            <div class="release-notes">
                                <div class="release-notes-title">What's New</div>
                                <ul class="release-notes-list">
                                    ${this.updateInfo.releaseNotes.map(note => html`<li>${note}</li>`)}
                                </ul>
                            </div>
                        ` : ''}
                    </div>

                    <div class="dialog-actions">
                        <button class="btn btn-secondary" @click=${this.handleLater}>
                            Later
                        </button>
                        <button class="btn btn-primary" @click=${this.handleDownload}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download Now
                        </button>
                    </div>


                </div>
            </div>
        `;
    }
}

customElements.define('update-dialog', UpdateDialog);
