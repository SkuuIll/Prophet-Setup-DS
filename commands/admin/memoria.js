const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('memoria')
        .setDescription('Muestra las últimas acciones registradas por el bot (Memoria del sistema)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const logs = stmts.getLogs(15);

        if (logs.length === 0) {
            return interaction.reply({ content: '📭 No hay acciones registradas en la memoria todavía.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xF5C542)
            .setTitle('🧠 Memoria del Sistema — Últimas Acciones')
            .setDescription('Aquí tienes los últimos eventos registrados por el bot:')
            .setTimestamp()
            .setFooter({ text: 'Prophet Bot v2.0 • Memoria persistente' });

        logs.forEach((log, i) => {
            const time = new Date(log.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            let details = '';

            switch (log.type) {
                case 'COMMAND':
                    details = `👤 **${log.details.user}** ejecutó \`/${log.details.command}\` en <#${interaction.guild.channels.cache.find(c => c.name === log.details.channel)?.id || '??'}>`;
                    break;
                case 'MUSIC_START':
                    details = `🎵 Sonando: **${log.details.song}**\n👤 Pedida por: \`${log.details.requestedBy}\``;
                    break;
                case 'MUSIC_END':
                    details = `📭 La cola de música terminó.`;
                    break;
                case 'MUSIC_DISCONNECT':
                    details = `🔌 El bot se desconectó del canal de voz.`;
                    break;
                case 'SYSTEM_UNBAN':
                    details = `🔓 Usuario <@${log.details.userId}> desbaneado automáticamente.`;
                    break;
                default:
                    details = JSON.stringify(log.details);
            }

            embed.addFields({
                name: `[${time}] ${log.type}`,
                value: details || 'Sin detalles'
            });
        });

        await interaction.reply({ embeds: [embed] });
    }
};
