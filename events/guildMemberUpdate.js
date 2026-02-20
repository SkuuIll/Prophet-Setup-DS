// ═══ EVENTO: guildMemberUpdate (Log de cambios de Roles/Nicknames) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'guildMemberUpdate',
    once: false,
    async execute(oldMember, newMember) {
        if (oldMember.user.bot) return;

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
