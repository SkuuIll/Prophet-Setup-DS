// ═══ COMANDO: /volumen ═══
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volumen')
        .setDescription('Ajustar el volumen de la música')
        .addIntegerOption(o => o.setName('nivel').setDescription('Volumen (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),

    async execute(interaction, client) {
        const { useQueue } = require('discord-player');
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ No hay nada reproduciéndose.', ephemeral: true });
        }

        const vol = interaction.options.getInteger('nivel');
        queue.node.setVolume(vol);
        await interaction.reply(`🔊 Volumen ajustado a **${vol}%**`);
    }
};
