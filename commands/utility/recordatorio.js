const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { parseTiempo, formatTiempo, createReminder, getUserReminders } = require('../../modules/reminders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recordatorio')
        .setDescription('⏰ Programar un recordatorio que te llegará por DM')
        .addStringOption(o =>
            o.setName('tiempo')
                .setDescription('¿En cuánto tiempo? Ej: 10m, 2h, 1d, 1h30m')
                .setRequired(true))
        .addStringOption(o =>
            o.setName('mensaje')
                .setDescription('¿Qué querés recordar?')
                .setRequired(true)
                .setMaxLength(300)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const tiempoStr = interaction.options.getString('tiempo');
        const mensaje = interaction.options.getString('mensaje');
        const userId = interaction.user.id;
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
                    .setDescription(`> ⚠️ **Límite alcanzado:** tenés ${userRecs.length}/10 recordatorios activos.\n> Usá \`/recordatorio-lista\` para cancelar alguno.`)]
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

        await interaction.editReply({
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
                .setFooter({ text: 'Usá /recordatorio-lista para ver o cancelar los tuyos' })
                .setTimestamp()]
        });
    },
};
