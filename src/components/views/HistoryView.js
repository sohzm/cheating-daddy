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
            margin-bottom: 16px;
            padding-bottom: 20px;
        }

        .session-item {
            background: var(--input-background);
            border: 1px solid var(--button-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .session-item:hover {
            background: var(--hover-background);
            border-color: var(--focus-border-color);
        }

        .session-item.selected {
            background: var(--focus-box-shadow);
            border-color: var(--focus-border-color);
        }

        .session-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }

        .session-date {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-color);
        }

        .session-time {
            font-size: 11px;
            color: var(--description-color);
        }

        .session-preview {
            font-size: 11px;
            color: var(--description-color);
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .conversation-view {
            flex: 1;
            overflow-y: auto;
            background: var(--main-content-background);
            border: 1px solid var(--button-border);
            border-radius: 6px;
            padding: 12px;
            padding-bottom: 20px;
            user-select: text;
            cursor: text;
        }

        .message {
            margin-bottom: 6px;
            padding: 6px 10px;
            border-left: 3px solid transparent;
            font-size: 12px;
            line-height: 1.4;
            background: var(--input-background);
            border-radius: 0 4px 4px 0;
            user-select: text;
            cursor: text;
        }

        .message.user {
            border-left-color: #5865f2; /* Discord blue */
        }

        .message.ai {
            border-left-color: #ed4245; /* Discord red */
        }

        .back-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .back-button {
            background: var(--button-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
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
            font-size: 11px;
            color: var(--description-color);
        }

        .legend-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
        }

        .legend-dot.user {
            background-color: #5865f2; /* Discord blue */
        }

        .legend-dot.ai {
            background-color: #ed4245; /* Discord red */
        }

        .empty-state {
            text-align: center;
            color: var(--description-color);
            font-size: 12px;
            margin-top: 32px;
        }

        .empty-state-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 6px;
            color: var(--text-color);
        }

        .loading {
            text-align: center;
            color: var(--description-color);
            font-size: 12px;
            margin-top: 32px;
        }

        /* Scrollbar styles for scrollable elements */
        .sessions-list::-webkit-scrollbar {
            width: 6px;
        }

        .sessions-list::-webkit-scrollbar-track {
            background: var(--scrollbar-track, rgba(0, 0, 0, 0.2));
            border-radius: 3px;
        }

        .sessions-list::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb, rgba(255, 255, 255, 0.2));
            border-radius: 3px;
        }

        .sessions-list::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover, rgba(255, 255, 255, 0.3));
        }

        .conversation-view::-webkit-scrollbar {
            width: 6px;
        }

        .conversation-view::-webkit-scrollbar-track {
            background: var(--scrollbar-track, rgba(0, 0, 0, 0.2));
            border-radius: 3px;
        }

        .conversation-view::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb, rgba(255, 255, 255, 0.2));
            border-radius: 3px;
        }

        .conversation-view::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover, rgba(255, 255, 255, 0.3));
        }

        .tabs-container {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            border-bottom: 1px solid var(--button-border);
            padding-bottom: 8px;
        }

        .tab {
            background: transparent;
            color: var(--description-color);
            border: none;
            padding: 8px 16px;
            border-radius: 4px 4px 0 0;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .tab:hover {
            background: var(--hover-background);
            color: var(--text-color);
        }

        .tab.active {
            background: var(--focus-box-shadow);
            color: var(--text-color);
            border-bottom: 2px solid var(--focus-border-color);
        }

        .saved-response-item {
            background: var(--input-background);
            border: 1px solid var(--button-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 8px;
            transition: all 0.15s ease;
        }

        .saved-response-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }

        .saved-response-profile {
            font-size: 11px;
            font-weight: 600;
            color: var(--focus-border-color);
            text-transform: capitalize;
        }

        .saved-response-date {
            font-size: 10px;
            color: var(--description-color);
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
            color: var(--description-color);
            border: none;
            padding: 4px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .delete-button:hover {
            background: rgba(255, 0, 0, 0.1);
            color: #ff4444;
        }

        /* Code block styling for history view */
        .conversation-view code {
            background: rgba(255, 255, 255, 0.1);
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.85em;
            color: var(--text-color);
        }

        .conversation-view pre {
            background: var(--input-background);
            border: 1px solid var(--button-border);
            border-radius: 8px;
            padding: 1.2em;
            overflow-x: auto;
            margin: 1.2em 0;
            position: relative;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .conversation-view pre code {
            background: none;
            padding: 0;
            border-radius: 0;
            font-size: 0.9em;
            line-height: 1.5;
            display: block;
            white-space: pre;
            overflow-x: auto;
        }

        /* Enhanced syntax highlighting styles */
        .conversation-view pre code.hljs {
            background: transparent !important;
            padding: 0 !important;
        }

        /* Language label for code blocks */
        .conversation-view pre::before {
            content: attr(data-language);
            position: absolute;
            top: 0.5em;
            right: 1em;
            background: var(--button-background);
            color: var(--description-color);
            padding: 0.2em 0.6em;
            border-radius: 4px;
            font-size: 0.7em;
            font-weight: 500;
            text-transform: uppercase;
            opacity: 0.7;
        }

        /* Copy button for code blocks */
        .conversation-view pre::after {
            content: var(--after-content, "📋");
            position: absolute;
            top: 0.5em;
            right: 0.5em;
            cursor: pointer;
            opacity: 0.5;
            transition: opacity 0.2s;
            font-size: 0.8em;
        }

        .conversation-view pre:hover::after {
            opacity: 1;
        }

        /* Inline code improvements */
        .conversation-view p code,
        .conversation-view li code {
            background: rgba(255, 255, 255, 0.15);
            padding: 0.15em 0.4em;
            border-radius: 4px;
            font-size: 0.9em;
            font-weight: 500;
        }

        /* Code block scrollbar */
        .conversation-view pre::-webkit-scrollbar {
            height: 6px;
        }

        .conversation-view pre::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
            border-radius: 3px;
        }

        .conversation-view pre::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 3px;
        }

        .conversation-view pre::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }

        /* ChatGPT-style formatting for history view */
        .conversation-view {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
        }

        .conversation-view h1,
        .conversation-view h2,
        .conversation-view h3,
        .conversation-view h4,
        .conversation-view h5,
        .conversation-view h6 {
            margin: 1.5em 0 0.8em 0;
            font-weight: 600;
            color: var(--text-color);
            border-bottom: 1px solid var(--button-border);
            padding-bottom: 0.3em;
        }

        .conversation-view h1 { font-size: 1.8em; }
        .conversation-view h2 { font-size: 1.5em; }
        .conversation-view h3 { font-size: 1.3em; }
        .conversation-view h4 { font-size: 1.1em; }

        .conversation-view p {
            margin: 1em 0;
            color: var(--text-color);
        }

        .conversation-view ul,
        .conversation-view ol {
            margin: 1em 0;
            padding-left: 2em;
        }

        .conversation-view li {
            margin: 0.5em 0;
            color: var(--text-color);
        }

        .conversation-view blockquote {
            margin: 1.5em 0;
            padding: 1em 1.5em;
            border-left: 4px solid var(--accent-color);
            background: var(--input-background);
            border-radius: 0 8px 8px 0;
            font-style: italic;
        }

        .conversation-view blockquote p {
            margin: 0;
        }

        /* Collapsible sections */
        .conversation-view details {
            margin: 1em 0;
            border: 1px solid var(--button-border);
            border-radius: 8px;
            background: var(--input-background);
            overflow: hidden;
        }

        .conversation-view summary {
            padding: 1em 1.5em;
            background: var(--button-background);
            cursor: pointer;
            font-weight: 600;
            color: var(--text-color);
            border-bottom: 1px solid var(--button-border);
            transition: background-color 0.2s ease;
        }

        .conversation-view summary:hover {
            background: var(--hover-background);
        }

        .conversation-view details[open] summary {
            border-bottom: 1px solid var(--button-border);
        }

        .conversation-view details > *:not(summary) {
            padding: 1.5em;
        }

        /* Code blocks with better styling */
        .conversation-view pre {
            background: #1e1e1e;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 1.5em;
            margin: 1.5em 0;
            overflow-x: auto;
            position: relative;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .conversation-view pre code {
            background: none;
            padding: 0;
            border-radius: 0;
            font-size: 0.9em;
            line-height: 1.5;
            display: block;
            white-space: pre;
            overflow-x: auto;
            color: #d4d4d4;
        }

        /* Inline code */
        .conversation-view code:not(pre code) {
            background: var(--input-background);
            padding: 0.2em 0.5em;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9em;
            color: #e06c75;
            border: 1px solid var(--button-border);
        }

        /* Tables */
        .conversation-view table {
            border-collapse: collapse;
            width: 100%;
            margin: 1.5em 0;
            background: var(--input-background);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .conversation-view th,
        .conversation-view td {
            border: 1px solid var(--button-border);
            padding: 0.8em 1em;
            text-align: left;
        }

        .conversation-view th {
            background: var(--button-background);
            font-weight: 600;
            color: var(--text-color);
        }

        .conversation-view td {
            color: var(--text-color);
        }

        /* Horizontal rules */
        .conversation-view hr {
            border: none;
            border-top: 2px solid var(--button-border);
            margin: 2em 0;
            border-radius: 1px;
        }

        /* Links */
        .conversation-view a {
            color: var(--accent-color);
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-bottom-color 0.2s ease;
        }

        .conversation-view a:hover {
            border-bottom-color: var(--accent-color);
        }

        /* Strong and emphasis */
        .conversation-view strong,
        .conversation-view b {
            font-weight: 700;
            color: var(--text-color);
        }

        .conversation-view em,
        .conversation-view i {
            font-style: italic;
            color: var(--text-color);
        }

        /* Keyboard keys */
        .conversation-view kbd {
            background: var(--button-background);
            border: 1px solid var(--button-border);
            border-radius: 4px;
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
            color: var(--text-color);
            display: inline-block;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.8em;
            font-weight: 600;
            line-height: 1;
            padding: 0.3em 0.6em;
            white-space: nowrap;
        }
    `;

    static properties = {
        sessions: { type: Array },
        selectedSession: { type: Object },
        loading: { type: Boolean },
        activeTab: { type: String },
        savedResponses: { type: Array },
    };

    constructor() {
        super();
        this.sessions = [];
        this.selectedSession = null;
        this.loading = true;
        this.activeTab = 'sessions';
        // Load saved responses from localStorage
        try {
            this.savedResponses = JSON.parse(localStorage.getItem('savedResponses') || '[]');
        } catch (e) {
            this.savedResponses = [];
        }
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
            this.sessions = await cheddar.getAllConversationSessions();
        } catch (error) {
            console.error('Error loading conversation sessions:', error);
            this.sessions = [];
        } finally {
            this.loading = false;
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
        if (!session.conversationHistory || session.conversationHistory.length === 0) {
            return 'No conversation yet';
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

    renderMarkdown(content) {
        // Check if marked is available
        if (typeof window !== 'undefined' && window.marked) {
            try {
                // Configure marked for better security and formatting
                window.marked.setOptions({
                    breaks: true,
                    gfm: true,
                    sanitize: false, // We trust the AI responses
                    highlight: function(code, lang) {
                        // Use highlight.js for syntax highlighting if available
                        if (typeof window !== 'undefined' && window.hljs) {
                            if (lang && window.hljs.getLanguage(lang)) {
                                try {
                                    return window.hljs.highlight(code, { language: lang }).value;
                                } catch (err) {
                                    console.warn('Error highlighting code:', err);
                                }
                            }
                            // Auto-detect language if no language specified
                            try {
                                return window.hljs.highlightAuto(code).value;
                            } catch (err) {
                                console.warn('Error auto-highlighting code:', err);
                            }
                        }
                        return code; // Fallback to unhighlighted code
                    }
                });
                let rendered = window.marked.parse(content);
                rendered = this.enhanceCodeBlocks(rendered);
                rendered = this.enhanceCollapsibleSections(rendered);
                return rendered;
            } catch (error) {
                console.warn('Error parsing markdown:', error);
                return content; // Fallback to plain text
            }
        }
        console.log('Marked not available, using plain text');
        return content; // Fallback if marked is not available
    }

    enhanceCodeBlocks(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Find all code blocks and enhance them
        const codeBlocks = doc.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            const pre = block.parentElement;
            const code = block.textContent;
            
            // Extract language from class name (hljs adds language classes)
            const classList = Array.from(block.classList);
            const languageClass = classList.find(cls => cls.startsWith('language-'));
            const language = languageClass ? languageClass.replace('language-', '') : 'text';
            
            // Add language label to pre element
            pre.setAttribute('data-language', language);
        });
        
        return doc.body.innerHTML;
    }

    enhanceCollapsibleSections(html) {
        // Convert markdown collapsible sections to HTML details/summary
        // Pattern: <details>\n<summary>Title</summary>\n\nContent\n</details>
        const detailsRegex = /<details>\s*<summary>(.*?)<\/summary>\s*([\s\S]*?)<\/details>/gi;
        
        return html.replace(detailsRegex, (match, title, content) => {
            // Clean up the content (remove extra whitespace)
            const cleanContent = content.trim();
            
            return `<details>
                <summary>${title}</summary>
                <div>${cleanContent}</div>
            </details>`;
        });
    }

    enhanceCodeBlocksInDOM() {
        const container = this.shadowRoot.querySelector('#conversationView');
        if (!container) return;
        
        // Find all code blocks in the container and enhance them
        const codeBlocks = container.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            const pre = block.parentElement;
            const code = block.textContent;
            
            // Extract language from class name (hljs adds language classes)
            const classList = Array.from(block.classList);
            const languageClass = classList.find(cls => cls.startsWith('language-'));
            const language = languageClass ? languageClass.replace('language-', '') : 'text';
            
            // Add language label to pre element
            pre.setAttribute('data-language', language);
            
            // Apply syntax highlighting using highlight.js
            if (window.hljs) {
                try {
                    // Remove existing highlighting classes
                    block.className = block.className.replace(/hljs-\w+/g, '').trim();
                    
                    if (language && language !== 'text' && window.hljs.getLanguage(language)) {
                        // Highlight with specific language
                        block.innerHTML = window.hljs.highlight(code, { language: language }).value;
                        block.className += ` hljs language-${language}`;
                    } else {
                        // Auto-detect language
                        const result = window.hljs.highlightAuto(code);
                        block.innerHTML = result.value;
                        block.className += ` hljs language-${result.language}`;
                    }
                } catch (error) {
                    console.warn('Error applying syntax highlighting:', error);
                    // Fallback to plain text
                    block.textContent = code;
                }
            }
            
            // Add copy functionality
            pre.style.cursor = 'pointer';
            pre.addEventListener('click', () => {
                navigator.clipboard.writeText(code).then(() => {
                    // Show temporary feedback
                    const originalAfter = pre.style.getPropertyValue('--after-content');
                    pre.style.setProperty('--after-content', '"✅"');
                    setTimeout(() => {
                        pre.style.setProperty('--after-content', originalAfter || '"📋"');
                    }, 1000);
                }).catch(err => {
                    console.warn('Failed to copy code:', err);
                });
            });
        });
    }

    handleTabClick(tab) {
        this.activeTab = tab;
    }

    deleteSavedResponse(index) {
        this.savedResponses = this.savedResponses.filter((_, i) => i !== index);
        localStorage.setItem('savedResponses', JSON.stringify(this.savedResponses));
        this.requestUpdate();
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

    renderSavedResponses() {
        if (this.savedResponses.length === 0) {
            return html`
                <div class="empty-state">
                    <div class="empty-state-title">No saved responses</div>
                    <div>Use the save button during conversations to save important responses</div>
                </div>
            `;
        }

        const profileNames = this.getProfileNames();

        return html`
            <div class="sessions-list">
                ${this.savedResponses.map(
                    (saved, index) => html`
                        <div class="saved-response-item">
                            <div class="saved-response-header">
                                <div>
                                    <div class="saved-response-profile">${profileNames[saved.profile] || saved.profile}</div>
                                    <div class="saved-response-date">${this.formatTimestamp(saved.timestamp)}</div>
                                </div>
                                <button class="delete-button" @click=${() => this.deleteSavedResponse(index)} title="Delete saved response">
                                    <svg
                                        width="16px"
                                        height="16px"
                                        stroke-width="1.7"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M6 6L18 18M6 18L18 6"
                                            stroke="currentColor"
                                            stroke-width="1.7"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        ></path>
                                    </svg>
                                </button>
                            </div>
                            <div class="saved-response-content">${saved.response}</div>
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

        // Enhance code blocks after rendering
        setTimeout(() => {
            this.enhanceCodeBlocksInDOM();
        }, 0);

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
            <div class="conversation-view" id="conversationView">
                ${messages.length > 0
                    ? messages.map(message => html` <div class="message ${message.type}">${this.renderMarkdown(message.content)}</div> `)
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
                <div class="tabs-container">
                    <button class="tab ${this.activeTab === 'sessions' ? 'active' : ''}" @click=${() => this.handleTabClick('sessions')}>
                        Conversation History
                    </button>
                    <button class="tab ${this.activeTab === 'saved' ? 'active' : ''}" @click=${() => this.handleTabClick('saved')}>
                        Saved Responses (${this.savedResponses.length})
                    </button>
                </div>
                ${this.activeTab === 'sessions' ? this.renderSessionsList() : this.renderSavedResponses()}
            </div>
        `;
    }
}

customElements.define('history-view', HistoryView);
