// ═══ COMANDO: /play ═══ (Versión discord-player)
const { SlashCommandBuilder } = require('discord.js');

// ─── Limpiar URL de YouTube ───
// Remueve parámetros de playlist/mix/radio que causan errores
// Ejemplo: https://youtube.com/watch?v=abc123&list=RDxyz&index=3
//       → https://youtube.com/watch?v=abc123
function limpiarQuery(query) {
    try {
        const url = new URL(query);
        const esYouTube = url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be');

        if (!esYouTube) return query;

        // Si es un link youtu.be, retornar como URL limpia de youtube.com
        if (url.hostname.includes('youtu.be')) {
            const videoId = url.pathname.slice(1);
            return videoId ? `https://www.youtube.com/watch?v=${videoId}` : query;
        }

        // Si es un /watch con video ID, mantener solo el ?v=
        if (url.pathname === '/watch' && url.searchParams.has('v')) {
            return `https://www.youtube.com/watch?v=${url.searchParams.get('v')}`;
        }

        // Si es una playlist pura (/playlist?list=PLxxx), dejar tal cual
        if (url.pathname === '/playlist' && url.searchParams.has('list')) {
            return query;
        }

        return query;
    } catch {
        // No es una URL, es una búsqueda por texto
        return query;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Reproducir música de YouTube/Spotify')
        .addStringOption(o => o.setName('cancion').setDescription('URL o nombre de la canción').setRequired(true)),

    async execute(interaction, client) {
        if (!client.player) {
            return interaction.reply({ content: '❌ Sistema de música no inicializado.', ephemeral: true });
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: '❌ Tenés que estar en un canal de voz.', ephemeral: true });
        }

        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return interaction.reply({ content: '❌ Necesito permisos para entrar y hablar en ese canal.', ephemeral: true });
        }

        await interaction.deferReply();
        const queryOriginal = interaction.options.getString('cancion');
        const query = limpiarQuery(queryOriginal);

        try {
            const { track } = await client.player.play(voiceChannel, query, {
                requestedBy: interaction.user,
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel
                    },
                    volume: 50,
                    leaveOnEmpty: false,
                    leaveOnEmptyCooldown: 30000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 60000,
                }
            });

            return interaction.editReply({ content: `🎵 Cargando **${track.title}**...` });

        } catch (firstError) {
            // Si falla con URL, intentar buscar por nombre del video
            if (query !== queryOriginal || query.startsWith('http')) {
                try {
                    // Extraer un término de búsqueda de la URL o usar el query original
                    const searchQuery = queryOriginal.startsWith('http')
                        ? query.replace(/https?:\/\/(www\.)?youtube\.com\/watch\?v=/, '').replace(/[&?].*/, '')
                        : queryOriginal;

                    const { track } = await client.player.play(voiceChannel, searchQuery, {
                        requestedBy: interaction.user,
                        searchEngine: 'youtube',
                        nodeOptions: {
                            metadata: { channel: interaction.channel },
                            volume: 50,
                            leaveOnEmpty: false,
                            leaveOnEmptyCooldown: 30000,
                            leaveOnEnd: true,
                            leaveOnEndCooldown: 60000,
                        }
                    });

                    return interaction.editReply({ content: `🎵 Cargando **${track.title}**...` });
                } catch (secondError) {
                    console.error('Play fallback error:', secondError.message);
                }
            }

            console.error('Play error:', firstError.message);
            const extractorCount = client.player?.extractors?.store?.size || 0;
            let errorMsg = `❌ No se pudo encontrar ni reproducir: \`${queryOriginal}\`\nDetalle: ${firstError.message}`;
            if (extractorCount === 0) {
                errorMsg += `\n⚠️ **No hay extractores de música cargados.** Reiniciá el bot con \`./install.sh\` en la VPS.`;
            }
            return interaction.editReply({ content: errorMsg });
        }
    }
};
