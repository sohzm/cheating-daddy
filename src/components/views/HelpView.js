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
            padding: 0;
        }

        .help-container {
            display: flex;
            flex-direction: column;
        }

        .option-group {
            padding: 16px 12px;
            border-bottom: 1px solid var(--border-color);
        }

        .option-group:last-child {
            border-bottom: none;
        }

        .option-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }

        .description {
            color: var(--text-secondary);
            font-size: 12px;
            line-height: 1.4;
            user-select: text;
            cursor: text;
        }

        .description strong {
            color: var(--text-color);
            font-weight: 500;
        }

        .link {
            color: var(--text-color);
            text-decoration: underline;
            text-underline-offset: 2px;
            cursor: pointer;
        }

        .key {
            background: var(--bg-tertiary);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-family: 'SF Mono', Monaco, monospace;
            font-weight: 500;
            margin: 0 1px;
            white-space: nowrap;
        }

        .keyboard-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 12px;
            margin-top: 8px;
        }

        .keyboard-group {
            padding: 10px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .keyboard-group:last-child {
            border-bottom: none;
        }

        .keyboard-group-title {
            font-weight: 600;
            font-size: 12px;
            color: var(--text-color);
            margin-bottom: 8px;
        }

        .shortcut-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
            font-size: 11px;
        }

        .shortcut-description {
            color: var(--text-secondary);
        }

        .shortcut-keys {
            display: flex;
            gap: 2px;
        }

        .profiles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 8px;
            margin-top: 8px;
        }

        .profile-item {
            padding: 8px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .profile-item:last-child {
            border-bottom: none;
        }

        .profile-name {
            font-weight: 500;
            font-size: 12px;
            color: var(--text-color);
            margin-bottom: 2px;
        }

        .profile-description {
            font-size: 11px;
            color: var(--text-muted);
            line-height: 1.3;
        }

        .community-links {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .community-link {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            background: transparent;
            border: 1px solid var(--border-color);
            border-radius: 3px;
            color: var(--text-color);
            font-size: 11px;
            font-weight: 500;
            transition: background 0.1s ease;
            cursor: pointer;
        }

        .community-link:hover {
            background: var(--hover-background);
        }

        .community-link svg {
            width: 14px;
            height: 14px;
            flex-shrink: 0;
        }

        .usage-steps {
            counter-reset: step-counter;
        }

        .usage-step {
            counter-increment: step-counter;
            position: relative;
            padding-left: 24px;
            margin-bottom: 8px;
            font-size: 11px;
            line-height: 1.4;
            color: var(--text-secondary);
        }

        .usage-step::before {
            content: counter(step-counter);
            position: absolute;
            left: 0;
            top: 0;
            width: 16px;
            height: 16px;
            background: var(--bg-tertiary);
            color: var(--text-color);
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 600;
        }

        .usage-step strong {
            color: var(--text-color);
        }
    `;

    static properties = {
        onExternalLinkClick: { type: Function },
        keybinds: { type: Object },
    };

    constructor() {
        super();
        this.onExternalLinkClick = () => {};
        this.keybinds = this.getDefaultKeybinds();
        this._loadKeybinds();
    }

    async _loadKeybinds() {
        try {
            const keybinds = await cheatingDaddy.storage.getKeybinds();
            if (keybinds) {
                this.keybinds = { ...this.getDefaultKeybinds(), ...keybinds };
                this.requestUpdate();
            }
        } catch (error) {
            console.error('Error loading keybinds:', error);
        }
    }

    connectedCallback() {
        super.connectedCallback();
        // Resize window for this view
        resizeLayout();
    }

    getDefaultKeybinds() {
        const isMac = cheatingDaddy.isMacOS || navigator.platform.includes('Mac');
        return {
            moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
            moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
            moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
            moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
            toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
            toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
            nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
            previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
            nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
            scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
            scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
        };
    }

    formatKeybind(keybind) {
        return keybind.split('+').map(key => html`<span class="key">${key}</span>`);
    }

    handleExternalLinkClick(url) {
        this.onExternalLinkClick(url);
    }

    render() {
        const isMacOS = cheatingDaddy.isMacOS || false;
        const isLinux = cheatingDaddy.isLinux || false;

        return html`
            <div class="help-container">
                <div class="option-group">
                    <div class="option-label">
                        <span>Community & Support</span>
                    </div>
                    <div class="community-links">
                        <div class="community-link" @click=${() => this.handleExternalLinkClick('https://cheatingdaddy.com')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14 11.9976C14 9.5059 11.683 7 8.85714 7C8.52241 7 7.41904 7.00001 7.14286 7.00001C4.30254 7.00001 2 9.23752 2 11.9976C2 14.376 3.70973 16.3664 6 16.8714C6.36756 16.9525 6.75006 16.9952 7.14286 16.9952"></path>
                                <path d="M10 11.9976C10 14.4893 12.317 16.9952 15.1429 16.9952C15.4776 16.9952 16.581 16.9952 16.8571 16.9952C19.6975 16.9952 22 14.7577 22 11.9976C22 9.6192 20.2903 7.62884 18 7.12383C17.6324 7.04278 17.2499 6.99999 16.8571 6.99999"></path>
                            </svg>
                            Website
                        </div>
                        <div class="community-link" @click=${() => this.handleExternalLinkClick('https://github.com/sohzm/cheating-daddy')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M16 22.0268V19.1568C16.0375 18.68 15.9731 18.2006 15.811 17.7506C15.6489 17.3006 15.3929 16.8902 15.06 16.5468C18.2 16.1968 21.5 15.0068 21.5 9.54679C21.4997 8.15062 20.9627 6.80799 20 5.79679C20.4558 4.5753 20.4236 3.22514 19.91 2.02679C19.91 2.02679 18.73 1.67679 16 3.50679C13.708 2.88561 11.292 2.88561 8.99999 3.50679C6.26999 1.67679 5.08999 2.02679 5.08999 2.02679C4.57636 3.22514 4.54413 4.5753 4.99999 5.79679C4.03011 6.81549 3.49251 8.17026 3.49999 9.57679C3.49999 14.9968 6.79998 16.1868 9.93998 16.5768C9.61098 16.9168 9.35725 17.3222 9.19529 17.7667C9.03334 18.2112 8.96679 18.6849 8.99999 19.1568V22.0268"></path>
                                <path d="M9 20.0267C6 20.9999 3.5 20.0267 2 17.0267"></path>
                            </svg>
                            GitHub
                        </div>
                        <div class="community-link" @click=${() => this.handleExternalLinkClick('https://discord.gg/GCBdubnXfJ')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M5.5 16C10.5 18.5 13.5 18.5 18.5 16"></path>
                                <path d="M15.5 17.5L16.5 19.5C16.5 19.5 20.6713 18.1717 22 16C22 15 22.5301 7.85339 19 5.5C17.5 4.5 15 4 15 4L14 6H12"></path>
                                <path d="M8.52832 17.5L7.52832 19.5C7.52832 19.5 3.35699 18.1717 2.02832 16C2.02832 15 1.49823 7.85339 5.02832 5.5C6.52832 4.5 9.02832 4 9.02832 4L10.0283 6H12.0283"></path>
                                <path d="M8.5 14C7.67157 14 7 13.1046 7 12C7 10.8954 7.67157 10 8.5 10C9.32843 10 10 10.8954 10 12C10 13.1046 9.32843 14 8.5 14Z"></path>
                                <path d="M15.5 14C14.6716 14 14 13.1046 14 12C14 10.8954 14.6716 10 15.5 10C16.3284 10 17 10.8954 17 12C17 13.1046 16.3284 14 15.5 14Z"></path>
                            </svg>
                            Discord
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
                    <div class="description" style="margin-top: 12px; text-align: center;">
                        You can customize these shortcuts in Settings.
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
                        <span>Audio Input</span>
                    </div>
                    <div class="description">The AI listens to conversations and provides contextual assistance based on what it hears.</div>
                </div>
            </div>
        `;
    }
}

customElements.define('help-view', HelpView);
