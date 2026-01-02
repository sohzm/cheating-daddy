import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class AssistantView extends LitElement {
    static styles = css`
        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            cursor: default;
        }

        .response-container {
            height: calc(100% - 50px);
            overflow-y: auto;
            font-size: var(--response-font-size, 16px);
            line-height: 1.6;
            background: var(--bg-primary);
            padding: 12px;
            scroll-behavior: smooth;
            user-select: text;
            cursor: default;
        }

        .response-container * {
            user-select: text;
            cursor: default;
        }

        .response-container a {
            cursor: default;
        }

        /* Continuous Mode Styles */
        .response-list {
            display: flex;
            flex-direction: column;
            gap: 24px;
            padding-bottom: 50px;
        }

        .response-item {
            position: relative;
            padding: 8px 0;
        }
        
        .response-checkpoint {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 16px 0 8px 0;
            opacity: 0.5;
            font-size: 11px;
            color: var(--text-muted);
        }

        .response-checkpoint::before,
        .response-checkpoint::after {
            content: '';
            flex: 1;
            height: 1px;
            background: var(--border-color);
        }

        .response-item.active-item {
            /* Highlight active item if needed, currently subtle */
        }

        /* Word display (no animation) */
        .response-container [data-word] {
            display: inline-block;
        }

        /* Markdown styling */
        .response-container h1,
        .response-container h2,
        .response-container h3,
        .response-container h4,
        .response-container h5,
        .response-container h6 {
            margin: 1em 0 0.5em 0;
            color: var(--text-color);
            font-weight: 600;
        }

        .response-container h1 { font-size: 1.6em; }
        .response-container h2 { font-size: 1.4em; }
        .response-container h3 { font-size: 1.2em; }
        .response-container h4 { font-size: 1.1em; }
        .response-container h5 { font-size: 1em; }
        .response-container h6 { font-size: 0.9em; }

        .response-container p {
            margin: 0.6em 0;
            color: var(--text-color);
        }

        .response-container ul,
        .response-container ol {
            margin: 0.6em 0;
            padding-left: 1.5em;
            color: var(--text-color);
        }

        .response-container li {
            margin: 0.3em 0;
        }

        .response-container blockquote {
            margin: 0.8em 0;
            padding: 0.5em 1em;
            border-left: 2px solid var(--border-default);
            background: var(--bg-secondary);
        }

        .response-container code {
            background: var(--bg-tertiary);
            padding: 0.15em 0.4em;
            border-radius: 3px;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 0.85em;
        }

        .response-container pre {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 3px;
            padding: 12px;
            overflow-x: auto;
            margin: 0.8em 0;
        }

        .response-container pre code {
            background: none;
            padding: 0;
        }

        .response-container a {
            color: var(--text-color);
            text-decoration: underline;
            text-underline-offset: 2px;
        }

        .response-container strong,
        .response-container b {
            font-weight: 600;
        }

        .response-container hr {
            border: none;
            border-top: 1px solid var(--border-color);
            margin: 1.5em 0;
        }

        .response-container table {
            border-collapse: collapse;
            width: 100%;
            margin: 0.8em 0;
        }

        .response-container th,
        .response-container td {
            border: 1px solid var(--border-color);
            padding: 8px;
            text-align: left;
        }

        .response-container th {
            background: var(--bg-secondary);
            font-weight: 600;
        }

        .response-container::-webkit-scrollbar {
            width: 8px;
        }

        .response-container::-webkit-scrollbar-track {
            background: transparent;
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
            margin-top: 8px;
            align-items: center;
        }

        .text-input-container input {
            flex: 1;
            background: transparent;
            color: var(--text-color);
            border: none;
            border-bottom: 1px solid var(--border-color);
            padding: 8px 4px;
            border-radius: 0;
            font-size: 13px;
        }

        .text-input-container input:focus {
            outline: none;
            border-bottom-color: var(--text-color);
        }

        .text-input-container input::placeholder {
            color: var(--placeholder-color);
        }

        .nav-button {
            background: transparent;
            color: var(--text-secondary);
            border: none;
            padding: 6px;
            border-radius: 3px;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.1s ease;
        }

        .nav-button:hover {
            background: var(--hover-background);
            color: var(--text-color);
        }

        .nav-button:disabled {
            opacity: 0.3;
        }

        .nav-button svg {
            width: 18px;
            height: 18px;
            stroke: currentColor;
        }

        .response-counter {
            font-size: 11px;
            color: var(--text-muted);
            white-space: nowrap;
            min-width: 50px;
            text-align: center;
            font-family: 'SF Mono', Monaco, monospace;
        }

        .screen-answer-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--btn-primary-bg, #ffffff);
            color: var(--btn-primary-text, #000000);
            border: none;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            cursor: default;
            transition: all 0.15s ease;
            white-space: nowrap;
        }

        .screen-answer-btn:hover {
            background: var(--btn-primary-hover, #f0f0f0);
        }

        .screen-answer-btn svg {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }

        .screen-answer-btn .usage-count {
            font-size: 11px;
            opacity: 0.7;
            font-family: 'SF Mono', Monaco, monospace;
        }

        .screen-answer-btn-wrapper {
            position: relative;
        }

        .screen-answer-btn-wrapper .tooltip {
            position: absolute;
            bottom: 100%;
            right: 0;
            margin-bottom: 8px;
            background: var(--tooltip-bg, #1a1a1a);
            color: var(--tooltip-text, #ffffff);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 11px;
            white-space: nowrap;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.15s ease, visibility 0.15s ease;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 100;
        }

        .screen-answer-btn-wrapper .tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            right: 16px;
            border: 6px solid transparent;
            border-top-color: var(--tooltip-bg, #1a1a1a);
        }

        .screen-answer-btn-wrapper:hover .tooltip {
            opacity: 1;
            visibility: visible;
        }

        .tooltip-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 4px;
        }

        .tooltip-row:last-child {
            margin-bottom: 0;
        }

        .tooltip-label {
            opacity: 0.7;
        }

        .tooltip-value {
            font-family: 'SF Mono', Monaco, monospace;
        }

        .tooltip-note {
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px solid rgba(255,255,255,0.1);
            opacity: 0.5;
            font-size: 10px;
        }

        /* Sidebar Styles */
        .main-container {
            display: flex;
            flex: 1;
            height: 100%;
            overflow: hidden;
        }

        .content-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            min-width: 0; /* Prevent flex overflow */
        }

        .sidebar {
            width: 260px;
            background: var(--bg-secondary);
            border-left: 1px solid var(--border-color);
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
        }

        .sidebar-header {
            padding: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-muted);
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            background: var(--bg-secondary);
            z-index: 10;
        }

        .sidebar-content {
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .sidebar-item {
            padding: 6px 8px; /* Reduced padding */
            border-radius: 6px;
            cursor: default;
            font-size: 13px;
            color: var(--text-secondary);
            transition: all 0.2s ease;
            border: 1px solid transparent;
        }

        .sidebar-item:hover {
            background: var(--bg-hover);
            color: var(--text-color);
        }

        .sidebar-item.active {
            background: var(--bg-tertiary);
            color: var(--text-color);
            border-color: var(--border-color);
        }

        .sidebar-item-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px; /* Reduced margin */
            font-size: 10px; /* Reduced font size */
            opacity: 0.7;
            font-family: 'SF Mono', Monaco, monospace;
        }

        .sidebar-item-preview {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.4;
            font-weight: 500;
        }

        .sidebar-empty {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: var(--text-muted);
            font-style: italic;
        }
    `;

    static properties = {
        responses: { type: Array },
        currentResponseIndex: { type: Number },
        selectedProfile: { type: String },
        viewMode: { type: String },
        autoScroll: { type: Boolean },
        showSidebar: { type: Boolean },
        onSendText: { type: Function },
        shouldAnimateResponse: { type: Boolean },
        flashCount: { type: Number },
        flashLiteCount: { type: Number },
        usageStats: { type: Object },
    };

    constructor() {
        super();
        this.responses = [];
        this.currentResponseIndex = -1;
        this.selectedProfile = 'interview';
        this.onSendText = () => { };
        this.flashCount = 0;
        this.flashLiteCount = 0;
        this.usageStats = { groq: [], gemini: [] };
        this.viewMode = 'paged'; // 'paged' or 'continuous'
        this.showSidebar = true;
        this._userScrolledUp = false;
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
        // Handle object responses (with metadata)
        const text = (typeof content === 'object' && content !== null) ? content.text : content;

        // Check if marked is available
        if (typeof window !== 'undefined' && window.marked) {
            try {
                // Configure marked for better security and formatting
                window.marked.setOptions({
                    breaks: true,
                    gfm: true,
                    sanitize: false, // We trust the AI responses
                });
                let rendered = window.marked.parse(text || '');
                rendered = this.wrapWordsInSpans(rendered);
                return rendered;
            } catch (error) {
                console.warn('Error parsing markdown:', error);
                return text || ''; // Fallback to plain text
            }
        }
        console.log('Marked not available, using plain text');
        return text || ''; // Fallback if marked is not available
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
                Array.from(node.childNodes).forEach(wrap);
            }
        }
        Array.from(doc.body.childNodes).forEach(wrap);
        return doc.body.innerHTML;
    }

    getResponseCounter() {
        return this.responses.length > 0 ? `${this.currentResponseIndex + 1}/${this.responses.length}` : '';
    }

    navigateToPreviousResponse() {
        const newIndex = this.currentResponseIndex - 1;
        if (newIndex >= 0) {
            this.currentResponseIndex = newIndex;
            this.dispatchEvent(
                new CustomEvent('response-index-changed', {
                    detail: { index: this.currentResponseIndex },
                })
            );

            if (this.viewMode === 'continuous') {
                this.scrollToResponse(this.currentResponseIndex);
            } else {
                this.requestUpdate();
            }
        }
    }

    navigateToNextResponse() {
        const newIndex = this.currentResponseIndex + 1;
        if (newIndex < this.responses.length) {
            this.currentResponseIndex = newIndex;
            this.dispatchEvent(
                new CustomEvent('response-index-changed', {
                    detail: { index: this.currentResponseIndex },
                })
            );

            if (this.viewMode === 'continuous') {
                this.scrollToResponse(this.currentResponseIndex);
            } else {
                this.requestUpdate();
            }
        }
    }

    scrollToResponse(index) {
        if (index < 0 || index >= this.responses.length) return;

        if (this.currentResponseIndex !== index) {
            this.currentResponseIndex = index;
            this.dispatchEvent(
                new CustomEvent('response-index-changed', {
                    detail: { index: this.currentResponseIndex },
                })
            );
        }

        if (this.viewMode === 'continuous') {
            const container = this.shadowRoot.querySelector('.response-container');
            const item = this.shadowRoot.querySelector(`#response-item-${index}`);

            if (container && item) {
                const topOffset = item.offsetTop - 20;
                container.scrollTo({
                    top: Math.max(0, topOffset),
                    behavior: 'smooth'
                });
            }
        } else {
            this.requestUpdate();
            setTimeout(() => this.updateResponseContent(), 0);
        }
    }

    scrollResponseUp() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const scrollAmount = container.clientHeight * 0.3; // Scroll 30% of container height
            container.scrollTop = Math.max(0, container.scrollTop - scrollAmount);
        }
    }

    scrollResponseDown() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const scrollAmount = container.clientHeight * 0.3; // Scroll 30% of container height
            container.scrollTop = Math.min(container.scrollHeight - container.clientHeight, container.scrollTop + scrollAmount);
        }
    }

    connectedCallback() {
        super.connectedCallback();

        // Load limits on mount
        this.loadLimits();

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
        if (textInput && textInput.value.trim()) {
            const message = textInput.value.trim();
            textInput.value = ''; // Clear input
            await this.onSendText(message);
        }
    }

    handleTextKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSendText();
        }
    }

    async loadLimits() {
        if (window.cheatingDaddy?.storage?.getUsageStats) {
            const stats = await window.cheatingDaddy.storage.getUsageStats();
            this.usageStats = stats || { groq: [], gemini: [] };
            this.requestUpdate();
        }
    }

    getTotalUsed() {
        return this.flashCount + this.flashLiteCount;
    }

    getTotalAvailable() {
        return 40; // 20 flash + 20 flash-lite
    }

    async handleScreenAnswer() {
        if (window.captureManualScreenshot) {
            window.captureManualScreenshot();
            // Reload limits after a short delay to catch the update
            setTimeout(() => this.loadLimits(), 1000);
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = this.shadowRoot.querySelector('.response-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 0);
    }

    handleScroll(e) {
        const container = e.target;
        // Check if user is at the bottom (with a small threshold)
        const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;

        if (!isAtBottom) {
            // User scrolled up manually
            this._userScrolledUp = true;
        } else {
            // User is at the bottom, re-enable stickiness
            this._userScrolledUp = false;
        }
    }

    firstUpdated() {
        super.firstUpdated();
        this.updateResponseContent();
    }

    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('responses') || changedProperties.has('currentResponseIndex') || changedProperties.has('viewMode')) {
            // Check if current response is 'live'
            const currentResponse = this.responses[this.currentResponseIndex];
            // If it's a string (old format) assume it's NOT live to be safe, or default to scrolling? 
            // Better to default to scrolling if string to match previous behavior, 
            // but user explicitly asked to restrict it.
            // If it's undefined, skip.
            const isLive = currentResponse && typeof currentResponse === 'object' && currentResponse.type === 'live';

            // If continuous mode and just added a new response (index increased), scroll to bottom
            if (this.viewMode === 'continuous' &&
                this.autoScroll &&
                changedProperties.has('currentResponseIndex') &&
                this.currentResponseIndex > (changedProperties.get('currentResponseIndex') || -1)) {
                // Wait for render
                setTimeout(() => this.scrollToResponse(this.currentResponseIndex), 50);
            } else if (this.viewMode === 'continuous' &&
                this.autoScroll &&
                changedProperties.has('responses') &&
                !this._userScrolledUp &&
                isLive) {
                // Handle streaming updates - scroll to bottom ONLY if LIVE response
                this.scrollToBottom();
            }

            if (this.viewMode === 'paged') {
                this.updateResponseContent();
            }
        }
    }

    updateResponseContent() {
        if (this.viewMode === 'continuous') return; // Handled by render() in continuous mode

        console.log('updateResponseContent called');
        const container = this.shadowRoot.querySelector('#responseContainer');
        if (container) {
            const currentResponse = this.getCurrentResponse();
            console.log('Current response:', currentResponse);
            const renderedResponse = this.renderMarkdown(currentResponse);
            console.log('Rendered response:', renderedResponse);
            container.innerHTML = renderedResponse;
            // Show all words immediately (no animation)
            if (this.shouldAnimateResponse) {
                this.dispatchEvent(new CustomEvent('response-animation-complete', { bubbles: true, composed: true }));
            }
        } else {
            console.log('Response container not found');
        }
    }

    renderSidebar() {
        if (!this.responses || this.responses.length === 0) {
            return html`
                <div class="sidebar">
                    <div class="sidebar-header">Response Navigator</div>
                    <div class="sidebar-empty">No responses yet</div>
                </div>
            `;
        }

        return html`
            <div class="sidebar">
                <div class="sidebar-header">Response Navigator</div>
                <div class="sidebar-content">
                    ${this.responses.map((response, index) => {
            const question = (typeof response === 'object' && response?.question) ? response.question : '';
            const previewText = question || '(No question)';

            return html`
                        <div class="sidebar-item ${index === this.currentResponseIndex ? 'active' : ''}"
                             @click=${() => this.scrollToResponse(index)}>
                            <div class="sidebar-item-header">
                                <span>#${index + 1}</span>
                                <span>${this.formatTime(index)}</span>
                            </div>
                            <div class="sidebar-item-preview" title="${previewText}">
                                ${previewText}
                            </div>
                        </div>
                    `;
        })}
                </div>
            </div>
        `;
    }

    formatTime(index) {
        // Placeholder for timestamp if we had it, for now just return empty or generic
        return '';
    }

    render() {
        const responseCounter = this.getResponseCounter();
        const profileNames = this.getProfileNames();
        const placeholder = `Hey, Im listening to your ${profileNames[this.selectedProfile] || 'session'}?`;

        // Determine if sidebar should be shown (now available in both modes)
        const showSidebar = this.showSidebar;

        return html`
            <div class="main-container">
                <div class="content-area">
                    <div class="response-container" id="responseContainer" @scroll=${this.handleScroll}>
                        ${this.viewMode === 'continuous'
                ? html`
                                <div class="response-list">
                                    ${this.responses.length === 0
                        ? html`<div class="response-item" .innerHTML=${this.renderMarkdown(placeholder)}></div>`
                        : this.responses.map((response, index) => html`
                                            ${index > 0 ? html`<div class="response-checkpoint">Response ${index + 1}</div>` : ''}
                                            <div class="response-item ${index === this.currentResponseIndex ? 'active-item' : ''}" 
                                                 id="response-item-${index}">
                                                <div .innerHTML=${this.renderMarkdown(response)}></div>
                                            </div>
                                          `)
                    }
                                </div>
                            `
                : '' // Empty for paged mode, content injected via updateResponseContent
            }
                    </div>

                    <div class="text-input-container">
                        <button class="nav-button" @click=${this.navigateToPreviousResponse} ?disabled=${this.currentResponseIndex <= 0}>
                            <svg width="24px" height="24px" stroke-width="1.7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 6L9 12L15 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                            </svg>
                        </button>

                        ${this.responses.length > 0 ? html`<span class="response-counter">${responseCounter}</span>` : ''}

                        <button class="nav-button" @click=${this.navigateToNextResponse} ?disabled=${this.currentResponseIndex >= this.responses.length - 1}>
                            <svg width="24px" height="24px" stroke-width="1.7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                            </svg>
                        </button>

                        <input type="text" id="textInput" placeholder="Type a message to the AI..." @keydown=${this.handleTextKeydown} />

                        <div class="screen-answer-btn-wrapper">
                            <button class="screen-answer-btn" @click=${this.handleScreenAnswer}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
                                </svg>
                                <span>Analyze screen</span>
                            </button>
                        </div>
                    </div>
                </div>
                ${showSidebar ? this.renderSidebar() : ''}
            </div>
        `;
    }
}

customElements.define('assistant-view', AssistantView);
