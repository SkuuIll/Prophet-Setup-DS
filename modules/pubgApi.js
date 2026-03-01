// ═══════════════════════════════════════════════════
//  PUBG API Service Module
//  API Docs: https://documentation.pubg.com/
// ═══════════════════════════════════════════════════

const config = require('../config');

const BASE_URL = config.APIS.PUBG.BASE_URL;
const API_KEY = config.APIS.PUBG.KEY;
const CACHE_TTL = config.APIS.PUBG.CACHE_TTL;

// ── Cache en memoria ──
const cache = new Map();

function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
    // Limpiar cache viejo (max 100 entries)
    if (cache.size > 100) {
        const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
        cache.delete(oldest[0]);
    }
}

// ── Rate Limiter simple ──
let lastRequest = 0;
const MIN_INTERVAL = 6500; // ~9 requests/min (bajo el límite de 10)

async function rateLimitedFetch(url) {
    const now = Date.now();
    const wait = MIN_INTERVAL - (now - lastRequest);
    if (wait > 0) {
        await new Promise(r => setTimeout(r, wait));
    }
    lastRequest = Date.now();

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'application/vnd.api+json',
        }
    });

    if (!response.ok) {
        const status = response.status;
        if (status === 404) throw new Error('PLAYER_NOT_FOUND');
        if (status === 401) throw new Error('API_KEY_INVALID');
        if (status === 429) throw new Error('RATE_LIMITED');
        throw new Error(`PUBG_API_ERROR_${status}`);
    }

    return response.json();
}

// ── Plataformas válidas ──
const PLATFORMS = ['steam', 'psn', 'xbox', 'kakao', 'stadia'];

const GAME_MODES = [
    'solo', 'solo-fpp',
    'duo', 'duo-fpp',
    'squad', 'squad-fpp'
];

// ── Funciones públicas ──

/**
 * Buscar jugador por nombre
 * @param {string} playerName - Nombre del jugador
 * @param {string} platform - Plataforma (steam, psn, xbox)
 * @returns {Object} Datos del jugador (id, name, matches)
 */
async function searchPlayer(playerName, platform = 'steam') {
    if (!PLATFORMS.includes(platform)) {
        throw new Error(`Plataforma inválida. Usa: ${PLATFORMS.join(', ')}`);
    }

    const cacheKey = `player_${platform}_${playerName.toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const url = `${BASE_URL}/shards/${platform}/players?filter[playerNames]=${encodeURIComponent(playerName)}`;
    const data = await rateLimitedFetch(url);

    if (!data.data || data.data.length === 0) {
        throw new Error('PLAYER_NOT_FOUND');
    }

    const player = data.data[0];
    const result = {
        id: player.id,
        name: player.attributes.name,
        platform,
        recentMatches: player.relationships?.matches?.data?.map(m => m.id) || [],
    };

    setCache(cacheKey, result);
    return result;
}

/**
 * Obtener estadísticas lifetime de un jugador
 * @param {string} playerId - ID del jugador (account.xxx)
 * @param {string} platform - Plataforma
 * @returns {Object} Stats separadas por game mode
 */
async function getLifetimeStats(playerId, platform = 'steam') {
    const cacheKey = `lifetime_${platform}_${playerId}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const url = `${BASE_URL}/shards/${platform}/players/${playerId}/seasons/lifetime`;
    const data = await rateLimitedFetch(url);

    const gameModeStats = data.data?.attributes?.gameModeStats || {};
    const result = {};

    for (const [mode, stats] of Object.entries(gameModeStats)) {
        const rp = stats.roundsPlayed || 0;
        const k = stats.kills || 0;
        const w = stats.wins || 0;
        result[mode] = {
            wins: w,
            losses: stats.losses || 0,
            top10s: stats.top10s || 0,
            roundsPlayed: rp,
            kills: k,
            assists: stats.assists || 0,
            deaths: rp, // PUBG no tiene "deaths" directo
            kdRatio: rp > 0
                ? (k / Math.max(1, (rp - w))).toFixed(2)
                : '0.00',
            damageDealt: Math.round(stats.damageDealt || 0),
            avgDamage: rp > 0 ? Math.round((stats.damageDealt || 0) / rp) : 0,
            longestKill: Math.round(stats.longestKill || 0),
            headshotKills: stats.headshotKills || 0,
            headshotRate: k > 0 ? ((stats.headshotKills / k) * 100).toFixed(1) : '0.0',
            maxKillStreaks: stats.maxKillStreaks || 0,
            timeSurvived: Math.round((stats.timeSurvived || 0) / 60),
            walkDistance: ((stats.walkDistance || 0) / 1000).toFixed(1),
            rideDistance: ((stats.rideDistance || 0) / 1000).toFixed(1),
            swimDistance: ((stats.swimDistance || 0) / 1000).toFixed(1),
            boosts: stats.boosts || 0,
            heals: stats.heals || 0,
            revives: stats.revives || 0,
            teamKills: stats.teamKills || 0,
            suicides: stats.suicides || 0,
            vehicleDestroys: stats.vehicleDestroys || 0,
            weaponsAcquired: stats.weaponsAcquired || 0,
            daysActive: stats.days || 0,
            longestTimeSurvived: Math.round((stats.longestTimeSurvived || 0) / 60),
            mostSurvivalTime: Math.round((stats.mostSurvivalTime || 0) / 60),
            winRate: rp > 0 ? ((w / rp) * 100).toFixed(1) : '0.0',
            // ── Promedios por partida ──
            avgKills: rp > 0 ? (k / rp).toFixed(1) : '0.0',
            avgAssists: rp > 0 ? ((stats.assists || 0) / rp).toFixed(1) : '0.0',
            avgSurvivalTime: rp > 0 ? Math.round((stats.timeSurvived || 0) / 60 / rp) : 0,
            avgHeals: rp > 0 ? ((stats.heals || 0) / rp).toFixed(1) : '0.0',
            avgBoosts: rp > 0 ? ((stats.boosts || 0) / rp).toFixed(1) : '0.0',
            top10Rate: rp > 0 ? (((stats.top10s || 0) / rp) * 100).toFixed(1) : '0.0',
        };
    }

    setCache(cacheKey, result);
    return result;
}

