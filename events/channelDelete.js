// ═══ EVENTO: channelDelete (Log de borrado de canales) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'channelDelete',
    once: false,
    async execute(channel) {
        if (!channel.guild) return;

        const logChannelId = config.CHANNELS.LOGS;
        const logChannel = channel.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        let executor = 'Desconocido';
        try {
            const fetchedLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: 12 }); // ChannelDelete
            const deletionLog = fetchedLogs.entries.first();
            if (deletionLog && Date.now() - deletionLog.createdTimestamp < 5000) {
                executor = `<@${deletionLog.executor.id}> (\`${deletionLog.executor.id}\`)`;
            }
        } catch (e) { }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR || 0xEF5350)
            .setAuthor({ name: '🗑️ Canal Eliminado' })
            .setDescription(
                `> **Nombre:** ${channel.name} (\`${channel.id}\`)\n` +
                `> **Tipo:** \`${channel.type}\`\n` +
                `> **Eliminado por:** ${executor}`
            )
            .setFooter({ text: 'Prophet · Log de Servidor' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};
