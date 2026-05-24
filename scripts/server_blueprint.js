#!/usr/bin/env node
require('dotenv').config();

const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const config = require('../config');
const { stmts } = require('../database');

const MODE_AUDIT = 'audit';
const MODE_APPLY = 'apply';

const COMMUNITY_CATEGORY = '⟬💬⟭ ═══ 𝗖𝗢𝗠𝗨𝗡𝗜𝗗𝗔𝗗 ═══';
const INFO_CATEGORY = '⟬⚡⟭ ═══ 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗖𝗜𝗢𝗡 ═══';
const STAFF_CATEGORY = '⟬🛡️⟭ ═══ 𝗦𝗧𝗔𝗙𝗙 ═══';
const TEMP_VOICE_CATEGORY = '⟬🔊⟭ ═══ 𝗦𝗔𝗟𝗔𝗦 𝗧𝗘𝗠𝗣𝗢𝗥𝗔𝗟𝗘𝗦 ═══';

const STAFF_ROLE_NAMES = ['👑 Prophet', '🛡️ Staff', '⚔️ Moderador', 'Prophet Setup', '🤖 Bots'];

const CHANNEL_SPECS = [
    { name: '👋・bienvenidos', type: 'readonly', parent: INFO_CATEGORY, configKey: 'BIENVENIDOS' },
    { name: '📜・reglas', type: 'readonly', parent: INFO_CATEGORY, configKey: 'REGLAS' },
    { name: '📢・anuncios', type: 'onboarding-open', parent: INFO_CATEGORY, configKey: 'ANUNCIOS' },
    { name: '🏷️・roles', type: 'readonly', parent: INFO_CATEGORY, configKey: 'ROLES' },
    { name: '📁・archivos', type: 'files', parent: INFO_CATEGORY },
    { name: '💬・chat', type: 'files', parent: COMMUNITY_CATEGORY, configKey: 'CHAT' },
    { name: '💎・chat-vip', type: 'vip', parent: COMMUNITY_CATEGORY },
    { name: '🖼️・multimedia', type: 'files', parent: COMMUNITY_CATEGORY },
    { name: '❓・soporte', type: 'files', parent: COMMUNITY_CATEGORY },
    { name: '🤖・bot-comandos', type: 'files', parent: COMMUNITY_CATEGORY, configKey: 'COMANDOS_BOT' },
    { name: '🖥️・streams', type: 'readonly', parent: COMMUNITY_CATEGORY },
    { name: '💡・sugerencias', type: 'suggestions', parent: COMMUNITY_CATEGORY, configKey: 'SUGERENCIAS_CHANNEL' },
    { name: '🕵️・confesiones', type: 'readonly', parent: COMMUNITY_CATEGORY, configKey: 'CONFESIONES_CHANNEL' },
    { name: '🔢・counting', type: 'counting', parent: COMMUNITY_CATEGORY, configKey: 'COUNTING_CHANNEL' },
    { name: '🛡️・chat-staff', type: 'staff', parent: STAFF_CATEGORY, configKey: 'STAFF' },
    { name: '📋・reportes', type: 'staff', parent: STAFF_CATEGORY, configKey: 'REPORTES' },
    { name: '⚙️・logs', type: 'staff', parent: STAFF_CATEGORY, configKey: 'LOGS' },
];

const CONFIG_EXTRAS = {
    voice_generator_id: '➕ Crear Sala',
    voice_category_id: TEMP_VOICE_CATEGORY,
};

function getMode() {
    return process.argv.includes('--apply') ? MODE_APPLY : MODE_AUDIT;
}

function getOverwriteForType(type) {
    switch (type) {
    case 'files':
        return { ViewChannel: true, SendMessages: true, AttachFiles: true, EmbedLinks: true, ReadMessageHistory: true };
    case 'readonly':
        return { ViewChannel: true, SendMessages: false, AttachFiles: false, EmbedLinks: false, ReadMessageHistory: true };
    case 'suggestions':
        return { ViewChannel: true, SendMessages: false, AttachFiles: false, EmbedLinks: false, ReadMessageHistory: true, AddReactions: true };
    case 'counting':
        return { ViewChannel: true, SendMessages: true, AttachFiles: false, EmbedLinks: false, ReadMessageHistory: true };
    case 'staff':
        return { ViewChannel: false };
    case 'vip':
        return { ViewChannel: false };
    case 'onboarding-open':
        return { ViewChannel: true, SendMessages: true, AttachFiles: false, EmbedLinks: false, ReadMessageHistory: true };
    default:
        return { ViewChannel: true, SendMessages: true, ReadMessageHistory: true };
    }
}

