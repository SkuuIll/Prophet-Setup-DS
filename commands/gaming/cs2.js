// ═══ COMANDO: /cs2 ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { getCS2Profile } = require('../../modules/cs2Stats');

// ────────────────── ASSETS ──────────────────
const CS2_LOGO = 'https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/social/cs2.jpg';
const CS2_BANNER = 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg';

// ────────────────── HELPERS ──────────────────

/** Barra de progreso unicode */
function bar(value, max, size = 10) {
    const pct = Math.min((parseFloat(value) || 0) / Math.max(parseFloat(max) || 1, 1), 1);
    const filled = Math.round(pct * size);
    return '█'.repeat(filled) + '░'.repeat(size - filled);
}

/** Formatear número con separador de miles */
function fmtNum(value) {
    if (value == null) return '0';
    const n = Number(String(value).replace(/,/g, ''));
    return isNaN(n) ? String(value) : n.toLocaleString('es-AR');
}

/**
 * Rango por K/D — devuelve { emoji, label, color }
 */
function kdRank(kd) {
    kd = parseFloat(kd) || 0;
    if (kd >= 2.5) return { emoji: '💎', label: 'Legendario', color: 0xB9F2FF };
    if (kd >= 2.0) return { emoji: '🔥', label: 'Élite', color: 0xFF6B35 };
    if (kd >= 1.5) return { emoji: '⭐', label: 'Experto', color: 0xFFD700 };
    if (kd >= 1.2) return { emoji: '🟢', label: 'Avanzado', color: 0x69F0AE };
    if (kd >= 0.9) return { emoji: '🟡', label: 'Promedio', color: 0xFFC107 };
    return { emoji: '🔴', label: 'Novato', color: 0xEF5350 };
}

/**
 * Rango por HS% — devuelve emoji
 */
function hsRank(hs) {
    hs = parseFloat(hs) || 0;
    if (hs >= 60) return '🎯';
    if (hs >= 50) return '⭐';
    if (hs >= 40) return '🟢';
    if (hs >= 30) return '🟡';
    return '🔴';
}

/**
 * Rango por Win Rate — devuelve emoji
 */
function wrRank(wr) {
    wr = parseFloat(wr) || 0;
    if (wr >= 60) return '🏆';
    if (wr >= 55) return '🥇';
    if (wr >= 50) return '🟢';
    if (wr >= 45) return '🟡';
    return '🔴';
}

// ─────────────────────────────────────────────────────
module.exports = {
    data: new SlashCommandBuilder()
        .setName('cs2')
        .setDescription('🔫 Ver estadísticas de CS2 de un jugador de Steam')
        .addStringOption(opt =>
            opt.setName('steamid')
                .setDescription('Steam ID, Steam64 ID o URL del perfil de Steam/tracker.gg')
                .setRequired(true)),

    async execute(interaction) {
        const rawInput = interaction.options.getString('steamid');
        const identifier = extractSteamId(rawInput);

        await interaction.deferReply();

        try {
            const profile = await getCS2Profile(identifier);
            await interaction.editReply({ embeds: [buildCS2Embed(profile)] });
        } catch (error) {
            const msgs = {
                PLAYER_NOT_FOUND: `> ❌ No se encontró el perfil de **${identifier}**.\n> Verificá que el Steam ID sea correcto y que el perfil sea **público**.`,
                CS2_STATS_NOT_FOUND: `> ❌ No se pudieron obtener las estadísticas de CS2.\n> El perfil puede ser **privado** o no tener suficientes partidas registradas.`,
            };
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR)
                    .setAuthor({ name: 'CS2 Stats  ·  Error', iconURL: CS2_LOGO })
                    .setDescription(msgs[error.message] ?? `> ❌ Error inesperado: \`${error.message}\``)
                    .setFooter({ text: 'Prophet Bot  ·  CS2 Stats' })
                    .setTimestamp()
                ],
            });
        }
    },
};

// ────────────────── EXTRAER STEAM ID ──────────────────

function extractSteamId(input) {
    input = input.trim();
    const steamUrl = input.match(/steamcommunity\.com\/(?:profiles|id)\/([^/?\s]+)/);
    if (steamUrl) return steamUrl[1];
    const trackerUrl = input.match(/tracker\.gg\/cs2\/profile\/steam\/([^/?\s]+)/);
    if (trackerUrl) return trackerUrl[1];
    return input;
}

// ────────────────── EMBED PRINCIPAL ──────────────────

