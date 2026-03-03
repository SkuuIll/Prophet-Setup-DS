// ═══ COMANDO: /deposit mejorado ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

function balanceBar(balance, bank) {
    const total = balance + bank;
    if (total === 0) return '`Sin fondos`';
    const blocks = 10;
    const cashBlocks = Math.round((balance / total) * blocks);
    const bankBlocks = blocks - cashBlocks;
    return `${'🟢'.repeat(cashBlocks)}${'🔵'.repeat(bankBlocks)}\n` +
        `> 🟢 Efectivo \`${Math.round((balance / total) * 100)}%\`  ·  🔵 Banco \`${Math.round((bank / total) * 100)}%\``;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('🏦 Depositar dinero en el banco')
        .addStringOption(o =>
            o.setName('cantidad')
                .setDescription('Cantidad a depositar o "todo" para depositar todo')
                .setRequired(true)),

    async execute(interaction) {
        const input = interaction.options.getString('cantidad').trim().toLowerCase();
        const userId = interaction.user.id;
        const eco = stmts.getEconomy(userId);
        const cur = config.ECONOMIA?.CURRENCY || '💰';

        // Aceptar "todo" o "all"
        const amount = (input === 'todo' || input === 'all')
            ? eco.balance
            : parseInt(input.replace(/[,. ]/g, ''));

        if (isNaN(amount) || amount < 1) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setDescription('> ❌ **Cantidad inválida.** Ingresá un número positivo o `todo`.')
                ], ephemeral: true
            });
        }

        if (eco.balance === 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.WARN || 0xFFB74D)
                    .setDescription('> ⚠️ No tenés efectivo para depositar.')
                ], ephemeral: true
            });
        }

        const result = stmts.transferBank(userId, amount, 'dep');
        if (!result) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setDescription(`> ❌ **Fondos insuficientes.** Tenés ${cur} \`${eco.balance.toLocaleString()}\` en efectivo.`)
                ], ephemeral: true
            });
        }

        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                .setAuthor({ name: '🏦  Depósito bancario', iconURL: interaction.user.displayAvatarURL() })
                .setDescription(
                    `> ✅ Depositaste **${cur} ${amount.toLocaleString()}** al banco.\n\n` +
                    `**Nueva distribución:**\n${balanceBar(result.balance, result.bank)}`
                )
                .addFields(
                    { name: '💵 Efectivo', value: `${cur} \`${result.balance.toLocaleString()}\``, inline: true },
                    { name: '🏦 Banco', value: `${cur} \`${result.bank.toLocaleString()}\``, inline: true },
                    { name: '💎 Total', value: `${cur} \`${(result.balance + result.bank).toLocaleString()}\``, inline: true },
                )
                .setFooter({ text: 'Prophet Economy  ·  /withdraw para retirar' })
                .setTimestamp()
            ]
        });
    }
};
