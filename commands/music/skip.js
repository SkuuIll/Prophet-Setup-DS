const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { makeEmbed } = require('../../utils/discordUI');
const { ensureMusicController, musicNotice } = require('../../utils/musicAccess');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Saltar al siguiente tema'),
    async execute(interaction) {
        const denied = ensureMusicController(interaction);
        if (denied) return interaction.reply(denied);
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply(musicNotice('Sin reproducción', 'No hay una sesión de música activa. Empezá usando /play.'));
        }
        const currentTitle = String(queue.currentTrack?.title || 'Canción actual').slice(0, 120);
        queue.node.skip();
        return interaction.reply({ embeds: [makeEmbed({ title: 'Canción saltada', description: '**Tema:** ' + currentTitle + '\n**Acción:** Siguiente canción de la cola.', tone: 'music', footer: 'Prophet Music · /queue para ver la lista' })], allowedMentions: { parse: [] } });
    },
};
