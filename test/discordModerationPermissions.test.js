const test = require('node:test');
const assert = require('node:assert/strict');

const commands = [
    'ban', 'kick', 'mute', 'purge', 'slowmode',
    'warn', 'warns', 'tempban', 'mod-notes',
];

for (const name of commands) {
    test(`/${name}: exige permisos también al ejecutar (no solo al registrar)`, async () => {
        const command = require(`../commands/mod/${name}.js`);
        assert.ok(command.data.toJSON().default_member_permissions,
            'Debe declarar permisos mínimos para Discord');
        const replies = [];
        const interaction = {
            inGuild: () => true,
            memberPermissions: { has: () => false },
            reply: async answer => replies.push(answer),
        };
        await command.execute(interaction);
        assert.equal(replies.length, 1);
        assert.match(String(replies[0].content), /permisos/i);
        assert.equal(replies[0].flags || (replies[0].ephemeral ? 64 : 0), 64,
            'Denegaciones de moderación deben ser privadas');
    });
}

test('/reactionroles: no permite crear paneles a usuarios sin permisos', async () => {
    const command = require('../commands/admin/reactionroles');
    const messages = [];
    await command.execute({
        inGuild: () => true,
        memberPermissions: { has: () => false },
        reply: async m => messages.push(m),
    });
    assert.equal(messages.length, 1);
    assert.match(messages[0].content, /administrador/i);
});
