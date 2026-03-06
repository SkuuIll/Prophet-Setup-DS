// ═══ COMANDO: /pubg — Con menú interactivo completo ═══
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config');
const pubgApi = require('../../modules/pubgApi');

// ────────────────── CONSTANTES ──────────────────
const MODE_LABELS = {
    'solo': '🎯 Solo TPP', 'solo-fpp': '🎯 Solo FPP',
    'duo': '👥 Dúo TPP', 'duo-fpp': '👥 Dúo FPP',
    'squad': '🛡️ Escuadra TPP', 'squad-fpp': '🛡️ Escuadra FPP',
    'solo-ranked': '🏅 Solo Clasif. TPP', 'solo-fpp-ranked': '🏅 Solo Clasif. FPP',
    'duo-ranked': '🏅 Dúo Clasif. TPP', 'duo-fpp-ranked': '🏅 Dúo Clasif. FPP',
    'squad-ranked': '🏅 Escuadra Clasif. TPP', 'squad-fpp-ranked': '🏅 Escuadra Clasif. FPP',
    'tdm': '🔫 Combate por Equipos', 'ibr': '🚀 Batalla Intensa',
};
const MODE_SHORT = {
    'solo': 'Solo', 'solo-fpp': 'Solo FPP',
    'duo': 'Dúo', 'duo-fpp': 'Dúo FPP',
    'squad': 'Escuadra', 'squad-fpp': 'Escuadra FPP',
    'solo-ranked': 'Solo (C)', 'solo-fpp-ranked': 'Solo FPP (C)',
    'duo-ranked': 'Dúo (C)', 'duo-fpp-ranked': 'Dúo FPP (C)',
    'squad-ranked': 'Esc. (C)', 'squad-fpp-ranked': 'Esc. FPP (C)',
    'tdm': 'TDM', 'ibr': 'IBR',
};
const PLATFORM_LABELS = {
    'steam': '🖥️ Steam', 'psn': '🎮 PlayStation', 'xbox': '🟢 Xbox',
};
const PLATFORM_EMOJI = { 'steam': '🖥️', 'psn': '🎮', 'xbox': '🟢' };

const PUBG_LOGO = 'https://seeklogo.com/images/P/pubg-logo-4FC7D5F8C1-seeklogo.com.png';
const PUBG_BANNER = 'https://cdn.akamai.steamstatic.com/steam/apps/578080/header.jpg';

// ────────────────── HELPERS VISUALES ──────────────────

/** Barra de progreso unicode */
function bar(value, max, size = 10) {
    const pct = Math.min(value / Math.max(max, 1), 1);
    const filled = Math.round(pct * size);
    return '█'.repeat(filled) + '░'.repeat(size - filled);
}

