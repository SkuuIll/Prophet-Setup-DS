// ═══ EVENTO: guildMemberRemove (Log de salida y despedida) ═══

const { EmbedBuilder, AttachmentBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');
const { generarDespedida } = require('../utils/canvas');

module.exports = {
    name: 'guildMemberRemove',
    once: false,
    async execute(member) {
        if (member.user.bot) return;

        // Métrica de retención
        stmts.incrementAnalyticsMetric('member_leaves', 'global', 1);

        // Tiempo en el servidor
        const joinTs = member.joinedTimestamp;
        const tiempoEnServidor = joinTs
            ? `<t:${Math.floor(joinTs / 1000)}:R> (<t:${Math.floor(joinTs / 1000)}:d>)`
            : 'Desconocido';

        // 1. Mensaje de Despedida en el canal de Bienvenidos
        const welcomeChannel = member.guild.channels.cache.get(config.CHANNELS.BIENVENIDOS);
        if (welcomeChannel) {
            try {
                const farewellBuffer = await generarDespedida(member);
                const attachment = new AttachmentBuilder(farewellBuffer, { name: 'despedida.png' });

                const farewellEmbed = new EmbedBuilder()
                    .setColor(0xFF5252) // Rojo suave despedida
                    .setAuthor({
                        name: '👋  Hasta pronto...',
                        iconURL: member.user.displayAvatarURL()
                    })
                    .setDescription(
                        `> **${member.user.username}** ha dejado el servidor.\n` +
                        `> ⏱️ **Estuvo con nosotros:** ${tiempoEnServidor}\n\n` +
                        `> 👋 *¡Gracias por haber formado parte de Prophet Gaming! Esperamos verte de vuelta pronto.*`
                    )
                    .setImage('attachment://despedida.png')
                    .setFooter({ text: `Prophet Gaming  ·  Ahora somos ${member.guild.memberCount} miembros` })
                    .setTimestamp();

                welcomeChannel.send({ embeds: [farewellEmbed], files: [attachment] }).catch((err) => {
                    console.error('[Despedida] Error enviando tarjeta de despedida:', err.message);
                });
            } catch (err) {
                console.error('[Despedida] Error generando canvas de despedida:', err.message);
                // Fallback sin imagen
                const simpleEmbed = new EmbedBuilder()
                    .setColor(0xFF5252)
                    .setAuthor({ name: '👋  Hasta luego...', iconURL: member.user.displayAvatarURL() })
                    .setDescription(`> **${member.user.username}** ha dejado el servidor.\n> 👋 *¡Gracias por haber sido parte de Prophet Gaming!*`)
                    .setFooter({ text: `Prophet Gaming  ·  ${member.guild.memberCount} miembros` })
                    .setTimestamp();
                welcomeChannel.send({ embeds: [simpleEmbed] }).catch(() => {});
            }
        }

        // 2. Registro detallado de auditoría en el canal de Logs
        const logChannel = member.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) {
            // Detectar si fue kick via audit log
            let fueKick = false;
            let kickedBy = null;
            try {
                const logs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
                const entry = logs.entries.first();
                if (entry && entry.target.id === member.id && Date.now() - entry.createdTimestamp < 5000) {
                    fueKick = true;
                    kickedBy = entry.executor;
                }
            } catch (e) { }

            // Roles que tenía (excluyendo @everyone)
            const rolesTexto = member.roles.cache
                .filter(r => r.id !== member.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => `\`${r.name}\``)
                .slice(0, 10)
                .join(', ') || '*Sin roles*';

            const logEmbed = new EmbedBuilder()
                .setColor(fueKick ? (config.COLORES.WARN || 0xFFB74D) : (config.COLORES.ERROR || 0xEF5350))
                .setAuthor({
                    name: fueKick ? '👢  Miembro expulsado (Kick)' : '📤  Salida de miembro',
                    iconURL: member.user.displayAvatarURL()
                })
                .setDescription(
                    `> **Usuario:** ${member.user.username} (\`${member.id}\`)\n` +
                    `> **Cuenta creada:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
                    `> **Ingresó:** ${tiempoEnServidor}\n` +
                    (fueKick && kickedBy ? `> **Expulsado por:** <@${kickedBy.id}>\n` : '') +
                    `\n> 📉 **Miembros ahora:** \`${member.guild.memberCount}\``
                )
                .addFields({ name: '🏷️ Roles que tenía', value: rolesTexto })
                .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
                .setFooter({ text: 'Prophet  ·  Log de Salidas' })
                .setTimestamp();

            logChannel.send({ embeds: [logEmbed] }).catch(() => { });
        }
    }
};
