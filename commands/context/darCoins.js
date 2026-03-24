// ═══════════════════════════════════════════════════════════════
// COMANDO CONTEXTUAL: Dar Coins
// Prophet Bot v2.9
// ═══════════════════════════════════════════════════════════════

const { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../../database');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Dar Coins')
        .setType(ApplicationCommandType.User),

    async execute(interaction) {
        const targetUser = interaction.targetUser;
        const senderUser = interaction.user;

        // No permitirse darse coins a sí mismo
        if (targetUser.id === senderUser.id) {
            return interaction.reply({
                content: '❌ No podés darte coins a vos mismo.',
                ephemeral: true
            });
        }

        // Verificar balance del remitente
        const sender = db.prepare('SELECT balance FROM users WHERE id = ?').get(senderUser.id);
        if (!sender || sender.balance <= 0) {
            return interaction.reply({
                content: '❌ No tenés coins para transferir.',
                ephemeral: true
            });
        }

        // Crear modal para ingresar cantidad
        const modal = new ModalBuilder()
            .setCustomId(`pay_modal_${targetUser.id}`)
            .setTitle(`Dar Coins a ${targetUser.username}`)
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('amount')
                        .setLabel('Cantidad de coins')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder(`Tu balance: ${sender.balance.toLocaleString()}`)
                        .setRequired(true)
                        .setMaxLength(10)
                )
            );

        return interaction.showModal(modal);
    }
};
