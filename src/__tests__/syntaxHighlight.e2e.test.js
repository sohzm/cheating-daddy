const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('syntax highlighting', () => {
    it('loads highlight.js and styles code blocks', async () => {
        const htmlPath = path.join(__dirname, '../index.html');
        const html = fs.readFileSync(htmlPath, 'utf8');
        const dom = new JSDOM(html, {
            runScripts: 'dangerously',
            resources: 'usable',
            url: 'file://' + path.resolve(__dirname, '..') + '/',
        });

        await new Promise(resolve => {
            dom.window.addEventListener('load', () => resolve());
        });

        const link = dom.window.document.querySelector('link[href="assets/highlight-vscode-dark.min.css"]');
        expect(link).not.toBeNull();
        expect(dom.window.hljs).toBeDefined();

        const code = dom.window.document.createElement('code');
        code.className = 'language-js';
        code.textContent = 'const x = 1;';
        dom.window.document.body.appendChild(code);
        dom.window.hljs.highlightElement(code);
        expect(code.innerHTML).toMatch(/<span class="/);
    });
});
