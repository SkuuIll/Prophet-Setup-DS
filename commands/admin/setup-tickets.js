// ═══ COMANDO: /setup-tickets ═══
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { crearPanelTickets } = require('../../modules/tickets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setuptickets')
        .setDescription('Configurar el panel de tickets en este canal')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        await crearPanelTickets(interaction.channel);
        await interaction.editReply({ content: '✅ Panel de tickets configurado en este canal.' });
    }
};
