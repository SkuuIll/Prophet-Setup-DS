// ═══ COMANDO: /shop ═══
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

// Configuración de la tienda de roles
const ROLE_SHOP = [
    { id: 'rol_neon', name: 'Color Neón', desc: 'Rol con color verde neón brillante', price: 5000, emoji: '🟢', rareza: 'Común' },
    { id: 'rol_diablo', name: 'Color Diablo', desc: 'Rol con color rojo sangre', price: 5000, emoji: '🔴', rareza: 'Común' },
    { id: 'xp_boost', name: 'XP Boost x2', desc: 'Doble XP por 1 hora (se activa al comprar)', price: 8000, emoji: '⚡', rareza: 'Poco Común' },
    { id: 'shield', name: 'Escudo Anti-Rob', desc: 'Protege tu balance 24h contra /rob', price: 10000, emoji: '🛡️', rareza: 'Poco Común' },
    { id: 'lottery', name: 'Boleto de Lotería', desc: 'Chance de ganar entre 1x y 10x', price: 3000, emoji: '🎰', rareza: 'Común' },
    { id: 'rol_vip', name: 'Rango VIP Temporal', desc: 'Acceso a canales VIP (30 Días)', price: 15000, emoji: '💎', rareza: 'Premium' },
    { id: 'custom_role', name: 'Rol Personalizado', desc: 'Rol con el color que quieras (contactar Staff)', price: 25000, emoji: '🎨', rareza: 'Premium' },
    { id: 'legendary_badge', name: 'Insignia Legendaria', desc: 'Badge exclusivo en tu perfil', price: 50000, emoji: '👑', rareza: 'Legendario' },
];

const RAREZA_COLOR = {
    'Común': 0x78909C,
    'Poco Común': 0x43A047,
    'Premium': 0x9C27B0,
    'Legendario': 0xFFD700,
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('🛒 Abre la tienda de roles para gastar tu economía'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const eco = stmts.getEconomy(userId);
        const currency = config.ECONOMIA.CURRENCY;

        // Armar listado de items con estado de asequibilidad
        const shopList = ROLE_SHOP.map(item => {
            const canAfford = eco.balance >= item.price;
            const affordIcon = canAfford ? '✅' : '🔒';
            return `> ${item.emoji} **${item.name}** — \`${currency} ${item.price.toLocaleString()}\` ${affordIcon}\n> *${item.desc}* · **${item.rareza}**`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.EXITO || 0x69F0AE)
            .setAuthor({ name: '🛒  Tienda Prophet Gaming', iconURL: interaction.guild.iconURL() })
            .setDescription(
                `> 💵 Tu saldo: **${currency} ${eco.balance.toLocaleString()}**\n\n` +
                `**Artículos disponibles:**\n\n` +
                shopList +
                `\n\n> ✅ = Podés comprar  ·  🔒 = Fondos insuficientes`
            )
            .setFooter({ text: 'Seleccioná un artículo del menú para comprarlo  ·  Prophet Economy' })
            .setTimestamp();

        const options = ROLE_SHOP.map(item => ({
            label: `${item.name} — ${currency} ${item.price.toLocaleString()}`,
            description: item.desc,
            value: item.id,
            emoji: item.emoji
        }));

        const menu = new StringSelectMenuBuilder()
            .setCustomId('shop_selector')
            .setPlaceholder('🛍️ Seleccioná un artículo...')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(menu);
        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 90000,
            filter: i => i.user.id === interaction.user.id
        });

        collector.on('collect', async i => {
            const selectedId = i.values[0];
            const item = ROLE_SHOP.find(x => x.id === selectedId);
            if (!item) return;

            const currEco = stmts.getEconomy(userId);

            if (currEco.balance < item.price) {
                const falta = item.price - currEco.balance;
                return i.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.COLORES.ERROR || 0xEF5350)
                        .setDescription(
                            `> ❌ **Fondos insuficientes** para **${item.name}**.\n\n` +
                            `> Costo: \`${currency} ${item.price.toLocaleString()}\`\n` +
                            `> Tu saldo: \`${currency} ${currEco.balance.toLocaleString()}\`\n` +
                            `> Te faltan: \`${currency} ${falta.toLocaleString()}\``
                        )
                        .setFooter({ text: 'Usá /work o /daily para ganar más' })
                    ],
                    ephemeral: true
                });
            }

            const role = i.guild.roles.cache.find(r => r.name.toLowerCase().includes(item.name.toLowerCase().split(' ')[1] || item.name.toLowerCase()));

            if (!role && item.id !== 'rol_vip') {
                return i.reply({
                    content: `❌ El Staff todavía no creó el rol **"${item.name}"** en el servidor.`,
                    ephemeral: true
                });
            }

            stmts.removeMoney(userId, item.price, 'balance');

            try {
                if (role) await i.member.roles.add(role);
                if (item.id === 'rol_vip' && config.ROLES?.VIP) {
                    const vipRole = i.guild.roles.cache.find(r => r.name === config.ROLES.VIP);
                    if (vipRole) await i.member.roles.add(vipRole);
                }

                const newBal = currEco.balance - item.price;

                await i.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(RAREZA_COLOR[item.rareza] || 0x69F0AE)
                        .setAuthor({ name: '🛒  ¡Compra Exitosa!', iconURL: interaction.user.displayAvatarURL() })
                        .setDescription(
                            `> ${item.emoji} **${item.name}** ha sido añadido a tu cuenta.\n\n` +
                            `> 💸 Gastaste: **${currency} ${item.price.toLocaleString()}**\n` +
                            `> 💵 Saldo restante: **${currency} ${newBal.toLocaleString()}**`
                        )
                        .setFooter({ text: `Rareza: ${item.rareza}  ·  Prophet Economy` })
                        .setTimestamp()
                    ],
                    ephemeral: true
                });

                // Actualizar embed con nuevo saldo
                embed.setDescription(
                    `> 💵 Tu saldo: **${currency} ${newBal.toLocaleString()}**\n\n` +
                    `**Artículos disponibles:**\n\n` +
                    ROLE_SHOP.map(it => {
                        const canAfford = newBal >= it.price;
                        const icon = it.id === selectedId ? '✨' : canAfford ? '✅' : '🔒';
                        return `> ${it.emoji} **${it.name}** — \`${currency} ${it.price.toLocaleString()}\` ${icon}\n> *${it.desc}* · **${it.rareza}**`;
                    }).join('\n\n') +
                    `\n\n> ✅ = Podés comprar  ·  🔒 = Fondos insuficientes  ·  ✨ = Recién comprado`
                );
                await interaction.editReply({ embeds: [embed] });

            } catch (e) {
                stmts.addMoney(userId, item.price, 'balance');
                await i.reply({
                    content: `❌ **Error:** No tengo permisos para darte el rol. Se devolvió tu dinero.`,
                    ephemeral: true
                });
            }
        });

        collector.on('end', () => {
            const disabledMenu = new StringSelectMenuBuilder()
                .setCustomId('shop_selector_disabled')
                .setPlaceholder('⏰ Tienda cerrada — Usá /shop de nuevo')
                .setDisabled(true)
                .addOptions([{ label: 'Expirado', value: 'expired' }]);
            interaction.editReply({ components: [new ActionRowBuilder().addComponents(disabledMenu)] }).catch(() => { });
        });
    }
};
