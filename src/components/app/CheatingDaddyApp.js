import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { AppHeader } from './AppHeader.js';
import { MainView } from '../views/MainView.js';
import { CustomizeView } from '../views/CustomizeView.js';
import { HelpView } from '../views/HelpView.js';
import { HistoryView } from '../views/HistoryView.js';
import { AssistantView } from '../views/AssistantView.js';
import { OnboardingView } from '../views/OnboardingView.js';
import { UpgradeDialog } from '../dialogs/UpgradeDialog.js';

export class CheatingDaddyApp extends LitElement {
    static styles = css`
        * {
            box-sizing: border-box;
            font-family:
                'Inter',
                -apple-system,
                BlinkMacSystemFont,
                sans-serif;
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
            overflow: hidden;
            background: var(--bg-primary);
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
            background: var(--main-content-background);
        }

        .main-content.with-border {
            border-top: none;
        }

        .main-content.assistant-view {
            padding: 12px;
        }

        .main-content.onboarding-view {
            padding: 0;
            background: transparent;
        }

        .main-content.settings-view,
        .main-content.help-view,
        .main-content.history-view {
            padding: 0;
        }

        .view-container {
            opacity: 1;
            height: 100%;
        }

        .view-container.entering {
            opacity: 0;
        }

        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        ::-webkit-scrollbar-track {
            background: transparent;
        }

        ::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }

        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: flex-end;
        }

        .toast {
            background: #2a2a2a; /* Fallback */
            background: var(--bg-tertiary, #2a2a2a);
            color: var(--text-color, #fff);
            padding: 12px 16px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            border-left: 4px solid #00e6cc; /* Default/Info */
            opacity: 0;
            transform: translateX(20px);
            transition:
                opacity 0.3s ease,
                transform 0.3s ease;
            pointer-events: auto;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 8px;
            max-width: 320px;
            pointer-events: none; /* Let clicks pass through if covered, but toast itself handles */
        }

        .toast.visible {
            opacity: 1;
            transform: translateX(0);
        }

        .toast.error {
            border-left-color: #ef4444;
        }
        .toast.warning {
            border-left-color: #f59e0b;
        }
        .toast.success {
            border-left-color: #10b981;
        }

        .branding-footer {
            position: fixed;
            bottom: 15px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255, 255, 255, 0.9);
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 2px;
            pointer-events: none;
            z-index: 9999;
            text-shadow:
                0 0 10px rgba(0, 255, 255, 0.6),
                0 0 20px rgba(0, 255, 255, 0.4);
            opacity: 0.9;
            white-space: nowrap;
            border-top: 1px solid rgba(0, 255, 255, 0.3);
            padding-top: 5px;
            background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.05), transparent);
            width: 100%;
            text-align: center;
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
        selectedScreenshotInterval: { type: String },
        selectedImageQuality: { type: String },
        responseViewMode: { type: String },
        autoScroll: { type: Boolean },
        showSidebar: { type: Boolean },
        layoutMode: { type: String },
        _viewInstances: { type: Object, state: true },
        _isClickThrough: { state: true },
        _awaitingNewResponse: { state: true },
        shouldAnimateResponse: { type: Boolean },
        _storageLoaded: { state: true },

        // Toast State
        toastMessage: { type: String },
        toastType: { type: String },
        toastVisible: { type: Boolean },

        // Upgrade Dialog State
        showUpgradeDialog: { type: Boolean },
        upgradeInfo: { type: Object },

        // Update Dialog State (for new version notifications)
        showUpdateDialog: { type: Boolean },
        updateInfo: { type: Object },
    };

    constructor() {
        super();
        // Set defaults - will be overwritten by storage
        this.currentView = 'main'; // Will check onboarding after storage loads
        this.statusText = '';
        this.startTime = null;
        this.isRecording = false;
        this.sessionActive = false;
        this.selectedProfile = 'interview';
        this.selectedLanguage = 'en-US';
        this.selectedScreenshotInterval = '5';
        this.selectedImageQuality = 'medium';
        this.responseViewMode = 'paged';
        this.autoScroll = true;
        this.showSidebar = true;
        this.layoutMode = 'normal';
        this.responses = [];
        this.currentResponseIndex = -1;
        this._viewInstances = new Map();
        this._isClickThrough = false;
        this._awaitingNewResponse = false;
        this._currentResponseIsComplete = true;
        this.shouldAnimateResponse = false;
        this._storageLoaded = false;

        // Upgrade dialog state
        this.showUpgradeDialog = false;
        this.upgradeInfo = null;

        // Update dialog state (for new version notifications)
        this.showUpdateDialog = false;
        this.updateInfo = null;

        // Load from storage
        this._loadFromStorage();
    }

    async _loadFromStorage() {
        try {
            // Note: First run/upgrade dialog is now handled at app startup in a separate window
            // The upgrade check here is skipped - we go straight to loading settings

            const [config, prefs] = await Promise.all([cheatingDaddy.storage.getConfig(), cheatingDaddy.storage.getPreferences()]);

            // Check onboarding status
            this.currentView = config.onboarded ? 'main' : 'onboarding';

            // Apply background appearance (color + transparency)
            this.applyBackgroundAppearance(prefs.backgroundColor ?? '#1e1e1e', prefs.backgroundTransparency ?? 0.8);

            // Load preferences
            this.selectedProfile = prefs.selectedProfile || 'interview';
            this.selectedLanguage = prefs.selectedLanguage || 'en-US';
            this.selectedScreenshotInterval = prefs.selectedScreenshotInterval || '5';
            this.selectedImageQuality = prefs.selectedImageQuality || 'medium';
            this.responseViewMode = prefs.responseViewMode || 'paged';
            this.autoScroll = prefs.autoScroll ?? true;
            this.showSidebar = prefs.showSidebar ?? true;
            this.layoutMode = config.layout || 'normal';

            this._storageLoaded = true;
            this.updateLayoutMode();
            this.requestUpdate();
        } catch (error) {
            console.error('Error loading from storage:', error);
            this._storageLoaded = true;
            this.requestUpdate();
        }
    }

    async _fetchReleaseNotes() {
        try {
            // Fetch update info directly (updateChecker not available with context isolation)
            const response = await fetch(
                'https://raw.githubusercontent.com/klaus-qodes/cheating-daddy/master/update.json',
                { cache: 'no-store' }
            );
            if (!response.ok) throw new Error('Failed to fetch update info');
            const updateInfo = await response.json();

            // Even if hasUpdate is false (because we are already on latest),
            // if we just updated, we want to show notes for the CURRENT version
            // which is returned as part of the check result's updateInfo or by re-fetching
            if (updateInfo) {
                this.upgradeInfo = {
                    ...this.upgradeInfo,
                    releaseNotes: updateInfo.releaseNotes,
                    releaseChannel: updateInfo.releaseChannel,
                };
                this.requestUpdate();
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
        }
    }

    handleUpdateDialogClose() {
        this.showUpdateDialog = false;
        this.updateInfo = null;
        this.requestUpdate();
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16),
              }
            : { r: 30, g: 30, b: 30 };
    }

    lightenColor(rgb, amount) {
        return {
            r: Math.min(255, rgb.r + amount),
            g: Math.min(255, rgb.g + amount),
            b: Math.min(255, rgb.b + amount),
        };
    }

    applyBackgroundAppearance(backgroundColor, alpha) {
        const root = document.documentElement;
        const baseRgb = this.hexToRgb(backgroundColor);

        // Generate color variants based on the base color
        const secondary = this.lightenColor(baseRgb, 7);
        const tertiary = this.lightenColor(baseRgb, 15);
        const hover = this.lightenColor(baseRgb, 20);

        root.style.setProperty('--header-background', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--main-content-background', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--bg-primary', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--bg-secondary', `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${alpha})`);
        root.style.setProperty('--bg-tertiary', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--bg-hover', `rgba(${hover.r}, ${hover.g}, ${hover.b}, ${alpha})`);
        root.style.setProperty('--input-background', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--input-focus-background', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--hover-background', `rgba(${hover.r}, ${hover.g}, ${hover.b}, ${alpha})`);
        root.style.setProperty('--scrollbar-background', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
    }

    // Keep old function name for backwards compatibility
    applyBackgroundTransparency(alpha) {
        this.applyBackgroundAppearance('#1e1e1e', alpha);
    }

    connectedCallback() {
        super.connectedCallback();

        // Apply layout mode to document root
        this.updateLayoutMode();

        // Set up IPC listeners via preload bridge
        if (window.electronAPI) {
            this._cleanupNewResponse = window.electronAPI.onNewResponse(response => {
                this.addNewResponse(response);
            });
            this._cleanupUpdateResponse = window.electronAPI.onUpdateResponse(response => {
                this.updateCurrentResponse(response);
            });
            this._cleanupUpdateStatus = window.electronAPI.onUpdateStatus(status => {
                this.setStatus(status);
            });
            this._cleanupClickThrough = window.electronAPI.onClickThroughToggled(isEnabled => {
                this._isClickThrough = isEnabled;
            });
            this._cleanupReconnectFailed = window.electronAPI.onReconnectFailed(data => {
                this.addNewResponse(data.message);
            });
            this._cleanupToast = window.electronAPI.onToast(data => {
                this.handleToast(data);
            });
            this._cleanupSettingChanged = window.electronAPI.onSettingChanged(data => {
                this.handleSettingChanged(data);
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        // Clean up IPC listeners via stored cleanup functions
        if (this._cleanupNewResponse) this._cleanupNewResponse();
        if (this._cleanupUpdateResponse) this._cleanupUpdateResponse();
        if (this._cleanupUpdateStatus) this._cleanupUpdateStatus();
        if (this._cleanupClickThrough) this._cleanupClickThrough();
        if (this._cleanupReconnectFailed) this._cleanupReconnectFailed();
        if (this._cleanupToast) this._cleanupToast();
        if (this._cleanupSettingChanged) this._cleanupSettingChanged();
    }

    handleToast(data) {
        if (!data || !data.message) return;

        this.toastMessage = data.message;
        this.toastType = data.type || 'info';
        this.toastVisible = true;

        // Auto-hide after 3 seconds
        if (this._toastTimeout) clearTimeout(this._toastTimeout);
        this._toastTimeout = setTimeout(() => {
            this.toastVisible = false;
        }, 3000);
    }

    handleSettingChanged(data) {
        if (!data || !data.key) return;

        console.log('Setting changed via IPC:', data);

        // If we need to update internal state based on specific keys
        if (data.key === 'audioProcessingMode') {
            // Force CustomizeView to refresh if it's potentially active or cached
            // We can dispatch a global event for sub-components
            window.dispatchEvent(
                new CustomEvent('external-setting-change', {
                    detail: { key: data.key, value: data.value },
                })
            );
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

    addNewResponse(response) {
        // Add a new response entry (first word of a new AI response)
        this.responses = [...this.responses, response];
        this.currentResponseIndex = this.responses.length - 1;
        this._awaitingNewResponse = false;
        console.log('[addNewResponse] Added:', response);
        this.requestUpdate();
    }

    updateCurrentResponse(response) {
        if (this.responses.length > 0) {
            const current = this.responses[this.responses.length - 1];
            let responseToMerge = typeof response === 'string' ? { text: response } : { ...response };

            Object.keys(responseToMerge).forEach(key => responseToMerge[key] === undefined && delete responseToMerge[key]);

            const updated = { ...current, ...responseToMerge };
            this.responses = [...this.responses.slice(0, -1), updated];
            console.log('[updateCurrentResponse] Updated response');
        } else {
            this.addNewResponse(response);
        }
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

    async handleClose() {
        if (this.currentView === 'customize' || this.currentView === 'help' || this.currentView === 'history') {
            this.currentView = 'main';
        } else if (this.currentView === 'assistant') {
            cheatingDaddy.stopCapture();

            // Close the session
            if (window.electronAPI) {
                await window.electronAPI.assistant.closeSession();
            }
            this.sessionActive = false;
            this.currentView = 'main';
            console.log('Session closed');
        } else {
            // Quit the entire application
            if (window.electronAPI) {
                await window.electronAPI.window.quit();
            }
        }
    }

    async handleHideToggle() {
        if (window.electronAPI) {
            await window.electronAPI.window.toggleVisibility();
        }
    }

    // Main view event handlers
    async handleStart() {
        // Check if any API key is configured
        const credentials = await cheatingDaddy.storage.getCredentials();
        // Check for gemini key (support legacy 'apiKey' field too)
        const geminiKey = credentials.gemini || credentials.apiKey || '';
        const groqKey = credentials.groq || '';

        const hasGemini = geminiKey.length > 0;
        const hasGroq = groqKey.length > 0;

        if (!hasGemini && !hasGroq) {
            // Redirect to settings if no keys are configured
            this.currentView = 'customize';
            this.setStatus('Please configure your API keys to get started.');
            return;
        }

        await cheatingDaddy.initializeGemini(this.selectedProfile, this.selectedLanguage);
        // Pass the screenshot interval as string (including 'manual' option)
        cheatingDaddy.startCapture(this.selectedScreenshotInterval, this.selectedImageQuality);
        this.responses = [];
        this.currentResponseIndex = -1;
        this.startTime = Date.now();
        this.currentView = 'assistant';
    }

    async handleAPIKeyHelp() {
        if (window.electronAPI) {
            await window.electronAPI.window.openExternal('https://cheatingdaddy.com/help/api-key');
        }
    }

    // Customize view event handlers
    async handleProfileChange(profile) {
        this.selectedProfile = profile;
        await cheatingDaddy.storage.updatePreference('selectedProfile', profile);
    }

    async handleLanguageChange(language) {
        this.selectedLanguage = language;
        await cheatingDaddy.storage.updatePreference('selectedLanguage', language);
    }

    async handleScreenshotIntervalChange(interval) {
        this.selectedScreenshotInterval = interval;
        await cheatingDaddy.storage.updatePreference('selectedScreenshotInterval', interval);
    }

    async handleImageQualityChange(quality) {
        this.selectedImageQuality = quality;
        await cheatingDaddy.storage.updatePreference('selectedImageQuality', quality);
    }

    async handleResponseViewModeChange(mode) {
        this.responseViewMode = mode;
        await cheatingDaddy.storage.updatePreference('responseViewMode', mode);
    }

    handleBackClick() {
        this.currentView = 'main';
        this.requestUpdate();
    }

    // Help view event handlers
    async handleExternalLinkClick(url) {
        if (window.electronAPI) {
            await window.electronAPI.window.openExternal(url);
        }
    }

    // Assistant view event handlers
    async handleSendText(message) {
        const result = await window.cheatingDaddy.sendTextMessage(message);

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

    handleUpgradeDialogComplete(e) {
        const { action } = e.detail;

        if (action === 'keep') {
            // User chose to keep config, hide dialog
            this.showUpgradeDialog = false;
            this.upgradeInfo = null;
            this.requestUpdate();
        }
        // If action is 'reset', the dialog handles quitting the app
    }

    handleUpgradeDialogError(e) {
        const { error } = e.detail;
        this.showToast(`Error: ${error}`, 'error');
    }

    // Onboarding event handlers
    handleOnboardingComplete() {
        this.currentView = 'main';
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        // Only notify main process of view change if the view actually changed
        if (changedProperties.has('currentView') && window.electronAPI) {
            window.electronAPI.send.viewChanged(this.currentView);

            // Add a small delay to smooth out the transition
            const viewContainer = this.shadowRoot?.querySelector('.view-container');
            if (viewContainer) {
                viewContainer.classList.add('entering');
                requestAnimationFrame(() => {
                    viewContainer.classList.remove('entering');
                });
            }
        }

        if (changedProperties.has('layoutMode')) {
            this.updateLayoutMode();
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
                        .onProfileChange=${profile => this.handleProfileChange(profile)}
                        .onLanguageChange=${language => this.handleLanguageChange(language)}
                        .onScreenshotIntervalChange=${interval => this.handleScreenshotIntervalChange(interval)}
                        .onImageQualityChange=${quality => this.handleImageQualityChange(quality)}
                        .onResponseViewModeChange=${mode => this.handleResponseViewModeChange(mode)}
                        .onLayoutModeChange=${layoutMode => this.handleLayoutModeChange(layoutMode)}
                    ></customize-view>
                `;

            case 'help':
                return html` <help-view .onExternalLinkClick=${url => this.handleExternalLinkClick(url)}></help-view> `;

            case 'history':
                return html` <history-view></history-view> `;

            case 'assistant':
                return html`
                    <assistant-view
                        .responses=${this.responses}
                        .currentResponseIndex=${this.currentResponseIndex}
                        .selectedProfile=${this.selectedProfile}
                        .viewMode=${this.responseViewMode}
                        .autoScroll=${this.autoScroll}
                        .showSidebar=${this.showSidebar}
                        .onSendText=${message => this.handleSendText(message)}
                        .shouldAnimateResponse=${this.shouldAnimateResponse}
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
        const viewClassMap = {
            assistant: 'assistant-view',
            onboarding: 'onboarding-view',
            customize: 'settings-view',
            help: 'help-view',
            history: 'history-view',
        };
        const mainContentClass = `main-content ${viewClassMap[this.currentView] || 'with-border'}`;

        return html`
            <div class="window-container">
                <div class="container">
                    <app-header
                        .currentView=${this.currentView}
                        .statusText=${this.statusText}
                        .startTime=${this.startTime}
                        .onCustomizeClick=${() => this.handleCustomizeClick()}
                        .onHelpClick=${() => this.handleHelpClick()}
                        .onHistoryClick=${() => this.handleHistoryClick()}
                        .onCloseClick=${() => this.handleClose()}
                        .onBackClick=${() => this.handleBackClick()}
                        .onHideToggleClick=${() => this.handleHideToggle()}
                        ?isClickThrough=${this._isClickThrough}
                    ></app-header>
                    <div class="${mainContentClass}">
                        <div class="view-container">${this.renderCurrentView()}</div>
                    </div>
                </div>
                ${this.currentView !== 'assistant' ? html` <div class="branding-footer">Cheating Daddy On Steroids By klaus-qodes</div> ` : ''}

                <div class="toast-container">
                    <div class="toast ${this.toastVisible ? 'visible' : ''} ${this.toastType}">
                        <span>${this.toastMessage}</span>
                    </div>
                </div>

                ${this.showUpgradeDialog && this.upgradeInfo
                    ? html`
                          <upgrade-dialog
                              .isFirstRun=${this.upgradeInfo.isFirstRun}
                              .isUpgrade=${this.upgradeInfo.isUpgrade}
                              .previousVersion=${this.upgradeInfo.previousVersion || ''}
                              .currentVersion=${this.upgradeInfo.currentVersion || ''}
                              .releaseNotes=${this.upgradeInfo.releaseNotes || []}
                              .releaseChannel=${this.upgradeInfo.releaseChannel || ''}
                              @dialog-complete=${this.handleUpgradeDialogComplete}
                              @dialog-error=${this.handleUpgradeDialogError}
                          ></upgrade-dialog>
                      `
                    : ''}
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
        await cheatingDaddy.storage.updateConfig('layout', layoutMode);
        this.updateLayoutMode();

        // Notify main process about layout change for window resizing
        if (window.electronAPI) {
            try {
                await window.electronAPI.window.updateSizes();
            } catch (error) {
                console.error('Failed to update sizes in main process:', error);
            }
        }

        this.requestUpdate();
    }
}

customElements.define('cheating-daddy-app', CheatingDaddyApp);
