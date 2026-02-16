// ═══ COMANDO: /skip ═══
const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Saltar a la siguiente canción de la cola'),

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

        const currentTitle = queue.currentTrack?.title || 'canción actual';
        queue.node.skip();
        return interaction.reply(`⏭️ **Saltada:** ${currentTitle}`);
    }
};
