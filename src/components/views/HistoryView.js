import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';
import language from '../../lang/language_module.mjs'; 
import HistoryStyle from '../../style/HistoryStyle.js';

export class HistoryView extends LitElement {
    static styles = HistoryStyle; // Importing the styles from HistoryStyle.js

    static properties = {
        sessions: { type: Array },
        selectedSession: { type: Object },
        loading: { type: Boolean },
        History_No_conversation_yet: { type: String },
        History_Loading_conversation_history: { type: String },
        History_Start_a_session: { type: String },
        History_Them: { type: String },
        History_Suggestion: { type: String },
        History_No_conversation: { type: String },
        History_Back_to_Sessions: { type: String }
    };

    constructor() {
        super();
        this.sessions = [];
        this.selectedSession = null;
        this.loading = true;
        this.loadSessions();
        this.onTranslate(); // Initialize translations
    }

    /** Translates the view's text content into the current system language.
     *  This method is called when the component is initialized to ensure all text is localized.
     *  @async
     *  @function onTranslate
     *  @returns {void}
     *  This method does not return a value. It updates the component's properties with translated text.
     * */
    onTranslate() {
        this.translate("History_No_conversation_yet").then((lang) => {
            this.History_No_conversation_yet = lang;
        });
        this.translate("History_Loading_conversation_history").then((lang) => {
            this.History_Loading_conversation_history = lang;
        });
        this.translate("History_Start_a_session").then((lang) => {
            this.History_Start_a_session = lang;
        });
        this.translate("History_Them").then((lang) => {
            this.History_Them = lang;
        });
        this.translate("History_Suggestion").then((lang) => {
            this.History_Suggestion = lang;
        });
        this.translate("History_No_conversation").then((lang) => {
            this.History_No_conversation = lang;
        });
        this.translate("History_Back_to_Sessions").then((lang) => {
            this.History_Back_to_Sessions = lang;
        });
    }

    connectedCallback() {
        super.connectedCallback();
        // Resize window for this view
        resizeLayout();
    }

    async loadSessions() {
        try {
            this.loading = true;
            this.sessions = await cheddar.getAllConversationSessions();
        } catch (error) {
            console.error('Error loading conversation sessions:', error);
            this.sessions = [];
        } finally {
            this.loading = false;
        }
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
            case 'History_No_conversation_yet':
                temp = await language.getMessages("History_No_conversation_yet", language.getLanguage() || 'en-US');
                break;
            case 'History_Loading_conversation_history':
                temp = await language.getMessages("History_Loading_conversation_history", language.getLanguage() || 'en-US');
                break;
            case 'History_Start_a_session':
                temp = await language.getMessages("History_Start_a_session", language.getLanguage() || 'en-US');
                break;
            case 'History_Them':
                temp = await language.getMessages("History_Them", language.getLanguage() || 'en-US');
                break;
            case 'History_Suggestion':
                temp = await language.getMessages("History_Suggestion", language.getLanguage() || 'en-US');
                break;
            case 'History_No_conversation':
                temp = await language.getMessages("History_No_conversation", language.getLanguage() || 'en-US');
                break;
            case 'History_Back_to_Sessions':
                temp = await language.getMessages("History_No_conversation", language.getLanguage() || 'en-US');
                break;
            default:
                return await language.getMessages("unknowledge", 'en-US');
        }//end switch
        return temp || 'Unknowledge';
    }//end translate


    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }


    getSessionPreview(session) {
        if (!session.conversationHistory || session.conversationHistory.length === 0) {
            return `${this.History_No_conversation_yet}`;
        }

        const firstTurn = session.conversationHistory[0];
        const preview = firstTurn.transcription || firstTurn.ai_response || 'Empty conversation';
        return preview.length > 100 ? preview.substring(0, 100) + '...' : preview;
    }

    handleSessionClick(session) {
        this.selectedSession = session;
    }

    handleBackClick() {
        this.selectedSession = null;
    }

    renderSessionsList() {
        if (this.loading) {
            return html`<div class="loading">${this.History_Loading_conversation_history}</div>`;
        }

        if (this.sessions.length === 0) {
            return html`
                <div class="empty-state">
                    <div class="empty-state-title">${this.History_No_conversation_yet}</div>
                    <div>${this.History_Start_a_session}</div>
                </div>
            `;
        }

        return html`
            <div class="sessions-list">
                ${this.sessions.map(
                    session => html`
                        <div class="session-item" @click=${() => this.handleSessionClick(session)}>
                            <div class="session-header">
                                <div class="session-date">${this.formatDate(session.timestamp)}</div>
                                <div class="session-time">${this.formatTime(session.timestamp)}</div>
                            </div>
                            <div class="session-preview">${this.getSessionPreview(session)}</div>
                        </div>
                    `
                )}
            </div>
        `;
    }

    renderConversationView() {
        if (!this.selectedSession) return html``;

        const { conversationHistory } = this.selectedSession;

        // Flatten the conversation turns into individual messages
        const messages = [];
        if (conversationHistory) {
            conversationHistory.forEach(turn => {
                if (turn.transcription) {
                    messages.push({
                        type: 'user',
                        content: turn.transcription,
                        timestamp: turn.timestamp,
                    });
                }
                if (turn.ai_response) {
                    messages.push({
                        type: 'ai',
                        content: turn.ai_response,
                        timestamp: turn.timestamp,
                    });
                }
            });
        }

        return html`
            <div class="back-header">
                <button class="back-button" @click=${this.handleBackClick}>
                    <svg
                        width="16px"
                        height="16px"
                        stroke-width="1.7"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        color="currentColor"
                    >
                        <path d="M15 6L9 12L15 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                    ${this.History_Back_to_Sessions}
                </button>
                <div class="legend">
                    <div class="legend-item">
                        <div class="legend-dot user"></div>
                        <span>${this.History_Them}</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-dot ai"></div>
                        <span>${this.History_Suggestion}</span>
                    </div>
                </div>
            </div>
            <div class="conversation-view">
                ${messages.length > 0
                    ? messages.map(message => html` <div class="message ${message.type}">${message.content}</div> `)
                    : html`<div class="empty-state">${this.History_No_conversation}</div>`}
            </div>
        `;
    }

    render() {
        return html` <div class="history-container">${this.selectedSession ? this.renderConversationView() : this.renderSessionsList()}</div> `;
    }
}

customElements.define('history-view', HistoryView);
