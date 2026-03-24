// ═══════════════════════════════════════════════════
//  MÓDULO: riotIntegration.js
//  Integración con Riot Games (LoL, Valorant)
// ═══════════════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const { stmts, _db } = require('../database');

// API de Riot Games
const RIOT_REGIONS = {
    // League of Legends
    lol: {
        americas: ['br1', 'la1', 'la2', 'na1'],
        asia: ['jp1', 'kr', 'oc1'],
        europe: ['eun1', 'euw1', 'ru', 'tr1'],
        regional: {
            br1: 'americas', la1: 'americas', la2: 'americas', na1: 'americas',
            jp1: 'asia', kr: 'asia', oc1: 'asia',
            eun1: 'europe', euw1: 'europe', ru: 'europe', tr1: 'europe'
        }
    },
    // Valorant
    valorant: {
        americas: ['na', 'br', 'latam'],
        asia: ['ap'],
        europe: ['eu', 'kr'],
        regional: {
            na: 'americas', br: 'americas', latam: 'americas',
            ap: 'asia',
            eu: 'europe', kr: 'europe'
        }
    }
};

// Crear tabla para cuentas vinculadas
_db.exec(`
    CREATE TABLE IF NOT EXISTS riot_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        game TEXT NOT NULL,
        game_name TEXT NOT NULL,
        tag_line TEXT NOT NULL,
        puuid TEXT,
        region TEXT,
        linked_at INTEGER,
        last_updated INTEGER,
        UNIQUE(user_id, guild_id, game, game_name, tag_line)
    );

    CREATE INDEX IF NOT EXISTS idx_riot_user ON riot_accounts(user_id, guild_id);
`);

// ═══════════════════════════════════════════════════
//  FUNCIONES DE API
// ═══════════════════════════════════════════════════

/**
 * Obtiene el PUUID de un jugador
 */
