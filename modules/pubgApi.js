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
        result[mode] = {
            wins: stats.wins || 0,
            losses: stats.losses || 0,
            top10s: stats.top10s || 0,
            roundsPlayed: stats.roundsPlayed || 0,
            kills: stats.kills || 0,
            assists: stats.assists || 0,
            deaths: stats.roundsPlayed || 0, // PUBG no tiene "deaths" directo, usa roundsPlayed - wins
            kdRatio: stats.roundsPlayed > 0
                ? (stats.kills / Math.max(1, (stats.roundsPlayed - stats.wins))).toFixed(2)
                : '0.00',
            damageDealt: Math.round(stats.damageDealt || 0),
            avgDamage: stats.roundsPlayed > 0
                ? Math.round((stats.damageDealt || 0) / stats.roundsPlayed)
                : 0,
            longestKill: Math.round(stats.longestKill || 0),
            headshotKills: stats.headshotKills || 0,
            headshotRate: stats.kills > 0
                ? ((stats.headshotKills / stats.kills) * 100).toFixed(1)
                : '0.0',
            maxKillStreaks: stats.maxKillStreaks || 0,
            timeSurvived: Math.round((stats.timeSurvived || 0) / 60), // en minutos
            walkDistance: ((stats.walkDistance || 0) / 1000).toFixed(1), // en km
            rideDistance: ((stats.rideDistance || 0) / 1000).toFixed(1), // en km
            swimDistance: ((stats.swimDistance || 0) / 1000).toFixed(1), // en km
            boosts: stats.boosts || 0,
            heals: stats.heals || 0,
            revives: stats.revives || 0,
            teamKills: stats.teamKills || 0,
            suicides: stats.suicides || 0,
            vehicleDestroys: stats.vehicleDestroys || 0,
            weaponsAcquired: stats.weaponsAcquired || 0,
            daysActive: stats.days || 0,
            longestTimeSurvived: Math.round((stats.longestTimeSurvived || 0) / 60), // min
            mostSurvivalTime: Math.round((stats.mostSurvivalTime || 0) / 60), // min
            winRate: stats.roundsPlayed > 0
                ? ((stats.wins / stats.roundsPlayed) * 100).toFixed(1)
                : '0.0',
        };
    }

    setCache(cacheKey, result);
    return result;
}

/**
 * Buscar jugador y obtener lifetime stats en una sola llamada
 * @param {string} playerName - Nombre del jugador
 * @param {string} platform - Plataforma
 * @returns {Object} { player, stats }
 */
async function getPlayerStats(playerName, platform = 'steam') {
    const player = await searchPlayer(playerName, platform);
    const stats = await getLifetimeStats(player.id, platform);
    return { player, stats };
}

module.exports = {
    searchPlayer,
    getLifetimeStats,
    getPlayerStats,
    PLATFORMS,
    GAME_MODES,
};
