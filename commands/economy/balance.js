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

        // Barra visual de distribución efectivo vs banco (10 bloques)
        const barLength = 10;
        const balPct = total > 0 ? Math.round((eco.balance / total) * barLength) : 0;
        const bankPct = barLength - balPct;
        const barra = '🟢'.repeat(Math.min(balPct, barLength)) + '🔵'.repeat(Math.max(bankPct, 0));

        // Riqueza relativa con label dinámico
        const getRangoLabel = (t) => {
            if (t <= 0) return '🪨 Sin fondos';
            if (t < 1000) return '🌱 Empezando';
            if (t < 5000) return '💵 En crecimiento';
            if (t < 20000) return '💰 Próspero';
            if (t < 100000) return '💎 Adinerado';
            return '👑 Magnate del servidor';
        };

        const isSelf = target.id === interaction.user.id;
        const titleSuffix = isSelf ? 'Tu Cartera' : `Cartera de ${target.username}`;

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setAuthor({ name: `💰  ${titleSuffix}`, iconURL: target.displayAvatarURL() })
            .setDescription(
                `\`\`\`\n` +
                `  💵 Efectivo  │  ${currency} ${eco.balance.toLocaleString()}\n` +
                `  🏦 Banco     │  ${currency} ${eco.bank.toLocaleString()}\n` +
                `  ─────────────┼──────────────\n` +
                `  💎 Total     │  ${currency} ${total.toLocaleString()}\n` +
                `\`\`\`` +
                `\nDistribución: ${barra}\n` +
                `> 🟢 Efectivo · 🔵 Banco\n\n` +
                `> ${getRangoLabel(total)}`
            )
            .setFooter({ text: 'Prophet Economy  ·  /daily /work /gamble' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
