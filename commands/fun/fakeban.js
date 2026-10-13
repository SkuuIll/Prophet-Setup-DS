const { SlashCommandBuilder } = require('discord.js');
const { makeEmbed } = require('../../utils/discordUI');
module.exports = {
    data: new SlashCommandBuilder().setName('fakeban')
        .setDescription('Simular un ban de broma sin sancionar a nadie')
        .addUserOption(o => o.setName('usuario').setDescription('Amigo para la simulación').setRequired(true))
        .addStringOption(o => o.setName('motivo').setDescription('Motivo inventado de la broma').setMaxLength(180)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo') || 'Demasiadas victorias consecutivas';
        const embed = makeEmbed({
            title: 'Simulación de moderación · Broma',
            description: '**No es una sanción real.**\n\n'
                + '**Participante:** ' + user.username
                + '\n**Motivo inventado:** ' + reason
                + '\n\nEn Prophet Gaming las sanciones reales nunca se anuncian desde /fakeban.',
            tone: 'warning',
            footer: 'Diversión · Sin consecuencias para la cuenta',
            iconURL: user.displayAvatarURL?.(),
        });
        return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    },
};
