import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

export class ModelSettingsView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .model-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--space-sm) var(--space-md);
                border: 1px solid var(--border);
                border-radius: var(--radius-md);
                background: var(--bg-elevated);
                gap: var(--space-md);
            }

            .model-card-label {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .model-card-title {
                font-size: var(--font-size-sm);
                font-weight: var(--font-weight-medium);
                color: var(--text-primary);
            }

            .model-card-desc {
                font-size: var(--font-size-xs);
                color: var(--text-muted);
            }

            .model-select {
                min-width: 180px;
            }

            .debug-toggle {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--space-sm) var(--space-md);
                border: 1px solid var(--border);
                border-radius: var(--radius-md);
                background: var(--bg-elevated);
            }

            .debug-toggle.active {
                border-color: rgba(244, 67, 54, 0.4);
                background: rgba(244, 67, 54, 0.06);
            }

            .toggle-switch {
                position: relative;
                width: 38px;
                height: 20px;
                border-radius: 10px;
                background: var(--border);
                cursor: pointer;
                transition: background 0.2s ease;
                flex-shrink: 0;
            }

            .toggle-switch.on {
                background: var(--accent, #fff);
            }

            .toggle-switch::after {
                content: '';
                position: absolute;
                top: 2px;
                left: 2px;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: var(--bg-app);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .toggle-switch.on::after {
                transform: translateX(18px);
            }

            .active-indicator {
                display: inline-block;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: var(--success-color, #4caf50);
                margin-right: 6px;
            }

            .hotkey-hint {
                font-size: var(--font-size-xs);
                color: var(--text-muted);
                font-family: var(--font-mono);
                background: var(--bg-elevated);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                padding: 1px 6px;
            }
        `,
    ];

    static properties = {
        _models: { state: true },
        _modelExtraction: { state: true },
        _modelSolution: { state: true },
        _modelDebugging: { state: true },
        _debugMode: { state: true },
    };

    constructor() {
        super();
        this._models = [];
        this._modelExtraction = 'gemini-2.5-flash';
        this._modelSolution = 'gemini-2.5-flash';
        this._modelDebugging = 'gemini-2.5-flash';
        this._debugMode = false;
        this._loadModels();
    }

    async _loadModels() {
        try {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                const result = await ipcRenderer.invoke('get-gemini-models');
                if (result.success) {
                    this._models = result.data;
                }
            }

            const prefs = await cheatingDaddy.storage.getPreferences();
            this._modelExtraction = prefs.modelExtraction || 'gemini-2.5-flash';
            this._modelSolution = prefs.modelSolution || 'gemini-2.5-flash';
            this._modelDebugging = prefs.modelDebugging || 'gemini-2.5-flash';
            this._debugMode = prefs.debugModeEnabled || false;
            this.requestUpdate();
        } catch (err) {
            console.error('Error loading models:', err);
        }
    }

    async _handleModelChange(task, e) {
        const model = e.target.value;
        if (task === 'extraction') {
            this._modelExtraction = model;
            await cheatingDaddy.storage.updatePreference('modelExtraction', model);
        } else if (task === 'solution') {
            this._modelSolution = model;
            await cheatingDaddy.storage.updatePreference('modelSolution', model);
        } else if (task === 'debugging') {
            this._modelDebugging = model;
            await cheatingDaddy.storage.updatePreference('modelDebugging', model);
        }
    }

    async _toggleDebugMode() {
        this._debugMode = !this._debugMode;
        await cheatingDaddy.storage.updatePreference('debugModeEnabled', this._debugMode);
    }

    _renderModelSelect(task, currentValue) {
        return html`
            <select class="control model-select" @change=${e => this._handleModelChange(task, e)}>
                ${this._models.map(m => html` <option value=${m.id} ?selected=${m.id === currentValue}>${m.name}</option> `)}
            </select>
        `;
    }

    render() {
        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div>
                        <h1 class="page-title">Model Management</h1>
                        <p class="page-subtitle">Assign different Gemini models to each pipeline task</p>
                    </div>

                    <div class="surface">
                        <h2 class="surface-title">Pipeline Models</h2>
                        <p class="surface-subtitle">Each task in the processing pipeline can use a different model</p>
                        <div class="form-grid">
                            <div class="model-card">
                                <div class="model-card-label">
                                    <span class="model-card-title">
                                        <span class="active-indicator"></span>
                                        Problem Extraction
                                    </span>
                                    <span class="model-card-desc"
                                        >Transcription analysis and problem identification <span class="hotkey-hint">Ctrl+'</span></span
                                    >
                                </div>
                                ${this._renderModelSelect('extraction', this._modelExtraction)}
                            </div>

                            <div class="model-card">
                                <div class="model-card-label">
                                    <span class="model-card-title">
                                        <span class="active-indicator"></span>
                                        Solution Generation
                                    </span>
                                    <span class="model-card-desc">Screen analysis and answer generation <span class="hotkey-hint">Ctrl+Y</span></span>
                                </div>
                                ${this._renderModelSelect('solution', this._modelSolution)}
                            </div>

                            <div class="model-card">
                                <div class="model-card-label">
                                    <span class="model-card-title">
                                        <span class="active-indicator"></span>
                                        Debugging
                                    </span>
                                    <span class="model-card-desc">Code debugging and error analysis <span class="hotkey-hint">Alt+D</span></span>
                                </div>
                                ${this._renderModelSelect('debugging', this._modelDebugging)}
                            </div>
                        </div>
                    </div>

                    <div class="surface">
                        <h2 class="surface-title">Debug Mode</h2>
                        <p class="surface-subtitle">When enabled, uses the Debugging model for all screen captures</p>
                        <div class="debug-toggle ${this._debugMode ? 'active' : ''}">
                            <div class="model-card-label">
                                <span class="model-card-title">${this._debugMode ? 'Debug Mode Active' : 'Debug Mode Off'}</span>
                                <span class="model-card-desc">Toggle with <span class="hotkey-hint">Alt+D</span></span>
                            </div>
                            <div class="toggle-switch ${this._debugMode ? 'on' : ''}" @click=${() => this._toggleDebugMode()}></div>
                        </div>
                    </div>

                    <div class="surface">
                        <h2 class="surface-title">Active Configuration</h2>
                        <p class="surface-subtitle">Currently active model assignments shown in the session header</p>
                        <div class="form-grid">
                            <div class="form-group">
                                <span class="form-label">Extraction (E)</span>
                                <span class="chip">${this._getShortName(this._modelExtraction)}</span>
                            </div>
                            <div class="form-group">
                                <span class="form-label">Solution (S)</span>
                                <span class="chip">${this._getShortName(this._modelSolution)}</span>
                            </div>
                            <div class="form-group">
                                <span class="form-label">Debugging (D)</span>
                                <span class="chip">${this._getShortName(this._modelDebugging)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _getShortName(modelId) {
        const model = this._models.find(m => m.id === modelId);
        return model ? model.shortName : modelId;
    }
}

customElements.define('model-settings-view', ModelSettingsView);
