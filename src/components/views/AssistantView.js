import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class AssistantView extends LitElement {
    static styles = css`
        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        * {
            font-family: 'Inter', sans-serif;
            cursor: default;
        }

        .response-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 12px;
            overflow-y: auto;
            border-radius: 12px;
            font-size: var(--response-font-size, 14px);
            line-height: 1.6;
            background: rgba(0, 0, 0, 0.3);
            padding: 20px;
            scroll-behavior: smooth;
            user-select: text;
            cursor: text;
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
            max-width: 75%;
            padding: 12px 16px;
            border-radius: 16px;
            line-height: 1.6;
            position: relative;
            word-break: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .chat-bubble.assistant {
            background: #E6D7FF;
            color: #000000;
            border-top-left-radius: 4px;
            border: 1px solid #D4B0FF;
        }

        .chat-bubble.user {
            background: #ffffff;
            color: #000000;
            border-top-right-radius: 4px;
            border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .chat-bubble.assistant.active {
            outline: 2px solid var(--focus-border-color);
            box-shadow: 0 0 0 4px var(--focus-box-shadow);
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
            color: #000000;
            font-weight: 600;
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
            color: #000000;
        }

        .response-container ul,
        .response-container ol {
            margin: 0.8em 0;
            padding-left: 2em;
            color: #000000;
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
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
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
            border-radius: 0;
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
            font-weight: 600;
            color: #000000;
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
            gap: 12px;
            margin-top: 16px;
            align-items: center;
        }

        .composer-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        .text-input-container input {
            flex: 1;
            background: rgba(200, 160, 255, 0.3);
            color: var(--text-color);
            border: 1px solid rgba(200, 160, 255, 0.5);
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 14px;
            height: 42px;
        }

        .text-input-container input:focus {
            outline: none;
            border-color: rgba(200, 160, 255, 0.8);
            box-shadow: 0 0 0 3px rgba(200, 160, 255, 0.2);
            background: rgba(200, 160, 255, 0.4);
        }

        .text-input-container input::placeholder {
            color: var(--placeholder-color);
        }

        .text-input-container button:not(.send-button) {
            background: transparent;
            border: none;
            padding: 0;
            border-radius: 100px;
        }

        .text-input-container button:not(.send-button):hover {
            background: var(--text-input-button-hover);
        }

        .send-button {
            background: #ffffff;
            color: #000000;
            border: 1px solid rgba(0, 0, 0, 0.1);
            width: 44px;
            height: 44px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
        }

        .send-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);
        }

        .send-button:active {
            transform: translateY(0);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
            background: transparent;
            color: var(--start-button-background);
            border: none;
            padding: 4px;
            border-radius: 50%;
            font-size: 12px;
            display: flex;
            align-items: center;
            width: 36px;
            height: 36px;
            justify-content: center;
            cursor: pointer;
        }

        .save-button:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .save-button.saved {
            color: #4caf50;
        }


        
        .save-button svg {
            stroke: currentColor !important;
        }
    `;

    static properties = {
        responses: { type: Array },
        currentResponseIndex: { type: Number },
        selectedProfile: { type: String },
        onSendText: { type: Function },
        shouldAnimateResponse: { type: Boolean },
        messages: { type: Array },
        savedResponses: { type: Array },
        isEmailSending: { type: Boolean },
        emailStatus: { type: String },
        isAudioStopping: { type: Boolean },
        audioStatus: { type: String },
    };

    constructor() {
        super();
        this.responses = [];
        this.currentResponseIndex = -1;
        this.selectedProfile = 'interview';
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
        this.isEmailSending = false;
        this.emailStatus = '';
        this.isAudioStopping = false;
        this.audioStatus = '';
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

    getCurrentResponse() {
        const profileNames = this.getProfileNames();
        return this.responses.length > 0 && this.currentResponseIndex >= 0
            ? this.responses[this.currentResponseIndex]
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
                // Preserve formatting tags like strong, b, em, i, etc.
                if (['STRONG', 'B', 'EM', 'I', 'CODE', 'MARK'].includes(node.tagName)) {
                    const words = node.textContent.split(/(\s+)/);
                    const frag = document.createDocumentFragment();
                    words.forEach(word => {
                        if (word.trim()) {
                            const span = document.createElement('span');
                            span.setAttribute('data-word', '');
                            span.innerHTML = `<${node.tagName.toLowerCase()}>${word}</${node.tagName.toLowerCase()}>`;
                            frag.appendChild(span);
                        } else {
                            frag.appendChild(document.createTextNode(word));
                        }
                    });
                    node.parentNode.replaceChild(frag, node);
                } else {
                    Array.from(node.childNodes).forEach(wrap);
                }
            }
        }
        Array.from(doc.body.childNodes).forEach(wrap);
        return doc.body.innerHTML;
    }

    getResponseCounter() {
        return this.responses.length > 0 ? `${this.currentResponseIndex + 1}/${this.responses.length}` : '';
    }

    navigateToPreviousResponse() {
        if (this.currentResponseIndex > 0) {
            this.currentResponseIndex--;
            this.dispatchEvent(
                new CustomEvent('response-index-changed', {
                    detail: { index: this.currentResponseIndex },
                })
            );
            this.requestUpdate();
        }
    }

    navigateToNextResponse() {
        if (this.currentResponseIndex < this.responses.length - 1) {
            this.currentResponseIndex++;
            this.dispatchEvent(
                new CustomEvent('response-index-changed', {
                    detail: { index: this.currentResponseIndex },
                })
            );
            this.requestUpdate();
        }
    }

    scrollResponseUp() {
        const container = this.shadowRoot.querySelector('#responseContainer');
        if (container) {
            const scrollAmount = container.clientHeight * 0.3; // Scroll 30% of container height
            container.scrollTop = Math.max(0, container.scrollTop - scrollAmount);
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

        // Set up IPC listeners for keyboard shortcuts
        if (window.require) {
            const { ipcRenderer } = window.require('electron');

            this.handlePreviousResponse = () => {
                console.log('Received navigate-previous-response message');
                this.navigateToPreviousResponse();
            };

            this.handleNextResponse = () => {
                console.log('Received navigate-next-response message');
                this.navigateToNextResponse();
            };

            this.handleScrollUp = () => {
                console.log('Received scroll-response-up message');
                this.scrollResponseUp();
            };

            this.handleScrollDown = () => {
                console.log('Received scroll-response-down message');
                this.scrollResponseDown();
            };

            ipcRenderer.on('navigate-previous-response', this.handlePreviousResponse);
            ipcRenderer.on('navigate-next-response', this.handleNextResponse);
            ipcRenderer.on('scroll-response-up', this.handleScrollUp);
            ipcRenderer.on('scroll-response-down', this.handleScrollDown);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        // Clean up IPC listeners
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            if (this.handlePreviousResponse) {
                ipcRenderer.removeListener('navigate-previous-response', this.handlePreviousResponse);
            }
            if (this.handleNextResponse) {
                ipcRenderer.removeListener('navigate-next-response', this.handleNextResponse);
            }
            if (this.handleScrollUp) {
                ipcRenderer.removeListener('scroll-response-up', this.handleScrollUp);
            }
            if (this.handleScrollDown) {
                ipcRenderer.removeListener('scroll-response-down', this.handleScrollDown);
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

        // Check if this is an email command and handle it automatically
        const isEmailRequest = await this.shouldSendEmail(message);
        if (isEmailRequest) {
            await this.sendEmailFromCommand(message);
            return;
        }

        await this.onSendText(message);
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
                container.scrollTop = container.scrollHeight;
            }
        }, 0);
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

    async emailConversationSummary() {
        if (this.isEmailSending) return;
        this.isEmailSending = true;
        this.emailStatus = 'Preparing summary...';
        this.requestUpdate();

        try {
            const summary = this.getConversationSummary(12) || this.getCurrentResponse() || '';
            const toEmail = localStorage.getItem('summaryEmail') || 'nikhilprabhu06@gmail.com';
            const externalUserId = 'nikhilprabhu06@gmail.com';

            const task = `Using connected Gmail, send an email to ${toEmail} with subject "Conversation Summary" and body:\n\n${summary}`;

            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            if (!ipcRenderer) {
                this.emailStatus = 'IPC unavailable to send email.';
                this.isEmailSending = false;
                this.requestUpdate();
                return;
            }

            this.emailStatus = 'Sending email via Composio...';
            this.requestUpdate();

            const result = await ipcRenderer.invoke('execute-email-task', externalUserId, task, ["GMAIL_SEND_EMAIL"]);
            if (result?.success) {
                this.emailStatus = 'Email sent successfully!';
            } else {
                this.emailStatus = `Failed to send email: ${result?.error || 'Unknown error'}`;
            }
        } catch (err) {
            this.emailStatus = `Error: ${err?.message || err}`;
        } finally {
            this.isEmailSending = false;
            this.requestUpdate();
        }
    }

    // Extract email address from text using regex
    extractEmailFromText(text) {
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const matches = text.match(emailRegex);
        return matches ? matches[0] : null;
    }

    // Check if text contains email sending commands
    containsEmailCommand(text) {
        const emailKeywords = [
            'send an email', 'send email', 'email to', 'send to', 'email about',
            'send him', 'send her', 'email him', 'email her', 'forward to',
            'share with', 'send this to', 'email this to', 'send notes to',
            'email notes to', 'send summary to', 'email summary to'
        ];
        
        const lowerText = text.toLowerCase();
        return emailKeywords.some(keyword => lowerText.includes(keyword));
    }

    // Let the LLM decide if this is an email command
    async shouldSendEmail(userMessage) {
        try {
            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            if (!ipcRenderer) return false;

            // Ask Gemini to analyze if this is an email request
            const analysisPrompt = `Analyze this user message and determine if they want to send an email. Look for:
1. Email addresses (like user@domain.com)
2. Intent to send/share/forward information
3. Requests to email someone

User message: "${userMessage}"

Respond with ONLY "YES" if this is clearly an email request, or "NO" if it's not.`;

            const response = await ipcRenderer.invoke('analyze-email-intent', analysisPrompt);
            
            if (response?.success && response?.result?.toLowerCase().includes('yes')) {
                return true;
            }
            return false;
        } catch (err) {
            console.error('Error analyzing email intent:', err);
            // Fallback to regex if LLM analysis fails
            return this.containsEmailCommand(userMessage) && this.extractEmailFromText(userMessage);
        }
    }

    // Send email based on user's natural language command
    async sendEmailFromCommand(userMessage) {
        if (this.isEmailSending) return;

        const emailAddress = this.extractEmailFromText(userMessage);
        if (!emailAddress) {
            this.emailStatus = 'No email address found in your message.';
            this.requestUpdate();
            return;
        }

        this.isEmailSending = true;
        this.emailStatus = `Preparing email to ${emailAddress}...`;
        this.requestUpdate();

        try {
            // Check Gmail connection first
            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            if (!ipcRenderer) {
                this.emailStatus = 'IPC unavailable to send email.';
                this.isEmailSending = false;
                this.requestUpdate();
                return;
            }

            // Check Gmail connection status
            const externalUserId = 'nikhilprabhu06@gmail.com';
            const connectionStatus = await ipcRenderer.invoke('get-gmail-connection-status', externalUserId);
            if (!connectionStatus?.success) {
                this.emailStatus = `Gmail not connected: ${connectionStatus?.error || 'Unknown error'}. Please connect Gmail first.`;
                this.isEmailSending = false;
                this.requestUpdate();
                return;
            }

            // Get conversation context
            const summary = this.getConversationSummary(15) || this.getCurrentResponse() || '';

            // Create a more natural task based on user's request
            const task = `Send an email using Gmail. Recipient: ${emailAddress}. Subject: "Conversation Summary". Body: The user requested: "${userMessage}". Include this conversation context:\n\n${summary}`;

            this.emailStatus = `Sending email to ${emailAddress} via Composio...`;
            this.requestUpdate();

            const result = await ipcRenderer.invoke('execute-email-task', externalUserId, task, ["GMAIL_SEND_EMAIL"]);
            if (result?.success) {
                this.emailStatus = `Email sent successfully to ${emailAddress}!`;
            } else {
                this.emailStatus = `Failed to send email: ${result?.error || 'Unknown error'}`;
            }
        } catch (err) {
            this.emailStatus = `Error: ${err?.message || err}`;
        } finally {
            this.isEmailSending = false;
            this.requestUpdate();
        }
    }

    async stopAudioRecording() {
        if (this.isAudioStopping) return;
        
        this.isAudioStopping = true;
        this.audioStatus = 'Stopping audio recording...';
        this.requestUpdate();

        try {
            const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: window.electron?.ipcRenderer };
            if (!ipcRenderer) {
                this.audioStatus = 'IPC unavailable to stop audio.';
                this.isAudioStopping = false;
                this.requestUpdate();
                return;
            }

            const result = await ipcRenderer.invoke('stop-macos-audio');
            if (result?.success) {
                this.audioStatus = 'Audio recording stopped successfully!';
            } else {
                this.audioStatus = `Failed to stop audio: ${result?.error || 'Unknown error'}`;
            }
        } catch (err) {
            this.audioStatus = `Error: ${err?.message || err}`;
        } finally {
            this.isAudioStopping = false;
            this.requestUpdate();
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
            changedProperties.has('currentResponseIndex') ||
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

        container.innerHTML = '';
        let assistantIndex = -1;
        const fragment = document.createDocumentFragment();

        this.messages.forEach(message => {
            const row = document.createElement('div');
            row.classList.add('message-row', message.role === 'assistant' ? 'assistant' : 'user');

            const bubble = document.createElement('div');
            bubble.classList.add('chat-bubble', message.role === 'assistant' ? 'assistant' : 'user');

            if (message.role === 'assistant') {
                assistantIndex += 1;
                bubble.setAttribute('data-role', 'assistant');
                bubble.setAttribute('data-assistant-index', assistantIndex.toString());
                bubble.innerHTML = this.renderMarkdown(message.content || '');
            } else {
                bubble.setAttribute('data-role', 'user');
                bubble.textContent = message.content || '';
            }

            row.appendChild(bubble);
            fragment.appendChild(row);
        });

        container.appendChild(fragment);

        this.applyWordAnimation(container);

        const isViewingLatest = this.currentResponseIndex === this.responses.length - 1;
        const shouldStickToBottom = this._pendingScrollToBottom || (isViewingLatest && this.shouldAnimateResponse);

        if (shouldStickToBottom) {
            this.scrollToBottom();
        }

        this._pendingScrollToBottom = false;

        this.highlightActiveAssistant({ shouldScroll: !shouldStickToBottom });
    }

    applyWordAnimation(container) {
        const assistantBubbles = Array.from(container.querySelectorAll('.chat-bubble.assistant'));

        if (assistantBubbles.length === 0) {
            if (this.shouldAnimateResponse) {
                this.dispatchEvent(new CustomEvent('response-animation-complete', { bubbles: true, composed: true }));
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
                }
            }, (i - this._lastAnimatedWordCount) * 30);
        }

        this._lastAnimatedWordCount = words.length;
    }

    highlightActiveAssistant({ shouldScroll = true } = {}) {
        const container = this.shadowRoot?.querySelector('#responseContainer');
        if (!container) {
            return;
        }

        container.querySelectorAll('.chat-bubble.assistant').forEach(bubble => bubble.classList.remove('active'));

        if (this.currentResponseIndex < 0) {
            return;
        }

        const activeBubble = container.querySelector(
            `.chat-bubble.assistant[data-assistant-index="${this.currentResponseIndex}"]`
        );

        if (activeBubble) {
            activeBubble.classList.add('active');
            if (shouldScroll) {
                activeBubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }

    render() {
        const responseCounter = this.getResponseCounter();
        const isSaved = this.isResponseSaved();

        return html`
            <div class="response-container" id="responseContainer"></div>

            <div class="text-input-container">
                <div class="composer-actions">
                    <button class="nav-button" @click=${this.navigateToPreviousResponse} ?disabled=${this.currentResponseIndex <= 0}>
                        <svg
                            width="24"
                            height="24"
                            stroke-width="1.7"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M15 6L9 12L15 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                    </button>

                    <button class="nav-button" @click=${this.navigateToNextResponse} ?disabled=${this.currentResponseIndex >= this.responses.length - 1}>
                        <svg
                            width="24"
                            height="24"
                            stroke-width="1.7"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                    </button>

                    ${this.responses.length > 0 ? html` <span class="response-counter">${responseCounter}</span> ` : ''}

                    <button
                        class="save-button ${isSaved ? 'saved' : ''}"
                        @click=${this.saveCurrentResponse}
                        title="${isSaved ? 'Response saved' : 'Save this response'}"
                    >
                        <svg
                            width="24"
                            height="24"
                            stroke-width="1.7"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M5 20V5C5 3.89543 5.89543 3 7 3H16.1716C16.702 3 17.2107 3.21071 17.5858 3.58579L19.4142 5.41421C19.7893 5.78929 20 6.29799 20 6.82843V20C20 21.1046 19.1046 22 18 22H7C5.89543 22 5 21 5 20Z"
                                stroke="currentColor"
                                stroke-width="1.7"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            ></path>
                            <path d="M15 22V13H9V22" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                            <path d="M9 3V8H15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                    </button>

                    <button
                        class="save-button"
                        @click=${this.emailConversationSummary}
                        title="Email conversation summary via Composio Gmail"
                        ?disabled=${this.isEmailSending}
                    >
                        <svg
                            width="24"
                            height="24"
                            stroke-width="1.7"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M4 4H20V20H4V4Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                            <path d="M4 7L12 12L20 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                    </button>

                    <button
                        class="save-button"
                        @click=${this.stopAudioRecording}
                        title="Stop computer audio recording"
                        ?disabled=${this.isAudioStopping}
                    >
                        <svg
                            width="24"
                            height="24"
                            stroke-width="1.7"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.7"></circle>
                            <rect x="9" y="9" width="6" height="6" stroke="currentColor" stroke-width="1.7"></rect>
                        </svg>
                    </button>
                </div>

                <input type="text" id="textInput" placeholder="Type a message to the AI..." @keydown=${this.handleTextKeydown} />

                <button class="send-button" @click=${this.handleSendText} title="Send message">
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M3 11.5L21 3L13.5 21L11 13L3 11.5Z"
                            stroke="currentColor"
                            stroke-width="1.7"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        ></path>
                    </svg>
                </button>
            </div>

            ${this.emailStatus ? html`<div class="usage-note" style="margin-top:6px;text-align:center;opacity:0.85;">${this.emailStatus}</div>` : ''}
            ${this.audioStatus ? html`<div class="usage-note" style="margin-top:6px;text-align:center;opacity:0.85;">${this.audioStatus}</div>` : ''}
        `;
    }
}

customElements.define('assistant-view', AssistantView);
