import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

// ── Hotkey categories with labels, descriptions, and which window-state property they toggle ──
const HOTKEY_GROUPS = [
    {
        id: 'window',
        label: 'Window Controls',
        icon: '⬛',
        actions: [
            { id: 'scaleUp', label: 'Scale Up', desc: 'Increase window size from centre', toggle: 'scaleEnabled' },
            { id: 'scaleDown', label: 'Scale Down', desc: 'Decrease window size from centre', toggle: 'scaleEnabled' },
            { id: 'zoomIn', label: 'Zoom In', desc: 'Zoom UI content in', toggle: 'zoomEnabled' },
            { id: 'zoomOut', label: 'Zoom Out', desc: 'Zoom UI content out', toggle: 'zoomEnabled' },
            { id: 'zoomReset', label: 'Zoom Reset', desc: 'Reset content zoom to 100%', toggle: 'zoomEnabled' },
        ],
    },
    {
        id: 'visibility',
        label: 'Visibility & Opacity',
        icon: '👁',
        actions: [
            { id: 'toggleVisibility', label: 'Toggle Visibility', desc: 'Show / hide app window', toggle: null },
            { id: 'toggleClickThrough', label: 'Toggle Click-through', desc: 'Enable / disable click-through', toggle: null },
            { id: 'opacityUp', label: 'Opacity +', desc: 'Increase window transparency', toggle: 'opacityEnabled' },
            { id: 'opacityDown', label: 'Opacity −', desc: 'Decrease window transparency', toggle: 'opacityEnabled' },
        ],
    },
    {
        id: 'movement',
        label: 'Window Movement',
        icon: '↕',
        actions: [
            { id: 'moveUp', label: 'Move Up', desc: 'Move window up', toggle: 'moveEnabled' },
            { id: 'moveDown', label: 'Move Down', desc: 'Move window down', toggle: 'moveEnabled' },
            { id: 'moveLeft', label: 'Move Left', desc: 'Move window left', toggle: 'moveEnabled' },
            { id: 'moveRight', label: 'Move Right', desc: 'Move window right', toggle: 'moveEnabled' },
        ],
    },
    {
        id: 'session',
        label: 'Session Controls',
        icon: '▶',
        actions: [
            {
                id: 'nextStep',
                label: 'Analyse / Start Session',
                desc: 'Take screenshot & analyse, or start session (Ctrl+Enter)',
                toggle: 'sessionEnabled',
            },
            { id: 'previousResponse', label: 'Previous Response', desc: 'Navigate to previous answer (Ctrl+Shift+Left)', toggle: 'sessionEnabled' },
            { id: 'nextResponse', label: 'Next Response', desc: 'Navigate to next answer (Ctrl+Shift+Right)', toggle: 'sessionEnabled' },
            { id: 'scrollUp', label: 'Scroll Response Up', desc: 'Scroll response content up (Ctrl+[)', toggle: 'sessionEnabled' },
            { id: 'scrollDown', label: 'Scroll Response Down', desc: 'Scroll response content down (Ctrl+])', toggle: 'sessionEnabled' },
        ],
    },
    {
        id: 'audio',
        label: 'Audio Controls',
        icon: '🎙',
        actions: [{ id: 'toggleVoice', label: 'Toggle Voice Listening', desc: 'Enable / disable microphone pipeline', toggle: 'voiceToggleEnabled' }],
    },
    {
        id: 'dev',
        label: 'Developer Controls',
        icon: '⚙',
        actions: [
            { id: 'reloadApp', label: 'Reload App', desc: 'Reload the renderer (Ctrl+Shift+R)', toggle: 'reloadEnabled' },
            { id: 'devRefresh', label: 'Full Restart', desc: 'Relaunch the entire app', toggle: 'reloadEnabled' },
        ],
    },
    {
        id: 'global',
        label: 'Global Controls',
        icon: '\uD83C\uDF10',
        actions: [
            { id: 'themeToggle', label: 'Toggle Theme', desc: 'Cycle through available themes', toggle: null },
            { id: 'fontSizeUp', label: 'Font Size +', desc: 'Increase app font size', toggle: null },
            { id: 'fontSizeDown', label: 'Font Size -', desc: 'Decrease app font size', toggle: null },
            { id: 'aiModeToggle', label: 'Toggle AI Mode', desc: 'Switch between Local/Online AI', toggle: null },
            { id: 'debugToggle', label: 'Debug Mode', desc: 'Toggle debugging-focused workflow', toggle: null },
            { id: 'cycleSolutionModel', label: 'Cycle Solution Model', desc: 'Cycle Solution Generation model', toggle: null },
            { id: 'cycleExtractionModel', label: 'Cycle Extraction Model', desc: 'Cycle Problem Extraction model', toggle: null },
            { id: 'emergencyQuit', label: 'Quit App', desc: 'Quit the application immediately', toggle: null },
        ],
    },
];

