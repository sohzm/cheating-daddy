import { html, css, LitElement } from './lit-core-2.7.4.min.js';

class CheatingDaddyApp extends LitElement {
    static styles = css`
        * {
            box-sizing: border-box;
            font-family:
                'Inter',
                -apple-system,
                BlinkMacSystemFont,
                sans-serif;
            margin: 0px;
            padding: 0px;
            cursor: default;
        }

        :host {
            display: block;
            width: 100%;
            height: 100vh;
            background-color: var(--background-transparent);
            color: var(--text-color);
        }

        .window-container {
            height: 100vh;
            border-radius: 7px;
            overflow: hidden;
        }

        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .header {
            -webkit-app-region: drag;
            display: flex;
            align-items: center;
            padding: 10px 20px;
            border: 1px solid var(--border-color);
            background: var(--header-background);
            border-radius: 7px;
        }

        .header-title {
            flex: 1;
            font-size: 16px;
            font-weight: 600;
            -webkit-app-region: drag;
        }

        .header-actions {
            display: flex;
            gap: 12px;
            align-items: center;
            -webkit-app-region: no-drag;
        }

        .header-actions span {
            font-size: 13px;
            color: var(--header-actions-color);
        }

        .main-content {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            margin-top: 10px;
            border: 1px solid var(--border-color);
            background: var(--main-content-background);
            border-radius: 7px;
        }

        .button {
            background: var(--button-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
        }

        .icon-button {
            background: none;
            color: var(--icon-button-color);
            border: none;
            padding: 8px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            display: flex;
        }

        .icon-button:hover {
            background: var(--hover-background);
        }

        .button:hover {
            background: var(--hover-background);
        }

        button:disabled {
            opacity: 0.5;
        }

        input,
        textarea,
        select {
            background: var(--input-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 10px 14px;
            width: 100%;
            border-radius: 8px;
            font-size: 14px;
        }

        input:focus,
        textarea:focus,
        select:focus {
            outline: none;
            border-color: var(--focus-border-color);
            box-shadow: 0 0 0 3px var(--focus-box-shadow);
            background: var(--input-focus-background);
        }

        input::placeholder,
        textarea::placeholder {
            color: var(--placeholder-color);
        }

        .input-group {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
        }

        .input-group input {
            flex: 1;
        }

        .response-container {
            height: calc(100% - 60px);
            overflow-y: auto;
            white-space: pre-wrap;
            border-radius: 10px;
            font-size: 20px;
            line-height: 1.6;
        }

        .response-container::-webkit-scrollbar {
            width: 8px;
        }

        .response-container::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
            border-radius: 4px;
        }

        .response-container::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 4px;
        }

        .response-container::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }

        textarea {
            height: 120px;
            resize: vertical;
            line-height: 1.5;
        }

        .welcome {
            font-size: 24px;
            margin-bottom: 8px;
            font-weight: 600;
            margin-top: auto;
        }

        @keyframes pulse {
            0% {
                opacity: 1;
            }
            50% {
                opacity: 0.8;
            }
            100% {
                opacity: 1;
            }
        }

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

        .screen-preview {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 12px;
        }

        .screen-option {
            border: 2px solid transparent;
            padding: 8px;
            text-align: center;
            border-radius: 12px;
            background: var(--screen-option-background);
        }

        .screen-option:hover {
            background: var(--screen-option-hover-background);
            border-color: var(--button-border);
        }

        .screen-option.selected {
            border-color: var(--focus-border-color);
            background: var(--screen-option-selected-background);
        }

        .screen-option img {
            width: 150px;
            height: 100px;
            object-fit: contain;
            background: var(--screen-option-background);
            border-radius: 8px;
        }

        .screen-option div {
            font-size: 12px;
            margin-top: 6px;
            color: var(--screen-option-text);
        }

        .selected .screen-option div {
            color: var(--focus-border-color);
            font-weight: 500;
        }

        .description {
            color: var(--description-color);
            font-size: 14px;
            margin-bottom: 24px;
            line-height: 1.5;
        }

        .start-button {
            background: var(--start-button-background);
            color: var(--start-button-color);
            border: 1px solid var(--start-button-border);
        }

        .start-button:hover {
            background: var(--start-button-hover-background);
            border-color: var(--start-button-hover-border);
        }

        .text-input-container {
            display: flex;
            gap: 10px;
            margin-top: 10px;
            align-items: center;
        }

        .text-input-container input {
            flex: 1;
        }

        .text-input-container button {
            background: var(--text-input-button-background);
            color: var(--start-button-background);
            border: none;
        }

        .text-input-container button:hover {
            background: var(--text-input-button-hover);
        }

        .nav-button {
            background: var(--button-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 8px;
            border-radius: 8px;
            font-size: 12px;
            display: flex;
            align-items: center;
            min-width: 32px;
            justify-content: center;
        }

        .nav-button:hover {
            background: var(--hover-background);
        }

        .nav-button:disabled {
            opacity: 0.3;
        }

        .response-counter {
            font-size: 12px;
            color: var(--description-color);
            white-space: nowrap;
            min-width: 60px;
            text-align: center;
        }

        .link {
            color: var(--link-color);
            text-decoration: underline;
        }

        .key {
            background: var(--key-background);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            margin: 0px;
        }

        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        ::-webkit-scrollbar-track {
            background: var(--scrollbar-background);
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }
    `;

