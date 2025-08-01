import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import language from '../../lang/language_module.mjs';
import { AppHeaderStyle } from '../../style/AppHeaderStyle.js';

export class AppHeader extends LitElement {
    static styles = AppHeaderStyle; // Importing the styles from AppHeaderStyle.js

    static properties = {
        currentView: { type: String },
        statusText: { type: String },
        startTime: { type: Number },
        onCustomizeClick: { type: Function },
        onHelpClick: { type: Function },
        onHistoryClick: { type: Function },
        onCloseClick: { type: Function },
        onBackClick: { type: Function },
        onHideToggleClick: { type: Function },
        isClickThrough: { type: Boolean, reflect: true },
        advancedMode: { type: Boolean },
        onAdvancedClick: { type: Function },
        AppHeader_main: { type: String },
        AppHeader_customize: { type: String },
        AppHeader_help: { type: String },
        AppHeader_history: { type: String },
        AppHeader_advanced: { type: String },
        AppHeader_assistant: { type: String },
        AppHeader_Hide: { type: String }
    };

    constructor() {
        super();
        this.currentView = 'main';
        this.statusText = '';
        this.startTime = null;
        this.onCustomizeClick = () => {};
        this.onHelpClick = () => {};
        this.onHistoryClick = () => {};
        this.onCloseClick = () => {};
        this.onBackClick = () => {};
        this.onHideToggleClick = () => {};
        this.isClickThrough = false;
        this.advancedMode = false;
        this.onAdvancedClick = () => {};
        this._timerInterval = null;
        this.onTranslate(); // Initialize translations
    }

    onTranslate(){
        this.translate("AppHeader_main").then((lang) => {
            this.AppHeader_main = lang;
        });
        this.translate("AppHeader_customize").then((lang) => {
            this.AppHeader_customize = lang;
        });
        this.translate("AppHeader_help").then((lang) => {
            this.AppHeader_help = lang;
        });
        this.translate("AppHeader_history").then((lang) => {
            this.AppHeader_history = lang;
        });
        this.translate("AppHeader_advanced").then((lang) => {
            this.AppHeader_advanced = lang;
        });
        this.translate("AppHeader_assistant").then((lang) => {
            this.AppHeader_assistant = lang;
        });
        this.translate("AppHeader_Hide").then((lang) => {
            this.AppHeader_Hide = lang;
        });
    }

    connectedCallback() {
        super.connectedCallback();
        this._startTimer();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this._stopTimer();
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
        let temp;
        switch (key) {
            case 'AppHeader_main':
                temp = await language.getMessages("AppHeader_main", language.getLanguage() || 'en-US');
                break;
            case 'AppHeader_customize':
                temp = await language.getMessages("AppHeader_customize", language.getLanguage() || 'en-US');
                break;
            case 'AppHeader_help':
                temp = await language.getMessages("AppHeader_help", language.getLanguage() || 'en-US');
                break;
            case 'AppHeader_history':
                temp = await language.getMessages("AppHeader_history", language.getLanguage() || 'en-US');
                break;
            case 'AppHeader_advanced':
                temp = await language.getMessages("AppHeader_advanced", language.getLanguage() || 'en-US');
                break;
            case 'AppHeader_assistant':
                temp = await language.getMessages("AppHeader_assistant", language.getLanguage() || 'en-US');
                break;
            case 'AppHeader_Hide':
                temp = await language.getMessages("AppHeader_Hide", language.getLanguage() || 'en-US');
                break;
            default:
                return await language.getMessages("unknowledge", 'en-US');
        }//end switch
        return temp || 'Unknowledge';
    }
   
    updated(changedProperties) {
        super.updated(changedProperties);

        // Start/stop timer based on view change
        if (changedProperties.has('currentView')) {
            if (this.currentView === 'assistant' && this.startTime) {
                this._startTimer();
            } else {
                this._stopTimer();
            }
        }

        // Start timer when startTime is set
        if (changedProperties.has('startTime')) {
            if (this.startTime && this.currentView === 'assistant') {
                this._startTimer();
            } else if (!this.startTime) {
                this._stopTimer();
            }
        }
    }

