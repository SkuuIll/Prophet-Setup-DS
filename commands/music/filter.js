// ═══ COMANDO: /filter ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('🎛️ Aplica filtros de audio a la canción actual')
        .addStringOption(o => o.setName('tipo').setDescription('Filtro a aplicar')
            .setRequired(true)
            .addChoices(
                { name: '🚫 Desactivar todos', value: 'clear' },
                { name: '🔊 Bassboost', value: 'bassboost' },
                { name: '🌠 Nightcore', value: 'nightcore' },
                { name: '☁️ Vaporwave', value: 'vaporwave' },
                { name: '🌌 8D Audio', value: '8D' },
                { name: '🎤 Karaoke', value: 'karaoke' },
                { name: '📻 Radio Antigua', value: 'lofi' }
            )),

    async execute(interaction, client) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                content: '> ❌ **Sin reproducción** — No hay nada sonando en este momento.',
                ephemeral: true
            });
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== interaction.guild.members.me.voice.channelId) {
            return interaction.reply({
                content: '> ❌ **Canal incorrecto** — Tenés que estar en el mismo canal de voz que el bot para hacer esto.',
                ephemeral: true
            });
        }

        const filtro = interaction.options.getString('tipo');
        await interaction.deferReply();

        let descripcion = '';

        if (filtro === 'clear') {
            queue.filters.ffmpeg.setFilters(false);
            descripcion = '> 🚫 **Filtros desactivados** — Restaurando el audio original.';
        } else {
            // Limpiar todo antes de aplicar el nuevo, a menos que quieras que se mezclen
            // Mejor los limpiamos para que no se sature el audio
            queue.filters.ffmpeg.setFilters(false);

            if (filtro === 'bassboost') { queue.filters.ffmpeg.toggle('bassboost'); }
            if (filtro === 'nightcore') { queue.filters.ffmpeg.toggle('nightcore'); }
            if (filtro === 'vaporwave') { queue.filters.ffmpeg.toggle('vaporwave'); }
            if (filtro === '8D') { queue.filters.ffmpeg.toggle('8D'); }
            if (filtro === 'karaoke') { queue.filters.ffmpeg.toggle('karaoke'); }
            if (filtro === 'lofi') { queue.filters.ffmpeg.toggle('lofi'); }

            descripcion = `> 🎛️ **Filtro aplicado:** \`${filtro}\`\n> *Nota: El audio puede tardar unos segundos en cambiar.*`;
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.MUSICA || 0xBB86FC)
            .setDescription(descripcion)
            .setFooter({ text: 'Prophet Music' });

        await interaction.editReply({ embeds: [embed] });

        try {
            const musicEngine = require('../../modules/musicEngine');
            if (typeof musicEngine.actualizarNowPlaying === 'function') {
                await musicEngine.actualizarNowPlaying(queue);
            }
        } catch (e) { }
    }
};
