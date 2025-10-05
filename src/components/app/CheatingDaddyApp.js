import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { AppHeader } from './AppHeader.js';
import { MainView } from '../views/MainView.js';
import { CustomizeView } from '../views/CustomizeView.js';
import { ConnectionsView } from '../views/ConnectionsView.js';
import { HelpView } from '../views/HelpView.js';
import { HistoryView } from '../views/HistoryView.js';
import { AssistantView } from '../views/AssistantView.js';
import { OnboardingView } from '../views/OnboardingView.js';
import { AdvancedView } from '../views/AdvancedView.js';

export class CheatingDaddyApp extends LitElement {
    static styles = css`
        * {
            box-sizing: border-box;
            font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0px;
            padding: 0px;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            width: 100%;
            height: 100vh;
            background-color: var(--background-transparent);
            color: var(--text-color);
        }

        .window-container {
            height: 100vh;
            border-radius: 7px;
            overflow: hidden;
        }

        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .main-content {
            flex: 1;
            padding: var(--main-content-padding);
            overflow-y: auto;
            margin-top: var(--main-content-margin-top);
            border-radius: var(--content-border-radius);
            transition: all 0.15s ease-out;
            background: var(--main-content-background);
        }

        .main-content.with-border {
            border: 1px solid var(--border-color);
        }

        .main-content.assistant-view {
            padding: 10px;
            border: none;
        }

        .main-content.onboarding-view {
            padding: 0;
            border: none;
            background: transparent;
        }

        .view-container {
            opacity: 1;
            transform: translateY(0);
            transition: opacity 0.15s ease-out, transform 0.15s ease-out;
            height: 100%;
        }

        .view-container.entering {
            opacity: 0;
            transform: translateY(10px);
        }

        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        ::-webkit-scrollbar-track {
            background: var(--scrollbar-background);
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }
    `;

    static properties = {
        currentView: { type: String },
        statusText: { type: String },
        startTime: { type: Number },
        isRecording: { type: Boolean },
        sessionActive: { type: Boolean },
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        responses: { type: Array },
        currentResponseIndex: { type: Number },
        messages: { type: Array },
        selectedScreenshotInterval: { type: String },
        selectedImageQuality: { type: String },
        layoutMode: { type: String },
        advancedMode: { type: Boolean },
        _viewInstances: { type: Object, state: true },
        _isClickThrough: { state: true },
        _awaitingNewResponse: { state: true },
        shouldAnimateResponse: { type: Boolean },
        stealthProfile: { type: String },
    };

    constructor() {
        super();
        this.currentView = localStorage.getItem('onboardingCompleted') ? 'main' : 'onboarding';
        this.statusText = '';
        this.startTime = null;
        this.isRecording = false;
        this.sessionActive = false;
        this.selectedProfile = localStorage.getItem('selectedProfile') || 'interview';
        this.selectedLanguage = localStorage.getItem('selectedLanguage') || 'en-US';
        this.selectedScreenshotInterval = localStorage.getItem('selectedScreenshotInterval') || '5';
        this.selectedImageQuality = localStorage.getItem('selectedImageQuality') || 'medium';
        this.layoutMode = localStorage.getItem('layoutMode') || 'normal';
        this.advancedMode = localStorage.getItem('advancedMode') === 'true';
        this.responses = [];
        this.currentResponseIndex = -1;
        this.messages = [];
        this._viewInstances = new Map();
        this._isClickThrough = false;
        this._awaitingNewResponse = false;
        this._currentResponseIsComplete = true;
        this.shouldAnimateResponse = false;
        this.stealthProfile = localStorage.getItem('stealthProfile') || 'balanced';
        this.stealthUpdateStatus = '';

        // Apply layout mode to document root
        this.updateLayoutMode();
        this.applyStealthVisuals(this.stealthProfile);

        this._handleStorageUpdate = event => {
            if (event.key === 'stealthProfile') {
                const profile = event.newValue || 'balanced';
                this.setStealthAppearance(profile, { persistLocal: false });
            }
        };
    }

