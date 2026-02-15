// ═══ COMANDO: /pay ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Pagar a otro usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a pagar').setRequired(true))
        .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad a pagar').setMinValue(1).setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('cantidad');
        const userId = interaction.user.id;

        if (target.id === userId) return interaction.reply({ content: '❌ No te podés pagar a vos mismo.', ephemeral: true });
        if (target.bot) return interaction.reply({ content: '❌ No podés pagarle a un bot.', ephemeral: true });

        const success = stmts.removeMoney(userId, amount, 'balance');

        if (!success) {
            return interaction.reply({ content: '❌ No tenés suficiente dinero en mano.', ephemeral: true });
        }

        stmts.addMoney(target.id, amount, 'balance');

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS)
            .setDescription(`✅ Le pagaste **${config.ECONOMIA.CURRENCY} ${amount}** a ${target}.\n💸 Tu saldo actual: **${config.ECONOMIA.CURRENCY} ${stmts.getEconomy(userId).balance}**`);

        await interaction.reply({ embeds: [embed] });
    }
};
