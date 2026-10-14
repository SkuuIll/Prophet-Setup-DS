const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const activitySource = fs.readFileSync(path.join(ROOT, 'web/public/games/common/discordActivity.js'), 'utf8');

test('Activity: mensajes externos y URL se muestran como texto, nunca como HTML', () => {
    const first = activitySource.indexOf('function showError(title, detail) {');
    const last = activitySource.indexOf('\nasync function fetchConfig()', first);
    assert.ok(first !== -1 && last > first, 'No se pudo aislar el render de errores');
    const errorUI = activitySource.slice(first, last);
    let panel = null;
    const heading = { textContent: '' };
    const detail = { textContent: '' };
    const retry = {};
    const document = {
        getElementById: id => id === 'prophet-activity-error' ? panel : id === 'prophet-activity-retry' ? retry : null,
        createElement: () => ({
            id: null,
            style: {},
            innerHTML: '',
            querySelector: selector => selector === '#prophet-activity-error-title' ? heading
                : selector === '#prophet-activity-error-detail' ? detail : null,
        }),
        body: { appendChild: element => { panel = element; } },
    };
    const render = vm.runInNewContext(errorUI + '\nshowError', {
        document,
        window: {},
        navigatePreserveEmbed: () => {},
    });
    const payload = '<img src=x onerror=alert(document.cookie)>';
    render(payload, payload);
    assert.equal(heading.textContent, payload);
    assert.equal(detail.textContent, payload);
    assert.equal(panel.innerHTML.includes(payload), false);
    assert.equal(typeof retry.onclick, 'function');
});

test('Games: texto de jugadores se escapa antes de insertar en templates HTML', () => {
    const cases = [
        ['web/public/games/cards/unoClient.js', 'escapeUnoText', 3],
        ['web/public/games/trivia/trivia.js', 'escapeTriviaText', 2],
        ['web/public/games/casino/crash.js', 'escapeCrashText', 1],
        ['web/public/games/survivor/survivor.js', 'escapeSurvivorText', 1],
    ];
    for (const [file, helper, minimumCalls] of cases) {
        const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
        const fnStart = source.indexOf('function ' + helper + '(value) {');
        const fnEnd = source.indexOf('\n}', fnStart);
        assert.ok(fnStart !== -1 && fnEnd > fnStart, file);
        const sanitize = vm.runInNewContext(source.slice(fnStart, fnEnd + 2) + '\n' + helper);
        assert.equal(sanitize('<img src=x onerror="x">'), '&lt;img src=x onerror=&quot;x&quot;&gt;');
        assert.equal(sanitize("D'Artagnan & Co"), 'D&#39;Artagnan &amp; Co');
        assert.ok(source.split(helper + '(').length - 2 >= minimumCalls, file + ' no escapa todos los nombres');
    }
});

test('Games: identidad validada nunca se reemplaza por un nombre o avatar recibido desde WS', () => {
    const server = fs.readFileSync(path.join(ROOT, 'games_server.js'), 'utf8');
    assert.doesNotMatch(server, /AuthManager\.setSessionMeta\(rawToken,/);
    assert.doesNotMatch(server, /\|\| clientHintName\s*\|\|/);
    assert.doesNotMatch(server, /refreshed\.user\?\.avatar\s*\|\|\s*data\.avatar/);
});
