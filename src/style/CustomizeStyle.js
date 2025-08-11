import { css } from '../assets/lit-core-2.7.4.min.js';
export const CustomizeStyle =  css`
        * {
            font-family:
                'Inter',
                -apple-system,
                BlinkMacSystemFont,
                sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            padding: 12px;
            margin: 0 auto;
            max-width: 700px;
        }

        .settings-container {
            display: grid;
            gap: 12px;
            padding-bottom: 20px;
        }

        .settings-section {
            background: var(--card-background, rgba(255, 255, 255, 0.04));
            border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
            border-radius: 6px;
            padding: 16px;
            backdrop-filter: blur(10px);
        }

        .section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-color);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .section-title::before {
            content: '';
            width: 3px;
            height: 14px;
            background: var(--accent-color, #007aff);
            border-radius: 1.5px;
        }

        .form-grid {
            display: grid;
            gap: 12px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            align-items: start;
        }

        @media (max-width: 600px) {
            .form-row {
                grid-template-columns: 1fr;
            }
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .form-group.full-width {
            grid-column: 1 / -1;
        }

        .form-label {
            font-weight: 500;
            font-size: 12px;
            color: var(--label-color, rgba(255, 255, 255, 0.9));
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .form-description {
            font-size: 11px;
            color: var(--description-color, rgba(255, 255, 255, 0.5));
            line-height: 1.3;
            margin-top: 2px;
        }

        .form-control {
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            color: var(--text-color);
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.15));
            padding: 8px 10px;
            border-radius: 4px;
            font-size: 12px;
            transition: all 0.15s ease;
            min-height: 16px;
            font-weight: 400;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--focus-border-color, #007aff);
            box-shadow: 0 0 0 2px var(--focus-shadow, rgba(0, 122, 255, 0.1));
            background: var(--input-focus-background, rgba(0, 0, 0, 0.4));
        }

        .form-control:hover:not(:focus) {
            border-color: var(--input-hover-border, rgba(255, 255, 255, 0.2));
            background: var(--input-hover-background, rgba(0, 0, 0, 0.35));
        }

        select.form-control {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 8px center;
            background-repeat: no-repeat;
            background-size: 12px;
            padding-right: 28px;
        }

        textarea.form-control {
            resize: vertical;
            min-height: 60px;
            line-height: 1.4;
            font-family: inherit;
        }

        textarea.form-control::placeholder {
            color: var(--placeholder-color, rgba(255, 255, 255, 0.4));
        }

        .profile-option {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .current-selection {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 10px;
            color: var(--success-color, #34d399);
            background: var(--success-background, rgba(52, 211, 153, 0.1));
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
            border: 1px solid var(--success-border, rgba(52, 211, 153, 0.2));
        }

        .current-selection::before {
            content: '✓';
            font-weight: 600;
        }

        .keybind-input {
            cursor: pointer;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
            text-align: center;
            letter-spacing: 0.5px;
            font-weight: 500;
        }

        .keybind-input:focus {
            cursor: text;
            background: var(--input-focus-background, rgba(0, 122, 255, 0.1));
        }

        .keybind-input::placeholder {
            color: var(--placeholder-color, rgba(255, 255, 255, 0.4));
            font-style: italic;
        }

        .reset-keybinds-button {
            background: var(--button-background, rgba(255, 255, 255, 0.1));
            color: var(--text-color);
            border: 1px solid var(--button-border, rgba(255, 255, 255, 0.15));
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .reset-keybinds-button:hover {
            background: var(--button-hover-background, rgba(255, 255, 255, 0.15));
            border-color: var(--button-hover-border, rgba(255, 255, 255, 0.25));
        }

        .reset-keybinds-button:active {
            transform: translateY(1px);
        }

        .keybinds-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            border-radius: 4px;
            overflow: hidden;
        }

        .keybinds-table th,
        .keybinds-table td {
            padding: 8px 10px;
            text-align: left;
            border-bottom: 1px solid var(--table-border, rgba(255, 255, 255, 0.08));
        }

        .keybinds-table th {
            background: var(--table-header-background, rgba(255, 255, 255, 0.04));
            font-weight: 600;
            font-size: 11px;
            color: var(--label-color, rgba(255, 255, 255, 0.8));
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .keybinds-table td {
            vertical-align: middle;
        }

        .keybinds-table .action-name {
            font-weight: 500;
            color: var(--text-color);
            font-size: 12px;
        }

        .keybinds-table .action-description {
            font-size: 10px;
            color: var(--description-color, rgba(255, 255, 255, 0.5));
            margin-top: 1px;
        }

        .keybinds-table .keybind-input {
            min-width: 100px;
            padding: 4px 8px;
            margin: 0;
            font-size: 11px;
        }

        .keybinds-table tr:hover {
            background: var(--table-row-hover, rgba(255, 255, 255, 0.02));
        }

        .keybinds-table tr:last-child td {
            border-bottom: none;
        }

        .table-reset-row {
            border-top: 1px solid var(--table-border, rgba(255, 255, 255, 0.08));
        }

        .table-reset-row td {
            padding-top: 10px;
            padding-bottom: 8px;
            border-bottom: none;
        }

        .settings-note {
            font-size: 10px;
            color: var(--note-color, rgba(255, 255, 255, 0.4));
            font-style: italic;
            text-align: center;
            margin-top: 10px;
            padding: 8px;
            background: var(--note-background, rgba(255, 255, 255, 0.02));
            border-radius: 4px;
            border: 1px solid var(--note-border, rgba(255, 255, 255, 0.08));
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
            padding: 8px;
            background: var(--checkbox-background, rgba(255, 255, 255, 0.02));
            border-radius: 4px;
            border: 1px solid var(--checkbox-border, rgba(255, 255, 255, 0.06));
        }

        .checkbox-input {
            width: 14px;
            height: 14px;
            accent-color: var(--focus-border-color, #007aff);
            cursor: pointer;
        }

        .checkbox-label {
            font-weight: 500;
            font-size: 12px;
            color: var(--label-color, rgba(255, 255, 255, 0.9));
            cursor: pointer;
            user-select: none;
        }

        /* Better focus indicators */
        .form-control:focus-visible {
            outline: none;
            border-color: var(--focus-border-color, #007aff);
            box-shadow: 0 0 0 2px var(--focus-shadow, rgba(0, 122, 255, 0.1));
        }

        /* Improved button states */
        .reset-keybinds-button:focus-visible {
            outline: none;
            border-color: var(--focus-border-color, #007aff);
            box-shadow: 0 0 0 2px var(--focus-shadow, rgba(0, 122, 255, 0.1));
        }

        /* Slider styles */
        .slider-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .slider-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .slider-value {
            font-size: 11px;
            color: var(--success-color, #34d399);
            background: var(--success-background, rgba(52, 211, 153, 0.1));
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
            border: 1px solid var(--success-border, rgba(52, 211, 153, 0.2));
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
        }

        .slider-input {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 4px;
            border-radius: 2px;
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            outline: none;
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.15));
            cursor: pointer;
        }

        .slider-input::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--focus-border-color, #007aff);
            cursor: pointer;
            border: 2px solid var(--text-color, white);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider-input::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--focus-border-color, #007aff);
            cursor: pointer;
            border: 2px solid var(--text-color, white);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider-input:hover::-webkit-slider-thumb {
            background: var(--text-input-button-hover, #0056b3);
        }

        .slider-input:hover::-moz-range-thumb {
            background: var(--text-input-button-hover, #0056b3);
        }

        .slider-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
            font-size: 10px;
            color: var(--description-color, rgba(255, 255, 255, 0.5));
        }
        
        //Work by Oscardo
        .profile-buttons {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            align-items: center;
            max-width: 20%;
            margin-left: auto;
            margin-right: 0;
            min-width: 50px;
            position: sticky;
            top: 8px;
            z-index: 10;
            background: var(--card-background, rgba(255,255,255,0.04));
            padding: 6px 0;
        }
        
        .open-button,
        .save-button {
            background: transparent;
            color: var(--start-button-background);
            border: none;
            padding: 4px;
            border-radius: 50%;
            font-size: 12px;
            display: flex;
            align-items: center;
            width: 36px;
            height: 36px;
            justify-content: center;
            cursor: pointer;
        }

        .open-button:hover,
        .save-button:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .open-button.saved,
        .save-button.saved {
            color: #4caf50;
        }
        .open-button svg,
        .save-button svg {
            stroke: currentColor !important;
        }

        .main-container {
            display: flex;
            width: 100%;
            border: 1px;
            height: 80px; /* Altura de ejemplo */
        }

        .info-area {
            flex: 1; /* Ocupa todo el espacio restante */
            display: flex;
            justify-content: center;
            align-items: center;
            border-right: 1px;
        }

        .actions-section {
            display: flex;
            flex-direction: column;
            width: 80px; /* Ancho fijo para la sección de acciones */
        }

        .header-row,
        .data-row {
            display: flex;
            flex: 1;
        }

        .header-row {
            border-bottom: 1px;
        }

        .action-cell,
        .data-cell {
            flex: 1; /* Ocupan la misma anchura dentro de su fila */
            display: flex;
            justify-content: center;
            align-items: center;
            border-right: 1px;
        }

        .action-cell:last-child,
        .data-cell:last-child {
            border-right: none;
        }
        
        /* QWEN ASSISTANT - Enhanced theme selection styling with visual previews */
        .theme-selector {
            display: flex;
            gap: 16px;
            margin-top: 12px;
            justify-content: center;
        }
        
        .theme-option {
            flex: 1;
            padding: 16px 12px;
            border-radius: 8px;
            border: 2px solid transparent;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
            font-size: 12px;
            font-weight: 500;
            max-width: 120px;
            backdrop-filter: blur(10px);
        }
        
        .theme-option:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }
        
        .theme-option.selected {
            border-color: var(--focus-border-color, #007aff);
            box-shadow: 0 0 0 3px var(--focus-shadow, rgba(0, 122, 255, 0.25));
            background: var(--theme-option-selected, rgba(0, 122, 255, 0.1));
        }
        
        .theme-option.light {
            background: rgba(255, 255, 255, 0.9);
            color: #000000;
            border-color: rgba(0, 0, 0, 0.1);
        }
        
        .theme-option.dark {
            background: rgba(30, 30, 30, 0.9);
            color: #ffffff;
        }
        
        .theme-option.system {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 50%, rgba(30, 30, 30, 0.9) 50%);
            color: #000000;
        }
        
        .theme-preview {
            width: 60px;
            height: 40px;
            margin: 0 auto 8px;
            border-radius: 4px;
            border: 1px solid rgba(0, 0, 0, 0.1);
            position: relative;
            overflow: hidden;
        }
        
        .light-preview {
            background: #ffffff;
            border: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        .light-preview::before {
            content: '';
            position: absolute;
            top: 4px;
            left: 4px;
            right: 4px;
            height: 8px;
            background: #f0f0f0;
            border-radius: 2px;
        }
        
        .light-preview::after {
            content: '';
            position: absolute;
            bottom: 4px;
            left: 4px;
            width: 20px;
            height: 12px;
            background: #007aff;
            border-radius: 2px;
        }
        
        .dark-preview {
            background: #1e1e1e;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .dark-preview::before {
            content: '';
            position: absolute;
            top: 4px;
            left: 4px;
            right: 4px;
            height: 8px;
            background: #2d2d2d;
            border-radius: 2px;
        }
        
        .dark-preview::after {
            content: '';
            position: absolute;
            bottom: 4px;
            left: 4px;
            width: 20px;
            height: 12px;
            background: #0a84ff;
            border-radius: 2px;
        }
        
        .system-preview {
            background: linear-gradient(135deg, #ffffff 50%, #1e1e1e 50%);
            border: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        .system-preview::before {
            content: '';
            position: absolute;
            top: 4px;
            left: 4px;
            right: 4px;
            height: 8px;
            background: linear-gradient(90deg, #f0f0f0 50%, #2d2d2d 50%);
            border-radius: 2px;
        }
        
        .system-preview::after {
            content: '';
            position: absolute;
            bottom: 4px;
            left: 4px;
            width: 20px;
            height: 12px;
            background: linear-gradient(90deg, #007aff 50%, #0a84ff 50%);
            border-radius: 2px;
        }
        
        .theme-label {
            display: block;
            margin-top: 6px;
            font-weight: 500;
        }
        //Work by Oscardo
        `;

export default CustomizeStyle;