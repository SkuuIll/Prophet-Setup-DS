// ═══ EVENTO: channelCreate (Log de creación de canales) ═══

const { EmbedBuilder, AuditLogEvent, ChannelType } = require('discord.js');
const config = require('../config');

// Tipos de canal legibles en español
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
    name: 'channelCreate',
    once: false,
    async execute(channel) {
        try {
            if (!channel.guild) return;

            const logChannel = channel.guild.channels.cache.get(config.CHANNELS.LOGS);
            if (!logChannel) return;

            // Solo logear canales creados por usuarios (no por el bot)
            let executor = null;
            try {
                const logs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate });
                const entry = logs.entries.first();
                if (entry && Date.now() - entry.createdTimestamp < 5000) {
                    executor = entry.executor;
                }
            } catch (e) { /* Sin permiso para audit logs — continuar sin executor */ }

            // Si fue creado por el propio bot, no loguear (evita spam de logs por salas temporales)
            if (executor?.id === channel.client.user.id) return;

            const tipoCanal = CHANNEL_TYPES[channel.type] ?? `Tipo ${channel.type}`;
            const categoria = channel.parent ? `\`${channel.parent.name}\`` : '*Sin categoría*';

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                .setAuthor({
                    name: '📁  Canal Creado',
                    iconURL: executor?.displayAvatarURL() || channel.guild.iconURL()
                })
                .setDescription(
                    `> **Nombre:** ${channel.toString()} (\`${channel.id}\`)\n` +
                    `> **Tipo:** ${tipoCanal}\n` +
                    `> **Categoría:** ${categoria}\n` +
                    (executor ? `> **Creado por:** <@${executor.id}>\n` : '')
                )
                .setFooter({ text: 'Prophet  ·  Log de Servidor' })
                .setTimestamp();

            logChannel.send({ embeds: [embed] }).catch(() => { });
        } catch (err) {
            console.error('[channelCreate] Error:', err.message);
        }
    }
};
