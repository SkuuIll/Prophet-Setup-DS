// ═══ COMANDO: /actividad — Dashboard de actividad del servidor ═══

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

const ANALYTICS_WINDOW_DAYS = 7;

function sumMetric(rows, metric, bucket = null) {
    return rows.reduce((total, row) => {
        if (row.metric !== metric) return total;
        if (bucket !== null && row.bucket !== bucket) return total;
        return total + Number(row.value || 0);
    }, 0);
}

function formatUptime() {
    const uptimeS = process.uptime();
    const uptimeDays = Math.floor(uptimeS / 86400);
    const uptimeHrs = Math.floor((uptimeS % 86400) / 3600);
    const uptimeMin = Math.floor((uptimeS % 3600) / 60);
    return uptimeDays > 0 ? `${uptimeDays}d ${uptimeHrs}h ${uptimeMin}m` : `${uptimeHrs}h ${uptimeMin}m`;
}

function formatVoiceMinutes(totalMinutes) {
    const voiceHrs = Math.floor(totalMinutes / 60);
    const voiceDays = Math.floor(voiceHrs / 24);
    return voiceDays > 0 ? `${voiceDays}d ${voiceHrs % 24}h` : `${voiceHrs}h`;
}

module.exports = {
    cooldown: 30,
    data: new SlashCommandBuilder()
        .setName('actividad')
        .setDescription('📊 Dashboard de actividad del servidor en tiempo real'),

    async execute(interaction) {
        await interaction.deferReply();

        const analyticsRows = stmts.getAnalyticsMetrics(ANALYTICS_WINDOW_DAYS);
        const mensajesTotales = sumMetric(analyticsRows, 'messages_total');
        const voiceJoins = sumMetric(analyticsRows, 'voice_joins');
        const voiceMinutes = sumMetric(analyticsRows, 'voice_minutes');
        const levelUps = sumMetric(analyticsRows, 'level_ups');
        const aiReplies = sumMetric(analyticsRows, 'ai_replies');
        const automodActions = sumMetric(analyticsRows, 'automod_actions');
        const memberJoins = sumMetric(analyticsRows, 'member_joins');
        const memberLeaves = sumMetric(analyticsRows, 'member_leaves');
        const tempChannels = sumMetric(analyticsRows, 'temp_channels_created');
        const errorEvents = sumMetric(analyticsRows, 'error_events');

        const mem = process.memoryUsage();
        const heapMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
        const rssMB = (mem.rss / 1024 / 1024).toFixed(1);
        const ping = Math.round(interaction.client.ws.ping);
        const pingEmoji = ping < 100 ? '🟢' : ping < 250 ? '🟡' : '🔴';

        const voiceNow = interaction.guild.members.cache.filter(member => member.voice.channelId && !member.user.bot).size;
        const onlineNow = interaction.guild.members.cache.filter(member => ['online', 'idle', 'dnd'].includes(member.presence?.status)).size;

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setAuthor({ name: '📊  Dashboard de Actividad  ·  Prophet Gaming', iconURL: interaction.guild.iconURL() })
            .setThumbnail(interaction.guild.iconURL({ size: 256 }))
            .addFields(
                {
                    name: '💬 Comunicación',
                    value:
                        `> 📨 Mensajes: **${mensajesTotales.toLocaleString()}**\n` +
                        `> 🤖 Respuestas IA: **${aiReplies.toLocaleString()}**\n` +
                        `> ⬆️ Level ups: **${levelUps.toLocaleString()}**`,
                    inline: true
                },
                {
                    name: '🎙️ Voz',
                    value:
                        `> 📥 Joins: **${voiceJoins.toLocaleString()}**\n` +
                        `> ⏱️ Tiempo total: **${formatVoiceMinutes(voiceMinutes)}**\n` +
                        `> 🎤 En voz ahora: **${voiceNow}**`,
                    inline: true
                },
                {
                    name: '👥 Comunidad',
                    value:
                        `> 📈 Nuevos: **${memberJoins.toLocaleString()}**\n` +
                        `> 📉 Salieron: **${memberLeaves.toLocaleString()}**\n` +
                        `> 🟢 Online ahora: **${onlineNow}**`,
                    inline: true
                },
                {
                    name: '🛡️ Moderación',
                    value:
                        `> 🤖 AutoMod: **${automodActions.toLocaleString()}** acciones\n` +
                        `> 🔊 Salas temp: **${tempChannels.toLocaleString()}** creadas\n` +
                        `> ❌ Errores: **${errorEvents.toLocaleString()}**`,
                    inline: true
                },
                {
                    name: '🖥️ Sistema',
                    value:
                        `> ${pingEmoji} Ping: **${ping}ms**\n` +
                        `> 💾 RAM: **${heapMB}MB** / ${rssMB}MB\n` +
                        `> ⏱️ Uptime: **${formatUptime()}**`,
                    inline: true
                }
            )
            .setFooter({ text: `${interaction.guild.name}  ·  Analytics últimos ${ANALYTICS_WINDOW_DAYS} días + estado en vivo` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
