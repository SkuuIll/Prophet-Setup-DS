// ═══ COMANDO: /stop ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('⏹️ Detener la música y vaciar la cola'),

    async execute(interaction, client) {
        const voiceChannel = interaction.member.voice.channel;
        const botChannelId = interaction.guild.members.me.voice.channelId;

        if (voiceChannel && botChannelId && voiceChannel.id !== botChannelId) {
            return interaction.reply({
                content: '> ❌ **Canal incorrecto** — Tenés que estar en el mismo canal de voz.',
                flags: 64
            });
        }

        const queue = useQueue(interaction.guild.id);

        if (!queue) {
            return interaction.reply({
                content: '> ❌ **Sin reproducción** — No hay nada sonando en este momento.',
                flags: 64
            });
        }

        queue.delete();

        const embed = new EmbedBuilder()
            .setColor(0x37474F)
            .setDescription('> ⏹️ **Reproducción detenida** — La cola fue vaciada y me desconecté del canal. ¡Nos vemos! 👋')
            .setFooter({ text: 'Prophet Music' });

        return interaction.reply({ embeds: [embed] });
    }
};
