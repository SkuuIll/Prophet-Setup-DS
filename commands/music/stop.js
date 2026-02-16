// ═══ COMANDO: /stop ═══
const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Detener la música y vaciar la cola'),

    async execute(interaction, client) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: '❌ Tenés que estar en un canal de voz para usar este comando.', ephemeral: true });
        }

        if (interaction.guild.members.me.voice.channelId && voiceChannel.id !== interaction.guild.members.me.voice.channelId) {
            return interaction.reply({ content: '❌ Tenés que estar en el mismo canal de voz que yo.', ephemeral: true });
        }

        const queue = useQueue(interaction.guild.id);

        if (!queue) {
            return interaction.reply({ content: '❌ No hay nada reproduciéndose en este momento.', ephemeral: true });
        }

        queue.delete();
        return interaction.reply('⏹️ **Música detenida.** La cola fue vaciada y me desconecté del canal.');
    }
};
