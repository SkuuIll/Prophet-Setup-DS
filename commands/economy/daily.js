// ═══ COMANDO: /daily ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('📅 Reclamar tu recompensa diaria'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const eco = stmts.getEconomy(userId);
        const ahora = Date.now();
        const cooldown = config.ECONOMIA.DAILY_COOLDOWN;

        if (ahora - eco.last_daily < cooldown) {
            const restante = cooldown - (ahora - eco.last_daily);
            const horas = Math.floor(restante / 3600000);
            const minutos = Math.floor((restante % 3600000) / 60000);
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.WARN || 0xFFB74D)
                .setDescription(`> ⏳ Ya reclamaste tu daily. Volvé en **${horas}h ${minutos}m**.`)
                .setFooter({ text: 'Prophet Economy' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const reward = Math.floor(Math.random() * (config.ECONOMIA.DAILY_MAX - config.ECONOMIA.DAILY_MIN + 1)) + config.ECONOMIA.DAILY_MIN;

        stmts.addMoney(userId, reward, 'balance');
        stmts.setEconomy(userId, 'last_daily', ahora);

        const nuevoSaldo = stmts.getEconomy(userId);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setAuthor({ name: '📅  Recompensa Diaria' })
            .setDescription(
                `> 🎁 ¡Reclamaste tu recompensa diaria!\n\n` +
                `> 💰 **+${config.ECONOMIA.CURRENCY} ${reward.toLocaleString()}**\n` +
                `> 💵 Saldo actual: **${config.ECONOMIA.CURRENCY} ${nuevoSaldo.balance.toLocaleString()}**`
            )
            .setFooter({ text: 'Prophet Economy  ·  Volvé mañana por más' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
