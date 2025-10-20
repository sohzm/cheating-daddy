import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class CustomDropdown extends LitElement {
    static styles = css`
        * {
            font-family: 'Inter', sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            position: relative;
            width: 100%;
        }

        .dropdown-container {
            position: relative;
            width: 100%;
        }

        .dropdown-button {
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            color: var(--text-color);
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.15));
            padding: 8px 10px;
            border-radius: 4px;
            font-size: 12px;
            transition: all 0.15s ease;
            min-height: 16px;
            font-weight: 400;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            text-align: left;
        }

        .dropdown-button:hover:not([disabled]) {
            border-color: var(--input-hover-border, rgba(255, 255, 255, 0.2));
            background: var(--input-hover-background, rgba(0, 0, 0, 0.35));
        }

        .dropdown-button.open {
            border-color: var(--focus-border-color, #007aff);
            box-shadow: 0 0 0 2px var(--focus-shadow, rgba(0, 122, 255, 0.1));
            background: var(--input-focus-background, rgba(0, 0, 0, 0.4));
        }

        .dropdown-button[disabled] {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .dropdown-arrow {
            width: 12px;
            height: 12px;
            margin-left: 8px;
            flex-shrink: 0;
            transition: transform 0.15s ease;
            stroke: currentColor;
        }

        .dropdown-button.open .dropdown-arrow {
            transform: rotate(180deg);
        }

        .dropdown-menu {
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            right: 0;
            background: rgba(10, 10, 10, 0.98);
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.15));
            border-radius: 4px;
            max-height: 250px;
            overflow-y: auto;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(20px);
            opacity: 0;
            transform: translateY(-10px);
            pointer-events: none;
            transition: opacity 0.15s ease, transform 0.15s ease;
        }

        .dropdown-menu.open {
            opacity: 1;
            transform: translateY(0);
            pointer-events: all;
        }

        .dropdown-option {
            padding: 8px 10px;
            font-size: 12px;
            color: var(--text-color);
            cursor: pointer;
            transition: background 0.1s ease;
        }

        .dropdown-option:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .dropdown-option.selected {
            background: rgba(0, 122, 255, 0.3);
            color: var(--focus-border-color, #007aff);
            font-weight: 500;
        }

        .dropdown-menu::-webkit-scrollbar {
            width: 8px;
        }

        .dropdown-menu::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
            border-radius: 4px;
        }

        .dropdown-menu::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 4px;
        }

        .dropdown-menu::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }
    `;

    static properties = {
        value: { type: String },
        options: { type: Array },
        disabled: { type: Boolean },
        isOpen: { type: Boolean },
    };

    constructor() {
        super();
        this.value = '';
        this.options = [];
        this.disabled = false;
        this.isOpen = false;
        this._handleClickOutside = this._handleClickOutside.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('click', this._handleClickOutside);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('click', this._handleClickOutside);
    }

    _handleClickOutside(e) {
        if (!this.shadowRoot.contains(e.target) && this.isOpen) {
            this.isOpen = false;
            this.requestUpdate();
        }
    }

    toggleDropdown(e) {
        e.stopPropagation();
        if (!this.disabled) {
            this.isOpen = !this.isOpen;
            this.requestUpdate();
        }
    }

    selectOption(optionValue, e) {
        e.stopPropagation();
        this.value = optionValue;
        this.isOpen = false;
        this.dispatchEvent(
            new CustomEvent('change', {
                detail: { value: optionValue },
                bubbles: true,
                composed: true,
            })
        );
        this.requestUpdate();
    }

    getSelectedOption() {
        return this.options.find(opt => opt.value === this.value) || this.options[0];
    }

    render() {
        const selectedOption = this.getSelectedOption();
        const displayText = selectedOption ? selectedOption.label : 'Select...';

        return html`
            <div class="dropdown-container">
                <div
                    class="dropdown-button ${this.isOpen ? 'open' : ''}"
                    @click=${this.toggleDropdown}
                    ?disabled=${this.disabled}
                    aria-disabled="${this.disabled}"
                >
                    <span>${displayText}</span>
                    <svg
                        class="dropdown-arrow"
                        fill="none"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.5"
                            d="M6 8l4 4 4-4"
                        />
                    </svg>
                </div>
                <div class="dropdown-menu ${this.isOpen ? 'open' : ''}">
                    ${this.options.map(
                        option => html`
                            <div
                                class="dropdown-option ${this.value === option.value ? 'selected' : ''}"
                                @click=${e => this.selectOption(option.value, e)}
                            >
                                ${option.label}
                            </div>
                        `
                    )}
                </div>
            </div>
        `;
    }
}

customElements.define('custom-dropdown', CustomDropdown);
