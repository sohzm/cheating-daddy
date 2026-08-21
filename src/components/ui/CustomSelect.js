import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class CustomSelect extends LitElement {
    static styles = css`
        :host {
            display: inline-block;
            position: relative;
            width: 100%;
            font-family: var(--font, sans-serif);
            user-select: none;
        }

        .select-btn {
            background: var(--bg-elevated, #191919);
            color: var(--text-primary, #f5f5f5);
            border: 1px solid var(--border, #222);
            border-radius: var(--radius-sm, 4px);
            padding: 8px 12px;
            font-size: var(--font-size-sm, 13px);
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            transition:
                border-color 0.15s,
                box-shadow 0.15s;
            height: 35px; /* Match standard inputs */
            box-sizing: border-box;
        }

        .select-btn:hover {
            border-color: var(--text-muted, #555);
        }

        .select-btn:focus {
            outline: none;
            border-color: var(--accent, #3b82f6);
            box-shadow: 0 0 0 1px var(--accent, #3b82f6);
        }

        .dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            margin-top: 4px;
            background: var(--bg-elevated, #191919);
            border: 1px solid var(--border-strong, #333);
            border-radius: var(--radius-sm, 4px);
            max-height: 250px;
            overflow-y: auto;
            z-index: 10000;
            display: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .dropdown.open {
            display: block;
        }

        .option {
            padding: 8px 12px;
            font-size: var(--font-size-sm, 13px);
            color: var(--text-secondary, #999);
            cursor: pointer;
            transition:
                background 0.1s,
                color 0.1s;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .option:hover {
            background: var(--bg-hover, #1f1f1f);
            color: var(--text-primary, #f5f5f5);
        }

        .option.selected {
            background: var(--bg-surface, #111);
            color: var(--accent, #3b82f6);
            font-weight: 500;
        }

        /* Scrollbar inside the custom dropdown */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: var(--border-strong, #333);
            border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #444;
        }

        svg {
            width: 14px;
            height: 14px;
            stroke: var(--text-muted, #555);
            fill: none;
            stroke-width: 1.5;
            stroke-linecap: round;
            stroke-linejoin: round;
            flex-shrink: 0;
        }
    `;

    static properties = {
        options: { type: Array },
        value: { type: String },
        open: { type: Boolean, state: true },
    };

    constructor() {
        super();
        this.options = [];
        this.value = '';
        this.open = false;
        this._handleOutsideClick = this._handleOutsideClick.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        // Add listener to the 'document' so clicking anywhere else closes the dropdown
        document.addEventListener('click', this._handleOutsideClick);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('click', this._handleOutsideClick);
    }

    _handleOutsideClick(e) {
        if (!e.composedPath().includes(this)) {
            this.open = false;
        }
    }

    _toggle() {
        this.open = !this.open;
        if (this.open) {
            // Scroll selected item into view
            setTimeout(() => {
                const selectedEl = this.shadowRoot.querySelector('.option.selected');
                if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
            }, 0);
        }
    }

    _select(val, e) {
        if (e) {
            e.stopPropagation();
        }
        this.value = val;
        this.open = false;
        this.dispatchEvent(
            new CustomEvent('change', {
                detail: { value: val },
                bubbles: true,
                composed: true,
            })
        );
    }

    render() {
        const selectedOption = this.options.find(o => o.value === this.value) || this.options[0] || {};
        const displayLabel = selectedOption.label || selectedOption.name || selectedOption.value || 'Select...';

        return html`
            <div
                class="select-btn"
                tabindex="0"
                @click=${this._toggle}
                @keydown=${e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this._toggle();
                    }
                }}
            >
                <span style="text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${displayLabel}</span>
                <svg viewBox="0 0 20 20"><path d="M6 8l4 4 4-4" /></svg>
            </div>
            <div class="dropdown ${this.open ? 'open' : ''}">
                ${this.options.map(
                    o => html`
                        <div
                            class="option ${o.value === this.value ? 'selected' : ''}"
                            @click=${e => this._select(o.value, e)}
                            title=${o.label || o.name || o.value}
                        >
                            ${o.label || o.name || o.value}
                        </div>
                    `
                )}
            </div>
        `;
    }
}

customElements.define('custom-select', CustomSelect);
