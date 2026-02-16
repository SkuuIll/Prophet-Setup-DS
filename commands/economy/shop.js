const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

// Definición de la tienda
const SHOP_ITEMS = [
    {
        id: 'vip_ticket',
        name: '🎟️ Pase VIP (1 Sem)',
        description: 'Obtén acceso temporal al rol VIP',
        price: 50000,
        type: 'role',
        roleId: config.ROLES.VIP // Asegúrate de que este rol exista en config
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
        description: 'Bébela para ganar experiencia (Próximamente).',
        price: 2500,
        type: 'consumable'
    },
    {
        id: 'mystery_box',
        name: '🎁 Caja Misteriosa',
        description: '¿Qué tendrá dentro?',
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

        const embed = new EmbedBuilder()
            .setTitle('🛒 Tienda de Prophet Gaming')
            .setDescription(`Bienvenido a la tienda, ${interaction.user.username}!\n💰 **Tu saldo:** $${economy.balance}\n🏦 **Banco:** $${economy.bank}`)
            .setColor(config.COLORES.PRINCIPAL)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3081/3081840.png');

        const options = SHOP_ITEMS.map(item => ({
            label: `${item.name} — $${item.price}`,
            description: item.description.substring(0, 100),
            value: item.id,
            emoji: item.name.split(' ')[0] // Intentar sacar el emoji del nombre
        }));

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('shop_select')
                    .setPlaceholder('Selecciona un artículo para comprar')
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

            if (!item) return i.reply({ content: '❌ Artículo no válido.', ephemeral: true });

            // Verificar dinero
            const currentEco = stmts.getEconomy(interaction.user.id);
            if (currentEco.balance < item.price) {
                return i.reply({ content: `❌ No tienes suficiente dinero en efectivo. Necesitas **$${item.price}**.`, ephemeral: true });
            }

            // Realizar compra
            const success = stmts.removeMoney(interaction.user.id, item.price, 'balance');
            if (success) {
                stmts.addItem(interaction.user.id, item.id, 1);

                // Lógica especial para roles
                if (item.type === 'role' && item.roleId) {
                    const role = interaction.guild.roles.cache.get(item.roleId);
                    if (role) {
                        try {
                            await interaction.member.roles.add(role);
                            await i.reply({ content: `✅ ¡Compra exitosa! Has recibido el rol **${role.name}** y **${item.name}** ha sido añadido a tu inventario.`, ephemeral: true });
                        } catch (e) {
                            await i.reply({ content: `✅ Compra realizada, pero hubo un error al darte el rol (verifica permisos). Item guardado en inventario.`, ephemeral: true });
                        }
                    } else {
                        await i.reply({ content: `✅ Compra realizada. Item guardado. (El rol configurado no existe en el servidor).`, ephemeral: true });
                    }
                } else {
                    await i.reply({ content: `✅ ¡Compra exitosa! Has comprado **${item.name}** por **$${item.price}**.`, ephemeral: true });
                }
            } else {
                await i.reply({ content: '❌ Error en la transacción.', ephemeral: true });
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] });
        });
    }
};