/** Formatear minutos → "2h 15m" */
function fmtMin(mins) {
    mins = Math.round(mins);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Rango visual según K/D
 * Devuelve { emoji, label, color }
 */
function kdRank(kd) {
    kd = parseFloat(kd) || 0;
    if (kd >= 6) return { emoji: '💎', label: 'Legendario', color: 0xB9F2FF };
    if (kd >= 4) return { emoji: '🔥', label: 'Élite', color: 0xFF6B35 };
    if (kd >= 3) return { emoji: '🟡', label: 'Experto', color: 0xFFD700 };
    if (kd >= 2) return { emoji: '🟢', label: 'Avanzado', color: 0x69F0AE };
    if (kd >= 1.2) return { emoji: '🔵', label: 'Intermedio', color: 0x42A5F5 };
    if (kd >= 0.8) return { emoji: '⚪', label: 'Promedio', color: 0xBDBDBD };
    return { emoji: '🔴', label: 'Novato', color: 0xEF5350 };
}

/** Emoji de puesto de equipo */
function rankEmoji(rank) {
    if (rank === 1) return '🏆';
    if (rank <= 3) return '🥉';
    if (rank <= 10) return '🔟';
    return '💀';
}

/** Tipo de muerte en español */
const DEATH_ES = {
    byplayer: '☠️ Eliminado por un jugador',
    alive: '✅ Sobrevivió hasta el final',
    byzone: '🔵 Eliminado por la zona',
    suicide: '💥 Suicidio',
    logout: '🚪 Desconectado',
};

// ─────────────────────────────────────────────────────
module.exports = {
    data: new SlashCommandBuilder()
        .setName('pubg')
        .setDescription('🔫 Ver estadísticas de un jugador de PUBG')
        .addStringOption(o => o.setName('nombre').setDescription('Nombre del jugador en PUBG').setRequired(true))
        .addStringOption(o => o.setName('plataforma').setDescription('Plataforma del jugador').setRequired(false)
            .addChoices(
                { name: '🖥️ Steam (PC)', value: 'steam' },
                { name: '🎮 PlayStation', value: 'psn' },
                { name: '🟢 Xbox', value: 'xbox' },
            ))
        .addStringOption(o => o.setName('modo').setDescription('Modo de juego inicial').setRequired(false)
            .addChoices(
                { name: '🏅 Escuadra Clasif. FPP', value: 'squad-fpp-ranked' },
                { name: '🏅 Escuadra Clasif. TPP', value: 'squad-ranked' },
                { name: '🛡️ Escuadra FPP', value: 'squad-fpp' },
                { name: '🛡️ Escuadra TPP', value: 'squad' },
                { name: '👥 Dúo FPP', value: 'duo-fpp' },
                { name: '👥 Dúo TPP', value: 'duo' },
                { name: '🎯 Solo FPP', value: 'solo-fpp' },
                { name: '🎯 Solo TPP', value: 'solo' },
            )),

    async execute(interaction) {
        const playerName = interaction.options.getString('nombre');
        const platform = interaction.options.getString('plataforma') || 'steam';
        const mode = interaction.options.getString('modo') || 'squad-fpp';

        await interaction.deferReply();

        try {
            const { player, stats } = await pubgApi.getPlayerStats(playerName, platform);

            // Auto-selección de modo con datos
            let activeMode = mode;
            if (!stats[mode] || stats[mode].roundsPlayed === 0) {
                const best = Object.entries(stats)
                    .filter(([, s]) => s.roundsPlayed > 0)
                    .sort((a, b) => b[1].roundsPlayed - a[1].roundsPlayed);
                if (best.length === 0) {
                    return interaction.editReply({ embeds: [embedNoData(player)] });
                }
                activeMode = best[0][0];
            }

            const session = {
                player, stats, platform, activeMode, currentView: 'stats',
                seasonStats: null, seasonId: null, matchPreviews: null
            };

            const response = await interaction.editReply({
                embeds: [buildStatsEmbed(session)],
                components: buildComponents(session),
            });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300_000,
            });

            collector.on('collect', async i => {
                try {
                    if (i.customId === 'pubg_stats') {
                        session.currentView = 'stats';
                        await i.update({ embeds: [buildStatsEmbed(session)], components: buildComponents(session) });

                    } else if (i.customId === 'pubg_season') {
                        await i.deferUpdate();
                        session.currentView = 'season';
                        if (!session.allSeasons) {
                            try {
                                const seasons = await pubgApi.getSeasons(platform);
                                session.allSeasons = seasons.filter(s => !s.id.includes('beta'));
                                const current = session.allSeasons.find(s => s.isCurrentSeason)
                                    ?? session.allSeasons.at(-1);
                                if (current) {
                                    session.seasonId = current.id;
                                    session.seasonStats = await pubgApi.getSeasonStats(player.id, current.id, platform);
                                }
                            } catch { session.seasonStats = {}; }
                        }
                        await i.editReply({ embeds: [buildSeasonEmbed(session)], components: buildComponents(session) });

                    } else if (i.customId === 'pubg_season_select') {
                        await i.deferUpdate();
                        session.seasonId = i.values[0];
                        try { session.seasonStats = await pubgApi.getSeasonStats(player.id, session.seasonId, platform); }
                        catch { session.seasonStats = {}; }
                        await i.editReply({ embeds: [buildSeasonEmbed(session)], components: buildComponents(session) });

                    } else if (i.customId === 'pubg_compare') {
                        session.currentView = 'compare';
                        await i.update({ embeds: [buildCompareEmbed(session)], components: buildComponents(session) });

                    } else if (i.customId === 'pubg_matches') {
                        session.currentView = 'matches';
                        if (player.recentMatches.length === 0) {
                            await i.update({
                                embeds: [embedWarn(
                                    `${player.name}  ·  Partidas Recientes`,
                                    '> ⚠️ No hay partidas recientes disponibles (los datos se retienen 14 días).',
                                    'PUBG Partidas',
                                )],
                                components: buildComponents(session),
                            });
                            return;
                        }
                        await i.deferUpdate();
                        if (!session.matchPreviews) {
                            const previews = [];
                            for (const mId of player.recentMatches.slice(0, 10)) {
                                try { previews.push(await pubgApi.getMatch(mId, platform, player.id)); }
                                catch { /* skip */ }
                            }
                            session.matchPreviews = previews;
                        }
                        if (!session.matchPreviews.length) {
                            await i.editReply({
                                embeds: [embedWarn('Partidas', '> ⚠️ No se pudieron cargar las partidas.', 'PUBG Partidas')],
                                components: buildComponents(session),
                            });
                            return;
                        }
                        const selectOpts = session.matchPreviews.map((m, idx) => {
                            const ps = m.playerStats;
                            const d = m.createdAt ? new Date(m.createdAt) : null;
                            const ds = d ? `${d.getDate()}/${d.getMonth() + 1}` : '??';
                            return {
                                label: `${rankEmoji(ps?.teamRank)} #${ps?.teamRank ?? '?'} · ${m.mapName} · ${ps?.kills ?? 0}K / ${ps?.damageDealt ?? 0}dmg`,
                                description: `${ds} · ${MODE_SHORT[m.gameMode] ?? m.gameMode} · ${m.duration}min`,
                                value: `match_${idx}`,
                                emoji: rankEmoji(ps?.teamRank),
                            };
                        });
                        const comps = buildComponents(session);
                        comps.unshift(new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('pubg_match_select')
                                .setPlaceholder('🎮 Elegí una partida para ver detalles...')
                                .addOptions(selectOpts),
                        ));
                        await i.editReply({ embeds: [buildMatchListEmbed(session)], components: comps });

                    } else if (i.customId === 'pubg_match_select') {
                        const idx = parseInt(i.values[0].replace('match_', ''));
                        const match = session.matchPreviews?.[idx];
                        if (!match) { await i.update({ content: '❌ No se pudo cargar la partida.' }); return; }
                        session.currentView = 'match_detail';
                        await i.update({ embeds: [buildMatchDetailEmbed(session, match)], components: buildComponents(session) });

                    } else if (i.customId === 'pubg_mode_select') {
                        session.activeMode = i.values[0];
                        const embed = session.currentView === 'season'
                            ? buildSeasonEmbed(session) : (session.currentView = 'stats', buildStatsEmbed(session));
                        await i.update({ embeds: [embed], components: buildComponents(session) });
                    }
                } catch (err) {
                    console.error('[PUBG] Error interacción:', err.message);
                    try {
                        const msg = `> ❌ Error: ${err.message}`;
                        if (i.deferred || i.replied) await i.editReply({ content: msg });
                        else await i.update({ content: msg });
                    } catch { /* expirado */ }
                }
            });

            collector.on('end', () => interaction.editReply({ components: [] }).catch(() => { }));

        } catch (error) {
            const msgs = {
                PLAYER_NOT_FOUND: `> ❌ No se encontró a **${playerName}** en **${PLATFORM_LABELS[platform] || platform}**.\n> El nombre distingue mayúsculas de minúsculas.`,
                API_KEY_INVALID: '> ❌ Error de autenticación con la API de PUBG. Contactá a un administrador.',
                RATE_LIMITED: '> ⏳ Límite de solicitudes alcanzado. Esperá **1 minuto** e intentá de nuevo.',
            };
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR)
                    .setAuthor({ name: 'PUBG Stats  ·  Error', iconURL: PUBG_LOGO })
                    .setDescription(msgs[error.message] ?? `> ❌ \`${error.message}\``)
                    .setFooter({ text: 'Prophet Bot  ·  PUBG Stats' })
                    .setTimestamp()
                ],
            });
        }
    },
};

