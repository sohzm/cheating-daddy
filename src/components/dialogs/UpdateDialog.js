import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

/**
 * UpdateDialog - Shows when a new version is available
 * Minimalistic design with sharp edges matching the app's formal style
 */
export class UpdateDialog extends LitElement {
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
            display: flex;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border-color);
        }

        .update-icon {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .update-icon svg {
            width: 20px;
            height: 20px;
            color: var(--text-color);
        }

        .header-text {
            flex: 1;
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

        .version-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
        }

        .version-badge {
            display: inline-block;
            background: var(--bg-tertiary);
            color: var(--text-color);
            padding: 4px 10px;
            font-size: 12px;
            font-weight: 500;
            border: 1px solid var(--border-color);
            letter-spacing: 0.5px;
        }

        .release-channel {
            display: inline-block;
            background: var(--bg-secondary);
            color: var(--text-muted);
            padding: 4px 8px;
            font-size: 10px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 1px;
            border: 1px solid var(--border-color);
        }

        .update-message {
            font-size: 13px;
            color: var(--text-secondary);
            line-height: 1.6;
            padding: 16px;
            background: var(--bg-secondary);
            border-left: 2px solid var(--text-muted);
        }

        .build-date {
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .release-notes {
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

        .btn-secondary {
            background: transparent;
            color: var(--text-muted);
        }

        .btn-secondary:hover {
            background: var(--bg-tertiary);
            color: var(--text-color);
        }

        .btn svg {
            width: 14px;
            height: 14px;
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
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </div>
                        <div class="header-text">
                            <div class="dialog-title">Update Available</div>
                            <div class="dialog-subtitle">New version ready</div>
                        </div>
                    </div>

                    <div class="dialog-body">
                        <div class="version-row">
                            <span class="version-badge">v${this.updateInfo.version}</span>
                            ${this.updateInfo.releaseChannel ? html`
                                <span class="release-channel">${this.updateInfo.releaseChannel}</span>
                            ` : ''}
                        </div>
                        
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
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('update-dialog', UpdateDialog);
