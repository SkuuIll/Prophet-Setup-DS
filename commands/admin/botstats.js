// ═══ COMANDO: /botstats — Diagnóstico completo del bot (Solo admins) ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');
const { stmts, _db } = require('../../database');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botstats')
        .setDescription('📊 Diagnóstico completo del estado del bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        // ── Memoria ──
        const mem = process.memoryUsage();
        const rss = (mem.rss / 1024 / 1024).toFixed(1);
        const heapUsed = (mem.heapUsed / 1024 / 1024).toFixed(1);
        const heapTotal = (mem.heapTotal / 1024 / 1024).toFixed(1);
        const external = (mem.external / 1024 / 1024).toFixed(1);

        // ── Uptime ──
        const uptime = process.uptime();
        const dias = Math.floor(uptime / 86400);
        const horas = Math.floor((uptime % 86400) / 3600);
        const minutos = Math.floor((uptime % 3600) / 60);
        const uptimeStr = dias > 0 ? `${dias}d ${horas}h ${minutos}m` : `${horas}h ${minutos}m`;

        // ── Base de datos ──
        const totalUsers = _db.prepare('SELECT COUNT(*) as c FROM users').get().c;
        const activeUsers = _db.prepare('SELECT COUNT(*) as c FROM users WHERE messages > 0').get().c;
        const totalWarns = _db.prepare('SELECT COUNT(*) as c FROM warns').get().c;
        const totalLogs = _db.prepare('SELECT COUNT(*) as c FROM logs').get().c;
        const totalTickets = _db.prepare('SELECT COUNT(*) as c FROM tickets').get().c;
        const activeTempbans = _db.prepare('SELECT COUNT(*) as c FROM tempbans').get().c;
        const twitchSubs = _db.prepare('SELECT COUNT(*) as c FROM twitch_subs').get().c;
        const youtubeSubs = _db.prepare('SELECT COUNT(*) as c FROM youtube_subs').get().c;
        const githubSubs = _db.prepare('SELECT COUNT(*) as c FROM github_subs').get().c;
        const gameServers = _db.prepare('SELECT COUNT(*) as c FROM game_servers').get().c;
        const tempChannels = _db.prepare('SELECT COUNT(*) as c FROM temp_channels').get().c;

        // DB file size
        const fs = require('fs');
        const path = require('path');
        const dbPath = path.join(__dirname, '..', '..', 'data', 'prophet.sqlite');
        let dbSize = 'N/A';
        try {
            const stat = fs.statSync(dbPath);
            dbSize = (stat.size / 1024 / 1024).toFixed(2) + ' MB';
        } catch (e) { }

        // ── Backups ──
        const backupDir = path.join(__dirname, '..', '..', 'data', 'backups');
        let backupCount = 0;
        let lastBackup = 'Ninguno';
        try {
            const backups = fs.readdirSync(backupDir).filter(f => f.endsWith('.sqlite')).sort().reverse();
            backupCount = backups.length;
            if (backups.length > 0) lastBackup = backups[0].replace('prophet_', '').replace('.sqlite', '');
        } catch (e) { }

        // ── AI Context ──
        let aiStats = { canalesActivos: 0, totalMensajes: 0 };
        try {
            const { getContextStats } = require('../../modules/aiChat');
            aiStats = getContextStats();
        } catch (e) { }

        // ── Voice Sessions ──
        const voiceSessions = client.voiceSessions ? client.voiceSessions.size : 0;

        // ── Discord stats ──
        const guild = interaction.guild;
        const onlineMembers = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;

        // ── Sistema ──
        const nodeVersion = process.version;
        const platform = `${os.type()} ${os.release()}`;
        const cpuUsage = os.loadavg();

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setAuthor({ name: '📊  Prophet Bot — Diagnóstico', iconURL: client.user.displayAvatarURL() })
            .setDescription(`Reporte completo del estado del sistema.\n\u200b`)
            .addFields(
                {
                    name: '🖥️ Sistema',
                    value: [
                        `> ⏱️ Uptime: \`${uptimeStr}\``,
                        `> 🟢 Node.js: \`${nodeVersion}\``,
                        `> 💻 OS: \`${platform}\``,
                        `> 📊 CPU Load: \`${cpuUsage[0].toFixed(2)}\` / \`${cpuUsage[1].toFixed(2)}\` / \`${cpuUsage[2].toFixed(2)}\``,
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💾 Memoria',
                    value: [
                        `> RSS: \`${rss} MB\``,
                        `> Heap: \`${heapUsed} / ${heapTotal} MB\``,
                        `> External: \`${external} MB\``,
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🗄️ Base de Datos',
                    value: [
                        `> Tamaño: \`${dbSize}\``,
                        `> Backups: \`${backupCount}\` (último: \`${lastBackup}\`)`,
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '👥 Usuarios',
                    value: [
                        `> Registrados: \`${totalUsers}\``,
                        `> Activos (con msgs): \`${activeUsers}\``,
                        `> Online ahora: \`${onlineMembers}\``,
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🛡️ Moderación',
                    value: [
                        `> Warns activos: \`${totalWarns}\``,
                        `> Tempbans activos: \`${activeTempbans}\``,
                        `> Tickets abiertos: \`${totalTickets}\``,
                        `> Logs recientes: \`${totalLogs}\``,
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📡 Monitores',
                    value: [
                        `> Twitch: \`${twitchSubs}\` subs`,
                        `> YouTube: \`${youtubeSubs}\` subs`,
                        `> GitHub: \`${githubSubs}\` repos`,
                        `> Servers: \`${gameServers}\` monitoreados`,
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🤖 IA & Música',
                    value: [
                        `> Contextos IA activos: \`${aiStats.canalesActivos}\``,
                        `> Mensajes en contexto: \`${aiStats.totalMensajes}\``,
                        `> Sesiones de voz: \`${voiceSessions}\``,
                        `> Canales temporales: \`${tempChannels}\``,
                    ].join('\n'),
                    inline: true
                },
            )
            .setFooter({ text: `Prophet Bot v2.9  ·  ${totalUsers} usuarios · ${client.commands.size} comandos` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
