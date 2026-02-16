// ═══ COMANDO: /stop ═══
const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Detener la música y vaciar la cola'),

    async execute(interaction, client) {
        // Verificar canal de voz: Permitir control remoto si el usuario no está en NINGÚN canal.
        // Bloquear solo si está en un canal diferente al del bot.
        const voiceChannel = interaction.member.voice.channel;
        const botChannelId = interaction.guild.members.me.voice.channelId;

        if (voiceChannel && botChannelId && voiceChannel.id !== botChannelId) {
            return interaction.reply({ content: '❌ Estás en otro canal de voz. Entrá al mío o desconectate para usar este comando.', ephemeral: true });
        }

        const queue = useQueue(interaction.guild.id);

        if (!queue) {
            return interaction.reply({ content: '❌ No hay nada reproduciéndose en este momento.', ephemeral: true });
        }

        queue.delete();
        return interaction.reply('⏹️ **Música detenida.** La cola fue vaciada y me desconecté del canal.');
    }
};
