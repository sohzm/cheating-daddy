import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class AdvancedView extends LitElement {
    static styles = css`
        * {
            font-family:
                'Inter',
                -apple-system,
                BlinkMacSystemFont,
                sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            padding: 12px;
            margin: 0 auto;
            max-width: 700px;
        }

        .advanced-container {
            display: grid;
            gap: 12px;
            padding-bottom: 20px;
        }

        .advanced-section {
            background: var(--card-background, rgba(255, 255, 255, 0.04));
            border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
            border-radius: 6px;
            padding: 16px;
            backdrop-filter: blur(10px);
        }

        .danger-section {
            border-color: var(--danger-border, rgba(239, 68, 68, 0.3));
            background: var(--danger-background, rgba(239, 68, 68, 0.05));
        }

        .section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-color);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .section-title.danger {
            color: var(--danger-color, #ef4444);
        }

        .section-title::before {
            content: '';
            width: 3px;
            height: 14px;
            background: var(--accent-color, #007aff);
            border-radius: 1.5px;
        }

        .section-title.danger::before {
            background: var(--danger-color, #ef4444);
        }

        .advanced-description {
            font-size: 12px;
            color: var(--description-color, rgba(255, 255, 255, 0.7));
            line-height: 1.4;
            margin-bottom: 16px;
        }

        .warning-box {
            background: var(--warning-background, rgba(251, 191, 36, 0.08));
            border: 1px solid var(--warning-border, rgba(251, 191, 36, 0.2));
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 16px;
            font-size: 11px;
            color: var(--warning-color, #fbbf24);
            display: flex;
            align-items: flex-start;
            gap: 8px;
            line-height: 1.4;
        }

        .danger-box {
            background: var(--danger-background, rgba(239, 68, 68, 0.08));
            border: 1px solid var(--danger-border, rgba(239, 68, 68, 0.2));
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 16px;
            font-size: 11px;
            color: var(--danger-color, #ef4444);
            display: flex;
            align-items: flex-start;
            gap: 8px;
            line-height: 1.4;
        }

        .warning-icon,
        .danger-icon {
            flex-shrink: 0;
            font-size: 12px;
            margin-top: 1px;
        }

        .action-button {
            background: var(--button-background, rgba(255, 255, 255, 0.1));
            color: var(--text-color);
            border: 1px solid var(--button-border, rgba(255, 255, 255, 0.15));
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            cursor: default;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            gap: 6px;
            width: fit-content;
        }

        .action-button:hover {
            background: var(--button-hover-background, rgba(255, 255, 255, 0.15));
            border-color: var(--button-hover-border, rgba(255, 255, 255, 0.25));
        }

        .action-button:active {
            transform: translateY(1px);
        }

        .danger-button {
            background: var(--danger-button-background, rgba(239, 68, 68, 0.1));
            color: var(--danger-color, #ef4444);
            border-color: var(--danger-border, rgba(239, 68, 68, 0.3));
        }

        .danger-button:hover {
            background: var(--danger-button-hover, rgba(239, 68, 68, 0.15));
            border-color: var(--danger-border-hover, rgba(239, 68, 68, 0.4));
        }

        .action-description {
            font-size: 11px;
            color: var(--description-color, rgba(255, 255, 255, 0.5));
            line-height: 1.3;
            margin-top: 8px;
        }

        .status-message {
            margin-top: 12px;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
        }

        .status-success {
            background: var(--success-background, rgba(34, 197, 94, 0.1));
            color: var(--success-color, #22c55e);
            border: 1px solid var(--success-border, rgba(34, 197, 94, 0.2));
        }

        .status-error {
            background: var(--danger-background, rgba(239, 68, 68, 0.1));
            color: var(--danger-color, #ef4444);
            border: 1px solid var(--danger-border, rgba(239, 68, 68, 0.2));
        }

        .feature-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .feature-list li {
            font-size: 12px;
            color: var(--text-color);
            padding: 4px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .feature-list li::before {
            content: '🔧';
            font-size: 10px;
        }

        .form-grid {
            display: grid;
            gap: 12px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            align-items: start;
        }

        @media (max-width: 600px) {
            .form-row {
                grid-template-columns: 1fr;
            }
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .form-label {
            font-weight: 500;
            font-size: 12px;
            color: var(--label-color, rgba(255, 255, 255, 0.9));
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .form-description {
            font-size: 11px;
            color: var(--description-color, rgba(255, 255, 255, 0.5));
            line-height: 1.3;
            margin-top: 2px;
        }

        .form-control {
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            color: var(--text-color);
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.15));
            padding: 8px 10px;
            border-radius: 4px;
            font-size: 12px;
            transition: all 0.15s ease;
            min-height: 16px;
            font-weight: 400;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--focus-border-color, #007aff);
            box-shadow: 0 0 0 2px var(--focus-shadow, rgba(0, 122, 255, 0.1));
            background: var(--input-focus-background, rgba(0, 0, 0, 0.4));
        }

        .form-control:hover:not(:focus) {
            border-color: var(--input-hover-border, rgba(255, 255, 255, 0.2));
            background: var(--input-hover-background, rgba(0, 0, 0, 0.35));
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
            padding: 8px;
            background: var(--checkbox-background, rgba(255, 255, 255, 0.02));
            border-radius: 4px;
            border: 1px solid var(--checkbox-border, rgba(255, 255, 255, 0.06));
        }

        .checkbox-input {
            width: 14px;
            height: 14px;
            accent-color: var(--focus-border-color, #007aff);
            cursor: default;
        }

        .checkbox-label {
            font-weight: 500;
            font-size: 12px;
            color: var(--label-color, rgba(255, 255, 255, 0.9));
            cursor: default;
            user-select: none;
        }

        /* Slider styles */
        .slider-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 16px;
        }

        .slider-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .slider-label {
            font-size: 12px;
            font-weight: 500;
            color: var(--label-color, rgba(255, 255, 255, 0.9));
        }

        .slider-value {
            font-size: 11px;
            color: var(--success-color, #34d399);
            background: var(--success-background, rgba(52, 211, 153, 0.1));
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
            border: 1px solid var(--success-border, rgba(52, 211, 153, 0.2));
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
        }

        .slider-input {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 4px;
            border-radius: 2px;
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            outline: none;
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.15));
            cursor: default;
        }

        .slider-input::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--focus-border-color, #007aff);
            cursor: default;
            border: 2px solid var(--text-color, white);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider-input::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--focus-border-color, #007aff);
            cursor: default;
            border: 2px solid var(--text-color, white);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider-input:hover::-webkit-slider-thumb {
            background: var(--text-input-button-hover, #0056b3);
        }

        .slider-input:hover::-moz-range-thumb {
            background: var(--text-input-button-hover, #0056b3);
        }

        .slider-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
            font-size: 10px;
            color: var(--description-color, rgba(255, 255, 255, 0.5));
        }

        .slider-description {
            font-size: 11px;
            color: var(--description-color, rgba(255, 255, 255, 0.5));
            margin-top: 4px;
            line-height: 1.3;
        }

        .settings-grid {
            display: grid;
            gap: 16px;
        }

        .reset-button {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--table-border, rgba(255, 255, 255, 0.08));
        }

        /* Number input for max output tokens */
        .number-input-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 16px;
        }

        .number-input-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .number-input-label {
            font-size: 12px;
            font-weight: 500;
            color: var(--label-color, rgba(255, 255, 255, 0.9));
        }

        .number-input {
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            color: var(--text-color);
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.15));
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 13px;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
            width: 140px;
            transition: all 0.15s ease;
        }

        .number-input:focus {
            outline: none;
            border-color: var(--focus-border-color, #007aff);
            box-shadow: 0 0 0 2px var(--focus-shadow, rgba(0, 122, 255, 0.1));
            background: var(--input-focus-background, rgba(0, 0, 0, 0.4));
        }

        .number-input:hover:not(:focus) {
            border-color: var(--input-hover-border, rgba(255, 255, 255, 0.2));
            background: var(--input-hover-background, rgba(0, 0, 0, 0.35));
        }

        .model-badge {
            font-size: 11px;
            padding: 3px 10px;
            border-radius: 10px;
            background: var(--success-background, rgba(52, 211, 153, 0.1));
            color: var(--success-color, #34d399);
            border: 1px solid var(--success-border, rgba(52, 211, 153, 0.2));
            font-weight: 500;
        }

        .model-badge.orange {
            background: rgba(251, 146, 60, 0.1);
            color: #fb923c;
            border: 1px solid rgba(251, 146, 60, 0.2);
        }

        .defaults-label {
            color: var(--description-color, rgba(255, 255, 255, 0.5));
        }

        .defaults-values {
            color: var(--text-color, #ffffff);
        }

    `;

    static properties = {
        isClearing: { type: Boolean },
        statusMessage: { type: String },
        statusType: { type: String },
        contentProtection: { type: Boolean },
        // Model generation settings
        temperature: { type: Number },
        topP: { type: Number },
        maxOutputTokens: { type: Number },
        selectedModel: { type: String },
    };

    // Model-specific max output token limits
    static MODEL_MAX_TOKENS = {
        'gemini-2.0-flash-exp': 8192,
        'gemini-2.5-flash': 65536,
        'gemini-3-pro-preview': 65536,
    };

    constructor() {
        super();
        this.isClearing = false;
        this.statusMessage = '';
        this.statusType = '';

        // Content protection default
        this.contentProtection = true;

        // Model generation defaults (Gemini optimized values)
        this.temperature = 0.7;
        this.topP = 0.95;
        this.selectedModel = localStorage.getItem('selectedModel') || 'gemini-2.0-flash-exp';
        this.maxOutputTokens = this.getDefaultMaxTokens();

        this.loadContentProtectionSetting();
        this.loadModelSettings();
    }

    // Get default max tokens based on selected model
    getDefaultMaxTokens() {
        return AdvancedView.MODEL_MAX_TOKENS[this.selectedModel] || 8192;
    }

    // Get max allowed tokens for current model
    getMaxAllowedTokens() {
        return AdvancedView.MODEL_MAX_TOKENS[this.selectedModel] || 65536;
    }

    // Get display name for the current model
    getModelDisplayName() {
        const modelNames = {
            'gemini-2.0-flash-exp': 'Gemini 2.0 Flash',
            'gemini-2.5-flash': 'Gemini 2.5 Flash',
            'gemini-3-pro-preview': 'Gemini 3.0 Pro',
        };
        return modelNames[this.selectedModel] || this.selectedModel;
    }

    // Check if model should have orange badge (exam mode models)
    isExamModeModel() {
        return this.selectedModel === 'gemini-2.5-flash' || this.selectedModel === 'gemini-3-pro-preview';
    }

    connectedCallback() {
        super.connectedCallback();
        // Resize window for this view
        resizeLayout();

        // Always re-read selected model from localStorage when component connects
        // This ensures we have the latest model after navigating from CustomizeView
        const currentModel = localStorage.getItem('selectedModel') || 'gemini-2.0-flash-exp';
        if (currentModel !== this.selectedModel) {
            this.selectedModel = currentModel;
            // Update max output tokens to the new model's default
            this.maxOutputTokens = this.getDefaultMaxTokens();
            this.loadModelSettings(); // Reload saved settings with new model limits
        }

        // Sync current settings to main process
        this.syncSettingsToMain();

        // Listen for model changes from CustomizeView (same window)
        this.modelChangeHandler = (e) => {
            const newModel = e.detail?.model || 'gemini-2.0-flash-exp';
            if (newModel !== this.selectedModel) {
                this.selectedModel = newModel;
                // Update max output tokens to the new model's default
                this.maxOutputTokens = this.getDefaultMaxTokens();
                localStorage.setItem('geminiMaxOutputTokens', this.maxOutputTokens.toString());
                this.syncSettingsToMain();
                this.requestUpdate();
            }
        };
        window.addEventListener('modelChanged', this.modelChangeHandler);

        // Listen for model changes from other windows/tabs
        this.storageHandler = (e) => {
            if (e.key === 'selectedModel') {
                const newModel = e.newValue || 'gemini-2.0-flash-exp';
                if (newModel !== this.selectedModel) {
                    this.selectedModel = newModel;
                    // Update max output tokens to the new model's default
                    this.maxOutputTokens = this.getDefaultMaxTokens();
                    localStorage.setItem('geminiMaxOutputTokens', this.maxOutputTokens.toString());
                    this.syncSettingsToMain();
                    this.requestUpdate();
                }
            }
        };
        window.addEventListener('storage', this.storageHandler);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.modelChangeHandler) {
            window.removeEventListener('modelChanged', this.modelChangeHandler);
        }
        if (this.storageHandler) {
            window.removeEventListener('storage', this.storageHandler);
        }
    }

    async clearLocalData() {
        if (this.isClearing) return;

        this.isClearing = true;
        this.statusMessage = '';
        this.statusType = '';
        this.requestUpdate();

        try {
            // Clear localStorage
            localStorage.clear();

            // Clear sessionStorage
            sessionStorage.clear();

            // Clear IndexedDB databases
            const databases = await indexedDB.databases();
            const clearPromises = databases.map(db => {
                return new Promise((resolve, reject) => {
                    const deleteReq = indexedDB.deleteDatabase(db.name);
                    deleteReq.onsuccess = () => resolve();
                    deleteReq.onerror = () => reject(deleteReq.error);
                    deleteReq.onblocked = () => {
                        console.warn(`Deletion of database ${db.name} was blocked`);
                        resolve(); // Continue anyway
                    };
                });
            });

            await Promise.all(clearPromises);

            // Clear any other browser storage
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }

            this.statusMessage = `✅ Successfully cleared all local data (${databases.length} databases, localStorage, sessionStorage, and caches)`;
            this.statusType = 'success';

            // Notify user that app will close
            setTimeout(() => {
                this.statusMessage = '🔄 Closing application...';
                this.requestUpdate();
                setTimeout(async () => {
                    // Close the entire application
                    if (window.require) {
                        const { ipcRenderer } = window.require('electron');
                        await ipcRenderer.invoke('quit-application');
                    }
                }, 1000);
            }, 2000);
        } catch (error) {
            console.error('Error clearing data:', error);
            this.statusMessage = `❌ Error clearing data: ${error.message}`;
            this.statusType = 'error';
        } finally {
            this.isClearing = false;
            this.requestUpdate();
        }
    }

    // Content protection methods
    loadContentProtectionSetting() {
        const contentProtection = localStorage.getItem('contentProtection');
        this.contentProtection = contentProtection !== null ? contentProtection === 'true' : true;
    }

    async handleContentProtectionChange(e) {
        this.contentProtection = e.target.checked;
        localStorage.setItem('contentProtection', this.contentProtection.toString());

        // Update the window's content protection in real-time
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            try {
                await ipcRenderer.invoke('update-content-protection', this.contentProtection);
            } catch (error) {
                console.error('Failed to update content protection:', error);
            }
        }

        this.requestUpdate();
    }

    // Model generation settings methods
    loadModelSettings() {
        const temperature = localStorage.getItem('geminiTemperature');
        const topP = localStorage.getItem('geminiTopP');
        const maxOutputTokens = localStorage.getItem('geminiMaxOutputTokens');

        if (temperature !== null) {
            this.temperature = parseFloat(temperature);
        }
        if (topP !== null) {
            this.topP = parseFloat(topP);
        }
        if (maxOutputTokens !== null) {
            let loadedTokens = parseInt(maxOutputTokens, 10);
            const maxAllowed = this.getMaxAllowedTokens();
            // Cap to current model's max limit
            this.maxOutputTokens = Math.min(loadedTokens, maxAllowed);
        }
    }

    async handleTemperatureChange(e) {
        this.temperature = parseFloat(e.target.value);
        localStorage.setItem('geminiTemperature', this.temperature.toString());
        await this.syncSettingsToMain();
        this.requestUpdate();
    }

    async handleTopPChange(e) {
        this.topP = parseFloat(e.target.value);
        localStorage.setItem('geminiTopP', this.topP.toString());
        await this.syncSettingsToMain();
        this.requestUpdate();
    }

    async handleMaxOutputTokensChange(e) {
        let value = parseInt(e.target.value, 10);
        const maxAllowed = this.getMaxAllowedTokens();

        // Clamp value to valid range
        if (isNaN(value) || value < 256) {
            value = 256;
        } else if (value > maxAllowed) {
            value = maxAllowed;
        }

        this.maxOutputTokens = value;
        localStorage.setItem('geminiMaxOutputTokens', this.maxOutputTokens.toString());
        await this.syncSettingsToMain();
        this.requestUpdate();
    }

    async resetModelSettings() {
        this.temperature = 0.7;
        this.topP = 0.95;
        this.maxOutputTokens = this.getDefaultMaxTokens();

        localStorage.removeItem('geminiTemperature');
        localStorage.removeItem('geminiTopP');
        localStorage.removeItem('geminiMaxOutputTokens');

        await this.syncSettingsToMain();
        this.requestUpdate();
    }

    // Sync settings to main process
    async syncSettingsToMain() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            try {
                await ipcRenderer.invoke('update-generation-settings', {
                    temperature: this.temperature,
                    topP: this.topP,
                    maxOutputTokens: this.maxOutputTokens,
                });
            } catch (error) {
                console.error('Failed to sync generation settings:', error);
            }
        }
    }

    render() {
        return html`
            <div class="advanced-container">
                <!-- Content Protection Section -->
                <div class="advanced-section">
                    <div class="section-title">
                        <span>Content Protection</span>
                    </div>
                    <div class="advanced-description">
                        Content protection makes the application window invisible to screen sharing and recording software.
                        This is useful for privacy when sharing your screen, but may interfere with certain display setups like DisplayLink.
                    </div>

                    <div class="form-grid">
                        <div class="checkbox-group">
                            <input
                                type="checkbox"
                                class="checkbox-input"
                                id="content-protection"
                                .checked=${this.contentProtection}
                                @change=${this.handleContentProtectionChange}
                            />
                            <label for="content-protection" class="checkbox-label">
                                Enable content protection (stealth mode)
                            </label>
                        </div>
                        <div class="form-description" style="margin-left: 22px;">
                            ${this.contentProtection
                                ? 'The application is currently invisible to screen sharing and recording software.'
                                : 'The application is currently visible to screen sharing and recording software.'}
                        </div>
                    </div>
                </div>

                <!-- Model Generation Settings Section -->
                <div class="advanced-section">
                    <div class="section-title">
                        <span>Model Generation Settings</span>
                    </div>
                    <div class="advanced-description">
                        Adjust how Gemini models generate responses. These settings affect creativity, randomness, and response length.
                    </div>

                    <div class="settings-grid">
                        <!-- Temperature Slider -->
                        <div class="slider-container">
                            <div class="slider-header">
                                <span class="slider-label">Temperature</span>
                                <span class="slider-value">${this.temperature.toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                class="slider-input"
                                min="0"
                                max="2"
                                step="0.05"
                                .value=${this.temperature}
                                @input=${this.handleTemperatureChange}
                            />
                            <div class="slider-labels">
                                <span>Precise (0)</span>
                                <span>Balanced (1)</span>
                                <span>Creative (2)</span>
                            </div>
                            <div class="slider-description">
                                Controls randomness. Lower values make responses more focused and deterministic, higher values make them more creative.
                            </div>
                        </div>

                        <!-- Top P Slider -->
                        <div class="slider-container">
                            <div class="slider-header">
                                <span class="slider-label">Top P</span>
                                <span class="slider-value">${this.topP.toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                class="slider-input"
                                min="0"
                                max="1"
                                step="0.05"
                                .value=${this.topP}
                                @input=${this.handleTopPChange}
                            />
                            <div class="slider-labels">
                                <span>Focused (0)</span>
                                <span>Diverse (1)</span>
                            </div>
                            <div class="slider-description">
                                Controls diversity via nucleus sampling. Lower values consider fewer token choices, higher values allow more variety.
                            </div>
                        </div>

                        <!-- Max Output Tokens Input -->
                        <div class="number-input-container">
                            <div class="number-input-header">
                                <span class="number-input-label">Output Length (Max Tokens)</span>
                                <span class="model-badge ${this.isExamModeModel() ? 'orange' : ''}">${this.getModelDisplayName()}</span>
                            </div>
                            <input
                                type="number"
                                class="number-input"
                                min="256"
                                max="${this.getMaxAllowedTokens()}"
                                step="256"
                                .value=${this.maxOutputTokens}
                                @input=${this.handleMaxOutputTokensChange}
                                placeholder="Enter max tokens (256 - ${this.getMaxAllowedTokens()})"
                            />
                            <div class="slider-description">
                                Maximum tokens in response. Current model limit: ${this.getMaxAllowedTokens()} tokens.
                                Value will auto-adjust when you switch models.
                            </div>
                        </div>
                    </div>

                    <div class="reset-button">
                        <button class="action-button" @click=${this.resetModelSettings}>
                            Reset to Defaults
                        </button>
                        <div class="form-description" style="margin-top: 8px;">
                            <span class="defaults-label">Default:</span> <span class="defaults-values">Temperature 0.7, Top P 0.95, Output Length ${this.getDefaultMaxTokens()}</span>
                        </div>
                    </div>
                </div>

                <!-- Data Management Section -->
                <div class="advanced-section danger-section">
                    <div class="section-title danger">
                        <span>Data Management</span>
                    </div>
                    <div class="danger-box">
                        <span class="danger-icon">⚠️</span>
                        <span><strong>Important:</strong> This action will permanently delete all local data and cannot be undone.</span>
                    </div>

                    <div>
                        <button class="action-button danger-button" @click=${this.clearLocalData} ?disabled=${this.isClearing}>
                            ${this.isClearing ? '🔄 Clearing...' : '🗑️ Clear All Local Data'}
                        </button>

                        ${this.statusMessage
                            ? html`
                                  <div class="status-message ${this.statusType === 'success' ? 'status-success' : 'status-error'}">
                                      ${this.statusMessage}
                                  </div>
                              `
                            : ''}
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('advanced-view', AdvancedView);
