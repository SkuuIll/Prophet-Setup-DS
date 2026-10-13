const test = require('node:test');
const assert = require('node:assert/strict');
const { PermissionFlagsBits } = require('discord.js');

test('Snipe: el historial de mensajes borrados solo es visible para Staff', async () => {
    const cmd = require('../commands/utility/snipe');
    assert.equal(cmd.data.toJSON().default_member_permissions, String(PermissionFlagsBits.ManageMessages));
    let reply;
    await cmd.execute({
        inGuild: () => true,
        memberPermissions: { has: () => false },
        reply: async data => { reply = data; },
    });
    assert.equal(reply.flags, 64);
    assert.match(JSON.stringify(reply.embeds[0].toJSON()), /moderadores/);
});

test('/embed: valida imágenes y prohíbe publicar a usuarios normales', async () => {
    const cmd = require('../commands/utility/embed');
    assert.ok(cmd._test.safeImageUrl('https://example.com/a.png'));
    assert.equal(cmd._test.safeImageUrl('http://example.com/a.png'), null);
    assert.equal(cmd._test.safeImageUrl('javascript:alert(1)'), null);
    assert.equal(cmd._test.safeImageUrl('not a URL'), null);
    let reply;
    await cmd.execute({
        inGuild: () => true,
        memberPermissions: { has: () => false },
        reply: async data => { reply = data; },
    });
    assert.equal(reply.flags, 64);
});

test('/sorteo: restringe creación a administradores del servidor', async () => {
    const cmd = require('../commands/utility/sorteo');
    assert.equal(cmd.data.toJSON().default_member_permissions, String(PermissionFlagsBits.ManageGuild));
    let reply;
    await cmd.execute({
        inGuild: () => true,
        memberPermissions: { has: () => false },
        reply: async data => { reply = data; },
    });
    assert.equal(reply.flags, 64);
});

test('Los comandos no muestran mensajes internos de excepción en respuestas públicas', () => {
    const fs = require('node:fs'), path = require('node:path');
    const paths = [
        'commands/fun/anonimo.js', 'commands/fun/confesion.js',
        'commands/utility/canal.js', 'commands/utility/calculadora.js',
        'commands/gaming/cs2.js',
    ];
    for (const filename of paths) {
        const source = fs.readFileSync(path.resolve(__dirname, '..', filename), 'utf8');
        assert.doesNotMatch(source, /content:.*\$\{(?:error|err|e)\.message\}/, filename);
    }
});
