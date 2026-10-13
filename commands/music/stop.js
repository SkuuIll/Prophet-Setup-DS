const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { makeEmbed } = require('../../utils/discordUI');
const { ensureMusicController, musicNotice } = require('../../utils/musicAccess');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Detener el audio y borrar la cola'),
    async execute(interaction) {
        const denied = ensureMusicController(interaction);
        if (denied) return interaction.reply(denied);
        const queue = useQueue(interaction.guild.id);
        if (!queue) {
            return interaction.reply(musicNotice('Sin reproducción', 'No hay una sesión de música activa. Empezá usando /play.'));
        }
        queue.delete();
        return interaction.reply({ embeds: [makeEmbed({ title: 'Reproducción detenida', description: 'Se vació la cola de reproducción.', tone: 'music', footer: 'Prophet Music · /play para escuchar otra canción' })] });
    },
};
