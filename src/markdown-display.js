import { LitElement, html, css } from './lit-core-2.7.4.min.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { marked } from 'marked';

class MarkdownDisplay extends LitElement {
    static properties = {
        markdown: { type: String },
    };

    static styles = css`
        :host {
            display: block;
            line-height: 1.7;
            color: var(--text-color); /* Inherit text color */
        }

        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
            margin-top: 1em;
            margin-bottom: 0.6em;
            font-weight: 600;
            line-height: 1.3;
        }

        h1 {
            font-size: 1.8em;
            border-bottom: 1px solid var(--border-color, #eee);
            padding-bottom: 0.3em;
        }

        h2 {
            font-size: 1.5em;
            border-bottom: 1px solid var(--border-color, #eee);
            padding-bottom: 0.3em;
        }

        h3 {
            font-size: 1.3em;
        }

        h4 {
            font-size: 1.1em;
        }

        p {
            margin-top: 0;
            margin-bottom: 1em;
        }

        a {
            color: var(--link-color, #007aff);
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        code {
            background-color: var(--code-background, rgba(135, 131, 120, 0.15));
            color: var(--code-text-color, var(--text-color));
            padding: 0.2em 0.4em;
            margin: 0 0.2em;
            border-radius: 6px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
            font-size: 0.9em;
        }

        pre {
            background-color: var(--code-block-background, rgba(135, 131, 120, 0.1));
            border: 1px solid var(--border-color, #ddd);
            border-radius: 6px;
            padding: 1em;
            overflow-x: auto;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
            font-size: 0.9em;
            line-height: 1.5;
        }

        pre code {
            background-color: transparent;
            padding: 0;
            margin: 0;
            border: none;
            font-size: inherit; /* Inherit font size from pre */
        }

        blockquote {
            border-left: 4px solid var(--blockquote-border-color, #ccc);
            padding-left: 1em;
            margin-left: 0;
            margin-right: 0;
            margin-top: 1em;
            margin-bottom: 1em;
            color: var(--blockquote-text-color, #555);
            font-style: italic;
        }

        ul,
        ol {
            margin-top: 0;
            margin-bottom: 1em;
            padding-left: 2em; /* Standard indentation */
        }

        li {
            margin-bottom: 0.4em;
        }

        table {
            border-collapse: collapse;
            margin: 1em 0;
            width: 100%;
            border: 1px solid var(--border-color, #ddd);
        }

        th,
        td {
            border: 1px solid var(--border-color, #ddd);
            padding: 0.5em 0.75em;
            text-align: left;
        }

        th {
            background-color: var(--table-header-background, #f0f0f0);
            font-weight: 600;
        }

        img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            margin-top: 0.5em;
            margin-bottom: 0.5em;
        }

        hr {
            border: none;
            border-top: 1px solid var(--border-color, #eee);
            margin: 1.5em 0;
        }
    `;

    render() {
        if (!this.markdown) {
            return html``;
        }
        const rawHtml = marked.parse(this.markdown);
        return html`${unsafeHTML(rawHtml)}`;
    }
}

customElements.define('markdown-display', MarkdownDisplay);
