// ═══ EVENTO: guildMemberUpdate (Log de cambios de Roles/Nicknames + Boost Rewards) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');

module.exports = {
    name: 'guildMemberUpdate',
    once: false,
    async execute(oldMember, newMember) {
        if (oldMember.user.bot) return;

        // ─── BOOST REWARDS ──────────────────────────────────────────
        const acabaDeBoostear = !oldMember.premiumSinceTimestamp && newMember.premiumSinceTimestamp;

        if (acabaDeBoostear) {
            const boostCoins = config.ECONOMIA?.BOOST_REWARD || 5000;
            const currency = config.ECONOMIA?.CURRENCY || '💰';

            // Dar monedas al booster
            if (boostCoins > 0) {
                stmts.addMoney(newMember.id, boostCoins, 'balance');
            }

            // DM al booster
            try {
                await newMember.user.send({
                    embeds: [new EmbedBuilder()
                        .setColor(0xFF73FA)
                        .setAuthor({ name: '💎  ¡Gracias por boostear!', iconURL: newMember.guild.iconURL() })
                        .setDescription(
                            `> ¡Muchas gracias por apoyar **${newMember.guild.name}**, **${newMember.user.username}**! 🎉\n\n` +
                            `> 💰 Recibiste **${currency} ${boostCoins.toLocaleString()}** como recompensa de boost.\n` +
                            `> El servidor aprecia tu apoyo. ¡Sos un crack! 💪`
                        )
                        .setThumbnail(newMember.guild.iconURL({ size: 256 }))
                        .setFooter({ text: `Prophet Gaming  ·  Boost activo desde hoy` })
                        .setTimestamp()
                    ]
                });
            } catch (_) { /* DMs cerrados */ }

            // Anuncio en canal general/bienvenida
            const announceId = config.CANALES?.BIENVENIDA || config.CHANNELS?.GENERAL || null;
            if (announceId) {
                const ch = newMember.guild.channels.cache.get(announceId);
                if (ch) {
                    await ch.send({
                        embeds: [new EmbedBuilder()
                            .setColor(0xFF73FA)
                            .setAuthor({ name: '💎  ¡Nuevo Booster!', iconURL: newMember.user.displayAvatarURL() })
                            .setDescription(
                                `> ✨ ${newMember} **boosteó el servidor** y ganó **${currency} ${boostCoins.toLocaleString()}**!\n` +
                                `> 🌟 ¡Gracias por apoyar a Prophet Gaming! 💜`
                            )
                            .setFooter({ text: `Prophet Gaming  ·  ¡Sumá boosts para desbloquear más features!` })
                            .setTimestamp()
                        ]
                    }).catch(() => { });
                }
            }
        }
        // ────────────────────────────────────────────────────────────

        const logChannelId = config.CHANNELS.LOGS;
        const logChannel = newMember.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        // Comprobar cambio de apodo
        if (oldMember.nickname !== newMember.nickname) {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.INFO || 0x42A5F5)
                .setAuthor({ name: '✏️ Apodo cambiado', iconURL: newMember.user.displayAvatarURL() })
                .setDescription(
                    `> **Usuario:** ${newMember} (\`${newMember.id}\`)\n\n` +
                    `> **Antes:** \`${oldMember.nickname || oldMember.user.username}\`\n` +
                    `> **Después:** \`${newMember.nickname || newMember.user.username}\``
                )
                .setFooter({ text: 'Prophet · Log de Usuario' })
                .setTimestamp();

            return logChannel.send({ embeds: [embed] }).catch(() => { });
        }

        // Comprobar cambio de roles
        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        if (oldRoles.size !== newRoles.size) {
            const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
            const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

            if (addedRoles.size > 0 || removedRoles.size > 0) {

                let description = `> **Usuario:** ${newMember} (\`${newMember.id}\`)\n\n`;
                if (addedRoles.size > 0) {
                    description += `> ➕ **Roles Añadidos:** ${addedRoles.map(r => r.name).join(', ')}\n`;
                }
                if (removedRoles.size > 0) {
                    description += `> ➖ **Roles Removidos:** ${removedRoles.map(r => r.name).join(', ')}\n`;
                }

                const embed = new EmbedBuilder()
                    .setColor(addedRoles.size > 0 ? (config.COLORES.SUCCESS || 0x69F0AE) : (config.COLORES.WARN || 0xFFB74D))
                    .setAuthor({ name: '🛡️ Roles Actualizados', iconURL: newMember.user.displayAvatarURL() })
                    .setDescription(description)
                    .setFooter({ text: 'Prophet · Log de Usuario' })
                    .setTimestamp();

                return logChannel.send({ embeds: [embed] }).catch(() => { });
            }
        }
    }
};
