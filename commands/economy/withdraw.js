const { SlashCommandBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');
const { makeEmbed, notice, parseCoinAmount, walletFields } = require('../../utils/discordUI');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Retirar monedas del banco')
        .addStringOption(option => option.setName('cantidad')
            .setDescription('Cantidad o "todo" para mover todo el saldo')
            .setRequired(true)),

    async execute(interaction) {
        const eco = stmts.getEconomy(interaction.user.id);
        const currency = config.ECONOMIA?.CURRENCY || '💰';
        const requested = interaction.options.getString('cantidad');
        const amount = parseCoinAmount(requested, eco.bank);
        if (amount === null) {
            return interaction.reply(notice({
                title: 'Cantidad inválida',
                description: 'Ingresá una cantidad positiva de monedas o escribí **todo**. No se aceptan decimales.',
                tone: 'error',
            }));
        }
        if (!eco.bank) {
            return interaction.reply(notice({
                title: 'Sin fondos',
                description: 'No tenés monedas en el banco para retirar.',
                tone: 'warning',
            }));
        }
        const result = stmts.transferBank(interaction.user.id, amount, 'with');
        if (!result) {
            return interaction.reply(notice({
                title: 'Operación rechazada',
                description: 'No se pudieron mover esas monedas. Es posible que tu saldo haya cambiado; consultá /balance.',
                tone: 'error',
            }));
        }

        return interaction.reply({
            embeds: [makeEmbed({
                title: 'Retiro confirmado',
                tone: 'info',
                iconURL: interaction.user.displayAvatarURL?.(),
                description: '**Retiraste ' + currency + ' ' + amount.toLocaleString('es-AR') + ' del banco.**'
                    + '\n\nTu cartera ya está actualizada. Los movimientos entre efectivo y banco no cambian el total.',
                fields: walletFields(result.balance, result.bank, currency),
                footer: 'Economía · /deposit para guardar tus monedas',
            })],
        });
    },
};
