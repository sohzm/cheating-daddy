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

        this.loadRateLimitSettings();
        this.loadContentProtectionSetting();
    }

    connectedCallback() {
        super.connectedCallback();
        // Resize window for this view
        resizeLayout();
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
                        <span>🔒 Content Protection</span>
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

                <!-- Rate Limiting Section -->
                <div class="advanced-section">
                    <div class="section-title">
                        <span>⏱️ Rate Limiting</span>
                    </div>

                    <div class="rate-limit-warning">
                        <span class="rate-limit-warning-icon">⚠️</span>
                        <span
                            ><strong>Warning:</strong> Don't mess with these settings if you don't know what this is about. Incorrect rate limiting
                            settings may cause the application to stop working properly or hit API limits unexpectedly.</span
                        >
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
                            <label for="throttle-tokens" class="checkbox-label"> Throttle tokens when close to rate limit </label>
                        </div>

                        <div class="rate-limit-controls ${this.throttleTokens ? 'enabled' : ''}">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Max Allowed Tokens Per Minute</label>
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
                                    <div class="form-description">Maximum number of tokens allowed per minute before throttling kicks in</div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Throttle At Percent</label>
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
                                        Start throttling when this percentage of the limit is reached (${this.throttleAtPercent}% =
                                        ${Math.floor((this.maxTokensPerMin * this.throttleAtPercent) / 100)} tokens)
                                    </div>
                                </div>
                            </div>

                            <div class="rate-limit-reset">
                                <button class="action-button" @click=${this.resetRateLimitSettings} ?disabled=${!this.throttleTokens}>
                                    Reset to Defaults
                                </button>
                                <div class="form-description" style="margin-top: 8px;">Reset rate limiting settings to default values</div>
                            </div>
                        </div>
                    </div>
                </div>



                <!-- Data Management Section -->
                <div class="advanced-section danger-section">
                    <div class="section-title danger">
                        <span>🗑️ Data Management</span>
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
