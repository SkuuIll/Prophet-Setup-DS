// ═══ COMANDO: /balance ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('💰 Ver tu saldo actual o el de otro usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario') || interaction.user;
        const eco = stmts.getEconomy(target.id);
        const currency = config.ECONOMIA.CURRENCY;
        const total = eco.balance + eco.bank;

        // Barra visual de distribución
        const barLength = 12;
        const balPct = total > 0 ? Math.round((eco.balance / total) * barLength) : 0;
        const bankPct = barLength - balPct;
        const barra = '🟢'.repeat(Math.min(balPct, barLength)) + '🔵'.repeat(Math.max(bankPct, 0));

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setAuthor({ name: `💰  Balance de ${target.username}`, iconURL: target.displayAvatarURL() })
            .setDescription(
                `\`\`\`\n` +
                `  💵 Efectivo  │  ${currency} ${eco.balance.toLocaleString()}\n` +
                `  🏦 Banco     │  ${currency} ${eco.bank.toLocaleString()}\n` +
                `  ─────────────┼──────────────\n` +
                `  💎 Total     │  ${currency} ${total.toLocaleString()}\n` +
                `\`\`\`\n` +
                `${barra}`
            )
            .setFooter({ text: 'Prophet Economy  ·  /daily /work /gamble' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