/**
 * Obtener lista de temporadas disponibles
 * @param {string} platform - Plataforma
 * @returns {Array} Lista de temporadas
 */
async function getSeasons(platform = 'steam') {
    const cacheKey = `seasons_${platform}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const url = `${BASE_URL}/shards/${platform}/seasons`;
    const data = await rateLimitedFetch(url);

    const seasons = (data.data || []).map(s => ({
        id: s.id,
        isCurrentSeason: s.attributes?.isCurrentSeason || false,
        isOffseason: s.attributes?.isOffseason || false,
    }));

    setCache(cacheKey, seasons);
    return seasons;
}

/**
 * Obtener stats de una temporada específica
 * @param {string} playerId - ID del jugador
 * @param {string} seasonId - ID de la temporada
 * @param {string} platform - Plataforma
 * @returns {Object} Stats de la temporada por game mode
 */
async function getSeasonStats(playerId, seasonId, platform = 'steam') {
    const cacheKey = `season_${platform}_${playerId}_${seasonId}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const url = `${BASE_URL}/shards/${platform}/players/${playerId}/seasons/${seasonId}`;
    const data = await rateLimitedFetch(url);

    // Usa el mismo parser que lifetime
    const gameModeStats = data.data?.attributes?.gameModeStats || {};
    const result = {};

    for (const [mode, stats] of Object.entries(gameModeStats)) {
        const rp = stats.roundsPlayed || 0;
        const k = stats.kills || 0;
        const w = stats.wins || 0;
        if (rp === 0) continue; // skip modos sin datos
        result[mode] = {
            wins: w, losses: stats.losses || 0, top10s: stats.top10s || 0,
            roundsPlayed: rp, kills: k, assists: stats.assists || 0,
            kdRatio: rp > 0 ? (k / Math.max(1, (rp - w))).toFixed(2) : '0.00',
            damageDealt: Math.round(stats.damageDealt || 0),
            avgDamage: rp > 0 ? Math.round((stats.damageDealt || 0) / rp) : 0,
            longestKill: Math.round(stats.longestKill || 0),
            headshotKills: stats.headshotKills || 0,
            headshotRate: k > 0 ? ((stats.headshotKills / k) * 100).toFixed(1) : '0.0',
            maxKillStreaks: stats.maxKillStreaks || 0,
            timeSurvived: Math.round((stats.timeSurvived || 0) / 60),
            boosts: stats.boosts || 0, heals: stats.heals || 0,
            revives: stats.revives || 0, teamKills: stats.teamKills || 0,
            suicides: stats.suicides || 0,
            winRate: rp > 0 ? ((w / rp) * 100).toFixed(1) : '0.0',
            avgKills: rp > 0 ? (k / rp).toFixed(1) : '0.0',
            avgAssists: rp > 0 ? ((stats.assists || 0) / rp).toFixed(1) : '0.0',
            avgSurvivalTime: rp > 0 ? Math.round((stats.timeSurvived || 0) / 60 / rp) : 0,
            top10Rate: rp > 0 ? (((stats.top10s || 0) / rp) * 100).toFixed(1) : '0.0',
            walkDistance: ((stats.walkDistance || 0) / 1000).toFixed(1),
            rideDistance: ((stats.rideDistance || 0) / 1000).toFixed(1),
            swimDistance: ((stats.swimDistance || 0) / 1000).toFixed(1),
            vehicleDestroys: stats.vehicleDestroys || 0,
            weaponsAcquired: stats.weaponsAcquired || 0,
            daysActive: stats.days || 0,
        };
    }

    setCache(cacheKey, result);
    return result;
}

