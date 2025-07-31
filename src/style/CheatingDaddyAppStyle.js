import { css } from '../assets/lit-core-2.7.4.min.js';

export const CheatingDaddyAppStyle =  css`
    * {
            box-sizing: border-box;
            font-family:
                'Inter',
                -apple-system,
                BlinkMacSystemFont,
                sans-serif;
            margin: 0px;
            padding: 0px;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            width: 100%;
            height: 100vh;
            background-color: var(--background-transparent);
            color: var(--text-color);
        }

        .window-container {
            height: 100vh;
            border-radius: 7px;
            overflow: hidden;
        }

        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .main-content {
            flex: 1;
            padding: var(--main-content-padding);
            overflow-y: auto;
            margin-top: var(--main-content-margin-top);
            border-radius: var(--content-border-radius);
            transition: all 0.15s ease-out;
            background: var(--main-content-background);
        }

        .main-content.with-border {
            border: 1px solid var(--border-color);
        }

        .main-content.assistant-view {
            padding: 10px;
            border: none;
        }

        .main-content.onboarding-view {
            padding: 0;
            border: none;
            background: transparent;
        }

        .view-container {
            opacity: 1;
            transform: translateY(0);
            transition:
                opacity 0.15s ease-out,
                transform 0.15s ease-out;
            height: 100%;
        }

        .view-container.entering {
            opacity: 0;
            transform: translateY(10px);
        }

        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        ::-webkit-scrollbar-track {
            background: var(--scrollbar-background);
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }
    `;

export default CheatingDaddyAppStyle;
