const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { makeEmbed, notice, safeText } = require('../../utils/discordUI');
const { paginate, chunk } = require('../../utils/PaginationBuilder');

function formatDuration(tracks) {
    const seconds = tracks.reduce((total, track) => {
        const units = String(track.duration || '0:00').split(':').map(Number);
        if (!units.length || units.some(n => !Number.isFinite(n))) return total;
        const duration = units.reduce((count, n) => count * 60 + n, 0);
        return total + duration;
    }, 0);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours ? hours + ' h ' + minutes + ' min' : minutes + ' min';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Consultar la canción y la cola de reproducción'),
    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.currentTrack) {
            return interaction.reply(notice({
                title: 'No hay música',
                description: 'Todavía no hay canciones en reproducción. Usá /play para empezar.',
                tone: 'warning',
            }));
        }
        await interaction.deferReply();
        const tracks = queue.tracks.toArray();
        const current = queue.currentTrack;
        const volume = queue.node?.volume ?? 10;
        const now = '**Ahora suena:** ' + safeText(current.title, 130)
            + '\n**Duración:** ' + safeText(current.duration || 'No disponible', 20)
            + '\n**Solicitada por:** ' + (current.requestedBy?.username || 'Un miembro');
        const pages = Math.max(1, Math.ceil(tracks.length / 8));
        const all = [];
        for (let page = 0; page < pages; page++) {
            const group = tracks.slice(page * 8, page * 8 + 8);
            const descriptions = group.map((track, index) =>
                '**' + (page * 8 + index + 1) + '.** ' + safeText(track.title || 'Sin título', 95)
                + ' · ' + safeText(track.duration || '', 18));
            all.push(makeEmbed({
                title: 'Prophet Music · Cola de reproducción',
                tone: 'music',
                description: now + '\n\n' + (descriptions.length
                    ? '**Próximas canciones**\n' + descriptions.join('\n')
                    : 'No quedan temas en espera.'),
                footer: 'Página ' + (page + 1) + '/' + pages
                    + ' · ' + tracks.length + ' temas · '
                    + formatDuration(tracks) + ' · Vol ' + volume + '%',
                iconURL: interaction.guild.iconURL?.(),
            }));
        }
        if (all.length === 1) return interaction.editReply({ embeds: all, allowedMentions: { parse: [] } });
        return paginate(interaction, all, {
            footerPrefix: 'Prophet Music',
            timeout: 120000,
        });
    },
    _test: { formatDuration },
};
