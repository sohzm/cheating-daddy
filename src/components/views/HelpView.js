import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class HelpView extends LitElement {
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

        .description {
            color: var(--description-color);
            font-size: 14px;
            margin-bottom: 24px;
            line-height: 1.5;
        }

        .link {
            color: var(--link-color);
            text-decoration: underline;
            cursor: pointer;
        }

        .key {
            background: var(--key-background);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            margin: 0px;
        }
    `;

    static properties = {
        onExternalLinkClick: { type: Function }
    };

    constructor() {
        super();
        this.onExternalLinkClick = () => {};
    }

    handleExternalLinkClick(url) {
        this.onExternalLinkClick(url);
    }

    render() {
        const isMacOS = window.cheddar?.isMacOS || false;
        const isLinux = window.cheddar?.isLinux || false;

        return html`
            <div>
                <div class="option-group">
                    <span class="option-label">Community & Support</span>
                    <div class="description">
                        <span @click=${() => this.handleExternalLinkClick('https://github.com/sohzm/cheating-daddy')} class="link">📂 GitHub Repository</span><br />
                        <span @click=${() => this.handleExternalLinkClick('https://discord.gg/GCBdubnXfJ')} class="link">💬 Join Discord Community</span>
                    </div>
                </div>

                <div class="option-group">
                    <span class="option-label">Keyboard Shortcuts</span>
                    <div class="description">
                        <strong>Window Movement:</strong><br />
                        <span class="key">${isMacOS ? 'Option' : 'Ctrl'}</span> + Arrow Keys - Move the window in 45px increments<br /><br />

                        <strong>Window Control:</strong><br />
                        <span class="key">${isMacOS ? 'Cmd' : 'Ctrl'}</span> + <span class="key">M</span> - Toggle mouse events (click-through mode)<br />
                        <span class="key">${isMacOS ? 'Cmd' : 'Ctrl'}</span> + <span class="key">&bsol;</span> - Close window or go back<br /><br />

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
                        4. <strong>Click-through Mode:</strong> Use <span class="key">${isMacOS ? 'Cmd' : 'Ctrl'}</span> +
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
                        ${isMacOS
                            ? html`<strong>macOS:</strong> Uses SystemAudioDump for system audio capture`
                            : isLinux
                            ? html`<strong>Linux:</strong> Uses microphone input`
                            : html`<strong>Windows:</strong> Uses loopback audio capture`}<br />
                        The AI listens to conversations and provides contextual assistance based on what it hears.
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('help-view', HelpView); 