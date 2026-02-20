// ═══ COMANDO: /deposit ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('🏦 Depositar dinero en el banco')
        .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad a depositar').setMinValue(1).setRequired(true)),

    async execute(interaction) {
        const amount = interaction.options.getInteger('cantidad');
        const userId = interaction.user.id;
        const result = stmts.transferBank(userId, amount, 'dep');

        if (!result) {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR || 0xEF5350)
                .setDescription(`> ❌ **Fondos insuficientes** — No tenés **${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}** en efectivo.`)
                .setFooter({ text: 'Prophet Economy' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setAuthor({ name: '🏦  Depósito realizado' })
            .setDescription(
                `> ✅ Depositaste **${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}** en el banco.\n\n` +
                `> 💵 Efectivo: **${config.ECONOMIA.CURRENCY} ${result.balance.toLocaleString()}**\n` +
                `> 🏦 Banco: **${config.ECONOMIA.CURRENCY} ${result.bank.toLocaleString()}**`
            )
            .setFooter({ text: 'Prophet Economy' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
