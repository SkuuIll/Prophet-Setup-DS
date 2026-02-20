// ═══ COMANDO: /inventory ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

const ITEM_NAMES = {
    'vip_ticket': '🎟️ Pase VIP',
    'prophet_sword': '⚔️ Espada del Profeta',
    'shield_aegis': '🛡️ Escudo Égida',
    'xp_potion': '🧪 Poción de XP',
    'mystery_box': '🎁 Caja Misteriosa'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('🎒 Ver los objetos de tu inventario')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Ver el inventario de otro usuario')),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario') || interaction.user;
        const inventory = stmts.getInventory(target.id);
        const economy = stmts.getEconomy(target.id);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setAuthor({ name: `🎒  Inventario de ${target.username}`, iconURL: target.displayAvatarURL() })
            .setTimestamp();

        if (inventory.length === 0) {
            embed.setDescription(
                `> El inventario está vacío.\n` +
                `> Visitá la \`/shop\` para comprar objetos.\n\n` +
                `**Estado financiero:**\n` +
                `> 💵 Efectivo: **${config.ECONOMIA.CURRENCY} ${economy.balance.toLocaleString()}**\n` +
                `> 🏦 Banco: **${config.ECONOMIA.CURRENCY} ${economy.bank.toLocaleString()}**`
            );
        } else {
            const itemsList = inventory.map(item => {
                const name = ITEM_NAMES[item.id] || item.id;
                return `> ${name} — **x${item.amount}**`;
            }).join('\n');

            embed.setDescription(
                `**🗃️ Objetos:**\n${itemsList}\n\n` +
                `**Estado financiero:**\n` +
                `> 💵 Efectivo: **${config.ECONOMIA.CURRENCY} ${economy.balance.toLocaleString()}**\n` +
                `> 🏦 Banco: **${config.ECONOMIA.CURRENCY} ${economy.bank.toLocaleString()}**`
            );
        }

        embed.setFooter({ text: `Prophet Economy  ·  ${inventory.length} tipo(s) de objeto` });

        await interaction.reply({ embeds: [embed] });
    }
};
