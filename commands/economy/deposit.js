// ═══ COMANDO: /deposit ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Depositar dinero en el banco')
        .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad a depositar').setMinValue(1).setRequired(true)),

    async execute(interaction) {
        const amount = interaction.options.getInteger('cantidad');
        const userId = interaction.user.id;
        const result = stmts.transferBank(userId, amount, 'dep');

        if (!result) {
            return interaction.reply({ content: '❌ No tenés suficiente dinero en mano.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS)
            .setDescription(`✅ Depositaste **${config.ECONOMIA.CURRENCY} ${amount}** en tu banco.\n🏦 Nuevo saldo bancario: **${config.ECONOMIA.CURRENCY} ${result.bank}**`);

        await interaction.reply({ embeds: [embed] });
    }
};
