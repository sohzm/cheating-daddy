import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class HelpView extends LitElement {
    static styles = css`
        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            padding: 12px;
        }

        .help-container {
            display: grid;
            gap: 12px;
            padding-bottom: 20px;
        }

        .option-group {
            background: var(--card-background, rgba(255, 255, 255, 0.04));
            border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
            border-radius: 6px;
            padding: 16px;
            backdrop-filter: blur(10px);
        }

        .option-label {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            color: var(--text-color);
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .option-label::before {
            content: '';
            width: 3px;
            height: 14px;
            background: var(--accent-color, #007aff);
            border-radius: 1.5px;
        }

        .description {
            color: var(--description-color, rgba(255, 255, 255, 0.75));
            font-size: 12px;
            line-height: 1.4;
            user-select: text;
            cursor: default;
        }

        .description strong {
            color: var(--text-color);
            font-weight: 500;
            user-select: text;
        }

        .description br {
            margin-bottom: 3px;
        }

        .link {
            color: var(--link-color, #007aff);
            text-decoration: none;
            cursor: default;
            transition: color 0.15s ease;
            user-select: text;
        }

        .link:hover {
            color: var(--link-hover-color, #0056b3);
            text-decoration: underline;
        }

        .key {
            background: var(--key-background, rgba(0, 0, 0, 0.3));
            color: var(--text-color);
            border: 1px solid var(--key-border, rgba(255, 255, 255, 0.15));
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
            font-weight: 500;
            margin: 0 1px;
            white-space: nowrap;
            user-select: text;
            cursor: default;
        }

        .keyboard-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 12px;
            margin-top: 8px;
        }

        .keyboard-group {
            background: var(--input-background, rgba(0, 0, 0, 0.2));
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.1));
            border-radius: 4px;
            padding: 10px;
        }

        .keyboard-group-title {
            font-weight: 600;
            font-size: 12px;
            color: var(--text-color);
            margin-bottom: 6px;
            padding-bottom: 3px;
        }

        .shortcut-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 3px 0;
            font-size: 11px;
        }

        .shortcut-description {
            color: var(--description-color, rgba(255, 255, 255, 0.7));
            user-select: text;
            cursor: default;
        }

        .shortcut-keys {
            display: flex;
            gap: 2px;
        }

        .profiles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 8px;
        }

        .profile-item {
            background: var(--input-background, rgba(0, 0, 0, 0.2));
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.1));
            border-radius: 4px;
            padding: 8px;
        }

        .profile-name {
            font-weight: 600;
            font-size: 12px;
            color: var(--text-color);
            margin-bottom: 3px;
            user-select: text;
            cursor: default;
        }

        .profile-description {
            font-size: 10px;
            color: var(--description-color, rgba(255, 255, 255, 0.6));
            line-height: 1.3;
            user-select: text;
            cursor: default;
        }

        .community-links {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .community-link {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            background: var(--input-background, rgba(0, 0, 0, 0.2));
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.1));
            border-radius: 4px;
            text-decoration: none;
            color: var(--link-color, #007aff);
            font-size: 11px;
            font-weight: 500;
            transition: all 0.15s ease;
            cursor: default;
        }

        .community-link:hover {
            background: var(--input-hover-background, rgba(0, 0, 0, 0.3));
            border-color: var(--link-color, #007aff);
        }

        .usage-steps {
            counter-reset: step-counter;
        }

        .usage-step {
            counter-increment: step-counter;
            position: relative;
            padding-left: 24px;
            margin-bottom: 6px;
            font-size: 11px;
            line-height: 1.3;
            user-select: text;
            cursor: default;
        }

        .usage-step::before {
            content: counter(step-counter);
            position: absolute;
            left: 0;
            top: 0;
            width: 16px;
            height: 16px;
            background: var(--link-color, #007aff);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: 600;
        }

        .usage-step strong {
            color: var(--text-color);
            user-select: text;
        }

        /* Advanced Mode Section Styles */
        .advanced-section {
            border-color: var(--danger-border, rgba(239, 68, 68, 0.3));
            background: var(--danger-background, rgba(239, 68, 68, 0.05));
        }

        .advanced-label {
            color: var(--danger-color, #ef4444);
        }

        .advanced-label::before {
            background: var(--danger-color, #ef4444) !important;
        }

        .feature-cards {
            display: grid;
            gap: 10px;
            margin-top: 8px;
        }

        .feature-card {
            background: var(--input-background, rgba(0, 0, 0, 0.2));
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.1));
            border-radius: 6px;
            padding: 12px;
        }

        .feature-card-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-weight: 600;
            font-size: 12px;
            color: var(--text-color);
        }

        .feature-card-icon {
            font-size: 14px;
        }

        .feature-card-list {
            margin: 0;
            padding-left: 20px;
            font-size: 11px;
            color: var(--description-color, rgba(255, 255, 255, 0.7));
            line-height: 1.5;
        }

        .feature-card-list li {
            margin-bottom: 4px;
        }

        .feature-card-list li:last-child {
            margin-bottom: 0;
        }

        .feature-card-list strong {
            color: var(--text-color);
        }

        .advanced-warning {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin-top: 12px;
            padding: 10px;
            background: var(--danger-background, rgba(239, 68, 68, 0.1));
            border: 1px solid var(--danger-border, rgba(239, 68, 68, 0.2));
            border-radius: 4px;
            font-size: 11px;
            color: var(--danger-color, #ef4444);
            line-height: 1.4;
        }

        .advanced-warning-icon {
            flex-shrink: 0;
        }

        .advanced-intro {
            font-size: 12px;
            color: var(--description-color, rgba(255, 255, 255, 0.75));
            margin-bottom: 12px;
            line-height: 1.4;
        }

        .advanced-intro strong {
            color: var(--accent-color, #007aff);
        }
    `;

    static properties = {
        onExternalLinkClick: { type: Function },
        keybinds: { type: Object },
        advancedModeEnabled: { type: Boolean },
    };

    constructor() {
        super();
        this.onExternalLinkClick = () => {};
        this.keybinds = this.getDefaultKeybinds();
        this.advancedModeEnabled = false;
        this.loadKeybinds();
        this.loadAdvancedModeSettings();
    }

    connectedCallback() {
        super.connectedCallback();
        // Resize window for this view
        resizeLayout();
    }

    getDefaultKeybinds() {
        const isMac = cheddar.isMacOS || navigator.platform.includes('Mac');
        return {
            moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
            moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
            moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
            moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
            toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
            toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
            toggleMicrophone: isMac ? 'Cmd+Shift+M' : 'Ctrl+Shift+M',
            nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
            previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
            nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
            scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
            scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
            copyCodeBlocks: isMac ? 'Cmd+Shift+C' : 'Ctrl+Shift+C',
        };
    }

    loadKeybinds() {
        const savedKeybinds = localStorage.getItem('customKeybinds');
        if (savedKeybinds) {
            try {
                this.keybinds = { ...this.getDefaultKeybinds(), ...JSON.parse(savedKeybinds) };
            } catch (e) {
                console.error('Failed to parse saved keybinds:', e);
                this.keybinds = this.getDefaultKeybinds();
            }
        }
    }

    loadAdvancedModeSettings() {
        const savedAdvancedMode = localStorage.getItem('advancedMode');
        this.advancedModeEnabled = savedAdvancedMode === 'true';
    }

    formatKeybind(keybind) {
        return keybind.split('+').map(key => html`<span class="key">${key}</span>`);
    }

    handleExternalLinkClick(url) {
        this.onExternalLinkClick(url);
    }

    render() {
        const isMacOS = cheddar.isMacOS || false;
        const isLinux = cheddar.isLinux || false;

        return html`
            <div class="help-container">
                <div class="option-group">
                    <div class="option-label">
                        <span>Community & Support</span>
                    </div>
                    <div class="community-links">
                        <div class="community-link" @click=${() => this.handleExternalLinkClick('https://cheatingdaddy.com')}>
                            🌐 Official Website
                        </div>
                        <div class="community-link" @click=${() => this.handleExternalLinkClick('https://github.com/sohzm/cheating-daddy')}>
                            📂 GitHub Repository
                        </div>
                        <div class="community-link" @click=${() => this.handleExternalLinkClick('https://discord.gg/GCBdubnXfJ')}>
                            💬 Discord Community
                        </div>
                    </div>
                </div>

                <div class="option-group">
                    <div class="option-label">
                        <span>Keyboard Shortcuts</span>
                    </div>
                    <div class="keyboard-section">
                        <div class="keyboard-group">
                            <div class="keyboard-group-title">Window Movement</div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Move window up</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.moveUp)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Move window down</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.moveDown)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Move window left</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.moveLeft)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Move window right</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.moveRight)}</div>
                            </div>
                        </div>

                        <div class="keyboard-group">
                            <div class="keyboard-group-title">Window Control</div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Toggle click-through mode</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.toggleClickThrough)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Toggle window visibility</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.toggleVisibility)}</div>
                            </div>
                        </div>

                        <div class="keyboard-group">
                            <div class="keyboard-group-title">AI Actions</div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Take screenshot and ask for next step</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.nextStep)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Toggle microphone (Manual VAD mode only)</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.toggleMicrophone)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Clear session and restart</span>
                                <div class="shortcut-keys">${this.formatKeybind(isMacOS ? 'Cmd+Alt+R' : 'Ctrl+Alt+R')}</div>
                            </div>
                        </div>

                        <div class="keyboard-group">
                            <div class="keyboard-group-title">Response Navigation</div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Previous response</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.previousResponse)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Next response</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.nextResponse)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Scroll response up</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.scrollUp)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Scroll response down</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.scrollDown)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Copy AI response</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.copyCodeBlocks)}</div>
                            </div>
                        </div>

                        <div class="keyboard-group">
                            <div class="keyboard-group-title">Text Input</div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Send message to AI</span>
                                <div class="shortcut-keys"><span class="key">Enter</span></div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">New line in text input</span>
                                <div class="shortcut-keys"><span class="key">Shift</span><span class="key">Enter</span></div>
                            </div>
                        </div>
                    </div>
                    <div class="description" style="margin-top: 12px; font-style: italic; text-align: center;">
                        💡 You can customize these shortcuts in the Settings page!
                    </div>
                </div>

                <div class="option-group">
                    <div class="option-label">
                        <span>How to Use</span>
                    </div>
                    <div class="usage-steps">
                        <div class="usage-step"><strong>Start a Session:</strong> Enter your Gemini API key and click "Start Session"</div>
                        <div class="usage-step"><strong>Customize:</strong> Choose your profile and language in the settings</div>
                        <div class="usage-step">
                            <strong>Position Window:</strong> Use keyboard shortcuts to move the window to your desired location
                        </div>
                        <div class="usage-step">
                            <strong>Click-through Mode:</strong> Use ${this.formatKeybind(this.keybinds.toggleClickThrough)} to make the window
                            click-through
                        </div>
                        <div class="usage-step"><strong>Get AI Help:</strong> The AI will analyze your screen and audio to provide assistance</div>
                        <div class="usage-step"><strong>Text Messages:</strong> Type questions or requests to the AI using the text input</div>
                        <div class="usage-step">
                            <strong>Navigate Responses:</strong> Use ${this.formatKeybind(this.keybinds.previousResponse)} and
                            ${this.formatKeybind(this.keybinds.nextResponse)} to browse through AI responses
                        </div>
                    </div>
                </div>

                <div class="option-group">
                    <div class="option-label">
                        <span>Supported Profiles</span>
                    </div>
                    <div class="profiles-grid">
                        <div class="profile-item">
                            <div class="profile-name">Job Interview</div>
                            <div class="profile-description">Get help with interview questions and responses</div>
                        </div>
                        <div class="profile-item">
                            <div class="profile-name">Sales Call</div>
                            <div class="profile-description">Assistance with sales conversations and objection handling</div>
                        </div>
                        <div class="profile-item">
                            <div class="profile-name">Business Meeting</div>
                            <div class="profile-description">Support for professional meetings and discussions</div>
                        </div>
                        <div class="profile-item">
                            <div class="profile-name">Presentation</div>
                            <div class="profile-description">Help with presentations and public speaking</div>
                        </div>
                        <div class="profile-item">
                            <div class="profile-name">Negotiation</div>
                            <div class="profile-description">Guidance for business negotiations and deals</div>
                        </div>
                        <div class="profile-item">
                            <div class="profile-name">Exam Assistant</div>
                            <div class="profile-description">Academic assistance for test-taking and exam questions</div>
                        </div>
                    </div>
                </div>

                <div class="option-group">
                    <div class="option-label">
                        <span>Audio Input & VAD Modes</span>
                    </div>
                    <div class="description">
                        The AI listens to conversations and provides contextual assistance based on what it hears.<br /><br />
                        <strong>Two VAD (Voice Activity Detection) Modes:</strong><br />
                        • <strong>Automatic Mode:</strong> AI continuously listens and responds automatically when speech is detected<br />
                        • <strong>Manual Mode:</strong> You control when the microphone is active. Use ${this.formatKeybind(this.keybinds.toggleMicrophone)} to toggle the mic ON/OFF during interview sessions. When toggled OFF, the AI generates a response based on the complete recorded question.<br /><br />
                    </div>
                </div>

                ${this.advancedModeEnabled ? html`
                <div class="option-group advanced-section">
                    <div class="option-label advanced-label">
                        <span>Advanced Mode</span>
                    </div>
                    <div class="advanced-intro">
                        <strong>Advanced Mode is enabled.</strong> Access the <strong>Advanced</strong> tab in the navigation bar to configure these features.
                    </div>

                    <div class="feature-cards">
                        <div class="feature-card">
                            <div class="feature-card-header">
                                <span class="feature-card-icon"></span>
                                <span>Content Protection</span>
                            </div>
                            <ul class="feature-card-list">
                                <li>Makes the app <strong>invisible to screen sharing</strong> and recording software</li>
                                <li>Useful for <strong>privacy during screen share</strong> sessions</li>
                                <li>Can be toggled on/off (may need restart for some display setups)</li>
                            </ul>
                        </div>

                        <div class="feature-card">
                            <div class="feature-card-header">
                                <span class="feature-card-icon"></span>
                                <span>Model Generation Settings</span>
                            </div>
                            <ul class="feature-card-list">
                                <li><strong>Temperature:</strong> Controls response randomness (0 = precise, 2 = creative)</li>
                                <li><strong>Top-P:</strong> Controls token diversity via nucleus sampling</li>
                                <li><strong>Max Output Tokens:</strong> Set maximum response length per model</li>
                                <li>Settings are <strong>saved per-model</strong> (Gemini 2.5 Flash, Gemini 3 Pro, Llama 4, etc.)</li>
                            </ul>
                        </div>

                        <div class="feature-card">
                            <div class="feature-card-header">
                                <span class="feature-card-icon"></span>
                                <span>Data Management</span>
                            </div>
                            <ul class="feature-card-list">
                                <li><strong>Clear All Local Data:</strong> Permanently erase all settings, API keys, and cached data</li>
                                <li>Useful for <strong>privacy or troubleshooting</strong></li>
                                <li>App will close automatically after clearing</li>
                            </ul>
                        </div>
                    </div>

                    <div class="advanced-warning">
                        <span class="advanced-warning-icon">⚠️</span>
                        <span>Changing model parameters may affect AI response quality. Use "Reset to Defaults" if unsure.</span>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }
}

customElements.define('help-view', HelpView);
