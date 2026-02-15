// ═══ COMANDO: /skip ═══
const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Saltar la canción actual'),

    async execute(interaction, client) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ No hay nada sonando ahora.', ephemeral: true });
        }

        queue.node.skip();
        return interaction.reply('⏭️ **Canción saltada.**');
    }
};
