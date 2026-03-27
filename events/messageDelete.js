// ═══ EVENTO: messageDelete (Logs + Snipe) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'messageDelete',
    once: false,
    async execute(message) {
        if (!message.guild || message.author?.bot) return;
        if (message.partial) return;

        // ═══ SNIPE SYSTEM (multi-snipe: guarda hasta 5 por canal) ═══
        if (message.content || message.attachments.size > 0) {
            if (!message.client.snipes) message.client.snipes = new Map();
            const channelSnipes = message.client.snipes.get(message.channel.id) || [];
            channelSnipes.unshift({
                content: message.content,
                author: message.author,
                image: message.attachments.first()?.url || null,
                timestamp: Date.now()
            });
            // Mantener máximo 5
            if (channelSnipes.length > 5) channelSnipes.pop();
            message.client.snipes.set(message.channel.id, channelSnipes);
        }

        const logChannel = message.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (!logChannel) return;

        // Intentar obtener quién borró el mensaje via Audit Log
        let deletedBy = null;
        try {
            const logs = await message.guild.fetchAuditLogs({ limit: 1, type: 72 }); // MessageDelete
            const entry = logs.entries.first();
            if (entry && entry.target.id === message.author.id && Date.now() - entry.createdTimestamp < 5000) {
                // Si lo borró un mod (no el propio autor)
                if (entry.executor.id !== message.author.id) {
                    deletedBy = `<@${entry.executor.id}>`;
                }
            }
        } catch (e) { }

        const contenido = (message.content || '*[sin texto]*').slice(0, 1000);
        const tieneAdjuntos = message.attachments.size > 0;

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR || 0xEF5350)
            .setAuthor({
                name: `🗑️  Mensaje eliminado${tieneAdjuntos ? ' · 📎' : ''}`,
                iconURL: message.author.displayAvatarURL()
            })
            .setDescription(
                `> **Autor:** ${message.author} (\`${message.author.id}\`)\n` +
                `> **Canal:** ${message.channel}\n` +
                (deletedBy ? `> **Borrado por:** ${deletedBy}\n` : '') +
                `\n**Contenido:**\n\`\`\`\n${contenido}\n\`\`\``
            )
            .setThumbnail(message.author.displayAvatarURL({ size: 128 }))
            .setFooter({ text: 'Prophet  ·  Log de Mensajes' })
            .setTimestamp();

        if (tieneAdjuntos) {
            const archivos = message.attachments.map(a => `[${a.name}](${a.url})`).join('\n');
            embed.addFields({ name: '📎 Archivos adjuntos', value: archivos.slice(0, 1024) });
        }

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};
