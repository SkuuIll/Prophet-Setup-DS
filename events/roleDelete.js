// ═══ EVENTO: roleDelete (Log de borrado de rol) ═══

const { EmbedBuilder, AuditLogEvent, PermissionsBitField } = require('discord.js');
const config = require('../config');

const PERMS_PELIGROSOS = [
    [PermissionsBitField.Flags.Administrator, '👑 Administrator'],
    [PermissionsBitField.Flags.ManageGuild, '⚙️ Manage Server'],
    [PermissionsBitField.Flags.ManageRoles, '🛡️ Manage Roles'],
    [PermissionsBitField.Flags.ManageChannels, '📁 Manage Channels'],
    [PermissionsBitField.Flags.BanMembers, '🔨 Ban Members'],
    [PermissionsBitField.Flags.KickMembers, '👢 Kick Members'],
    [PermissionsBitField.Flags.ManageMessages, '✏️ Manage Messages'],
    [PermissionsBitField.Flags.MentionEveryone, '📢 Mention Everyone'],
    [PermissionsBitField.Flags.ManageWebhooks, '🔗 Manage Webhooks'],
];

module.exports = {
    name: 'roleDelete',
    once: false,
    async execute(role) {
        const logChannel = role.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (!logChannel) return;

        let executor = null;
        try {
            const logs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete });
            const entry = logs.entries.first();
            if (entry && Date.now() - entry.createdTimestamp < 5000) {
                executor = entry.executor;
            }
        } catch (e) { }

        const permsPeligrosos = PERMS_PELIGROSOS
            .filter(([flag]) => role.permissions.has(flag))
            .map(([, name]) => name);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR || 0xEF5350)
            .setAuthor({
                name: '🗑️  Rol Eliminado',
                iconURL: executor?.displayAvatarURL() || role.guild.iconURL()
            })
            .setDescription(
                `> **Nombre:** \`@${role.name}\` (\`${role.id}\`)\n` +
                `> **Color:** \`${role.hexColor}\`\n` +
                `> **Miembros afectados:** \`${role.members.size}\`\n` +
                (executor ? `> **Eliminado por:** <@${executor.id}>\n` : '')
            )
            .setFooter({ text: 'Prophet  ·  Log de Servidor' })
            .setTimestamp();

        if (permsPeligrosos.length > 0) {
            embed.addFields({
                name: '⚠️ Tenía permisos sensibles',
                value: permsPeligrosos.join('\n')
            });
        }

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};
