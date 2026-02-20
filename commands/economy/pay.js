// ═══ COMANDO: /pay ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('💸 Transferir dinero a otro usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a pagar').setRequired(true))
        .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad a transferir').setMinValue(1).setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('cantidad');
        const userId = interaction.user.id;

        if (target.id === userId) return interaction.reply({ content: '> ❌ No te podés pagar a vos mismo.', ephemeral: true });
        if (target.bot) return interaction.reply({ content: '> ❌ No podés transferirle dinero a un bot.', ephemeral: true });

        const success = stmts.removeMoney(userId, amount, 'balance');

        if (!success) {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR || 0xEF5350)
                .setDescription(`> ❌ **Fondos insuficientes** — No tenés **${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}** en efectivo.`)
                .setFooter({ text: 'Prophet Economy' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        stmts.addMoney(target.id, amount, 'balance');

        const miSaldo = stmts.getEconomy(userId);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setAuthor({ name: '💸  Transferencia exitosa' })
            .setDescription(
                `> ${interaction.user} ➜ ${target}\n\n` +
                `> 💰 **${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}** transferidos.\n` +
                `> 💵 Tu saldo: **${config.ECONOMIA.CURRENCY} ${miSaldo.balance.toLocaleString()}**`
            )
            .setFooter({ text: 'Prophet Economy' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
