// ═══ COMANDO: /stop ═══
const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Detener música y salir'),

    async execute(interaction, client) {
        const queue = useQueue(interaction.guild.id);

        if (!queue) {
            return interaction.reply({ content: '❌ No hay nada sonando.', ephemeral: true });
        }

        queue.delete();
        return interaction.reply('⏹️ **Música detenida y cola limpiada.**');
    }
};
