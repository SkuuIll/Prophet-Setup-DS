const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ShoukakuOptions } = require('../modules/shoukakuEngine');

test('Shoukaku v4: intervalos correctos expresados en segundos', () => {
    assert.equal(ShoukakuOptions.reconnectTries, 10);
    assert.equal(ShoukakuOptions.reconnectInterval, 5);
    assert.equal(ShoukakuOptions.restTimeout, 15);
    assert.ok(ShoukakuOptions.reconnectInterval < 60,
        'Un intervalo en miles de segundos impide volver a conectar después de iniciar Lavalink');
    assert.ok(ShoukakuOptions.restTimeout < 120);
});

test('Music: las respuestas de errores no envían detalles internos de conexión', () => {
    const entry = fs.readFileSync(path.resolve(__dirname, '..', 'music_bot.js'), 'utf8');
    const engine = fs.readFileSync(path.resolve(__dirname, '..', 'modules/musicEngine.js'), 'utf8');
    assert.doesNotMatch(entry, /setDescription\([^;]*error\.message/s);
    assert.doesNotMatch(engine, /setDescription\([^;]*error\.message/s);
    assert.match(entry, /const \{ notice \} = require\('\.\/utils\/discordUI'\)/);
    assert.match(engine, /allowedMentions: \{ parse: \[\] \}/);
});
