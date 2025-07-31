import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';
import  language  from '../../lang/language_module.mjs';
import { MainStyle } from '../../style/MainStyle.js';

export class MainView extends LitElement {
    static styles = MainStyle; // Importing the styles from MainStyle.js

    static properties = {
        onStart: { type: Function },
        onAPIKeyHelp: { type: Function },
        isInitializing: { type: Boolean },
        onLayoutModeChange: { type: Function },
        showApiKeyError: { type: Boolean },
        Main_api: { type: String },
        Main_GetApi: { type: String },
        Main_Welcome: {type: String},
        Main_APIKey:  {type: String},
        Main_Start: {type: String},
    };

    constructor() {
        super();
        this.onStart = () => {};
        this.onAPIKeyHelp = () => {};
        this.isInitializing = false;
        this.onLayoutModeChange = () => {};
        this.showApiKeyError = false;
        this.boundKeydownHandler = this.handleKeydown.bind(this);
        this.translate("Main_api").then((lang)=> 
            this.Main_api = lang
        );
        this.translate("Main_GetApi").then((lang)=> 
            this.Main_GetApi = lang
        );
        this.translate("Main_Welcome").then((lang)=> 
            this.Main_Welcome = lang
        );
        this.translate("Main_APIKey").then((lang)=> 
            this.Main_APIKey = lang
        );
        this.translate("Main_Start").then((lang)=> 
            this.Main_Start = lang
        );

        
        
    }

    connectedCallback() {
        super.connectedCallback();
        window.electron?.ipcRenderer?.on('session-initializing', (event, isInitializing) => {
            this.isInitializing = isInitializing;
        });

        // Add keyboard event listener for Ctrl+Enter (or Cmd+Enter on Mac)
        document.addEventListener('keydown', this.boundKeydownHandler);

        // Load and apply layout mode on startup
        this.loadLayoutMode();
        // Resize window for this view
        resizeLayout();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.electron?.ipcRenderer?.removeAllListeners('session-initializing');
        // Remove keyboard event listener
        document.removeEventListener('keydown', this.boundKeydownHandler);
    }

    async translate(key) {
    //await new Promise(resolve => setTimeout(resolve, 500));
    let temp = ''; // Usa 'let' si vas a reasignar
    switch (key) {
        case 'Main_api':
            temp = await language.getMessages("Main_api", language.getLanguage() || 'en-US');
            break;
        case 'Main_GetApi':
            temp = await language.getMessages("Main_GetApi", language.getLanguage() || 'en-US');
            break;
        case 'Main_Welcome':
            temp = await language.getMessages("Main_Welcome", language.getLanguage() || 'en-US');
            break;
        case 'Main_APIKey':
            temp = await language.getMessages("Main_APIKey", language.getLanguage() || 'en-US');
            break;
        case 'Main_Start':
            temp = await language.getMessages("Main_Start", language.getLanguage() || 'en-US');
            break;
        default:
            // Si quieres un valor por defecto que también es una Promesa
            return await language.getMessages("unknowledge", 'en-US');
        }//end switch
        return temp || 'Unknowledge';
    }//end translate

    handleKeydown(e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isStartShortcut = isMac ? e.metaKey && e.key === 'Enter' : e.ctrlKey && e.key === 'Enter';

        if (isStartShortcut) {
            e.preventDefault();
            this.handleStartClick();
        }
    }

    handleInput(e) {
        localStorage.setItem('apiKey', e.target.value);
        // Clear error state when user starts typing
        if (this.showApiKeyError) {
            this.showApiKeyError = false;
        }
    }

    handleStartClick() {
        if (this.isInitializing) {
            return;
        }
        this.onStart();
    }

    handleAPIKeyHelpClick() {
        this.onAPIKeyHelp();
    }

    handleResetOnboarding() {
        localStorage.removeItem('onboardingCompleted');
        // Refresh the page to trigger onboarding
        window.location.reload();
    }

    loadLayoutMode() {
        const savedLayoutMode = localStorage.getItem('layoutMode');
        if (savedLayoutMode && savedLayoutMode !== 'normal') {
            // Notify parent component to apply the saved layout mode
            this.onLayoutModeChange(savedLayoutMode);
        }
    }

    // Method to trigger the red blink animation
    triggerApiKeyError() {
        this.showApiKeyError = true;
        // Remove the error class after 1 second
        setTimeout(() => {
            this.showApiKeyError = false;
        }, 1000);
    }

    getStartButtonText() {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

        const cmdIcon = html`<svg width="14px" height="14px" viewBox="0 0 24 24" stroke-width="2" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 6V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M15 6V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path
                d="M9 6C9 4.34315 7.65685 3 6 3C4.34315 3 3 4.34315 3 6C3 7.65685 4.34315 9 6 9H18C19.6569 9 21 7.65685 21 6C21 4.34315 19.6569 3 18 3C16.3431 3 15 4.34315 15 6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></path>
            <path
                d="M9 18C9 19.6569 7.65685 21 6 21C4.34315 21 3 19.6569 3 18C3 16.3431 4.34315 15 6 15H18C19.6569 15 21 16.3431 21 18C21 19.6569 19.6569 21 18 21C16.3431 21 15 19.6569 15 18"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></path>
        </svg>`;

        const enterIcon = html`<svg width="14px" height="14px" stroke-width="2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M10.25 19.25L6.75 15.75L10.25 12.25"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></path>
            <path
                d="M6.75 15.75H12.75C14.9591 15.75 16.75 13.9591 16.75 11.75V4.75"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></path>
        </svg>`;

        if (isMac) {
            return html`${this.Main_Start} <span class="shortcut-icons">${cmdIcon}${enterIcon}</span>`;
        } else {
            return html`${this.Main_Start} <span class="shortcut-icons">Ctrl${enterIcon}</span>`;
        }
    }

    render() {
        return html`
            <div class="welcome">${this.Main_Welcome}</div>

            <div class="input-group">
                <input
                    type="password"
                    placeholder="${this.Main_APIKey || 'Enter your Gemini API Key'} "
                    .value=${localStorage.getItem('apiKey') || ''}
                    @input=${this.handleInput}
                    class="${this.showApiKeyError ? 'api-key-error' : ''}"
                />
                <button @click=${this.handleStartClick} class="start-button ${this.isInitializing ? 'initializing' : ''}">
                    ${this.getStartButtonText()}
                </button>
            </div>
            <p class="description">
                ${this.Main_api}
                <span @click=${this.handleAPIKeyHelpClick} class="link">${this.Main_GetApi}</span>
            </p>
        `;
    }
}

customElements.define('main-view', MainView);