/**
 * Buscar jugador y obtener lifetime stats en una sola llamada
 */
async function getPlayerStats(playerName, platform = 'steam') {
    const player = await searchPlayer(playerName, platform);
    const stats = await getLifetimeStats(player.id, platform);
    return { player, stats };
}

// ── Nombres de mapas legibles ──
const MAP_NAMES = {
    'Baltic_Main': 'Erangel',
    'Chimera_Main': 'Paramo',
    'Desert_Main': 'Miramar',
    'DihorOtok_Main': 'Vikendi',
    'Erangel_Main': 'Erangel',
    'Heaven_Main': 'Haven',
    'Kiki_Main': 'Deston',
    'Range_Main': 'Camp Jackal',
    'Savage_Main': 'Sanhok',
    'Summerland_Main': 'Karakin',
    'Tiger_Main': 'Taego',
    'Neon_Main': 'Rondo',
};

/**
 * Obtener datos de una partida específica
 * Nota: El endpoint de matches NO requiere auth, pero sí rate limit
 * @param {string} matchId - ID de la partida
 * @param {string} platform - Plataforma
 * @param {string} playerAccountId - Account ID del jugador para filtrar sus stats
 * @returns {Object} Datos de la partida con stats del jugador
 */
async function getMatch(matchId, platform = 'steam', playerAccountId = null) {
    const cacheKey = `match_${platform}_${matchId}`;
    const cached = getCached(cacheKey);
    if (cached) {
        // Si tenemos en cache, aplicar filtro de jugador
        if (playerAccountId) {
            return { ...cached, playerStats: findPlayerInMatch(cached, playerAccountId) };
        }
        return cached;
    }

    const url = `${BASE_URL}/shards/${platform}/matches/${matchId}`;
    const data = await rateLimitedFetch(url);

    const matchData = data.data;
    const included = data.included || [];

    // Extraer metadatos del match
    const attrs = matchData?.attributes || {};
    const mapName = MAP_NAMES[attrs.mapName] || attrs.mapName || 'Desconocido';
    const gameMode = attrs.gameMode || 'unknown';
    const duration = attrs.duration || 0; // segundos
    const createdAt = attrs.createdAt || null;

    // Extraer participants (jugadores)
    const participants = included
        .filter(i => i.type === 'participant')
        .map(p => {
            const s = p.attributes?.stats || {};
            return {
                id: p.id,
                playerId: s.playerId,
                name: s.name || 'Desconocido',
                kills: s.kills || 0,
                assists: s.assists || 0,
                damageDealt: Math.round(s.damageDealt || 0),
                headshotKills: s.headshotKills || 0,
                longestKill: Math.round(s.longestKill || 0),
                timeSurvived: Math.round((s.timeSurvived || 0) / 60),
                walkDistance: ((s.walkDistance || 0) / 1000).toFixed(1),
                rideDistance: ((s.rideDistance || 0) / 1000).toFixed(1),
                heals: s.heals || 0,
                boosts: s.boosts || 0,
                revives: s.revives || 0,
                DBNOs: s.DBNOs || 0,
                killPlace: s.killPlace || 0,
                winPlace: s.winPlace || 0,
                deathType: s.deathType || 'alive',
            };
        });

    // Extraer rosters (equipos) para obtener winPlace
    const rosters = included
        .filter(i => i.type === 'roster')
        .map(r => {
            const rosterParticipantIds = (r.relationships?.participants?.data || []).map(p => p.id);
            return {
                id: r.id,
                rank: r.attributes?.stats?.rank || 0,
                won: r.attributes?.won === 'true',
                participantIds: rosterParticipantIds,
            };
        });

    const result = {
        matchId,
        mapName,
        gameMode,
        duration: Math.round(duration / 60), // minutos
        createdAt,
        totalPlayers: participants.length,
        participants,
        rosters,
    };

    setCache(cacheKey, result);

    if (playerAccountId) {
        return { ...result, playerStats: findPlayerInMatch(result, playerAccountId) };
    }
    return result;
}

/**
 * Buscar las stats de un jugador específico dentro de un match
 */
function findPlayerInMatch(matchData, playerAccountId) {
    const participant = matchData.participants.find(p => p.playerId === playerAccountId);
    if (!participant) return null;

    // Buscar el roster para obtener posición final del equipo
    const roster = matchData.rosters.find(r => r.participantIds.includes(participant.id));

    return {
        ...participant,
        teamRank: roster?.rank || participant.winPlace || 0,
    };
}

module.exports = {
    searchPlayer,
    getLifetimeStats,
    getSeasons,
    getSeasonStats,
    getPlayerStats,
    getMatch,
    MAP_NAMES,
    PLATFORMS,
    GAME_MODES,
};

