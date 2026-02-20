// ═══ COMANDO: /loop ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('🔁 Cambiar el modo de repetición de la música')
        .addIntegerOption(o => o.setName('modo').setDescription('Modo de repetición')
            .setRequired(true)
            .addChoices(
                { name: 'Desactivado (Normal)', value: 0 },
                { name: 'Repetir Track Actual', value: 1 },
                { name: 'Repetir Toda la Cola', value: 2 }
            )),

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

        const mode = interaction.options.getInteger('modo');
        queue.setRepeatMode(mode);

        const modeNames = [
            '> ▷ **Loop desactivado** — Reproducción normal',
            '> 🔂 **Loop activado (Track)** — Se repetirá la canción actual infinitamente',
            '> 🔁 **Loop activado (Cola)** — Se repetirá toda la cola infinitamente'
        ];

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.INFO || 0x42A5F5)
            .setDescription(modeNames[mode])
            .setFooter({ text: 'Prophet Music' });

        await interaction.reply({ embeds: [embed] });

        // Actualizar el player message si existe (musicEngine lo maneja)
        try {
            const musicEngine = require('../../modules/musicEngine');
            // Check si la función para actualizar embeds está expuesta
            if (typeof musicEngine.actualizarNowPlaying === 'function') {
                await musicEngine.actualizarNowPlaying(queue);
            }
        } catch (e) { }
    }
};
