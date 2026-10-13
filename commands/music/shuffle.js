const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { makeEmbed } = require('../../utils/discordUI');
const { ensureMusicController, musicNotice } = require('../../utils/musicAccess');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Mezclar las canciones de la cola'),
    async execute(interaction) {
        const denied = ensureMusicController(interaction);
        if (denied) return interaction.reply(denied);
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply(musicNotice('Sin reproducción', 'No hay una sesión de música activa. Empezá usando /play.'));
        }
        if (queue.tracks.toArray().length < 2) return interaction.reply(musicNotice('Cola demasiado corta', 'Agregá al menos dos canciones con /play para mezclarlas.'));
        queue.tracks.shuffle();
        return interaction.reply({ embeds: [makeEmbed({ title: 'Cola mezclada', description: 'Cambié el orden de los temas pendientes.', tone: 'music', footer: 'Prophet Music · /queue para ver el nuevo orden' })] });
    },
};
