// ═══════════════════════════════════════════════════
//  COMANDO: /resumen
//  Genera resúmenes con IA para el staff
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const {
    generateServerSummary,
    generateTicketSummary,
    generateReportsSummary,
    generateConversationSummary,
    generateModerationSuggestions,
    prioritizeReports,
    sendWeeklySummary
} = require('../../modules/aiSummaries');
const { stmts } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resumen')
        .setDescription('Genera resúmenes automáticos con IA (Solo Staff)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(sub =>
            sub.setName('servidor')
                .setDescription('Resumen de actividad del servidor')
                .addIntegerOption(opt =>
                    opt.setName('dias')
                        .setDescription('Días a incluir (1-30)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(30)
                )
        )
        .addSubcommand(sub =>
            sub.setName('reportes')
                .setDescription('Resumen y priorización de reportes')
        )
        .addSubcommand(sub =>
            sub.setName('conversacion')
                .setDescription('Resumen de la conversación en este canal')
                .addIntegerOption(opt =>
                    opt.setName('mensajes')
                        .setDescription('Cantidad de mensajes (50-200)')
                        .setRequired(false)
                        .setMinValue(50)
                        .setMaxValue(200)
                )
        )
        .addSubcommand(sub =>
            sub.setName('usuario')
                .setDescription('Sugerencias de moderación para un usuario')
                .addUserOption(opt =>
                    opt.setName('target')
                        .setDescription('Usuario a analizar')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('semanal')
                .setDescription('Enviar resumen semanal al canal de staff')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        await interaction.deferReply({ ephemeral: true });

        try {
            if (subcommand === 'servidor') {
                return await handleServerSummary(interaction);
            }

            if (subcommand === 'reportes') {
                return await handleReportsSummary(interaction);
            }

            if (subcommand === 'conversacion') {
                return await handleConversationSummary(interaction);
            }

            if (subcommand === 'usuario') {
                return await handleUserModeration(interaction);
            }

            if (subcommand === 'semanal') {
                return await handleWeeklySummary(interaction);
            }
        } catch (error) {
            console.error('[Resumen] Error:', error);
            await interaction.editReply({
                content: `❌ Error generando resumen: ${error.message}`
            });
        }
    }
};

async function handleServerSummary(interaction) {
    const days = interaction.options.getInteger('dias') || 7;

    await interaction.editReply({ content: '🔄 Generando resumen del servidor...' });

    const result = await generateServerSummary(interaction.client, days);

    if (!result.success) {
        return interaction.editReply({
            content: `❌ Error: ${result.error}`
        });
    }

    const embed = new EmbedBuilder()
        .setColor(0xBB86FC)
        .setTitle(`📊 Resumen del Servidor (${days} días)`)
        .setDescription(result.summary)
        .addFields(
            {
                name: '📈 Métricas',
                value: `💬 **${result.data.totalMessages.toLocaleString()}** mensajes\n⚡ **${result.data.totalCommands.toLocaleString()}** comandos\n🎤 **${Math.round(result.data.totalVoiceMinutes / 60)}h** en voz`,
                inline: true
            },
            {
                name: '🏥 Sistema',
                value: `✅ ${result.data.healthStatus} servicios OK\n⚠️ ${result.data.healthWarnings} advertencias\n❌ ${result.data.healthErrors} errores`,
                inline: true
            }
        )
        .setFooter({ text: 'Generado con IA · Prophet Bot' })
        .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
}

async function handleReportsSummary(interaction) {
    await interaction.editReply({ content: '🔄 Analizando reportes...' });

    // Obtener reportes recientes (warns de los últimos 7 días)
    const warns = stmts.getLogs(50).filter(l => l.type === 'REPORT' || l.details?.type === 'report');

    const result = await generateReportsSummary(warns);

    if (!result.success) {
        return interaction.editReply({
            content: `❌ Error: ${result.error}`
        });
    }

    // También generar priorización
    const priorityResult = await prioritizeReports(warns);

    const embed = new EmbedBuilder()
        .setColor(0xFFB74D)
        .setTitle('📋 Resumen de Reportes')
        .setDescription(result.summary)
        .setFooter({ text: 'Generado con IA · Prophet Bot' })
        .setTimestamp();

    if (priorityResult.success) {
        embed.addFields({
            name: '🎯 Priorización Sugerida',
            value: priorityResult.priorities.substring(0, 1024)
        });
    }

    await interaction.editReply({ content: null, embeds: [embed] });
}

async function handleConversationSummary(interaction) {
    const limit = interaction.options.getInteger('mensajes') || 100;

    await interaction.editReply({ content: '🔄 Analizando conversación...' });

    // Obtener mensajes del canal
    const messages = await interaction.channel.messages.fetch({ limit });

    const messagesArray = messages
        .filter(m => !m.author.bot)
        .map(m => ({
            author: m.author,
            content: m.content
        }))
        .reverse();

    const result = await generateConversationSummary(messagesArray, limit);

    if (!result.success) {
        return interaction.editReply({
            content: `❌ ${result.error}`
        });
    }

    const embed = new EmbedBuilder()
        .setColor(0x2196F3)
        .setTitle('💬 Resumen de Conversación')
        .setDescription(result.summary)
        .addFields({
            name: '📊 Datos',
            value: `${messagesArray.length} mensajes analizados`,
            inline: true
        })
        .setFooter({ text: 'Generado con IA · Prophet Bot' })
        .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
}

async function handleUserModeration(interaction) {
    const target = interaction.options.getUser('target');

    await interaction.editReply({ content: '🔄 Analizando historial...' });

    // Obtener warns del usuario
    const warns = stmts.getWarns(target.id);

    // Obtener actividad reciente
    const user = stmts.getUser(target.id);
    const recentActivity = user ? `Nivel: ${user.level}, Mensajes: ${user.messages}, Voz: ${Math.round((user.voice_minutes || 0) / 60)}h` : 'Sin datos';

    const result = await generateModerationSuggestions(target.id, warns, recentActivity);

    if (!result.success) {
        return interaction.editReply({
            content: `❌ Error: ${result.error}`
        });
    }

    const embed = new EmbedBuilder()
        .setColor(warns.length > 0 ? 0xFF5722 : 0x4CAF50)
        .setTitle(`🔍 Análisis de Moderación: ${target.username}`)
        .setDescription(result.suggestion)
        .setThumbnail(target.displayAvatarURL({ size: 128 }))
        .addFields(
            { name: '⚠️ Warns Previos', value: `${warns.length}`, inline: true },
            { name: '📊 Actividad', value: recentActivity.substring(0, 100), inline: true }
        )
        .setFooter({ text: 'Generado con IA · Solo sugerencia · Prophet Bot' })
        .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
}

async function handleWeeklySummary(interaction) {
    await interaction.editReply({ content: '🔄 Generando resumen semanal...' });

    const result = await sendWeeklySummary(interaction.client);

    if (!result.success) {
        return interaction.editReply({
            content: `❌ Error: ${result.error || 'No se pudo generar el resumen'}`
        });
    }

    // Enviar al canal actual
    await interaction.channel.send({ embeds: [result.embed] });

    await interaction.editReply({
        content: '✅ Resumen semanal enviado al canal.'
    });
}
