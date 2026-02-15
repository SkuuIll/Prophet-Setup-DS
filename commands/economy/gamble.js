// ═══ COMANDO: /gamble ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Apostar dinero (Doble o Nada)')
        .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad a apostar').setMinValue(10).setRequired(true)),

    async execute(interaction) {
        const amount = interaction.options.getInteger('cantidad');
        const userId = interaction.user.id;
        const eco = stmts.getEconomy(userId);

        if (eco.balance < amount) {
            return interaction.reply({ content: '❌ No tenés suficiente dinero en mano para apostar.', ephemeral: true });
        }

        const win = Math.random() > 0.5; // 50% chance

        if (win) {
            stmts.addMoney(userId, amount, 'balance');
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.SUCCESS)
                .setTitle('🎰 ¡GANASTE!')
                .setDescription(`La suerte está de tu lado. Ganaste **${config.ECONOMIA.CURRENCY} ${amount}**.\n💰 Nuevo saldo: **${config.ECONOMIA.CURRENCY} ${eco.balance + amount}**`);
            await interaction.reply({ embeds: [embed] });
        } else {
            stmts.removeMoney(userId, amount, 'balance');
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR)
                .setTitle('📉 PERDISTE')
                .setDescription(`Mala suerte. Perdiste **${config.ECONOMIA.CURRENCY} ${amount}**.\n💸 Nuevo saldo: **${config.ECONOMIA.CURRENCY} ${eco.balance - amount}**`);
            await interaction.reply({ embeds: [embed] });
        }
    }
};
