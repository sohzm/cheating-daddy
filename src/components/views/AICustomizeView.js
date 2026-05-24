import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

const PROFILE_DESCRIPTIONS = {
    interview:
        'Acts as a discreet teleprompter during job interviews. Provides ready-to-speak answers based on your resume, the job description, and the ongoing dialogue. Tailored to your specific field.',
    sales: 'Provides persuasive, ready-to-speak responses during sales calls. Focuses on value propositions, objection handling, and closing techniques. Adapts to prospect concerns in real-time.',
    meeting:
        'Gives clear, professional responses for meetings and discussions. Helps with status updates, budget walkthroughs, and action items. Keeps answers concise and action-oriented.',
    presentation:
        'Coaches you through presentations and pitches with confident, engaging responses. Backs up claims with specific numbers and facts. Handles audience Q&A smoothly.',
    negotiation:
        'Strategic responses for business negotiations and deal-making. Focuses on win-win solutions, addresses underlying concerns, and leverages market intelligence for leverage.',
    exam: 'Direct, efficient exam answers with minimal explanation. Provides the correct answer choice, brief justification, and moves on. Optimized for speed and accuracy.',
    custom: 'Your custom prompt becomes the entire system instruction. Write exactly how you want the AI to behave — no predefined template is applied.',
};

export class AICustomizeView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .unified-page {
                height: 100%;
            }
            .unified-wrap {
                height: 100%;
                gap: var(--space-md);
            }
            section.surface {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
            }
            .form-grid {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: var(--space-md);
            }
            .form-group.vertical {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            textarea.control {
                flex: 1;
                resize: none;
                overflow-y: auto;
                min-height: 0;
            }

            .explanation-toggle {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 6px;
                cursor: pointer;
                user-select: none;
                color: var(--text-muted);
                font-size: var(--font-size-xs);
                transition: color 0.15s;
            }

            .explanation-toggle:hover {
                color: var(--text-secondary);
            }

            .explanation-arrow {
                font-size: 10px;
                transition: transform 0.2s;
                display: inline-block;
            }

            .explanation-arrow.open {
                transform: rotate(180deg);
            }

            .explanation-box {
                margin-top: 8px;
                padding: 10px 12px;
                background: var(--bg-surface);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                font-size: var(--font-size-xs);
                color: var(--text-secondary);
                line-height: 1.5;
                display: none;
            }

            .explanation-box.visible {
                display: block;
            }
        `,
    ];

    static properties = {
        selectedProfile: { type: String },
        onProfileChange: { type: Function },
        _context: { state: true },
        _showExplanation: { state: true },
    };

    constructor() {
        super();
        this.selectedProfile = 'interview';
        this.onProfileChange = () => {};
        this._context = '';
        this._showExplanation = false;
        this._loadFromStorage();
    }

    async _loadFromStorage() {
        try {
            const prefs = await svcHost.storage.getPreferences();
            this._context = prefs.customPrompt || '';
            if (prefs.selectedProfile) {
                this.selectedProfile = prefs.selectedProfile;
            }
            this.requestUpdate();
        } catch (error) {
            console.error('Error loading AI customize storage:', error);
        }
    }

    _handleProfileChange(e) {
        this.selectedProfile = e.target.value;
        this.onProfileChange(e.target.value);
        svcHost.storage.updatePreference('selectedProfile', e.target.value);
    }

    async _saveContext(val) {
        this._context = val;
        await svcHost.storage.updatePreference('customPrompt', val);
    }

    _toggleExplanation() {
        this._showExplanation = !this._showExplanation;
        this.requestUpdate();
    }

    render() {
        const profiles = [
            { value: 'interview', label: 'Job Interview' },
            { value: 'sales', label: 'Sales Call' },
            { value: 'meeting', label: 'Business Meeting' },
            { value: 'presentation', label: 'Presentation' },
            { value: 'negotiation', label: 'Negotiation' },
            { value: 'exam', label: 'Exam Assistant' },
            { value: 'custom', label: 'Custom Prompt' },
        ];

        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div>
                        <div class="page-title">AI Context</div>
                        <p class="page-subtitle">Choose a profile and add custom instructions for your session</p>
                    </div>

                    <section class="surface">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Profile</label>
                                <select class="control" .value=${this.selectedProfile} @change=${this._handleProfileChange}>
                                    ${profiles.map(p => html`<option value=${p.value} ?selected=${p.value === this.selectedProfile}>${p.label}</option>`)}
                                </select>
                            </div>

                            <div class="form-group">
                                <div class="explanation-toggle" @click=${this._toggleExplanation}>
                                    <span class="explanation-arrow ${this._showExplanation ? 'open' : ''}">&#9660;</span>
                                    <span>Explanation</span>
                                </div>
                                <div class="explanation-box ${this._showExplanation ? 'visible' : ''}">
                                    ${PROFILE_DESCRIPTIONS[this.selectedProfile] || ''}
                                </div>
                            </div>

                            <div class="form-group vertical">
                                <label class="form-label">${this.selectedProfile === 'custom' ? 'System Prompt' : 'Custom Instructions'}</label>
                                <textarea
                                    class="control"
                                    placeholder="${this.selectedProfile === 'custom' ? 'Write your full system prompt here. This becomes the entire AI instruction...' : 'Resume details, role requirements, constraints, company info...'}"
                                    .value=${this._context}
                                    @input=${e => this._saveContext(e.target.value)}
                                ></textarea>
                                <div class="form-help">${this.selectedProfile === 'custom' ? 'This is the entire system prompt — no template is applied.' : 'Sent as context at session start. Include your resume, job description, or any relevant details.'}</div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        `;
    }
}

customElements.define('ai-customize-view', AICustomizeView);
