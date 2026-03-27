// ═══ COMANDO: /actividad — Dashboard de actividad del servidor ═══

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    cooldown: 30,
    data: new SlashCommandBuilder()
        .setName('actividad')
        .setDescription('📊 Dashboard de actividad del servidor en tiempo real'),

    async execute(interaction) {
        await interaction.deferReply();

        // Obtener métricas de analytics
        const getMetric = (name, key) => {
            try {
                const result = stmts.getAnalyticsMetric?.(name, key);
                return result?.value || 0;
            } catch { return 0; }
        };

        const mensajesTotales = getMetric('messages_total', 'global');
        const voiceJoins = getMetric('voice_joins', 'global');
        const voiceMinutes = getMetric('voice_minutes', 'global');
        const levelUps = getMetric('level_ups', 'global');
        const aiReplies = getMetric('ai_replies', 'direct_mention') + getMetric('ai_replies', 'chat_auto') + getMetric('ai_replies', 'vision_auto');
        const automodActions = getMetric('automod_actions', 'global');
        const memberJoins = getMetric('member_joins', 'global');
        const memberLeaves = getMetric('member_leaves', 'global');
        const tempChannels = getMetric('temp_channels_created', 'global');
        const errorEvents = getMetric('error_events', 'commands') + getMetric('error_events', 'ai');

        // Uptime
        const uptimeS = process.uptime();
        const uptimeDays = Math.floor(uptimeS / 86400);
        const uptimeHrs = Math.floor((uptimeS % 86400) / 3600);
        const uptimeMin = Math.floor((uptimeS % 3600) / 60);
        const uptimeStr = uptimeDays > 0 ? `${uptimeDays}d ${uptimeHrs}h ${uptimeMin}m` : `${uptimeHrs}h ${uptimeMin}m`;

        // Memoria
        const mem = process.memoryUsage();
        const heapMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
        const rssMB = (mem.rss / 1024 / 1024).toFixed(1);

        // Ping
        const ping = Math.round(interaction.client.ws.ping);
        const pingEmoji = ping < 100 ? '🟢' : ping < 250 ? '🟡' : '🔴';

        // Formatear tiempo de voz total
        const voiceHrs = Math.floor(voiceMinutes / 60);
        const voiceDays = Math.floor(voiceHrs / 24);
        const voiceStr = voiceDays > 0 ? `${voiceDays}d ${voiceHrs % 24}h` : `${voiceHrs}h`;

        // Miembros activos ahora en voz
        const voiceNow = interaction.guild.members.cache.filter(m =>
            m.voice.channelId && !m.user.bot
        ).size;

        // Online ahora
        const onlineNow = interaction.guild.members.cache.filter(m =>
            m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd'
        ).size;

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
                        `> ⏱️ Tiempo total: **${voiceStr}**\n` +
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
                        `> ⏱️ Uptime: **${uptimeStr}**`,
                    inline: true
                }
            )
            .setFooter({ text: `${interaction.guild.name}  ·  Métricas acumuladas desde el último reinicio` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
