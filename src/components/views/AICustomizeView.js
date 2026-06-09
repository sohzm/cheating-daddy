import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

export class AICustomizeView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .unified-page {
                height: 100%;
            }
            .unified-wrap {
                height: 100%;
            }
            section.surface {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            .form-grid {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            .form-group.vertical {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            textarea.control {
                flex: 1;
                resize: none;
                overflow-y: auto;
                min-height: 0;
            }
            .preset-row {
                display: flex;
                gap: var(--space-sm);
                align-items: flex-end;
                flex-wrap: wrap;
            }
            .preset-row .grow {
                flex: 1;
                min-width: 160px;
            }
            .preset-row button {
                width: auto;
                white-space: nowrap;
            }
        `,
    ];

    static properties = {
        selectedProfile: { type: String },
        onProfileChange: { type: Function },
        _context: { state: true },
        _presets: { state: true },
        _selectedPresetId: { state: true },
    };

    constructor() {
        super();
        this.selectedProfile = 'interview';
        this.onProfileChange = () => {};
        this._context = '';
        this._presets = [];
        this._selectedPresetId = '';
        this._loadFromStorage();
    }

    _newId() {
        return (crypto.randomUUID && crypto.randomUUID()) || `p${Date.now()}${Math.floor(Math.random() * 1000)}`;
    }

    async _loadFromStorage() {
        try {
            const prefs = await cheatingDaddy.storage.getPreferences();
            let presets = Array.isArray(prefs.promptPresets) ? prefs.promptPresets : [];
            let selectedId = prefs.selectedPromptPresetId || '';
            const customPrompt = prefs.customPrompt || '';

            // Migration: no presets yet → seed one from the existing prompt so nothing is lost.
            if (presets.length === 0) {
                const id = this._newId();
                presets = [{ id, name: customPrompt ? 'Мой промпт' : 'Новый пресет', prompt: customPrompt }];
                selectedId = id;
                await this._persist(presets, selectedId);
            }
            if (!presets.some(p => p.id === selectedId)) {
                selectedId = presets[0].id;
            }

            this._presets = presets;
            this._selectedPresetId = selectedId;
            this._context = this._activePreset()?.prompt || '';
            this.requestUpdate();
        } catch (error) {
            console.error('Error loading AI customize storage:', error);
        }
    }

    _activePreset() {
        return this._presets.find(p => p.id === this._selectedPresetId) || null;
    }

    // Persist presets + selection, and mirror the active preset into customPrompt (what sessions read).
    async _persist(presets = this._presets, selectedId = this._selectedPresetId) {
        await cheatingDaddy.storage.updatePreference('promptPresets', presets);
        await cheatingDaddy.storage.updatePreference('selectedPromptPresetId', selectedId);
        const active = presets.find(p => p.id === selectedId);
        await cheatingDaddy.storage.updatePreference('customPrompt', active ? active.prompt : '');
    }

    _handleProfileChange(e) {
        this.onProfileChange(e.target.value);
    }

    async _selectPreset(e) {
        this._selectedPresetId = e.target.value;
        this._context = this._activePreset()?.prompt || '';
        await this._persist();
        this.requestUpdate();
    }

    async _newPreset() {
        const id = this._newId();
        const n = this._presets.length + 1;
        this._presets = [...this._presets, { id, name: `Новый пресет ${n}`, prompt: '' }];
        this._selectedPresetId = id;
        this._context = '';
        await this._persist();
        this.requestUpdate();
    }

    async _renameActive(value) {
        this._presets = this._presets.map(p => (p.id === this._selectedPresetId ? { ...p, name: value } : p));
        await this._persist();
    }

    async _deleteActive() {
        if (this._presets.length <= 1) {
            // Keep at least one preset — clear it instead of leaving an empty library.
            const id = this._newId();
            this._presets = [{ id, name: 'Новый пресет', prompt: '' }];
            this._selectedPresetId = id;
            this._context = '';
            await this._persist();
            this.requestUpdate();
            return;
        }
        this._presets = this._presets.filter(p => p.id !== this._selectedPresetId);
        this._selectedPresetId = this._presets[0].id;
        this._context = this._activePreset()?.prompt || '';
        await this._persist();
        this.requestUpdate();
    }

    async _saveContext(val) {
        this._context = val;
        this._presets = this._presets.map(p => (p.id === this._selectedPresetId ? { ...p, prompt: val } : p));
        await this._persist();
    }

    render() {
        const profiles = [
            { value: 'interview', label: 'Job Interview' },
            { value: 'sales', label: 'Sales Call' },
            { value: 'meeting', label: 'Business Meeting' },
            { value: 'presentation', label: 'Presentation' },
            { value: 'negotiation', label: 'Negotiation' },
            { value: 'exam', label: 'Exam Assistant' },
        ];
        const active = this._activePreset();

        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div>
                        <div class="page-title">AI Context</div>
                    </div>

                    <section class="surface">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Profile</label>
                                <select class="control" .value=${this.selectedProfile} @change=${this._handleProfileChange}>
                                    ${profiles.map(
                                            profile =>
                                                    html`<option value=${profile.value} ?selected=${profile.value === this.selectedProfile}>
                                                        ${profile.label}
                                                    </option>`
                                    )}
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Prompt preset</label>
                                <div class="preset-row">
                                    <select class="control grow" .value=${this._selectedPresetId} @change=${this._selectPreset}>
                                        ${this._presets.map(
                                                p => html`<option value=${p.id} ?selected=${p.id === this._selectedPresetId}>${p.name}</option>`
                                        )}
                                    </select>
                                    <button class="control" @click=${this._newPreset}>+ New</button>
                                    <button class="danger-button" @click=${this._deleteActive}>Delete</button>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Preset name</label>
                                <input
                                        class="control"
                                        type="text"
                                        .value=${active ? active.name : ''}
                                        @input=${e => this._renameActive(e.target.value)}
                                />
                            </div>

                            <div class="form-group vertical">
                                <label class="form-label">Prompt</label>
                                <textarea
                                        class="control"
                                        placeholder="Опиши роль и поведение ассистента: кто он, как отвечает, на каком языке, что важно. Напр.: «Ты — я на собесе…», «Я провожу собес, оцени ответ кандидата…», «Просто помощник в разговоре…»"
                                        .value=${this._context}
                                        @input=${e => this._saveContext(e.target.value)}
                                ></textarea>
                                <div class="form-help">Active preset is sent as context at session start. Edits save automatically.</div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        `;
    }
}

customElements.define('ai-customize-view', AICustomizeView);
