// ═══ COMANDO: /inventory mejorado ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

// Mapa completo de items con rareza y descripción
const ITEMS = {
    'vip_ticket': { emoji: '🎟️', name: 'Pase VIP', rareza: '⭐ Común', desc: 'Acceso a canales VIP' },
    'prophet_sword': { emoji: '⚔️', name: 'Espada del Profeta', rareza: '💎 Épico', desc: 'Arma legendaria' },
    'shield_aegis': { emoji: '🛡️', name: 'Escudo Égida', rareza: '🔵 Raro', desc: 'Protección total' },
    'xp_potion': { emoji: '🧪', name: 'Poción de XP', rareza: '⭐ Común', desc: 'Multiplica tu XP' },
    'mystery_box': { emoji: '🎁', name: 'Caja Misteriosa', rareza: '🟣 Legendario', desc: 'Contiene una sorpresa' },
    'premium_pass': { emoji: '🌟', name: 'Pase Premium', rareza: '💎 Épico', desc: 'Acceso total al servidor' },
    'golden_coin': { emoji: '🪙', name: 'Moneda de Oro', rareza: '⭐ Común', desc: 'Coleccionable' },
    'dark_blade': { emoji: '🗡️', name: 'Hoja Oscura', rareza: '🔴 Ultra Raro', desc: 'Solo los elegidos' },
};

const RAREZA_ORDER = ['🔴 Ultra Raro', '🟣 Legendario', '💎 Épico', '🔵 Raro', '⭐ Común'];

function formatItem(item) {
    const data = ITEMS[item.id] || { emoji: '📦', name: item.id, rareza: '❓ Desconocido', desc: 'Objeto misterioso' };
    return (
        `> ${data.emoji} **${data.name}** — \`x${item.amount}\`\n` +
        `> ${data.rareza}  ·  *${data.desc}*`
    );
}

function wealthTier(total) {
    if (total >= 1_000_000) return '👑 Magnate';
    if (total >= 200_000) return '🏦 Banquero';
    if (total >= 50_000) return '💎 Inversor';
    if (total >= 10_000) return '💰 Comerciante';
    if (total >= 1_000) return '💵 Ahorrista';
    return '🌱 Sin fondos';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('🎒 Ver el inventario de objetos')
        .addUserOption(o =>
            o.setName('usuario')
                .setDescription('Ver el inventario de otro usuario')),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario') || interaction.user;
        const esPropio = target.id === interaction.user.id;

        const inventory = stmts.getInventory(target.id);
        const economy = stmts.getEconomy(target.id);
        const total = economy.balance + economy.bank;
        const cur = config.ECONOMIA?.CURRENCY || '💰';
        const tier = wealthTier(total);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setAuthor({
                name: `🎒  Inventario · ${target.username}`,
                iconURL: target.displayAvatarURL()
            })
            .setThumbnail(target.displayAvatarURL({ size: 128 }))
            .setTimestamp();

        if (inventory.length === 0) {
            embed.setDescription(
                `> 📭 **Inventario vacío.**\n` +
                `> ${esPropio ? 'Visitá `/shop` para comprar objetos.' : 'Este usuario no tiene objetos.'}`
            );
        } else {
            // Ordenar por rareza
            const sorted = [...inventory].sort((a, b) => {
                const ra = ITEMS[a.id]?.rareza || '❓';
                const rb = ITEMS[b.id]?.rareza || '❓';
                return RAREZA_ORDER.indexOf(ra) - RAREZA_ORDER.indexOf(rb);
            });

            const itemLines = sorted.map(formatItem).join('\n\n');
            embed.setDescription(`**🗃️ Objetos (${inventory.length} tipo${inventory.length !== 1 ? 's' : ''}):**\n\n${itemLines}`);
        }

        // Campos de economía
        embed.addFields(
            { name: '💵 Efectivo', value: `${cur} \`${economy.balance.toLocaleString()}\``, inline: true },
            { name: '🏦 Banco', value: `${cur} \`${economy.bank.toLocaleString()}\``, inline: true },
            { name: tier, value: `${cur} \`${total.toLocaleString()}\``, inline: true },
        );

        embed.setFooter({ text: `Prophet Economy  ·  ${inventory.length} tipo(s)  ·  /shop para comprar` });

        await interaction.reply({ embeds: [embed] });
    }
};
