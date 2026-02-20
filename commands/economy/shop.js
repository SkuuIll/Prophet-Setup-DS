// ═══ COMANDO: /shop ═══
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

// Configuración de la tienda de roles
const ROLE_SHOP = [
    { id: 'rol_neon', name: 'Color Neón', desc: 'Rol con color verde neón brillante', price: 5000, emoji: '🟢' },
    { id: 'rol_diablo', name: 'Color Diablo', desc: 'Rol con color rojo sangre', price: 5000, emoji: '🔴' },
    { id: 'rol_vip', name: 'Rango VIP Temporal', desc: 'Acceso a canales VIP (30 Días)', price: 15000, emoji: '💎' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('🛒 Abre la tienda de roles para gastar tu economía'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const eco = stmts.getEconomy(userId);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.EXITO || 0x69F0AE)
            .setAuthor({ name: '🛒  Tienda del Servidor', iconURL: interaction.guild.iconURL() })
            .setDescription(`Tu saldo: **${config.ECONOMIA.CURRENCY} ${eco.balance.toLocaleString()}**\n\nSelecciona el artículo que quieras comprar en el menú.`);

        const options = ROLE_SHOP.map(item => ({
            label: `${item.name} — ${config.ECONOMIA.CURRENCY} ${item.price}`,
            description: item.desc,
            value: item.id,
            emoji: item.emoji
        }));

        const menu = new StringSelectMenuBuilder()
            .setCustomId('shop_selector')
            .setPlaceholder('Explorar tienda...')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(menu);

        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000,
            filter: i => i.user.id === interaction.user.id
        });

        collector.on('collect', async i => {
            const selectedId = i.values[0];
            const item = ROLE_SHOP.find(x => x.id === selectedId);

            if (!item) return;

            // Refetch balance to avoid race conditions
            const currEco = stmts.getEconomy(userId);

            if (currEco.balance < item.price) {
                return i.reply({
                    content: `❌ **Dinero insuficiente.** Cuesta ${config.ECONOMIA.CURRENCY} ${item.price.toLocaleString()}, pero tienes ${config.ECONOMIA.CURRENCY} ${currEco.balance.toLocaleString()}.`,
                    ephemeral: true
                });
            }

            // Aca debes linkear "item.id" con un discord Role Real
            // Ej: const roleId = config.ROLES.VIP o guild.roles.cache.find(r => r.name === item.name)
            // Para este caso, vamos a intentar buscar el rol literal por nombre
            const role = i.guild.roles.cache.find(r => r.name.toLowerCase().includes(item.name.toLowerCase().split(' ')[1] || item.name.toLowerCase()));

            if (!role && item.id !== 'rol_vip') {
                return i.reply({ content: `❌ El Staff todavía no creó el rol "${item.name}" en el servidor para darte.`, ephemeral: true });
            }

            // Comprar
            stmts.removeMoney(userId, item.price, 'balance');

            try {
                if (role) await i.member.roles.add(role);
                // Si es VIP, le damos el rol VIP configurado en config.js
                if (item.id === 'rol_vip' && config.ROLES.VIP) {
                    const vipRole = i.guild.roles.cache.find(r => r.name === config.ROLES.VIP);
                    if (vipRole) await i.member.roles.add(vipRole);
                }

                await i.reply({
                    content: `✅ **Compra exitosa!** Has gastado ${config.ECONOMIA.CURRENCY} ${item.price.toLocaleString()} en \`${item.name}\`.`,
                    ephemeral: true
                });

                // Actualizar embed original
                embed.setDescription(`Tu saldo: **${config.ECONOMIA.CURRENCY} ${(currEco.balance - item.price).toLocaleString()}**\n\n✅ Compraste ${item.name} exitosamente.`);
                await interaction.editReply({ embeds: [embed] });

            } catch (e) {
                // Revert charge if role fails
                stmts.addMoney(userId, item.price, 'balance');
                await i.reply({ content: `❌ **Error:** No tengo permisos para darte el rol. Se te ha devuelto el dinero.`, ephemeral: true });
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => { });
        });
    }
};
