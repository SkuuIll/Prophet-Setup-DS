// ═══ COMANDO: /top ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { obtenerTop } = require('../../modules/leveling');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('Ver el leaderboard de niveles')
        .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad a mostrar (5-25)').setMinValue(5).setMaxValue(25)),

    async execute(interaction) {
        const cantidad = interaction.options.getInteger('cantidad') || 10;
        const top = obtenerTop(cantidad);

        if (top.length === 0) {
            return interaction.reply({ content: '❌ No hay datos todavía.', ephemeral: true });
        }

        const medallas = ['🥇', '🥈', '🥉'];
        const lista = top.map((u, i) => {
            const medalla = medallas[i] || `**${i + 1}.**`;
            return `${medalla} <@${u.user_id}> — Nivel **${u.level}** (${u.xp} XP)`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setTitle('🏆 Leaderboard — Prophet Gaming')
            .setDescription(lista)
            .setFooter({ text: `Top ${top.length} usuarios` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
