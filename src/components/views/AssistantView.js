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
            height: calc(100% - 60px);
            overflow-y: auto;
            border-radius: 10px;
            font-size: var(--response-font-size, 18px);
            line-height: 1.6;
            background: var(--main-content-background);
            padding: 16px;
            scroll-behavior: smooth;
            user-select: text;
            cursor: text;
        }

        /* Allow text selection for all content within the response container */
        .response-container * {
            user-select: text;
            cursor: text;
        }

        /* Restore default cursor for interactive elements */
        .response-container a {
            cursor: pointer;
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

        /* Markdown styling */
        .response-container h1,
        .response-container h2,
        .response-container h3,
        .response-container h4,
        .response-container h5,
        .response-container h6 {
            margin: 1.2em 0 0.6em 0;
            color: var(--text-color);
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
            color: var(--text-color);
        }

        .response-container ul,
        .response-container ol {
            margin: 0.8em 0;
            padding-left: 2em;
            color: var(--text-color);
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
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--button-border);
            border-radius: 8px;
            padding: 1.2em;
            overflow-x: auto;
            overflow-wrap: break-word;
            word-wrap: break-word;
            word-break: break-word;
            white-space: pre-wrap;
            margin: 1em 0;
            position: relative;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            max-width: 100%;
        }

        .response-container pre code {
            background: none;
            padding: 0;
            border-radius: 0;
            font-family: 'Consolas', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9em;
            line-height: 1.5;
            color: #d4d4d4;
            white-space: pre-wrap;
            word-break: break-word;
        }

        /* Enhanced code block styling with VS Code colors */
        .response-container pre.hljs {
            background: rgba(0, 0, 0, 0.2) !important;
            border: 1px solid #404040;
            color: #d4d4d4 !important;
        }

        /* VS Code Syntax Highlighting Colors */
        
        /* Keywords (blue) */
        .response-container .hljs-keyword,
        .response-container .hljs-selector-tag,
        .response-container .hljs-literal,
        .response-container .hljs-section,
        .response-container .hljs-link,
        .response-container .hljs-built_in {
            color: #569cd6 !important;
        }

        /* Strings (orange/salmon) */
        .response-container .hljs-string,
        .response-container .hljs-char,
        .response-container .hljs-template-variable,
        .response-container .hljs-template-string {
            color: #ce9178 !important;
        }

        /* Comments (green) */
        .response-container .hljs-comment,
        .response-container .hljs-quote {
            color: #6a9955 !important;
            font-style: italic;
        }

        /* Numbers (light green) */
        .response-container .hljs-number,
        .response-container .hljs-literal {
            color: #b5cea8 !important;
        }

        /* Functions (yellow) */
        .response-container .hljs-function,
        .response-container .hljs-title,
        .response-container .hljs-params,
        .response-container .hljs-name {
            color: #dcdcaa !important;
        }

        /* Variables and attributes (light blue) */
        .response-container .hljs-variable,
        .response-container .hljs-attr,
        .response-container .hljs-property,
        .response-container .hljs-attribute {
            color: #9cdcfe !important;
        }

        /* Types and classes (teal) */
        .response-container .hljs-type,
        .response-container .hljs-class,
        .response-container .hljs-title.class_,
        .response-container .hljs-tag {
            color: #4ec9b0 !important;
        }

        /* Operators and punctuation */
        .response-container .hljs-operator,
        .response-container .hljs-punctuation {
            color: #d4d4d4 !important;
        }

        /* Special elements */
        .response-container .hljs-meta,
        .response-container .hljs-meta-keyword {
            color: #569cd6 !important;
        }

        .response-container .hljs-meta-string {
            color: #ce9178 !important;
        }

        /* Regular expressions */
        .response-container .hljs-regexp {
            color: #d16969 !important;
        }

        /* Symbols and constants */
        .response-container .hljs-symbol,
        .response-container .hljs-constant {
            color: #4fc1ff !important;
        }

        /* Emphasis */
        .response-container .hljs-emphasis {
            font-style: italic;
        }

        .response-container .hljs-strong {
            font-weight: bold;
        }

        /* Language indicator */
        .response-container pre::before {
            content: attr(data-language);
            position: absolute;
            top: 0.5em;
            right: 0.8em;
            font-size: 0.7em;
            color: #858585;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 3px;
        }

        /* Language-specific enhancements */
        
        /* JavaScript/TypeScript */
        .response-container .hljs-keyword.hljs-return,
        .response-container .hljs-keyword.hljs-function,
        .response-container .hljs-keyword.hljs-const,
        .response-container .hljs-keyword.hljs-let,
        .response-container .hljs-keyword.hljs-var {
            color: #569cd6 !important;
        }

        /* Python */
        .response-container .hljs-keyword.hljs-def,
        .response-container .hljs-keyword.hljs-class,
        .response-container .hljs-keyword.hljs-import,
        .response-container .hljs-keyword.hljs-from {
            color: #569cd6 !important;
        }

        /* HTML/XML */
        .response-container .hljs-tag .hljs-name {
            color: #569cd6 !important;
        }

        .response-container .hljs-tag .hljs-attr {
            color: #9cdcfe !important;
        }

        /* CSS */
        .response-container .hljs-selector-class,
        .response-container .hljs-selector-id {
            color: #d7ba7d !important;
        }

        .response-container .hljs-property {
            color: #9cdcfe !important;
        }

        /* SQL */
        .response-container .hljs-keyword.hljs-select,
        .response-container .hljs-keyword.hljs-from,
        .response-container .hljs-keyword.hljs-where {
            color: #569cd6 !important;
        }

        /* JSON */
        .response-container .hljs-attr {
            color: #9cdcfe !important;
        }

        /* Markdown in code blocks */
        .response-container .hljs-section {
            color: #569cd6 !important;
            font-weight: bold;
        }

        .response-container .hljs-code {
            color: #ce9178 !important;
        }

        /* Better syntax highlighting for inline code */
        .response-container code:not(pre code) {
            background: rgba(255, 255, 255, 0.15);
            color: #ce9178;
            font-weight: 500;
            padding: 0.15em 0.3em;
            border-radius: 3px;
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
            color: var(--text-color);
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
            gap: 10px;
            margin-top: 10px;
            align-items: center;
        }

        .text-input-container input {
            flex: 1;
            background: var(--input-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 14px;
        }

        .text-input-container input:focus {
            outline: none;
            border-color: var(--focus-border-color);
            box-shadow: 0 0 0 3px var(--focus-box-shadow);
            background: var(--input-focus-background);
        }

        .text-input-container input::placeholder {
            color: var(--placeholder-color);
        }

        .text-input-container button {
            background: transparent;
            color: var(--start-button-background);
            border: none;
            padding: 0;
            border-radius: 100px;
        }

        .text-input-container button:hover {
            background: var(--text-input-button-hover);
        }

        .nav-button {
            background: transparent;
            color: white;
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
            stroke: white !important;
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

        .save-button.copied {
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
        savedResponses: { type: Array },
        copiedFeedback: { type: Boolean },
    };

    constructor() {
        super();
        this.responses = [];
        this.currentResponseIndex = -1;
        this.selectedProfile = 'interview';
        this.onSendText = () => {};
        this._lastAnimatedWordCount = 0;
        this.copiedFeedback = false;
        // Load saved responses from localStorage
        try {
            this.savedResponses = JSON.parse(localStorage.getItem('savedResponses') || '[]');
        } catch (e) {
            this.savedResponses = [];
        }
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
                    highlight: function(code, language) {
                        // Use highlight.js for syntax highlighting if available
                        if (typeof window !== 'undefined' && window.hljs) {
                            if (language && window.hljs.getLanguage(language)) {
                                try {
                                    return window.hljs.highlight(code, { language: language }).value;
                                } catch (err) {
                                    console.warn('Error highlighting code:', err);
                                }
                            }
                            // Auto-detect language if not specified
                            try {
                                return window.hljs.highlightAuto(code).value;
                            } catch (err) {
                                console.warn('Error auto-highlighting code:', err);
                            }
                        }
                        return code; // Fallback to plain code
                    }
                });
                let rendered = window.marked.parse(content);
                rendered = this.wrapWordsInSpans(rendered);
                rendered = this.enhanceCodeBlocks(rendered);
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
                Array.from(node.childNodes).forEach(wrap);
            }
        }
        Array.from(doc.body.childNodes).forEach(wrap);
        return doc.body.innerHTML;
    }

    enhanceCodeBlocks(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Find all pre elements and enhance them
        const preElements = doc.querySelectorAll('pre');
        preElements.forEach(pre => {
            const codeElement = pre.querySelector('code');
            if (codeElement) {
                // Extract language from class (hljs adds language-specific classes)
                const classList = Array.from(codeElement.classList);
                const languageClass = classList.find(cls => cls.startsWith('language-')) || classList.find(cls => cls !== 'hljs');
                
                if (languageClass) {
                    const language = languageClass.replace('language-', '').replace('hljs-', '');
                    if (language && language !== 'hljs') {
                        pre.setAttribute('data-language', language);
                    }
                }
                
                // Add hljs class to pre element for consistent styling
                if (codeElement.classList.contains('hljs') || classList.some(cls => cls.startsWith('language-'))) {
                    pre.classList.add('hljs');
                }
            }
        });
        
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

            this.handleCopyCodeBlocks = () => {
                console.log('Received copy-code-blocks message');
                this.copyCurrentResponse();
            };

            ipcRenderer.on('navigate-previous-response', this.handlePreviousResponse);
            ipcRenderer.on('navigate-next-response', this.handleNextResponse);
            ipcRenderer.on('scroll-response-up', this.handleScrollUp);
            ipcRenderer.on('scroll-response-down', this.handleScrollDown);
            ipcRenderer.on('copy-code-blocks', this.handleCopyCodeBlocks);
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
            if (this.handleCopyCodeBlocks) {
                ipcRenderer.removeListener('copy-code-blocks', this.handleCopyCodeBlocks);
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

    scrollToBottom() {
        setTimeout(() => {
            const container = this.shadowRoot.querySelector('.response-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 0);
    }

    extractCodeBlocks(text) {
        // Extract code blocks from markdown text
        const codeBlockRegex = /```[\w]*\n?([\s\S]*?)```/g;
        const multiLineInlineCodeRegex = /`([^`\n]*\n[^`]*)`/g; // Only multi-line inline code
        const codeBlocks = [];

        // Extract fenced code blocks (```code```)
        let match;
        while ((match = codeBlockRegex.exec(text)) !== null) {
            const codeContent = match[1].trim();
            if (codeContent.length > 0) {
                codeBlocks.push(codeContent);
            }
        }

        // If no fenced code blocks found, try to extract only multi-line inline code
        // (This avoids copying single words like "jovezhong" but allows actual code snippets)
        if (codeBlocks.length === 0) {
            while ((match = multiLineInlineCodeRegex.exec(text)) !== null) {
                const codeContent = match[1].trim();
                if (codeContent.length > 10) { // Only extract if it's reasonably long
                    codeBlocks.push(codeContent);
                }
            }
        }

        return codeBlocks;
    }

    copyCurrentResponse() {
        const currentResponse = this.getCurrentResponse();
        if (currentResponse) {
            // Extract code blocks from the response
            const codeBlocks = this.extractCodeBlocks(currentResponse);
            
            // Determine what to copy
            let textToCopy;
            if (codeBlocks.length > 0) {
                // Copy all code blocks, separated by newlines if multiple
                textToCopy = codeBlocks.join('\n\n');
            } else {
                // Fallback to full response if no code blocks found
                textToCopy = currentResponse;
            }
            
            // Copy to clipboard
            navigator.clipboard.writeText(textToCopy).then(() => {
                // Visual feedback - temporarily change button appearance
                this.copiedFeedback = true;
                this.requestUpdate();
                setTimeout(() => {
                    this.copiedFeedback = false;
                    this.requestUpdate();
                }, 1000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    this.copiedFeedback = true;
                    this.requestUpdate();
                    setTimeout(() => {
                        this.copiedFeedback = false;
                        this.requestUpdate();
                    }, 1000);
                } catch (err) {
                    console.error('Fallback: Unable to copy', err);
                }
                document.body.removeChild(textArea);
            });
        }
    }


    firstUpdated() {
        super.firstUpdated();
        this.updateResponseContent();
    }

    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('responses') || changedProperties.has('currentResponseIndex')) {
            if (changedProperties.has('currentResponseIndex')) {
                this._lastAnimatedWordCount = 0;
            }
            this.updateResponseContent();
        }
    }

    updateResponseContent() {
        console.log('updateResponseContent called');
        const container = this.shadowRoot.querySelector('#responseContainer');
        if (container) {
            const currentResponse = this.getCurrentResponse();
            console.log('Current response length:', currentResponse.length);

            // Skip animation entirely - just render the final markdown
            // This prevents markdown breaking and re-streaming issues
            const renderedResponse = this.renderMarkdown(currentResponse);
            container.innerHTML = renderedResponse;

            // Make all words visible immediately (no animation)
            const words = container.querySelectorAll('[data-word]');
            words.forEach(word => word.classList.add('visible'));
            this._lastAnimatedWordCount = words.length;

            // Auto-scroll to bottom as new content arrives
            this.scrollToBottom();
        } else {
            console.log('Response container not found');
        }
    }

    render() {
        const currentResponse = this.getCurrentResponse();
        const responseCounter = this.getResponseCounter();

        return html`
            <div class="response-container" id="responseContainer"></div>

            <div class="text-input-container">
                <button class="nav-button" @click=${this.navigateToPreviousResponse} ?disabled=${this.currentResponseIndex <= 0}>
                    <?xml version="1.0" encoding="UTF-8"?><svg
                        width="24px"
                        height="24px"
                        stroke-width="1.7"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        color="#ffffff"
                    >
                        <path d="M15 6L9 12L15 18" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                </button>

                ${this.responses.length > 0 ? html` <span class="response-counter">${responseCounter}</span> ` : ''}

                <button
                    class="save-button ${this.copiedFeedback ? 'copied' : ''}"
                    @click=${this.copyCurrentResponse}
                    title="${this.copiedFeedback ? 'Response copied!' : 'Copy this response'}"
                >
                    <?xml version="1.0" encoding="UTF-8"?><svg
                        width="24px"
                        height="24px"
                        stroke-width="1.7"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M8 4V2C8 1.44772 8.44772 1 9 1H19C19.5523 1 20 1.44772 20 2V12C20 12.5523 19.5523 13 19 13H17V20C17 21.1046 16.1046 22 15 22H5C3.89543 22 3 21.1046 3 20V10C3 8.89543 3.89543 8 5 8H8Z"
                            stroke="currentColor"
                            stroke-width="1.7"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        ></path>
                    </svg>
                </button>

                <input type="text" id="textInput" placeholder="Type a message to the AI..." @keydown=${this.handleTextKeydown} />

                <button class="nav-button" @click=${this.navigateToNextResponse} ?disabled=${this.currentResponseIndex >= this.responses.length - 1}>
                    <?xml version="1.0" encoding="UTF-8"?><svg
                        width="24px"
                        height="24px"
                        stroke-width="1.7"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        color="#ffffff"
                    >
                        <path d="M9 6L15 12L9 18" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                </button>
            </div>
        `;
    }
}

customElements.define('assistant-view', AssistantView);
