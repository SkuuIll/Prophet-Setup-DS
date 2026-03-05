// ═══ EVENTO: guildBanAdd (Log de Baneos) ═══

const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'guildBanAdd',
    once: false,
    async execute(ban) {
        const logChannel = ban.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (!logChannel) return;

        let executor = null;
        let reason = ban.reason || 'Sin razón especificada';

        try {
            const logs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
            const entry = logs.entries.first();
            if (entry && entry.target.id === ban.user.id && Date.now() - entry.createdTimestamp < 5000) {
                executor = entry.executor;
                if (!ban.reason && entry.reason) reason = entry.reason;
            }
        } catch (e) { }

        // Edad de la cuenta
        const cuentaTs = Math.floor(ban.user.createdTimestamp / 1000);
        const diasDesdeCuenta = Math.floor((Date.now() - ban.user.createdTimestamp) / 86400000);
        const cuentaJoven = diasDesdeCuenta < 30;

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR || 0xEF5350)
            .setAuthor({
                name: '🔨  Usuario Baneado',
                iconURL: executor?.displayAvatarURL() || ban.guild.iconURL()
            })
            .setDescription(
                `> **Usuario:** ${ban.user.username} (\`${ban.user.id}\`)\n` +
                `> **Cuenta creada:** <t:${cuentaTs}:R>  ${cuentaJoven ? '⚠️ *Cuenta nueva*' : ''}\n` +
                `> **Motivo:** *${reason}*\n` +
                (executor ? `> **Baneado por:** <@${executor.id}>\n` : `> **Baneado por:** Desconocido\n`)
            )
            .setThumbnail(ban.user.displayAvatarURL({ size: 128 }))
            .setFooter({ text: 'Prophet  ·  Log de Moderación' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};
