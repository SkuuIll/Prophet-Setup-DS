const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playl')
        .setDescription('Reproduce música usando Lavalink (Shoukaku) — estabilidad mejorada')
        .addStringOption(option =>
            option.setName('cancion')
                .setDescription('Nombre de la canción o URL de YouTube/Spotify/SoundCloud')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        const client = interaction.client;

        // ── Validaciones ──
        if (!client.shoukaku || client.shoukaku.nodes.size === 0) {
            return interaction.editReply('❌ **Lavalink** no está disponible. Usá `/play` por ahora.');
        }

        if (!interaction.member.voice.channel) {
            return interaction.editReply('❌ Tenés que estar en un canal de voz.');
        }

        const node = client.shoukaku.getIdealNode();
        if (!node) {
            return interaction.editReply('❌ No hay nodos de Lavalink disponibles.');
        }

        const query = interaction.options.getString('cancion');

        try {
            // ── Resolver búsqueda / URL ──
            const isURL = /^https?:\/\//.test(query);
            const searchQuery = isURL ? query : `ytsearch:${query}`;
            const result = await node.rest.resolve(searchQuery);

            if (!result || result.loadType === 'empty' || result.loadType === 'error') {
                const errMsg = result?.data?.message || 'Sin resultados';
                return interaction.editReply(`❌ No se encontraron resultados: ${errMsg}`);
            }

            // ── Extraer track según tipo de resultado ──
            let track;
            let extraInfo = '';

            switch (result.loadType) {
                case 'playlist': {
                    const tracks = result.data.tracks || result.data;
                    if (!tracks || tracks.length === 0) {
                        return interaction.editReply('❌ La playlist está vacía.');
                    }
                    track = tracks[0];
                    extraInfo = `\n📋 **Playlist:** ${result.data.info?.name || 'Sin nombre'} (${tracks.length} canciones)`;
                    break;
                }
                case 'track':
                    track = result.data;
                    break;
                case 'search':
                    if (!result.data || result.data.length === 0) {
                        return interaction.editReply('❌ No se encontraron resultados.');
                    }
                    track = result.data[0];
                    break;
                default:
                    if (Array.isArray(result.data) && result.data.length > 0) {
                        track = result.data[0];
                    } else if (result.data?.encoded) {
                        track = result.data;
                    } else {
                        return interaction.editReply('❌ No se encontraron resultados.');
                    }
            }

            if (!track || !track.encoded) {
                return interaction.editReply('❌ No se pudo obtener la pista de audio.');
            }

            // ── Obtener o crear player ──
            let player = client.shoukaku.players.get(interaction.guild.id);
            let isNewPlayer = false;

            if (!player) {
                player = await client.shoukaku.joinVoiceChannel({
                    guildId: interaction.guild.id,
                    channelId: interaction.member.voice.channel.id,
                    shardId: interaction.guild.shardId || 0
                });
                isNewPlayer = true;
            }

            // ── Reproducir ──
            // IMPORTANTE: Lavalink v4 espera { track: { encoded: "base64..." } }
            // NO { track: "base64..." }
            await player.playTrack({ track: { encoded: track.encoded } });

            // ── Respuesta ──
            const duration = track.info.length
                ? `${Math.floor(track.info.length / 60000)}:${String(Math.floor((track.info.length % 60000) / 1000)).padStart(2, '0')}`
                : 'En vivo';

            const embed = new EmbedBuilder()
                .setColor(0xBB86FC)
                .setTitle('🎶 Reproduciendo via Lavalink')
                .setDescription(
                    `**[${track.info.title}](${track.info.uri || '#'})**\n` +
                    `> 👤 ${track.info.author || 'Desconocido'}\n` +
                    `> ⏱️ ${duration}` +
                    extraInfo
                )
                .setFooter({ text: 'Shoukaku · Lavalink · Sin tirones' })
                .setTimestamp();

            if (track.info.artworkUrl) {
                embed.setThumbnail(track.info.artworkUrl);
            }

            await interaction.editReply({ embeds: [embed] });

            // ── Auto-desconectar cuando termine ──
            if (isNewPlayer) {
                player.on('end', (data) => {
                    // STOPPED = el usuario lo detuvo, no desconectar
                    if (data.reason === 'replaced') return;
                    setTimeout(() => {
                        // Verificar que no haya otro track reproduciéndose
                        const currentPlayer = client.shoukaku.players.get(interaction.guild.id);
                        if (currentPlayer && !currentPlayer.track) {
                            client.shoukaku.leaveVoiceChannel(interaction.guild.id).catch(() => { });
                        }
                    }, 30000); // Esperar 30s antes de desconectar
                });

                player.on('closed', () => {
                    client.shoukaku.leaveVoiceChannel(interaction.guild.id).catch(() => { });
                });
            }

        } catch (err) {
            console.error('>>>>> Lavalink Play Error:', err);

            // Cleanup: desconectar player roto
            try {
                await client.shoukaku.leaveVoiceChannel(interaction.guild.id);
            } catch (_) { }

            await interaction.editReply(`❌ Error: ${err.message || 'Error desconocido'}`).catch(() => { });
        }
    }
};
