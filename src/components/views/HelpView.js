import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';
import  language  from '../../lang/language_module.mjs';
import HelpStyle from '../../style/HelpStyle.js';

export class HelpView extends LitElement {
    
    static styles = HelpStyle; // Importing the styles from HelpStyle.js

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
        Help_Window_Movement: {type: String},
        Help_Window_Control: {type: String},
        Help_AI_Actions: {type: String},
        Help_AI_Response_Navigation: {type: String},
        Help_Text_Input: {type: String},
        GetKeybind_Move_Window_Up: {type: String},
        GetKeybind_Move_Window_Down: {type: String},
        GetKeybind_Move_Window_Left: {type: String},
        GetKeybind_Move_Window_Right: {type: String},
        GetKeybind_Toggle_Window_Visibility: {type: String},
        GetKeybind_Toggle_Click_through_Mode: {type: String},
        GetKeybind_Ask_Next_Step: {type: String},
        GetKeybind_Previous_Response: {type: String},
        GetKeybind_Next_Response: {type: String},
        GetKeybind_Scroll_Response_Up: {type: String},
        GetKeybind_Scroll_Response_Down: {type: String},
        GetKeybind_Send: {type: String},
        GetKeybind_New_line: {type: String},
    };

    constructor() {
        super();
        this.onExternalLinkClick = () => {};
        this.keybinds = this.getDefaultKeybinds();
        this.loadKeybinds();
        this.onTranslate(); // Initialize translations
    }

 /** * Initializes the component by loading translations for all text content.
 * This method is called when the component is created to ensure all text is localized.
 * @async   
 * @function onTranslate
 * @returns {void}
 * This method does not return a value. It updates the component's properties with translated text.
 */ 
    onTranslate() {
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
        this.translate("Help_Window_Movement").then((lang) => {
            this.Help_Window_Movement = lang;
        });
        this.translate("Help_Window_Control").then((lang) => {
            this.Help_Window_Control = lang;
        });
        this.translate("Help_The_AI_will").then((lang) => {
            this.Help_The_AI_will = lang;
        });
        this.translate("Help_AI_Actions").then((lang) => {
            this.Help_AI_Actions = lang;
        });
        this.translate("Help_AI_Response_Navigation").then((lang) => {
            this.Help_AI_Response_Navigation = lang;
        });
        this.translate("Help_Text_Input").then((lang) => {
            this.Help_Text_Input = lang;
        });
        //getKeyBing
        this.translate("GetKeybind_Move_Window_Up").then((lang)=> 
            this.GetKeybind_Move_Window_Up = lang
        );
        this.translate("GetKeybind_Move_Window_Down").then((lang)=> 
            this.GetKeybind_Move_Window_Down = lang
        );
        this.translate("GetKeybind_Move_Window_Left").then((lang)=> 
            this.GetKeybind_Move_Window_Left = lang
        );
        this.translate("GetKeybind_Move_Window_Right").then((lang)=> 
            this.GetKeybind_Move_Window_Right = lang
        );
        this.translate("GetKeybind_Toggle_Window_Visibility").then((lang)=> 
            this.GetKeybind_Toggle_Window_Visibility = lang
        );
        this.translate("GetKeybind_Toggle_Click_through_Mode").then((lang)=> 
            this.GetKeybind_Toggle_Click_through_Mode = lang
        );
        this.translate("GetKeybind_Ask_Next_Step").then((lang)=> 
            this.GetKeybind_Ask_Next_Step = lang
        );
        this.translate("GetKeybind_Previous_Response").then((lang)=> 
            this.GetKeybind_Previous_Response = lang
        );
        this.translate("GetKeybind_Next_Response").then((lang)=> 
            this.GetKeybind_Next_Response = lang
        );
        this.translate("GetKeybind_Scroll_Response_Up").then((lang)=> 
            this.GetKeybind_Scroll_Response_Up = lang
        );
        this.translate("GetKeybind_Scroll_Response_Down").then((lang)=> 
            this.GetKeybind_Scroll_Response_Down = lang
        );
        this.translate("GetKeybind_Send").then((lang)=> 
            this.GetKeybind_Send = lang
        );
        this.translate("GetKeybind_New_line").then((lang)=> 
            this.GetKeybind_New_line = lang
        );
        //end getKeyBing
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
            case 'Help_Window_Movement':
                temp = await language.getMessages("Help_Window_Movement", language.getLanguage() || 'en-US');
                break;
            case 'Help_Window_Control':
                temp = await language.getMessages("Help_Window_Control", language.getLanguage() || 'en-US');
                break;
            case 'Help_AI_Actions':
                temp = await language.getMessages("Help_AI_Actions", language.getLanguage() || 'en-US');
                break;
            case 'Help_AI_Response_Navigation':
                temp = await language.getMessages("Help_AI_Response_Navigation", language.getLanguage() || 'en-US');
                break;
            case 'Help_Text_Input':
                temp = await language.getMessages("Help_Text_Input", language.getLanguage() || 'en-US');
                break;
            case 'GetKeybind_Move_Window_Up':
                temp = await language.getMessage("GetKeybind_Move_Window_Up", language.getLanguage() || 'en-US');
                break;
            case 'GetKeybind_Move_Window_Down':
                temp = await language.getMessage("GetKeybind_Move_Window_Down", language.getLanguage() || 'en-US');
                break;
            case 'GetKeybind_Move_Window_Left':
                temp = await language.getMessage("GetKeybind_Move_Window_Left", language.getLanguage() || 'en-US');
                break;
            case 'GetKeybind_Move_Window_Right':
                temp = await language.getMessage("GetKeybind_Move_Window_Right", language.getLanguage() || 'en-US');
                break;
            case 'GetKeybind_Toggle_Window_Visibility':
                temp = await language.getMessage("GetKeybind_Toggle_Window_Visibility", language.getLanguage() || 'en-US');
                break;
            case 'GetKeybind_Toggle_Click_through_Mode':
                temp = await language.getMessage("GetKeybind_Toggle_Click_through_Mode", language.getLanguage() || 'en-US');
                break;
            case 'GetKeybind_Ask_Next_Step':
                temp = await language.getMessage("GetKeybind_Ask_Next_Step", language.getLanguage() || 'en-US');
                break;
            case 'GetKeybind_Previous_Response':
                temp = await language.getMessage("GetKeybind_Previous_Response", language.getLanguage() || 'en-US');
                break;
            case 'GetKeybind_Next_Response':
                temp = await language.getMessage("GetKeybind_Next_Response", language.getLanguage() || 'en-US');
                break;
            case 'GetKeybind_Scroll_Response_Up':
                temp = await language.getMessage("GetKeybind_Scroll_Response_Up", language.getLanguage() || 'en-US');
                break;
            case 'GetKeybind_Scroll_Response_Down':
                temp = await language.getMessage("GetKeybind_Scroll_Response_Down", language.getLanguage() || 'en-US');
                break;
            case 'GetKeybind_Send':
                temp = await language.getMessage("GetKeybind_Send", language.getLanguage() || 'en-US');
                break;
            case 'GetKeybind_New_line':
                temp = await language.getMessage("GetKeybind_New_line", language.getLanguage() || 'en-US');
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
        return html`
                    <div class="option-group">
                    <div class="option-label">
                        <span>${this.Help_Keyboard}</span>
                    </div>
                    <div class="keyboard-section">
                        <div class="keyboard-group">
                            <div class="keyboard-group-title">${this.Help_Window_Movement}</div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">${this.GetKeybind_Move_Window_Up}</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.moveUp)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">${this.GetKeybind_Move_Window_Down}</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.moveDown)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">${this.GetKeybind_Move_Window_Left}</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.moveLeft)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">${this.GetKeybind_Move_Window_Right}</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.moveRight)}</div>
                            </div>
                        </div>

                        <div class="keyboard-group">
                            <div class="keyboard-group-title">${this.Help_Window_Control}</div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">${this.GetKeybind_Toggle_Click_through_Mode}</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.toggleClickThrough)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">${this.GetKeybind_Toggle_Window_Visibility}</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.toggleVisibility)}</div>
                            </div>
                        </div>

                        <div class="keyboard-group">
                            <div class="keyboard-group-title">${this.Help_AI_Actions}</div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">${this.GetKeybind_Ask_Next_Step || "Take screenshot and ask for next step"} </span>

                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.nextStep)}</div>
                            </div>
                        </div>

                        <div class="keyboard-group">
                            <div class="keyboard-group-title">${this.Help_AI_Response_Navigation}</div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">${this.GetKeybind_Previous_Response}</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.previousResponse)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">${this.GetKeybind_Next_Response}</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.nextResponse)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">${this.GetKeybind_Scroll_Response_Up}</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.scrollUp)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">${this.GetKeybind_Scroll_Response_Down}</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.scrollDown)}</div>
                            </div>
                        </div>

                        <div class="keyboard-group">
                            <div class="keyboard-group-title">${this.Help_Text_Input}</div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">${this.GetKeybind_Send}</span>
                                <div class="shortcut-keys"><span class="key">Enter</span></div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">${this.GetKeybind_New_line}</span>
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
