// ═══ EVENTO: guildBanAdd (Log de Baneos) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'guildBanAdd',
    once: false,
    async execute(ban) {
        const logChannelId = config.CHANNELS.LOGS;
        const logChannel = ban.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        let executor = 'Desconocido';
        let reason = ban.reason || 'Sin razón especificada';

        try {
            const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: 22 }); // MemberBanAdd
            const banLog = fetchedLogs.entries.first();
            if (banLog && banLog.target.id === ban.user.id && Date.now() - banLog.createdTimestamp < 5000) {
                executor = `<@${banLog.executor.id}> (\`${banLog.executor.id}\`)`;
                if (!ban.reason && banLog.reason) reason = banLog.reason;
            }
        } catch (e) { }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR || 0xEF5350)
            .setAuthor({ name: '🔨 Usuario Baneado' })
            .setDescription(
                `> **Usuario:** ${ban.user.tag} (\`${ban.user.id}\`)\n` +
                `> **Motivo:** *${reason}*\n` +
                `> **Baneado por:** ${executor}`
            )
            .setThumbnail(ban.user.displayAvatarURL({ size: 64 }))
            .setFooter({ text: 'Prophet · Log de Moderación' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};
