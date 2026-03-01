// ═══ COMANDO: /cs2 ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { getCS2Profile } = require('../../modules/cs2Stats');

// Assets CS2
const CS2_LOGO = 'https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/social/cs2.jpg';
const CS2_BANNER = 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg';
const CS2_COLOR = 0xDE9B35; // Dorado CS2

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cs2')
        .setDescription('🔫 Ver estadísticas de CS2 de un jugador')
        .addStringOption(opt =>
            opt.setName('steamid')
                .setDescription('Steam ID, Steam64 ID, o URL de perfil del jugador')
                .setRequired(true)),

    async execute(interaction) {
        const rawInput = interaction.options.getString('steamid');
        const identifier = extractSteamId(rawInput);

        await interaction.deferReply();

        try {
            const profile = await getCS2Profile(identifier);
            const embed = buildCS2Embed(profile);
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            const errorMessages = {
                'PLAYER_NOT_FOUND': `> ❌ No se encontró el perfil de **${identifier}**.\n> Verificá que el Steam ID sea correcto y que el perfil sea **público**.`,
                'CS2_STATS_NOT_FOUND': `> ❌ No se pudieron obtener las estadísticas de CS2.\n> El perfil puede ser **privado** o no tener partidas suficientes.\n> Verificá que el Steam ID sea correcto.`,
            };

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR)
                .setAuthor({ name: 'CS2 Stats  ·  Error', iconURL: CS2_LOGO })
                .setDescription(errorMessages[error.message] || `> ❌ Error inesperado: \`${error.message}\``)
                .setFooter({ text: 'Prophet Bot  ·  CS2 Stats  ·  tracker.gg' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }
};

/**
 * Extraer Steam ID de diversas entradas
 */
function extractSteamId(input) {
    input = input.trim();
    const steamUrlMatch = input.match(/steamcommunity\.com\/(?:profiles|id)\/([^/?\s]+)/);
    if (steamUrlMatch) return steamUrlMatch[1];
    const trackerUrlMatch = input.match(/tracker\.gg\/cs2\/profile\/steam\/([^/?\s]+)/);
    if (trackerUrlMatch) return trackerUrlMatch[1];
    return input;
}

/**
 * Construir el embed premium de CS2
 */
function buildCS2Embed(profile) {
    const { playerName, avatarUrl, stats, maps, source } = profile;

    // K/D Badge
    const kd = parseFloat(stats.kd) || 0;
    let kdBadge = '🔴';
    if (kd >= 2.0) kdBadge = '🔥';
    else if (kd >= 1.5) kdBadge = '⭐';
    else if (kd >= 1.2) kdBadge = '🟢';
    else if (kd >= 0.9) kdBadge = '🟡';

    // HS% Badge
    const hs = parseFloat(stats.headshotPct) || 0;
    let hsBadge = '⬜';
    if (hs >= 60) hsBadge = '🎯';
    else if (hs >= 50) hsBadge = '⭐';
    else if (hs >= 40) hsBadge = '🟢';
    else if (hs >= 30) hsBadge = '🟡';
    else hsBadge = '🔴';

    const embed = new EmbedBuilder()
        .setColor(CS2_COLOR)
        .setAuthor({
            name: playerName,
            iconURL: avatarUrl || CS2_LOGO,
            url: `https://tracker.gg/cs2/profile/steam/${encodeURIComponent(playerName)}/overview`
        });

    if (avatarUrl) {
        embed.setThumbnail(avatarUrl);
    } else {
        embed.setThumbnail(CS2_LOGO);
    }

    // Resumen rápido
    const summaryParts = [];
    if (stats.kd) summaryParts.push(`${kdBadge} **K/D:** \`${stats.kd}\``);
    if (stats.winRate) summaryParts.push(`📈 **WR:** \`${stats.winRate}%\``);
    if (stats.headshotPct) summaryParts.push(`${hsBadge} **HS:** \`${stats.headshotPct}%\``);

    embed.setDescription(
        `╔══════════════════════════════╗\n` +
        `║  🎮 **Counter-Strike 2** Stats\n` +
        `╚══════════════════════════════╝\n\n` +
        (summaryParts.length > 0 ? `> ${summaryParts.join('  ·  ')}\n` : '') +
        (stats.matchesPlayed ? `> 🕹️ **${formatNum(stats.matchesPlayed)} partidas** jugadas` : '')
    );

    // ═══ COMBATE ═══
    const combatLines = [];
    if (stats.kd) combatLines.push(`╠ 📊 **K/D Ratio:** \`${stats.kd}\``);
    if (stats.kills) combatLines.push(`╠ 🔪 **Kills:** \`${formatNum(stats.kills)}\``);
    if (stats.deaths) combatLines.push(`╠ 💀 **Deaths:** \`${formatNum(stats.deaths)}\``);
    if (stats.headshotPct) combatLines.push(`╠ 🎯 **Headshot %:** \`${stats.headshotPct}%\``);
    if (stats.damagePerRound) combatLines.push(`╚ 💥 **Daño/Ronda:** \`${stats.damagePerRound}\``);

    // Fix last item marker
    if (combatLines.length > 0) {
        combatLines[combatLines.length - 1] = combatLines[combatLines.length - 1].replace('╠', '╚');
        embed.addFields({
            name: '```⚔️  C O M B A T E```',
            value: combatLines.join('\n'),
            inline: true,
        });
    }

    // ═══ RENDIMIENTO ═══
    const perfLines = [];
    if (stats.winRate) perfLines.push(`╠ 📈 **Win Rate:** \`${stats.winRate}%\``);
    if (stats.wins) perfLines.push(`╠ 🏆 **Wins:** \`${formatNum(stats.wins)}\``);
    if (stats.losses) perfLines.push(`╠ ❌ **Losses:** \`${formatNum(stats.losses)}\``);
    if (stats.mvps) perfLines.push(`╠ ⭐ **MVPs:** \`${formatNum(stats.mvps)}\``);
    if (stats.score) perfLines.push(`╚ 🏅 **Score:** \`${formatNum(stats.score)}\``);

    if (perfLines.length > 0) {
        perfLines[perfLines.length - 1] = perfLines[perfLines.length - 1].replace('╠', '╚');
        embed.addFields({
            name: '```🏆  R E N D I M I E N T O```',
            value: perfLines.join('\n'),
            inline: true,
        });
    }

    // ═══ PARTIDAS ═══
    const matchLines = [];
    if (stats.roundsPlayed) matchLines.push(`╠ 🔄 **Rondas jugadas:** \`${formatNum(stats.roundsPlayed)}\``);
    if (stats.roundsWon) matchLines.push(`╠ ✅ **Rondas ganadas:** \`${formatNum(stats.roundsWon)}\``);
    if (stats.timePlayed) matchLines.push(`╚ ⏱️ **Tiempo jugado:** \`${stats.timePlayed}\``);

    if (matchLines.length > 0) {
        matchLines[matchLines.length - 1] = matchLines[matchLines.length - 1].replace('╠', '╚');
        embed.addFields({
            name: '\u200b',
            value: '> ─────────── **📋 Partidas** ───────────',
            inline: false,
        });
        embed.addFields({
            name: '```📋  P A R T I D A S```',
            value: matchLines.join('\n'),
            inline: false,
        });
    }

    // ═══ MAPAS ═══
    if (maps && maps.length > 0) {
        const mapLines = maps.map((m, i) => {
            const parts = [`**${m.name}**`];
            if (m.stats.winRate) parts.push(`WR: ${m.stats.winRate}%`);
            if (m.stats.rounds) parts.push(`${m.stats.rounds} rondas`);
            const prefix = i === maps.length - 1 ? '╚' : '╠';
            return `${prefix} 🗺️ ${parts.join(' · ')}`;
        });

        embed.addFields({
            name: '```🗺️  M A P A S```',
            value: mapLines.join('\n'),
            inline: false,
        });
    }

    // Banner e info final
    embed.setImage(CS2_BANNER);

    const sourceLabel = source === 'api' ? 'API' : 'Web';
    embed.setFooter({
        text: `Prophet Bot  ·  CS2 Stats (${sourceLabel})  ·  tracker.gg`,
        iconURL: CS2_LOGO,
    })
        .setTimestamp();

    return embed;
}

/**
 * Formatear número con separador de miles
 */
function formatNum(value) {
    if (value === null || value === undefined) return '0';
    const num = Number(String(value).replace(/,/g, ''));
    if (isNaN(num)) return String(value);
    return num.toLocaleString();
}
