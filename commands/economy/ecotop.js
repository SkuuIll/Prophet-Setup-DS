// ═══ COMANDO: /ecotop mejorado ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

const TIERS = [
    { min: 0, label: '🌱 Sin fondos', color: 0x78909C },
    { min: 1000, label: '💵 Ahorrista', color: 0x66BB6A },
    { min: 10000, label: '💰 Comerciante', color: 0x42A5F5 },
    { min: 50000, label: '💎 Inversor', color: 0xAB47BC },
    { min: 200000, label: '🏦 Banquero', color: 0xFFD700 },
    { min: 1000000, label: '👑 Magnate', color: 0xFF8F00 },
];

function getTier(total) {
    return [...TIERS].reverse().find(t => total >= t.min) || TIERS[0];
}

function wealthBar(total, max) {
    if (max === 0) return '▱'.repeat(8);
    const pct = Math.min(total / max, 1);
    const fill = Math.round(pct * 8);
    return '▰'.repeat(fill) + '▱'.repeat(8 - fill);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ecotop')
        .setDescription('💰 Ranking de los usuarios más ricos del servidor'),

    async execute(interaction) {
        await interaction.deferReply();

        const topUsers = stmts.getEcoTop(10);
        const currency = config.ECONOMIA?.CURRENCY || '💰';

        if (!topUsers || topUsers.length === 0 || topUsers.every(u => u.total === 0)) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.WARN || 0xFFB74D)
                    .setDescription('> 📭 Nadie tiene dinero todavía. ¡Trabajá y apostá!')
                ]
            });
        }

        const maxWealth = topUsers[0]?.total || 1;
        const MEDALLAS = ['🥇', '🥈', '🥉'];

        const lines = [];
        for (let i = 0; i < topUsers.length; i++) {
            const u = topUsers[i];
            if (u.total === 0) continue;

            const userObj = await interaction.client.users.fetch(u.id).catch(() => null);
            const nombre = userObj?.username || `Usuario ${u.id.slice(-4)}`;
            const medal = MEDALLAS[i] || `\`${String(i + 1).padStart(2)}\``;
            const tier = getTier(u.total);
            const bar = wealthBar(u.total, maxWealth);
            const esYo = u.id === interaction.user.id ? ' ← **vos**' : '';

            lines.push(
                `${medal} **${nombre}**${esYo}  ${tier.label}\n` +
                `> ${bar}  ${currency} \`${u.total.toLocaleString()}\`  *(ef: ${u.balance.toLocaleString()} · bn: ${u.bank.toLocaleString()})*`
            );
        }

        // Mi posición si estoy fuera
        const miPos = topUsers.findIndex(u => u.id === interaction.user.id);
        let miPosStr = '';
        if (miPos === -1) {
            const miData = stmts.getEconomy(interaction.user.id);
            const miTotal = miData.balance + miData.bank;
            if (miTotal > 0) {
                const myTier = getTier(miTotal);
                miPosStr = `\n\n**Tu posición:**\n> ${interaction.user.username} · ${myTier.label} · ${currency} \`${miTotal.toLocaleString()}\``;
            } else {
                miPosStr = `\n\n**Tu posición:** \`Fuera del ranking\` — aún sin fondos`;
            }
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setAuthor({ name: '💰  Top Ricos · Prophet Economy', iconURL: interaction.guild.iconURL() })
            .setDescription(lines.join('\n\n') + miPosStr)
            .addFields(
                { name: '🏆 Nº1', value: `<@${topUsers[0].id}>`, inline: true },
                { name: '💎 Fortuna top', value: `${currency} ${maxWealth.toLocaleString()}`, inline: true },
                { name: '📊 Tu lugar', value: miPos >= 0 ? `\`#${miPos + 1}\`` : '`Fuera del top`', inline: true }
            )
            .setFooter({ text: `Prophet Economy  ·  Efectivo + Banco` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
