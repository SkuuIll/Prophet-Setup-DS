// ═══ EVENTO: messageDelete + messageUpdate (Logs) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'messageDelete',
    once: false,
    async execute(message) {
        if (!message.guild || message.author?.bot) return;
        if (message.partial) return; // No tenemos el contenido

        const logChannel = message.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR)
            .setTitle('🗑️ Mensaje eliminado')
            .addFields(
                { name: 'Autor', value: `${message.author?.tag || 'Desconocido'} (${message.author?.id || '?'})`, inline: true },
                { name: 'Canal', value: `${message.channel}`, inline: true },
                { name: 'Contenido', value: message.content?.slice(0, 1024) || '[sin texto]' }
            )
            .setTimestamp();

        if (message.attachments.size > 0) {
            embed.addFields({
                name: 'Archivos adjuntos',
                value: message.attachments.map(a => a.url).join('\n').slice(0, 1024)
            });
        }

        logChannel.send({ embeds: [embed] });
    }
};
