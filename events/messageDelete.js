// ═══ EVENTO: messageDelete (Logs + Snipe) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'messageDelete',
    once: false,
    async execute(message) {
        if (!message.guild || message.author?.bot) return;
        if (message.partial) return;

        // ═══ SNIPE SYSTEM ═══
        if (message.content || message.attachments.size > 0) {
            message.client.snipes.set(message.channel.id, {
                content: message.content,
                author: message.author,
                image: message.attachments.first() ? message.attachments.first().url : null,
                timestamp: Date.now()
            });
        }

        const logChannel = message.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR || 0xEF5350)
            .setAuthor({ name: '🗑️  Mensaje eliminado' })
            .setDescription(
                `> **Autor:** ${message.author?.tag || 'Desconocido'} (\`${message.author?.id || '?'}\`)\n` +
                `> **Canal:** ${message.channel}\n\n` +
                `**Contenido:**\n\`\`\`\n${(message.content || '[sin texto]').slice(0, 900)}\n\`\`\``
            )
            .setFooter({ text: 'Prophet  ·  Log de mensajes' })
            .setTimestamp();

        if (message.attachments.size > 0) {
            const archivos = message.attachments.map(a => `[${a.name}](${a.url})`).join('\n');
            embed.addFields({
                name: '📎 Archivos adjuntos',
                value: archivos.slice(0, 1024)
            });
        }

        logChannel.send({ embeds: [embed] });
    }
};