    static properties = {
        currentView: { type: String },
        statusText: { type: String },
        startTime: { type: Number },
        isRecording: { type: Boolean },
        sessionActive: { type: Boolean },
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        responses: { type: Array },
        currentResponseIndex: { type: Number },
    };

    constructor() {
        super();
        this.currentView = 'main';
        this.statusText = '';
        this.startTime = null;
        this.isRecording = false;
        this.sessionActive = false;
        this.selectedProfile = localStorage.getItem('selectedProfile') || 'interview';
        this.selectedLanguage = localStorage.getItem('selectedLanguage') || 'en-US';
        this.responses = [];
        this.currentResponseIndex = -1;
    }

    async handleWindowClose() {
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('window-close');
    }

    connectedCallback() {
        super.connectedCallback();
    }

    setStatus(t) {
        this.statusText = t;
    }

    setResponse(r) {
        this.responses.push(r);

        // If user is viewing the latest response (or no responses yet), auto-navigate to new response
        if (this.currentResponseIndex === this.responses.length - 2 || this.currentResponseIndex === -1) {
            this.currentResponseIndex = this.responses.length - 1;
        }

        this.requestUpdate();
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        const { ipcRenderer } = window.require('electron');
        ipcRenderer.removeAllListeners('update-response');
        ipcRenderer.removeAllListeners('update-status');
    }

    handleInput(e, property) {
        localStorage.setItem(property, e.target.value);
    }

    handleProfileSelect(e) {
        this.selectedProfile = e.target.value;
        localStorage.setItem('selectedProfile', this.selectedProfile);
    }

    handleLanguageSelect(e) {
        this.selectedLanguage = e.target.value;
        localStorage.setItem('selectedLanguage', this.selectedLanguage);
    }

    async handleStart() {
        await cheddar.initializeGemini(this.selectedProfile, this.selectedLanguage);
        cheddar.startCapture();
        this.responses = [];
        this.currentResponseIndex = -1;
        this.currentView = 'assistant';
    }

    async handleClose() {
        if (this.currentView === 'customize' || this.currentView === 'help') {
            this.currentView = 'main';
        } else if (this.currentView === 'assistant') {
            cheddar.stopCapture();

            // Close the session
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('close-session');
            this.sessionActive = false;
            this.currentView = 'main';
            console.log('Session closed');
        } else {
            // Quit the entire application
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('quit-application');
        }
    }

    async openHelp() {
        this.currentView = 'help';
    }

