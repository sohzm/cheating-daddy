import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class AssistantView extends LitElement {
    static styles = css`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        * {
            font-family: 'Armata', sans-serif;
            cursor: default;
            letter-spacing: -0.2px;
            font-feature-settings: "tnum", "zero";
        }

        .chat-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 20px;
            background: transparent;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .chat-header {
            display: none;
        }

        .response-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 16px;
            overflow-y: auto;
            font-size: 13px;
            line-height: 1.6;
            background: transparent;
            padding: 20px 0;
            scroll-behavior: smooth;
            user-select: text;
            cursor: text;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            margin-bottom: 16px;
        }

        .response-container * {
            user-select: text;
            cursor: text;
        }

        .response-container a {
            cursor: pointer;
        }

        .message-row {
            display: flex;
            width: 100%;
        }

        .message-row.assistant {
            justify-content: flex-start;
        }

        .message-row.user {
            justify-content: flex-end;
        }

        .chat-bubble {
            max-width: 85%;
            padding: 12px 16px;
            border-radius: 16px;
            line-height: 1.6;
            position: relative;
            word-break: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 0;
            transform: translateY(6px);
            animation: slideInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes slideInUp {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .chat-bubble.assistant {
            background: rgba(255, 255, 255, 0.12);
            color: rgba(255, 255, 255, 0.98);
            border-top-left-radius: 4px;
            border: 0.5px solid rgba(255, 255, 255, 0.15);
            font-weight: 600;
            letter-spacing: 0.1px;
        }

        .chat-bubble.user {
            background: rgba(0, 122, 255, 0.15);
            color: rgba(255, 255, 255, 0.95);
            border-top-right-radius: 4px;
            border: 0.5px solid rgba(0, 122, 255, 0.2);
        }

        .chat-bubble.assistant.active {
            outline: 2px solid var(--focus-border-color);
            box-shadow: 0 0 0 4px var(--focus-box-shadow);
        }

        /* Searching message styles */
        .searching-message {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            border-top-left-radius: 4px;
            border: 0.5px solid rgba(255, 255, 255, 0.12);
            color: rgba(255, 255, 255, 0.8);
            font-size: 13px;
            font-weight: 500;
        }

        .search-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            color: rgba(255, 255, 255, 0.7);
        }

        .search-text {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .search-label {
            color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
        }

        .search-dots {
            display: flex;
            gap: 4px;
        }

        .search-dots .dot {
            width: 4px;
            height: 4px;
            background: rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            animation: searchPulse 1.4s infinite ease-in-out;
        }

        .search-dots .dot:nth-child(1) {
            animation-delay: -0.32s;
        }

        .search-dots .dot:nth-child(2) {
            animation-delay: -0.16s;
        }

        @keyframes searchPulse {
            0%, 80%, 100% {
                transform: scale(0.8);
                opacity: 0.5;
            }
            40% {
                transform: scale(1);
                opacity: 1;
            }
        }

        /* Animated word-by-word reveal */
        .response-container [data-word] {
            opacity: 0;
            filter: blur(10px);
            display: inline-block;
            transition: opacity 0.5s, filter 0.5s;
        }
        .response-container [data-word].visible {
            opacity: 1;
            filter: blur(0px);
        }
        /* Make first word visible immediately */
        .response-container [data-word]:first-child {
            opacity: 1;
            filter: blur(0px);
        }

        /* Markdown styling */
        .response-container h1,
        .response-container h2,
        .response-container h3,
        .response-container h4,
        .response-container h5,
        .response-container h6 {
            margin: 1.2em 0 0.6em 0;
            color: rgba(255, 255, 255, 0.98);
            font-weight: 700;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .response-container h1 {
            font-size: 1.8em;
        }
        .response-container h2 {
            font-size: 1.5em;
        }
        .response-container h3 {
            font-size: 1.3em;
        }
        .response-container h4 {
            font-size: 1.1em;
        }
        .response-container h5 {
            font-size: 1em;
        }
        .response-container h6 {
            font-size: 0.9em;
        }

        .response-container p {
            margin: 0.8em 0;
            color: rgba(255, 255, 255, 0.95);
        }

        .response-container ul,
        .response-container ol {
            margin: 0.8em 0;
            padding-left: 2em;
            color: rgba(255, 255, 255, 0.95);
        }

        .response-container li {
            margin: 0.4em 0;
        }

        .response-container blockquote {
            margin: 1em 0;
            padding: 0.5em 1em;
            border-left: 4px solid var(--focus-border-color);
            background: rgba(0, 122, 255, 0.1);
            font-style: italic;
        }

        .response-container code {
            background: rgba(255, 255, 255, 0.1);
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'Armata', sans-serif;
            font-size: 0.85em;
        }

        .response-container pre {
            background: var(--input-background);
            border: 1px solid var(--button-border);
            border-radius: 6px;
            padding: 1em;
            overflow-x: auto;
            margin: 1em 0;
        }

        .response-container pre code {
            background: none;
            padding: 0;

        }

        .response-container a {
            color: var(--link-color);
            text-decoration: none;
        }

        .response-container a:hover {
            text-decoration: underline;
        }

        .response-container strong,
        .response-container b {
            font-weight: 700;
            color: rgba(255, 255, 255, 0.95);
        }

        .response-container em,
        .response-container i {
            font-style: italic;
        }

        .response-container hr {
            border: none;
            border-top: 1px solid var(--border-color);
            margin: 2em 0;
        }

        .response-container table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }

        .response-container th,
        .response-container td {
            border: 1px solid var(--border-color);
            padding: 0.5em;
            text-align: left;
        }

        .response-container th {
            background: var(--input-background);
            font-weight: 600;
        }

        .response-container::-webkit-scrollbar {
            width: 8px;
        }

        .response-container::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
            border-radius: 4px;
        }

        .response-container::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 4px;
        }

        .response-container::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }

        .text-input-container {
            display: flex;
            gap: 8px;
            align-items: center;
            background: rgba(255, 255, 255, 0.04);
            border: 0.5px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 12px 16px;
            backdrop-filter: blur(20px);
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
        }

        .composer-actions {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
        }

        .text-input-container input {
            flex: 1;
            background: transparent;
            color: rgba(255, 255, 255, 0.95);
            border: none;
            padding: 8px 12px;
            font-size: 14px;
            height: 32px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .text-input-container input:focus {
            outline: none;
        }

        .text-input-container input::placeholder {
            color: rgba(255, 255, 255, 0.5);
        }

        .text-input-container button:not(.send-button) {
            background: rgba(255, 255, 255, 0.02);
            border: 0.5px solid rgba(255, 255, 255, 0.04);
            padding: 6px;
            border-radius: 8px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(20px);
        }

        .text-input-container button:not(.send-button):hover {
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.08);
            transform: translateY(-1px);
        }

        .text-input-container button:not(.send-button):active {
            transform: translateY(0);
            transition: all 0.1s ease;
        }

        .send-button {
            background: rgba(0, 122, 255, 0.4);
            color: rgba(255, 255, 255, 0.9);
            border: 0.5px solid rgba(0, 122, 255, 0.2);
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(20px);
        }

        .send-button:hover {
            background: rgba(0, 122, 255, 0.5);
            border-color: rgba(0, 122, 255, 0.3);
            transform: translateY(-1px);
        }

        .send-button:active {
            transform: translateY(0);
            transition: all 0.1s ease;
        }

        .nav-button {
            background: transparent;
            color: var(--description-color);
            border: none;
            padding: 4px;
            border-radius: 50%;
            font-size: 12px;
            display: flex;
            align-items: center;
            width: 36px;
            height: 36px;
            justify-content: center;
        }

        .nav-button:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .nav-button:disabled {
            opacity: 0.3;
        }

        .nav-button svg {
            stroke: currentColor !important;
        }

        .response-counter {
            font-size: 12px;
            color: var(--description-color);
            white-space: nowrap;
            min-width: 60px;
            text-align: center;
        }

        .save-button {
            background: rgba(42, 45, 64, 0.8);
            color: #c5c8ff;
            border: 1px solid rgba(173, 177, 255, 0.25);
            padding: 8px;
            border-radius: 12px;
            font-size: 12px;
            display: flex;
            align-items: center;
            width: 40px;
            height: 40px;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .save-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
        }

        .save-button.saved {
            color: #6ef7a8;
            border-color: rgba(110, 247, 168, 0.45);
            background: rgba(38, 66, 54, 0.75);
        }

        .save-button.active {
            color: #ffa500;
            border-color: rgba(255, 165, 0, 0.45);
            background: rgba(66, 54, 38, 0.75);
        }

        .save-button svg {
            stroke: currentColor !important;
        }

        .status-banner {
            font-size: 12px;
            color: rgba(223, 226, 255, 0.72);
            text-align: center;
            padding: 6px 0 0 0;
        }
    `;

    static properties = {
        responses: { type: Array },
        selectedProfile: { type: String },
        onSendText: { type: Function },
        shouldAnimateResponse: { type: Boolean },
        messages: { type: Array },
        savedResponses: { type: Array },
        isAudioStopping: { type: Boolean },
        audioStatus: { type: String },
        useCerebras: { type: Boolean },
        cerebrasStatus: { type: String },
        isGeneratingResponse: { type: Boolean },
        lastComposioExecution: { type: Object },
        transcriptOnlyMode: { type: Boolean },
        storedTranscriptCount: { type: Number },
    };

    constructor() {
        super();
        this.responses = [];
        this.selectedProfile = 'meeting';
        this.onSendText = () => {};
        this._lastAnimatedWordCount = 0;
        this.messages = [];
        this._pendingScrollToBottom = false;
        // Load saved responses from localStorage
        try {
            this.savedResponses = JSON.parse(localStorage.getItem('savedResponses') || '[]');
        } catch (e) {
            this.savedResponses = [];
        }
        this.isAudioStopping = false;
        this.audioStatus = '';
        this.useCerebras = true; // Cerebras is now the primary API
        this.cerebrasStatus = '';
        this.isGeneratingResponse = false;
        this.lastComposioExecution = null;
        this.transcriptOnlyMode = false;
        this.storedTranscriptCount = 0;
        
        // Load conversation history from localStorage if available
        this.loadConversationHistory();
    }

    loadConversationHistory() {
        try {
            const savedMessages = localStorage.getItem('conversationHistory');
            if (savedMessages) {
                this.messages = JSON.parse(savedMessages);
                console.log('Loaded conversation history:', this.messages.length, 'messages');
                this.notifyMessagesUpdated();
            }
        } catch (e) {
            console.warn('Failed to load conversation history:', e);
            this.messages = [];
        }
    }
    
    saveConversationHistory() {
        try {
            localStorage.setItem('conversationHistory', JSON.stringify(this.messages));
        } catch (e) {
            console.warn('Failed to save conversation history:', e);
        }
    }
    

    getProfileNames() {
        return {
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
            exam: 'Exam Assistant',
        };
    }

    getCurrentResponse() {
        const profileNames = this.getProfileNames();
        return this.responses.length > 0
            ? this.responses[this.responses.length - 1]
            : `Hey, Im listening to your ${profileNames[this.selectedProfile] || 'session'}?`;
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
                });
                let rendered = window.marked.parse(content);
                rendered = this.wrapWordsInSpans(rendered);
                return rendered;
            } catch (error) {
                console.warn('Error parsing markdown:', error);
                return content; // Fallback to plain text
            }
        }
        console.log('Marked not available, using plain text');
        return content; // Fallback if marked is not available
    }

    wrapWordsInSpans(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const tagsToSkip = ['PRE'];

        function wrap(node) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() && !tagsToSkip.includes(node.parentNode.tagName)) {
                const words = node.textContent.split(/(\s+)/);
                const frag = document.createDocumentFragment();
                words.forEach(word => {
                    if (word.trim()) {
                        const span = document.createElement('span');
                        span.setAttribute('data-word', '');
                        span.textContent = word;
                        frag.appendChild(span);
                    } else {
                        frag.appendChild(document.createTextNode(word));
                    }
                });
                node.parentNode.replaceChild(frag, node);
            } else if (node.nodeType === Node.ELEMENT_NODE && !tagsToSkip.includes(node.tagName)) {
                if (['STRONG', 'B', 'EM', 'I', 'MARK'].includes(node.tagName)) {
                    const textContent = node.textContent;
                    const words = textContent.split(/(\s+)/);
                    const frag = document.createDocumentFragment();
                    
                    // Create a new element with the same tag name
                    const newElement = document.createElement(node.tagName.toLowerCase());
                    
                    words.forEach(word => {
                        if (word.trim()) {
                            const span = document.createElement('span');
                            span.setAttribute('data-word', '');
                            span.textContent = word;
                            newElement.appendChild(span);
                        } else {
                            newElement.appendChild(document.createTextNode(word));
                        }
                    });
                    
                    // Copy any attributes from the original node
                    Array.from(node.attributes).forEach(attr => {
                        newElement.setAttribute(attr.name, attr.value);
                    });
                    
                    frag.appendChild(newElement);
                    node.parentNode.replaceChild(frag, node);
                } else if (node.tagName === 'CODE') {
                    // Handle code elements differently - wrap the entire code block
                    const codeSpan = document.createElement('span');
                    codeSpan.setAttribute('data-word', '');
                    codeSpan.innerHTML = node.outerHTML;
                    node.parentNode.replaceChild(codeSpan, node);
                } else if (node.tagName === 'LI') {
                    // Handle bullet points - extract text and wrap words, preserving the list structure
                    const textContent = node.textContent;
                    const words = textContent.split(/(\s+)/);
                    const frag = document.createDocumentFragment();
                    
                    // Create new LI element
                    const newLi = document.createElement('li');
                    
                    // Copy any attributes from the original node
                    Array.from(node.attributes).forEach(attr => {
                        newLi.setAttribute(attr.name, attr.value);
                    });
                    
                    words.forEach(word => {
                        if (word.trim()) {
                            const span = document.createElement('span');
                            span.setAttribute('data-word', '');
                            span.textContent = word;
                            newLi.appendChild(span);
                        } else {
                            newLi.appendChild(document.createTextNode(word));
                        }
                    });
                    
                    frag.appendChild(newLi);
                    node.parentNode.replaceChild(frag, node);
                } else {
                    // For other elements, recursively process child nodes
                    Array.from(node.childNodes).forEach(wrap);
                }
            }
        }
        Array.from(doc.body.childNodes).forEach(wrap);
        return doc.body.innerHTML;
    }



    scrollResponseUp() {
        const container = this.shadowRoot.querySelector('#responseContainer');
        if (container) {
            const scrollAmount = container.clientHeight * 0.3; // Scroll 30% of container height
            container.scrollTop = Math.max(0, container.scrollTop - scrollAmount);
        }
    }

    notifyMessagesUpdated() {
        try {
            const clonedMessages = (this.messages || []).map(message => ({ ...message }));
            this.dispatchEvent(
                new CustomEvent('messages-updated', {
                    detail: { messages: clonedMessages },
                    bubbles: true,
                    composed: true,
                })
            );
        } catch (error) {
            console.warn('Failed to notify messages update:', error);
        }
    }

    scrollResponseDown() {
        const container = this.shadowRoot.querySelector('#responseContainer');
        if (container) {
            const scrollAmount = container.clientHeight * 0.3; // Scroll 30% of container height
            container.scrollTop = Math.min(container.scrollHeight - container.clientHeight, container.scrollTop + scrollAmount);
        }
    }

    loadFontSize() {
        const fontSize = localStorage.getItem('fontSize');
        if (fontSize !== null) {
            const fontSizeValue = parseInt(fontSize, 10) || 20;
            const root = document.documentElement;
            root.style.setProperty('--response-font-size', `${fontSizeValue}px`);
        }
    }

    connectedCallback() {
        super.connectedCallback();

        // Load and apply font size
        this.loadFontSize();

        // Set up IPC listeners for keyboard shortcuts and transcript mode
        if (window.require) {
            const { ipcRenderer } = window.require('electron');

            this.handleScrollUp = () => {
                console.log('Received scroll-response-up message');
                this.scrollResponseUp();
            };

            this.handleScrollDown = () => {
                console.log('Received scroll-response-down message');
                this.scrollResponseDown();
            };

            this.handleTranscriptModeChanged = (event, data) => {
                console.log('Transcript mode changed:', data);
                this.transcriptOnlyMode = data.transcriptOnlyMode;
                this.requestUpdate();
            };

            this.handleTranscriptsCleared = (event, data) => {
                console.log('Transcripts cleared:', data);
                this.storedTranscriptCount = 0;
                this.requestUpdate();
            };

            this.handleSaveTranscriptOnly = (event, data) => {
                console.log('Transcript saved (no AI response):', data);
                this.storedTranscriptCount = data.allTranscripts?.length || 0;
                this.requestUpdate();
            };

            ipcRenderer.on('scroll-response-up', this.handleScrollUp);
            ipcRenderer.on('scroll-response-down', this.handleScrollDown);
            ipcRenderer.on('transcript-mode-changed', this.handleTranscriptModeChanged);
            ipcRenderer.on('transcripts-cleared', this.handleTranscriptsCleared);
            ipcRenderer.on('save-transcript-only', this.handleSaveTranscriptOnly);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        // Clean up IPC listeners
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            if (this.handleScrollUp) {
                ipcRenderer.removeListener('scroll-response-up', this.handleScrollUp);
            }
            if (this.handleScrollDown) {
                ipcRenderer.removeListener('scroll-response-down', this.handleScrollDown);
            }
            if (this.handleTranscriptModeChanged) {
                ipcRenderer.removeListener('transcript-mode-changed', this.handleTranscriptModeChanged);
            }
            if (this.handleTranscriptsCleared) {
                ipcRenderer.removeListener('transcripts-cleared', this.handleTranscriptsCleared);
            }
            if (this.handleSaveTranscriptOnly) {
                ipcRenderer.removeListener('save-transcript-only', this.handleSaveTranscriptOnly);
            }
        }
    }

    async handleSendText() {
        const textInput = this.shadowRoot.querySelector('#textInput');
        if (!textInput) {
            return;
        }

        const message = textInput.value.trim();
        if (!message) {
            textInput.focus();
            return;
        }

        textInput.value = '';
        textInput.focus();

        // Check if user is asking to analyze stored transcripts
        if (this.isTranscriptAnalysisQuery(message)) {
            await this.analyzeStoredTranscripts(message);
            return;
        }

        // Use Cerebras as the primary chat API
        await this.generateCerebrasResponse(message);
    }

    handleTextKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSendText();
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = this.shadowRoot.querySelector('#responseContainer');
            if (container) {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 50);
    }

    saveCurrentResponse() {
        const currentResponse = this.getCurrentResponse();
        if (currentResponse && !this.isResponseSaved()) {
            this.savedResponses = [
                ...this.savedResponses,
                {
                    response: currentResponse,
                    timestamp: new Date().toISOString(),
                    profile: this.selectedProfile,
                },
            ];
            // Save to localStorage for persistence
            localStorage.setItem('savedResponses', JSON.stringify(this.savedResponses));
            this.requestUpdate();
        }
    }

    isResponseSaved() {
        const currentResponse = this.getCurrentResponse();
        return this.savedResponses.some(saved => saved.response === currentResponse);
    }

    getConversationSummary(maxMessages = 10) {
        const msgs = (this.messages || []).slice(-maxMessages);
        const parts = msgs.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${String(m.content || '').trim()}`);
        const joined = parts.join('\n');
        // Trim overly long summaries
        return joined.length > 4000 ? joined.slice(0, 4000) + '...' : joined;
    }

    async takeScreenshot() {
        try {
            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            if (!ipcRenderer) {
                console.error('IPC unavailable for screenshot');
                return;
            }

            console.log('Taking screenshot...');
            const result = await ipcRenderer.invoke('capture-manual-screenshot');
            if (result?.success) {
                console.log('Screenshot captured successfully');
            } else {
                console.error('Failed to capture screenshot:', result?.error || 'Unknown error');
            }
        } catch (err) {
            console.error('Error taking screenshot:', err?.message || err);
        }
    }

    /**
     * Check if the user query is asking to analyze stored transcripts
     * @param {string} message - The user's message
     * @returns {boolean} - Whether this is a transcript analysis query
     */
    isTranscriptAnalysisQuery(message) {
        if (!message || typeof message !== 'string') {
            return false;
        }

        const lowerMessage = message.toLowerCase().trim();
        
        // Keywords that indicate transcript analysis requests
        const transcriptKeywords = [
            'what can i pull from this transcript',
            'analyze this transcript',
            'what can you tell me about this transcript',
            'summarize this transcript',
            'what did i say in the transcript',
            'transcript analysis',
            'analyze the transcript',
            'what\'s in the transcript',
            'whats in the transcript',
            'tell me about the transcript',
            'what can you extract from the transcript',
            'pull from transcript',
            'extract from transcript'
        ];

        return transcriptKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    /**
     * Analyze stored transcripts and provide AI response
     * @param {string} userQuery - The user's analysis request
     */
    async analyzeStoredTranscripts(userQuery) {
        try {
            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            if (!ipcRenderer) {
                this.cerebrasStatus = 'IPC unavailable for transcript analysis.';
                return;
            }

            this.isGeneratingResponse = true;
            this.cerebrasStatus = 'Analyzing stored transcripts...';
            this.requestUpdate();

            // Get stored transcripts from main process
            const transcriptResult = await ipcRenderer.invoke('analyze-stored-transcripts', userQuery);
            
            if (!transcriptResult?.success) {
                this.cerebrasStatus = transcriptResult?.message || 'No transcripts available to analyze.';
                this.isGeneratingResponse = false;
                this.requestUpdate();
                return;
            }

            // Add user message to conversation
            this.messages = [...this.messages, { role: 'user', content: userQuery }];
            this.notifyMessagesUpdated();

            // Create analysis prompt with the combined transcript
            const analysisPrompt = `Please analyze the following transcript and answer the user's question: "${userQuery}"

TRANSCRIPT:
${transcriptResult.combinedTranscript}

Please provide a comprehensive analysis based on what was discussed in the transcript.`;

            // Use Cerebras to analyze the transcript
            const analysisResult = await ipcRenderer.invoke('generate-cerebras-response', {
                userMessage: analysisPrompt,
                systemPrompt: `You are a helpful assistant that analyzes transcripts and provides insights. Be thorough and specific in your analysis, referencing specific parts of the transcript when relevant.`,
                history: this.messages.slice(-5).map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                temperature: 0.7,
                maxTokens: 1024
            });

            if (analysisResult?.success && analysisResult?.response) {
                const responseText = typeof analysisResult.response === 'object' && analysisResult.response !== null 
                    ? String(analysisResult.response.text ?? '') 
                    : String(analysisResult.response ?? '');

                const finalResponse = responseText.trim() || 'I analyzed the transcript but couldn\'t generate a response.';

                this.messages = [...this.messages, { role: 'assistant', content: finalResponse }];
                this.notifyMessagesUpdated();

                this.responses = [...this.responses, finalResponse];
                this.saveConversationHistory();

                this.shouldAnimateResponse = true;
                this.cerebrasStatus = `Analyzed ${transcriptResult.transcriptCount} transcript entries`;
            } else {
                this.cerebrasStatus = `Analysis failed: ${analysisResult?.error || 'Unknown error'}`;
            }
        } catch (err) {
            this.cerebrasStatus = `Analysis error: ${err?.message || err}`;
        } finally {
            this.isGeneratingResponse = false;
            this.requestUpdate();
        }
    }

    /**
     * Toggle transcript-only mode
     */
    async toggleTranscriptOnlyMode() {
        try {
            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            if (!ipcRenderer) {
                console.error('IPC unavailable for transcript mode toggle');
                return;
            }

            const newMode = !this.transcriptOnlyMode;
            const result = await ipcRenderer.invoke('set-transcript-only-mode', newMode);
            
            if (result?.success) {
                this.transcriptOnlyMode = newMode;
                this.cerebrasStatus = newMode 
                    ? 'Transcript-only mode enabled - recording without AI responses' 
                    : 'Normal mode enabled - AI will respond to audio';
                this.requestUpdate();
            } else {
                console.error('Failed to toggle transcript mode:', result?.error);
            }
        } catch (err) {
            console.error('Error toggling transcript mode:', err?.message || err);
        }
    }

    /**
     * Clear stored transcripts
     */
    async clearStoredTranscripts() {
        try {
            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            if (!ipcRenderer) {
                console.error('IPC unavailable for clearing transcripts');
                return;
            }

            const result = await ipcRenderer.invoke('clear-stored-transcripts');
            if (result?.success) {
                this.storedTranscriptCount = 0;
                this.cerebrasStatus = 'Stored transcripts cleared';
                this.requestUpdate();
            } else {
                console.error('Failed to clear transcripts:', result?.error);
            }
        } catch (err) {
            console.error('Error clearing transcripts:', err?.message || err);
        }
    }

    /**
     * Determine if a query requires Google Search based on content analysis
     * @param {string} userMessage - The user's message/query
     * @returns {boolean} - Whether Google Search should be used
     */
    shouldUseGoogleSearch(userMessage) {
        if (!userMessage || typeof userMessage !== 'string') {
            return false;
        }

        const message = userMessage.toLowerCase().trim();
        
        // Keywords that indicate need for current/recent information
        const currentInfoKeywords = [
            'latest', 'recent', 'current', 'today', 'yesterday', 'this week', 'this month',
            'now', 'happening', 'breaking', 'news', 'update', 'score', 'result',
            'winner', 'loser', 'game', 'match', 'election', 'weather', 'stock',
            'price', 'rate', 'exchange', 'cryptocurrency', 'bitcoin', 'ethereum'
        ];

        // Time-sensitive indicators
        const timeSensitiveKeywords = [
            '2024', '2025', 'this year', 'last year', 'yesterday', 'today',
            'recently', 'just happened', 'live', 'streaming', 'ongoing'
        ];

        // Question words that often need current data (more specific)
        const questionWords = [
            'who won', 'what happened', 'when did', 'how much', 'how many',
            'what\'s the latest', 'whats the latest', 'what\'s the current', 'whats the current',
            'what\'s happening', 'whats happening', 'what\'s new', 'whats new'
        ];

        // Check for current information needs
        const needsCurrentInfo = currentInfoKeywords.some(keyword => 
            message.includes(keyword)
        );

        // Check for time-sensitive content
        const isTimeSensitive = timeSensitiveKeywords.some(keyword => 
            message.includes(keyword)
        );

        // Check for question patterns that need current data
        const isCurrentQuestion = questionWords.some(pattern => 
            message.includes(pattern)
        );

        // Check for specific domains that need current information
        const currentInfoDomains = [
            'sports', 'football', 'basketball', 'soccer', 'baseball', 'tennis',
            'politics', 'election', 'president', 'government', 'congress',
            'finance', 'market', 'trading', 'crypto', 'bitcoin', 'stocks',
            'technology', 'ai', 'artificial intelligence', 'tech news',
            'entertainment', 'movie', 'celebrity', 'music', 'awards'
        ];

        const isCurrentDomain = currentInfoDomains.some(domain => 
            message.includes(domain)
        );

        // Decision logic: Use Google Search if any of these conditions are met
        const shouldSearch = needsCurrentInfo || isTimeSensitive || isCurrentQuestion || isCurrentDomain;

        console.log(`[AssistantView] Google Search decision for "${userMessage.substring(0, 50)}...": ${shouldSearch ? 'YES' : 'NO'}`);
        console.log(`[AssistantView] Reasons: currentInfo=${needsCurrentInfo}, timeSensitive=${isTimeSensitive}, currentQuestion=${isCurrentQuestion}, currentDomain=${isCurrentDomain}`);

        return shouldSearch;
    }

    /**
     * Detect if text contains voice assistant patterns
     * @param {string} text - The text to analyze
     * @returns {boolean} - Whether the text appears to be from a voice assistant
     */
    isVoiceAssistantText(text) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        const lowerText = text.toLowerCase().trim();
        
        // Voice assistant wake words and patterns
        const wakeWords = [
            'hey siri', 'ok google', 'alexa', 'hey cortana', 'hey assistant',
            'computer', 'jarvis', 'hey google', 'okay google'
        ];

        // Voice assistant response patterns
        const assistantPatterns = [
            'i\'m sorry', 'im sorry', 'i don\'t understand', 'i dont understand',
            'i can\'t help', 'i cant help', 'i\'m not sure', 'im not sure',
            'here\'s what i found', 'heres what i found', 'i found this',
            'according to', 'let me search', 'i\'ll help you', 'ill help you',
            'i can help you', 'what can i help', 'how can i assist',
            'i\'m here to help', 'im here to help', 'i\'m your assistant', 'im your assistant'
        ];

        // System/device response patterns
        const systemPatterns = [
            'system', 'device', 'connected', 'disconnected', 'battery',
            'low battery', 'charging', 'volume', 'brightness', 'settings',
            'notification', 'alert', 'warning', 'error', 'success',
            'wifi', 'bluetooth', 'location', 'permission', 'access'
        ];

        // Check for wake words
        const hasWakeWord = wakeWords.some(wakeWord => 
            lowerText.includes(wakeWord)
        );

        // Check for assistant response patterns
        const hasAssistantPattern = assistantPatterns.some(pattern => 
            lowerText.includes(pattern)
        );

        // Check for system patterns
        const hasSystemPattern = systemPatterns.some(pattern => 
            lowerText.includes(pattern)
        );

        // Additional heuristics - only block very short responses that are likely system confirmations
        const isShortResponse = lowerText.length < 10 && (
            lowerText === 'yes' || lowerText === 'no' || 
            lowerText === 'ok' || lowerText === 'okay' ||
            lowerText === 'sure' || lowerText === 'right' ||
            lowerText === 'done' || lowerText === 'ready'
        );

        const isCommandResponse = lowerText.includes('command') || 
                                 lowerText.includes('executed') ||
                                 lowerText.includes('completed');

        const isVoiceAssistant = hasWakeWord || hasAssistantPattern || hasSystemPattern || 
                                isShortResponse || isCommandResponse;

        if (isVoiceAssistant) {
            console.log(`[AssistantView Voice Filter] Detected voice assistant text: "${text}"`);
        }

        return isVoiceAssistant;
    }

    /**
     * Render the searching message with Google icon
     * @returns {string} HTML string for the searching message
     */
    renderSearchingMessage() {
        return `
            <div class="searching-message">
                <div class="search-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="search-text">
                    <span class="search-label">Searching Google</span>
                    <div class="search-dots">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </div>
                </div>
            </div>
        `;
    }

    async generateCerebrasResponse(userMessage) {
        if (this.isGeneratingResponse) return;
        
        // Check if this is voice assistant content and skip processing
        if (this.isVoiceAssistantText(userMessage)) {
            console.log(`[AssistantView Voice Filter] Blocking voice assistant message: "${userMessage}"`);
            return;
        }
        
        this.isGeneratingResponse = true;
        this.cerebrasStatus = '';
        this.requestUpdate();

        // Check if user is asking about screen content
        const screenContentKeywords = ['screen', 'what\'s on', 'what is on', 'show me', 'see', 'display', 'current', 'this', 'here'];
        const isScreenContentQuery = screenContentKeywords.some(keyword => 
            userMessage.toLowerCase().includes(keyword)
        );

        if (isScreenContentQuery) {
            await this.captureAndAnalyzeScreenContent(userMessage);
            return;
        }

        try {
            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            if (!ipcRenderer) {
                this.cerebrasStatus = 'IPC unavailable for Cerebras.';
                this.isGeneratingResponse = false;
                this.requestUpdate();
                return;
            }

            // Get conversation history for context
            const history = this.messages.slice(-10).map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Get system prompt based on selected profile
            const profileNames = this.getProfileNames();
            const profileName = profileNames[this.selectedProfile] || 'Assistant';
            
            const systemPrompt = `You are a helpful ${profileName.toLowerCase()} assistant. Provide concise, actionable responses based on the conversation context.

Respond ONLY with a valid JSON object following this schema:
{
  "reply": "<message to the user>",
  "should_search": true | false,
  "search_query": "<google search query or empty string>",
  "action": {
    "type": "none" | "composio_workflow",
    "target": "<one of: google_docs | google_sheets | google_slides | gmail | descriptive label>",
    "task": "<succinct imperative description of the requested work>"
  }
}

Guidelines:
- Decide if "should_search" should be true only when answering requires fresh, real-time information or verification that you cannot provide confidently from memory. Otherwise set it to false.
- When "should_search" is true, populate "search_query" with a short, precise Googleable phrase that captures what needs to be looked up. Leave it empty when no search is needed.
- The "reply" field should contain the immediate response you would tell the user before any follow-up search occurs. Acknowledge when you plan to search.
- Set "action.type" to "composio_workflow" when the user wants you to perform a task through a connected integration (for example Google Docs, Google Sheets, Google Slides, or Gmail). Otherwise set it to "none".
- When "action.type" is "composio_workflow", use a known workflow key such as "google_docs", "google_sheets", "google_slides", or "gmail" for "target" (fallback to a concise description if unsure). The "task" field must summarize the work to be done in an imperative voice.
- Do not add any text outside of the JSON object.
- Remember that the host application performs Google Search only when "should_search" is true, so set that field carefully.`;

            const result = await ipcRenderer.invoke('generate-cerebras-response', {
                userMessage,
                systemPrompt,
                history,
                temperature: 0.7,
                maxTokens: 512
            });

            if (result?.success && result?.response) {
                const responsePayload = result.response;
                const responseText = typeof responsePayload === 'object' && responsePayload !== null ? String(responsePayload.text ?? '') : String(responsePayload ?? '');
                let raw = responseText.trim();

                const workflowSuggestion = typeof responsePayload === 'object' && responsePayload !== null ? responsePayload.workflow || null : null;

                const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
                if (fencedMatch) {
                    raw = fencedMatch[1].trim();
                }

                let structured = null;
                try {
                    structured = JSON.parse(raw);
                } catch (parseError) {
                    console.warn('Cerebras did not return JSON, falling back to plain text.', parseError);
                }

                const reply = typeof structured?.reply === 'string' ? structured.reply : responseText;
                const coerceBoolean = value => {
                    if (typeof value === 'boolean') {
                        return value;
                    }
                    if (typeof value === 'string') {
                        const normalized = value.trim().toLowerCase();
                        if (['true', 'yes', '1'].includes(normalized)) {
                            return true;
                        }
                        if (['false', 'no', '0'].includes(normalized)) {
                            return false;
                        }
                    }
                    return null;
                };
                const structuredDecision = coerceBoolean(structured?.should_search);
                const serviceDecision = typeof responsePayload?.shouldUseGoogleSearch === 'boolean' ? responsePayload.shouldUseGoogleSearch : null;
                const fallbackDecision = this.shouldUseGoogleSearch(userMessage);
                const finalDecision = serviceDecision ?? structuredDecision ?? fallbackDecision;
                const shouldSearch = Boolean(finalDecision);

                console.log('[AssistantView] Search decision', {
                    serviceDecision,
                    structuredDecision,
                    fallbackDecision,
                    shouldSearch,
                });
                const searchQuery = typeof structured?.search_query === 'string' ? structured.search_query.trim() : '';
                const structuredAction = structured && typeof structured.action === 'object' ? structured.action : null;
                const workflowContext = {
                    structuredAction,
                    workflowSuggestion,
                    userMessage,
                    assistantReply: reply,
                };

                // Add user message to conversation
                this.messages = [...this.messages, { role: 'user', content: userMessage }];
                console.log('Added user message, total messages:', this.messages.length);
                this.notifyMessagesUpdated();

                if (shouldSearch) {
                    // Show Google search UI instead of immediate response
                    this.messages = [...this.messages, { 
                        role: 'assistant', 
                        content: this.renderSearchingMessage(),
                        isSearching: true 
                    }];
                    console.log('Added searching message, total messages:', this.messages.length);
                    this.notifyMessagesUpdated();

                    this.saveConversationHistory();

                    this.cerebrasStatus = 'Searching Google...';
                    this.requestUpdate();

                    const query = searchQuery || userMessage;
                    await this.performGeminiSearch(userMessage, '', query);
                    await this.triggerWorkflowIfNeeded(workflowContext);
                } else {
                    const finalReply = reply || 'I am not sure what to say yet.';

                    this.messages = [...this.messages, { role: 'assistant', content: finalReply }];
                    console.log('Added assistant response, total messages:', this.messages.length);
                    this.notifyMessagesUpdated();

                    this.responses = [...this.responses, finalReply];

                    this.saveConversationHistory();

                    console.log('Final messages after Cerebras response:', this.messages.length, this.messages);
                    this.shouldAnimateResponse = true;
                    await this.triggerWorkflowIfNeeded(workflowContext);
                }
            } else {
                this.cerebrasStatus = `Failed to generate response: ${result?.error || 'Unknown error'}`;
            }
        } catch (err) {
            this.cerebrasStatus = `Error: ${err?.message || err}`;
        } finally {
            this.isGeneratingResponse = false;
            this.requestUpdate();
        }
    }

    async captureAndAnalyzeScreenContent(userMessage) {
        try {
            this.cerebrasStatus = 'Capturing screen content...';
            this.requestUpdate();

            // Add user message to conversation
            this.messages = [...this.messages, { role: 'user', content: userMessage }];
            this.notifyMessagesUpdated();

            // Add initial response
            const initialResponse = 'Let me take a screenshot and analyze what\'s on your screen.';
            this.messages = [...this.messages, { role: 'assistant', content: initialResponse }];
            this.notifyMessagesUpdated();

            // Capture screenshot
            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            if (!ipcRenderer) {
                throw new Error('IPC unavailable for screen capture');
            }

            // Trigger manual screenshot capture
            const captureResult = await ipcRenderer.invoke('capture-manual-screenshot');
            if (!captureResult?.success) {
                throw new Error(captureResult?.error || 'Failed to capture screenshot');
            }

            this.cerebrasStatus = 'Analyzing screen content...';
            this.requestUpdate();

            // Wait a moment for the screenshot to be processed by Gemini
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Send a follow-up message to get the analysis
            const analysisPrompt = `Please analyze the screenshot I just sent and answer the user's question: "${userMessage}". Provide a detailed description of what you see on the screen and answer their specific question.`;
            
            const analysisResult = await ipcRenderer.invoke('send-text-message', analysisPrompt);
            if (!analysisResult?.success) {
                throw new Error(analysisResult?.error || 'Failed to send analysis request');
            }

            // Wait for Gemini to process and respond
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Update status
            this.cerebrasStatus = 'Screen analysis complete';
            this.requestUpdate();

        } catch (error) {
            console.error('Error capturing and analyzing screen content:', error);
            this.cerebrasStatus = `Error: ${error.message}`;
            
            // Add error message to conversation
            const errorMessage = `Sorry, I couldn't capture or analyze your screen content: ${error.message}`;
            this.messages = [...this.messages, { role: 'assistant', content: errorMessage }];
            this.notifyMessagesUpdated();
        } finally {
            this.isGeneratingResponse = false;
            this.requestUpdate();
        }
    }

    async triggerWorkflowIfNeeded(context) {
        if (!context || typeof context !== 'object') return;

        const { structuredAction, workflowSuggestion, userMessage, assistantReply } = context;
        const actionType = typeof structuredAction?.type === 'string' ? structuredAction.type.toLowerCase() : 'none';
        const hasSuggestion = workflowSuggestion && typeof workflowSuggestion === 'object';

        if (actionType !== 'composio_workflow' && !hasSuggestion) {
            return;
        }

        try {
            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            if (!ipcRenderer) {
                console.warn('IPC unavailable for Composio workflow routing.');
                return;
            }

            const workflowKey = typeof structuredAction?.target === 'string' ? structuredAction.target : workflowSuggestion?.key || null;
            const payload = await ipcRenderer.invoke('cerebras-trigger-workflow', {
                workflowKey,
                targetText: typeof structuredAction?.target === 'string' ? structuredAction.target : null,
                taskSummary: typeof structuredAction?.task === 'string' ? structuredAction.task : assistantReply || userMessage,
                userMessage,
                fallbackWorkflow: hasSuggestion ? workflowSuggestion : null,
            });

            if (!payload) {
                return;
            }

            if (payload.success) {
                const label = payload.workflow?.label || 'Composio';
                if (payload.execution?.success) {
                    let summary = String(payload.execution.modelOutput || payload.execution.summary || '').trim();
                    if (summary.length > 240) {
                        summary = `${summary.slice(0, 237)}...`;
                    }
                    this.cerebrasStatus = summary ? `${label} task executed: ${summary}` : `${label} task executed successfully via Composio.`;
                    this.lastComposioExecution = payload.execution;
                } else if (payload.redirectUrl) {
                    if (payload.requiresConnection) {
                        await ipcRenderer.invoke('open-external', payload.redirectUrl);
                        const reason = payload.error ? ` (${payload.error})` : '';
                        this.cerebrasStatus = `${label} account needs linking${reason}. Follow the browser flow to continue.`;
                    } else {
                        await ipcRenderer.invoke('open-external', payload.redirectUrl);
                        this.cerebrasStatus = `${label} workflow link opened in your browser. Complete the requested task there.`;
                    }
                } else if (payload.requiresConnection) {
                    this.cerebrasStatus = `${label} account needs to be linked before executing tasks.`;
                } else {
                    this.cerebrasStatus = `${label} workflow is ready.`;
                }
            } else if (payload.error) {
                console.warn('Workflow routing failed:', payload.error);
                this.cerebrasStatus = `Workflow error: ${payload.error}`;
            }
        } catch (workflowError) {
            console.error('Error triggering Composio workflow:', workflowError);
            this.cerebrasStatus = `Workflow error: ${workflowError?.message || workflowError}`;
        } finally {
            this.requestUpdate();
        }
    }

    async performGeminiSearch(userMessage, initialResponse, searchQuery) {
        try {
            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            if (!ipcRenderer) {
                this.cerebrasStatus = 'IPC unavailable for Gemini search.';
                return;
            }

            // Use Gemini to perform web search and get enhanced response
            const searchResult = await ipcRenderer.invoke('perform-gemini-search', {
                userMessage,
                initialResponse,
                profile: this.selectedProfile,
                searchQuery
            });

            if (searchResult?.success && searchResult?.response) {
                // Update the last assistant message with the enhanced response
                this.messages = this.messages.map((msg, index) => {
                    if (index === this.messages.length - 1 && msg.role === 'assistant') {
                        return { ...msg, content: searchResult.response, isSearching: false };
                    }
                    return msg;
                });
                this.notifyMessagesUpdated();

                // Update responses array - replace the last response with the enhanced one
                if (this.responses.length > 0) {
                    this.responses = [...this.responses.slice(0, -1), searchResult.response];
                } else {
                    this.responses = [searchResult.response];
                }

                this.shouldAnimateResponse = true;
                
                // Save conversation history with enhanced response
                this.saveConversationHistory();
                
                console.log('Final messages after Gemini search:', this.messages.length, this.messages);
                
                // Force UI update to show the enhanced response
                this.requestUpdate();
            } else {
                this.cerebrasStatus = `Search failed: ${searchResult?.error || 'Unknown error'}`;
            }
        } catch (err) {
            this.cerebrasStatus = `Search error: ${err?.message || err}`;
        }
    }


    firstUpdated() {
        super.firstUpdated();
        this.updateChatContent();
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        if (changedProperties.has('messages')) {
            const previousMessages = changedProperties.get('messages') || [];
            this._pendingScrollToBottom = this.messages.length > previousMessages.length;
            const prevLastAssistantId = this.getLastAssistantMessageId(previousMessages);
            const currentLastAssistantId = this.getLastAssistantMessageId(this.messages);
            if (prevLastAssistantId !== currentLastAssistantId) {
                this._lastAnimatedWordCount = 0;
            }
        }

        if (
            changedProperties.has('messages') ||
            changedProperties.has('responses') ||
            changedProperties.has('shouldAnimateResponse')
        ) {
            this.updateChatContent();
        }
    }

    getLastAssistantMessageId(messages) {
        if (!Array.isArray(messages)) {
            return null;
        }
        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            if (message && message.role === 'assistant') {
                return message.id || `assistant-${i}`;
            }
        }
        return null;
    }

    updateChatContent() {
        const container = this.shadowRoot?.querySelector('#responseContainer');
        if (!container) {
            return;
        }

        console.log('updateChatContent called with', this.messages.length, 'messages');
        
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();

        this.messages.forEach(message => {
            const row = document.createElement('div');
            row.classList.add('message-row', message.role === 'assistant' ? 'assistant' : 'user');

            const bubble = document.createElement('div');
            bubble.classList.add('chat-bubble', message.role === 'assistant' ? 'assistant' : 'user');

            if (message.role === 'assistant') {
                bubble.setAttribute('data-role', 'assistant');
                if (message.isSearching) {
                    bubble.innerHTML = message.content || '';
                } else {
                    bubble.innerHTML = this.renderMarkdown(message.content || '');
                }
            } else {
                bubble.setAttribute('data-role', 'user');
                bubble.textContent = message.content || '';
            }

            row.appendChild(bubble);
            fragment.appendChild(row);
        });

        container.appendChild(fragment);

        this.applyWordAnimation(container);

        // Always scroll to bottom for new messages
        if (this._pendingScrollToBottom || this.shouldAnimateResponse) {
            this.scrollToBottom();
        }

        this._pendingScrollToBottom = false;
    }

    applyWordAnimation(container) {
        const assistantBubbles = Array.from(container.querySelectorAll('.chat-bubble.assistant'));

        if (assistantBubbles.length === 0) {
            if (this.shouldAnimateResponse) {
                this.dispatchEvent(new CustomEvent('response-animation-complete', { bubbles: true, composed: true }));
                this.shouldAnimateResponse = false; // Reset animation flag
            }
            this._lastAnimatedWordCount = 0;
            return;
        }

        // Ensure all previous assistant messages are immediately visible
        assistantBubbles.slice(0, -1).forEach(bubble => {
            bubble.querySelectorAll('[data-word]').forEach(word => word.classList.add('visible'));
        });

        const activeBubble = assistantBubbles[assistantBubbles.length - 1];
        const words = activeBubble.querySelectorAll('[data-word]');

        if (!this.shouldAnimateResponse) {
            assistantBubbles.forEach(bubble => {
                bubble.querySelectorAll('[data-word]').forEach(word => word.classList.add('visible'));
            });
            this._lastAnimatedWordCount = words.length;
            return;
        }

        if (words.length === 0) {
            this.dispatchEvent(new CustomEvent('response-animation-complete', { bubbles: true, composed: true }));
            this.shouldAnimateResponse = false; // Reset animation flag
            this._lastAnimatedWordCount = 0;
            return;
        }

        for (let i = 0; i < this._lastAnimatedWordCount && i < words.length; i++) {
            words[i].classList.add('visible');
        }

        for (let i = this._lastAnimatedWordCount; i < words.length; i++) {
            const word = words[i];
            word.classList.remove('visible');
            setTimeout(() => {
                word.classList.add('visible');
                if (i === words.length - 1) {
                    this.dispatchEvent(new CustomEvent('response-animation-complete', { bubbles: true, composed: true }));
                    this.shouldAnimateResponse = false; // Reset animation flag when complete
                }
            }, (i - this._lastAnimatedWordCount) * 30);
        }

        this._lastAnimatedWordCount = words.length;
    }


    render() {
        const statusMessages = [this.audioStatus, this.cerebrasStatus].filter(Boolean);
        
        // Add transcript mode status
        if (this.transcriptOnlyMode) {
            statusMessages.unshift(`📝 Transcript-only mode: ${this.storedTranscriptCount} stored`);
        }

        return html`
            <div class="chat-wrapper">
                <div class="response-container" id="responseContainer"></div>
                
                <div class="text-input-container">
                    <div class="composer-actions">
                        <button
                            class="save-button ${this.transcriptOnlyMode ? 'active' : ''}"
                            @click=${this.toggleTranscriptOnlyMode}
                            title="${this.transcriptOnlyMode ? 'Disable transcript-only mode' : 'Enable transcript-only mode'}"
                        >
                            <svg
                                width="20"
                                height="20"
                                stroke-width="1.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                                <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></line>
                                <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></line>
                            </svg>
                        </button>
                        ${this.storedTranscriptCount > 0 ? html`
                            <button
                                class="save-button"
                                @click=${this.clearStoredTranscripts}
                                title="Clear stored transcripts (${this.storedTranscriptCount} stored)"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    stroke-width="1.5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path d="M3 6h18" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                                </svg>
                            </button>
                        ` : ''}
                        <button
                            class="save-button"
                            @click=${this.takeScreenshot}
                            title="Take screenshot of the screen"
                        >
                            <svg
                                width="20"
                                height="20"
                                stroke-width="1.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M3 7V5a2 2 0 0 1 2-2h2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                                <path d="M17 3h2a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                                <path d="M21 17v2a2 2 0 0 1-2 2h-2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                                <path d="M7 21H5a2 2 0 0 1-2-2v-2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                                <rect x="8" y="8" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"></rect>
                            </svg>
                        </button>
                    </div>

                    <input type="text" id="textInput" placeholder="Ask anything or give instructions..." @keydown=${this.handleTextKeydown} />

                    <button class="send-button" @click=${this.handleSendText} title="Send message">
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M3 11.5L21 3L13.5 21L11 13L3 11.5Z"
                                stroke="currentColor"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            ></path>
                        </svg>
                    </button>
                </div>
                
                ${statusMessages.length > 0 ? html`
                    <div class="status-banner">
                        ${statusMessages.join(' • ')}
                    </div>
                ` : ''}
            </div>
        `;
    }
}

customElements.define('assistant-view', AssistantView);