    _startTimer() {
        // Clear any existing timer
        this._stopTimer();

        // Only start timer if we're in assistant view and have a start time
        if (this.currentView === 'assistant' && this.startTime) {
            this._timerInterval = setInterval(() => {
                // Trigger a re-render by requesting an update
                this.requestUpdate();
            }, 1000); // Update every second
        }
    }

    _stopTimer() {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
    }

    getViewTitle() {
        const titles = {
            onboarding: 'Welcome to Cheating Daddy',
            main: `${this.AppHeader_main}`,
            customize: `${this.AppHeader_customize}`,
            help: `${this.AppHeader_help}`,
            history: `${this.AppHeader_history}`,
            advanced: `${this.AppHeader_advanced}`,
            assistant: `${this.AppHeader_assistant}`
        };
        return titles[this.currentView] || 'Cheating Daddy';
    }

    //Borrar
    // getElapsedTime() {
    //     if (this.currentView === 'assistant' && this.startTime) {
    //         const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    //         return `${elapsed}s`;
    //     }
    //     return '';
    // }

    /** * Calculates the elapsed time since the start time in a human-readable format.
     * The format is
     * - Seconds if less than 60 seconds
     * - Minutes if less than 60 minutes
     * - Hours if less than 24 hours
     * - If 24 hours or more have passed, it restarts the cycle of seconds, minutes, and hours.
     * * @returns {string} - The elapsed time in a human-readable format.
     */
    getElapsedTime() {
    if (this.currentView === 'assistant' && this.startTime) {
        const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);

        // If less than 60 seconds have passed
        if (elapsedSeconds < 60) {
            return `${elapsedSeconds}s`;
        }

        const elapsedMinutes = Math.floor(elapsedSeconds / 60);

        // If less than 60 minutes have passed
        if (elapsedMinutes < 60) {
            // Ensure it only shows minutes if seconds are zero
            const remainingSeconds = elapsedSeconds % 60;
            if (remainingSeconds === 0) {
                return `${elapsedMinutes}m`;
            }
            return `${elapsedMinutes}m ${remainingSeconds}s`;
        }

        const elapsedHours = Math.floor(elapsedMinutes / 60);

        // If less than 24 hours have passed
        if (elapsedHours < 24) {
            const remainingMinutes = elapsedMinutes % 60;
            const remainingSeconds = elapsedSeconds % 60;

            if (remainingMinutes === 0 && remainingSeconds === 0) {
                return `${elapsedHours}h`;
            } else if (remainingMinutes === 0) {
                return `${elapsedHours}h ${remainingSeconds}s`;
            } else if (remainingSeconds === 0) {
                return `${elapsedHours}h ${remainingMinutes}m`;
            }
            return `${elapsedHours}h ${remainingMinutes}m ${remainingSeconds}s`;
        }

        // If 24 hours or more have passed, according to your request,
        // we want to restart the cycle of seconds, minutes, and hours
        // This involves calculating the elapsed time "within" the last day.
        const totalElapsedDays = Math.floor(elapsedHours / 24);
        const timeWithinCurrentDaySeconds = elapsedSeconds % (24 * 60 * 60); // Seconds elapsed within the current day

        const currentCycleHours = Math.floor(timeWithinCurrentDaySeconds / (60 * 60));
        const currentCycleMinutes = Math.floor((timeWithinCurrentDaySeconds % (60 * 60)) / 60);
        const currentCycleSeconds = timeWithinCurrentDaySeconds % 60;

        let displayString = '';

        if (currentCycleHours > 0) {
            displayString += `${currentCycleHours}h `;
        }
        if (currentCycleMinutes > 0 || currentCycleHours > 0) { // Show minutes if there are hours or if minutes are > 0
            displayString += `${currentCycleMinutes}m `;
        }
        displayString += `${currentCycleSeconds}s`; // Always show seconds at the end of the cycle

        return displayString.trim(); // Remove extra space at the end if any
        }
        return ''; // If currentView is not 'assistant' or startTime does not exist
    }

    isNavigationView() {
        const navigationViews = ['customize', 'help', 'history', 'advanced'];
        return navigationViews.includes(this.currentView);
    }

    render() {
        const elapsedTime = this.getElapsedTime();

        return html`
            <div class="header">
                <div class="header-title">${this.getViewTitle()}</div>
                <div class="header-actions">
                    ${this.currentView === 'assistant'
                        ? html`
                              <span>${elapsedTime}</span>
                              <span>${this.statusText}</span>
                          `
                        : ''}
                    ${this.currentView === 'main'
                        ? html`
                              <button class="icon-button" @click=${this.onHistoryClick}>
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
                                          d="M12 21V7C12 5.89543 12.8954 5 14 5H21.4C21.7314 5 22 5.26863 22 5.6V18.7143"
                                          stroke="currentColor"
                                          stroke-width="1.7"
                                          stroke-linecap="round"
                                      ></path>
                                      <path
                                          d="M12 21V7C12 5.89543 11.1046 5 10 5H2.6C2.26863 5 2 5.26863 2 5.6V18.7143"
                                          stroke="currentColor"
                                          stroke-width="1.7"
                                          stroke-linecap="round"
                                      ></path>
                                      <path d="M14 19L22 19" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
                                      <path d="M10 19L2 19" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
                                      <path
                                          d="M12 21C12 19.8954 12.8954 19 14 19"
                                          stroke="currentColor"
                                          stroke-width="1.7"
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                      ></path>
                                      <path
                                          d="M12 21C12 19.8954 11.1046 19 10 19"
                                          stroke="currentColor"
                                          stroke-width="1.7"
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                      ></path>
                                  </svg>
                              </button>
                              ${this.advancedMode
                                  ? html`
                                        <button class="icon-button" @click=${this.onAdvancedClick} title="Advanced Tools">
                                            <?xml version="1.0" encoding="UTF-8"?><svg
                                                width="24px"
                                                stroke-width="1.7"
                                                height="24px"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                                color="currentColor"
                                            >
                                                <path d="M18.5 15L5.5 15" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path>
                                                <path
                                                    d="M16 4L8 4"
                                                    stroke="currentColor"
                                                    stroke-width="1.7"
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                ></path>
                                                <path
                                                    d="M9 4.5L9 10.2602C9 10.7376 8.82922 11.1992 8.51851 11.5617L3.48149 17.4383C3.17078 17.8008 3 18.2624 3 18.7398V19C3 20.1046 3.89543 21 5 21L19 21C20.1046 21 21 20.1046 21 19V18.7398C21 18.2624 20.8292 17.8008 20.5185 17.4383L15.4815 11.5617C15.1708 11.1992 15 10.7376 15 10.2602L15 4.5"
                                                    stroke="currentColor"
                                                    stroke-width="1.7"
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                ></path>
                                                <path
                                                    d="M12 9.01L12.01 8.99889"
                                                    stroke="currentColor"
                                                    stroke-width="1.7"
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                ></path>
                                                <path
                                                    d="M11 2.01L11.01 1.99889"
                                                    stroke="currentColor"
                                                    stroke-width="1.7"
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                ></path>
                                            </svg>
                                        </button>
                                    `
                                  : ''}
                              <button class="icon-button" @click=${this.onCustomizeClick}>
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
                              <button class="icon-button" @click=${this.onHelpClick}>
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
                              <button @click=${this.onHideToggleClick} class="button">
                                  ${this.AppHeader_Hide}&nbsp;&nbsp;<span class="key" style="pointer-events: none;">${cheddar.isMacOS ? 'Cmd' : 'Ctrl'}</span
                                  >&nbsp;&nbsp;<span class="key">&bsol;</span>
                              </button>
                              <button @click=${this.onCloseClick} class="icon-button window-close">
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
                          `
                        : html`
                              <button @click=${this.isNavigationView() ? this.onBackClick : this.onCloseClick} class="icon-button window-close">
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
}

customElements.define('app-header', AppHeader);
