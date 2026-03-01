// ═══ COMANDO: /pubg — Con menú interactivo completo ═══
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const config = require('../../config');
const pubgApi = require('../../modules/pubgApi');

const MODE_LABELS = {
    'solo': '🎯 Solo TPP', 'solo-fpp': '🎯 Solo FPP',
    'duo': '👥 Duo TPP', 'duo-fpp': '👥 Duo FPP',
    'squad': '🛡️ Squad TPP', 'squad-fpp': '🛡️ Squad FPP',
};
const MODE_SHORT = {
    'solo': 'Solo', 'solo-fpp': 'Solo FPP',
    'duo': 'Duo', 'duo-fpp': 'Duo FPP',
    'squad': 'Squad', 'squad-fpp': 'Squad FPP',
};
const PLATFORM_LABELS = {
    'steam': '🖥️ Steam', 'psn': '🎮 PlayStation', 'xbox': '🟢 Xbox',
};
const PUBG_LOGO = 'https://seeklogo.com/images/P/pubg-logo-4FC7D5F8C1-seeklogo.com.png';
const PUBG_BANNER = 'https://cdn.akamai.steamstatic.com/steam/apps/578080/header.jpg';

// ═══ Barra de progreso unicode ═══
function progressBar(value, max, size = 10) {
    const filled = Math.round((value / Math.max(max, 1)) * size);
    const empty = size - filled;
    return '█'.repeat(Math.min(filled, size)) + '░'.repeat(Math.max(empty, 0));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pubg')
        .setDescription('🔫 Ver estadísticas de un jugador de PUBG')
        .addStringOption(opt =>
            opt.setName('nombre')
                .setDescription('Nombre del jugador en PUBG')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('plataforma')
                .setDescription('Plataforma del jugador')
                .setRequired(false)
                .addChoices(
                    { name: '🖥️ Steam (PC)', value: 'steam' },
                    { name: '🎮 PlayStation', value: 'psn' },
                    { name: '🟢 Xbox', value: 'xbox' },
                ))
        .addStringOption(opt =>
            opt.setName('modo')
                .setDescription('Modo de juego a consultar')
                .setRequired(false)
                .addChoices(
                    { name: '🛡️ Squad FPP', value: 'squad-fpp' },
                    { name: '🛡️ Squad TPP', value: 'squad' },
                    { name: '👥 Duo FPP', value: 'duo-fpp' },
                    { name: '👥 Duo TPP', value: 'duo' },
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

            let activeMode = mode;
            let modeStats = stats[mode];

            if (!modeStats || modeStats.roundsPlayed === 0) {
                const availableModes = Object.entries(stats)
                    .filter(([, s]) => s.roundsPlayed > 0)
                    .sort((a, b) => b[1].roundsPlayed - a[1].roundsPlayed);

                if (availableModes.length === 0) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor(config.COLORES.WARN)
                            .setAuthor({ name: 'PUBG Stats', iconURL: PUBG_LOGO })
                            .setDescription(`> ⚠️ **${player.name}** no tiene partidas en ningún modo.`)
                            .setFooter({ text: 'Prophet Bot  ·  PUBG Stats' })
                        ]
                    });
                }
                [activeMode, modeStats] = availableModes[0];
            }

            // ═══ Estado de la sesión ═══
            const session = {
                player, stats, platform, activeMode,
                currentView: 'stats',   // stats | season | compare | matches | match_detail
                seasonStats: null,
                seasonId: null,
                matchPreviews: null,
            };

            const response = await interaction.editReply({
                embeds: [buildStatsEmbed(session)],
                components: buildComponents(session),
            });

            // ═══ Collector de interacciones (5 min) ═══
            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300000,
            });

            collector.on('collect', async i => {
                try {
                    // ── Stats Lifetime ──
                    if (i.customId === 'pubg_stats') {
                        session.currentView = 'stats';
                        await i.update({
                            embeds: [buildStatsEmbed(session)],
                            components: buildComponents(session),
                        });
                    }

                    // ── Temporada Actual ──
                    else if (i.customId === 'pubg_season') {
                        await i.deferUpdate();
                        session.currentView = 'season';

                        if (!session.allSeasons) {
                            try {
                                const seasons = await pubgApi.getSeasons(platform);
                                session.allSeasons = seasons.filter(s => !s.id.includes('beta')); // Ocultar betas viejas
                                const current = session.allSeasons.find(s => s.isCurrentSeason) || session.allSeasons[session.allSeasons.length - 1];
                                if (current) {
                                    session.seasonId = current.id;
                                    session.seasonStats = await pubgApi.getSeasonStats(player.id, current.id, platform);
                                }
                            } catch { session.seasonStats = {}; }
                        }

                        await i.editReply({
                            embeds: [buildSeasonEmbed(session)],
                            components: buildComponents(session),
                        });
                    }

                    // ── Cambiar Temporada Seleccionada ──
                    else if (i.customId === 'pubg_season_select') {
                        await i.deferUpdate();
                        session.seasonId = i.values[0];
                        try {
                            session.seasonStats = await pubgApi.getSeasonStats(player.id, session.seasonId, platform);
                        } catch {
                            session.seasonStats = {};
                        }

                        await i.editReply({
                            embeds: [buildSeasonEmbed(session)],
                            components: buildComponents(session),
                        });
                    }

                    // ── Comparar Modos ──
                    else if (i.customId === 'pubg_compare') {
                        session.currentView = 'compare';
                        await i.update({
                            embeds: [buildCompareEmbed(session)],
                            components: buildComponents(session),
                        });
                    }

                    // ── Últimas Partidas ──
                    else if (i.customId === 'pubg_matches') {
                        session.currentView = 'matches';

                        if (player.recentMatches.length === 0) {
                            await i.update({
                                embeds: [new EmbedBuilder()
                                    .setColor(config.COLORES.WARN)
                                    .setAuthor({ name: `${player.name}  ·  Partidas`, iconURL: PUBG_LOGO })
                                    .setDescription('> ⚠️ No hay partidas recientes (datos se retienen 14 días).')
                                    .setFooter({ text: 'Prophet Bot  ·  PUBG Stats' })
                                    .setTimestamp()
                                ],
                                components: buildComponents(session),
                            });
                            return;
                        }

                        await i.deferUpdate();

                        if (!session.matchPreviews) {
                            const previews = [];
                            for (const matchId of player.recentMatches.slice(0, 10)) {
                                try {
                                    previews.push(await pubgApi.getMatch(matchId, platform, player.id));
                                } catch { /* skip */ }
                            }
                            session.matchPreviews = previews;
                        }

                        if (!session.matchPreviews.length) {
                            await i.editReply({
                                embeds: [new EmbedBuilder().setColor(config.COLORES.WARN)
                                    .setDescription('> ⚠️ No se pudieron cargar las partidas.')
                                    .setFooter({ text: 'Prophet Bot  ·  PUBG Stats' })
                                ],
                                components: buildComponents(session),
                            });
                            return;
                        }

                        const selectOptions = session.matchPreviews.map((m, idx) => {
                            const ps = m.playerStats;
                            const date = m.createdAt ? new Date(m.createdAt) : null;
                            const dateStr = date ? `${date.getDate()}/${date.getMonth() + 1}` : '??';
                            const placeEmoji = ps?.teamRank === 1 ? '🏆' : ps?.teamRank <= 10 ? '🔟' : '💀';
                            return {
                                label: `#${ps?.teamRank || '?'} · ${m.mapName} · ${ps?.kills || 0} kills`,
                                description: `${dateStr} · ${m.gameMode} · ${m.duration}min · ${ps?.damageDealt || 0} daño`,
                                value: `match_${idx}`,
                                emoji: placeEmoji,
                            };
                        });

                        const components = buildComponents(session);
                        components.unshift(new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('pubg_match_select')
                                .setPlaceholder('🎮 Seleccioná una partida...')
                                .addOptions(selectOptions)
                        ));

                        await i.editReply({
                            embeds: [buildMatchListEmbed(session)],
                            components,
                        });
                    }

                    // ── Seleccionar Partida ──
                    else if (i.customId === 'pubg_match_select') {
                        const idx = parseInt(i.values[0].replace('match_', ''));
                        const match = session.matchPreviews?.[idx];
                        if (!match) { await i.update({ content: '❌ Error.' }); return; }

                        session.currentView = 'match_detail';
                        await i.update({
                            embeds: [buildMatchDetailEmbed(session, match)],
                            components: buildComponents(session),
                        });
                    }

                    // ── Cambiar Modo ──
                    else if (i.customId === 'pubg_mode_select') {
                        const newMode = i.values[0];
                        if (session.stats[newMode]?.roundsPlayed > 0) session.activeMode = newMode;
                        session.currentView = 'stats';
                        await i.update({
                            embeds: [buildStatsEmbed(session)],
                            components: buildComponents(session),
                        });
                    }
                } catch (err) {
                    console.error('Error en PUBG interacción:', err.message);
                    try {
                        const msg = `> ❌ Error: ${err.message}`;
                        if (i.deferred || i.replied) await i.editReply({ content: msg });
                        else await i.update({ content: msg });
                    } catch { /* expired */ }
                }
            });

            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => { });
            });

        } catch (error) {
            const msgs = {
                'PLAYER_NOT_FOUND': `> ❌ No se encontró **${playerName}** en **${PLATFORM_LABELS[platform] || platform}**.\n> El nombre es case-sensitive.`,
                'API_KEY_INVALID': '> ❌ Error de autenticación con PUBG API.',
                'RATE_LIMITED': '> ⏳ Rate limit. Esperá **1 minuto**.',
            };
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR)
                    .setAuthor({ name: 'PUBG Stats  ·  Error', iconURL: PUBG_LOGO })
                    .setDescription(msgs[error.message] || `> ❌ \`${error.message}\``)
                    .setFooter({ text: 'Prophet Bot  ·  PUBG Stats' })
                    .setTimestamp()
                ]
            });
        }
    }
};

