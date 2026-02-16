// ═══ COMANDO: /pause ═══
const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pausar o reanudar la música'),

    async execute(interaction, client) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: '❌ Tenés que estar en un canal de voz para usar este comando.', ephemeral: true });
        }

        if (interaction.guild.members.me.voice.channelId && voiceChannel.id !== interaction.guild.members.me.voice.channelId) {
            return interaction.reply({ content: '❌ Tenés que estar en el mismo canal de voz que yo.', ephemeral: true });
        }

        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ No hay nada reproduciéndose en este momento.', ephemeral: true });
        }

        const isPaused = queue.node.isPaused();

        if (isPaused) {
            queue.node.setPaused(false);
            await interaction.reply('▶️ **Música reanudada.** ¡A seguir escuchando!');
        } else {
            queue.node.setPaused(true);
            await interaction.reply('⏸️ **Música pausada.** Usá `/pause` de nuevo para reanudar.');
        }
    }
};
