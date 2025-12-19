import { css } from '../../assets/lit-core-2.7.4.min.js';

export const codeHighlightStyles = css`
    .hljs {
        color: var(--code-text, var(--text-color));
        background: var(--code-bg, var(--bg-secondary));
    }

    .hljs-doctag,
    .hljs-keyword,
    .hljs-meta .hljs-keyword,
    .hljs-template-tag,
    .hljs-template-variable,
    .hljs-type,
    .hljs-variable.language_ {
        color: var(--code-keyword, var(--border-default));
    }

    .hljs-title,
    .hljs-title.class_,
    .hljs-title.class_.inherited__,
    .hljs-title.function_ {
        color: var(--code-title, var(--text-color));
    }

    .hljs-attr,
    .hljs-attribute,
    .hljs-literal,
    .hljs-meta,
    .hljs-number,
    .hljs-operator,
    .hljs-selector-attr,
    .hljs-selector-class,
    .hljs-selector-id,
    .hljs-variable {
        color: var(--code-literal, var(--text-secondary));
    }

    .hljs-meta .hljs-string,
    .hljs-regexp,
    .hljs-string {
        color: var(--code-string, var(--text-secondary));
    }

    .hljs-built_in,
    .hljs-symbol {
        color: var(--code-built-in, var(--text-secondary));
    }

    .hljs-code,
    .hljs-comment,
    .hljs-formula {
        color: var(--code-comment, var(--text-muted));
    }

    .hljs-name,
    .hljs-quote,
    .hljs-selector-pseudo,
    .hljs-selector-tag {
        color: var(--code-name, var(--text-secondary));
    }

    .hljs-section {
        color: var(--code-section, var(--border-default));
        font-weight: 700;
    }

    .hljs-bullet {
        color: var(--code-bullet, var(--text-secondary));
    }

    .hljs-emphasis {
        color: var(--code-text, var(--text-color));
        font-style: italic;
    }

    .hljs-strong {
        color: var(--code-text, var(--text-color));
        font-weight: 700;
    }

    .hljs-addition {
        color: var(--code-addition, var(--text-color));
        background-color: var(--code-addition-bg, var(--bg-tertiary));
    }

    .hljs-deletion {
        color: var(--code-deletion, var(--text-color));
        background-color: var(--code-deletion-bg, var(--bg-tertiary));
    }
`;
