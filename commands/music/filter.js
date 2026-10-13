const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { makeEmbed } = require('../../utils/discordUI');
const { ensureMusicController, musicNotice } = require('../../utils/musicAccess');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Elegir un efecto de audio').addStringOption(o => o.setName('tipo').setDescription('Filtro de audio').setRequired(true).addChoices({ name: 'Desactivar', value: 'clear' }, { name: 'Bassboost', value: 'bassboost' }, { name: 'Nightcore', value: 'nightcore' }, { name: 'Vaporwave', value: 'vaporwave' }, { name: '8D', value: '8D' }, { name: 'Karaoke', value: 'karaoke' }, { name: 'Radio antigua', value: 'lofi' })),
    async execute(interaction) {
        const denied = ensureMusicController(interaction);
        if (denied) return interaction.reply(denied);
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply(musicNotice('Sin reproducción', 'No hay una sesión de música activa. Empezá usando /play.'));
        }
        const filter = interaction.options.getString('tipo');
        const ffmpeg = queue.filters?.ffmpeg;
        if (!ffmpeg) return interaction.reply(musicNotice('Filtro no disponible', 'El motor de audio no admite filtros en este momento.', 'error'));
        ffmpeg.setFilters(false);
        if (filter !== 'clear') ffmpeg.toggle(filter);
        return interaction.reply({ embeds: [makeEmbed({ title: 'Filtro actualizado', description: filter === 'clear' ? 'Se restauró el sonido original.' : 'Filtro aplicado: **' + filter + '**. El cambio puede demorar unos segundos.', tone: 'music', footer: 'Prophet Music' })] });
    },
};
