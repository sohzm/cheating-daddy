import { css } from '../../assets/lit-core-2.7.4.min.js';

export const unifiedPageStyles = css`
    * {
        box-sizing: border-box;
        font-family: var(--font);
        cursor: default;
        user-select: none;
    }

    :host {
        display: block;
        height: 100%;
    }

    .unified-page {
        height: 100%;
        overflow-y: auto;
        padding: var(--space-lg);
        background: var(--bg-app);
    }

    .unified-wrap {
        width: 100%;
        max-width: 1160px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
        min-height: 100%;
    }

    .page-title {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
        color: var(--text-primary);
        margin-bottom: 4px;
    }

    .page-subtitle {
        color: var(--text-muted);
        font-size: var(--font-size-sm);
    }

    .surface {
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--bg-surface);
        padding: var(--space-md);
    }

    .surface-title {
        color: var(--text-primary);
        font-size: var(--font-size-md);
        font-weight: var(--font-weight-semibold);
        margin-bottom: 4px;
    }

    .surface-subtitle {
        color: var(--text-muted);
        font-size: var(--font-size-xs);
        margin-bottom: var(--space-md);
    }

    .form-grid {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
    }

    .form-row {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
    }

    .form-group {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-md);
    }

    .form-group.vertical {
        flex-direction: column;
        align-items: stretch;
    }

    .form-label {
        color: var(--text-secondary);
        font-size: var(--font-size-sm);
        white-space: nowrap;
        flex-shrink: 0;
    }

    .form-help {
        color: var(--text-muted);
        font-size: var(--font-size-xs);
        line-height: 1.4;
    }

    .control {
        width: 200px;
        background: var(--bg-elevated);
        color: var(--text-primary);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 8px 12px;
        font-size: var(--font-size-sm);
        transition: border-color var(--transition), box-shadow var(--transition);
    }

    .control:hover:not(:focus) {
        border-color: var(--border-strong);
    }

    .control:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 1px var(--accent);
    }

    select.control {
        appearance: none;
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b6b6b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
        background-position: right 8px center;
        background-repeat: no-repeat;
        background-size: 12px;
        padding-right: 28px;
        cursor: pointer;
    }

    textarea.control {
        width: 100%;
        min-height: 100px;
        resize: vertical;
        line-height: 1.45;
    }

    .chip {
        display: inline-flex;
        align-items: center;
        border-radius: var(--radius-sm);
        background: var(--bg-elevated);
        color: var(--text-secondary);
        padding: 2px 8px;
        font-size: var(--font-size-xs);
        font-family: var(--font-mono);
    }

    .pill {
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 2px 8px;
        font-size: var(--font-size-xs);
        color: var(--text-muted);
    }

    .muted {
        color: var(--text-muted);
    }

    .danger {
        color: var(--danger);
    }

    @media (max-width: 640px) {
        .unified-page {
            padding: var(--space-md);
        }
    }
`;
