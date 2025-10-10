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
            color: var(--text-color);
        }

        .response-container pre {
            background: var(--input-background);
            border: 1px solid var(--button-border);
            border-radius: 8px;
            padding: 1.2em;
            overflow-x: auto;
            margin: 1.2em 0;
            position: relative;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .response-container pre code {
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
        .response-container pre code.hljs {
            background: transparent !important;
            padding: 0 !important;
        }

        /* ChatGPT-style formatting */
        .response-container {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
        }

        .response-container h1,
        .response-container h2,
        .response-container h3,
        .response-container h4,
        .response-container h5,
        .response-container h6 {
            margin: 1.5em 0 0.8em 0;
            font-weight: 600;
            color: var(--text-color);
            border-bottom: 1px solid var(--button-border);
            padding-bottom: 0.3em;
        }

        .response-container h1 { font-size: 1.8em; }
        .response-container h2 { font-size: 1.5em; }
        .response-container h3 { font-size: 1.3em; }
        .response-container h4 { font-size: 1.1em; }

        .response-container p {
            margin: 1em 0;
            color: var(--text-color);
        }

        .response-container ul,
        .response-container ol {
            margin: 1em 0;
            padding-left: 2em;
        }

        .response-container li {
            margin: 0.5em 0;
            color: var(--text-color);
        }

        .response-container blockquote {
            margin: 1.5em 0;
            padding: 1em 1.5em;
            border-left: 4px solid var(--accent-color);
            background: var(--input-background);
            border-radius: 0 8px 8px 0;
            font-style: italic;
        }

        .response-container blockquote p {
            margin: 0;
        }

        /* Collapsible sections */
        .response-container details {
            margin: 1em 0;
            border: 1px solid var(--button-border);
            border-radius: 8px;
            background: var(--input-background);
            overflow: hidden;
        }

        .response-container summary {
            padding: 1em 1.5em;
            background: var(--button-background);
            cursor: pointer;
            font-weight: 600;
            color: var(--text-color);
            border-bottom: 1px solid var(--button-border);
            transition: background-color 0.2s ease;
        }

        .response-container summary:hover {
            background: var(--hover-background);
        }

        .response-container details[open] summary {
            border-bottom: 1px solid var(--button-border);
        }

        .response-container details > *:not(summary) {
            padding: 1.5em;
        }

        /* Code blocks with better styling */
        .response-container pre {
            background: #1e1e1e;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 1.5em;
            margin: 1.5em 0;
            overflow-x: auto;
            position: relative;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .response-container pre code {
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
        .response-container code:not(pre code) {
            background: var(--input-background);
            padding: 0.2em 0.5em;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9em;
            color: #e06c75;
            border: 1px solid var(--button-border);
        }

        /* Tables */
        .response-container table {
            border-collapse: collapse;
            width: 100%;
            margin: 1.5em 0;
            background: var(--input-background);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .response-container th,
        .response-container td {
            border: 1px solid var(--button-border);
            padding: 0.8em 1em;
            text-align: left;
        }

        .response-container th {
            background: var(--button-background);
            font-weight: 600;
            color: var(--text-color);
        }

        .response-container td {
            color: var(--text-color);
        }

        /* Horizontal rules */
        .response-container hr {
            border: none;
            border-top: 2px solid var(--button-border);
            margin: 2em 0;
            border-radius: 1px;
        }

        /* Links */
        .response-container a {
            color: var(--accent-color);
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-bottom-color 0.2s ease;
        }

        .response-container a:hover {
            border-bottom-color: var(--accent-color);
        }

        /* Lists with better spacing */
        .response-container ul ul,
        .response-container ol ol,
        .response-container ul ol,
        .response-container ol ul {
            margin: 0.5em 0;
        }

        /* Strong and emphasis */
        .response-container strong,
        .response-container b {
            font-weight: 700;
            color: var(--text-color);
        }

        .response-container em,
        .response-container i {
            font-style: italic;
            color: var(--text-color);
        }

        /* Keyboard keys */
        .response-container kbd {
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

        /* Language label for code blocks */
        .response-container pre::before {
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
        .response-container pre::after {
            content: var(--after-content, "📋");
            position: absolute;
            top: 0.5em;
            right: 0.5em;
            cursor: pointer;
            opacity: 0.5;
            transition: opacity 0.2s;
            font-size: 0.8em;
        }

        .response-container pre:hover::after {
            opacity: 1;
        }

        /* Inline code improvements */
        .response-container p code,
        .response-container li code {
            background: rgba(255, 255, 255, 0.15);
            padding: 0.15em 0.4em;
            border-radius: 4px;
            font-size: 0.9em;
            font-weight: 500;
        }

        /* Code block scrollbar */
        .response-container pre::-webkit-scrollbar {
            height: 6px;
        }

        .response-container pre::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
            border-radius: 3px;
        }

        .response-container pre::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 3px;
        }

        .response-container pre::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
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

        .save-button.saved {
            color: #4caf50;
        }

        .save-button svg {
            stroke: currentColor !important;
        }

        /* Loading indicator styles */
        .loading-indicator {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: var(--input-background);
            border: 1px solid var(--button-border);
            border-radius: 8px;
            margin: 16px 0;
            opacity: 0;
            transform: translateY(-10px);
            transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .loading-indicator.visible {
            opacity: 1;
            transform: translateY(0);
        }

        .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid var(--button-border);
            border-top: 2px solid var(--accent-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .loading-text {
            color: var(--text-color);
            font-size: 14px;
            font-weight: 500;
        }

        .typing-dots {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-left: 8px;
        }

        .typing-dot {
            width: 6px;
            height: 6px;
            background: var(--accent-color);
            border-radius: 50%;
            animation: typing 1.4s infinite ease-in-out;
        }

        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
        .typing-dot:nth-child(3) { animation-delay: 0s; }

        @keyframes typing {
            0%, 80%, 100% {
                transform: scale(0.8);
                opacity: 0.5;
            }
            40% {
                transform: scale(1);
                opacity: 1;
            }
        }

        .generating-status {
            color: var(--description-color);
            font-size: 12px;
            margin-top: 4px;
        }

        .response-content {
            width: 100%;
        }

        /* Ensure highlight.js styles work properly */
        .response-container pre code.hljs {
            background: transparent !important;
            padding: 0 !important;
        }
    `;

    static properties = {
        responses: { type: Array },
        currentResponseIndex: { type: Number },
        selectedProfile: { type: String },
        onSendText: { type: Function },
        shouldAnimateResponse: { type: Boolean },
        savedResponses: { type: Array },
        isGenerating: { type: Boolean },
    };

    constructor() {
        super();
        this.responses = [];
        this.currentResponseIndex = -1;
        this.selectedProfile = 'interview';
        this.onSendText = () => {};
        this._lastAnimatedWordCount = 0;
        this.isGenerating = false;
        // Load saved responses from localStorage
        try {
            this.savedResponses = JSON.parse(localStorage.getItem('savedResponses') || '[]');
        } catch (e) {
            this.savedResponses = [];
        }
    }

    connectedCallback() {
        super.connectedCallback();
        
        // Listen for status updates to show/hide loading indicator
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            
            // Show loading when AI starts processing
            ipcRenderer.on('update-status', (_, status) => {
                if (status === 'Processing...' || status === 'Generating response...' || status.includes('thinking')) {
                    this.setGeneratingState(true);
                } else if (status === 'Ready' || status === 'Connected' || status === 'Response complete' || status === 'Listening...') {
                    this.setGeneratingState(false);
                    console.log('[AssistantView] Loading indicator hidden due to status:', status);
                }
            });

            // Show loading when new response starts streaming
            ipcRenderer.on('update-response', (_, response) => {
                // If this is the start of a new response, show loading
                if (response && response.length < 50 && !this.isGenerating) {
                    this.setGeneratingState(true);
                }
            });
        }
        
        // Listen for response animation complete to stop loading
        this.addEventListener('response-animation-complete', () => {
            this.setGeneratingState(false);
            console.log('[AssistantView] Loading indicator hidden due to response animation complete');
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeAllListeners('update-status');
            ipcRenderer.removeAllListeners('update-response');
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

    enhanceCodeBlocksInDOM(container) {
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
                    console.log('Applying syntax highlighting to code block:', { language, code: code.substring(0, 50) + '...' });
                    
                    // Remove existing highlighting classes
                    block.className = block.className.replace(/hljs-\w+/g, '').trim();
                    
                    if (language && language !== 'text' && window.hljs.getLanguage(language)) {
                        // Highlight with specific language
                        const highlighted = window.hljs.highlight(code, { language: language });
                        block.innerHTML = highlighted.value;
                        block.className += ` hljs language-${language}`;
                        console.log('Applied specific language highlighting:', language);
                    } else {
                        // Auto-detect language
                        const result = window.hljs.highlightAuto(code);
                        block.innerHTML = result.value;
                        block.className += ` hljs language-${result.language}`;
                        console.log('Applied auto-detected language highlighting:', result.language);
                    }
                } catch (error) {
                    console.warn('Error applying syntax highlighting:', error);
                    // Fallback to plain text
                    block.textContent = code;
                }
            } else {
                console.warn('highlight.js not available');
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

    setGeneratingState(isGenerating) {
        this.isGenerating = isGenerating;
        
        // If we're starting to generate, set a timeout to hide loading after reasonable time
        if (isGenerating) {
            // Clear any existing timeout
            if (this._loadingTimeout) {
                clearTimeout(this._loadingTimeout);
            }
            
            // Set a timeout to hide loading after 30 seconds (fallback)
            this._loadingTimeout = setTimeout(() => {
                console.log('[AssistantView] Loading timeout - hiding loading indicator');
                this.setGeneratingState(false);
            }, 30000);
        } else {
            // If we're stopping generation, clear the timeout
            if (this._loadingTimeout) {
                clearTimeout(this._loadingTimeout);
                this._loadingTimeout = null;
            }
        }
        
        this.requestUpdate();
    }

    getLoadingIndicator() {
        if (!this.isGenerating) return '';
        
        return html`
            <div class="loading-indicator visible">
                <div class="loading-spinner"></div>
                <div class="loading-text">
                    AI is thinking
                    <div class="typing-dots">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
                <div class="generating-status">Generating response...</div>
            </div>
        `;
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

    handleSendText() {
        const input = this.shadowRoot.querySelector('#textInput');
        if (input && input.value.trim()) {
            // Show loading indicator when sending text
            console.log('[AssistantView] User sent text - showing loading indicator');
            this.setGeneratingState(true);
            this.onSendText(input.value.trim());
            input.value = '';
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
            console.log('Current response:', currentResponse);
            const renderedResponse = this.renderMarkdown(currentResponse);
            console.log('Rendered response:', renderedResponse);
            
            // Create a wrapper div for the response content
            const responseWrapper = document.createElement('div');
            responseWrapper.className = 'response-content';
            responseWrapper.innerHTML = renderedResponse;
            
            // Clear only the response content, keep loading indicator
            const existingContent = container.querySelector('.response-content');
            if (existingContent) {
                existingContent.remove();
            }
            
            // Add the new response content
            container.appendChild(responseWrapper);
            
            // Enhance code blocks after adding to DOM
            this.enhanceCodeBlocksInDOM(responseWrapper);
            
            const words = responseWrapper.querySelectorAll('[data-word]');
            if (this.shouldAnimateResponse) {
                for (let i = 0; i < this._lastAnimatedWordCount && i < words.length; i++) {
                    words[i].classList.add('visible');
                }
                for (let i = this._lastAnimatedWordCount; i < words.length; i++) {
                    words[i].classList.remove('visible');
                    setTimeout(() => {
                        words[i].classList.add('visible');
                        if (i === words.length - 1) {
                            this.dispatchEvent(new CustomEvent('response-animation-complete', { bubbles: true, composed: true }));
                        }
                    }, (i - this._lastAnimatedWordCount) * 100);
                }
                this._lastAnimatedWordCount = words.length;
            } else {
                words.forEach(word => word.classList.add('visible'));
                this._lastAnimatedWordCount = words.length;
            }
        } else {
            console.log('Response container not found');
        }
    }

    render() {
        const currentResponse = this.getCurrentResponse();
        const responseCounter = this.getResponseCounter();
        const isSaved = this.isResponseSaved();

        return html`
            <div class="response-container" id="responseContainer">
                ${this.getLoadingIndicator()}
                <div class="response-content"></div>
            </div>

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
                    class="save-button ${isSaved ? 'saved' : ''}"
                    @click=${this.saveCurrentResponse}
                    title="${isSaved ? 'Response saved' : 'Save this response'}"
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
