const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('💤 Ponte en modo AFK — notifica a quienes te mencionen')
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('Razón por la que estás AFK')),

    async execute(interaction) {
        const reason = interaction.options.getString('motivo') || 'Sin motivo especificado';

        // Guardar estado AFK con lista de menciones
        interaction.client.afk.set(interaction.user.id, {
            reason: reason,
            timestamp: Date.now(),
            mentions: [] // {from, channel, timestamp, preview}
        });

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.WARN || 0xFFB74D)
            .setDescription(
                `> 💤 **${interaction.user.username}** ahora está AFK\n` +
                `> **Motivo:** ${reason}\n\n` +
                `> *Te avisaré cuando alguien te mencione mientras estás ausente.*`
            )
            .setFooter({ text: 'Enviá un mensaje en cualquier canal para salir del modo AFK' });

        await interaction.reply({ embeds: [embed] });

        // Cambiar apodo
        if (interaction.guild.members.me.permissions.has('ManageNicknames')) {
            try {
                const member = interaction.member;
                if (!member.displayName.startsWith('[AFK]')) {
                    await member.setNickname(`[AFK] ${member.displayName}`.substring(0, 32));
                }
            } catch (e) { }
        }
    }
};
