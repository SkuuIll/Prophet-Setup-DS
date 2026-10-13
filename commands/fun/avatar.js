const { SlashCommandBuilder } = require('discord.js');
const { makeEmbed } = require('../../utils/discordUI');
module.exports = {
    data: new SlashCommandBuilder().setName('avatar')
        .setDescription('Ver la imagen de perfil de un miembro')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario') || interaction.user;
        const image = user.displayAvatarURL({ size: 1024, extension: 'png' });
        const embed = makeEmbed({
            title: 'Avatar de ' + user.username,
            description: 'Esta es la imagen de perfil actual del usuario.',
            tone: 'info',
            footer: 'Perfiles · Prophet Gaming',
        });
        embed.setImage(image);
        return interaction.reply({ embeds: [embed] });
    },
};
