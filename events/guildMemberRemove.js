// ═══ EVENTO: guildMemberRemove (Log de salida) ═══

const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');

module.exports = {
    name: 'guildMemberRemove',
    once: false,
    async execute(member) {
        if (member.user.bot) return;

        // Métrica de retención
        stmts.incrementAnalyticsMetric('member_leaves', 'global', 1);

        const logChannel = member.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (!logChannel) return;

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

        // Tiempo en el servidor
        const joinTs = member.joinedTimestamp;
        const tiempoEnServidor = joinTs
            ? `<t:${Math.floor(joinTs / 1000)}:R> (<t:${Math.floor(joinTs / 1000)}:d>)`
            : 'Desconocido';

        // Roles que tenía (excluyendo @everyone)
        const rolesTexto = member.roles.cache
            .filter(r => r.id !== member.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => `\`${r.name}\``)
            .slice(0, 10)
            .join(', ') || '*Sin roles*';

        const embed = new EmbedBuilder()
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

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};
