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

        const logChannel = newMessage.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.WARN || 0xFFB74D)
            .setAuthor({ name: '✏️  Mensaje editado' })
            .setDescription(
                `> **Autor:** ${newMessage.author.tag} (\`${newMessage.author.id}\`)\n` +
                `> **Canal:** ${newMessage.channel}  ·  [Ir al mensaje](${newMessage.url})\n\n` +
                `**Antes:**\n\`\`\`\n${oldMessage.content.slice(0, 450)}\n\`\`\`\n` +
                `**Después:**\n\`\`\`\n${newMessage.content.slice(0, 450)}\n\`\`\``
            )
            .setFooter({ text: 'Prophet  ·  Log de ediciones' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] });
    }
};
