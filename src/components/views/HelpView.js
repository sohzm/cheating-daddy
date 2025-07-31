import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';
import  language  from '../../lang/language_module.mjs';
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
            cursor: text;
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
            cursor: pointer;
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
            cursor: text;
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
            cursor: text;
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
            cursor: text;
        }

        .profile-description {
            font-size: 10px;
            color: var(--description-color, rgba(255, 255, 255, 0.6));
            line-height: 1.3;
            user-select: text;
            cursor: text;
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
            cursor: pointer;
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
            cursor: text;
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
    `;

    static properties = {
        onExternalLinkClick: { type: Function },
        keybinds: { type: Object },
        Help_Community: { type: String },
        Help_Website: { type: String },
        Help_Repository: { type: String },
        Help_Discord: { type: String },
        Help_Keyboard: { type: String },
        Help_How: { type: String },
        Help_Start: { type: String },
        Help_Customize: { type: String },
        Help_Position: { type: String },
        Help_Click: { type: String },
        Help_Click2: { type: String },
        Help_Text: { type: String },
        Help_Navigate: { type: String },
        Help_and: { type: String },
        Help_browse: { type: String },
        Help_Supported: { type: String },
        Help_Get_help: { type: String },
        Help_Assistance: { type: String },
        Help_Support: { type: String },
        Help_Help_with_presentations: { type: String },
        Help_Guidance: { type: String },
        Help_Academic: { type: String },
        Help_Audio_Input: { type: String },
        Help_The_AI: { type: String },
        Help_You_Can: {type: String},
        Help_Get_AI_Help: {type: String},
        Help_The_AI_will: {type: String},
    };

    constructor() {
        super();
        this.onExternalLinkClick = () => {};
        this.keybinds = this.getDefaultKeybinds();
        this.loadKeybinds();
        this.translate("Main_api").then((lang)=> 
            this.Main_api = lang
        );
        this.translate("Help_Community").then((lang) => {
            this.Help_Community = lang;
        });
        this.translate("Help_Website").then((lang) => {
            this.Help_Website = lang;
        });
        this.translate("Help_Repository").then((lang) => {
            this.Help_Repository = lang;
        });
        this.translate("Help_Discord").then((lang) => {
            this.Help_Discord = lang;
        });
        this.translate("Help_Keyboard").then((lang) => {
            this.Help_Keyboard = lang;
        });
        this.translate("Help_How").then((lang) => {
            this.Help_How = lang;
        });
        this.translate("Help_Start").then((lang) => {
            this.Help_Start = lang;
        });
        this.translate("Help_Customize").then((lang) => {
            this.Help_Customize = lang;
        });
        this.translate("Help_Position").then((lang) => {
            this.Help_Position = lang;

        });
        this.translate("Help_Click").then((lang) => {
            this.Help_Click = lang;
        });
        this.translate("Help_Click2").then((lang) => {
            this.Help_Click2 = lang;
        });
        this.translate("Help_Text").then((lang) => {
            this.Help_Text = lang;
        });
        this.translate("Help_Navigate").then((lang) => {
            this.Help_Navigate = lang;
        });
        this.translate("Help_and").then((lang) => {
            this.Help_and = lang;
        });
        this.translate("Help_browse").then((lang) => {
            this.Help_browse = lang;
        });
        this.translate("Help_Supported").then((lang) => {
            this.Help_Supported = lang;
        });
        this.translate("Help_Get_help").then((lang) => {
            this.Help_Get_help = lang;
        });
        this.translate("Help_Assistance").then((lang) => {
            this.Help_Assistance = lang;
        });
        this.translate("Help_Support").then((lang) => {
            this.Help_Support = lang;
        });
        this.translate("Help_Help_with_presentations").then((lang) => {
            this.Help_Help_with_presentations = lang;
        });
        this.translate("Help_Guidance").then((lang) => {
            this.Help_Guidance = lang;
        });
        this.translate("Help_Academic").then((lang) => {
            this.Help_Academic = lang;
        });
        this.translate("Help_Audio_Input").then((lang) => {
            this.Help_Audio_Input = lang;
        });
        this.translate("Help_The_AI").then((lang) => {
            this.Help_The_AI = lang;
        });
        this.translate("Help_You_Can").then((lang) => {
            this.Help_You_Can = lang;
        });
        this.translate("Help_Get_AI_Help").then((lang) => {
            this.Help_Get_AI_Help = lang;
        });
        this.translate("Help_The_AI_will").then((lang) => {
            this.Help_The_AI_will = lang;
        });
    }



    /**
    * Translates a specified key into a localized message, using the current system language.
    * @async
    * @function translate
    * @param {string} key - Message key to translate.
    * Expected values:
    * 'Main_api', 'Main_GetApi', 'Main_Welcome',
    * 'Main_APIKey', 'Main_Start'.
    * If the key does not match, 'unknowledge' will be used as the default key.
    * @returns {Promise<string>} - Returns a Promise that resolves to the translated text
    * corresponding to the provided key.
    * If the text is not found, 'Unknowledge' is returned.
    * @example
    * const message = await translate("Main_Welcome");
    * console. log(message); // "Welcome to the app" (depends on the current language)
    */
    async translate(key) {
    //await new Promise(resolve => setTimeout(resolve, 500));
    let temp = ''; // Usa 'let' si vas a reasignar
    switch (key) {
            case 'Help_Community':
                temp = await language.getMessages("Help_Community", language.getLanguage() || 'en-US');
                break;
            case 'Help_Website':
                temp = await language.getMessages("Help_Website", language.getLanguage() || 'en-US');
                break;
            case 'Help_Repository':
                temp = await language.getMessages("Help_Repository", language.getLanguage() || 'en-US');
                break;
            case 'Help_Discord':
                temp = await language.getMessages("Help_Discord", language.getLanguage() || 'en-US');
                break;
            case 'Help_Keyboard':
                temp = await language.getMessages("Help_Keyboard", language.getLanguage() || 'en-US');
                break;
            case 'Help_How':
                temp = await language.getMessages("Help_How", language.getLanguage() || 'en-US');
                break;
            case 'Help_Start':
                temp = await language.getMessages("Help_Start", language.getLanguage() || 'en-US');
                break;
            case 'Help_Customize':
                temp = await language.getMessages("Help_Customize", language.getLanguage() || 'en-US');
                break;
            case 'Help_Position':
                temp = await language.getMessages("Help_Position", language.getLanguage() || 'en-US');
                break;
            case 'Help_Click':
                temp = await language.getMessages("Help_Click", language.getLanguage() || 'en-US');
                break;
            case 'Help_Click2':
                temp = await language.getMessages("Help_Click2", language.getLanguage() || 'en-US');
                break;
            case 'Help_Text':
                temp = await language.getMessages("Help_Text", language.getLanguage() || 'en-US');
                break;
            case 'Help_Navigate':
                temp = await language.getMessages("Help_Navigate", language.getLanguage() || 'en-US');
                break;
            case 'Help_and':
                temp = await language.getMessages("Help_and", language.getLanguage() || 'en-US');
                break;
            case 'Help_browse':
                temp = await language.getMessages("Help_browse", language.getLanguage() || 'en-US');
                break;
            case 'Help_Supported':
                temp = await language.getMessages("Help_Supported", language.getLanguage() || 'en-US');
                break;
            case 'Help_Get_help':
                temp = await language.getMessages("Help_Get_help", language.getLanguage() || 'en-US');
                break;
            case 'Help_Assistance':
                temp = await language.getMessages("Help_Assistance", language.getLanguage() || 'en-US');
                break;
            case 'Help_Support':
                temp = await language.getMessages("Help_Support", language.getLanguage() || 'en-US');
                break;
            case 'Help_Help_with_presentations':
                temp = await language.getMessages("Help_Help_with_presentations", language.getLanguage() || 'en-US');
                break;
            case 'Help_Guidance':
                temp = await language.getMessages("Help_Guidance", language.getLanguage() || 'en-US');
                break;
            case 'Help_Academic':
                temp = await language.getMessages("Help_Academic", language.getLanguage() || 'en-US');
                break;
            case 'Help_Audio_Input':
                temp = await language.getMessages("Help_Audio_Input", language.getLanguage() || 'en-US');
                break;
            case 'Help_The_AI':
                temp = await language.getMessages("Help_The_AI", language.getLanguage() || 'en-US');
                break;
            case 'Help_You_Can':
                temp = await language.getMessages("Help_You_Can", language.getLanguage() || 'en-US');
                break;
            case 'Help_Get_AI_Help':
                temp = await language.getMessages("Help_Get_AI_Help", language.getLanguage() || 'en-US');
                break;
            case 'Help_The_AI_will':
                temp = await language.getMessages("Help_The_AI_will", language.getLanguage() || 'en-US');
                break;
            default:
                // Si quieres un valor por defecto que también es una Promesa
                return await language.getMessages("unknowledge", 'en-US');
        }//end switch
        return temp || 'Unknowledge';
    }//end translate


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
            nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
            previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
            nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
            scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
            scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
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

    formatKeybind(keybind) {
        return keybind.split('+').map(key => html`<span class="key">${key}</span>`);
    }

    handleExternalLinkClick(url) {
        this.onExternalLinkClick(url);
    }


    
    _Community(){
        return html`<div class="option-group">
                    <div class="option-label">
                        <span>${this.Help_Community}</span>
                    </div>
                    <div class="community-links">
                        <div class="community-link" @click=${() => this.handleExternalLinkClick('https://cheatingdaddy.com')}>
                            ${this.Help_Website}
                        </div>
                        <div class="community-link" @click=${() => this.handleExternalLinkClick('https://github.com/sohzm/cheating-daddy')}>
                            ${this.Help_Repository}
                        </div>
                        <div class="community-link" @click=${() => this.handleExternalLinkClick('https://discord.gg/GCBdubnXfJ')}>
                            ${this.Help_Discord}
                        </div>
                    </div>
                </div>`;
    }

    _Keyboard_Shortcuts(){
        return html`<div class="option-group">
                    <div class="option-label">
                        <span>${this.Help_Keyboard}</span>
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
                    <div class="description" style="margin-top: 12px; font-style: italic; text-align: center;">
                        ${this.Help_You_Can}
                    </div>
                </div>`;
        }

    _Use(){
        return html`<div class="option-group">
                    <div class="option-label">
                        <span>${this.Help_How}</span>
                    </div>
                    <div class="usage-steps">
                        <div class="usage-step"><strong>${this.Help_Start}</strong></div>
                        <div class="usage-step"><strong>${this.Help_Customize}</strong></div>
                        <div class="usage-step">
                            <strong>${this.Help_Position}</strong>
                        </div>
                        <div class="usage-step">
                            <strong>${this.Help_Click} ${this.formatKeybind(this.keybinds.toggleClickThrough)} ${this.Help_Click2}</strong>
                        </div>
                        <div class="usage-step"><strong>${this.Help_Get_AI_Help} ${this.Help_The_AI_will}</strong></div>
                        <div class="usage-step"><strong>${this.Help_Text}</strong></div>
                        <div class="usage-step">
                            <strong>
                            ${this.Help_Navigate} ${this.formatKeybind(this.keybinds.previousResponse)} ${this.Help_and}
                            ${this.formatKeybind(this.keybinds.nextResponse)} ${this.Help_browse}
                            </strong>
                        </div>
                    </div>
                </div>
                `;
    }

    _Supported_Profiles(){
            return html`<div class="option-group">
                    <div class="option-label">
                        <span>${this.Help_Supported}</span>
                    </div>
                    <div class="profiles-grid">
                        <div class="profile-item">
                            <div class="profile-name">Job Interview</div>
                            <div class="profile-description">${this.Help_Get_help}</div>
                        </div>
                        <div class="profile-item">
                            <div class="profile-name">Sales Call</div>
                            <div class="profile-description">${this.Help_Assistance}</div>
                        </div>
                        <div class="profile-item">
                            <div class="profile-name">Business Meeting</div>
                            <div class="profile-description">${this.Help_Support}</div>
                        </div>
                        <div class="profile-item">
                            <div class="profile-name">Presentation</div>
                            <div class="profile-description">${this.Help_Help_with_presentations}</div>
                        </div>
                        <div class="profile-item">
                            <div class="profile-name">Negotiation</div>
                            <div class="profile-description">${this.Help_Guidance}</div>
                        </div>
                        <div class="profile-item">
                            <div class="profile-name">Exam Assistant</div>
                            <div class="profile-description">${this.Help_Academic}</div>
                        </div>
                    </div>
                </div>
                `;
    }

    _Audio(){
        return html`<div class="option-group">
                    <div class="option-label">
                        <span>${this.Help_Audio_Input}</span>
                    </div>
                    <div class="description">${this.Help_The_AI}</div>
                </div>`;
    }

    render() {
        const isMacOS = cheddar.isMacOS || false;
        const isLinux = cheddar.isLinux || false;

        return html`
            <div class="help-container">
                ${this._Community()}
                ${this._Keyboard_Shortcuts()}
                ${this._Use()}
                ${this._Supported_Profiles()}
                ${this._Audio()}
            </div>
        `;
    }
}

customElements.define('help-view', HelpView);
