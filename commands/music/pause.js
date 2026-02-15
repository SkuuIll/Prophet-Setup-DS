// ═══ COMANDO: /pause ═══
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pausar/resumir la música'),

    async execute(interaction, client) {
        const { useQueue } = require('discord-player');
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ No hay nada reproduciéndose.', ephemeral: true });
        }

        const isPaused = queue.node.isPaused();

        if (isPaused) {
            queue.node.setPaused(false);
            await interaction.reply('▶️ **Música resumida.**');
        } else {
            queue.node.setPaused(true);
            await interaction.reply('⏸️ **Música pausada.**');
        }
    }
};
