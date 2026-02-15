// ═══ COMANDO: /daily ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');
const ms = require('../../utils/ms') || ((ms) => { // Función simple de ms si no existe módulo
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    return `${hours}h ${minutes}m`;
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Reclamar tu recompensa diaria'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const eco = stmts.getEconomy(userId);
        const ahora = Date.now();
        const cooldown = config.ECONOMIA.DAILY_COOLDOWN;

        if (ahora - eco.last_daily < cooldown) {
            const restante = cooldown - (ahora - eco.last_daily);
            const horas = Math.floor(restante / 3600000);
            const minutos = Math.floor((restante % 3600000) / 60000);
            return interaction.reply({
                content: `⏳ Ya reclamaste tu daily. Volvé en **${horas}h ${minutos}m**.`,
                ephemeral: true
            });
        }

        const reward = Math.floor(Math.random() * (config.ECONOMIA.DAILY_MAX - config.ECONOMIA.DAILY_MIN + 1)) + config.ECONOMIA.DAILY_MIN;

        stmts.addMoney(userId, reward, 'balance');
        stmts.setEconomy(userId, 'last_daily', ahora);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS)
            .setTitle('📅 Recompensa Diaria')
            .setDescription(`¡Has reclamado tu recompensa diaria!\n\n💰 Ganaste: **${config.ECONOMIA.CURRENCY} ${reward}**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
