const { SlashCommandBuilder } = require('discord.js');
const { makeEmbed } = require('../../utils/discordUI');
module.exports = {
    data: new SlashCommandBuilder().setName('coinflip')
        .setDescription('Tirar una moneda y ver el resultado'),
    async execute(interaction) {
        const cara = Math.random() >= 0.5;
        return interaction.reply({
            embeds: [makeEmbed({
                title: 'Cara o cruz',
                description: '**Resultado: ' + (cara ? 'Cara' : 'Cruz') + '**'
                    + '\n¿Querés revancha? Volvé a usar /coinflip.',
                tone: 'primary',
                footer: 'Diversión · Prophet Gaming',
                iconURL: interaction.user.displayAvatarURL?.(),
            })],
        });
    },
};
