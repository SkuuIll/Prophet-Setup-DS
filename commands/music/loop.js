const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { makeEmbed } = require('../../utils/discordUI');
const { ensureMusicController, musicNotice } = require('../../utils/musicAccess');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Cambiar el modo de repetición').addIntegerOption(o => o.setName('modo').setDescription('Cómo repetir la música').setRequired(true).addChoices({ name: 'Sin repetir', value: 0 }, { name: 'Repetir canción', value: 1 }, { name: 'Repetir cola', value: 2 })),
    async execute(interaction) {
        const denied = ensureMusicController(interaction);
        if (denied) return interaction.reply(denied);
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply(musicNotice('Sin reproducción', 'No hay una sesión de música activa. Empezá usando /play.'));
        }
        const mode = interaction.options.getInteger('modo');
        queue.setRepeatMode(mode);
        const descriptions = ['Las canciones se reproducen una vez.', 'Repetiré la canción actual.', 'Repetiré toda la cola.'];
        return interaction.reply({ embeds: [makeEmbed({ title: 'Repetición actualizada', description: descriptions[mode] || descriptions[0], tone: 'music', footer: 'Prophet Music' })] });
    },
};