// ═══════════════════════════════════════════════════
//  COMPONENTES (Botones)
// ═══════════════════════════════════════════════════

function buildComponents(session) {
    const v = session.currentView;
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('pubg_stats').setLabel('📊 Lifetime')
            .setStyle(v === 'stats' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('pubg_season').setLabel('📅 Temporada')
            .setStyle(v === 'season' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('pubg_compare').setLabel('🔄 Comparar')
            .setStyle(v === 'compare' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('pubg_matches').setLabel('🎮 Partidas')
            .setStyle(v === 'matches' || v === 'match_detail' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    );

    // Select de modos solo en vista stats
    if (v === 'stats') {
        const availableModes = Object.entries(session.stats)
            .filter(([, s]) => s.roundsPlayed > 0)
            .sort((a, b) => b[1].roundsPlayed - a[1].roundsPlayed)
            .slice(0, 6);

        if (availableModes.length > 1) {
            const modeSelect = new StringSelectMenuBuilder()
                .setCustomId('pubg_mode_select')
                .setPlaceholder(`Modo: ${MODE_LABELS[session.activeMode] || session.activeMode}`)
                .addOptions(availableModes.map(([m, s]) => ({
                    label: `${MODE_LABELS[m] || m}  ·  ${s.roundsPlayed} partidas`,
                    value: m, default: m === session.activeMode,
                })));
            return [new ActionRowBuilder().addComponents(modeSelect), row];
        }
    }

    // Select de temporadas solo en vista season
    if (v === 'season' && session.allSeasons && session.allSeasons.length > 0) {
        // Filtrar 'pre' y betas. Invertir para que lo más nuevo quede arriba (como 'pc-2018-40')
        // Discord permite máximo 25 opciones por select menu. Mostramos las 25 más recientes.
        const recentSeasons = [...session.allSeasons]
            .filter(s => !s.id.includes('pre') && !s.id.includes('beta'))
            .reverse()
            .slice(0, 25);

        const seasonSelect = new StringSelectMenuBuilder()
            .setCustomId('pubg_season_select')
            .setPlaceholder('📅 Seleccionar otra temporada...')
            .addOptions(recentSeasons.map(s => {
                const isCurrent = s.isCurrentSeason;
                const number = s.id.split('-').pop(); // Da '40', '39', etc
                return {
                    label: `Temporada ${number} ${isCurrent ? '(Actual)' : ''}`,
                    value: s.id,
                    default: s.id === session.seasonId,
                };
            }));

        return [new ActionRowBuilder().addComponents(seasonSelect), row];
    }

    return [row];
}

// ═══════════════════════════════════════════════════
//  EMBEDS
// ═══════════════════════════════════════════════════

function buildStatsEmbed(session) {
    const { player, platform, activeMode } = session;
    const s = session.stats[activeMode];
    const modeLabel = MODE_LABELS[activeMode] || activeMode;
    const platLabel = PLATFORM_LABELS[platform] || platform;

    const kd = parseFloat(s.kdRatio);
    const wr = parseFloat(s.winRate);
    const hs = parseFloat(s.headshotRate);

    return new EmbedBuilder()
        .setColor(0xF2A900)
        .setAuthor({ name: player.name, iconURL: PUBG_LOGO })
        .setThumbnail(PUBG_LOGO)
        .setDescription(
            `╔══════════════════════════════╗\n` +
            `║  ${platLabel}  ·  ${modeLabel}\n` +
            `╚══════════════════════════════╝\n\n` +
            `> 🎮 **${s.roundsPlayed.toLocaleString()}** partidas  ·  📅 **${s.daysActive}** días\n\n` +
            `> **K/D:** \`${progressBar(kd, 4)}\` **${s.kdRatio}**\n` +
            `> **Win%:** \`${progressBar(wr, 20)}\` **${s.winRate}%**\n` +
            `> **HS%:** \`${progressBar(hs, 60)}\` **${s.headshotRate}%**\n` +
            `> **Top10:** \`${progressBar(parseFloat(s.top10Rate), 50)}\` **${s.top10Rate}%**`
        )
        .addFields(
            {
                name: '```⚔️  C O M B A T E```',
                value: [
                    `╠ 🔪 **Kills:** \`${s.kills.toLocaleString()}\``,
                    `╠ 🎯 **Headshots:** \`${s.headshotKills.toLocaleString()}\``,
                    `╠ 💥 **Daño total:** \`${s.damageDealt.toLocaleString()}\``,
                    `╠ 🏹 **Kill lejano:** \`${s.longestKill}m\``,
                    `╚ 🔥 **Racha máx:** \`${s.maxKillStreaks}\``,
                ].join('\n'),
                inline: true,
            },
            {
                name: '```📈  P R O M E D I O S```',
                value: [
                    `╠ 🔪 **Kills/Partida:** \`${s.avgKills}\``,
                    `╠ 🤝 **Assists/Partida:** \`${s.avgAssists}\``,
                    `╠ 💥 **Daño/Partida:** \`${s.avgDamage}\``,
                    `╠ ⏱️ **Supervivencia:** \`${s.avgSurvivalTime} min\``,
                    `╚ 💊 **Heals/Partida:** \`${s.avgHeals}\``,
                ].join('\n'),
                inline: true,
            },
            {
                name: '\u200b',
                value: '> ─────────── **📊 Detalles** ───────────',
                inline: false,
            },
            {
                name: '```🏆  V I C T O R I A S```',
                value: [
                    `╠ 🥇 **Wins:** \`${s.wins}\`  ·  🔟 **Top 10:** \`${s.top10s}\``,
                    `╠ 🤝 **Assists:** \`${s.assists}\`  ·  🔄 **Revives:** \`${s.revives}\``,
                    `╚ 💀 **Suicidios:** \`${s.suicides}\`  ·  🤕 **TK:** \`${s.teamKills}\``,
                ].join('\n'),
                inline: false,
            },
            {
                name: '```🏃  M O V I M I E N T O```',
                value: [
                    `╠ 🚶 **A pie:** \`${s.walkDistance} km\`  ·  🚗 **Vehículo:** \`${s.rideDistance} km\`  ·  🏊 **Nadar:** \`${s.swimDistance} km\``,
                    `╚ ⏱️ **Tiempo total:** \`${s.timeSurvived} min\`  ·  💊 \`${s.heals}\` heals  ·  ⚡ \`${s.boosts}\` boosts`,
                ].join('\n'),
                inline: false,
            },
        )
        .setImage(PUBG_BANNER)
        .setFooter({ text: `Prophet Bot  ·  PUBG Lifetime  ·  ${modeLabel}`, iconURL: PUBG_LOGO })
        .setTimestamp();
}

function buildSeasonEmbed(session) {
    const { player, platform, activeMode, seasonStats, seasonId } = session;

    if (!seasonStats || Object.keys(seasonStats).length === 0) {
        return new EmbedBuilder()
            .setColor(config.COLORES.WARN)
            .setAuthor({ name: `${player.name}  ·  Temporada Actual`, iconURL: PUBG_LOGO })
            .setDescription('> ⚠️ No hay datos de la temporada actual para este jugador.')
            .setFooter({ text: 'Prophet Bot  ·  PUBG Season' })
            .setTimestamp();
    }

    // Usar el modo activo o el primero disponible
    const s = seasonStats[activeMode] || Object.values(seasonStats)[0];
    const usedMode = seasonStats[activeMode] ? activeMode : Object.keys(seasonStats)[0];
    const modeLabel = MODE_LABELS[usedMode] || usedMode;

    const kd = parseFloat(s.kdRatio);
    const wr = parseFloat(s.winRate);

    // Listar modos con datos en temporada
    const modesAvail = Object.entries(seasonStats)
        .filter(([, v]) => v.roundsPlayed > 0)
        .map(([m, v]) => `\`${MODE_SHORT[m] || m}\` (${v.roundsPlayed})`)
        .join(' · ');

    return new EmbedBuilder()
        .setColor(0x00BCD4)
        .setAuthor({ name: `${player.name}  ·  Temporada Actual`, iconURL: PUBG_LOGO })
        .setThumbnail(PUBG_LOGO)
        .setDescription(
            `╔══════════════════════════════╗\n` +
            `║  📅 Temporada: \`${seasonId?.split('-').pop() || '??'}\`\n` +
            `╚══════════════════════════════╝\n\n` +
            `> **Modo:** ${modeLabel}  ·  **${s.roundsPlayed}** partidas\n` +
            `> Modos disponibles: ${modesAvail}\n\n` +
            `> **K/D:** \`${progressBar(kd, 4)}\` **${s.kdRatio}**\n` +
            `> **Win%:** \`${progressBar(wr, 20)}\` **${s.winRate}%**`
        )
        .addFields(
            {
                name: '```⚔️  C O M B A T E```',
                value: [
                    `╠ 🔪 **Kills:** \`${s.kills}\`  ·  🤝 **Assists:** \`${s.assists}\``,
                    `╠ 🎯 **Headshots:** \`${s.headshotKills}\` (${s.headshotRate}%)`,
                    `╠ 💥 **Daño total:** \`${s.damageDealt.toLocaleString()}\``,
                    `╚ 🏹 **Kill lejano:** \`${s.longestKill}m\``,
                ].join('\n'),
                inline: true,
            },
            {
                name: '```📈  P R O M E D I O S```',
                value: [
                    `╠ 🔪 **Kills/Partida:** \`${s.avgKills}\``,
                    `╠ 💥 **Daño/Partida:** \`${s.avgDamage}\``,
                    `╠ ⏱️ **Supervivencia:** \`${s.avgSurvivalTime} min\``,
                    `╚ 🔟 **Top 10 Rate:** \`${s.top10Rate}%\``,
                ].join('\n'),
                inline: true,
            },
            {
                name: '```🏆  R E S U L T A D O S```',
                value: [
                    `╠ 🥇 **Wins:** \`${s.wins}\`  ·  🔟 **Top 10:** \`${s.top10s}\``,
                    `╚ 🔄 **Revives:** \`${s.revives}\`  ·  💊 **Heals:** \`${s.heals}\``,
                ].join('\n'),
                inline: false,
            },
        )
        .setFooter({ text: `Prophet Bot  ·  PUBG Season  ·  ${modeLabel}`, iconURL: PUBG_LOGO })
        .setTimestamp();
}

function buildCompareEmbed(session) {
    const { player, stats, platform } = session;

    const modes = Object.entries(stats)
        .filter(([, s]) => s.roundsPlayed > 0)
        .sort((a, b) => b[1].roundsPlayed - a[1].roundsPlayed)
        .slice(0, 6);

    if (modes.length === 0) {
        return new EmbedBuilder()
            .setColor(config.COLORES.WARN)
            .setDescription('> ⚠️ No hay modos con datos para comparar.')
            .setFooter({ text: 'Prophet Bot  ·  PUBG Stats' });
    }

    // Construir tabla comparativa
    const header = `\`${'Modo'.padEnd(12)}│${'Partdas'.padStart(7)}│${'K/D'.padStart(5)}│${'Win%'.padStart(6)}│${'HS%'.padStart(5)}│${'Dmg/G'.padStart(5)}\``;
    const separator = `\`${'─'.repeat(12)}┼${'─'.repeat(7)}┼${'─'.repeat(5)}┼${'─'.repeat(6)}┼${'─'.repeat(5)}┼${'─'.repeat(5)}\``;

    const rows = modes.map(([m, s]) => {
        const name = (MODE_SHORT[m] || m).padEnd(12);
        const rp = String(s.roundsPlayed).padStart(7);
        const kd = s.kdRatio.padStart(5);
        const wr = (s.winRate + '%').padStart(6);
        const hs = (s.headshotRate + '%').padStart(5);
        const dmg = String(s.avgDamage).padStart(5);
        return `\`${name}│${rp}│${kd}│${wr}│${hs}│${dmg}\``;
    });

    // Encontrar el "mejor" modo
    const bestKD = modes.reduce((a, b) => parseFloat(b[1].kdRatio) > parseFloat(a[1].kdRatio) ? b : a);
    const bestWR = modes.reduce((a, b) => parseFloat(b[1].winRate) > parseFloat(a[1].winRate) ? b : a);
    const mostPlayed = modes[0];

    return new EmbedBuilder()
        .setColor(0x9C27B0)
        .setAuthor({ name: `${player.name}  ·  Comparación de Modos`, iconURL: PUBG_LOGO })
        .setThumbnail(PUBG_LOGO)
        .setDescription(
            `╔══════════════════════════════════════╗\n` +
            `║  🔄 Comparación entre modos de juego\n` +
            `╚══════════════════════════════════════╝\n\n` +
            `${header}\n${separator}\n${rows.join('\n')}\n\n` +
            `> 🏆 **Mejor K/D:** ${MODE_SHORT[bestKD[0]] || bestKD[0]} (\`${bestKD[1].kdRatio}\`)\n` +
            `> 🥇 **Mejor Win%:** ${MODE_SHORT[bestWR[0]] || bestWR[0]} (\`${bestWR[1].winRate}%\`)\n` +
            `> 🎮 **Más jugado:** ${MODE_SHORT[mostPlayed[0]] || mostPlayed[0]} (\`${mostPlayed[1].roundsPlayed}\` partidas)`
        )
        .setFooter({ text: `Prophet Bot  ·  PUBG Compare  ·  ${PLATFORM_LABELS[platform] || platform}`, iconURL: PUBG_LOGO })
        .setTimestamp();
}

function buildMatchListEmbed(session) {
    const { player, matchPreviews } = session;
    const lines = matchPreviews.map((m) => {
        const ps = m.playerStats;
        const date = m.createdAt ? new Date(m.createdAt) : null;
        const dateStr = date ? `<t:${Math.floor(date.getTime() / 1000)}:R>` : '??';
        const placeEmoji = ps?.teamRank === 1 ? '🏆' : ps?.teamRank <= 3 ? '🥉' : ps?.teamRank <= 10 ? '🔟' : '💀';

        return `${placeEmoji} **#${ps?.teamRank || '?'}** · \`${m.mapName}\` · **${ps?.kills || 0}** kills · **${ps?.damageDealt || 0}** daño · ${m.duration}min · ${dateStr}`;
    });

    return new EmbedBuilder()
        .setColor(0xF2A900)
        .setAuthor({ name: `${player.name}  ·  Últimas Partidas`, iconURL: PUBG_LOGO })
        .setDescription(
            `📋 Últimas **${matchPreviews.length}** partidas:\n\n` +
            lines.join('\n\n') +
            '\n\n> *⬆️ Seleccioná una partida del menú para ver detalles*'
        )
        .setFooter({ text: 'Prophet Bot  ·  PUBG Partidas  ·  Últimos 14 días', iconURL: PUBG_LOGO })
        .setTimestamp();
}

function buildMatchDetailEmbed(session, matchData) {
    const { player, platform } = session;
    const ps = matchData.playerStats;

    if (!ps) {
        return new EmbedBuilder()
            .setColor(config.COLORES.ERROR)
            .setDescription('> ❌ No se encontraron datos del jugador en esta partida.');
    }

    const date = matchData.createdAt ? new Date(matchData.createdAt) : null;
    const dateStr = date ? `<t:${Math.floor(date.getTime() / 1000)}:f>` : '??';

    let placeText = `💀 Puesto #${ps.teamRank}`;
    if (ps.teamRank === 1) placeText = '🏆 ¡WINNER WINNER CHICKEN DINNER!';
    else if (ps.teamRank <= 3) placeText = `🥉 Top 3 (#${ps.teamRank})`;
    else if (ps.teamRank <= 10) placeText = `🔟 Top 10 (#${ps.teamRank})`;

    const deathLabels = {
        'byplayer': '☠️ Eliminado', 'alive': '✅ Sobrevivió',
        'byzone': '🔵 Zona azul', 'suicide': '💥 Suicidio', 'logout': '🚪 DC',
    };

    // K/D de la partida
    const matchKD = ps.kills > 0 ? ps.kills.toFixed(0) : '0';

    // Link de Replay 2D
    const replayLink = `https://pubg.sh/${encodeURIComponent(player.name)}/${platform}/${matchData.matchId}`;

    return new EmbedBuilder()
        .setColor(ps.teamRank === 1 ? 0xFFD700 : ps.teamRank <= 10 ? 0x69F0AE : 0xEF5350)
        .setAuthor({ name: `${player.name}  ·  Detalle de Partida`, iconURL: PUBG_LOGO })
        .setDescription(
            `╔══════════════════════════════╗\n` +
            `║  🗺️ **${matchData.mapName}**  ·  ${matchData.gameMode}\n` +
            `╚══════════════════════════════╝\n\n` +
            `> 📅 ${dateStr}\n` +
            `> ⏱️ **${matchData.duration} min**  ·  👥 **${matchData.totalPlayers}** jugadores\n\n` +
            `> **${placeText}**\n` +
            `> ${deathLabels[ps.deathType] || ps.deathType}\n\n` +
            `> **Kills:** \`${progressBar(ps.kills, 10)}\` **${ps.kills}**\n` +
            `> **Daño:** \`${progressBar(ps.damageDealt, 1000, 10)}\` **${ps.damageDealt}**\n\n` +
            `> 🗺️ **[Ver Replay 2D de la partida](${replayLink})**`
        )
        .addFields(
            {
                name: '```⚔️  C O M B A T E```',
                value: [
                    `╠ 🔪 **Kills:** \`${ps.kills}\`  ·  🤝 **Assists:** \`${ps.assists}\``,
                    `╠ 🎯 **Headshots:** \`${ps.headshotKills}\``,
                    `╠ 💥 **Daño:** \`${ps.damageDealt.toLocaleString()}\``,
                    `╠ 🏹 **Kill lejano:** \`${ps.longestKill}m\``,
                    `╚ 🔻 **Knockdowns:** \`${ps.DBNOs}\``,
                ].join('\n'),
                inline: true,
            },
            {
                name: '```🏃  P A R T I D A```',
                value: [
                    `╠ ⏱️ **Sobrevivió:** \`${ps.timeSurvived} min\``,
                    `╠ 🚶 **A pie:** \`${ps.walkDistance} km\``,
                    `╠ 🚗 **Vehículo:** \`${ps.rideDistance} km\``,
                    `╠ 💊 **Heals:** \`${ps.heals}\`  ·  ⚡ **Boosts:** \`${ps.boosts}\``,
                    `╚ 🔄 **Revives:** \`${ps.revives}\``,
                ].join('\n'),
                inline: true,
            },
        )
        .setFooter({ text: `Prophet Bot  ·  PUBG Match  ·  ${matchData.mapName}`, iconURL: PUBG_LOGO })
        .setTimestamp();
}