    handleAssistantMessagesUpdated(event) {
        const incoming = event.detail?.messages;
        if (!Array.isArray(incoming)) {
            return;
        }

        const clonedMessages = incoming.map(message => ({ ...message }));
        this.messages = clonedMessages;

        const previousAssistantCount = this.responses.length;
        const assistantResponses = clonedMessages.filter(msg => msg.role === 'assistant').map(msg => msg.content || '');
        this.responses = assistantResponses;
        this.currentResponseIndex = assistantResponses.length - 1;

        if (assistantResponses.length > previousAssistantCount) {
            this.shouldAnimateResponse = true;
            this._currentResponseIsComplete = false;
        }
        this.requestUpdate();
    }

    connectedCallback() {
        super.connectedCallback();

        window.addEventListener('storage', this._handleStorageUpdate);

        // Set up IPC listeners if needed
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.on('update-response', (_, response) => {
                this.setResponse(response);
            });
            ipcRenderer.on('update-response-streaming', (_, response) => {
                this.setResponseStreaming(response);
            });
            ipcRenderer.on('update-status', (_, status) => {
                this.setStatus(status);
            });
            ipcRenderer.on('click-through-toggled', (_, isEnabled) => {
                this._isClickThrough = isEnabled;
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('storage', this._handleStorageUpdate);
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeAllListeners('update-response');
            ipcRenderer.removeAllListeners('update-response-streaming');
            ipcRenderer.removeAllListeners('update-status');
            ipcRenderer.removeAllListeners('click-through-toggled');
        }
    }

    setStealthAppearance(profile, options = {}) {
        const { persistLocal = true } = options;
        this.stealthProfile = profile || 'balanced';
        if (persistLocal) {
            localStorage.setItem('stealthProfile', this.stealthProfile);
        }
        this.applyStealthVisuals(this.stealthProfile);
    }

    applyStealthVisuals(profile) {
        const root = document.documentElement;
        if (!root) {
            return;
        }

        if (profile === 'visible') {
            root.style.setProperty('--background-transparent', 'rgba(17, 19, 25, 0.4)');
        } else {
            root.style.setProperty('--background-transparent', 'transparent');
        }
    }

    setStatus(text) {
        this.statusText = text;
        
        // Mark response as complete when we get certain status messages
        if (text.includes('Ready') || text.includes('Listening') || text.includes('Error')) {
            this._currentResponseIsComplete = true;
            console.log('[setStatus] Marked current response as complete');
        }
    }

    setResponse(response) {
        let responseText = typeof response === 'string' ? response : String(response ?? '');
        
        // Remove leading and trailing quotes if they wrap the entire response
        responseText = responseText.replace(/^["'](.*)["']$/s, '$1');
        
        // Check if this looks like a filler response (very short responses to hmm, ok, etc)
        const isFillerResponse =
            responseText.length < 30 &&
            (responseText.toLowerCase().includes('hmm') ||
                responseText.toLowerCase().includes('okay') ||
                responseText.toLowerCase().includes('next') ||
                responseText.toLowerCase().includes('go on') ||
                responseText.toLowerCase().includes('continue'));

        // If we're awaiting a new response, always create a new message
        if (this._awaitingNewResponse) {
            this.responses = [...this.responses, responseText];
            this.currentResponseIndex = this.responses.length - 1;
            this._awaitingNewResponse = false;
            this._currentResponseIsComplete = false;
            const assistantMessage = {
                id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                role: 'assistant',
                content: responseText,
                timestamp: Date.now(),
            };
            this.messages = [...this.messages, assistantMessage];
            console.log('[setResponse] Created new response:', responseText);
        } else if (this.responses.length > 0 && !this._currentResponseIsComplete) {
            // Update the last response (streaming behavior)
            // Only update if the current response is not marked as complete
            this.responses = [...this.responses.slice(0, this.responses.length - 1), responseText];
            const lastMessage = this.messages[this.messages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
                const updatedAssistant = {
                    ...lastMessage,
                    content: responseText,
                    timestamp: Date.now(),
                };
                this.messages = [...this.messages.slice(0, this.messages.length - 1), updatedAssistant];
            }
            console.log('[setResponse] Updated streaming response:', responseText);
        } else {
            // Only create a new response if the current one is complete or it's a filler response
            this.responses = [...this.responses, responseText];
            this.currentResponseIndex = this.responses.length - 1;
            this._currentResponseIsComplete = false;
            const assistantMessage = {
                id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                role: 'assistant',
                content: responseText,
                timestamp: Date.now(),
            };
            this.messages = [...this.messages, assistantMessage];
            console.log('[setResponse] Added new response (complete or filler):', responseText);
        }
        this.shouldAnimateResponse = true;
        this.requestUpdate();
    }

    setResponseStreaming(response) {
        let responseText = typeof response === 'string' ? response : String(response ?? '');
        
        // Remove leading and trailing quotes if they wrap the entire response
        responseText = responseText.replace(/^["'](.*)["']$/s, '$1');
        
        // Only update the last response if we have one and it's not complete
        if (this.responses.length > 0 && !this._currentResponseIsComplete) {
            this.responses = [...this.responses.slice(0, this.responses.length - 1), responseText];
            const lastMessage = this.messages[this.messages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
                const updatedAssistant = {
                    ...lastMessage,
                    content: responseText,
                    timestamp: Date.now(),
                };
                this.messages = [...this.messages.slice(0, this.messages.length - 1), updatedAssistant];
            }
            console.log('[setResponseStreaming] Updated streaming response:', responseText);
        } else if (this._awaitingNewResponse) {
            // Create new response if we're waiting for one
            this.responses = [...this.responses, responseText];
            this.currentResponseIndex = this.responses.length - 1;
            this._awaitingNewResponse = false;
            this._currentResponseIsComplete = false;
            const assistantMessage = {
                id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                role: 'assistant',
                content: responseText,
                timestamp: Date.now(),
            };
            this.messages = [...this.messages, assistantMessage];
            console.log('[setResponseStreaming] Created new streaming response:', responseText);
        }
        this.shouldAnimateResponse = true;
        this.requestUpdate();
    }

    // Header event handlers
    handleCustomizeClick() {
        this.currentView = 'customize';
        this.requestUpdate();
    }

    handleHelpClick() {
        this.currentView = 'help';
        this.requestUpdate();
    }

    handleHistoryClick() {
        this.currentView = 'history';
        this.requestUpdate();
    }

    handleAdvancedClick() {
        this.currentView = 'advanced';
        this.requestUpdate();
    }

    handleConnectionsClick() {
        this.currentView = 'connections';
        this.requestUpdate();
    }

    async handleClose() {
        if (this.currentView === 'customize' || this.currentView === 'help' || this.currentView === 'history') {
            this.currentView = 'main';
        } else if (this.currentView === 'assistant') {
            cheddar.stopCapture();

            // Close the session
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('close-session');
            }
            this.sessionActive = false;
            this.currentView = 'main';
            console.log('Session closed');
        } else {
            // Quit the entire application
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('quit-application');
            }
        }
    }

    async handleHideToggle() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('toggle-window-visibility');
        }
    }

    // Main view event handlers
    async handleStart() {
        await cheddar.initializeGemini(this.selectedProfile, this.selectedLanguage);
        // Pass the screenshot interval as string (including 'manual' option)
        cheddar.startCapture(this.selectedScreenshotInterval, this.selectedImageQuality);
        this.responses = [];
        this.currentResponseIndex = -1;
        this.messages = [];
        this.startTime = Date.now();
        this.currentView = 'assistant';
    }

    async handleAPIKeyHelp() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-external', 'https://cheatingdaddy.com/help/api-key');
        }
    }

    // Customize view event handlers
    handleProfileChange(profile) {
        this.selectedProfile = profile;
    }

    handleLanguageChange(language) {
        this.selectedLanguage = language;
    }

    handleScreenshotIntervalChange(interval) {
        this.selectedScreenshotInterval = interval;
    }

    handleImageQualityChange(quality) {
        this.selectedImageQuality = quality;
        localStorage.setItem('selectedImageQuality', quality);
    }

    handleAdvancedModeChange(advancedMode) {
        this.advancedMode = advancedMode;
        localStorage.setItem('advancedMode', advancedMode.toString());
    }

    handleBackClick() {
        this.currentView = 'main';
        this.requestUpdate();
    }

    // Help view event handlers
    async handleExternalLinkClick(url) {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-external', url);
        }
    }

    // Assistant view event handlers
    async handleSendText(message) {
        const trimmedMessage = message?.trim();
        if (!trimmedMessage) {
            return;
        }

        const userMessage = {
            id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            role: 'user',
            content: trimmedMessage,
            timestamp: Date.now(),
        };
        this.messages = [...this.messages, userMessage];

        const result = await window.cheddar.sendTextMessage(trimmedMessage);

        if (!result.success) {
            console.error('Failed to send message:', result.error);
            this.setStatus('Error sending message: ' + result.error);
        } else {
            this.setStatus('Message sent...');
            this._awaitingNewResponse = true;
        }
    }

    handleResponseIndexChanged(e) {
        this.currentResponseIndex = e.detail.index;
        this.shouldAnimateResponse = false;
        this.requestUpdate();
    }

    // Onboarding event handlers
    handleOnboardingComplete() {
        this.currentView = 'main';
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        // Only notify main process of view change if the view actually changed
        if (changedProperties.has('currentView') && window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('view-changed', this.currentView);

            // Add a small delay to smooth out the transition
            const viewContainer = this.shadowRoot?.querySelector('.view-container');
            if (viewContainer) {
                viewContainer.classList.add('entering');
                requestAnimationFrame(() => {
                    viewContainer.classList.remove('entering');
                });
            }
        }

        // Only update localStorage when these specific properties change
        if (changedProperties.has('selectedProfile')) {
            localStorage.setItem('selectedProfile', this.selectedProfile);
        }
        if (changedProperties.has('selectedLanguage')) {
            localStorage.setItem('selectedLanguage', this.selectedLanguage);
        }
        if (changedProperties.has('selectedScreenshotInterval')) {
            localStorage.setItem('selectedScreenshotInterval', this.selectedScreenshotInterval);
        }
        if (changedProperties.has('selectedImageQuality')) {
            localStorage.setItem('selectedImageQuality', this.selectedImageQuality);
        }
        if (changedProperties.has('layoutMode')) {
            this.updateLayoutMode();
        }
        if (changedProperties.has('advancedMode')) {
            localStorage.setItem('advancedMode', this.advancedMode.toString());
        }
    }

    renderCurrentView() {
        // Only re-render the view if it hasn't been cached or if critical properties changed
        const viewKey = `${this.currentView}-${this.selectedProfile}-${this.selectedLanguage}`;

        switch (this.currentView) {
            case 'onboarding':
                return html`
                    <onboarding-view .onComplete=${() => this.handleOnboardingComplete()} .onClose=${() => this.handleClose()}></onboarding-view>
                `;

            case 'main':
                return html`
                    <main-view
                        .onStart=${() => this.handleStart()}
                        .onAPIKeyHelp=${() => this.handleAPIKeyHelp()}
                        .onLayoutModeChange=${layoutMode => this.handleLayoutModeChange(layoutMode)}
                    ></main-view>
                `;

            case 'customize':
                return html`
                    <customize-view
                        .selectedProfile=${this.selectedProfile}
                        .selectedLanguage=${this.selectedLanguage}
                        .selectedScreenshotInterval=${this.selectedScreenshotInterval}
                        .selectedImageQuality=${this.selectedImageQuality}
                        .layoutMode=${this.layoutMode}
                        .advancedMode=${this.advancedMode}
                        .onProfileChange=${profile => this.handleProfileChange(profile)}
                        .onLanguageChange=${language => this.handleLanguageChange(language)}
                        .onScreenshotIntervalChange=${interval => this.handleScreenshotIntervalChange(interval)}
                        .onImageQualityChange=${quality => this.handleImageQualityChange(quality)}
                        .onLayoutModeChange=${layoutMode => this.handleLayoutModeChange(layoutMode)}
                        .onAdvancedModeChange=${advancedMode => this.handleAdvancedModeChange(advancedMode)}
                    ></customize-view>
                `;

            case 'connections':
                return html`
                    <connections-view @navigate-home=${() => { this.currentView = 'main'; this.requestUpdate(); }}></connections-view>
                `;

            case 'help':
                return html` <help-view .onExternalLinkClick=${url => this.handleExternalLinkClick(url)}></help-view> `;

            case 'history':
                return html` <history-view></history-view> `;

            case 'advanced':
                return html` <advanced-view></advanced-view> `;

            case 'assistant':
                return html`
                    <assistant-view
                        .responses=${this.responses}
                        .currentResponseIndex=${this.currentResponseIndex}
                        .selectedProfile=${this.selectedProfile}
                        .messages=${this.messages}
                        .onSendText=${message => this.handleSendText(message)}
                        .shouldAnimateResponse=${this.shouldAnimateResponse}
                        @messages-updated=${event => this.handleAssistantMessagesUpdated(event)}
                        @response-index-changed=${this.handleResponseIndexChanged}
                        @response-animation-complete=${() => {
                            this.shouldAnimateResponse = false;
                            this._currentResponseIsComplete = true;
                            console.log('[response-animation-complete] Marked current response as complete');
                            this.requestUpdate();
                        }}
                    ></assistant-view>
                `;

            default:
                return html`<div>Unknown view: ${this.currentView}</div>`;
        }
    }

    render() {
        const mainContentClass = `main-content ${
            this.currentView === 'assistant' ? 'assistant-view' : this.currentView === 'onboarding' ? 'onboarding-view' : 'with-border'
        }`;

        return html`
            <div class="window-container">
                <div class="container">
                    <app-header
                        .currentView=${this.currentView}
                        .statusText=${this.statusText}
                        .startTime=${this.startTime}
                        .advancedMode=${this.advancedMode}
                        .onCustomizeClick=${() => this.handleCustomizeClick()}
                        .onConnectionsClick=${() => this.handleConnectionsClick()}
                        .onHelpClick=${() => this.handleHelpClick()}
                        .onHistoryClick=${() => this.handleHistoryClick()}
                        .onAdvancedClick=${() => this.handleAdvancedClick()}
                        .onCloseClick=${() => this.handleClose()}
                        .onBackClick=${() => this.handleBackClick()}
                        .onHideToggleClick=${() => this.handleHideToggle()}
                        ?isClickThrough=${this._isClickThrough}
                    ></app-header>
                    <div class="${mainContentClass}">
                        <div class="view-container">${this.renderCurrentView()}</div>
                    </div>
                </div>
            </div>
        `;
    }

    updateLayoutMode() {
        // Apply or remove compact layout class to document root
        if (this.layoutMode === 'compact') {
            document.documentElement.classList.add('compact-layout');
        } else {
            document.documentElement.classList.remove('compact-layout');
        }
    }

    async handleLayoutModeChange(layoutMode) {
        this.layoutMode = layoutMode;
        localStorage.setItem('layoutMode', layoutMode);
        this.updateLayoutMode();

        // Notify main process about layout change for window resizing
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('update-sizes');
            } catch (error) {
                console.error('Failed to update sizes in main process:', error);
            }
        }

        this.requestUpdate();
    }
}

customElements.define('cheating-daddy-app', CheatingDaddyApp);
