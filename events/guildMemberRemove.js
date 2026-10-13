// ═══ EVENTO: guildMemberRemove (Log de salida y despedida) ═══

const { EmbedBuilder, AttachmentBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');
const { resolveMemberChannel, missingSendPermissions, sendWithImageFallback } = require('../utils/memberNotifications');
const { getPersistedValue } = require('../utils/memberNotificationDiagnostics');

async function resolveWelcomeChannel(guild) {
    return resolveMemberChannel(guild, {
        configValue: config.CHANNELS.BIENVENIDOS,
        persistedValue: getPersistedValue('BIENVENIDOS'),
        kind: 'welcome',
    });
}

async function resolveLogChannel(guild) {
    return resolveMemberChannel(guild, {
        configValue: config.CHANNELS.LOGS,
        persistedValue: getPersistedValue('LOGS'),
        kind: 'logs',
    });
}

module.exports = {
    name: 'guildMemberRemove',
    once: false,
    async execute(member) {
        try {
            if (member.user?.bot) return;

            // Métrica de retención
            try { stmts.incrementAnalyticsMetric('member_leaves', 'global', 1); }
            catch (error) { console.warn('[Despedida] No se pudo registrar métrica:', error.message); }

            const username = member.user?.username || member.displayName || 'Un miembro';
            const avatarUrl = member.user?.displayAvatarURL ? member.user.displayAvatarURL() : null;

            // Tiempo en el servidor
            const joinTs = member.joinedTimestamp;
            const tiempoEnServidor = joinTs
                ? `<t:${Math.floor(joinTs / 1000)}:R> (<t:${Math.floor(joinTs / 1000)}:d>)`
                : 'Desconocido';

            // 1. Mensaje de Despedida en el canal de Bienvenidos
            const welcomeChannel = await resolveWelcomeChannel(member.guild);
            if (welcomeChannel) {
                try {
                    const missing = missingSendPermissions(welcomeChannel, member.guild);
                    if (missing.includes('ViewChannel') || missing.includes('SendMessages')) {
                        throw new Error(`Sin permisos en #${welcomeChannel.name}: ${missing.join(', ')}`);
                    }
                    const files = [];
                    const allowImage = !missing.includes('AttachFiles') && !missing.includes('EmbedLinks');
                    if (allowImage) try {
                        const { generarDespedida } = require('../utils/canvas');
                        const farewellBuffer = await generarDespedida(member);
                        if (farewellBuffer) {
                            files.push(new AttachmentBuilder(farewellBuffer, { name: 'despedida.png' }));
                        }
                    } catch (canvasErr) {
                        console.warn('[Despedida] Canvas fallback:', canvasErr.message);
                    }

                    const farewellEmbed = new EmbedBuilder()
                        .setColor(0xFF5252) // Rojo suave despedida
                        .setAuthor({
                            name: '👋  Hasta pronto...',
                            iconURL: avatarUrl || undefined
                        })
                        .setDescription(
                            `> **${username}** ha dejado el servidor.\n` +
                            `> ⏱️ **Estuvo con nosotros:** ${tiempoEnServidor}\n\n` +
                            `> 👋 *¡Gracias por haber formado parte de Prophet Gaming! Esperamos verte de vuelta pronto.*`
                        )
                        .setFooter({ text: `Prophet Gaming  ·  Ahora somos ${member.guild.memberCount} miembros` })
                        .setTimestamp();

                    if (files.length > 0) {
                        farewellEmbed.setImage('attachment://despedida.png');
                    }

                    if (missing.includes('EmbedLinks')) {
                        await welcomeChannel.send({ content: `Hasta pronto, ${username}. Gracias por formar parte de Prophet Gaming.`, allowedMentions: { parse: [] } });
                    } else {
                        await sendWithImageFallback(welcomeChannel, {
                            embeds: [farewellEmbed], files, allowedMentions: { parse: [] },
                        });
                    }
                    console.log(`📤 Despedida enviada para ${username} en #${welcomeChannel.name}`);
                } catch (err) {
                    console.error('[Despedida] Error enviando tarjeta de despedida:', err);
                }
            } else {
                console.error('[Despedida] No se encontró el canal de bienvenidas. Revisá los IDs y permisos.');
            }

            // 2. Registro detallado de auditoría en el canal de Logs
            const logChannel = await resolveLogChannel(member.guild);
            if (logChannel) {
                // Detectar si fue kick via audit log
                let fueKick = false;
                let kickedBy = null;
                try {
                    const logs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
                    const entry = logs.entries.first();
                    if (entry && entry.target?.id === member.id && Date.now() - entry.createdTimestamp < 5000) {
                        fueKick = true;
                        kickedBy = entry.executor;
                    }
                } catch (_) {}

                // Roles que tenía (excluyendo @everyone)
                const rolesTexto = member.roles?.cache
                    ? member.roles.cache
                        .filter(r => r.id !== member.guild.id)
                        .sort((a, b) => b.position - a.position)
                        .map(r => `\`${r.name}\``)
                        .slice(0, 10)
                        .join(', ') || '*Sin roles*'
                    : '*Sin roles*';

                const logEmbed = new EmbedBuilder()
                    .setColor(fueKick ? (config.COLORES.WARN || 0xFFB74D) : (config.COLORES.ERROR || 0xEF5350))
                    .setAuthor({
                        name: fueKick ? '👢  Miembro expulsado (Kick)' : '📤  Salida de miembro',
                        iconURL: avatarUrl || undefined
                    })
                    .setDescription(
                        `> **Usuario:** ${username} (\`${member.id}\`)\n` +
                        (member.user?.createdTimestamp ? `> **Cuenta creada:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` : '') +
                        `> **Ingresó:** ${tiempoEnServidor}\n` +
                        (fueKick && kickedBy ? `> **Expulsado por:** <@${kickedBy.id}>\n` : '') +
                        `\n> 📉 **Miembros ahora:** \`${member.guild.memberCount}\``
                    )
                    .addFields({ name: '🏷️ Roles que tenía', value: rolesTexto })
                    .setFooter({ text: 'Prophet  ·  Log de Salidas' })
                    .setTimestamp();

                if (avatarUrl) {
                    logEmbed.setThumbnail(avatarUrl);
                }

                await logChannel.send({ embeds: [logEmbed], allowedMentions: { parse: [] } })
                    .catch(error => console.error('[Despedida] Error escribiendo log:', error.message));
            } else {
                console.warn('[Despedida] No se encontró el canal de logs.');
            }
        } catch (globalErr) {
            console.error('[guildMemberRemove] Error no capturado:', globalErr);
        }
    }
};
