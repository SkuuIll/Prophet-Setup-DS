const test = require('node:test');
const assert = require('node:assert/strict');
const { PermissionsBitField, PermissionFlagsBits } = require('discord.js');
const help = require('../commands/utility/ayuda');

const mockCommand = (name, category, description, permissions = null) => ({
    data: {
        name,
        toJSON: () => ({ name, description, default_member_permissions: permissions }),
    },
    category,
});
const client = {
    commands: new Map([
        ['daily', mockCommand('daily', 'economy', 'Recompensa diaria')],
        ['balance', mockCommand('balance', 'economy', 'Consultar la cartera')],
        ['mod-notes', mockCommand('mod-notes', 'mod', 'Notas de moderación',
            String(PermissionFlagsBits.ModerateMembers))],
        ['setup', mockCommand('setup', 'admin', 'Configuración',
            String(PermissionFlagsBits.Administrator))],
        ['nivel', mockCommand('nivel', 'profile', 'Consultar XP')],
        ['Dar Coins', mockCommand('Dar Coins', 'context', 'Transferencia contextual')],
    ]),
};
const normal = new PermissionsBitField(PermissionFlagsBits.ViewChannel);
const elevated = new PermissionsBitField([
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.ModerateMembers,
]);

test('El menú muestra comandos reales y oculta los de moderación sin permisos', () => {
    assert.deepEqual(help._test.getCategoryCommands(client, 'economy', normal).map(x => x.name),
        ['balance', 'daily']);
    assert.equal(help._test.getCategoryCommands(client, 'moderation', normal).length, 0);
    assert.equal(help._test.getCategoryCommands(client, 'admin', normal).length, 0);
    assert.equal(help._test.getCategoryCommands(client, 'moderation', elevated).length, 1);
    assert.equal(help._test.getCategoryCommands(client, 'admin', elevated).length, 1);
});

test('El menú separa niveles y comandos contextuales sin inventar slash commands', () => {
    const levels = help._test.getCategoryCommands(client, 'levels', normal);
    assert.equal(levels[0].name, 'nivel');
    const context = help._test.viewFor(client, { username: 'Jugador' }, normal, 'context');
    assert.match(context.embed.data.description, /Clic derecho sobre un usuario/);
    assert.doesNotMatch(context.embed.data.description, /\/Dar Coins/);
    assert.equal(help._test.componentsFor(context).length, 2);
});

test('El menú principal no anuncia comandos administrativos que no puedo usar', () => {
    const view = help._test.viewFor(client, { username: 'Jugador' }, normal, 'home');
    assert.ok(!view.options.some(x => x.id === 'moderation'));
    assert.ok(!view.options.some(x => x.id === 'admin'));
    assert.match(view.embed.data.title, /Prophet/);
    const music = help._test.getCategoryCommands(client, 'music', normal);
    assert.ok(music.some(x => x.name === 'play'));
});

test('Paginación desactiva navegación fuera de sus límites', () => {
    const view = help._test.viewFor(client, { username: 'Jugador' }, normal, 'economy');
    const rows = help._test.componentsFor(view);
    assert.equal(rows[1].components[0].data.disabled, true);
    assert.equal(rows[1].components[2].data.disabled, true);
    const expired = help._test.componentsFor(view, true);
    assert.equal(expired[0].components[0].data.disabled, true);
});
