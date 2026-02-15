// ═══ COMANDO: /avatar ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Ver el avatar de un usuario en grande')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario')),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario') || interaction.user;

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.INFO)
            .setTitle(`Avatar de ${user.username}`)
            .setImage(user.displayAvatarURL({ size: 1024, dynamic: true }))
            .setFooter({ text: 'Prophet Bot' });

        await interaction.reply({ embeds: [embed] });
    }
};
