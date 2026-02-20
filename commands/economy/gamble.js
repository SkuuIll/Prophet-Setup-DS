// ═══ COMANDO: /gamble ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('🎰 Apostar dinero — ¡Doble o Nada!')
        .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad a apostar').setMinValue(10).setRequired(true)),

    async execute(interaction) {
        const amount = interaction.options.getInteger('cantidad');
        const userId = interaction.user.id;
        const eco = stmts.getEconomy(userId);

        if (eco.balance < amount) {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR || 0xEF5350)
                .setDescription(`> ❌ **Fondos insuficientes** — Necesitás **${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}** pero tenés **${config.ECONOMIA.CURRENCY} ${eco.balance.toLocaleString()}**.`)
                .setFooter({ text: 'Prophet Economy' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const win = Math.random() > 0.5;

        if (win) {
            stmts.addMoney(userId, amount, 'balance');
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                .setAuthor({ name: '🎰  ¡GANASTE!' })
                .setDescription(
                    `> 🎉 ¡La suerte está de tu lado!\n\n` +
                    `> 💰 **+${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}**\n` +
                    `> 💵 Nuevo saldo: **${config.ECONOMIA.CURRENCY} ${(eco.balance + amount).toLocaleString()}**`
                )
                .setFooter({ text: 'Prophet Economy  ·  ¿Seguís apostando?' })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        } else {
            stmts.removeMoney(userId, amount, 'balance');
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR || 0xEF5350)
                .setAuthor({ name: '🎰  PERDISTE...' })
                .setDescription(
                    `> 📉 La suerte no te acompañó esta vez.\n\n` +
                    `> 💸 **-${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}**\n` +
                    `> 💵 Nuevo saldo: **${config.ECONOMIA.CURRENCY} ${(eco.balance - amount).toLocaleString()}**`
                )
                .setFooter({ text: 'Prophet Economy  ·  Mejor suerte la próxima' })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
    }
};
