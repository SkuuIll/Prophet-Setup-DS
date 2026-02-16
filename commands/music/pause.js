// ═══ COMANDO: /pause ═══
const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pausar o reanudar la música'),

    async execute(interaction, client) {
        // Verificar canal de voz: Permitir control remoto si el usuario no está en NINGÚN canal.
        // Bloquear solo si está en un canal diferente al del bot.
        const voiceChannel = interaction.member.voice.channel;
        const botChannelId = interaction.guild.members.me.voice.channelId;

        if (voiceChannel && botChannelId && voiceChannel.id !== botChannelId) {
            return interaction.reply({ content: '❌ Estás en otro canal de voz. Entrá al mío o desconectate para usar este comando.', ephemeral: true });
        }
        // The second condition in the provided snippet seems to be a duplicate or an error.
        // The instruction's logic was:
        // const voiceChannel = interaction.member.voice.channel;
        // // Permite si no tiene canal (remoto) o si es el mismo.
        // if (voiceChannel && interaction.guild.members.me.voice.channelId && voiceChannel.id !== interaction.guild.members.me.voice.channelId) {
        //     return interaction.reply({ content: '❌ Estás en otro canal de voz.', ephemeral: true });
        // }
        // The provided "Code Edit" had an additional `if` statement.
        // I will use the first `if` statement from the "Code Edit" as it aligns with the instruction's intent
        // to allow remote control if the user is not in any channel, and block if in a different channel.
        // The second `if` in the "Code Edit" was redundant given the first one.


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
