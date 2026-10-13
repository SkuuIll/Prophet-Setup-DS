const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { makeEmbed } = require('../../utils/discordUI');
const { ensureMusicController, musicNotice } = require('../../utils/musicAccess');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pausar o continuar la reproducción'),
    async execute(interaction) {
        const denied = ensureMusicController(interaction);
        if (denied) return interaction.reply(denied);
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.currentTrack) {
            return interaction.reply(musicNotice('Sin reproducción', 'No hay una sesión de música activa. Empezá usando /play.'));
        }
        const isPaused = queue.node.isPaused();
        queue.node.setPaused(!isPaused);
        const title = isPaused ? 'Música reanudada' : 'Música pausada';
        const description = isPaused ? 'La reproducción continúa.' : 'Usá /pause para continuar cuando quieras.';
        return interaction.reply({ embeds: [makeEmbed({ title, description, tone: 'music', footer: 'Prophet Music' })] });
    },
};
