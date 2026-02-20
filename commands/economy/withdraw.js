// ═══ COMANDO: /withdraw ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('💵 Retirar dinero del banco')
        .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad a retirar').setMinValue(1).setRequired(true)),

    async execute(interaction) {
        const amount = interaction.options.getInteger('cantidad');
        const userId = interaction.user.id;
        const result = stmts.transferBank(userId, amount, 'with');

        if (!result) {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR || 0xEF5350)
                .setDescription(`> ❌ **Fondos insuficientes** — No tenés **${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}** en el banco.`)
                .setFooter({ text: 'Prophet Economy' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setAuthor({ name: '💵  Retiro realizado' })
            .setDescription(
                `> ✅ Retiraste **${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}** del banco.\n\n` +
                `> 💵 Efectivo: **${config.ECONOMIA.CURRENCY} ${result.balance.toLocaleString()}**\n` +
                `> 🏦 Banco: **${config.ECONOMIA.CURRENCY} ${result.bank.toLocaleString()}**`
            )
            .setFooter({ text: 'Prophet Economy' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
