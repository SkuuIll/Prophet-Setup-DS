// ═══ COMANDO: /coinflip ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Lanzar una moneda (Cara o Cruz)'),

    async execute(interaction) {
        const resultado = Math.random() > 0.5 ? 'Cara' : 'Cruz';

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setTitle('🪙 Coin Flip')
            .setDescription(`La moneda cayó en: **${resultado}**`);

        await interaction.reply({ embeds: [embed] });
    }
};
