import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class MainView extends LitElement {
    static styles = css`
        .welcome {
            font-size: 24px;
            margin-bottom: 8px;
            font-weight: 600;
            margin-top: auto;
        }

        .input-group {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
        }

        .input-group input {
            flex: 1;
        }

        input {
            background: var(--input-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 10px 14px;
            width: 100%;
            border-radius: 8px;
            font-size: 14px;
        }

        input:focus {
            outline: none;
            border-color: var(--focus-border-color);
            box-shadow: 0 0 0 3px var(--focus-box-shadow);
            background: var(--input-focus-background);
        }

        input::placeholder {
            color: var(--placeholder-color);
        }

        .start-button {
            background: var(--start-button-background);
            color: var(--start-button-color);
            border: 1px solid var(--start-button-border);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
        }

        .start-button:hover {
            background: var(--start-button-hover-background);
            border-color: var(--start-button-hover-border);
        }

        .description {
            color: var(--description-color);
            font-size: 14px;
            margin-bottom: 24px;
            line-height: 1.5;
        }

        .link {
            color: var(--link-color);
            text-decoration: underline;
            cursor: pointer;
        }

        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 500px;
        }
    `;

    static properties = {
        onStart: { type: Function },
        onAPIKeyHelp: { type: Function }
    };

    constructor() {
        super();
        this.onStart = () => {};
        this.onAPIKeyHelp = () => {};
    }

    handleInput(e) {
        localStorage.setItem('apiKey', e.target.value);
    }

    handleStartClick() {
        this.onStart();
    }

    handleAPIKeyHelpClick() {
        this.onAPIKeyHelp();
    }

    render() {
        return html`
            <div class="welcome">Welcome</div>

            <div class="input-group">
                <input
                    type="password"
                    placeholder="Enter your Gemini API Key"
                    .value=${localStorage.getItem('apiKey') || ''}
                    @input=${this.handleInput}
                />
                <button @click=${this.handleStartClick} class="start-button">Start Session</button>
            </div>
            <p class="description">
                dont have an api key?
                <span @click=${this.handleAPIKeyHelpClick} class="link">get one here</span>
            </p>
        `;
    }
}

customElements.define('main-view', MainView); 