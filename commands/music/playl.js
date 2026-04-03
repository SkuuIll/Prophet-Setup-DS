const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playl')
        .setDescription('⚠️ Temporalmente deshabilitado; usá /play'),

    async execute(interaction) {
        return interaction.reply({
            content: '> ⚠️ `/playl` quedó deshabilitado temporalmente para evitar inconsistencias del motor de música.\n> Usá `/play <canción>` que es el flujo soportado ahora mismo.',
            flags: 64,
        });
    },
};