// ═══════════════════════════════════════════════════
//  EMBEDS UTILITARIOS
// ═══════════════════════════════════════════════════

function embedNoData(player) {
    return new EmbedBuilder()
        .setColor(config.COLORES.WARN)
        .setAuthor({ name: 'PUBG Stats', iconURL: PUBG_LOGO })
        .setDescription(`> ⚠️ **${player.name}** no tiene partidas registradas en ningún modo.`)
        .setFooter({ text: 'Prophet Bot  ·  PUBG Stats' });
}

function embedWarn(title, desc, footerSuffix) {
    return new EmbedBuilder()
        .setColor(config.COLORES.WARN)
        .setAuthor({ name: title, iconURL: PUBG_LOGO })
        .setDescription(desc)
        .setFooter({ text: `Prophet Bot  ·  ${footerSuffix}` })
        .setTimestamp();
}

// ═══════════════════════════════════════════════════
//  COMPONENTES
// ═══════════════════════════════════════════════════

function buildComponents(session) {
    const v = session.currentView;

    const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('pubg_stats')
            .setLabel('📊 General').setStyle(v === 'stats' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('pubg_season')
            .setLabel('📅 Temporada').setStyle(v === 'season' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('pubg_compare')
            .setLabel('🔄 Comparar').setStyle(v === 'compare' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('pubg_matches')
            .setLabel('🎮 Partidas').setStyle(v === 'matches' || v === 'match_detail' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    );

    const components = [navRow];

    // Select de modos (en stats y season)
    const modeSource = v === 'stats' ? session.stats : v === 'season' ? session.seasonStats : null;
    if (modeSource) {
        const avail = Object.entries(modeSource)
            .filter(([, s]) => s.roundsPlayed > 0)
            .sort((a, b) => b[1].roundsPlayed - a[1].roundsPlayed)
            .slice(0, 10);
        if (avail.length > 1) {
            const used = modeSource[session.activeMode] ? session.activeMode : avail[0][0];
            const sel = new StringSelectMenuBuilder()
                .setCustomId('pubg_mode_select')
                .setPlaceholder(`Modo: ${MODE_LABELS[used] || used}`)
                .addOptions(avail.map(([m, s]) => ({
                    label: `${MODE_LABELS[m] || m}  ·  ${s.roundsPlayed} partidas`,
                    value: m,
                    default: m === used,
                })));
            components.unshift(new ActionRowBuilder().addComponents(sel));
        }
    }

    // Select de temporadas
    if (v === 'season' && session.allSeasons?.length > 0) {
        const recent = [...session.allSeasons]
            .filter(s => !s.id.includes('pre') && !s.id.includes('beta'))
            .slice(0, 25);
        const seasonSel = new StringSelectMenuBuilder()
            .setCustomId('pubg_season_select')
            .setPlaceholder('📅 Cambiar temporada...')
            .addOptions(recent.map(s => ({
                label: `Temporada ${s.id.split('-').pop()}${s.isCurrentSeason ? ' ⭐ Actual' : ''}`,
                value: s.id,
                default: s.id === session.seasonId,
            })));
        components.splice(-1, 0, new ActionRowBuilder().addComponents(seasonSel));
    }

    return components;
}

// ═══════════════════════════════════════════════════
//  EMBED: STATS GENERALES (LIFETIME)
// ═══════════════════════════════════════════════════

function buildStatsEmbed(session) {
    const { player, platform, activeMode } = session;
    const s = session.stats[activeMode] ?? Object.values(session.stats)[0];
    const usedMode = session.stats[activeMode] ? activeMode : Object.keys(session.stats)[0];
    const rank = kdRank(s.kdRatio);
    const kd = parseFloat(s.kdRatio);
    const wr = parseFloat(s.winRate);
    const hs = parseFloat(s.headshotRate);
    const top10 = parseFloat(s.top10Rate);

    // Línea de modo resaltada
    const modeHeader =
        `${PLATFORM_EMOJI[platform] || '🎮'} **${PLATFORM_LABELS[platform] || platform}**  ·  ${MODE_LABELS[usedMode] || usedMode}`;

    // Panel de métricas principales con barras
    const metricsPanel = [
        `> ${rank.emoji} **K/D Ratio** — \`${bar(kd, 5)}\` **${s.kdRatio}** *(${rank.label})*`,
        `> 🏆 **Victorias%** — \`${bar(wr, 25)}\` **${s.winRate}%**`,
        `> 🎯 **HS%** — \`${bar(hs, 60)}\` **${s.headshotRate}%**`,
        `> 🔟 **Top 10%** — \`${bar(top10, 60)}\` **${s.top10Rate}%**`,
    ].join('\n');

    return new EmbedBuilder()
        .setColor(rank.color)
        .setAuthor({ name: `${player.name}  ·  Estadísticas Generales`, iconURL: PUBG_LOGO })
        .setThumbnail(PUBG_LOGO)
        .setDescription(
            `> ${modeHeader}\n` +
            `> 🎮 **${s.roundsPlayed.toLocaleString()}** partidas  ·  📅 **${s.daysActive}** días activo\n\n` +
            metricsPanel,
        )
        .addFields(
            {
                name: '```⚔️  COMBATE```',
                value: [
                    `╠ 🔪 **Eliminaciones:** \`${s.kills.toLocaleString()}\``,
                    `╠ 💀 **Muertes:** \`${(s.roundsPlayed - s.wins).toLocaleString()}\``,
                    `╠ 🤝 **Asistencias:** \`${s.assists.toLocaleString()}\``,
                    `╠ 🎯 **Cabezazos:** \`${s.headshotKills.toLocaleString()}\``,
                    `╠ 💥 **Daño total:** \`${s.damageDealt.toLocaleString()}\``,
                    `╚ 🏹 **Kill más lejano:** \`${s.longestKill}m\`  ·  🔥 **Racha máx.:** \`${s.maxKillStreaks}\``,
                ].join('\n'),
                inline: false,
            },
            {
                name: '```📈  PROMEDIOS POR PARTIDA```',
                value: [
                    `╠ 🔪 \`${s.avgKills}\` kills  ·  🤝 \`${s.avgAssists}\` asistencias  ·  💊 \`${s.avgHeals}\` curas`,
                    `╠ 💥 \`${s.avgDamage}\` daño  ·  ⏱️ \`${s.avgSurvivalTime}m\` supervivencia`,
                    `╚ 🏆 \`${s.wins}\` victorias  ·  🔟 \`${s.top10s}\` top 10  ·  🔄 \`${s.revives}\` revives`,
                ].join('\n'),
                inline: false,
            },
            {
                name: '```🏃  MOVIMIENTO & EXTRA```',
                value: [
                    `╠ 🚶 **A pie:** \`${s.walkDistance} km\`  ·  🚗 **Vehículo:** \`${s.rideDistance} km\`  ·  🏊 **Nadando:** \`${s.swimDistance} km\``,
                    `╠ ⏱️ **Tiempo total:** \`${fmtMin(s.timeSurvived)}\`  ·  🏅 **Mayor superv.:** \`${fmtMin(s.longestTimeSurvived)}\``,
                    `╚ 🚗 **Vehículos dest.:** \`${s.vehicleDestroys}\`  ·  🔫 **Armas recog.:** \`${s.weaponsAcquired}\`  ·  💀 **TK:** \`${s.teamKills}\``,
                ].join('\n'),
                inline: false,
            },
        )
        .setImage(PUBG_BANNER)
        .setFooter({ text: `Prophet Bot  ·  PUBG General  ·  ${MODE_LABELS[usedMode] || usedMode}`, iconURL: PUBG_LOGO })
        .setTimestamp();
}

// ═══════════════════════════════════════════════════
//  EMBED: TEMPORADA
// ═══════════════════════════════════════════════════

function buildSeasonEmbed(session) {
    const { player, platform, activeMode, seasonStats, seasonId } = session;

    if (!seasonStats || Object.keys(seasonStats).length === 0) {
        return embedWarn(
            `${player.name}  ·  Temporada Actual`,
            '> ⚠️ No hay datos de temporada disponibles para este jugador.',
            'PUBG Temporada',
        );
    }

    const s = seasonStats[activeMode] ?? Object.values(seasonStats)[0];
    const usedMode = seasonStats[activeMode] ? activeMode : Object.keys(seasonStats)[0];
    const rank = kdRank(s.kdRatio);
    const kd = parseFloat(s.kdRatio);
    const wr = parseFloat(s.winRate);
    const hs = parseFloat(s.headshotRate ?? 0);
    const t10 = parseFloat(s.top10Rate ?? 0);
    const seasonNum = seasonId?.split('-').pop() ?? '??';

    // Lista de modos con datos
    const modesAvail = Object.entries(seasonStats)
        .filter(([, v]) => v.roundsPlayed > 0)
        .map(([m, v]) => `${MODE_SHORT[m] || m} (${v.roundsPlayed})`)
        .join('  ·  ');

    return new EmbedBuilder()
        .setColor(rank.color)
        .setAuthor({ name: `${player.name}  ·  Temporada ${seasonNum}`, iconURL: PUBG_LOGO })
        .setThumbnail(PUBG_LOGO)
        .setDescription(
            `> ${PLATFORM_EMOJI[platform] || '🎮'} **${PLATFORM_LABELS[platform] || platform}**  ·  📅 **Temporada ${seasonNum}**\n` +
            `> ${MODE_LABELS[usedMode] || usedMode}  ·  **${s.roundsPlayed}** partidas\n` +
            `> Modos con datos: ${modesAvail}\n\n` +
            `> ${rank.emoji} **K/D** — \`${bar(kd, 5)}\` **${s.kdRatio}** *(${rank.label})*\n` +
            `> 🏆 **Victorias%** — \`${bar(wr, 25)}\` **${s.winRate}%**\n` +
            `> 🎯 **HS%** — \`${bar(hs, 60)}\` **${s.headshotRate}%**\n` +
            `> 🔟 **Top 10%** — \`${bar(t10, 60)}\` **${s.top10Rate}%**`,
        )
        .addFields(
            {
                name: '```⚔️  COMBATE```',
                value: [
                    `╠ 🔪 **Eliminaciones:** \`${s.kills}\`  ·  🤝 **Asistencias:** \`${s.assists}\``,
                    `╠ 🎯 **Cabezazos:** \`${s.headshotKills}\` (${s.headshotRate}%)`,
                    `╠ 💥 **Daño total:** \`${s.damageDealt.toLocaleString()}\`  ·  💥 **Daño/G:** \`${s.avgDamage}\``,
                    `╚ 🏹 **Kill más lejano:** \`${s.longestKill}m\``,
                ].join('\n'),
                inline: true,
            },
            {
                name: '```🏆  RESULTADOS```',
                value: [
                    `╠ 🥇 **Victorias:** \`${s.wins}\`  ·  🔟 **Top 10:** \`${s.top10s}\``,
                    `╠ 🔄 **Revives:** \`${s.revives}\`  ·  💊 **Curas:** \`${s.heals}\``,
                    `╚ ⚡ **Potenciadores:** \`${s.boosts}\`  ·  🤕 **Bajas aliadas:** \`${s.teamKills}\``,
                ].join('\n'),
                inline: true,
            },
        )
        .setFooter({ text: `Prophet Bot  ·  PUBG Temporada ${seasonNum}  ·  ${MODE_LABELS[usedMode] || usedMode}`, iconURL: PUBG_LOGO })
        .setTimestamp();
}

// ═══════════════════════════════════════════════════
//  EMBED: COMPARAR MODOS
// ═══════════════════════════════════════════════════

function buildCompareEmbed(session) {
    const { player, stats, platform } = session;

    const modes = Object.entries(stats)
        .filter(([, s]) => s.roundsPlayed > 0)
        .sort((a, b) => b[1].roundsPlayed - a[1].roundsPlayed)
        .slice(0, 6);

    if (modes.length === 0) {
        return embedWarn('Comparar Modos', '> ⚠️ No hay modos con datos para comparar.', 'PUBG Comparar');
    }

    const bestKD = modes.reduce((a, b) => parseFloat(b[1].kdRatio) > parseFloat(a[1].kdRatio) ? b : a);
    const bestWR = modes.reduce((a, b) => parseFloat(b[1].winRate) > parseFloat(a[1].winRate) ? b : a);
    const mostPlayed = modes[0];

    // Construir fields visuales por modo
    const fields = modes.map(([m, s]) => {
        const rank = kdRank(s.kdRatio);
        const wr = parseFloat(s.winRate);
        const hs = parseFloat(s.headshotRate);
        const isBestKD = m === bestKD[0];
        const isBestWR = m === bestWR[0];
        const badges = [isBestKD ? '🏆KD' : null, isBestWR ? '🥇WR' : null].filter(Boolean).join(' ');

        return {
            name: `${rank.emoji} ${MODE_LABELS[m] || m}${badges ? `  ·  ${badges}` : ''}`,
            value: [
                `\`${bar(parseFloat(s.kdRatio), 5, 8)}\` K/D: **${s.kdRatio}**  ·  **${s.roundsPlayed}** partidas`,
                `\`${bar(wr, 25, 8)}\` Win: **${s.winRate}%**  ·  **${s.wins}** victorias`,
                `\`${bar(hs, 60, 8)}\` HS: **${s.headshotRate}%**  ·  Daño/G: **${s.avgDamage}**`,
            ].join('\n'),
            inline: false,
        };
    });

    return new EmbedBuilder()
        .setColor(0x9C27B0)
        .setAuthor({ name: `${player.name}  ·  Comparación de Modos`, iconURL: PUBG_LOGO })
        .setThumbnail(PUBG_LOGO)
        .setDescription(
            `> ${PLATFORM_LABELS[platform] || platform}  ·  **${modes.length}** modos con partidas\n\n` +
            `> 🏆 **Mejor K/D:** ${MODE_LABELS[bestKD[0]] || bestKD[0]} — \`${bestKD[1].kdRatio}\`\n` +
            `> 🥇 **Mejor Win%:** ${MODE_LABELS[bestWR[0]] || bestWR[0]} — \`${bestWR[1].winRate}%\`\n` +
            `> 🎮 **Más jugado:** ${MODE_LABELS[mostPlayed[0]] || mostPlayed[0]} — \`${mostPlayed[1].roundsPlayed}\` partidas`,
        )
        .addFields(...fields)
        .setFooter({ text: `Prophet Bot  ·  PUBG Comparar  ·  ${PLATFORM_LABELS[platform] || platform}`, iconURL: PUBG_LOGO })
        .setTimestamp();
}

// ═══════════════════════════════════════════════════
//  EMBED: LISTA DE PARTIDAS
// ═══════════════════════════════════════════════════

function buildMatchListEmbed(session) {
    const { player, matchPreviews } = session;

    // Calcular resumen rápido de la sesión
    const totalKills = matchPreviews.reduce((a, m) => a + (m.playerStats?.kills ?? 0), 0);
    const totalDamage = matchPreviews.reduce((a, m) => a + (m.playerStats?.damageDealt ?? 0), 0);
    const wins = matchPreviews.filter(m => m.playerStats?.teamRank === 1).length;
    const avgKills = (totalKills / matchPreviews.length).toFixed(1);

    const lines = matchPreviews.map((m) => {
        const ps = m.playerStats;
        const ts = m.createdAt ? Math.floor(new Date(m.createdAt).getTime() / 1000) : null;
        const dateStr = ts ? `<t:${ts}:R>` : '??';
        const emoji = rankEmoji(ps?.teamRank);
        const modeStr = MODE_SHORT[m.gameMode] ?? m.gameMode.toUpperCase();
        const dmgBar = bar(ps?.damageDealt ?? 0, 800, 6);

        return (
            `${emoji} **#${ps?.teamRank ?? '?'}** · \`${m.mapName}\` · **${modeStr}**\n` +
            `┣ 🔪 \`${ps?.kills ?? 0}\` kills · 💥 \`${dmgBar}\` ${ps?.damageDealt ?? 0} daño · ⏱️ ${m.duration}min\n` +
            `┗ ${dateStr}`
        );
    });

    return new EmbedBuilder()
        .setColor(0xF2A900)
        .setAuthor({ name: `${player.name}  ·  Últimas Partidas`, iconURL: PUBG_LOGO })
        .setDescription(
            `> 📋 **${matchPreviews.length}** partidas  ·  🏆 **${wins}** victorias  ·  🔪 **${avgKills}** kills/G  ·  💥 **${Math.round(totalDamage / matchPreviews.length)}** daño/G\n\n` +
            lines.join('\n\n') +
            '\n\n> *⬆️ Usá el menú de arriba para ver el detalle de una partida*',
        )
        .setFooter({ text: 'Prophet Bot  ·  PUBG Partidas  ·  Últimos 14 días', iconURL: PUBG_LOGO })
        .setTimestamp();
}

// ═══════════════════════════════════════════════════
//  EMBED: DETALLE DE PARTIDA
// ═══════════════════════════════════════════════════

function buildMatchDetailEmbed(session, matchData) {
    const { player, platform } = session;
    const ps = matchData.playerStats;

    if (!ps) {
        return new EmbedBuilder()
            .setColor(config.COLORES.ERROR)
            .setDescription('> ❌ No se encontraron datos del jugador en esta partida.');
    }

    const ts = matchData.createdAt ? Math.floor(new Date(matchData.createdAt).getTime() / 1000) : null;
    const dateStr = ts ? `<t:${ts}:f>` : '??';
    const rank = ps.teamRank;

    let placeText;
    if (rank === 1) placeText = '🏆  **¡CHICKEN DINNER — GANASTE!**';
    else if (rank <= 3) placeText = `🥉  **Top 3 — Puesto #${rank}**`;
    else if (rank <= 10) placeText = `🔟  **Top 10 — Puesto #${rank}**`;
    else placeText = `💀  **Puesto #${rank}**`;

    const embedColor = rank === 1 ? 0xFFD700 : rank <= 3 ? 0x69F0AE : rank <= 10 ? 0x42A5F5 : 0xEF5350;

    const replayLink = `https://pubg.sh/${encodeURIComponent(player.name)}/${platform}/${matchData.matchId}`;
    const killPctBar = bar(ps.kills, 15);
    const dmgPctBar = bar(ps.damageDealt, 1000);

    // Top compañeros de equipo (si hay roster info)
    const teammates = matchData.participants
        ?.filter(p => p.playerId !== player.id && matchData.rosters?.some(r =>
            r.participantIds.includes(ps.id) && r.participantIds.includes(p.id)
        ))
        ?.sort((a, b) => b.kills - a.kills)
        ?.slice(0, 3) ?? [];

    const teammateStr = teammates.length > 0
        ? teammates.map(t => `\`${t.name}\` — ${t.kills}K / ${t.damageDealt}dmg`).join('  ·  ')
        : null;

    return new EmbedBuilder()
        .setColor(embedColor)
        .setAuthor({ name: `${player.name}  ·  Detalle de Partida`, iconURL: PUBG_LOGO })
        .setDescription(
            `> 🗺️ **${matchData.mapName}**  ·  ${MODE_LABELS[matchData.gameMode] || matchData.gameMode}\n` +
            `> 📅 ${dateStr}  ·  ⏱️ **${matchData.duration} min**  ·  👥 **${matchData.totalPlayers}** jugadores\n\n` +
            `> ${placeText}\n` +
            `> ${DEATH_ES[ps.deathType] || ps.deathType}\n\n` +
            `> 🔪 **Kills** \`${killPctBar}\` **${ps.kills}**${ps.killPlace ? ` *(#${ps.killPlace} en kills)*` : ''}\n` +
            `> 💥 **Daño**  \`${dmgPctBar}\` **${ps.damageDealt.toLocaleString()}**\n\n` +
            `> 🗺️ **[Ver Replay 2D](${replayLink})**`,
        )
        .addFields(
            {
                name: '```⚔️  COMBATE```',
                value: [
                    `╠ 🔪 **Kills:** \`${ps.kills}\`  ·  🤝 **Asistencias:** \`${ps.assists}\``,
                    `╠ 🎯 **Cabezazos:** \`${ps.headshotKills}\`  ·  🔻 **Knockdowns:** \`${ps.DBNOs}\``,
                    `╠ 💥 **Daño:** \`${ps.damageDealt.toLocaleString()}\``,
                    `╚ 🏹 **Kill más lejano:** \`${ps.longestKill}m\``,
                ].join('\n'),
                inline: true,
            },
            {
                name: '```🏃  SUPERVIVENCIA```',
                value: [
                    `╠ ⏱️ **Sobrevivió:** \`${ps.timeSurvived} min\``,
                    `╠ 🚶 **A pie:** \`${ps.walkDistance} km\`  ·  🚗 **Vehículo:** \`${ps.rideDistance} km\``,
                    `╠ 💊 **Curas:** \`${ps.heals}\`  ·  ⚡ **Boosts:** \`${ps.boosts}\``,
                    `╚ 🔄 **Revives:** \`${ps.revives}\``,
                ].join('\n'),
                inline: true,
            },
            ...(teammateStr ? [{
                name: '```👥  COMPAÑEROS DE EQUIPO```',
                value: teammateStr,
                inline: false,
            }] : []),
        )
        .setFooter({ text: `Prophet Bot  ·  PUBG Partida  ·  ${matchData.mapName}`, iconURL: PUBG_LOGO })
        .setTimestamp();
}
