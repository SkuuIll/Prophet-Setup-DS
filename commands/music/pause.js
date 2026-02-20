// ═══ COMANDO: /pause ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('⏸️ Pausar o reanudar la música'),

    async execute(interaction, client) {
        const voiceChannel = interaction.member.voice.channel;
        const botChannelId = interaction.guild.members.me.voice.channelId;

        if (voiceChannel && botChannelId && voiceChannel.id !== botChannelId) {
            return interaction.reply({
                content: '> ❌ **Acceso denegado** — Tenés que estar en el mismo canal de voz.',
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

        const isPaused = queue.node.isPaused();

        if (isPaused) {
            queue.node.setPaused(false);
            const embed = new EmbedBuilder()
                .setColor(0xBB86FC)
                .setDescription('> ▶️ **Música reanudada** — ¡A seguir escuchando!')
                .setFooter({ text: 'Prophet Music' });
            await interaction.reply({ embeds: [embed] });
        } else {
            queue.node.setPaused(true);
            const embed = new EmbedBuilder()
                .setColor(0xFFB74D)
                .setDescription('> ⏸️ **Música pausada** — Usá `/pause` de nuevo para reanudar.')
                .setFooter({ text: 'Prophet Music' });
            await interaction.reply({ embeds: [embed] });
        }
    }
};
