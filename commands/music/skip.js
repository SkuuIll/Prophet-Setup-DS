// ═══ COMANDO: /skip ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('⏭️ Saltar a la siguiente canción de la cola'),

    async execute(interaction, client) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({
                content: '> ❌ **Sin canal** — Tenés que estar en un canal de voz.',
                ephemeral: true
            });
        }

        if (interaction.guild.members.me.voice.channelId && voiceChannel.id !== interaction.guild.members.me.voice.channelId) {
            return interaction.reply({
                content: '> ❌ **Canal incorrecto** — Tenés que estar en el mismo canal de voz.',
                ephemeral: true
            });
        }

        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                content: '> ❌ **Sin reproducción** — No hay nada sonando en este momento.',
                ephemeral: true
            });
        }

        const currentTitle = queue.currentTrack?.title || 'Canción actual';
        queue.node.skip();

        const embed = new EmbedBuilder()
            .setColor(0xFFD54F)
            .setDescription(`> ⏭️ **Saltada:** ${currentTitle}\n> Saltada por ${interaction.user}`)
            .setFooter({ text: 'Prophet Music' });

        return interaction.reply({ embeds: [embed] });
    }
};
