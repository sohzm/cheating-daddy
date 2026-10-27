const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeHexColor } = require('../src/utils/colors');

test('normalizeHexColor accepts #rrggbb and lowercases it', () => {
    assert.equal(normalizeHexColor('#ff8800'), '#ff8800');
    assert.equal(normalizeHexColor('#FF8800'), '#ff8800');
    assert.equal(normalizeHexColor('#aBcDeF'), '#abcdef');
});

test('normalizeHexColor expands the #rgb short form', () => {
    assert.equal(normalizeHexColor('#f80'), '#ff8800');
    assert.equal(normalizeHexColor('#FFF'), '#ffffff');
});

test('normalizeHexColor trims surrounding whitespace', () => {
    assert.equal(normalizeHexColor('  #00ff00 \n'), '#00ff00');
});

test('normalizeHexColor rejects anything that is not a hex color', () => {
    for (const value of [
        null,
        undefined,
        '',
        '   ',
        'ff8800',
        '#ff880',
        '#ff88000',
        '#ff8800ff',
        '#gg0000',
        'red',
        'rgb(255, 0, 0)',
        'var(--text-primary)',
        '#fff; background: red',
        123456,
        {},
        ['#ffffff'],
    ]) {
        assert.equal(normalizeHexColor(value), null, `expected null for ${JSON.stringify(value)}`);
    }
});