async function getAccountByRiotId(gameName, tagLine, apiKey) {
    try {
        const res = await fetch(
            `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
            {
                headers: { 'X-Riot-Token': apiKey }
            }
        );

        if (!res.ok) {
            if (res.status === 404) return { error: 'Jugador no encontrado' };
            return { error: `Error de API: ${res.status}` };
        }

        return await res.json();
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Obtiene datos de LoL
 */
async function getLoLSummoner(puuid, region, apiKey) {
    try {
        // Obtener summoner por PUUID
        const res = await fetch(
            `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
            {
                headers: { 'X-Riot-Token': apiKey }
            }
        );

        if (!res.ok) return { error: `Error: ${res.status}` };

        const summoner = await res.json();

        // Obtener ranked info
        const rankedRes = await fetch(
            `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`,
            {
                headers: { 'X-Riot-Token': apiKey }
            }
        );

        const ranked = rankedRes.ok ? await rankedRes.json() : [];

        // Obtener maestría de campeones
        const masteryRes = await fetch(
            `https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=5`,
            {
                headers: { 'X-Riot-Token': apiKey }
            }
        );

        const mastery = masteryRes.ok ? await masteryRes.json() : [];

        return { summoner, ranked, mastery };
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Obtiene datos de Valorant
 */
async function getValorantMMR(puuid, region, apiKey) {
    try {
        const res = await fetch(
            `https://${region}.api.riotgames.com/val/ranked/v1/players/by-puuid/${puuid}`,
            {
                headers: { 'X-Riot-Token': apiKey }
            }
        );

        if (!res.ok) {
            if (res.status === 404) return { error: 'Sin ranking competitivo' };
            return { error: `Error: ${res.status}` };
        }

        return await res.json();
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Obtiene partidos recientes de LoL
 */
async function getLoLMatchHistory(puuid, region, apiKey, count = 5) {
    try {
        const regionalRoute = RIOT_REGIONS.lol.regional[region] || 'americas';
        
        // Obtener IDs de partidos
        const idsRes = await fetch(
            `https://${regionalRoute}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`,
            {
                headers: { 'X-Riot-Token': apiKey }
            }
        );

        if (!idsRes.ok) return { error: `Error: ${idsRes.status}` };

        const matchIds = await idsRes.json();
        const matches = [];

        // Obtener detalles de cada partido
        for (const matchId of matchIds.slice(0, 3)) {
            const matchRes = await fetch(
                `https://${regionalRoute}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
                {
                    headers: { 'X-Riot-Token': apiKey }
                }
            );

            if (matchRes.ok) {
                const match = await matchRes.json();
                const playerIndex = match.metadata.participants.indexOf(puuid);
                if (playerIndex !== -1) {
                    matches.push({
                        matchId,
                        champion: match.info.participants[playerIndex].championName,
                        kills: match.info.participants[playerIndex].kills,
                        deaths: match.info.participants[playerIndex].deaths,
                        assists: match.info.participants[playerIndex].assists,
                        win: match.info.participants[playerIndex].win,
                        gameMode: match.info.gameMode,
                        gameDuration: match.info.gameDuration
                    });
                }
            }
        }

        return matches;
    } catch (e) {
        return { error: e.message };
    }
}

// ═══════════════════════════════════════════════════
//  GESTIÓN DE CUENTAS
// ═══════════════════════════════════════════════════

/**
 * Vincula una cuenta de Riot
 */
async function linkRiotAccount(userId, guildId, game, gameName, tagLine, region, apiKey) {
    const account = await getAccountByRiotId(gameName, tagLine, apiKey);

    if (account.error) {
        return { success: false, error: account.error };
    }

    _db.prepare(`
        INSERT OR REPLACE INTO riot_accounts 
        (user_id, guild_id, game, game_name, tag_line, puuid, region, linked_at, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, guildId, game, gameName, tagLine, account.puuid, region, Date.now(), Date.now());

    return { success: true, puuid: account.puuid, gameName, tagLine };
}

/**
 * Desvincula una cuenta
 */
function unlinkRiotAccount(userId, guildId, game) {
    return _db.prepare('DELETE FROM riot_accounts WHERE user_id = ? AND guild_id = ? AND game = ?')
        .run(userId, guildId, game).changes > 0;
}

/**
 * Obtiene cuentas vinculadas de un usuario
 */
function getLinkedAccounts(userId, guildId) {
    return _db.prepare('SELECT * FROM riot_accounts WHERE user_id = ? AND guild_id = ?').all(userId, guildId);
}

/**
 * Obtiene una cuenta específica
 */
function getLinkedAccount(userId, guildId, game) {
    return _db.prepare('SELECT * FROM riot_accounts WHERE user_id = ? AND guild_id = ? AND game = ?').get(userId, guildId, game);
}

// ═══════════════════════════════════════════════════
//  ESTADÍSTICAS FORMATEADAS
// ═══════════════════════════════════════════════════

const RANK_EMOJIS = {
    'IRON': '🔩', 'BRONZE': '🥉', 'SILVER': '🥈', 'GOLD': '🥇',
    'PLATINUM': '💎', 'EMERALD': '💚', 'DIAMOND': '💠', 'MASTER': '🏅',
    'GRANDMASTER': '🏆', 'CHALLENGER': '👑'
};

const VALORANT_RANKS = {
    'Iron': '🔩', 'Bronze': '🥉', 'Silver': '🥈', 'Gold': '🥇',
    'Platinum': '💎', 'Diamond': '💠', 'Ascendant': '🔺',
    'Immortal': '🔥', 'Radiant': '⭐'
};

/**
 * Genera embed de estadísticas de LoL
 */
async function generateLoLStatsEmbed(account, apiKey) {
    const data = await getLoLSummoner(account.puuid, account.region, apiKey);

    if (data.error) {
        return { error: data.error };
    }

    const { summoner, ranked, mastery } = data;

    // Procesar ranked
    const soloQ = ranked.find(r => r.queueType === 'RANKED_SOLO_5x5');
    const flexQ = ranked.find(r => r.queueType === 'RANKED_FLEX_SR');

    const embed = new EmbedBuilder()
        .setColor(0xC89B3C)
        .setTitle(` League of Legends - ${account.gameName}#${account.tagLine}`)
        .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${summoner.profileIconId}.png`)
        .addFields(
            { name: ' Invocador', value: `Nivel ${summoner.summonerLevel}`, inline: true },
            { 
                name: ' Solo/Duo', 
                value: soloQ 
                    ? `${RANK_EMOJIS[soloQ.tier] || ''} ${soloQ.tier} ${soloQ.rank}\n${soloQ.leaguePoints} LP | ${soloQ.wins}W/${soloQ.losses}L`
                    : 'Sin ranking',
                inline: true 
            },
            { 
                name: ' Flex', 
                value: flexQ 
                    ? `${RANK_EMOJIS[flexQ.tier] || ''} ${flexQ.tier} ${flexQ.rank}\n${flexQ.leaguePoints} LP | ${flexQ.wins}W/${flexQ.losses}L`
                    : 'Sin ranking',
                inline: true 
            }
        );

    // Top campeones
    if (mastery.length > 0) {
        embed.addFields({
            name: ' Top Campeones',
            value: mastery.slice(0, 5).map(m => 
                `${m.championName} - ${m.championPoints.toLocaleString()} pts`
            ).join('\n'),
            inline: false
        });
    }

    embed.setFooter({ text: `Región: ${account.region.toUpperCase()}` })
        .setTimestamp();

    return embed;
}

/**
 * Genera embed de estadísticas de Valorant
 */
async function generateValorantStatsEmbed(account, apiKey) {
    const data = await getValorantMMR(account.puuid, account.region, apiKey);

    if (data.error) {
        return { error: data.error };
    }

    const { currentTier, currentTierPatched, rankedRating, leaderboardPosition } = data.data || {};

    const rankName = currentTierPatched?.split(' ')[0] || 'Unranked';
    const rankEmoji = VALORANT_RANKS[rankName] || '🎯';

    const embed = new EmbedBuilder()
        .setColor(0xFF4655)
        .setTitle(` VALORANT - ${account.gameName}#${account.tagLine}`)
        .setDescription(rankName !== 'Unranked' 
            ? `${rankEmoji} **${currentTierPatched}**\n${rankedRating || 0} RR`
            : 'Sin ranking competitivo')
        .addFields(
            { name: ' Nivel', value: `${currentTier || 0}`, inline: true },
            { 
                name: ' Leaderboard', 
                value: leaderboardPosition ? `#${leaderboardPosition.toLocaleString()}` : 'No ranqueado',
                inline: true 
            }
        )
        .setFooter({ text: `Región: ${account.region.toUpperCase()}` })
        .setTimestamp();

    return embed;
}

/**
 * Genera embed de historial de partidas
 */
async function generateMatchHistoryEmbed(account, apiKey, count = 5) {
    const matches = await getLoLMatchHistory(account.puuid, account.region, apiKey, count);

    if (matches.error) {
        return { error: matches.error };
    }

    if (!matches.length) {
        return { error: 'No hay partidas recientes' };
    }

    const embed = new EmbedBuilder()
        .setColor(0xC89B3C)
        .setTitle(` Partidas Recientes - ${account.gameName}#${account.tagLine}`)
        .setDescription(
            matches.map(m => 
                `${m.win ? '✅' : '❌'} **${m.champion}** | ${m.kills}/${m.deaths}/${m.assists} | ${m.gameMode}`
            ).join('\n')
        )
        .setFooter({ text: 'League of Legends' })
        .setTimestamp();

    return embed;
}

// ═══════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════

module.exports = {
    // API
    getAccountByRiotId,
    getLoLSummoner,
    getValorantMMR,
    getLoLMatchHistory,
    // Gestión de cuentas
    linkRiotAccount,
    unlinkRiotAccount,
    getLinkedAccounts,
    getLinkedAccount,
    // Embeds
    generateLoLStatsEmbed,
    generateValorantStatsEmbed,
    generateMatchHistoryEmbed,
    // Constantes
    RIOT_REGIONS,
    RANK_EMOJIS,
    VALORANT_RANKS
};
