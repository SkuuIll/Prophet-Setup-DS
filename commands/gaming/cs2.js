// ═══ COMANDO: /cs2 ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { getCS2Profile } = require('../../modules/cs2Stats');

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
                'PLAYER_NOT_FOUND': `> ❌ No se encontró el perfil de **${identifier}**.\n> Verificá que el Steam ID sea correcto y que el perfil sea público.`,
                'CS2_STATS_NOT_FOUND': `> ❌ No se pudieron obtener las estadísticas de CS2.\n> El perfil puede ser privado o no tener partidas suficientes.`,
            };

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR)
                .setDescription(errorMessages[error.message] || `> ❌ Error al consultar stats: ${error.message}`)
                .setFooter({ text: 'CS2 Stats • Prophet Bot' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }
};

/**
 * Extraer Steam ID de diversas entradas
 * Soporta: ID directo, URL completa de Steam, vanity URL
 */
function extractSteamId(input) {
    input = input.trim();

    // Si es una URL completa de Steam
    const steamUrlMatch = input.match(/steamcommunity\.com\/(?:profiles|id)\/([^/?\s]+)/);
    if (steamUrlMatch) return steamUrlMatch[1];

    // Si es una URL de tracker.gg
    const trackerUrlMatch = input.match(/tracker\.gg\/cs2\/profile\/steam\/([^/?\s]+)/);
    if (trackerUrlMatch) return trackerUrlMatch[1];

    // Si ya es un Steam ID o nombre
    return input;
}

/**
 * Construir el embed de CS2
 */
function buildCS2Embed(profile) {
    const { playerName, avatarUrl, stats, maps, source } = profile;

    const embed = new EmbedBuilder()
        .setColor(0xDE9B35) // Color dorado CS2
        .setAuthor({
            name: `${playerName}  ·  CS2 Stats`,
            iconURL: avatarUrl || 'https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/social/cs2.jpg',
        });

    if (avatarUrl) {
        embed.setThumbnail(avatarUrl);
    }

    // Stats principales
    const mainStats = [];

    if (stats.kd) mainStats.push(`> 📊 **K/D Ratio:** ${stats.kd}`);
    if (stats.kills) mainStats.push(`> 🔪 **Kills:** ${formatNum(stats.kills)}`);
    if (stats.deaths) mainStats.push(`> 💀 **Deaths:** ${formatNum(stats.deaths)}`);
    if (stats.headshotPct) mainStats.push(`> 🎯 **Headshot %:** ${stats.headshotPct}%`);
    if (stats.damagePerRound) mainStats.push(`> 💥 **Daño/Ronda:** ${stats.damagePerRound}`);

    if (mainStats.length > 0) {
        embed.addFields({
            name: '⚔️ Combate',
            value: mainStats.join('\n'),
            inline: true,
        });
    }

    // Stats de rendimiento
    const perfStats = [];

    if (stats.winRate) perfStats.push(`> 📈 **Win Rate:** ${stats.winRate}%`);
    if (stats.wins) perfStats.push(`> 🏆 **Wins:** ${formatNum(stats.wins)}`);
    if (stats.losses) perfStats.push(`> ❌ **Losses:** ${formatNum(stats.losses)}`);
    if (stats.mvps) perfStats.push(`> ⭐ **MVPs:** ${formatNum(stats.mvps)}`);
    if (stats.score) perfStats.push(`> 🏅 **Score:** ${formatNum(stats.score)}`);

    if (perfStats.length > 0) {
        embed.addFields({
            name: '🏆 Rendimiento',
            value: perfStats.join('\n'),
            inline: true,
        });
    }

    // Stats de partidas
    const matchStats = [];

    if (stats.matchesPlayed) matchStats.push(`> 🎮 **Partidas:** ${formatNum(stats.matchesPlayed)}`);
    if (stats.roundsPlayed) matchStats.push(`> 🔄 **Rondas jugadas:** ${formatNum(stats.roundsPlayed)}`);
    if (stats.roundsWon) matchStats.push(`> ✅ **Rondas ganadas:** ${formatNum(stats.roundsWon)}`);
    if (stats.timePlayed) matchStats.push(`> ⏱️ **Tiempo jugado:** ${stats.timePlayed}`);

    if (matchStats.length > 0) {
        embed.addFields({
            name: '📋 Partidas',
            value: matchStats.join('\n'),
            inline: false,
        });
    }

    // Stats por mapa (si hay datos)
    if (maps && maps.length > 0) {
        const mapLines = maps.map(m => {
            const parts = [`**${m.name}**`];
            if (m.stats.winRate) parts.push(`WR: ${m.stats.winRate}%`);
            if (m.stats.rounds) parts.push(`Rondas: ${m.stats.rounds}`);
            return `> 🗺️ ${parts.join(' · ')}`;
        });

        embed.addFields({
            name: '🗺️ Mapas',
            value: mapLines.join('\n'),
            inline: false,
        });
    }

    const sourceLabel = source === 'api' ? 'API' : 'Web';
    embed.setFooter({ text: `CS2 Stats (${sourceLabel})  ·  tracker.gg  ·  Prophet Bot` })
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