    async openAPIKeyHelp() {
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('open-external', 'https://cheatingdaddy.com/help/api-key'); // TODO
    }

    async openExternalLink(url) {
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('open-external', url);
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = this.shadowRoot.querySelector('.response-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 0);
    }

    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('currentView')) {
            this.scrollToBottom();
        }

        // Notify main process of view change
        if (changedProperties.has('currentView')) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('view-changed', this.currentView);
        }
    }

    async handleSendText() {
        const textInput = this.shadowRoot.querySelector('#textInput');
        if (textInput && textInput.value.trim()) {
            const message = textInput.value.trim();
            textInput.value = ''; // Clear input

            // Send the message
            const result = await cheddar.sendTextMessage(message);

            if (!result.success) {
                // Show error - could add to response area or status
                console.error('Failed to send message:', result.error);
                this.setStatus('Error sending message: ' + result.error);
            } else {
                this.setStatus('Message sent...');
            }
        }
    }

    handleTextKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSendText();
        }
    }

    renderHeader() {
        const titles = {
            main: 'Cheating Daddy',
            customize: 'Customize',
            help: 'Help & Shortcuts',
            assistant: 'Cheating Daddy',
        };

        let elapsedTime = '';
        if (this.currentView === 'assistant' && this.startTime) {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            elapsedTime = `${elapsed}s`;
        }

        return html`
            <div class="header">
                <div class="header-title">${titles[this.currentView]}</div>
                <div class="header-actions">
                    ${this.currentView === 'assistant'
                        ? html`
                              <span>${elapsedTime}</span>
                              <span>${this.statusText}</span>
                          `
                        : ''}
                    ${this.currentView === 'main'
                        ? html`
                              <button class="icon-button" @click=${() => (this.currentView = 'customize')}>
                                  <?xml version="1.0" encoding="UTF-8"?><svg
                                      width="24px"
                                      height="24px"
                                      stroke-width="1.7"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                      color="currentColor"
                                  >
                                      <path
                                          d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
                                          stroke="currentColor"
                                          stroke-width="1.7"
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                      ></path>
                                      <path
                                          d="M19.6224 10.3954L18.5247 7.7448L20 6L18 4L16.2647 5.48295L13.5578 4.36974L12.9353 2H10.981L10.3491 4.40113L7.70441 5.51596L6 4L4 6L5.45337 7.78885L4.3725 10.4463L2 11V13L4.40111 13.6555L5.51575 16.2997L4 18L6 20L7.79116 18.5403L10.397 19.6123L11 22H13L13.6045 19.6132L16.2551 18.5155C16.6969 18.8313 18 20 18 20L20 18L18.5159 16.2494L19.6139 13.598L21.9999 12.9772L22 11L19.6224 10.3954Z"
                                          stroke="currentColor"
                                          stroke-width="1.7"
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                      ></path>
                                  </svg>
                              </button>
                              <button class="icon-button" @click=${this.openHelp}>
                                  <?xml version="1.0" encoding="UTF-8"?><svg
                                      width="24px"
                                      height="24px"
                                      stroke-width="1.7"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                      color="currentColor"
                                  >
                                      <path
                                          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                                          stroke="currentColor"
                                          stroke-width="1.7"
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                      ></path>
                                      <path
                                          d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999"
                                          stroke="currentColor"
                                          stroke-width="1.7"
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                      ></path>
                                      <path
                                          d="M12 18.01L12.01 17.9989"
                                          stroke="currentColor"
                                          stroke-width="1.7"
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                      ></path>
                                  </svg>
                              </button>
                          `
                        : ''}
                    ${this.currentView === 'assistant'
                        ? html`
                              <button @click=${this.handleClose} class="button window-close">
                                  Back&nbsp;&nbsp;<span class="key" style="pointer-events: none;">${cheddar.isMacOS ? 'Cmd' : 'Ctrl'}</span>&nbsp;&nbsp;<span class="key"
                                      >&bsol;</span
                                  >
                              </button>
                          `
                        : html`
                              <button @click=${this.handleClose} class="icon-button window-close">
                                  <?xml version="1.0" encoding="UTF-8"?><svg
                                      width="24px"
                                      height="24px"
                                      stroke-width="1.7"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                      color="currentColor"
                                  >
                                      <path
                                          d="M6.75827 17.2426L12.0009 12M17.2435 6.75736L12.0009 12M12.0009 12L6.75827 6.75736M12.0009 12L17.2435 17.2426"
                                          stroke="currentColor"
                                          stroke-width="1.7"
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                      ></path>
                                  </svg>
                              </button>
                          `}
                </div>
            </div>
        `;
    }

    renderMainView() {
        return html`
            <div style="height: 100%; display: flex; flex-direction: column; width: 100%; max-width: 500px;">
                <div class="welcome">Welcome</div>

                <div class="input-group">
                    <input
                        type="password"
                        placeholder="Enter your Gemini API Key"
                        .value=${localStorage.getItem('apiKey') || ''}
                        @input=${e => this.handleInput(e, 'apiKey')}
                    />
                    <button @click=${this.handleStart} class="button start-button">Start Session</button>
                </div>
                <p class="description">
                    dont have an api key?
                    <span @click=${this.openAPIKeyHelp} class="link">get one here</span>
                </p>
            </div>
        `;
    }

    renderCustomizeView() {
        const profiles = [
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

        const languages = [
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

        const profileNames = {
            interview: 'Job Interview',
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
        };

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
                    <span class="option-label">AI Behavior for ${profileNames[this.selectedProfile] || 'Selected Profile'}</span>
                    <textarea
                        placeholder="Describe how you want the AI to behave..."
                        .value=${localStorage.getItem('customPrompt') || ''}
                        class="custom-prompt-textarea"
                        rows="4"
                        @input=${e => this.handleInput(e, 'customPrompt')}
                    ></textarea>
                    <div class="description">
                        This custom prompt will be added to the ${profileNames[this.selectedProfile] || 'selected profile'} instructions to
                        personalize the AI's behavior.
                    </div>
                </div>
            </div>
        `;
    }

    renderHelpView() {
        return html`
            <div>
                <div class="option-group">
                    <span class="option-label">Community & Support</span>
                    <div class="description">
                        <span @click=${() => this.openExternalLink('https://github.com/sohzm/cheating-daddy')} class="link">📂 GitHub Repository</span
                        ><br />
                        <span @click=${() => this.openExternalLink('https://discord.gg/GCBdubnXfJ')} class="link">💬 Join Discord Community</span>
                    </div>
                </div>

                <div class="option-group">
                    <span class="option-label">Keyboard Shortcuts</span>
                    <div class="description">
                        <strong>Window Movement:</strong><br />
                        <span class="key">${cheddar.isMacOS ? 'Option' : 'Ctrl'}</span> + Arrow Keys - Move the window in 45px increments<br /><br />

                        <strong>Window Control:</strong><br />
                        <span class="key">${cheddar.isMacOS ? 'Cmd' : 'Ctrl'}</span> + <span class="key">M</span> - Toggle mouse events (click-through
                        mode)<br />
                        <span class="key">${cheddar.isMacOS ? 'Cmd' : 'Ctrl'}</span> + <span class="key">&bsol;</span> - Close window or go back<br /><br />

                        <strong>Text Input:</strong><br />
                        <span class="key">Enter</span> - Send text message to AI<br />
                        <span class="key">Shift</span> + <span class="key">Enter</span> - New line in text input
                    </div>
                </div>

                <div class="option-group">
                    <span class="option-label">How to Use</span>
                    <div class="description">
                        1. <strong>Start a Session:</strong> Enter your Gemini API key and click "Start Session"<br />
                        2. <strong>Customize:</strong> Choose your profile and language in the settings<br />
                        3. <strong>Position Window:</strong> Use keyboard shortcuts to move the window to your desired location<br />
                        4. <strong>Click-through Mode:</strong> Use <span class="key">${cheddar.isMacOS ? 'Cmd' : 'Ctrl'}</span> +
                        <span class="key">M</span> to make the window click-through<br />
                        5. <strong>Get AI Help:</strong> The AI will analyze your screen and audio to provide assistance<br />
                        6. <strong>Text Messages:</strong> Type questions or requests to the AI using the text input
                    </div>
                </div>

                <div class="option-group">
                    <span class="option-label">Supported Profiles</span>
                    <div class="description">
                        <strong>Job Interview:</strong> Get help with interview questions and responses<br />
                        <strong>Sales Call:</strong> Assistance with sales conversations and objection handling<br />
                        <strong>Business Meeting:</strong> Support for professional meetings and discussions<br />
                        <strong>Presentation:</strong> Help with presentations and public speaking<br />
                        <strong>Negotiation:</strong> Guidance for business negotiations and deals
                    </div>
                </div>

                <div class="option-group">
                    <span class="option-label">Audio Input</span>
                    <div class="description">
                        ${cheddar.isMacOS 
                            ? html`<strong>macOS:</strong> Uses SystemAudioDump for system audio capture`
                            : cheddar.isLinux
                              ? html`<strong>Linux:</strong> Uses microphone input`
                              : html`<strong>Windows:</strong> Uses loopback audio capture`}<br />
                        The AI listens to conversations and provides contextual assistance based on what it hears.
                    </div>
                </div>
            </div>
        `;
    }

    renderAssistantView() {
        let audioInput = 'Microphone';
        if (cheddar.isMacOS) {
            audioInput = 'SystemAudioDump';
        } else if (cheddar.isLinux) {
            audioInput = 'Microphone';
        } else {
            audioInput = 'Loopback Audio';
        }

        const profileNames = {
            interview: 'Job Interview',
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
        };

        const activeInputs = [audioInput, 'Screen'];

        // Get current response or default message
        const currentResponse =
            this.responses.length > 0 && this.currentResponseIndex >= 0
                ? this.responses[this.currentResponseIndex]
                : `Hey, Im listening to your ${profileNames[this.selectedProfile] || 'session'}?`;

        // Response counter text
        const responseCounter = this.responses.length > 0 ? `${this.currentResponseIndex + 1}/${this.responses.length}` : '';

        return html`
            <div style="height: 100%; display: flex; flex-direction: column;">
                <div class="response-container">${currentResponse}</div>

                <div class="text-input-container">
                    <button
                        class="nav-button"
                        @click=${this.navigateToPreviousResponse}
                        ?disabled=${this.currentResponseIndex <= 0}
                    >
                        ←
                    </button>

                    ${this.responses.length > 0 ? html` <span class="response-counter">${responseCounter}</span> ` : ''}

                    <input type="text" id="textInput" placeholder="Type a message to the AI..." @keydown=${this.handleTextKeydown} />

                    <button
                        class="nav-button"
                        @click=${this.navigateToNextResponse}
                        ?disabled=${this.currentResponseIndex >= this.responses.length - 1}
                    >
                        →
                    </button>
                </div>
            </div>
        `;
    }

    navigateToPreviousResponse() {
        if (this.currentResponseIndex > 0) {
            this.currentResponseIndex--;
        }
    }

    navigateToNextResponse() {
        if (this.currentResponseIndex < this.responses.length - 1) {
            this.currentResponseIndex++;
        }
    }

    render() {
        const views = {
            main: this.renderMainView(),
            customize: this.renderCustomizeView(),
            help: this.renderHelpView(),
            assistant: this.renderAssistantView(),
        };

        return html`
            <div class="window-container">
                <div class="container">
                    ${this.renderHeader()}
                    <div class="main-content">${views[this.currentView]}</div>
                </div>
            </div>
        `;
    }
}

customElements.define('cheating-daddy-app', CheatingDaddyApp);
