const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');

module.exports = {
    name: 'guildMemberUpdate',
    once: false,
    async execute(oldMember, newMember) {
        if (oldMember.user.bot) return;

        const acabaDeBoostear = !oldMember.premiumSinceTimestamp && newMember.premiumSinceTimestamp;
        if (acabaDeBoostear) {
            const boostCoins = config.ECONOMIA?.BOOST_REWARD || 5000;
            const currency = config.ECONOMIA?.CURRENCY || '💰';

            if (boostCoins > 0) {
                stmts.addMoney(newMember.id, boostCoins, 'balance');
            }

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
                        .setFooter({ text: 'Prophet Gaming  ·  Boost activo desde hoy' })
                        .setTimestamp()],
                });
            } catch (_) {
            }

            const announceId = config.CHANNELS.BIENVENIDOS || config.CHANNELS.ANUNCIOS || config.CHANNELS.CHAT || null;
            if (announceId) {
                const channel = newMember.guild.channels.cache.get(announceId);
                if (channel) {
                    await channel.send({
                        embeds: [new EmbedBuilder()
                            .setColor(0xFF73FA)
                            .setAuthor({ name: '💎  ¡Nuevo Booster!', iconURL: newMember.user.displayAvatarURL() })
                            .setDescription(
                                `> ✨ ${newMember} **boosteó el servidor** y ganó **${currency} ${boostCoins.toLocaleString()}**!\n` +
                                `> 🌟 ¡Gracias por apoyar a Prophet Gaming! 💜`
                            )
                            .setFooter({ text: 'Prophet Gaming  ·  ¡Sumá boosts para desbloquear más features!' })
                            .setTimestamp()],
                    }).catch(() => { });
                }
            }
        }

        const logChannel = newMember.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (!logChannel) return;

        if (oldMember.nickname !== newMember.nickname) {
            let changedBy = null;
            try {
                const logs = await newMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberUpdate });
                const entry = logs.entries.first();
                if (entry && entry.target.id === newMember.id && Date.now() - entry.createdTimestamp < 5000 && entry.executor.id !== newMember.id) {
                    changedBy = entry.executor;
                }
            } catch (_) {
            }

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.INFO || 0x42A5F5)
                .setAuthor({ name: '✏️  Apodo cambiado', iconURL: newMember.user.displayAvatarURL() })
                .setDescription(
                    `> **Usuario:** ${newMember} (\`${newMember.id}\`)\n` +
                    (changedBy ? `> **Cambiado por:** <@${changedBy.id}>\n` : '') +
                    `\n> **Antes:** \`${oldMember.nickname || oldMember.user.username}\`\n` +
                    `> **Después:** \`${newMember.nickname || newMember.user.username}\``
                )
                .setThumbnail(newMember.user.displayAvatarURL({ size: 128 }))
                .setFooter({ text: 'Prophet  ·  Log de Usuario' })
                .setTimestamp();

            await logChannel.send({ embeds: [embed] }).catch(() => { });
        }

        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        // Detectar cambios de roles comparando IDs, no solo cantidad
        const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
        const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));
        if (addedRoles.size === 0 && removedRoles.size === 0) return;

        let executor = null;
        try {
            const logs = await newMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberRoleUpdate });
            const entry = logs.entries.first();
            if (entry && entry.target.id === newMember.id && Date.now() - entry.createdTimestamp < 5000) {
                executor = entry.executor;
            }
        } catch (_) {
        }

        let description = `> **Usuario:** ${newMember} (\`${newMember.id}\`)\n`;
        if (executor) description += `> **Modificado por:** <@${executor.id}>\n`;
        description += '\n';

        if (addedRoles.size > 0) {
            description += `> ➕ **Roles añadidos:** ${addedRoles.map(role => `<@&${role.id}>`).join(', ')}\n`;
        }
        if (removedRoles.size > 0) {
            description += `> ➖ **Roles removidos:** ${removedRoles.map(role => `<@&${role.id}>`).join(', ')}\n`;
        }

        const embed = new EmbedBuilder()
            .setColor(addedRoles.size > 0 ? (config.COLORES.SUCCESS || 0x69F0AE) : (config.COLORES.WARN || 0xFFB74D))
            .setAuthor({ name: '🛡️  Roles actualizados', iconURL: newMember.user.displayAvatarURL() })
            .setDescription(description)
            .setThumbnail(newMember.user.displayAvatarURL({ size: 128 }))
            .setFooter({ text: 'Prophet  ·  Log de Usuario' })
            .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(() => { });
    },
};
