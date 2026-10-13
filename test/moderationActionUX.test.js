const test = require('node:test');
const assert = require('node:assert/strict');
const { PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../database');

const SPECS = [
    ['ban', 'BanMembers', 'bannable'],
    ['kick', 'KickMembers', 'kickable'],
    ['mute', 'ModerateMembers', 'moderatable'],
];
for (const [name, permissionName, actionKey] of SPECS) {
    test('/' + name + ': confirma la operación antes de notificar y oculta errores internos', async t => {
        const old = stmts.addLog;
        stmts.addLog = () => {};
        t.after(() => { stmts.addLog = old; });
        const cmd = require('../commands/mod/' + name);
        let actualActions = 0;
        const inbox = [], responses = [];
        const target = {
            id: '234567890123456789', user: {
                tag: 'Jugador', displayAvatarURL: () => 'https://example.com/avatar.png',
                send: async x => { inbox.push(x); },
            },
            bannable: true, kickable: true, moderatable: true,
            ban: async () => { actualActions++; },
            kick: async () => { actualActions++; },
            timeout: async () => { actualActions++; },
        };
        const interaction = {
            inGuild: () => true, memberPermissions: { has: p => p === PermissionFlagsBits[permissionName] },
            options: {
                getMember: () => target, getString: () => 'Incumplimiento de las reglas',
                getInteger: () => name === 'mute' ? 10 : 0,
            },
            user: { id: '111111111111111111', tag: 'Mod#1' },
            guild: { name: 'Prophet Gaming', channels: { cache: { get: () => null } } },
            channelId: '999',
            reply: async x => { responses.push(x); },
        };
        await cmd.execute(interaction);
        assert.equal(actualActions, 1);
        assert.equal(responses.length, 1);
        assert.equal(inbox.length, 1);
        assert.match(responses[0].embeds[0].toJSON().title || responses[0].embeds[0].toJSON().author.name, /[Bb]aneado|[Ee]xpulsado|[Ss]ilenciado/);
        assert.equal(responses[0].allowedMentions.parse.length, 0);
    });
    test('/' + name + ': sin autorización de Discord no envía DM de acción', async () => {
        const cmd = require('../commands/mod/' + name);
        let sentDM = false, response;
        const target = {
            id: '222222222222222222',
            user: { tag: 'Miembro', send: async () => { sentDM = true; } },
            bannable: true, kickable: true, moderatable: true,
            ban: async () => { throw new Error('SECRET_NO_SE_DEBE_PUBLICAR'); },
            kick: async () => { throw new Error('SECRET_NO_SE_DEBE_PUBLICAR'); },
            timeout: async () => { throw new Error('SECRET_NO_SE_DEBE_PUBLICAR'); },
        };
        const realError = console.error; console.error = () => {};
        try {
            await cmd.execute({
                inGuild: () => true,
                memberPermissions: { has: () => true },
                options: {
                    getMember: () => target,
                    getString: () => 'Incumplimiento',
                    getInteger: () => name === 'mute' ? 10 : 0,
                },
                user: { id: '333333333333333333' },
                reply: async x => { response = x; },
            });
            assert.equal(sentDM, false);
            assert.equal(response.flags, 64);
            assert.doesNotMatch(JSON.stringify(response), /SECRET_NO_SE_DEBE_PUBLICAR/);
        } finally { console.error = realError; }
    });
}
