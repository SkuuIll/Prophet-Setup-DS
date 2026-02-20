// ═══ EVENTO: roleDelete (Log de borrado de rol) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'roleDelete',
    once: false,
    async execute(role) {
        const logChannelId = config.CHANNELS.LOGS;
        const logChannel = role.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        let executor = 'Desconocido';
        try {
            const fetchedLogs = await role.guild.fetchAuditLogs({ limit: 1, type: 32 }); // RoleDelete
            const deletionLog = fetchedLogs.entries.first();
            if (deletionLog && Date.now() - deletionLog.createdTimestamp < 5000) {
                executor = `<@${deletionLog.executor.id}> (\`${deletionLog.executor.id}\`)`;
            }
        } catch (e) { }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR || 0xEF5350)
            .setAuthor({ name: '🗑️ Rol Eliminado' })
            .setDescription(
                `> **Nombre:** ${role.name} (\`${role.id}\`)\n` +
                `> **Color:** \`${role.hexColor}\`\n` +
                `> **Eliminado por:** ${executor}`
            )
            .setFooter({ text: 'Prophet · Log de Servidor' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};
