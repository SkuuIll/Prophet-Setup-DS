// ═══ COMANDO: /play ═══ (Versión discord-player)
const { SlashCommandBuilder } = require('discord.js');
const { buildDiscordPlaylist, resolveMusicQuery } = require('../../utils/musicResolver');
const { notice, makeEmbed } = require('../../utils/discordUI');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Reproducir música de YouTube/Spotify')
        .addStringOption(o => o.setName('cancion').setDescription('URL o nombre de la canción').setRequired(true)),

    async execute(interaction, client) {
        if (!client.player) {
            return interaction.reply(notice({
                title: 'Música temporalmente no disponible',
                description: 'El reproductor todavía no terminó de iniciarse. Probá nuevamente en unos segundos.',
                tone: 'warning',
            }));
        }

        const voiceChannel = interaction.member?.voice?.channel
            || interaction.guild?.members?.cache?.get(interaction.user.id)?.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply(notice({
                title: 'Conectate a un canal de voz',
                description: 'Entrá a un canal de voz del servidor y después usá /play.',
                tone: 'warning',
            }));
        }

        const permissions = voiceChannel.permissionsFor?.(interaction.client.user);
        if (!permissions?.has('Connect') || !permissions?.has('Speak')) {
            return interaction.reply(notice({
                title: 'Faltan permisos de voz',
                description: 'Necesito permisos para conectarme y hablar en ese canal. Consultá al Staff.',
                tone: 'error',
            }));
        }

        await interaction.deferReply();
        const queryOriginal = interaction.options.getString('cancion');

        try {
            const { stmts } = require('../../database');
            const volDb = stmts.getGuildSettings(interaction.guildId).music_volume || 10;
            const resolved = await resolveMusicQuery(queryOriginal);
            const playable = resolved.kind === 'playlist'
                ? buildDiscordPlaylist(client.player, resolved, interaction.user)
                : resolved.query;

            const { track } = await client.player.play(voiceChannel, playable, {
                requestedBy: interaction.user,
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel
                    },
                    volume: volDb,
                    leaveOnEmpty: false,
                    leaveOnEmptyCooldown: 30000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 60000,
                }
            });

            console.log(
                `🎯 [MusicResolve] ${JSON.stringify(queryOriginal)} -> ` +
                `${JSON.stringify(track.title)} (${resolved.videoId || resolved.playlistId || resolved.source})` +
                `${resolved.kind === 'playlist' ? ` [${resolved.tracks.length} temas]` : ''}`
            );

            // Acreditar respuesta para que Discord cierre el estado "pensando..."
            await interaction.editReply({
                embeds: [makeEmbed({
                    title: 'Tema agregado',
                    description: 'Tu petición de música se procesó correctamente.\n**Canción:** '
                        + String(track?.title || 'Tema solicitado').slice(0, 160),
                    tone: 'music',
                    footer: 'Prophet Music · /queue para ver la cola',
                })],
            }).catch(err => console.warn('[Music /play] No se pudo confirmar la canción:', err.message));

            return;

        } catch (error) {
            console.error('[Music /play] Error al resolver o reproducir:', error);
            const extractorCount = client.player?.extractors?.store?.size || 0;
            const description = extractorCount === 0
                ? 'El reproductor todavía no tiene fuentes de audio disponibles. Avisale al Staff para que revise el servicio de música.'
                : 'No se pudo reproducir esa canción. Probá con otro tema o volvé a intentarlo más tarde.';
            return interaction.editReply({
                embeds: [makeEmbed({
                    title: 'No se pudo reproducir el tema',
                    description,
                    tone: 'error',
                    footer: 'Prophet Music · Si continúa, avisá al Staff',
                })],
            });
        }
    }
};
