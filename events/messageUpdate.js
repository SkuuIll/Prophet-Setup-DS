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
            .setColor(config.COLORES.WARN)
            .setTitle('✏️ Mensaje editado')
            .addFields(
                { name: 'Autor', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
                { name: 'Canal', value: `${newMessage.channel}`, inline: true },
                { name: 'Antes', value: oldMessage.content.slice(0, 1024) },
                { name: 'Después', value: newMessage.content.slice(0, 1024) }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] });
    }
};
