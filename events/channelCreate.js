// ═══ EVENTO: channelCreate (Log de creación de canales) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'channelCreate',
    once: false,
    async execute(channel) {
        if (!channel.guild) return;

        const logChannelId = config.CHANNELS.LOGS;
        const logChannel = channel.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        // Intentar averiguar quién lo creó mirando el Audit Log
        let executor = 'Desconocido';
        try {
            const fetchedLogs = await channel.guild.fetchAuditLogs({
                limit: 1,
                type: 10, // ChannelCreate
            });
            const creationLog = fetchedLogs.entries.first();
            if (creationLog && Date.now() - creationLog.createdTimestamp < 5000) {
                executor = `<@${creationLog.executor.id}> (\`${creationLog.executor.id}\`)`;
            }
        } catch (e) { }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setAuthor({ name: '📁 Canal Creado' })
            .setDescription(
                `> **Nombre:** ${channel.name} (\`${channel.id}\`)\n` +
                `> **Mención:** <#${channel.id}>\n` +
                `> **Tipo:** \`${channel.type}\`\n` +
                `> **Creado por:** ${executor}`
            )
            .setFooter({ text: 'Prophet · Log de Servidor' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};
