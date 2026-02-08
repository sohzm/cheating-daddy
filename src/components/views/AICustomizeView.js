import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class AICustomizeView extends LitElement {
    static styles = css`
        * {
            font-family: var(--font);
            cursor: default;
            user-select: none;
            box-sizing: border-box;
        }

        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: var(--space-xl) var(--space-lg);
            overflow-y: auto;
        }

        .page-wrapper {
            width: 100%;
            max-width: 640px;
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
        }

        .page-title {
            font-size: var(--font-size-xl);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
            margin-bottom: var(--space-xs);
        }

        .page-subtitle {
            font-size: var(--font-size-sm);
            color: var(--text-muted);
            margin-bottom: var(--space-lg);
        }

        .card {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: var(--space-lg);
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
            flex: 1;
            min-height: 0;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);
        }

        .form-group.expand {
            flex: 1;
            min-height: 0;
        }

        .form-label {
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-medium);
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .form-hint {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            line-height: 1.4;
        }

        select, textarea {
            background: var(--bg-elevated);
            color: var(--text-primary);
            border: 1px solid var(--border-strong);
            padding: 10px 12px;
            width: 100%;
            border-radius: var(--radius-sm);
            font-size: var(--font-size-sm);
            font-family: var(--font);
            transition: border-color var(--transition), box-shadow var(--transition);
        }

        select:hover:not(:focus), textarea:hover:not(:focus) {
            border-color: var(--text-muted);
        }

        select:focus, textarea:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 1px var(--accent);
        }

        select {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23999' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 8px center;
            background-repeat: no-repeat;
            background-size: 14px;
            padding-right: 28px;
        }

        textarea {
            flex: 1;
            resize: none;
            min-height: 120px;
            line-height: var(--line-height);
        }

        textarea::placeholder {
            color: var(--text-muted);
        }
    `;

    static properties = {
        selectedProfile: { type: String },
        onProfileChange: { type: Function },
        _context: { state: true },
    };

    constructor() {
        super();
        this.selectedProfile = 'interview';
        this.onProfileChange = () => {};
        this._context = '';
        this._loadFromStorage();
    }

    async _loadFromStorage() {
        try {
            const prefs = await cheatingDaddy.storage.getPreferences();
            this._context = prefs.customPrompt || '';
            this.requestUpdate();
        } catch (e) {
            console.error('Error loading AI customize storage:', e);
        }
    }

    _handleProfileChange(e) {
        this.onProfileChange(e.target.value);
    }

    async _saveContext(val) {
        this._context = val;
        await cheatingDaddy.storage.updatePreference('customPrompt', val);
    }

    render() {
        const profiles = [
            { value: 'interview', label: 'Interview' },
            { value: 'sales', label: 'Sales Call' },
            { value: 'meeting', label: 'Meeting' },
            { value: 'presentation', label: 'Presentation' },
            { value: 'negotiation', label: 'Negotiation' },
            { value: 'exam', label: 'Exam' },
        ];

        return html`
            <div class="page-wrapper">
                <div class="page-title">AI Customization</div>
                <div class="page-subtitle">Configure how the AI assistant behaves during sessions</div>

                <div class="card">
                    <div class="form-group">
                        <label class="form-label">Profile</label>
                        <select .value=${this.selectedProfile} @change=${this._handleProfileChange}>
                            ${profiles.map(p => html`
                                <option value=${p.value} ?selected=${this.selectedProfile === p.value}>${p.label}</option>
                            `)}
                        </select>
                        <div class="form-hint">Choose a profile that matches your use case</div>
                    </div>

                    <div class="form-group expand">
                        <label class="form-label">Context</label>
                        <textarea
                            placeholder="Paste your resume, job description, or relevant context..."
                            .value=${this._context}
                            @input=${e => this._saveContext(e.target.value)}
                        ></textarea>
                        <div class="form-hint">This context is sent to the AI at the start of each session</div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('ai-customize-view', AICustomizeView);
