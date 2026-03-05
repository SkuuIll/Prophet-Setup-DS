// ═══ EVENTO: guildBanRemove (Log de Desbaneos) ═══

const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'guildBanRemove',
    once: false,
    async execute(ban) {
        const logChannel = ban.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (!logChannel) return;

        let executor = null;
        try {
            const logs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanRemove });
            const entry = logs.entries.first();
            if (entry && entry.target.id === ban.user.id && Date.now() - entry.createdTimestamp < 5000) {
                executor = entry.executor;
            }
        } catch (e) { }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setAuthor({
                name: '🔓  Usuario Desbaneado',
                iconURL: executor?.displayAvatarURL() || ban.guild.iconURL()
            })
            .setDescription(
                `> **Usuario:** ${ban.user.username} (\`${ban.user.id}\`)\n` +
                `> **Cuenta creada:** <t:${Math.floor(ban.user.createdTimestamp / 1000)}:R>\n` +
                (executor ? `> **Desbaneado por:** <@${executor.id}>\n` : `> **Desbaneado por:** Automático (tempban expirado)\n`)
            )
            .setThumbnail(ban.user.displayAvatarURL({ size: 128 }))
            .setFooter({ text: 'Prophet  ·  Log de Moderación' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};
