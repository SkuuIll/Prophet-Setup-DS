const test = require('node:test');
const assert = require('node:assert/strict');
const { PermissionsBitField, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { canExecuteRegisteredCommand } = require('../utils/commandPermissions');

test('Comandos públicos no requieren permisos especiales', () => {
    const command = new SlashCommandBuilder().setName('ayuda').setDescription('help');
    assert.equal(canExecuteRegisteredCommand(command, null), true);
});

test('Cada comando de administración valida permisos al ejecutar', () => {
    const command = new SlashCommandBuilder()
        .setName('setup').setDescription('Setup')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
    const noRights = new PermissionsBitField(PermissionFlagsBits.ViewChannel);
    const manager = new PermissionsBitField(PermissionFlagsBits.ManageGuild);
    assert.equal(canExecuteRegisteredCommand(command, noRights), false);
    assert.equal(canExecuteRegisteredCommand(command, null), false);
    assert.equal(canExecuteRegisteredCommand(command, manager), true);
});

test('El comando deshabilitado y metadatos corruptos se rechazan', () => {
    const command = new SlashCommandBuilder()
        .setName('desactivado').setDescription('disabled')
        .setDefaultMemberPermissions(0n);
    const administrator = new PermissionsBitField(PermissionFlagsBits.Administrator);
    assert.equal(canExecuteRegisteredCommand(command, administrator), false);
    assert.equal(canExecuteRegisteredCommand({}, administrator), false);
    assert.equal(canExecuteRegisteredCommand({
        toJSON: () => ({ default_member_permissions: 'invalid' })
    }, administrator), false);
});
