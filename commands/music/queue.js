// ═══ COMANDO: /queue — Cola de reproducción con paginación ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config');
const { paginate, chunk } = require('../../utils/PaginationBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('📋 Ver la cola de reproducción actual'),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                content: '> ❌ **Sin reproducción** — No hay nada sonando en este momento.',
                flags: 64
            });
        }

        await interaction.deferReply();

        const tracks = queue.tracks.toArray();
        const currentTrack = queue.currentTrack;
        const fmt = (title, max = 42) => title.length > max ? title.substring(0, max - 2) + '…' : title;

        // Tiempo total
        const tiempoTotal = tracks.reduce((acc, t) => {
            const partes = t.duration.split(':').map(Number);
            return acc + (partes.length === 3 ? partes[0] * 3600 + partes[1] * 60 + partes[2] : partes[0] * 60 + partes[1]);
        }, 0);
        const horas = Math.floor(tiempoTotal / 3600);
        const minutos = Math.floor((tiempoTotal % 3600) / 60);
        const duracionCola = horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;

        // Barra de progreso del tema actual
        const progress = queue.node.getTimestamp();
        let progressBar = '';
        if (progress && progress.current && progress.total) {
            const pct = progress.current.value / Math.max(progress.total.value, 1);
            const len = 14;
            const filled = Math.round(pct * len);
            progressBar = `\n> \`${progress.current.label}\` ${'▬'.repeat(filled)}🔘${'▬'.repeat(len - filled)} \`${progress.total.label}\``;
        }

        // Header: tema actual (aparece en todas las páginas)
        const nowPlaying =
            `**🎵 Reproduciendo:**\n` +
            `> [${fmt(currentTrack.title)}](${currentTrack.url}) · \`${currentTrack.duration}\`\n` +
            `> Pedida por ${currentTrack.requestedBy || 'Desconocido'}` +
            progressBar;

        if (tracks.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.MUSICA || 0xBB86FC)
                .setAuthor({ name: '📋  Cola de Reproducción', iconURL: interaction.guild.iconURL() })
                .setDescription(nowPlaying + '\n\n> *La cola está vacía — Usá `/play` para agregar más.*')
                .setFooter({ text: `Vol: ${queue.node.volume}%  ·  Prophet Music` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // Paginar tracks en grupos de 10
        const chunks = chunk(tracks, 10);
        const pages = chunks.map((group, pageIdx) => {
            const lines = group.map((t, i) => {
                const idx = pageIdx * 10 + i + 1;
                return `\`${String(idx).padStart(2)}\` [${fmt(t.title)}](${t.url}) · \`${t.duration}\``;
            });

            return new EmbedBuilder()
                .setColor(config.COLORES.MUSICA || 0xBB86FC)
                .setAuthor({ name: '📋  Cola de Reproducción', iconURL: interaction.guild.iconURL() })
                .setDescription(
                    nowPlaying + '\n\n' +
                    `**Siguientes (${tracks.length}):**\n` +
                    lines.join('\n')
                )
                .setFooter({ text: `${tracks.length} en cola  ·  ${duracionCola}  ·  Vol: ${queue.node.volume}%` })
                .setTimestamp();
        });

        await paginate(interaction, pages, {
            footerPrefix: 'Prophet Music',
            timeout: 120000
        });
    }
};
