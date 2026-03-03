// ═══ COMANDO: /pay mejorado ═══
const {
    SlashCommandBuilder, EmbedBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType
} = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('💸 Transferir dinero a otro usuario')
        .addUserOption(o =>
            o.setName('usuario')
                .setDescription('Usuario a pagar')
                .setRequired(true))
        .addIntegerOption(o =>
            o.setName('cantidad')
                .setDescription('Cantidad a transferir')
                .setMinValue(1)
                .setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('cantidad');
        const userId = interaction.user.id;
        const cur = config.ECONOMIA?.CURRENCY || '💰';

        // Validaciones rápidas
        if (target.id === userId) {
            return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.COLORES.ERROR || 0xEF5350).setDescription('> ❌ No podés transferirte a vos mismo.')], ephemeral: true });
        }
        if (target.bot) {
            return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.COLORES.ERROR || 0xEF5350).setDescription('> ❌ No podés enviar dinero a un bot.')], ephemeral: true });
        }

        const eco = stmts.getEconomy(userId);
        if (eco.balance < amount) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setDescription(
                        `> ❌ **Fondos insuficientes.**\n` +
                        `> Querés enviar ${cur} \`${amount.toLocaleString()}\` pero solo tenés ${cur} \`${eco.balance.toLocaleString()}\` en efectivo.\n` +
                        `> Te faltan ${cur} \`${(amount - eco.balance).toLocaleString()}\`.`
                    )
                ], ephemeral: true
            });
        }

        // ── Confirmación con botones ──
        const confirmEmbed = new EmbedBuilder()
            .setColor(config.COLORES.WARN || 0xFFB74D)
            .setAuthor({ name: '💸  Confirmar Transferencia', iconURL: interaction.user.displayAvatarURL() })
            .setDescription(
                `> Estás por enviar **${cur} ${amount.toLocaleString()}** a ${target}.\n\n` +
                `> 💵 Tu efectivo restante: **${cur} ${(eco.balance - amount).toLocaleString()}**\n\n` +
                `> ⚠️ Las transferencias son **irreversibles**. ¿Confirmás?`
            )
            .setFooter({ text: 'Tenés 30 segundos para confirmar  ·  Prophet Economy' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pay_confirm').setLabel('✅ Confirmar').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('pay_cancel').setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger),
        );

        const msg = await interaction.reply({ embeds: [confirmEmbed], components: [row], fetchReply: true, ephemeral: true });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000,
            filter: i => i.user.id === userId,
        });

        collector.on('collect', async i => {
            if (i.customId === 'pay_cancel') {
                collector.stop('cancelled');
                return i.update({
                    embeds: [new EmbedBuilder().setColor(0x546E7A).setDescription('> ❌ Transferencia cancelada.')],
                    components: []
                });
            }

            // Ejecutar la transferencia
            const success = stmts.removeMoney(userId, amount, 'balance');
            if (!success) {
                collector.stop('error');
                return i.update({
                    embeds: [new EmbedBuilder().setColor(config.COLORES.ERROR || 0xEF5350).setDescription('> ❌ Error procesando la transferencia. Fondos insuficientes.')],
                    components: []
                });
            }

            stmts.addMoney(target.id, amount, 'balance');
            const miSaldo = stmts.getEconomy(userId);

            // DM al receptor
            try {
                await target.send({
                    embeds: [new EmbedBuilder()
                        .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                        .setAuthor({ name: '💸  ¡Recibiste una transferencia!', iconURL: interaction.user.displayAvatarURL() })
                        .setDescription(
                            `> ${interaction.user} te envió **${cur} ${amount.toLocaleString()}**.\n` +
                            `> El dinero ya está en tu efectivo.`
                        )
                        .setFooter({ text: 'Prophet Economy' })
                        .setTimestamp()
                    ]
                });
            } catch (_) { /* DMs cerrados */ }

            collector.stop('done');
            await i.update({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                    .setAuthor({ name: '💸  Transferencia completada', iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(
                        `> ✅ **${cur} ${amount.toLocaleString()}** enviados a ${target}.\n\n` +
                        `> 💵 Tu efectivo restante: **${cur} ${miSaldo.balance.toLocaleString()}**`
                    )
                    .setFooter({ text: 'Prophet Economy  ·  El receptor fue notificado por DM' })
                    .setTimestamp()
                ],
                components: []
            });
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                interaction.editReply({
                    embeds: [new EmbedBuilder().setColor(0x546E7A).setDescription('> ⏰ Confirmación expirada. Transferencia cancelada.')],
                    components: []
                }).catch(() => { });
            }
        });
    }
};
