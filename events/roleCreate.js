// ═══ EVENTO: roleCreate (Log de creación de rol) ═══

const { EmbedBuilder, AuditLogEvent, PermissionsBitField } = require('discord.js');
const config = require('../config');

// Permisos considerados "peligrosos" que vale la pena marcar
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
    name: 'roleCreate',
    once: false,
    async execute(role) {
        const logChannel = role.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (!logChannel) return;

        let executor = null;
        try {
            const logs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleCreate });
            const entry = logs.entries.first();
            if (entry && Date.now() - entry.createdTimestamp < 5000) {
                executor = entry.executor;
            }
        } catch (e) { }

        // Detectar permisos peligrosos
        const permsPeligrosos = PERMS_PELIGROSOS
            .filter(([flag]) => role.permissions.has(flag))
            .map(([, name]) => name);

        const embed = new EmbedBuilder()
            .setColor(role.hexColor !== '#000000' ? role.hexColor : (config.COLORES.SUCCESS || 0x69F0AE))
            .setAuthor({
                name: '🏷️  Rol Creado',
                iconURL: executor?.displayAvatarURL() || role.guild.iconURL()
            })
            .setDescription(
                `> **Nombre:** ${role.toString()} (\`${role.id}\`)\n` +
                `> **Color:** \`${role.hexColor}\`\n` +
                `> **Posición:** \`${role.position}\`\n` +
                `> **Hoisted:** ${role.hoist ? '✅ Sí' : '❌ No'}  ·  **Mentionable:** ${role.mentionable ? '✅ Sí' : '❌ No'}\n` +
                (executor ? `> **Creado por:** <@${executor.id}>\n` : '')
            )
            .setFooter({ text: 'Prophet  ·  Log de Servidor' })
            .setTimestamp();

        if (permsPeligrosos.length > 0) {
            embed.addFields({
                name: '⚠️ Permisos sensibles detectados',
                value: permsPeligrosos.join('\n')
            });
        }

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};
