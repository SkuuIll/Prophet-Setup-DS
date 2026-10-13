const test = require('node:test');
const assert = require('node:assert/strict');
const { PermissionFlagsBits } = require('discord.js');
const handler = require('../events/interactionCreate');
const advanced = require('../modules/advancedMod');

function button(authorized, reply) {
    return {
        customId: 'notes_export_123456789012345678',
        isButton: () => true,
        isChatInputCommand: () => false,
        inGuild: () => true,
        memberPermissions: {
            has: value => authorized && value === PermissionFlagsBits.ModerateMembers,
        },
        guildId: '987654321098765432',
        reply,
    };
}

test('Notas: exportación privada solo disponible para moderadores', async () => {
    let payload;
    await handler.execute(button(false, async msg => { payload = msg; }), {});
    assert.equal(payload.flags, 64);
    assert.equal(payload.files, undefined);
});

test('Notas: exportación validada, limitada y adjunta a respuesta privada', async t => {
    const original = advanced.getUserModNotes;
    advanced.getUserModNotes = (userId, guildId) => {
        assert.equal(userId, '123456789012345678');
        assert.equal(guildId, '987654321098765432');
        return [{ id: 3, note_type: 'warning', created_by: '999',
            created_at: Date.now(), note: 'Nota privada de moderación' }];
    };
    t.after(() => { advanced.getUserModNotes = original; });
    let payload;
    await handler.execute(button(true, async msg => { payload = msg; }), {});
    assert.equal(payload.flags, 64);
    assert.equal(payload.files.length, 1);
    assert.match(payload.files[0].attachment.toString('utf8'), /Nota privada de moderación/);
    assert.equal(payload.allowedMentions.parse.length, 0);
});
