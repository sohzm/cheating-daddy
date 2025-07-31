import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';
import language from '../../lang/language_module.mjs'; 

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
            cursor: pointer;
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
            cursor: pointer;
        }

        .checkbox-label {
            font-weight: 500;
            font-size: 12px;
            color: var(--label-color, rgba(255, 255, 255, 0.9));
            cursor: pointer;
            user-select: none;
        }

        .rate-limit-controls {
            margin-left: 22px;
            opacity: 0.7;
            transition: opacity 0.15s ease;
        }

        .rate-limit-controls.enabled {
            opacity: 1;
        }

        .rate-limit-reset {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid var(--table-border, rgba(255, 255, 255, 0.08));
        }

        .rate-limit-warning {
            background: var(--warning-background, rgba(251, 191, 36, 0.08));
            border: 1px solid var(--warning-border, rgba(251, 191, 36, 0.2));
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 12px;
            font-size: 11px;
            color: var(--warning-color, #fbbf24);
            display: flex;
            align-items: flex-start;
            gap: 8px;
            line-height: 1.4;
        }

        .rate-limit-warning-icon {
            flex-shrink: 0;
            font-size: 12px;
            margin-top: 1px;
        }
    `;

    static properties = {
        isClearing: { type: Boolean },
        statusMessage: { type: String },
        statusType: { type: String },
        throttleTokens: { type: Boolean },
        maxTokensPerMin: { type: Number },
        throttleAtPercent: { type: Number },
        contentProtection: { type: Boolean },
        Advanced_Content_Protection: { type: String },
        Advanced_Content_Protection_msg1: { type: String },
        Advanced_Content_Protection_msg2: { type: String },
        Advanced_stealth_mode: { type: String },
        Advanced_invisible: { type: String },
        Advanced_visible: { type: String },
        Advanced_Rate_Limiting: { type: String },
        Advanced_Warning: { type: String },
        Advanced_Warning_msg: { type: String },
        Advanced_Throttle_tokens: { type: String },
        Advanced_Max_Allowed: { type: String },
        Advanced_Maximum_number: { type: String },
        Advanced_Throttle_At_Percent: { type: String },
        Advanced_Start_throttling: { type: String },
        Advanced_Reset_rate: { type: String },
        Advanced_Data_Management: { type: String },
        Advanced_action_will_permanently: { type: String },
        Advanced_Clear_All: { type: String },
        Advanced_Clearing: { type: String },
        Advanced_Important: { type: String },
        Advanced_Reset_to_Defaults: { type: String },
    };

    constructor() {
        super();
        this.isClearing = false;
        this.statusMessage = '';
        this.statusType = '';

        // Rate limiting defaults
        this.throttleTokens = true;
        this.maxTokensPerMin = 1000000;
        this.throttleAtPercent = 75;

        // Content protection default
        this.contentProtection = true;

        this.translate("Advanced_Content_Protection").then((lang) => {
            this.Advanced_Content_Protection = lang;
        });
        this.translate("Advanced_Content_Protection_msg1").then((lang) => {
            this.Advanced_Content_Protection_msg1 = lang;
        });
        this.translate("Advanced_Content_Protection_msg2").then((lang) => {
            this.Advanced_Content_Protection_msg2 = lang;
        });
        this.translate("Advanced_stealth_mode").then((lang) => {
            this.Advanced_stealth_mode = lang;
        });
        this.translate("Advanced_invisible").then((lang) => {
            this.Advanced_invisible = lang;
        });
        this.translate("Advanced_visible").then((lang) => {
            this.Advanced_visible = lang;
        });
        this.translate("Advanced_Rate_Limiting").then((lang) => {
            this.Advanced_Rate_Limiting = lang;
        });
        this.translate("Advanced_Warning").then((lang) => {
            this.Advanced_Warning = lang;
        });
        this.translate("Advanced_Warning_msg").then((lang) => {
            this.Advanced_Warning_msg = lang;
        });
        this.translate("Advanced_Throttle_tokens").then((lang) => {
            this.Advanced_Throttle_tokens = lang;
        });
        this.translate("Advanced_Max_Allowed").then((lang) => {
            this.Advanced_Max_Allowed = lang;
        });
        this.translate("Advanced_Maximum_number").then((lang) => {
            this.Advanced_Maximum_number = lang;
        });
        this.translate("Advanced_Throttle_At_Percent").then((lang) => {
            this.Advanced_Throttle_At_Percent = lang;
        });
        this.translate("Advanced_Start_throttling").then((lang) => {
            this.Advanced_Start_throttling = lang;
        });
        this.translate("Advanced_Reset_rate").then((lang) => {
            this.Advanced_Reset_rate = lang;
        });
        this.translate("Advanced_Data_Management").then((lang) => {
            this.Advanced_Data_Management = lang;
        });
        this.translate("Advanced_action_will_permanently").then((lang) => {
            this.Advanced_action_will_permanently = lang;
        });
        this.translate("Advanced_Clear_All").then((lang) => {
            this.Advanced_Clear_All = lang;
        });
        this.translate("Advanced_Clearing").then((lang) => {
            this.Advanced_Clearing = lang;
        });
        this.translate("Advanced_Important").then((lang) => {
            this.Advanced_Important = lang;
        });
        this.translate("Advanced_Reset_to_Defaults").then((lang) => {
            this.Advanced_Reset_to_Defaults = lang;
        });
        
        this.loadRateLimitSettings();
        this.loadContentProtectionSetting();
    }

    connectedCallback() {
        super.connectedCallback();
        // Resize window for this view
        resizeLayout();
    }

    /**
    * Translates a specified key into a localized message, using the current system language.
    * @async
    * @function translate
    * @param {string} key - Message key to translate.
    * Expected values:
    * 'Main_api', 'Main_GetApi', 'Main_Welcome',
    * 'Main_APIKey', 'Main_Start'.
    * If the key does not match, 'unknowledge' will be used as the default key.
    * @returns {Promise<string>} - Returns a Promise that resolves to the translated text
    * corresponding to the provided key.
    * If the text is not found, 'Unknowledge' is returned.
    * @example
    * const message = await translate("Main_Welcome");
    * console. log(message); // "Welcome to the app" (depends on the current language)
    */
    async translate(key) {
    //await new Promise(resolve => setTimeout(resolve, 500));
    let temp = ''; // Usa 'let' si vas a reasignar
    switch (key) {
            case 'Advanced_Content_Protection':
                temp = await language.getMessages("Advanced_Content_Protection", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Content_Protection_msg1':
                temp = await language.getMessages("Advanced_Content_Protection_msg1", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Content_Protection_msg2':
                temp = await language.getMessages("Advanced_Content_Protection_msg2", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_stealth_mode':
                temp = await language.getMessages("Advanced_stealth_mode", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_invisible':
                temp = await language.getMessages("Advanced_invisible", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_visible':
                temp = await language.getMessages("Advanced_visible", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Rate_Limiting':
                temp = await language.getMessages("Advanced_Rate_Limiting", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Warning':
                temp = await language.getMessages("Advanced_Warning", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Warning_msg':
                temp = await language.getMessages("Advanced_Warning_msg", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Throttle_tokens':
                temp = await language.getMessages("Advanced_Throttle_tokens", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Max_Allowed':
                temp = await language.getMessages("Advanced_Max_Allowed", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Maximum_number':
                temp = await language.getMessages("Advanced_Maximum_number", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Throttle_At_Percent':
                temp = await language.getMessages("Advanced_Throttle_At_Percent", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Start_throttling':
                temp = await language.getMessages("Advanced_Start_throttling", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Reset_rate':
                temp = await language.getMessages("Advanced_Reset_rate", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Data_Management':
                temp = await language.getMessages("Advanced_Data_Management", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_action_will_permanently':
                temp = await language.getMessages("Advanced_action_will_permanently", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Clear_All':
                temp = await language.getMessages("Advanced_Clear_All", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Clearing': // Incluida la llave que apareció en tu lista más reciente
                temp = await language.getMessages("Advanced_Clearing", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Important': // Incluida la llave que apareció en tu lista más reciente
                temp = await language.getMessages("Advanced_Important", language.getLanguage() || 'en-US');
                break;
            case 'Advanced_Reset_to_Defaults': // Incluida la llave que apareció en tu lista más reciente
                temp = await language.getMessages("Advanced_Reset_to_Defaults", language.getLanguage() || 'en-US');
                break;
            default:
                return await language.getMessages("unknowledge", 'en-US');
        }//end switch
        return temp || 'Unknowledge';
    }//end translate


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

    // Rate limiting methods
    loadRateLimitSettings() {
        const throttleTokens = localStorage.getItem('throttleTokens');
        const maxTokensPerMin = localStorage.getItem('maxTokensPerMin');
        const throttleAtPercent = localStorage.getItem('throttleAtPercent');

        if (throttleTokens !== null) {
            this.throttleTokens = throttleTokens === 'true';
        }
        if (maxTokensPerMin !== null) {
            this.maxTokensPerMin = parseInt(maxTokensPerMin, 10) || 1000000;
        }
        if (throttleAtPercent !== null) {
            this.throttleAtPercent = parseInt(throttleAtPercent, 10) || 75;
        }
    }

    handleThrottleTokensChange(e) {
        this.throttleTokens = e.target.checked;
        localStorage.setItem('throttleTokens', this.throttleTokens.toString());
        this.requestUpdate();
    }

    handleMaxTokensChange(e) {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value > 0) {
            this.maxTokensPerMin = value;
            localStorage.setItem('maxTokensPerMin', this.maxTokensPerMin.toString());
        }
    }

    handleThrottlePercentChange(e) {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 0 && value <= 100) {
            this.throttleAtPercent = value;
            localStorage.setItem('throttleAtPercent', this.throttleAtPercent.toString());
        }
    }

    resetRateLimitSettings() {
        this.throttleTokens = true;
        this.maxTokensPerMin = 1000000;
        this.throttleAtPercent = 75;

        localStorage.removeItem('throttleTokens');
        localStorage.removeItem('maxTokensPerMin');
        localStorage.removeItem('throttleAtPercent');

        this.requestUpdate();
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
    
    render() {
        return html`
            <div class="advanced-container">
                <!-- Content Protection Section -->
                <div class="advanced-section">
                    <div class="section-title">
                        <span>${this.Advanced_Content_Protection}</span>
                    </div>
                    <div class="advanced-description">
                        ${this.Advanced_Content_Protection_msg1}
                        ${this.Advanced_Content_Protection_msg2}
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
                                ${this.Advanced_stealth_mode}
                            </label>
                        </div>
                        <div class="form-description" style="margin-left: 22px;">
                            ${this.contentProtection 
                                ? `${this.Advanced_invisible}` 
                                : `${this.Advanced_visible}`}
                        </div>
                    </div>
                </div>

                <!-- Rate Limiting Section -->
                <div class="advanced-section">
                    <div class="section-title">
                        <span>${this.Advanced_Rate_Limiting}</span>
                    </div>

                    <div class="rate-limit-warning">
                        <span class="rate-limit-warning-icon">⚠️</span>
                        <span>
                            <strong>${this.Advanced_Warning}</strong>${this.Advanced_Warning_msg}</span>
                    </div>

                    <div class="form-grid">
                        <div class="checkbox-group">
                            <input
                                type="checkbox"
                                class="checkbox-input"
                                id="throttle-tokens"
                                .checked=${this.throttleTokens}
                                @change=${this.handleThrottleTokensChange}
                            />
                            <label for="throttle-tokens" class="checkbox-label"> ${this.Advanced_Throttle_tokens} </label>
                        </div>

                        <div class="rate-limit-controls ${this.throttleTokens ? 'enabled' : ''}">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">${this.Advanced_Max_Allowed}</label>
                                    <input
                                        type="number"
                                        class="form-control"
                                        .value=${this.maxTokensPerMin}
                                        min="1000"
                                        max="10000000"
                                        step="1000"
                                        @input=${this.handleMaxTokensChange}
                                        ?disabled=${!this.throttleTokens}
                                    />
                                    <div class="form-description">${this.Advanced_Maximum_number}</div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">${this.Advanced_Throttle_At_Percent}</label>
                                    <input
                                        type="number"
                                        class="form-control"
                                        .value=${this.throttleAtPercent}
                                        min="1"
                                        max="99"
                                        step="1"
                                        @input=${this.handleThrottlePercentChange}
                                        ?disabled=${!this.throttleTokens}
                                    />
                                    <div class="form-description">
                                        ${this.Advanced_Start_throttling} (${this.throttleAtPercent}% =
                                        ${Math.floor((this.maxTokensPerMin * this.throttleAtPercent) / 100)} tokens)
                                    </div>
                                </div>
                            </div>
                            <div class="rate-limit-reset">
                                <button class="action-button" @click=${this.resetRateLimitSettings} ?disabled=${!this.throttleTokens}>
                                    ${this.Advanced_Reset_to_Defaults}
                                </button>
                                <div class="form-description" style="margin-top: 8px;">${this.Advanced_Reset_rate}</div>
                            </div>
                        </div>
                    </div>
                </div>


                <!-- Data Management Section -->
                <div class="advanced-section danger-section">
                    <div class="section-title danger">
                        <span>${this.Advanced_Data_Management}</span>
                    </div>
                    <div class="danger-box">
                        <span class="danger-icon">⚠️</span>
                        <span><strong>${this.Advanced_Important}</strong>${this.Advanced_action_will_permanently}</span>
                    </div>

                    <div>
                        <button class="action-button danger-button" @click=${this.clearLocalData} ?disabled=${this.isClearing}>
                            ${this.isClearing ? `${this.Advanced_Clearing}` : `${this.Advanced_Clear_All}`}
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
