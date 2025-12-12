import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class HistoryView extends LitElement {
    static styles = css`
        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
            width: 100%;
        }

        .history-container {
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .sessions-list {
            flex: 1;
            overflow-y: auto;
        }

        .session-item {
            padding: 12px;
            border-bottom: 1px solid var(--border-color);
            cursor: pointer;
            transition: background 0.1s ease;
        }

        .session-item:hover {
            background: var(--hover-background);
        }

        .session-item.selected {
            background: var(--bg-secondary);
        }

        .session-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }

        .session-date {
            font-size: 12px;
            font-weight: 500;
            color: var(--text-color);
        }

        .session-time {
            font-size: 11px;
            color: var(--text-muted);
            font-family: 'SF Mono', Monaco, monospace;
        }

        .session-preview {
            font-size: 11px;
            color: var(--text-muted);
            line-height: 1.3;
        }

        .conversation-view {
            flex: 1;
            overflow-y: auto;
            background: var(--bg-primary);
            padding: 12px 0;
            user-select: text;
            cursor: text;
        }

        .message {
            margin-bottom: 8px;
            padding: 8px 12px;
            border-left: 2px solid transparent;
            font-size: 12px;
            line-height: 1.4;
            background: var(--bg-secondary);
            user-select: text;
            cursor: text;
        }

        .message.user {
            border-left-color: var(--text-secondary);
        }

        .message.ai {
            border-left-color: var(--text-color);
        }

        .back-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border-color);
        }

        .back-button {
            background: transparent;
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 6px 12px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background 0.1s ease;
        }

        .back-button:hover {
            background: var(--hover-background);
        }

        .legend {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 10px;
            color: var(--text-muted);
        }

        .legend-dot {
            width: 8px;
            height: 2px;
        }

        .legend-dot.user {
            background-color: var(--text-secondary);
        }

        .legend-dot.ai {
            background-color: var(--text-color);
        }

        .empty-state {
            text-align: center;
            color: var(--text-muted);
            font-size: 12px;
            margin-top: 32px;
        }

        .empty-state-title {
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 6px;
            color: var(--text-secondary);
        }

        .loading {
            text-align: center;
            color: var(--text-muted);
            font-size: 12px;
            margin-top: 32px;
        }

        .sessions-list::-webkit-scrollbar,
        .conversation-view::-webkit-scrollbar {
            width: 8px;
        }

        .sessions-list::-webkit-scrollbar-track,
        .conversation-view::-webkit-scrollbar-track {
            background: transparent;
        }

        .sessions-list::-webkit-scrollbar-thumb,
        .conversation-view::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 4px;
        }

        .sessions-list::-webkit-scrollbar-thumb:hover,
        .conversation-view::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }

        .tabs-container {
            display: flex;
            gap: 0;
            margin-bottom: 16px;
            border-bottom: 1px solid var(--border-color);
        }

        .tab {
            background: transparent;
            color: var(--text-muted);
            border: none;
            padding: 8px 16px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: color 0.1s ease;
            border-bottom: 2px solid transparent;
            margin-bottom: -1px;
        }

        .tab:hover {
            color: var(--text-color);
        }

        .tab.active {
            color: var(--text-color);
            border-bottom-color: var(--text-color);
        }

        .saved-response-item {
            padding: 12px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .saved-response-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 6px;
        }

        .saved-response-profile {
            font-size: 11px;
            font-weight: 500;
            color: var(--text-secondary);
            text-transform: capitalize;
        }

        .saved-response-date {
            font-size: 10px;
            color: var(--text-muted);
            font-family: 'SF Mono', Monaco, monospace;
        }

        .saved-response-content {
            font-size: 12px;
            color: var(--text-color);
            line-height: 1.4;
            user-select: text;
            cursor: text;
        }

        .delete-button {
            background: transparent;
            color: var(--text-muted);
            border: none;
            padding: 4px;
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.1s ease;
        }

        .delete-button:hover {
            background: rgba(241, 76, 76, 0.1);
            color: var(--error-color);
        }
    `;

    static properties = {
        sessions: { type: Array },
        selectedSession: { type: Object },
        loading: { type: Boolean },
    };

    constructor() {
        super();
        this.sessions = [];
        this.selectedSession = null;
        this.loading = true;
        this.loadSessions();
    }

    connectedCallback() {
        super.connectedCallback();
        // Resize window for this view
        resizeLayout();
    }

    async loadSessions() {
        try {
            this.loading = true;
            this.sessions = await cheatingDaddy.storage.getAllSessions();
        } catch (error) {
            console.error('Error loading conversation sessions:', error);
            this.sessions = [];
        } finally {
            this.loading = false;
            this.requestUpdate();
        }
    }

    async loadSelectedSession(sessionId) {
        try {
            const session = await cheatingDaddy.storage.getSession(sessionId);
            if (session) {
                this.selectedSession = session;
                this.requestUpdate();
            }
        } catch (error) {
            console.error('Error loading session:', error);
        }
    }

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
        // For session list items, we just show message count
        return `${session.messageCount || 0} messages`;
    }

    handleSessionClick(session) {
        this.loadSelectedSession(session.sessionId);
    }

    handleBackClick() {
        this.selectedSession = null;
    }

    getProfileNames() {
        return {
            interview: 'Job Interview',
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
            exam: 'Exam Assistant',
        };
    }

    renderSessionsList() {
        if (this.loading) {
            return html`<div class="loading">Loading conversation history...</div>`;
        }

        if (this.sessions.length === 0) {
            return html`
                <div class="empty-state">
                    <div class="empty-state-title">No conversations yet</div>
                    <div>Start a session to see your conversation history here</div>
                </div>
            `;
        }

        return html`
            <div class="sessions-list">
                ${this.sessions.map(
                    session => html`
                        <div class="session-item" @click=${() => this.handleSessionClick(session)}>
                            <div class="session-header">
                                <div class="session-date">${this.formatDate(session.createdAt)}</div>
                                <div class="session-time">${this.formatTime(session.createdAt)}</div>
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
                    Back to Sessions
                </button>
                <div class="legend">
                    <div class="legend-item">
                        <div class="legend-dot user"></div>
                        <span>Them</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-dot ai"></div>
                        <span>Suggestion</span>
                    </div>
                </div>
            </div>
            <div class="conversation-view">
                ${messages.length > 0
                    ? messages.map(message => html` <div class="message ${message.type}">${message.content}</div> `)
                    : html`<div class="empty-state">No conversation data available</div>`}
            </div>
        `;
    }

    render() {
        if (this.selectedSession) {
            return html`<div class="history-container">${this.renderConversationView()}</div>`;
        }

        return html`
            <div class="history-container">
                ${this.renderSessionsList()}
            </div>
        `;
    }
}

customElements.define('history-view', HistoryView);
