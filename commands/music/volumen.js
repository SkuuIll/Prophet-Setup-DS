// ═══ COMANDO: /volumen ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volumen')
        .setDescription('🔊 Ajustar el volumen de la música')
        .addIntegerOption(o => o.setName('nivel').setDescription('Volumen (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),

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

        const vol = interaction.options.getInteger('nivel');
        queue.node.setVolume(vol);

        // Barra visual
        const bloques = 10;
        const lleno = Math.round((vol / 100) * bloques);
        const vacio = bloques - lleno;
        const barra = '▰'.repeat(lleno) + '▱'.repeat(vacio);
        let icono = '🔇';
        if (vol > 0 && vol <= 30) icono = '🔈';
        else if (vol > 30 && vol <= 70) icono = '🔉';
        else if (vol > 70) icono = '🔊';

        const embed = new EmbedBuilder()
            .setColor(0xBB86FC)
            .setDescription(`> ${icono} **Volumen ajustado**\n> ${barra} \`${vol}%\``)
            .setFooter({ text: 'Prophet Music' });

        await interaction.reply({ embeds: [embed] });
    }
};
