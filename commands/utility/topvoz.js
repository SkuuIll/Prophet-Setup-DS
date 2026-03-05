// ═══ COMANDO: /topvoz — Leaderboard de actividad en canales de voz ═══

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

// Convierte minutos a formato legible "Xh Ym"
function formatearTiempo(minutos) {
    if (minutos < 60) return `${minutos}m`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const MEDALLAS = ['🥇', '🥈', '🥉'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('topvoz')
        .setDescription('🎙️ Leaderboard de los usuarios con más tiempo en canales de voz'),

    async execute(interaction) {
        await interaction.deferReply();

        const top = stmts.getTopVoice(10);

        if (!top.length) {
            return interaction.editReply({
                content: '> ℹ️ Nadie tiene minutos de voz registrados aún. ¡Entrá a un canal de voz para empezar!'
            });
        }

        // Posición del usuario que usó el comando
        const selfData = stmts.getUser(interaction.user.id);
        const selfRank = selfData?.voice_minutes > 0
            ? stmts.getVoiceRank(interaction.user.id)?.rank + 1
            : null;

        const descripcion = top.map((u, i) => {
            const medalla = MEDALLAS[i] || `\`#${i + 1}\``;
            const tiempo = formatearTiempo(u.voice_minutes);
            return `${medalla} <@${u.id}> — \`${tiempo}\` · Nv. ${u.level}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setAuthor({
                name: '🎙️  Top Voz — Tiempo en canales',
                iconURL: interaction.guild.iconURL()
            })
            .setDescription(descripcion)
            .setFooter({
                text: selfRank
                    ? `Tu posición: #${selfRank} · ${formatearTiempo(selfData?.voice_minutes || 0)}`
                    : 'Todavía no tenés minutos de voz registrados',
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};
