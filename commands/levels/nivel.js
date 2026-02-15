// ═══ COMANDO: /nivel ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { obtenerNivel, barraProgreso } = require('../../modules/leveling');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nivel')
        .setDescription('Ver tu nivel o el de otro usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario') || interaction.user;
        const data = obtenerNivel(target.id);

        if (!data) {
            return interaction.reply({ content: `❌ ${target.tag} no tiene datos todavía.`, ephemeral: true });
        }

        const progreso = data.xp / data.xpSiguiente;
        const barra = barraProgreso(progreso);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.NIVEL)
            .setTitle(`📊 Nivel de ${target.displayName}`)
            .setThumbnail(target.displayAvatarURL({ size: 128 }))
            .addFields(
                { name: '🏆 Nivel', value: `**${data.level}**`, inline: true },
                { name: '⭐ XP', value: `**${data.xp}** / ${data.xpSiguiente}`, inline: true },
                { name: '🏅 Ranking', value: `#${data.rank}`, inline: true },
                { name: '💬 Mensajes', value: `${data.messages}`, inline: true },
                { name: 'Progreso', value: `${barra} ${Math.round(progreso * 100)}%` }
            )
            .setFooter({ text: 'Prophet Gaming | Niveles' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
