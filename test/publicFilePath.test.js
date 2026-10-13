const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolvePublicFile } = require('../games/common/publicFilePath');

test('Games: solo publica archivos dentro de sus directorios', t => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'prophet-static-'));
    t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
    const publicDir = path.join(temp, 'games');
    const siblingDir = path.join(temp, 'games-secret');
    fs.mkdirSync(path.join(publicDir, 'hub'), { recursive: true });
    fs.mkdirSync(siblingDir);
    fs.writeFileSync(path.join(publicDir, 'hub', 'index.html'), 'hola');
    fs.writeFileSync(path.join(siblingDir, 'token.txt'), 'NO PUBLICO');
    fs.symlinkSync(siblingDir, path.join(publicDir, 'linked'));

    assert.equal(resolvePublicFile(publicDir, 'hub/index.html'),
        fs.realpathSync(path.join(publicDir, 'hub', 'index.html')));
    assert.equal(resolvePublicFile(publicDir, 'hub'),
        fs.realpathSync(path.join(publicDir, 'hub', 'index.html')));
    for (const escaped of [
        '../games-secret/token.txt', 'linked/token.txt',
        '/etc/passwd', './hub/index.html', '..\\games-secret\\token.txt',
        'other-missing.html', 'hub/../../../games-secret/token.txt',
    ]) {
        assert.equal(resolvePublicFile(publicDir, escaped), null, escaped);
    }
});
