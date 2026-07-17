// ═══ COMANDO: /ai — Chat con ProphetBot usando Gemini ═══

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { preguntarAIA, limpiarContexto } = require('../../modules/aiChat');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('🤖 Chateá con ProphetBot (IA con memoria de conversación)')
        .addSubcommand(sub => sub
            .setName('preguntar')
            .setDescription('Hacé una pregunta o escribí algo')
            .addStringOption(o => o.setName('mensaje').setDescription('Escribí tu pregunta o mensaje').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('limpiar')
            .setDescription('Limpiá el historial de conversación de este canal')
        ),

    async execute(interaction) {
        return interaction.reply({ content: '🤖 **La Inteligencia Artificial está temporalmente desactivada por mantenimiento.**', ephemeral: true });
    }
};