function buildCS2Embed(profile) {
    const { playerName, avatarUrl, stats, maps, source } = profile;

    const kd = parseFloat(stats.kd) || 0;
    const hs = parseFloat(stats.headshotPct) || 0;
    const wr = parseFloat(stats.winRate) || 0;
    const rank = kdRank(kd);
    const hsEmj = hsRank(hs);
    const wrEmj = wrRank(wr);

    // ── Descripción / tarjeta resumen ──
    const lines = [
        `> 🎮 **Counter-Strike 2**  ·  🖥️ Steam`,
        stats.matchesPlayed
            ? `> 🕹️ **${fmtNum(stats.matchesPlayed)}** partidas jugadas`
            : null,
        ``,
        `> ${rank.emoji} **K/D Ratio** — \`${bar(kd, 3)}\` **${stats.kd ?? '—'}** *(${rank.label})*`,
        stats.winRate
            ? `> ${wrEmj} **Victorias%** — \`${bar(wr, 70)}\` **${stats.winRate}%**`
            : null,
        stats.headshotPct
            ? `> ${hsEmj} **Cabezazos%** — \`${bar(hs, 70)}\` **${stats.headshotPct}%**`
            : null,
        stats.damagePerRound
            ? `> 💥 **Daño/Ronda** — \`${bar(stats.damagePerRound, 120)}\` **${stats.damagePerRound}**`
            : null,
    ].filter(l => l !== null);

    const embed = new EmbedBuilder()
        .setColor(rank.color)
        .setAuthor({
            name: playerName,
            iconURL: avatarUrl || CS2_LOGO,
            url: `https://tracker.gg/cs2/profile/steam/${encodeURIComponent(playerName)}/overview`,
        })
        .setThumbnail(avatarUrl || CS2_LOGO)
        .setDescription(lines.join('\n'));

    // ── COMBATE ──
    const combatLines = [];
    if (stats.kills) combatLines.push(`╠ 🔪 **Eliminaciones:** \`${fmtNum(stats.kills)}\``);
    if (stats.deaths) combatLines.push(`╠ 💀 **Muertes:** \`${fmtNum(stats.deaths)}\``);
    if (stats.kd) combatLines.push(`╠ 📊 **K/D Ratio:** \`${stats.kd}\``);
    if (stats.headshotPct) combatLines.push(`╠ 🎯 **Cabezazos:** \`${stats.headshotPct}%\``);
    if (stats.damagePerRound) combatLines.push(`╚ 💥 **Daño/Ronda:** \`${stats.damagePerRound}\``);

    if (combatLines.length > 0) {
        fixLast(combatLines);
        embed.addFields({ name: '```⚔️  COMBATE```', value: combatLines.join('\n'), inline: true });
    }

    // ── RENDIMIENTO ──
    const perfLines = [];
    if (stats.winRate) perfLines.push(`╠ 📈 **Victorias%:** \`${stats.winRate}%\``);
    if (stats.wins) perfLines.push(`╠ 🏆 **Victorias:** \`${fmtNum(stats.wins)}\``);
    if (stats.losses) perfLines.push(`╠ ❌ **Derrotas:** \`${fmtNum(stats.losses)}\``);
    if (stats.mvps) perfLines.push(`╠ ⭐ **MVPs:** \`${fmtNum(stats.mvps)}\``);
    if (stats.score) perfLines.push(`╚ 🏅 **Puntuación total:** \`${fmtNum(stats.score)}\``);

    if (perfLines.length > 0) {
        fixLast(perfLines);
        embed.addFields({ name: '```🏆  RENDIMIENTO```', value: perfLines.join('\n'), inline: true });
    }

    // ── RONDAS & TIEMPO ──
    const roundLines = [];
    if (stats.roundsPlayed) roundLines.push(`╠ 🔄 **Rondas jugadas:** \`${fmtNum(stats.roundsPlayed)}\``);
    if (stats.roundsWon) roundLines.push(`╠ ✅ **Rondas ganadas:** \`${fmtNum(stats.roundsWon)}\``);
    if (stats.timePlayed) roundLines.push(`╚ ⏱️ **Tiempo jugado:** \`${stats.timePlayed}\``);

    if (roundLines.length > 0) {
        fixLast(roundLines);
        embed.addFields(
            { name: '\u200b', value: '> ─────────────────────', inline: false },
            { name: '```📋  PARTIDAS & TIEMPO```', value: roundLines.join('\n'), inline: false },
        );
    }

    // ── MAPAS ──
    if (maps?.length > 0) {
        // Ordenar por winRate descendente
        const sorted = [...maps].sort((a, b) =>
            (parseFloat(b.stats?.winRate) || 0) - (parseFloat(a.stats?.winRate) || 0),
        );

        const mapLines = sorted.map((m, i) => {
            const mapWr = parseFloat(m.stats?.winRate) || 0;
            const rounds = m.stats?.rounds ?? 0;
            const isLast = i === sorted.length - 1;
            const prefix = isLast ? '╚' : '╠';
            return (
                `${prefix} 🗺️ **${m.name}** — ` +
                `\`${bar(mapWr, 70, 7)}\` ${mapWr}% Win  ·  ${fmtNum(rounds)} rondas`
            );
        });

        embed.addFields({ name: '```🗺️  MAPAS (por Win%)```', value: mapLines.join('\n'), inline: false });
    }

    // ── Footer ──
    const sourceLabel = source === 'api' ? 'API Oficial' : 'Web Scraping';
    embed
        .setImage(CS2_BANNER)
        .setFooter({ text: `Prophet Bot  ·  CS2 Stats (${sourceLabel})  ·  tracker.gg`, iconURL: CS2_LOGO })
        .setTimestamp();

    return embed;
}

/** Reemplaza el último ╠ por ╚ en un array de strings */
function fixLast(lines) {
    if (lines.length > 0) {
        lines[lines.length - 1] = lines[lines.length - 1].replace('╠', '╚');
    }
}
