// ═══ COMANDO: /queue ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('📋 Ver la cola de reproducción actual'),

    async execute(interaction, client) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                content: '> ❌ **Sin reproducción** — No hay nada sonando en este momento.',
                ephemeral: true
            });
        }

        const tracks = queue.tracks.toArray();
        const currentTrack = queue.currentTrack;

        // Formatear título
        const fmt = (title, max = 45) => title.length > max ? title.substring(0, max - 2) + '…' : title;

        const canciones = tracks.map((track, i) =>
            `\`${String(i + 1).padStart(2, ' ')}.\` [${fmt(track.title, 38)}](${track.url}) · \`${track.duration}\``
        ).slice(0, 15);

        // Tiempo total
        const tiempoTotal = tracks.reduce((acc, t) => {
            const partes = t.duration.split(':').map(Number);
            return acc + (partes.length === 3 ? partes[0] * 3600 + partes[1] * 60 + partes[2] : partes[0] * 60 + partes[1]);
        }, 0);
        const horas = Math.floor(tiempoTotal / 3600);
        const minutos = Math.floor((tiempoTotal % 3600) / 60);
        const duracionCola = horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.MUSICA || 0xBB86FC)
            .setAuthor({ name: '📋  Cola de reproducción' })
            .setDescription(
                `**🎵 Reproduciendo ahora:**\n` +
                `> [${fmt(currentTrack.title)}](${currentTrack.url}) · \`${currentTrack.duration}\`\n` +
                `> Pedida por ${currentTrack.requestedBy || 'Desconocido'}\n\n` +
                `**Siguientes:**\n${canciones.length ? canciones.join('\n') : '> *La cola está vacía.*'}` +
                (tracks.length > 15 ? `\n\n> *...y ${tracks.length - 15} temas más.*` : '')
            )
            .setFooter({ text: `${tracks.length} en cola  ·  Duración: ${duracionCola}  ·  Vol: ${queue.node.volume}%` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
