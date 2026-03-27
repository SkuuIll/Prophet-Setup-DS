// ═══ EVENTO: messageUpdate (Log de edición) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'messageUpdate',
    once: false,
    async execute(oldMessage, newMessage) {
        if (!newMessage.guild || newMessage.author?.bot) return;
        if (oldMessage.partial || !oldMessage.content) return;
        if (oldMessage.content === newMessage.content) return;

        // ═══ EDIT SNIPE SYSTEM (guarda hasta 5 por canal) ═══
        if (!newMessage.client.editSnipes) newMessage.client.editSnipes = new Map();
        const channelEdits = newMessage.client.editSnipes.get(newMessage.channel.id) || [];
        channelEdits.unshift({
            oldContent: oldMessage.content,
            newContent: newMessage.content,
            author: newMessage.author,
            timestamp: Date.now()
        });
        if (channelEdits.length > 5) channelEdits.pop();
        newMessage.client.editSnipes.set(newMessage.channel.id, channelEdits);

        const logChannel = newMessage.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (!logChannel) return;

        const antes = oldMessage.content.slice(0, 500);
        const despues = newMessage.content.slice(0, 500);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.WARN || 0xFFB74D)
            .setAuthor({
                name: '✏️  Mensaje editado',
                iconURL: newMessage.author.displayAvatarURL()
            })
            .setDescription(
                `> **Autor:** ${newMessage.author} (\`${newMessage.author.id}\`)\n` +
                `> **Canal:** ${newMessage.channel}  ·  [Ir al mensaje](${newMessage.url})\n\n` +
                `**Antes:**\n\`\`\`\n${antes}\n\`\`\`\n` +
                `**Después:**\n\`\`\`\n${despues}\n\`\`\``
            )
            .setThumbnail(newMessage.author.displayAvatarURL({ size: 128 }))
            .setFooter({ text: 'Prophet  ·  Log de Ediciones' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};
