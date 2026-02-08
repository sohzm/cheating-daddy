import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class HistoryView extends LitElement {
    static styles = css`
        * {
            font-family: var(--font);
            cursor: default;
            user-select: none;
        }

        :host {
            height: 100%;
            display: flex;
            width: 100%;
        }

        /* ── Split layout ── */

        .history-layout {
            display: flex;
            height: 100%;
            width: 100%;
        }

        .session-panel {
            width: 260px;
            min-width: 260px;
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            background: var(--bg-surface);
        }

        .conversation-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: var(--bg-app);
        }

        /* ── Search ── */

        .search-bar {
            padding: var(--space-sm);
            border-bottom: 1px solid var(--border);
        }

        .search-bar input {
            width: 100%;
            background: var(--bg-elevated);
            color: var(--text-primary);
            border: 1px solid var(--border);
            padding: var(--space-sm) var(--space-md);
            border-radius: var(--radius-sm);
            font-size: var(--font-size-sm);
            font-family: var(--font);
            transition: border-color var(--transition), box-shadow var(--transition);
        }

        .search-bar input::placeholder {
            color: var(--text-muted);
        }

        .search-bar input:hover:not(:focus) {
            border-color: var(--border-strong);
        }

        .search-bar input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 1px var(--accent);
        }

        /* ── Session list ── */

        .sessions-list {
            flex: 1;
            overflow-y: auto;
        }

        .session-item {
            padding: var(--space-sm) var(--space-md);
            border-bottom: 1px solid var(--border);
            cursor: pointer;
            transition: background var(--transition);
        }

        .session-item:hover {
            background: var(--bg-hover);
        }

        .session-item.selected {
            background: var(--bg-elevated);
        }

        .session-date {
            font-size: var(--font-size-sm);
            font-weight: var(--font-weight-medium);
            color: var(--text-primary);
            margin-bottom: 2px;
        }

        .session-time {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            font-family: var(--font-mono);
        }

        .session-preview {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            line-height: 1.3;
            margin-top: 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* ── Conversation viewer ── */

        .conv-header {
            display: flex;
            align-items: center;
            padding: var(--space-sm) var(--space-md);
            border-bottom: 1px solid var(--border);
            gap: var(--space-sm);
        }

        .conv-tabs {
            display: flex;
            gap: 0;
        }

        .conv-tab {
            background: none;
            border: none;
            color: var(--text-muted);
            padding: var(--space-xs) var(--space-md);
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-medium);
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: color var(--transition);
        }

        .conv-tab:hover {
            color: var(--text-primary);
        }

        .conv-tab.active {
            color: var(--text-primary);
            border-bottom-color: var(--accent);
        }

        .conv-context {
            padding: var(--space-sm) var(--space-md);
            background: var(--bg-surface);
            border-bottom: 1px solid var(--border);
            font-size: var(--font-size-xs);
        }

        .conv-context-row {
            display: flex;
            gap: var(--space-sm);
            margin-bottom: 2px;
        }

        .conv-context-row:last-child {
            margin-bottom: 0;
        }

        .context-label {
            color: var(--text-muted);
            min-width: 80px;
        }

        .context-value {
            color: var(--text-primary);
            font-weight: var(--font-weight-medium);
        }

        .context-prompt {
            color: var(--text-secondary);
            font-style: italic;
            word-break: break-word;
            white-space: pre-wrap;
        }

        .conv-messages {
            flex: 1;
            overflow-y: auto;
            padding: var(--space-md);
        }

        .message {
            margin-bottom: var(--space-sm);
            padding: var(--space-sm) var(--space-md);
            border-left: 2px solid transparent;
            font-size: var(--font-size-sm);
            line-height: var(--line-height);
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
            user-select: text;
            cursor: text;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .message.user {
            color: var(--text-secondary);
            border-left-color: var(--accent);
        }

        .message.ai {
            color: var(--text-primary);
            border-left-color: var(--text-muted);
        }

        .message.screen {
            color: var(--text-primary);
            border-left-color: var(--success);
        }

        .message-meta {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            font-family: var(--font-mono);
            margin-bottom: 2px;
        }

        /* ── Empty / loading states ── */

        .empty-state {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            font-size: var(--font-size-sm);
        }

        .loading {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            font-size: var(--font-size-sm);
        }

        /* ── Scrollbar ── */

        .sessions-list::-webkit-scrollbar,
        .conv-messages::-webkit-scrollbar {
            width: 6px;
        }

        .sessions-list::-webkit-scrollbar-track,
        .conv-messages::-webkit-scrollbar-track {
            background: transparent;
        }

        .sessions-list::-webkit-scrollbar-thumb,
        .conv-messages::-webkit-scrollbar-thumb {
            background: var(--border-strong);
            border-radius: 3px;
        }

        .sessions-list::-webkit-scrollbar-thumb:hover,
        .conv-messages::-webkit-scrollbar-thumb:hover {
            background: #444444;
        }
    `;

    static properties = {
        sessions: { type: Array },
        selectedSession: { type: Object },
        selectedSessionId: { type: String },
        loading: { type: Boolean },
        activeTab: { type: String },
        searchQuery: { type: String },
    };

    constructor() {
        super();
        this.sessions = [];
        this.selectedSession = null;
        this.selectedSessionId = null;
        this.loading = true;
        this.activeTab = 'conversation';
        this.searchQuery = '';
        this.loadSessions();
    }

    async loadSessions() {
        try {
            this.loading = true;
            this.sessions = await cheatingDaddy.storage.getAllSessions();
        } catch (error) {
            console.error('Error loading sessions:', error);
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
                this.selectedSessionId = sessionId;
                this.activeTab = 'conversation';
                this.requestUpdate();
            }
        } catch (error) {
            console.error('Error loading session:', error);
        }
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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

    getSessionPreview(session) {
        const parts = [];
        if (session.messageCount > 0) parts.push(`${session.messageCount} messages`);
        if (session.screenAnalysisCount > 0) parts.push(`${session.screenAnalysisCount} screen`);
        if (session.profile) {
            const profileNames = this.getProfileNames();
            parts.push(profileNames[session.profile] || session.profile);
        }
        return parts.length > 0 ? parts.join(' \u00B7 ') : 'Empty session';
    }

    handleSearchInput(e) {
        this.searchQuery = e.target.value;
    }

    getFilteredSessions() {
        if (!this.searchQuery.trim()) return this.sessions;
        const q = this.searchQuery.toLowerCase();
        return this.sessions.filter(s => {
            const preview = this.getSessionPreview(s).toLowerCase();
            const date = this.formatDate(s.createdAt).toLowerCase();
            return preview.includes(q) || date.includes(q);
        });
    }

    renderSessionPanel() {
        const filteredSessions = this.getFilteredSessions();

        return html`
            <div class="session-panel">
                <div class="search-bar">
                    <input
                        type="text"
                        placeholder="Search sessions..."
                        .value=${this.searchQuery}
                        @input=${this.handleSearchInput}
                    />
                </div>
                ${this.loading
                    ? html`<div class="loading">Loading...</div>`
                    : filteredSessions.length === 0
                        ? html`<div class="empty-state">No sessions yet.</div>`
                        : html`
                            <div class="sessions-list">
                                ${filteredSessions.map(session => html`
                                    <div
                                        class="session-item ${this.selectedSessionId === session.sessionId ? 'selected' : ''}"
                                        @click=${() => this.loadSelectedSession(session.sessionId)}
                                    >
                                        <div class="session-date">${this.formatDate(session.createdAt)}</div>
                                        <div class="session-time">${this.formatTime(session.createdAt)}</div>
                                        <div class="session-preview">${this.getSessionPreview(session)}</div>
                                    </div>
                                `)}
                            </div>
                        `
                }
            </div>
        `;
    }

    renderConversationContent() {
        if (!this.selectedSession) return '';
        const { conversationHistory } = this.selectedSession;

        const messages = [];
        if (conversationHistory) {
            conversationHistory.forEach(turn => {
                if (turn.transcription) {
                    messages.push({ type: 'user', content: turn.transcription, timestamp: turn.timestamp });
                }
                if (turn.ai_response) {
                    messages.push({ type: 'ai', content: turn.ai_response, timestamp: turn.timestamp });
                }
            });
        }

        if (messages.length === 0) {
            return html`<div class="empty-state">No conversation data</div>`;
        }

        return messages.map(msg => html`
            <div class="message ${msg.type}">
                <div class="message-meta">${this.formatTimestamp(msg.timestamp)}</div>
                ${msg.content}
            </div>
        `);
    }

    renderScreenContent() {
        if (!this.selectedSession) return '';
        const { screenAnalysisHistory } = this.selectedSession;

        if (!screenAnalysisHistory || screenAnalysisHistory.length === 0) {
            return html`<div class="empty-state">No screen analysis data</div>`;
        }

        return screenAnalysisHistory.map(a => html`
            <div class="message screen">
                <div class="message-meta">${this.formatTimestamp(a.timestamp)} \u00B7 ${a.model || 'unknown'}</div>
                ${a.response}
            </div>
        `);
    }

    renderContextContent() {
        if (!this.selectedSession) return '';
        const { profile, customPrompt } = this.selectedSession;
        const profileNames = this.getProfileNames();

        if (!profile && !customPrompt) {
            return html`<div class="empty-state">No context</div>`;
        }

        return html`
            <div class="conv-context" style="border-bottom:none;">
                ${profile ? html`
                    <div class="conv-context-row">
                        <span class="context-label">Profile</span>
                        <span class="context-value">${profileNames[profile] || profile}</span>
                    </div>
                ` : ''}
                ${customPrompt ? html`
                    <div class="conv-context-row">
                        <span class="context-label">Prompt</span>
                        <span class="context-prompt">${customPrompt}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderConversationPanel() {
        if (!this.selectedSession) {
            return html`
                <div class="conversation-panel">
                    <div class="empty-state">Select a session</div>
                </div>
            `;
        }

        const { conversationHistory, screenAnalysisHistory, profile, customPrompt } = this.selectedSession;
        const hasConversation = conversationHistory && conversationHistory.length > 0;
        const hasScreen = screenAnalysisHistory && screenAnalysisHistory.length > 0;

        return html`
            <div class="conversation-panel">
                ${(profile || customPrompt) ? html`
                    <div class="conv-context">
                        ${profile ? html`
                            <div class="conv-context-row">
                                <span class="context-label">Profile</span>
                                <span class="context-value">${this.getProfileNames()[profile] || profile}</span>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                <div class="conv-header">
                    <div class="conv-tabs">
                        <button
                            class="conv-tab ${this.activeTab === 'conversation' ? 'active' : ''}"
                            @click=${() => { this.activeTab = 'conversation'; }}
                        >Conversation ${hasConversation ? `(${conversationHistory.length})` : ''}</button>
                        <button
                            class="conv-tab ${this.activeTab === 'screen' ? 'active' : ''}"
                            @click=${() => { this.activeTab = 'screen'; }}
                        >Screen ${hasScreen ? `(${screenAnalysisHistory.length})` : ''}</button>
                        <button
                            class="conv-tab ${this.activeTab === 'context' ? 'active' : ''}"
                            @click=${() => { this.activeTab = 'context'; }}
                        >Context</button>
                    </div>
                </div>
                <div class="conv-messages">
                    ${this.activeTab === 'conversation'
                        ? this.renderConversationContent()
                        : this.activeTab === 'screen'
                            ? this.renderScreenContent()
                            : this.renderContextContent()}
                </div>
            </div>
        `;
    }

    render() {
        return html`
            <div class="history-layout">
                ${this.renderSessionPanel()}
                ${this.renderConversationPanel()}
            </div>
        `;
    }
}

customElements.define('history-view', HistoryView);
