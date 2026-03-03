// ═══ COMANDO: /estadísticas ═══
const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

function formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s % 60}s`;
}

function getActivityBar(count, max) {
    const blocks = 8;
    const filled = max > 0 ? Math.min(Math.round((count / max) * blocks), blocks) : 0;
    return '▰'.repeat(filled) + '▱'.repeat(blocks - filled);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('estadísticas')
        .setDescription('📊 Ver estadísticas globales del servidor y el bot'),

    async execute(interaction) {
        await interaction.deferReply();
        await interaction.guild.members.fetch();

        const guild = interaction.guild;

        // ── Miembros ──
        const totalMembers = guild.memberCount;
        const humans = guild.members.cache.filter(m => !m.user.bot).size;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const withBday = guild.members.cache.filter(m => !m.user.bot && stmts.getBirthday(m.id)).size;

        // ── Canales ──
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const threads = guild.channels.cache.filter(c => c.isThread?.()).size;

        // ── Economía top ──
        const ecoTop = stmts.getEcoTop(3);
        const topEconStr = ecoTop.length > 0
            ? ecoTop.map((u, i) => {
                const medals = ['🥇', '🥈', '🥉'];
                const member = guild.members.cache.get(u.id);
                const name = member?.user?.username || `ID: ${u.id.slice(-4)}`;
                return `> ${medals[i]} **${name}** — \`${config.ECONOMIA.CURRENCY} ${u.total.toLocaleString()}\``;
            }).join('\n')
            : '> Sin datos de economía';

        // ── Niveles top ──
        const lvlTop = stmts.getTop(3);
        const topLvlStr = lvlTop.length > 0
            ? lvlTop.map((u, i) => {
                const medals = ['🥇', '🥈', '🥉'];
                const member = guild.members.cache.get(u.id);
                const name = member?.user?.username || `ID: ${u.id.slice(-4)}`;
                return `> ${medals[i]} **${name}** — Nv.\`${u.level}\` (${u.xp.toLocaleString()} XP)`;
            }).join('\n')
            : '> Sin datos de niveles';

        // ── Bot stats ──
        const uptimeStr = formatUptime(process.uptime() * 1000);
        const memMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        const ping = Math.round(interaction.client.ws.ping);
        const pingEmoji = ping < 150 ? '🟢' : ping < 350 ? '🟡' : '🔴';

        // ── Boosts ──
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;
        const boostStr = boostCount > 0
            ? `Nivel ${boostLevel} · ${boostCount} boosts`
            : 'Sin boosts activos';

        // Barra de humanos vs bots
        const maxBar = 8;
        const humanPct = Math.round((humans / totalMembers) * maxBar);
        const botPct = maxBar - humanPct;
        const memberBar = '👤'.repeat(humanPct) + '🤖'.repeat(Math.max(botPct, 0));

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setAuthor({ name: '📊  Estadísticas — Prophet Gaming', iconURL: guild.iconURL() })
            .setThumbnail(guild.iconURL({ size: 256 }))
            .setDescription(
                `**Distribución de miembros:**\n> ${memberBar}\n> 👤 \`${humans}\` humanos  ·  🤖 \`${bots}\` bots\n`
            )
            .addFields(
                {
                    name: '👥 Miembros',
                    value:
                        `> 🌐 Total: \`${totalMembers}\`\n` +
                        `> 👤 Humanos: \`${humans}\`\n` +
                        `> 🎂 Con cumple: \`${withBday}\``,
                    inline: true
                },
                {
                    name: '💬 Canales',
                    value:
                        `> 📝 Texto: \`${textChannels}\`\n` +
                        `> 🔊 Voz: \`${voiceChannels}\`\n` +
                        `> 🧵 Hilos: \`${threads}\``,
                    inline: true
                },
                {
                    name: '💎 Boost',
                    value: `> ${boostStr}`,
                    inline: true
                },
                {
                    name: '🏆 Top Nivel (XP)',
                    value: topLvlStr,
                    inline: false
                },
                {
                    name: '💰 Top Economía',
                    value: topEconStr,
                    inline: false
                },
                {
                    name: '🤖 Estado del Bot',
                    value:
                        `> ${pingEmoji} Ping: \`${ping}ms\`\n` +
                        `> ⏱️ Uptime: \`${uptimeStr}\`\n` +
                        `> 💾 RAM: \`${memMB} MB\``,
                    inline: false
                }
            )
            .setFooter({ text: `Solicitado por ${interaction.user.username}  ·  Prophet Bot` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
