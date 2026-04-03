// ═══ COMANDO: /volumen ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { stmts } = require('../../database');

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
                flags: 64
            });
        }

        if (interaction.guild.members.me.voice.channelId && voiceChannel.id !== interaction.guild.members.me.voice.channelId) {
            return interaction.reply({
                content: '> ❌ **Canal incorrecto** — Tenés que estar en el mismo canal de voz.',
                flags: 64
            });
        }

        const vol = interaction.options.getInteger('nivel');

        // Guardar en DB para futuras reproducciones (tanto Shoukaku como discord-player)
        stmts.setGuildVolume(interaction.guild.id, vol);

        // Aplicar a la cola actual si existe (discord-player)
        let isPlaying = false;
        try {
            const queue = useQueue(interaction.guild.id);
            if (queue && queue.isPlaying()) {
                queue.node.setVolume(vol);
                isPlaying = true;
            }
        } catch { }

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