function getStaffOverwrite() {
    return { ViewChannel: true, SendMessages: true, AttachFiles: true, EmbedLinks: true, ReadMessageHistory: true };
}

function summarizePermissionResult(channel, role, expected) {
    const permissions = channel.permissionsFor(role);
    return Object.entries(expected)
        .filter(([name, value]) => permissions.has(name) !== value)
        .map(([name, value]) => `${name}=${value ? 'Y' : 'n'}`);
}

async function main() {
    const mode = getMode();
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    await client.login(config.TOKEN);

    try {
        const guild = await client.guilds.fetch(config.GUILD_ID);
        await guild.roles.fetch();
        await guild.channels.fetch();

        const everyone = guild.roles.everyone;
        const staffRoles = STAFF_ROLE_NAMES.map(name => guild.roles.cache.find(role => role.name === name)).filter(Boolean);
        const categoriesByName = new Map(
            guild.channels.cache
                .filter(channel => channel.type === ChannelType.GuildCategory)
                .map(channel => [channel.name, channel])
        );

        const report = [];

        for (const spec of CHANNEL_SPECS) {
            let channel = guild.channels.cache.find(item => item.name === spec.name);
            const parent = categoriesByName.get(spec.parent) || null;

            if (!channel && mode === MODE_APPLY) {
                channel = await guild.channels.create({
                    name: spec.name,
                    type: ChannelType.GuildText,
                    parent: parent?.id || undefined,
                });
                report.push(`Creado canal ${spec.name}`);
            }

            if (!channel) {
                report.push(`Falta canal ${spec.name}`);
                continue;
            }

            if (parent && channel.parentId !== parent.id) {
                if (mode === MODE_APPLY) {
                    await channel.setParent(parent.id);
                    report.push(`Movido ${spec.name} a ${spec.parent}`);
                } else {
                    report.push(`${spec.name}: parent esperado ${spec.parent}`);
                }
            }

            const everyoneExpected = getOverwriteForType(spec.type);
            const everyoneDiffs = summarizePermissionResult(channel, everyone, everyoneExpected);
            if (everyoneDiffs.length > 0) {
                if (mode === MODE_APPLY) {
                    await channel.permissionOverwrites.edit(everyone, everyoneExpected);
                    report.push(`${spec.name}: overwrite @everyone actualizado`);
                } else {
                    report.push(`${spec.name}: drift @everyone -> ${everyoneDiffs.join(', ')}`);
                }
            }

            if (spec.type === 'readonly' || spec.type === 'suggestions' || spec.type === 'staff' || spec.type === 'counting') {
                for (const role of staffRoles) {
                    const expected = spec.type === 'staff' ? getStaffOverwrite() : getStaffOverwrite();
                    const diffs = summarizePermissionResult(channel, role, expected);
                    if (diffs.length > 0) {
                        if (mode === MODE_APPLY) {
                            await channel.permissionOverwrites.edit(role, expected);
                            report.push(`${spec.name}: overwrite ${role.name} actualizado`);
                        } else {
                            report.push(`${spec.name}: drift ${role.name} -> ${diffs.join(', ')}`);
                        }
                    }
                }
            }

            if (spec.configKey) {
                const current = stmts.getConfig(spec.configKey)?.value || null;
                if (current !== channel.id) {
                    if (mode === MODE_APPLY) {
                        stmts.setConfig(spec.configKey, channel.id);
                        report.push(`${spec.configKey}: guardado ${channel.id}`);
                    } else {
                        report.push(`${spec.configKey}: esperado ${channel.id}, actual ${current || '<unset>'}`);
                    }
                }
            }
        }

        for (const [key, channelName] of Object.entries(CONFIG_EXTRAS)) {
            const channel = guild.channels.cache.find(item => item.name === channelName);
            if (!channel) {
                report.push(`${key}: no encontrado ${channelName}`);
                continue;
            }
            const current = stmts.getConfig(key)?.value || null;
            if (current !== channel.id) {
                if (mode === MODE_APPLY) {
                    stmts.setConfig(key, channel.id);
                    report.push(`${key}: guardado ${channel.id}`);
                } else {
                    report.push(`${key}: esperado ${channel.id}, actual ${current || '<unset>'}`);
                }
            }
        }

        if (mode === MODE_APPLY) {
            stmts.setConfig('COUNTING_CURRENT', 0);
            stmts.setConfig('COUNTING_LAST_USER', null);
        }

        console.log(`Modo: ${mode}`);
        if (!report.length) {
            console.log('Sin desvíos detectados.');
        } else {
            report.forEach(line => console.log(`- ${line}`));
        }
    } finally {
        client.destroy();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
