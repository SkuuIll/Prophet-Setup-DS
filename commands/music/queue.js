// ═══ COMANDO: /queue ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Ver la cola de reproducción actual'),

    async execute(interaction, client) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ No hay nada reproduciéndose.', ephemeral: true });
        }

        const tracks = queue.tracks.toArray();
        const currentTrack = queue.currentTrack;

        const canciones = tracks.map((track, i) =>
            `**${i + 1}.** [${track.title}](${track.url}) — \`${track.duration}\``
        ).slice(0, 15);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.MUSICA || 0x9B59B6)
            .setTitle('🎶 Cola de reproducción')
            .setDescription(`**Reproduciendo ahora:**\n[${currentTrack.title}](${currentTrack.url}) — \`${currentTrack.duration}\`\n\n**Siguientes:**\n${canciones.length ? canciones.join('\n') : '*La cola está vacía.*'}`)
            .setFooter({ text: `${tracks.length} canciones en cola • Volumen: ${queue.node.volume}%` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
