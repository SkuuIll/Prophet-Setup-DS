// ═══ COMANDO: /volumen ═══
const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volumen')
        .setDescription('Ajustar el volumen de la música')
        .addIntegerOption(o => o.setName('nivel').setDescription('Volumen (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),

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

        const vol = interaction.options.getInteger('nivel');
        const emoji = vol > 70 ? '🔊' : vol > 30 ? '🔉' : '🔈';
        queue.node.setVolume(vol);
        await interaction.reply(`${emoji} Volumen ajustado a **${vol}%**`);
    }
};
