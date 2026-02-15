// ═══ COMANDO: /withdraw ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Retirar dinero del banco')
        .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad a retirar').setMinValue(1).setRequired(true)),

    async execute(interaction) {
        const amount = interaction.options.getInteger('cantidad');
        const userId = interaction.user.id;
        const result = stmts.transferBank(userId, amount, 'with');

        if (!result) {
            return interaction.reply({ content: '❌ No tenés suficiente dinero en el banco.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS)
            .setDescription(`✅ Retiraste **${config.ECONOMIA.CURRENCY} ${amount}** del banco.\n💵 Dinero en mano: **${config.ECONOMIA.CURRENCY} ${result.balance}**`);

        await interaction.reply({ embeds: [embed] });
    }
};
