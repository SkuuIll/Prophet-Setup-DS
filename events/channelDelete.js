// ═══ EVENTO: channelDelete (Log de borrado de canales) ═══

const { EmbedBuilder, AuditLogEvent, ChannelType } = require('discord.js');
const config = require('../config');

const CHANNEL_TYPES = {
    [ChannelType.GuildText]: '💬 Texto',
    [ChannelType.GuildVoice]: '🔊 Voz',
    [ChannelType.GuildCategory]: '📁 Categoría',
    [ChannelType.GuildAnnouncement]: '📢 Anuncios',
    [ChannelType.AnnouncementThread]: '🧵 Hilo de Anuncios',
    [ChannelType.PublicThread]: '🧵 Hilo Público',
    [ChannelType.PrivateThread]: '🔒 Hilo Privado',
    [ChannelType.GuildStageVoice]: '🎤 Escenario',
    [ChannelType.GuildForum]: '💬 Foro',
};

module.exports = {
    name: 'channelDelete',
    once: false,
    async execute(channel) {
        if (!channel.guild) return;

        const logChannel = channel.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (!logChannel) return;

        let executor = null;
        try {
            const logs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
            const entry = logs.entries.first();
            if (entry && Date.now() - entry.createdTimestamp < 5000) {
                executor = entry.executor;
            }
        } catch (e) { }

        const tipoCanal = CHANNEL_TYPES[channel.type] ?? `Tipo ${channel.type}`;
        const categoria = channel.parent ? `\`${channel.parent.name}\`` : '*Sin categoría*';

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR || 0xEF5350)
            .setAuthor({
                name: '🗑️  Canal Eliminado',
                iconURL: executor?.displayAvatarURL() || channel.guild.iconURL()
            })
            .setDescription(
                `> **Nombre:** \`#${channel.name}\` (\`${channel.id}\`)\n` +
                `> **Tipo:** ${tipoCanal}\n` +
                `> **Categoría:** ${categoria}\n` +
                (executor ? `> **Eliminado por:** <@${executor.id}>\n` : '')
            )
            .setFooter({ text: 'Prophet  ·  Log de Servidor' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};
