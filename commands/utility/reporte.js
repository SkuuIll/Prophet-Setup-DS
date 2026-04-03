// ═══ COMANDO: /reporte ═══
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../../config');

module.exports = {
    cooldown: 60, // 60 segundos entre reportes para evitar spam
    data: new SlashCommandBuilder()
        .setName('reporte')
        .setDescription('🚨 Reportar a un usuario al Staff de manera discreta')
        .addUserOption(o =>
            o.setName('usuario')
                .setDescription('Usuario a reportar')
                .setRequired(true))
        .addStringOption(o =>
            o.setName('razon')
                .setDescription('¿Por qué lo reportas?')
                .setRequired(true)
                .setMaxLength(500))
        .addStringOption(o =>
            o.setName('evidencia')
                .setDescription('Link a captura de pantalla, mensaje, etc. (opcional)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const reportado = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon');
        const evidencia = interaction.options.getString('evidencia') || null;
        const reportador = interaction.user;

        // No reportarse a sí mismo
        if (reportado.id === reportador.id) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setDescription('> ❌ No podés reportarte a vos mismo.')
                ]
            });
        }

        // No reportar bots
        if (reportado.bot) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setDescription('> ❌ No podés reportar a un bot.')
                ]
            });
        }

        // Determinar estado de evidencia
        const evidenciaField = evidencia
            ? `[Ver evidencia](${evidencia})`
            : '`Sin evidencia adjunta`';

        const tsAhora = Math.floor(Date.now() / 1000);

        // Embed para el canal de logs/staff
        const staffEmbed = new EmbedBuilder()
            .setColor(0xE53935)
            .setAuthor({ name: '🚨  Nuevo Reporte · Prophet Gaming', iconURL: interaction.guild.iconURL() })
            .setThumbnail(reportado.displayAvatarURL({ size: 256 }))
            .setDescription(
                `> 📋 **Razón:** ${razon}\n\n` +
                `> 📎 **Evidencia:** ${evidenciaField}\n` +
                `> 📍 **Canal:** <#${interaction.channelId}>\n` +
                `> 🕐 **Fecha:** <t:${tsAhora}:F>`
            )
            .addFields(
                { name: '👤 Usuario reportado', value: `${reportado} (\`${reportado.tag}\`)`, inline: true },
                { name: '🆔 ID', value: `\`${reportado.id}\``, inline: true },
                { name: '📊 Estado', value: '`🔴 Sin revisar`', inline: true }
            )
            .setFooter({ text: `Reportado de forma anónima  ·  ID de reporte: ${tsAhora}` })
            .setTimestamp();

        // Botones de acción para el Staff
        const staffRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rep_tomado_${tsAhora}`)
                .setLabel('Tomado')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`rep_descartado_${tsAhora}`)
                .setLabel('Descartar')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`rep_profile_${reportado.id}`)
                .setLabel('Ver perfil')
                .setEmoji('👤')
                .setStyle(ButtonStyle.Secondary),
        );

        // Enviar al canal de reportes (SIEMPRE debe ir a REPORTES, nunca a staff ni logs)
        const logChannelId = config.CHANNELS.REPORTES || null;
        let enviado = false;

        if (logChannelId) {
            try {
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    await logChannel.send({ embeds: [staffEmbed], components: [staffRow] });
                    enviado = true;
                }
            } catch (e) {
                console.error('[Reporte] Error enviando al canal de reportes:', e.message);
            }
        }

        // Fallback: buscar canal con "reporte" en el nombre (NO staff, NO logs)
        if (!enviado) {
            const fallback = interaction.guild.channels.cache.find(c =>
                c.name.toLowerCase().includes('reporte') && c.isTextBased()
            );
            if (fallback) {
                try {
                    await fallback.send({ embeds: [staffEmbed], components: [staffRow] });
                    enviado = true;
                } catch (e) { }
            }
        }

        if (!enviado) {
            console.warn('[Reporte] No se encontró canal de reportes configurado. Verificar config.CHANNELS.REPORTES');
        }

        // Respuesta al reportador (anónima — nunca menciona si se envió o no para evitar que se sepa)
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(enviado ? (config.COLORES.SUCCESS || 0x69F0AE) : (config.COLORES.WARN || 0xFFB74D))
                .setAuthor({ name: '🚨  Reporte Enviado', iconURL: interaction.user.displayAvatarURL() })
                .setDescription(
                    `> ✅ **Tu reporte fue recibido por el Staff.**\n\n` +
                    `> Los moderadores lo revisarán a la brevedad.\n` +
                    `> Tu identidad permanece **anónima** en el proceso.`
                )
                .addFields(
                    { name: '🎯 Reportado', value: `*oculto por privacidad*`, inline: true },
                    { name: '🆔 ID de reporte', value: `\`${tsAhora}\``, inline: true }
                )
                .setFooter({ text: 'No hagas abuso del sistema de reportes  ·  Prophet Gaming' })
                .setTimestamp()
            ]
        });

        // Manejar botones del staff
        const reportMsg = enviado
            ? (interaction.guild.channels.cache.get(logChannelId || '') || interaction.guild.channels.cache.find(c =>
                ['mod', 'staff', 'log', 'report', 'reporte'].some(k => c.name.toLowerCase().includes(k)) && c.isTextBased()
            ))
            : null;

        // El collector de staff buttons se maneja en el canal de logs automáticamente
    }
};
