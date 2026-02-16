const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

// Mismo mapa de items para obtener nombres bonitos (idealmente esto iría en un archivo separado de constantes)
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
        .setDescription('🎒 Mira los objetos que tienes en tu inventario')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Ver el inventario de otro usuario')),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario') || interaction.user;
        const inventory = stmts.getInventory(target.id);
        const economy = stmts.getEconomy(target.id);

        const embed = new EmbedBuilder()
            .setTitle(`🎒 Inventario de ${target.username}`)
            .setColor(config.COLORES.PRINCIPAL)
            .setFooter({ text: 'Prophet Gaming Economy' });

        if (inventory.length === 0) {
            embed.setDescription('Este inventario está vacío. ¡Ve a la `/shop` para comprar cosas!');
        } else {
            const itemsList = inventory.map(item => {
                const name = ITEM_NAMES[item.id] || item.id;
                return `**${name}** — x${item.amount}`;
            }).join('\n');

            embed.setDescription(itemsList);
        }

        // Añadir resumen de dinero también
        embed.addFields({
            name: 'Estado Financiero',
            value: `💵 Efectivo: $${economy.balance}\n💳 Banco: $${economy.bank}`,
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
    }
};
