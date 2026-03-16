import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

export class FeedbackView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .feedback-form {
                display: flex;
                flex-direction: column;
                gap: var(--space-sm);
            }

            .feedback-input {
                width: 100%;
                padding: var(--space-sm) var(--space-md);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                background: var(--bg-elevated);
                color: var(--text-primary);
                font-size: var(--font-size-sm);
                font-family: var(--font);
            }

            .feedback-input:focus {
                outline: none;
                border-color: var(--accent);
            }

            .feedback-input::placeholder {
                color: var(--text-muted);
            }

            textarea.feedback-input {
                min-height: 140px;
                resize: vertical;
                line-height: 1.45;
            }

            input.feedback-input {
                max-width: 260px;
            }

            .feedback-row {
                display: flex;
                align-items: center;
                gap: var(--space-sm);
            }

            .feedback-submit {
                padding: var(--space-sm) var(--space-md);
                border: none;
                border-radius: var(--radius-sm);
                background: var(--accent);
                color: var(--btn-primary-text, #fff);
                font-size: var(--font-size-sm);
                font-weight: var(--font-weight-medium);
                cursor: pointer;
                transition: opacity var(--transition);
                white-space: nowrap;
            }

            .feedback-submit:hover {
                opacity: 0.85;
            }

            .feedback-submit:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .feedback-status {
                font-size: var(--font-size-xs);
                color: var(--text-muted);
            }

            .feedback-status.success {
                color: var(--success);
            }

            .feedback-status.error {
                color: var(--danger);
            }

            .attach-info {
                display: flex;
                align-items: center;
                gap: var(--space-xs);
                font-size: var(--font-size-xs);
                color: var(--text-muted);
                cursor: pointer;
                user-select: none;
            }

            .attach-info input[type="checkbox"] {
                cursor: pointer;
                accent-color: var(--accent);
            }
        `,
    ];

    static properties = {
        _feedbackText: { state: true },
        _feedbackEmail: { state: true },
        _feedbackStatus: { state: true },
        _feedbackSending: { state: true },
        _attachInfo: { state: true },
        _version: { state: true },
    };

    constructor() {
        super();
        this._feedbackText = '';
        this._feedbackEmail = '';
        this._feedbackStatus = '';
        this._feedbackSending = false;
        this._attachInfo = true;
        this._version = '';
        this._loadVersion();
    }

    async _loadVersion() {
        try {
            this._version = await cheatingDaddy.getVersion();
            this.requestUpdate();
        } catch (e) {}
    }

    _getOS() {
        const p = navigator.platform || '';
        if (p.includes('Mac')) return 'macOS';
        if (p.includes('Win')) return 'Windows';
        if (p.includes('Linux')) return 'Linux';
        return p;
    }

    async _submitFeedback() {
        const text = this._feedbackText.trim();
        if (!text || this._feedbackSending) return;

        let content = text;
        if (this._attachInfo) {
            content += `\n\nsent from ${this._getOS()} version ${this._version}`;
        }

        if (content.length > 2000) {
            this._feedbackStatus = 'error:Max 2000 characters';
            this.requestUpdate();
            return;
        }

        this._feedbackSending = true;
        this._feedbackStatus = '';
        this.requestUpdate();

        try {
            const body = { feedback: content };
            if (this._feedbackEmail.trim()) {
                body.email = this._feedbackEmail.trim();
            }

            const res = await fetch('https://api.cheatingdaddy.com/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                this._feedbackText = '';
                this._feedbackEmail = '';
                this._feedbackStatus = 'success:Feedback sent, thank you!';
            } else if (res.status === 429) {
                this._feedbackStatus = 'error:Please wait a few minutes before sending again';
            } else {
                this._feedbackStatus = 'error:Failed to send feedback';
            }
        } catch (e) {
            this._feedbackStatus = 'error:Could not connect to server';
        }

        this._feedbackSending = false;
        this.requestUpdate();
    }

    render() {
        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div class="page-title">Feedback</div>

                    <section class="surface">
                        <div class="feedback-form">
                            <textarea
                                class="feedback-input"
                                placeholder="Bug reports, feature requests, anything..."
                                .value=${this._feedbackText}
                                @input=${e => { this._feedbackText = e.target.value; }}
                                maxlength="2000"
                            ></textarea>
                            <input
                                class="feedback-input"
                                type="email"
                                placeholder="Email (optional)"
                                .value=${this._feedbackEmail}
                                @input=${e => { this._feedbackEmail = e.target.value; }}
                            />
                            <label class="attach-info">
                                <input
                                    type="checkbox"
                                    .checked=${this._attachInfo}
                                    @change=${e => { this._attachInfo = e.target.checked; }}
                                />
                                Attach OS and app version
                            </label>
                            <div class="feedback-row">
                                <button
                                    class="feedback-submit"
                                    @click=${() => this._submitFeedback()}
                                    ?disabled=${!this._feedbackText.trim() || this._feedbackSending}
                                >
                                    ${this._feedbackSending ? 'Sending...' : 'Send Feedback'}
                                </button>
                                ${this._feedbackStatus ? html`
                                    <span class="feedback-status ${this._feedbackStatus.split(':')[0]}">
                                        ${this._feedbackStatus.split(':').slice(1).join(':')}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        `;
    }
}

customElements.define('feedback-view', FeedbackView);
