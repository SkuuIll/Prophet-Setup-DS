// ═══ EVENTO: roleCreate (Log de creación de rol) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'roleCreate',
    once: false,
    async execute(role) {
        const logChannelId = config.CHANNELS.LOGS;
        const logChannel = role.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        let executor = 'Desconocido';
        try {
            const fetchedLogs = await role.guild.fetchAuditLogs({ limit: 1, type: 30 }); // RoleCreate
            const creationLog = fetchedLogs.entries.first();
            if (creationLog && Date.now() - creationLog.createdTimestamp < 5000) {
                executor = `<@${creationLog.executor.id}> (\`${creationLog.executor.id}\`)`;
            }
        } catch (e) { }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setAuthor({ name: '🏷️ Rol Creado' })
            .setDescription(
                `> **Nombre:** ${role.name} (\`${role.id}\`)\n` +
                `> **Color:** \`${role.hexColor}\`\n` +
                `> **Creado por:** ${executor}`
            )
            .setFooter({ text: 'Prophet · Log de Servidor' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};
