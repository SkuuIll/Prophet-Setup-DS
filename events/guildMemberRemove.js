// ═══ EVENTO: guildMemberRemove (Despedida) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'guildMemberRemove',
    once: false,
    async execute(member) {
        if (member.user.bot) return;

        const logChannel = member.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (!logChannel) return;

        // Calcular cuánto tiempo estuvo en el servidor
        const tiempoEnServidor = member.joinedTimestamp
            ? Math.floor((Date.now() - member.joinedTimestamp) / 86400000)
            : null;
        const duracion = tiempoEnServidor !== null
            ? (tiempoEnServidor > 0 ? `\`${tiempoEnServidor}\` días` : 'menos de un día')
            : 'desconocido';

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR || 0xEF5350)
            .setAuthor({ name: '📤  Salida de miembro' })
            .setDescription(
                `> **Usuario:** ${member.user.tag}\n` +
                `> **ID:** \`${member.id}\`\n` +
                `> **Tiempo en servidor:** ${duracion}\n\n` +
                `> 📉 **Miembros actuales:** \`${member.guild.memberCount}\``
            )
            .setThumbnail(member.user.displayAvatarURL({ size: 64 }))
            .setFooter({ text: 'Prophet  ·  Log de salidas' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] });
    }
};
