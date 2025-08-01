import { css } from '../assets/lit-core-2.7.4.min.js';
//export const HistoryStyle =  css
export const HistoryStyle =  css`
        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
            width: 100%;
        }

        .history-container {
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .sessions-list {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 16px;
            padding-bottom: 20px;
        }

        .session-item {
            background: var(--input-background);
            border: 1px solid var(--button-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .session-item:hover {
            background: var(--hover-background);
            border-color: var(--focus-border-color);
        }

        .session-item.selected {
            background: var(--focus-box-shadow);
            border-color: var(--focus-border-color);
        }

        .session-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }

        .session-date {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-color);
        }

        .session-time {
            font-size: 11px;
            color: var(--description-color);
        }

        .session-preview {
            font-size: 11px;
            color: var(--description-color);
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .conversation-view {
            flex: 1;
            overflow-y: auto;
            background: var(--main-content-background);
            border: 1px solid var(--button-border);
            border-radius: 6px;
            padding: 12px;
            padding-bottom: 20px;
            user-select: text;
            cursor: text;
        }

        .message {
            margin-bottom: 6px;
            padding: 6px 10px;
            border-left: 3px solid transparent;
            font-size: 12px;
            line-height: 1.4;
            background: var(--input-background);
            border-radius: 0 4px 4px 0;
            user-select: text;
            cursor: text;
        }

        .message.user {
            border-left-color: #5865f2; /* Discord blue */
        }

        .message.ai {
            border-left-color: #ed4245; /* Discord red */
        }

        .back-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .back-button {
            background: var(--button-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }

        .back-button:hover {
            background: var(--hover-background);
        }

        .legend {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            color: var(--description-color);
        }

        .legend-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
        }

        .legend-dot.user {
            background-color: #5865f2; /* Discord blue */
        }

        .legend-dot.ai {
            background-color: #ed4245; /* Discord red */
        }

        .empty-state {
            text-align: center;
            color: var(--description-color);
            font-size: 12px;
            margin-top: 32px;
        }

        .empty-state-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 6px;
            color: var(--text-color);
        }

        .loading {
            text-align: center;
            color: var(--description-color);
            font-size: 12px;
            margin-top: 32px;
        }

        /* Scrollbar styles for scrollable elements */
        .sessions-list::-webkit-scrollbar {
            width: 6px;
        }

        .sessions-list::-webkit-scrollbar-track {
            background: var(--scrollbar-track, rgba(0, 0, 0, 0.2));
            border-radius: 3px;
        }

        .sessions-list::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb, rgba(255, 255, 255, 0.2));
            border-radius: 3px;
        }

        .sessions-list::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover, rgba(255, 255, 255, 0.3));
        }

        .conversation-view::-webkit-scrollbar {
            width: 6px;
        }

        .conversation-view::-webkit-scrollbar-track {
            background: var(--scrollbar-track, rgba(0, 0, 0, 0.2));
            border-radius: 3px;
        }

        .conversation-view::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb, rgba(255, 255, 255, 0.2));
            border-radius: 3px;
        }

        .conversation-view::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover, rgba(255, 255, 255, 0.3));
        }
        .tabs-container {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            border-bottom: 1px solid var(--button-border);
            padding-bottom: 8px;
        }

        .tab {
            background: transparent;
            color: var(--description-color);
            border: none;
            padding: 8px 16px;
            border-radius: 4px 4px 0 0;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .tab:hover {
            background: var(--hover-background);
            color: var(--text-color);
        }

        .tab.active {
            background: var(--focus-box-shadow);
            color: var(--text-color);
            border-bottom: 2px solid var(--focus-border-color);
        }

        .saved-response-item {
            background: var(--input-background);
            border: 1px solid var(--button-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 8px;
            transition: all 0.15s ease;
        }

        .saved-response-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }

        .saved-response-profile {
            font-size: 11px;
            font-weight: 600;
            color: var(--focus-border-color);
            text-transform: capitalize;
        }

        .saved-response-date {
            font-size: 10px;
            color: var(--description-color);
        }

        .saved-response-content {
            font-size: 12px;
            color: var(--text-color);
            line-height: 1.4;
            user-select: text;
            cursor: text;
        }

        .delete-button {
            background: transparent;
            color: var(--description-color);
            border: none;
            padding: 4px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .delete-button:hover {
            background: rgba(255, 0, 0, 0.1);
            color: #ff4444;
        }
        `;

export default HistoryStyle;