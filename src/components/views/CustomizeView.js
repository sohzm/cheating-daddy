import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class CustomizeView extends LitElement {
    static styles = css`
        .option-group {
            margin-bottom: 24px;
        }

        .option-label {
            display: block;
            margin-bottom: 8px;
            color: var(--option-label-color);
            font-weight: 500;
            font-size: 14px;
        }

        .option-group .description {
            margin-top: 8px;
            margin-bottom: 0;
            font-size: 13px;
            color: var(--description-color);
        }

        select {
            background: var(--input-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 10px 14px;
            width: 100%;
            border-radius: 8px;
            font-size: 14px;
        }

        select:focus {
            outline: none;
            border-color: var(--focus-border-color);
            box-shadow: 0 0 0 3px var(--focus-box-shadow);
            background: var(--input-focus-background);
        }

        textarea {
            background: var(--input-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 10px 14px;
            width: 100%;
            border-radius: 8px;
            font-size: 14px;
            height: 120px;
            resize: vertical;
            line-height: 1.5;
        }

        textarea:focus {
            outline: none;
            border-color: var(--focus-border-color);
            box-shadow: 0 0 0 3px var(--focus-box-shadow);
            background: var(--input-focus-background);
        }

        textarea::placeholder {
            color: var(--placeholder-color);
        }
    `;

    static properties = {
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        selectedScreenshotInterval: { type: String },
        selectedImageQuality: { type: String },
        onProfileChange: { type: Function },
        onLanguageChange: { type: Function },
        onScreenshotIntervalChange: { type: Function },
        onImageQualityChange: { type: Function }
    };

    constructor() {
        super();
        this.selectedProfile = 'interview';
        this.selectedLanguage = 'en-US';
        this.selectedScreenshotInterval = '1';
        this.selectedImageQuality = 'medium';
        this.onProfileChange = () => {};
        this.onLanguageChange = () => {};
        this.onScreenshotIntervalChange = () => {};
        this.onImageQualityChange = () => {};
    }

    getProfiles() {
        return [
            {
                value: 'interview',
                name: 'Job Interview',
                description: 'Get help with answering interview questions',
            },
            {
                value: 'sales',
                name: 'Sales Call',
                description: 'Assist with sales conversations and objection handling',
            },
            {
                value: 'meeting',
                name: 'Business Meeting',
                description: 'Support for professional meetings and discussions',
            },
            {
                value: 'presentation',
                name: 'Presentation',
                description: 'Help with presentations and public speaking',
            },
            {
                value: 'negotiation',
                name: 'Negotiation',
                description: 'Guidance for business negotiations and deals',
            },
        ];
    }

    getLanguages() {
        return [
            { value: 'en-US', name: 'English (US)' },
            { value: 'en-GB', name: 'English (UK)' },
            { value: 'en-AU', name: 'English (Australia)' },
            { value: 'en-IN', name: 'English (India)' },
            { value: 'de-DE', name: 'German (Germany)' },
            { value: 'es-US', name: 'Spanish (United States)' },
            { value: 'es-ES', name: 'Spanish (Spain)' },
            { value: 'fr-FR', name: 'French (France)' },
            { value: 'fr-CA', name: 'French (Canada)' },
            { value: 'hi-IN', name: 'Hindi (India)' },
            { value: 'pt-BR', name: 'Portuguese (Brazil)' },
            { value: 'ar-XA', name: 'Arabic (Generic)' },
            { value: 'id-ID', name: 'Indonesian (Indonesia)' },
            { value: 'it-IT', name: 'Italian (Italy)' },
            { value: 'ja-JP', name: 'Japanese (Japan)' },
            { value: 'tr-TR', name: 'Turkish (Turkey)' },
            { value: 'vi-VN', name: 'Vietnamese (Vietnam)' },
            { value: 'bn-IN', name: 'Bengali (India)' },
            { value: 'gu-IN', name: 'Gujarati (India)' },
            { value: 'kn-IN', name: 'Kannada (India)' },
            { value: 'ml-IN', name: 'Malayalam (India)' },
            { value: 'mr-IN', name: 'Marathi (India)' },
            { value: 'ta-IN', name: 'Tamil (India)' },
            { value: 'te-IN', name: 'Telugu (India)' },
            { value: 'nl-NL', name: 'Dutch (Netherlands)' },
            { value: 'ko-KR', name: 'Korean (South Korea)' },
            { value: 'cmn-CN', name: 'Mandarin Chinese (China)' },
            { value: 'pl-PL', name: 'Polish (Poland)' },
            { value: 'ru-RU', name: 'Russian (Russia)' },
            { value: 'th-TH', name: 'Thai (Thailand)' },
        ];
    }

    getProfileNames() {
        return {
            interview: 'Job Interview',
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
        };
    }

    handleProfileSelect(e) {
        this.selectedProfile = e.target.value;
        localStorage.setItem('selectedProfile', this.selectedProfile);
        this.onProfileChange(this.selectedProfile);
    }

    handleLanguageSelect(e) {
        this.selectedLanguage = e.target.value;
        localStorage.setItem('selectedLanguage', this.selectedLanguage);
        this.onLanguageChange(this.selectedLanguage);
    }

    handleScreenshotIntervalSelect(e) {
        this.selectedScreenshotInterval = e.target.value;
        localStorage.setItem('selectedScreenshotInterval', this.selectedScreenshotInterval);
        this.onScreenshotIntervalChange(this.selectedScreenshotInterval);
    }

    handleImageQualitySelect(e) {
        this.selectedImageQuality = e.target.value;
        localStorage.setItem('selectedImageQuality', this.selectedImageQuality);
        this.onImageQualityChange(this.selectedImageQuality);
    }

    handleCustomPromptInput(e) {
        localStorage.setItem('customPrompt', e.target.value);
    }

    render() {
        const profiles = this.getProfiles();
        const languages = this.getLanguages();
        const profileNames = this.getProfileNames();

        return html`
            <div>
                <div class="option-group">
                    <label class="option-label">Select Profile</label>
                    <select .value=${this.selectedProfile} @change=${this.handleProfileSelect}>
                        ${profiles.map(
                            profile => html`
                                <option value=${profile.value} ?selected=${this.selectedProfile === profile.value}>${profile.name}</option>
                            `
                        )}
                    </select>
                    <div class="description">${profiles.find(p => p.value === this.selectedProfile)?.description || ''}</div>
                </div>

                <div class="option-group">
                    <span class="option-label">AI Behavior for ${profileNames[this.selectedProfile] || 'Selected Profile'}</span>
                    <textarea
                        placeholder="Describe how you want the AI to behave..."
                        .value=${localStorage.getItem('customPrompt') || ''}
                        class="custom-prompt-textarea"
                        rows="4"
                        @input=${this.handleCustomPromptInput}
                    ></textarea>
                    <div class="description">
                        This custom prompt will be added to the ${profileNames[this.selectedProfile] || 'selected profile'} instructions to
                        personalize the AI's behavior.
                    </div>
                </div>

                <div class="option-group">
                    <label class="option-label">Select Language</label>
                    <select .value=${this.selectedLanguage} @change=${this.handleLanguageSelect}>
                        ${languages.map(
                            language => html`
                                <option value=${language.value} ?selected=${this.selectedLanguage === language.value}>${language.name}</option>
                            `
                        )}
                    </select>
                    <div class="description">Choose the language for speech recognition and AI responses.</div>
                </div>

                <div class="option-group">
                    <label class="option-label">Screenshot Interval</label>
                    <select .value=${this.selectedScreenshotInterval} @change=${this.handleScreenshotIntervalSelect}>
                        <option value="1" ?selected=${this.selectedScreenshotInterval === '1'}>Fast (1 second)</option>
                        <option value="3" ?selected=${this.selectedScreenshotInterval === '3'}>Medium (3 seconds)</option>
                        <option value="5" ?selected=${this.selectedScreenshotInterval === '5'}>Slow (5 seconds)</option>
                    </select>
                    <div class="description">Frequency of screen captures sent to the AI. Slower intervals use fewer tokens.</div>
                </div>

                <div class="option-group">
                    <label class="option-label">Image Quality</label>
                    <select .value=${this.selectedImageQuality} @change=${this.handleImageQualitySelect}>
                        <option value="high" ?selected=${this.selectedImageQuality === 'high'}>High (More tokens)</option>
                        <option value="medium" ?selected=${this.selectedImageQuality === 'medium'}>Medium (Balanced)</option>
                        <option value="low" ?selected=${this.selectedImageQuality === 'low'}>Low (Fewer tokens)</option>
                    </select>
                    <div class="description">Quality of screenshots sent to the AI. Lower quality uses fewer tokens.</div>
                </div>
            </div>
        `;
    }
}

customElements.define('customize-view', CustomizeView); 