// ═══════════════════════════════════════════════════════════════
// COMANDO CONTEXTUAL: Dar Coins
// Prophet Bot v2.9
// ═══════════════════════════════════════════════════════════════

const { ContextMenuCommandBuilder, ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Dar Coins')
        .setType(ApplicationCommandType.User),

    async execute(interaction) {
        const targetUser = interaction.targetUser;
        const senderUser = interaction.user;

        if (targetUser.id === senderUser.id) {
            return interaction.reply({
                content: '❌ No podés darte coins a vos mismo.',
                ephemeral: true
            });
        }

        if (targetUser.bot) {
            return interaction.reply({
                content: '❌ No podés enviar coins a un bot.',
                ephemeral: true
            });
        }

        const sender = stmts.getEconomy(senderUser.id);
        if (!sender || sender.balance <= 0) {
            return interaction.reply({
                content: '❌ No tenés coins para transferir.',
                ephemeral: true
            });
        }

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
    },

    async handleModal(interaction) {
        const targetUserId = interaction.customId.replace('pay_modal_', '');
        const rawAmount = interaction.fields.getTextInputValue('amount');
        const amount = Number.parseInt(rawAmount.replace(/[^0-9]/g, ''), 10);
        const currency = config.ECONOMIA?.CURRENCY || '💰';

        if (!Number.isSafeInteger(amount) || amount <= 0) {
            return interaction.reply({
                content: '❌ Ingresá una cantidad válida mayor a 0.',
                ephemeral: true
            });
        }

        if (targetUserId === interaction.user.id) {
            return interaction.reply({
                content: '❌ No podés darte coins a vos mismo.',
                ephemeral: true
            });
        }

        const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => null);
        if (!targetUser || targetUser.bot) {
            return interaction.reply({
                content: '❌ No pude encontrar al usuario destino.',
                ephemeral: true
            });
        }

        const sender = stmts.getEconomy(interaction.user.id);
        if (!sender || sender.balance < amount) {
            return interaction.reply({
                content: `❌ Fondos insuficientes. Tenés ${currency} ${sender?.balance?.toLocaleString?.() || 0}.`,
                ephemeral: true
            });
        }

        const removed = stmts.removeMoney(interaction.user.id, amount, 'balance');
        if (!removed) {
            return interaction.reply({
                content: '❌ No se pudo procesar la transferencia. Intentá de nuevo.',
                ephemeral: true
            });
        }

        stmts.addMoney(targetUser.id, amount, 'balance');
        const updatedSender = stmts.getEconomy(interaction.user.id);

        try {
            await targetUser.send({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                    .setAuthor({ name: '💸 Recibiste una transferencia', iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(
                        `> ${interaction.user} te envió **${currency} ${amount.toLocaleString()}**.\n` +
                        '> El dinero ya está disponible en tu efectivo.'
                    )
                    .setFooter({ text: 'Prophet Economy' })
                    .setTimestamp()]
            });
        } catch { }

        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                .setAuthor({ name: '💸 Transferencia completada', iconURL: interaction.user.displayAvatarURL() })
                .setDescription(
                    `> ✅ Enviaste **${currency} ${amount.toLocaleString()}** a ${targetUser}.\n\n` +
                    `> 💵 Tu efectivo restante: **${currency} ${updatedSender.balance.toLocaleString()}**`
                )
                .setFooter({ text: 'Prophet Economy' })
                .setTimestamp()],
            ephemeral: true
        });
    }
};
