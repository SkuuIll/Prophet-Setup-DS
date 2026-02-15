// ═══ COMANDO: /play ═══ (Versión discord-player)
const { SlashCommandBuilder } = require('discord.js');
const { QueryType } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Reproducir música de YouTube/Spotify')
        .addStringOption(o => o.setName('cancion').setDescription('URL o nombre de la canción').setRequired(true)),

    async execute(interaction, client) {
        // Asegurar inicialización
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
        const query = interaction.options.getString('cancion');

        try {
            const { track } = await client.player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel
                    },
                    volume: 50,
                    laveOnEmpty: true,
                    leaveOnEmptyCooldown: 30000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 60000,
                }
            });

            return interaction.editReply({ content: `🎵 Cargando **${track.title}**...` });

        } catch (e) {
            console.error(e);
            return interaction.editReply({ content: `❌ No se pudo encontrar ni reproducir: \`${query}\`\nDetalle: ${e.message}` });
        }
    }
};
