// ═══ COMANDO: /shuffle ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('🔀 Mezclar la cola de reproducción'),

    async execute(interaction, client) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                content: '> ❌ **Sin reproducción** — No hay nada sonando en este momento.',
                ephemeral: true
            });
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== interaction.guild.members.me.voice.channelId) {
            return interaction.reply({
                content: '> ❌ **Canal incorrecto** — Tenés que estar en el mismo canal de voz que el bot para hacer esto.',
                ephemeral: true
            });
        }

        if (queue.tracks.toArray().length < 2) {
            return interaction.reply({
                content: '> ❌ **Pocas canciones** — Necesitás al menos 2 canciones en la cola para mezclarla.',
                ephemeral: true
            });
        }

        queue.tracks.shuffle();

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setDescription('> 🔀 **Cola mezclada** — El orden de las canciones ha sido aleatorizado.')
            .setFooter({ text: 'Prophet Music' });

        await interaction.reply({ embeds: [embed] });

        // Actualizar el player message
        try {
            const musicEngine = require('../../modules/musicEngine');
            if (typeof musicEngine.actualizarNowPlaying === 'function') {
                await musicEngine.actualizarNowPlaying(queue);
            }
        } catch (e) { }
    }
};
