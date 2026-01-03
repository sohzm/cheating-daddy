import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

/**
 * StealthSelect - A custom dropdown that renders within the app's DOM
 * This prevents the dropdown options from appearing in screen shares
 * since they're part of the content-protected window instead of OS-native popups
 */
export class StealthSelect extends LitElement {
    static styles = css`
        :host {
            display: inline-block;
            position: relative;
            width: 100%;
        }

        * {
            box-sizing: border-box;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .select-trigger {
            width: 100%;
            padding: 8px 32px 8px 12px;
            background: var(--input-background, #2a2a2a);
            border: 1px solid var(--border-color, #3a3a3a);
            border-radius: 6px;
            color: var(--text-color, #e0e0e0);
            font-size: 13px;
            cursor: pointer;
            text-align: left;
            position: relative;
            transition: border-color 0.2s ease, background 0.2s ease;
            user-select: none;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .select-trigger:hover {
            background: var(--input-hover-background, #333);
        }

        .select-trigger:focus {
            outline: none;
            border-color: var(--accent-color, #00e6cc);
        }

        .select-trigger::after {
            content: '';
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 5px solid var(--text-muted, #888);
            pointer-events: none;
        }

        :host([open]) .select-trigger::after {
            border-top: none;
            border-bottom: 5px solid var(--text-muted, #888);
        }

        .dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            margin-top: 4px;
            background: var(--bg-secondary, #252525);
            border: 1px solid var(--border-color, #3a3a3a);
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            max-height: 200px;
            overflow-y: auto;
            z-index: 10002;
            display: none;
        }

        :host([open]) .dropdown {
            display: block;
        }

        .option {
            padding: 8px 12px;
            cursor: pointer;
            font-size: 13px;
            color: var(--text-color, #e0e0e0);
            transition: background 0.1s ease;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .option:hover {
            background: var(--hover-background, #333);
        }

        .option.selected {
            background: var(--accent-color, #00e6cc);
            color: #000;
        }

        .option.recommended::after {
            content: ' ★';
            color: #fbbf24;
        }

        /* Scrollbar styling */
        .dropdown::-webkit-scrollbar {
            width: 6px;
        }

        .dropdown::-webkit-scrollbar-track {
            background: transparent;
        }

        .dropdown::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb, #444);
            border-radius: 3px;
        }
    `;

    static properties = {
        value: { type: String },
        options: { type: Array }, // [{ value: 'x', label: 'X', recommended?: true }]
        placeholder: { type: String },
        open: { type: Boolean, reflect: true },
    };

    constructor() {
        super();
        this.value = '';
        this.options = [];
        this.placeholder = 'Select...';
        this.open = false;
        this._boundHandleOutsideClick = this._handleOutsideClick.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('click', this._boundHandleOutsideClick);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('click', this._boundHandleOutsideClick);
    }

    _handleOutsideClick(e) {
        if (this.open && !this.contains(e.target)) {
            this.open = false;
        }
    }

    _toggleDropdown(e) {
        e.stopPropagation();
        this.open = !this.open;
    }

    _selectOption(option) {
        this.value = option.value;
        this.open = false;
        this.dispatchEvent(new CustomEvent('change', {
            detail: { value: option.value },
            bubbles: true,
            composed: true
        }));
    }

    _getSelectedLabel() {
        const selected = this.options.find(opt => opt.value === this.value);
        return selected ? selected.label : this.placeholder;
    }

    render() {
        return html`
            <div class="select-trigger" @click=${this._toggleDropdown} tabindex="0">
                ${this._getSelectedLabel()}
            </div>
            <div class="dropdown">
                ${this.options.map(opt => html`
                    <div 
                        class="option ${opt.value === this.value ? 'selected' : ''} ${opt.recommended ? 'recommended' : ''}"
                        @click=${() => this._selectOption(opt)}
                    >
                        ${opt.label}
                    </div>
                `)}
            </div>
        `;
    }
}

customElements.define('stealth-select', StealthSelect);
