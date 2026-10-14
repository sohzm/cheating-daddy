const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function loadModule(relativePath, overrides = {}, globals = {}) {
    const filename = path.join(__dirname, '..', relativePath);
    const realRequire = createRequire(filename);
    const module = { exports: {} };
    vm.runInNewContext(
        fs.readFileSync(filename, 'utf8'),
        {
            module,
            exports: module.exports,
            require: name => (Object.hasOwn(overrides, name) ? overrides[name] : realRequire(name)),
            __dirname: path.dirname(filename),
            __filename: filename,
            console: { log() {}, warn() {}, error() {} },
            Buffer,
            process,
            global: {},
            setTimeout,
            clearTimeout,
            fetch,
            TextDecoder,
            ...globals,
        },
        { filename }
    );
    return module.exports;
}

function createStorage(t) {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-api-test-'));
    t.after(() => fs.rmSync(home, { recursive: true, force: true }));
    return loadModule('src/storage.js', { os: { ...os, homedir: () => home } });
}

module.exports = { loadModule, createStorage };
