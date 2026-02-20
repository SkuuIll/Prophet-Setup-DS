// ═══ COMANDO: /shop ═══
const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

const SHOP_ITEMS = [
    {
        id: 'vip_ticket',
        name: '🎟️ Pase VIP (1 Sem)',
        description: 'Obtené acceso temporal al rol VIP por una semana.',
        price: 50000,
        type: 'role',
        roleId: config.ROLES.VIP
    },
    {
        id: 'prophet_sword',
        name: '⚔️ Espada del Profeta',
        description: 'Una espada legendaria forjada en código.',
        price: 15000,
        type: 'collectible'
    },
    {
        id: 'shield_aegis',
        name: '🛡️ Escudo Égida',
        description: 'Protección divina para tu inventario.',
        price: 10000,
        type: 'collectible'
    },
    {
        id: 'xp_potion',
        name: '🧪 Poción de XP',
        description: 'Bébela para ganar experiencia extra (Próximamente).',
        price: 2500,
        type: 'consumable'
    },
    {
        id: 'mystery_box',
        name: '🎁 Caja Misteriosa',
        description: '¿Qué tendrá adentro? Usala y descubrilo.',
        price: 1000,
        type: 'consumable'
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('🛒 Abre la tienda del servidor para comprar items y roles'),

    async execute(interaction) {
        const economy = stmts.getEconomy(interaction.user.id);

        const itemList = SHOP_ITEMS.map(item => {
            const asequible = economy.balance >= item.price ? '✅' : '🔒';
            return `${asequible} **${item.name}** — \`${config.ECONOMIA.CURRENCY} ${item.price.toLocaleString()}\`\n> ${item.description}`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setAuthor({ name: '🛒  Tienda de Prophet Gaming' })
            .setDescription(
                `¡Bienvenido a la tienda, **${interaction.user.username}**!\n\n` +
                `> 💵 **Tu saldo:** ${config.ECONOMIA.CURRENCY} ${economy.balance.toLocaleString()}\n` +
                `> 🏦 **Banco:** ${config.ECONOMIA.CURRENCY} ${economy.bank.toLocaleString()}\n\n` +
                `─────────────────────────\n\n` +
                itemList +
                `\n\n*Seleccioná un artículo del menú para comprarlo.*`
            )
            .setFooter({ text: 'Prophet Economy  ·  Tienda' })
            .setTimestamp();

        const options = SHOP_ITEMS.map(item => ({
            label: `${item.name} — ${config.ECONOMIA.CURRENCY}${item.price.toLocaleString()}`,
            description: item.description.substring(0, 100),
            value: item.id,
        }));

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('shop_select')
                    .setPlaceholder('🛒 Seleccioná un artículo...')
                    .addOptions(options)
            );

        const reply = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async i => {
            const selectedId = i.values[0];
            const item = SHOP_ITEMS.find(it => it.id === selectedId);

            if (!item) return i.reply({ content: '> ❌ Artículo no válido.', ephemeral: true });

            const currentEco = stmts.getEconomy(interaction.user.id);
            if (currentEco.balance < item.price) {
                const falta = item.price - currentEco.balance;
                return i.reply({
                    content: `> ❌ **Fondos insuficientes** — Te faltan **${config.ECONOMIA.CURRENCY} ${falta.toLocaleString()}**.`,
                    ephemeral: true
                });
            }

            const success = stmts.removeMoney(interaction.user.id, item.price, 'balance');
            if (!success) return i.reply({ content: '> ❌ Error en la transacción.', ephemeral: true });

            stmts.addItem(interaction.user.id, item.id, 1);

            if (item.type === 'role' && item.roleId) {
                const role = interaction.guild.roles.cache.get(item.roleId);
                if (role) {
                    try {
                        await interaction.member.roles.add(role);
                        await i.reply({
                            content: `> ✅ **¡Compra exitosa!** Recibiste el rol **${role.name}** y **${item.name}** se guardó en tu inventario.`,
                            ephemeral: true
                        });
                    } catch (e) {
                        await i.reply({
                            content: `> ⚠️ **Compra realizada**, pero hubo un error al asignar el rol. Avisá al Staff. Item guardado.`,
                            ephemeral: true
                        });
                    }
                } else {
                    await i.reply({ content: `> ⚠️ **Compra realizada**. El rol configurado no existe en el servidor. Item guardado.`, ephemeral: true });
                }
            } else {
                await i.reply({
                    content: `> ✅ **¡Compra exitosa!** Compraste **${item.name}** por **${config.ECONOMIA.CURRENCY} ${item.price.toLocaleString()}**.`,
                    ephemeral: true
                });
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => { });
        });
    }
};
