const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { parseTiempo, formatTiempo, createReminder, getUserReminders, cancelReminder } = require('../../modules/reminders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recordatorio')
        .setDescription('⏰ Programar o consultar tus recordatorios')
        .addSubcommand(sub =>
            sub.setName('crear')
                .setDescription('⏰ Programar un nuevo recordatorio por DM')
                .addStringOption(o =>
                    o.setName('tiempo')
                        .setDescription('¿En cuánto tiempo? Ej: 10m, 2h, 1d, 1h30m')
                        .setRequired(true))
                .addStringOption(o =>
                    o.setName('mensaje')
                        .setDescription('¿Qué querés recordar?')
                        .setRequired(true)
                        .setMaxLength(300))
        )
        .addSubcommand(sub =>
            sub.setName('lista')
                .setDescription('📋 Ver o cancelar tus recordatorios activos')
                .addIntegerOption(o =>
                    o.setName('cancelar_id')
                        .setDescription('ID del recordatorio a cancelar')
                        .setRequired(false))
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const subcommand = interaction.options.getSubcommand() || 'crear';
        const userId = interaction.user.id;

        if (subcommand === 'crear') {
            const tiempoStr = interaction.options.getString('tiempo');
            const mensaje = interaction.options.getString('mensaje');
            const ms = parseTiempo(tiempoStr);

            if (ms < 10000) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.COLORES.ERROR || 0xEF5350)
                        .setDescription('> ❌ **Tiempo mínimo:** 10 segundos.\n> Ej: `10s`, `5m`, `2h`, `1d`')]
                });
            }

            if (ms > 7 * 24 * 3600 * 1000) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.COLORES.ERROR || 0xEF5350)
                        .setDescription('> ❌ **Tiempo máximo:** 7 días.')]
                });
            }

            const userRecs = getUserReminders(userId);
            if (userRecs.length >= 10) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.COLORES.WARN || 0xFFB74D)
                        .setDescription(`> ⚠️ **Límite alcanzado:** tenés ${userRecs.length}/10 recordatorios activos.\n> Usá \`/recordatorio lista\` para cancelar alguno.`)]
                });
            }

            const expira = Date.now() + ms;
            const expiraTs = Math.floor(expira / 1000);
            const reminder = await createReminder(interaction.client, {
                userId,
                guildId: interaction.guildId,
                message: mensaje,
                remindAt: expira,
            });

            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                    .setAuthor({ name: '⏰  Recordatorio programado', iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(
                        `> 📌 **${mensaje}**\n\n` +
                        `> 🕐 Te avisaré <t:${expiraTs}:R> (\`${formatTiempo(ms)}\`)\n` +
                        `> 📩 Llegará a tu **DM** — asegurate de tenerlos abiertos.`
                    )
                    .addFields(
                        { name: '🆔 ID', value: `\`#${reminder.id}\``, inline: true },
                        { name: '⏱️ Cuándo', value: `<t:${expiraTs}:F>`, inline: true },
                        { name: '📋 Activos', value: `\`${userRecs.length + 1}/10\``, inline: true }
                    )
                    .setFooter({ text: 'Usá /recordatorio lista para ver o cancelar los tuyos' })
                    .setTimestamp()]
            });
        }

        if (subcommand === 'lista') {
            const cancelId = interaction.options.getInteger('cancelar_id');

            if (cancelId) {
                const deleted = cancelReminder(cancelId, userId);
                if (deleted) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor(config.COLORES.EXITO || 0x69F0AE)
                            .setDescription(`> ✅ Recordatorio \`#${cancelId}\` cancelado correctamente.`)]
                    });
                } else {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor(config.COLORES.ERROR || 0xEF5350)
                            .setDescription(`> ❌ No se encontró el recordatorio \`#${cancelId}\` o ya venció.`)]
                    });
                }
            }

            const reminders = getUserReminders(userId);
            if (reminders.length === 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.COLORES.INFO || 0x42A5F5)
                        .setDescription('> ⏰ No tenés recordatorios activos.\n> Usá `/recordatorio crear` para programar uno.')]
                });
            }

            const ahora = Date.now();
            const descripcion = reminders
                .sort((a, b) => a.remind_at - b.remind_at)
                .map(r => {
                    const expiraTs = Math.floor(r.remind_at / 1000);
                    const restante = r.remind_at > ahora ? `<t:${expiraTs}:R>` : '*(pendiente)*';
                    const texto = r.message.length > 60 ? `${r.message.slice(0, 57)}...` : r.message;
                    return `> \`#${r.id}\` ${restante}\n> 📌 *${texto}*`;
                })
                .join('\n\n');

            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
                    .setAuthor({ name: '⏰  Tus Recordatorios', iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(descripcion)
                    .addFields({ name: '📊 Total activos', value: `\`${reminders.length}/10\``, inline: true })
                    .setFooter({ text: 'Para cancelar uno, usá /recordatorio lista cancelar_id:[ID]' })
                    .setTimestamp()]
            });
        }
    },
};
