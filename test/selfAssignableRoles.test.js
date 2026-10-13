const test = require('node:test');
const assert = require('node:assert/strict');
const { PermissionFlagsBits } = require('discord.js');
const { getSelfAssignableRoleError } = require('../utils/selfAssignableRoles');

const guild = { id: '123456789012345678',
    members: { me: { roles: { highest: { comparePositionTo: () => 1 } } } } };
const role = (id, name, flags = []) => ({
    id, name, managed: false, permissions: { has: p => flags.includes(p) },
});

test('Roles de juego normales siguen siendo autoasignables', () => {
    assert.equal(getSelfAssignableRoleError(
        role('234567890123456789', 'Minecraft'), guild, []), null);
});

test('Bloqueo de roles elevados incluso si se llaman como juegos', () => {
    for (const flag of [
        PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.BanMembers, PermissionFlagsBits.ModerateMembers,
    ]) {
        assert.ok(getSelfAssignableRoleError(role('234567890123456789',
            'VALORANT', [flag]), guild, []));
    }
});

test('Roles protegidos, managed y @everyone no se pueden añadir ni quitar', () => {
    assert.ok(getSelfAssignableRoleError(role('234567890123456789',
        'Miembros'), guild, ['234567890123456789']));
    assert.ok(getSelfAssignableRoleError(role('234567890123456789',
        'VIP'), guild, []));
    assert.ok(getSelfAssignableRoleError(role(guild.id, '@everyone'), guild, []));
    const managed = role('234567890123456789', 'CS2'); managed.managed = true;
    assert.ok(getSelfAssignableRoleError(managed, guild, []));
});

test('Respeta jerarquía del bot en el servidor', () => {
    const lowBotGuild = { id: guild.id,
        members: { me: { roles: { highest: { comparePositionTo: () => 0 } } } } };
    assert.match(getSelfAssignableRoleError(role('234567890123456789',
        'Fortnite'), lowBotGuild, []), /jerarquía/i);
});
