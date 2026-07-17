// ═══ COMANDO: /play ═══ (Versión discord-player)
const { SlashCommandBuilder } = require('discord.js');
const { buildDiscordPlaylist, resolveMusicQuery } = require('../../utils/musicResolver');

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
            await interaction.deleteReply().catch(() => { });
            return;

        } catch (error) {
            console.error(`Play error para ${JSON.stringify(queryOriginal)}:`, error.message);
            const extractorCount = client.player?.extractors?.store?.size || 0;
            const safeQuery = queryOriginal.replace(/`/g, 'ˋ').slice(0, 300);
            const safeDetail = String(error.message || 'Error desconocido').replace(/`/g, 'ˋ').slice(0, 900);
            let errorMsg = `❌ No se pudo encontrar ni reproducir: \`${safeQuery}\`\nDetalle: ${safeDetail}`;
            if (extractorCount === 0) {
                errorMsg += `\n⚠️ **No hay extractores de música cargados.** Reiniciá el bot con \`./install.sh\` en la VPS.`;
            }
            return interaction.editReply({ content: errorMsg });
        }
    }
};