export class HotkeysView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .group {
                margin-bottom: var(--space-md);
            }
            .group-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: var(--space-sm);
            }
            .group-icon {
                font-size: 14px;
            }
            .group-title {
                font-size: var(--font-size-sm);
                font-weight: var(--font-weight-semibold);
                color: var(--text-primary);
            }

            /* Action row */
            .action-row {
                display: grid;
                grid-template-columns: 1fr 180px 42px;
                align-items: center;
                gap: var(--space-sm);
                padding: 7px 12px;
                border-bottom: 1px solid var(--border);
                background: var(--bg-elevated);
                min-height: 40px;
                font-size: var(--font-size-xs);
            }
            .action-row:first-child {
                border-radius: var(--radius-sm) var(--radius-sm) 0 0;
            }
            .action-row:last-child {
                border-bottom: none;
                border-radius: 0 0 var(--radius-sm) var(--radius-sm);
            }
            .action-row:only-child {
                border-radius: var(--radius-sm);
            }
            .action-row:hover {
                background: var(--bg-hover);
            }
            .action-table {
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                overflow: hidden;
            }

            .action-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
            }
            .action-label {
                font-weight: var(--font-weight-medium);
                color: var(--text-primary);
            }
            .action-desc {
                font-size: 10px;
                color: var(--text-muted);
            }

            /* Keybind input */
            .kb-wrap {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .kb-display {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--bg-app);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                padding: 4px 8px;
                font-family: var(--font-mono);
                font-size: 11px;
                color: var(--text-primary);
                cursor: pointer;
                transition: border-color var(--transition);
                min-width: 90px;
                text-align: center;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .kb-display:hover {
                border-color: var(--accent);
            }
            .kb-display.recording {
                border-color: var(--accent);
                color: var(--accent);
                animation: kbPulse 1s ease-in-out infinite;
            }
            @keyframes kbPulse {
                0%,
                100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.5;
                }
            }
            .kb-display.none {
                color: var(--text-muted);
                font-style: italic;
            }
            .kb-clear {
                background: transparent;
                border: 1px solid var(--border);
                border-radius: 3px;
                color: var(--text-muted);
                padding: 3px 5px;
                font-size: 10px;
                cursor: pointer;
            }
            .kb-clear:hover {
                border-color: var(--danger);
                color: var(--danger);
            }

            /* Toggle */
            .toggle-btn {
                width: 38px;
                height: 20px;
                border-radius: 999px;
                border: none;
                cursor: pointer;
                transition:
                    background 0.25s ease,
                    box-shadow 0.25s ease;
                flex-shrink: 0;
                position: relative;
                outline: none;
            }
            .toggle-btn.on {
                background: var(--accent, #3b82f6);
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
            }
            .toggle-btn.off {
                background: var(--border-strong, #333);
                box-shadow: none;
            }
            .toggle-btn:hover {
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
            }
            .toggle-btn:focus-visible {
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4);
            }
            .toggle-btn::after {
                content: '';
                position: absolute;
                top: 2px;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #fff;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
                transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .toggle-btn.on::after {
                left: 20px;
            }
            .toggle-btn.off::after {
                left: 2px;
            }

            /* Slider settings */
            .settings-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-sm);
                margin-bottom: var(--space-md);
            }
            .setting-row {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .setting-label {
                font-size: var(--font-size-xs);
                color: var(--text-secondary);
            }
            .setting-control {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .setting-slider {
                flex: 1;
                -webkit-appearance: none;
                height: 4px;
                background: var(--border);
                border-radius: 2px;
                outline: none;
                cursor: pointer;
            }
            .setting-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: var(--text-primary);
                border: none;
            }
            .setting-num {
                width: 66px;
                background: var(--bg-elevated);
                color: var(--text-primary);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                padding: 4px 6px;
                font-size: var(--font-size-xs);
                text-align: center;
                font-family: var(--font-mono);
            }
            .setting-num:focus {
                outline: none;
                border-color: var(--accent);
            }

            /* Min/Max bounds below sliders */
            .setting-bounds {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 4px;
                padding-left: 2px;
            }
            .bounds-label {
                font-size: 10px;
                color: var(--text-muted);
            }
            .bounds-input {
                width: 60px !important;
            }

            /* Reset button */
            .reset-btn {
                background: transparent;
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                padding: 5px 12px;
                font-size: var(--font-size-xs);
                cursor: pointer;
                transition: all var(--transition);
            }
            .reset-btn:hover {
                border-color: var(--accent);
                color: var(--accent);
            }
            .conflict-msg {
                color: var(--danger);
                font-size: 10px;
            }
        `,
    ];

    static properties = {
        _state: { state: true }, // window state
        _keybinds: { state: true },
        _defaults: { state: true },
        _recording: { state: true }, // actionId being recorded
        _conflict: { state: true }, // conflicting actionId
        _saved: { state: true },
    };

    constructor() {
        super();
        this._state = null;
        this._keybinds = null;
        this._defaults = null;
        this._recording = null;
        this._conflict = null;
        this._saved = false;
        this._ipcCleanups = [];
        this._load();
    }

    connectedCallback() {
        super.connectedCallback();
        const { ipcRenderer } = window.require('electron');
        const onScale = (_, v) => {
            if (this._state) {
                this._state = { ...this._state, scale: v };
                this.requestUpdate();
            }
        };
        const onZoom = (_, v) => {
            if (this._state) {
                this._state = { ...this._state, zoom: v };
                this.requestUpdate();
            }
        };
        const onOpacity = (_, v) => {
            if (this._state) {
                this._state = { ...this._state, opacity: v };
                this.requestUpdate();
            }
        };
        const onFontSize = (_, v) => {
            this.requestUpdate();
        };
        const onVoice = (_, v) => {
            if (this._state) {
                this._state = { ...this._state, voiceEnabled: v };
                this.requestUpdate();
            }
        };
        ipcRenderer.on('scale-changed', onScale);
        ipcRenderer.on('zoom-changed', onZoom);
        ipcRenderer.on('opacity-changed', onOpacity);
        ipcRenderer.on('font-size-changed', onFontSize);
        ipcRenderer.on('voice-toggled', onVoice);
        this._ipcCleanups = [
            () => ipcRenderer.removeListener('scale-changed', onScale),
            () => ipcRenderer.removeListener('zoom-changed', onZoom),
            () => ipcRenderer.removeListener('opacity-changed', onOpacity),
            () => ipcRenderer.removeListener('font-size-changed', onFontSize),
            () => ipcRenderer.removeListener('voice-toggled', onVoice),
        ];
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._ipcCleanups.forEach(fn => fn());
        this._ipcCleanups = [];
    }

    async _load() {
        try {
            const [state, saved, defaults] = await Promise.all([
                cheatingDaddy.window.getState(),
                cheatingDaddy.storage.getKeybinds(),
                cheatingDaddy.window.getDefaultKeybinds(),
            ]);
            this._state = state || {};
            this._defaults = defaults || {};
            this._keybinds = { ...defaults, ...(saved || {}) };
        } catch (e) {
            console.error('HotkeysView load error:', e);
        }
        this.requestUpdate();
    }

    // ── Record keybind ──
    _startRecording(actionId) {
        this._recording = actionId;
        this._conflict = null;
        this.requestUpdate();
    }

    _handleKeydown(e, actionId) {
        if (this._recording !== actionId) return;
        e.preventDefault();
        e.stopPropagation();

        const parts = [];
        if (e.ctrlKey || e.metaKey) parts.push(e.metaKey ? 'Cmd' : 'Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');

        const key = e.code;
        const keyMap = {
            ArrowUp: 'Up',
            ArrowDown: 'Down',
            ArrowLeft: 'Left',
            ArrowRight: 'Right',
            Enter: 'Enter',
            Space: 'Space',
            Backspace: 'Backspace',
            Escape: 'Escape',
            BracketLeft: '[',
            BracketRight: ']',
            Backslash: '\\',
            Minus: '-',
            Equal: '=',
        };

        let mainKey = keyMap[key];
        if (!mainKey) {
            if (/^Key([A-Z])$/.test(key)) mainKey = key.slice(3);
            else if (/^Digit(\d)$/.test(key)) mainKey = key.slice(5);
            else if (/^F(\d+)$/.test(key)) mainKey = key;
        }

        if (!mainKey || ['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return;

        // Escape = clear binding
        if (e.key === 'Escape') {
            this._recording = null;
            this.requestUpdate();
            return;
        }

        const combo = [...parts, mainKey].join('+');

        // Conflict check
        const conflict = Object.entries(this._keybinds).find(([id, kb]) => kb === combo && id !== actionId);
        if (conflict) {
            this._conflict = conflict[0];
            this.requestUpdate();
            return;
        }

        this._keybinds = { ...this._keybinds, [actionId]: combo };
        this._recording = null;
        this._conflict = null;
        this.requestUpdate();
    }

    _clearKeybind(actionId) {
        this._keybinds = { ...this._keybinds, [actionId]: null };
        this._conflict = null;
        this.requestUpdate();
    }

    async _save() {
        await cheatingDaddy.window.updateKeybinds(this._keybinds);
        this._saved = true;
        this.requestUpdate();
        setTimeout(() => {
            this._saved = false;
            this.requestUpdate();
        }, 2000);
    }

    async _resetAll() {
        const r = await cheatingDaddy.window.resetKeybinds();
        if (r.success) {
            this._keybinds = r.keybinds;
            this.requestUpdate();
        }
    }

    async _toggleFeature(toggleKey) {
        if (!toggleKey || !this._state) return;
        const current = this._state[toggleKey] !== false;
        const next = !current;
        this._state = { ...this._state, [toggleKey]: next };
        await cheatingDaddy.window.setState({ [toggleKey]: next });
        this.requestUpdate();
    }

    async _updateSlider(key, value) {
        this._state = { ...this._state, [key]: value };
        await cheatingDaddy.window.setState({ [key]: value });
        this.requestUpdate();
    }

    _renderSlider(label, stateKey, min, max, step, decimals = 1, minKey = null, maxKey = null) {
        const val = this._state?.[stateKey] ?? 0;
        return html`
            <div class="setting-row">
                <div class="setting-label">${label}</div>
                <div class="setting-control">
                    <input
                        class="setting-slider"
                        type="range"
                        min=${min}
                        max=${max}
                        step=${step}
                        .value=${String(val)}
                        @input=${e => this._updateSlider(stateKey, parseFloat(e.target.value))}
                    />
                    <input
                        class="setting-num"
                        type="number"
                        min=${min}
                        max=${max}
                        step=${step}
                        .value=${val.toFixed(decimals)}
                        @change=${e => this._updateSlider(stateKey, Math.max(min, Math.min(max, parseFloat(e.target.value) || 0)))}
                    />
                </div>
                ${minKey && maxKey
                    ? html`
                          <div class="setting-bounds">
                              <span class="bounds-label">Min:</span>
                              <input
                                  class="setting-num bounds-input"
                                  type="number"
                                  step=${step}
                                  .value=${String(this._state?.[minKey] ?? min)}
                                  @change=${e => this._updateSlider(minKey, parseFloat(e.target.value) || min)}
                              />
                              <span class="bounds-label">Max:</span>
                              <input
                                  class="setting-num bounds-input"
                                  type="number"
                                  step=${step}
                                  .value=${String(this._state?.[maxKey] ?? max)}
                                  @change=${e => this._updateSlider(maxKey, parseFloat(e.target.value) || max)}
                              />
                          </div>
                      `
                    : ''}
            </div>
        `;
    }

    _renderGroup(group) {
        if (!this._keybinds || !this._state) return '';
        return html`
            <section class="surface group">
                <div class="group-header">
                    <span class="group-icon">${group.icon}</span>
                    <span class="group-title">${group.label}</span>
                </div>
                <div class="action-table">
                    ${group.actions.map(action => {
                        const kb = this._keybinds[action.id];
                        const isRecording = this._recording === action.id;
                        const isEnabled = action.toggle ? this._state[action.toggle] !== false : true;

                        return html`
                            <div class="action-row">
                                <div class="action-info">
                                    <div class="action-label">${action.label}</div>
                                    <div class="action-desc">${action.desc}</div>
                                    ${this._conflict && this._recording === action.id
                                        ? html`
                                              <div class="conflict-msg">
                                                  ⚠ Conflicts with "${this._conflict}" — press again to override or Escape to cancel
                                              </div>
                                          `
                                        : ''}
                                </div>
                                <div class="kb-wrap">
                                    <div
                                        class="kb-display ${isRecording ? 'recording' : ''} ${!kb ? 'none' : ''}"
                                        tabindex="0"
                                        @click=${() => this._startRecording(action.id)}
                                        @keydown=${e => this._handleKeydown(e, action.id)}
                                    >
                                        ${isRecording ? 'Press keys…' : kb || 'Click to set'}
                                    </div>
                                    ${kb ? html`<button class="kb-clear" @click=${() => this._clearKeybind(action.id)} title="Clear">✕</button>` : ''}
                                </div>
                                ${action.toggle
                                    ? html`
                                          <button
                                              class="toggle-btn ${isEnabled ? 'on' : 'off'}"
                                              @click=${() => this._toggleFeature(action.toggle)}
                                              title="${isEnabled ? 'Enabled' : 'Disabled'}"
                                          ></button>
                                      `
                                    : html`<div></div>`}
                            </div>
                        `;
                    })}
                </div>
            </section>
        `;
    }

    render() {
        if (!this._state || !this._keybinds) {
            return html`<div class="unified-page">
                <div class="unified-wrap">
                    <div class="page-title">Hotkeys</div>
                    <div style="color:var(--text-muted);font-size:13px;margin-top:16px;">Loading…</div>
                </div>
            </div>`;
        }

        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div>
                        <div class="page-title">Hotkeys & Window Controls</div>
                        <div class="page-subtitle">Click any keybind to remap it. Toggle the switch to enable/disable a group.</div>
                    </div>

                    <!-- Live sliders -->
                    <section class="surface">
                        <div class="surface-title">Window Settings</div>
                        <div class="surface-subtitle">Changes apply immediately. Persisted across restarts.</div>
                        <div class="settings-grid">
                            ${this._renderSlider('Scale', 'scale', 0.3, 1.5, 0.05, 1)}
                            ${this._renderSlider('Content Zoom', 'zoom', 0.5, 2.0, 0.05, 1)}
                            ${this._renderSlider('Opacity', 'opacity', 0.0, 1.0, 0.05, 1)}
                            ${this._renderSlider('Move Step (px)', 'moveStep', 1, 500, 1, 0)}
                            ${this._renderSlider('Scale Step', 'scaleStep', 0.05, 0.5, 0.01)}
                            ${this._renderSlider('Zoom Step', 'zoomStep', 0.05, 0.5, 0.01)}
                            ${this._renderSlider('Opacity Step', 'opacityStep', 0.05, 0.2, 0.01)}
                        </div>
                    </section>

                    <!-- Keybind groups -->
                    ${HOTKEY_GROUPS.map(g => this._renderGroup(g))}

                    <!-- Save / Reset bar -->
                    <div style="display:flex;gap:var(--space-sm);align-items:center;">
                        <button
                            class="control"
                            style="background:var(--accent);color:var(--bg-app);border:none;padding:8px 18px;cursor:pointer;border-radius:var(--radius-sm);font-size:var(--font-size-sm);"
                            @click=${() => this._save()}
                        >
                            ${this._saved ? '✓ Saved' : 'Save Keybinds'}
                        </button>
                        <button class="reset-btn" @click=${() => this._resetAll()}>Reset to Defaults</button>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('hotkeys-view', HotkeysView);
