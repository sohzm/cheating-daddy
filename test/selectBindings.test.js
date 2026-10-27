const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Lit sets `.value` on a <select> before it renders the <option>s that come from a `${...map()}` expression,
// so on the first render the browser falls back to the first option. If the value never changes afterwards
// (e.g. it is passed in from the parent already loaded) Lit never sets it again and the wrong option stays
// selected. Such selects must bind selection on the options instead: `.selected=${option.value === current}`.

const COMPONENTS_DIR = path.join(__dirname, '..', 'src', 'components');

function listComponentFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return listComponentFiles(full);
        return entry.name.endsWith('.js') ? [full] : [];
    });
}

function findSelects(source) {
    const selects = [];
    const re = /<select\b([^>]*)>([\s\S]*?)<\/select>/g;
    let match;
    while ((match = re.exec(source))) {
        const line = source.slice(0, match.index).split('\n').length;
        selects.push({ openTag: match[1], body: match[2], line });
    }
    return selects;
}

function hasValueBindingWithMappedOptions(select) {
    return /\.value=\$\{/.test(select.openTag) && /\.map\(/.test(select.body);
}

test('detects the broken pattern', () => {
    const [broken] = findSelects('<select .value=${this.x} @change=${f}>${items.map(i => html`<option value=${i}>${i}</option>`)}</select>');
    assert.equal(hasValueBindingWithMappedOptions(broken), true);

    const [fixed] = findSelects('<select @change=${f}>${items.map(i => html`<option value=${i} .selected=${i === this.x}>${i}</option>`)}</select>');
    assert.equal(hasValueBindingWithMappedOptions(fixed), false);

    const [staticOptions] = findSelects('<select .value=${this.x}><option value="a">A</option><option value="b">B</option></select>');
    assert.equal(hasValueBindingWithMappedOptions(staticOptions), false);
});

test('no <select> binds .value while rendering its options with map()', () => {
    const offenders = [];
    for (const file of listComponentFiles(COMPONENTS_DIR)) {
        const source = fs.readFileSync(file, 'utf8');
        for (const select of findSelects(source)) {
            if (hasValueBindingWithMappedOptions(select)) {
                offenders.push(`${path.relative(COMPONENTS_DIR, file)}:${select.line}`);
            }
        }
    }
    assert.deepEqual(offenders, []);
});
