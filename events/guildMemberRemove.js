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

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR)
            .setTitle('📤 **Salida de Miembro**')
            .setDescription(
                `**Usuario:** ${member.user.tag}\n` +
                `**ID:** \`${member.id}\`\n\n` +
                `📉 **Contador actual:** \`${member.guild.memberCount}\` miembros`
            )
            .setThumbnail(member.user.displayAvatarURL({ size: 64 }))
            .setFooter({ text: 'Prophet Gaming | Registro de Salidas' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] });
    }
};
