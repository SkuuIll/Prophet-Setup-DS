// ═══ EVENTO: guildMemberRemove (Log de salida y despedida) ═══

const { EmbedBuilder, AttachmentBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');
const { getChannel } = require('../utils/runtimeConfig');

async function resolveWelcomeChannel(guild) {
    let ch = null;
    const targetId = config.CHANNELS.BIENVENIDOS || '1536559906990071828';
    if (targetId && /^\d+$/.test(targetId)) {
        ch = guild.channels.cache.get(targetId);
        if (!ch) {
            ch = await guild.channels.fetch(targetId).catch(() => null);
        }
    }
    if (!ch) {
        ch = getChannel(guild, 'BIENVENIDOS') || guild.channels.cache.find(c => c.name.includes('bienvenid'));
    }
    return ch;
}

async function resolveLogChannel(guild) {
    let ch = null;
    const targetId = config.CHANNELS.LOGS || '1536543207402508318';
    if (targetId && /^\d+$/.test(targetId)) {
        ch = guild.channels.cache.get(targetId);
        if (!ch) {
            ch = await guild.channels.fetch(targetId).catch(() => null);
        }
    }
    if (!ch) {
        ch = getChannel(guild, 'LOGS') || guild.channels.cache.find(c => c.name.includes('log'));
    }
    return ch;
}

module.exports = {
    name: 'guildMemberRemove',
    once: false,
    async execute(member) {
        try {
            if (member.user?.bot) return;

            // Métrica de retención
            stmts.incrementAnalyticsMetric('member_leaves', 'global', 1);

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
                    const files = [];
                    try {
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

                    await welcomeChannel.send({ embeds: [farewellEmbed], files });
                    console.log(`📤 Despedida enviada para ${username} en #${welcomeChannel.name}`);
                } catch (err) {
                    console.error('[Despedida] Error enviando tarjeta de despedida:', err.message);
                }
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

                logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }
        } catch (globalErr) {
            console.error('[guildMemberRemove] Error no capturado:', globalErr.message);
        }
    }
};
