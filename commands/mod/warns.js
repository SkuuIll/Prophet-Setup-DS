// ═══ COMANDO: /warns — Historial con paginación y opción de borrar ═══
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warns')
        .setDescription('📋 Ver y gestionar advertencias de un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar').setRequired(true))
        .addStringOption(o =>
            o.setName('accion')
                .setDescription('Acción a realizar')
                .addChoices(
                    { name: '📋 Ver warns (default)', value: 'ver' },
                    { name: '🗑️ Borrar un warn específico', value: 'borrar' },
                    { name: '🧹 Limpiar todos los warns', value: 'limpiar' },
                ))
        .addIntegerOption(o =>
            o.setName('id')
                .setDescription('ID del warn a borrar (solo con acción "borrar")'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        const accion = interaction.options.getString('accion') || 'ver';
        const warnId = interaction.options.getInteger('id');

        if (accion === 'borrar' && warnId) {
            try {
                stmts.removeWarn?.(warnId, target.id);
                const remaining = stmts.countWarns(target.id);
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                        .setDescription(
                            `> ✅ Warn **#${warnId}** eliminado de **${target.tag}**.\n` +
                            `> Warns restantes: \`${remaining?.total || 0}\``
                        )
                        .setFooter({ text: 'Prophet · Moderación' })],
                    flags: 64
                });
            } catch {
                return interaction.reply({
                    content: '> ❌ No se pudo borrar ese warn. Verificá el ID.',
                    flags: 64
                });
            }
        }

        if (accion === 'limpiar') {
            try {
                stmts.clearWarns?.(target.id);
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                        .setDescription(
                            `> 🧹 Todos los warns de **${target.tag}** fueron eliminados.\n` +
                            `> Moderador: ${interaction.user}`
                        )
                        .setFooter({ text: 'Prophet · Moderación' })]
                });
            } catch {
                return interaction.reply({
                    content: '> ❌ Error al limpiar warns.',
                    flags: 64
                });
            }
        }

        // ── Ver warns ──
        const warns = stmts.getWarns(target.id);

        if (warns.length === 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                    .setDescription(`> ✅ **${target.tag}** no tiene advertencias. ¡Registro limpio! 🎉`)
                    .setFooter({ text: 'Prophet · Moderación' })],
                flags: 64
            });
        }

        const warnsPerPage = 5;
        const pages = [];
        for (let i = 0; i < warns.length; i += warnsPerPage) {
            const slice = warns.slice(i, i + warnsPerPage);
            const lines = slice.map(w => {
                const date = w.created_at ? new Date(w.created_at) : new Date();
                const ts = Math.floor(date.getTime() / 1000);
                return (
                    `**#${w.id || i + 1}** — ${w.reason}\n` +
                    `> 👮 <@${w.mod_id}> · <t:${ts}:R>`
                );
            });

            pages.push(lines.join('\n\n'));
        }

        let currentPage = 0;

        function buildEmbed() {
            return new EmbedBuilder()
                .setColor(config.COLORES.WARN || 0xFFB74D)
                .setAuthor({ name: `⚠️  Advertencias de ${target.tag}`, iconURL: target.displayAvatarURL() })
                .setThumbnail(target.displayAvatarURL({ size: 64 }))
                .setDescription(pages[currentPage])
                .setFooter({ text: `Pág ${currentPage + 1}/${pages.length}  ·  Total: ${warns.length} warns  ·  Prophet Moderación` })
                .setTimestamp();
        }

        function buildButtons() {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('w_prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0),
                new ButtonBuilder().setCustomId('w_next').setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(currentPage >= pages.length - 1),
            );
        }

        const msg = await interaction.reply({
            embeds: [buildEmbed()],
            components: pages.length > 1 ? [buildButtons()] : [],
            fetchReply: true
        });

        if (pages.length <= 1) return;

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000,
            filter: i => i.user.id === interaction.user.id
        });

        collector.on('collect', async i => {
            if (i.customId === 'w_prev') currentPage = Math.max(0, currentPage - 1);
            if (i.customId === 'w_next') currentPage = Math.min(pages.length - 1, currentPage + 1);
            await i.update({ embeds: [buildEmbed()], components: [buildButtons()] });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};
