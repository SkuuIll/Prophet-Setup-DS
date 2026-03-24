// ═══════════════════════════════════════════════════════════════
// COMANDO CONTEXTUAL: Reportar Usuario
// Prophet Bot v2.9
// ═══════════════════════════════════════════════════════════════

const { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Reportar Usuario')
        .setType(ApplicationCommandType.User),

    async execute(interaction) {
        const targetUser = interaction.targetUser;
        const reporter = interaction.user;

        // No reportarse a sí mismo
        if (targetUser.id === reporter.id) {
            return interaction.reply({
                content: '❌ No podés reportarte a vos mismo.',
                ephemeral: true
            });
        }

        // Crear modal para el reporte
        const modal = new ModalBuilder()
            .setCustomId(`context_report_${targetUser.id}`)
            .setTitle(`Reportar a ${targetUser.username}`)
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('reason')
                        .setLabel('Razón del reporte')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Describí el motivo del reporte...')
                        .setRequired(true)
                        .setMaxLength(1000)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('evidence')
                        .setLabel('Evidencia (links, opcional)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('https://...')
                        .setRequired(false)
                        .setMaxLength(500)
                )
            );

        return interaction.showModal(modal);
    }
};
