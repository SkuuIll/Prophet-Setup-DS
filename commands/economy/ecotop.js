// ═══ COMANDO: /ecotop ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ecotop')
        .setDescription('🏆 Muestra los usuarios más ricos del servidor'),

    async execute(interaction) {
        await interaction.deferReply();

        const topUsers = stmts.getEcoTop(10);

        if (!topUsers || topUsers.length === 0) {
            return interaction.editReply({ content: '❌ Todavía no hay nadie con dinero en el servidor.' });
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setAuthor({ name: '🏆 Top Millonarios — Prophet Gaming' })
            .setDescription('Aquí están los jugadores más ricos de la comunidad:\n\n')
            .setFooter({ text: 'Prophet Economía' })
            .setTimestamp();

        let descripcion = '';

        for (let i = 0; i < topUsers.length; i++) {
            const userEco = topUsers[i];

            // Si el balance y banco es 0, ignorarlo y no mostrar a todo el mundo
            if (userEco.total === 0) continue;

            const userObj = interaction.client.users.cache.get(userEco.id) || await interaction.client.users.fetch(userEco.id).catch(() => null);
            const userTag = userObj ? userObj.username : `Usuario Desconocido (${userEco.id})`;

            let medalla = '🔹';
            if (i === 0) medalla = '🥇';
            else if (i === 1) medalla = '🥈';
            else if (i === 2) medalla = '🥉';

            descripcion += `${medalla} **${i + 1}. ${userTag}**\n`;
            descripcion += `> 💵 ${config.ECONOMIA.CURRENCY} ${userEco.total.toLocaleString()} totales\n\n`;
        }

        if (descripcion === '') {
            descripcion = '❌ Todavía no hay nadie con dinero en el servidor.';
        }

        embed.setDescription('Aquí están los jugadores más ricos de la comunidad:\n\n' + descripcion);

        await interaction.editReply({ embeds: [embed] });
    }
};
