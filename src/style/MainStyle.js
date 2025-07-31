import { css } from '../assets/lit-core-2.7.4.min.js';

export const MainStyle =  css`
        * {
            font-family: 'Inter', sans-serif;
            cursor: default;
            user-select: none;
        }

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
            transition: border-color 0.2s ease;
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

        /* Red blink animation for empty API key */
        input.api-key-error {
            animation: blink-red 1s ease-in-out;
            border-color: #ff4444;
        }

        @keyframes blink-red {
            0%,
            100% {
                border-color: var(--button-border);
                background: var(--input-background);
            }
            25%,
            75% {
                border-color: #ff4444;
                background: rgba(255, 68, 68, 0.1);
            }
            50% {
                border-color: #ff6666;
                background: rgba(255, 68, 68, 0.15);
            }
        }

        .start-button {
            background: var(--start-button-background);
            color: var(--start-button-color);
            border: 1px solid var(--start-button-border);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .start-button:hover {
            background: var(--start-button-hover-background);
            border-color: var(--start-button-hover-border);
        }

        .start-button.initializing {
            opacity: 0.5;
        }

        .start-button.initializing:hover {
            background: var(--start-button-background);
            border-color: var(--start-button-border);
        }

        .shortcut-icons {
            display: flex;
            align-items: center;
            gap: 2px;
            margin-left: 4px;
        }

        .shortcut-icons svg {
            width: 14px;
            height: 14px;
        }

        .shortcut-icons svg path {
            stroke: currentColor;
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

        .shortcut-hint {
            color: var(--description-color);
            font-size: 11px;
            opacity: 0.8;
        }

        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 500px;
        }
`;

export default MainStyle;