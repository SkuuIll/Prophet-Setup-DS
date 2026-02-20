// ═══ EVENTO: guildBanRemove (Log de Desbaneos) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'guildBanRemove',
    once: false,
    async execute(ban) {
        const logChannelId = config.CHANNELS.LOGS;
        const logChannel = ban.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        let executor = 'Desconocido';
        try {
            const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: 23 }); // MemberBanRemove
            const unbanLog = fetchedLogs.entries.first();
            if (unbanLog && unbanLog.target.id === ban.user.id && Date.now() - unbanLog.createdTimestamp < 5000) {
                executor = `<@${unbanLog.executor.id}> (\`${unbanLog.executor.id}\`)`;
            }
        } catch (e) { }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setAuthor({ name: '🔓 Usuario Desbaneado' })
            .setDescription(
                `> **Usuario:** ${ban.user.tag} (\`${ban.user.id}\`)\n` +
                `> **Desbaneado por:** ${executor}`
            )
            .setThumbnail(ban.user.displayAvatarURL({ size: 64 }))
            .setFooter({ text: 'Prophet · Log de Moderación' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};
