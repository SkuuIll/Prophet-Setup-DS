// ═══════════════════════════════════════════════════
//  CS2 Stats Service Module
//  Fuente: tracker.gg (scraping + API fallback)
// ═══════════════════════════════════════════════════

const config = require('../config');

const TRACKER_KEY = config.APIS.TRACKER.KEY;
const CACHE_TTL = config.APIS.TRACKER.CACHE_TTL;

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
    if (cache.size > 100) {
        const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
        cache.delete(oldest[0]);
    }
}

/**
 * Intentar obtener stats via API de tracker.gg (endpoint csgo/cs2)
 * @param {string} identifier - Steam ID, vanity URL, o nombre
 * @returns {Object|null} Stats del jugador o null si falla
 */
async function fetchViaAPI(identifier) {
    try {
        // Intentar con el endpoint de csgo (también cubre cs2 en algunos casos)
        const url = `https://api.tracker.gg/api/v2/csgo/standard/profile/steam/${encodeURIComponent(identifier)}`;

        const response = await fetch(url, {
            headers: {
                'TRN-Api-Key': TRACKER_KEY,
                'Accept': 'application/json',
                'User-Agent': 'ProphetBot/2.0 Discord Bot',
            }
        });

        if (!response.ok) return null;

        const json = await response.json();
        if (!json.data) return null;

        return parseAPIResponse(json.data);
    } catch {
        return null;
    }
}

/**
 * Obtener stats via scraping de la página de tracker.gg
 * @param {string} identifier - Steam ID o vanity URL
 * @returns {Object|null} Stats del jugador
 */
async function fetchViaScraping(identifier) {
    try {
        const url = `https://tracker.gg/cs2/profile/steam/${encodeURIComponent(identifier)}/overview`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        if (!response.ok) {
            if (response.status === 404) throw new Error('PLAYER_NOT_FOUND');
            return null;
        }

        const html = await response.text();
        return parseScrapedHTML(html);
    } catch (err) {
        if (err.message === 'PLAYER_NOT_FOUND') throw err;
        return null;
    }
}

/**
 * Parsear respuesta de la API de tracker.gg
 */
function parseAPIResponse(data) {
    const platformInfo = data.platformInfo || {};
    const segments = data.segments || [];

    // Buscar el segmento "overview" (stats generales)
    const overview = segments.find(s => s.type === 'overview');
    if (!overview) return null;

    const stats = overview.stats || {};

    return {
        playerName: platformInfo.platformUserHandle || platformInfo.platformUserId || 'Desconocido',
        avatarUrl: platformInfo.avatarUrl || null,
        source: 'api',
        stats: {
            kills: extractStat(stats.kills),
            deaths: extractStat(stats.deaths),
            kd: extractStat(stats.kd, true),
            wins: extractStat(stats.wins),
            losses: extractStat(stats.losses),
            winRate: extractStat(stats.wlPercentage, true),
            headshotPct: extractStat(stats.headshotPct, true),
            damagePerRound: extractStat(stats.damagePerRound, true),
            score: extractStat(stats.score),
            mvps: extractStat(stats.mvps),
            matchesPlayed: extractStat(stats.matchesPlayed),
            roundsPlayed: extractStat(stats.roundsPlayed),
            roundsWon: extractStat(stats.roundsWon),
            timePlayed: extractStat(stats.timePlayed),
        },
        // Stats por mapa (si hay segmentos de mapa)
        maps: segments
            .filter(s => s.type === 'map')
            .map(s => ({
                name: s.metadata?.name || s.attributes?.key || 'Desconocido',
                imageUrl: s.metadata?.imageUrl || null,
                stats: {
                    wins: extractStat(s.stats?.wins),
                    losses: extractStat(s.stats?.losses),
                    winRate: extractStat(s.stats?.wlPercentage, true),
                    rounds: extractStat(s.stats?.roundsPlayed),
                }
            }))
            .slice(0, 5),
    };
}

/**
 * Parsear HTML scrapeado de tracker.gg
 * Busca el JSON embebido en __NEXT_DATA__ o extrae datos del HTML
 */
function parseScrapedHTML(html) {
    // Método 1: Buscar __NEXT_DATA__ (Next.js embebe datos JSON)
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
        try {
            const nextData = JSON.parse(nextDataMatch[1]);
            const pageProps = nextData?.props?.pageProps;
            if (pageProps?.data || pageProps?.profile) {
                const profileData = pageProps.data || pageProps.profile;
                return parseAPIResponse(profileData);
            }
        } catch { /* continuar con siguiente método */ }
    }

    // Método 2: Buscar datos en window.__INITIAL_STATE__ o similar
    const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/);
    if (stateMatch) {
        try {
            const state = JSON.parse(stateMatch[1]);
            // Navegar la estructura para encontrar datos del perfil
            const stats = findStatsInObject(state);
            if (stats) return stats;
        } catch { /* continuar */ }
    }

    // Método 3: Extraer stats básicas del HTML con regex
    return parseStatsFromHTML(html);
}

/**
 * Buscar recursivamente stats en un objeto (para scraping)
 */
function findStatsInObject(obj, depth = 0) {
    if (depth > 5 || !obj || typeof obj !== 'object') return null;

    // Si tiene "segments" y "platformInfo", es la estructura correcta
    if (obj.segments && obj.platformInfo) {
        return parseAPIResponse(obj);
    }

    for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) {
            const result = findStatsInObject(value, depth + 1);
            if (result) return result;
        }
    }
    return null;
}

/**
 * Extraer stats del HTML como último recurso
 */
function parseStatsFromHTML(html) {
    const extractValue = (label) => {
        // Buscar patrones como: <span>K/D Ratio</span>...<span>1.23</span>
        const patterns = [
            new RegExp(`${label}[\\s\\S]*?<(?:span|div)[^>]*class="[^"]*value[^"]*"[^>]*>([\\d,.]+)`, 'i'),
            new RegExp(`title="${label}"[\\s\\S]*?<(?:span|div)[^>]*>([\\d,.]+)`, 'i'),
            new RegExp(`>${label}<[\\s\\S]*?>([\\.\\d,]+)<`, 'i'),
        ];
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) return match[1].replace(/,/g, '');
        }
        return null;
    };

    // Extraer nombre del jugador
    const nameMatch = html.match(/<(?:h1|span)[^>]*class="[^"]*(?:player-name|trn-ign)[^"]*"[^>]*>([^<]+)/i)
        || html.match(/<title>([^-|<]+)/i);
    const playerName = nameMatch ? nameMatch[1].trim() : 'Desconocido';

    // Extraer avatar
    const avatarMatch = html.match(/class="[^"]*(?:player-avatar|avatar)[^"]*"[^>]*src="([^"]+)"/i)
        || html.match(/<img[^>]*src="([^"]*akamai[^"]*|[^"]*avatar[^"]*)"/i);
    const avatarUrl = avatarMatch ? avatarMatch[1] : null;

    const stats = {
        kills: extractValue('Kills') || extractValue('kills'),
        deaths: extractValue('Deaths') || extractValue('deaths'),
        kd: extractValue('K/D Ratio') || extractValue('K/D') || extractValue('kd'),
        wins: extractValue('Wins') || extractValue('wins'),
        losses: extractValue('Losses') || extractValue('losses'),
        winRate: extractValue('Win %') || extractValue('Win Rate') || extractValue('Win Percentage'),
        headshotPct: extractValue('Headshot %') || extractValue('HS%') || extractValue('Headshot Percentage'),
        damagePerRound: extractValue('Damage/Round') || extractValue('ADR') || extractValue('Avg Damage'),
        score: extractValue('Score') || extractValue('score'),
        mvps: extractValue('MVPs') || extractValue('mvps'),
        matchesPlayed: extractValue('Matches Played') || extractValue('Matches'),
        roundsPlayed: extractValue('Rounds Played') || extractValue('Rounds'),
        roundsWon: extractValue('Rounds Won'),
        timePlayed: extractValue('Time Played') || extractValue('Playtime'),
    };

    // Verificar que al menos tenemos algunos datos
    const hasData = Object.values(stats).some(v => v !== null);
    if (!hasData) return null;

    return {
        playerName,
        avatarUrl,
        source: 'scraping',
        stats,
        maps: [],
    };
}

/**
 * Extraer valor de un stat de la API
 */
function extractStat(stat, isDecimal = false) {
    if (!stat) return null;
    if (stat.displayValue !== undefined) return stat.displayValue;
    if (stat.value !== undefined) {
        return isDecimal ? Number(stat.value).toFixed(2) : String(stat.value);
    }
    return null;
}

/**
 * Obtener perfil de CS2 de un jugador
 * Intenta primero la API, luego scraping
 * @param {string} identifier - Steam ID (76561...) o vanity URL
 * @returns {Object} Datos del jugador con stats
 */
async function getCS2Profile(identifier) {
    const cacheKey = `cs2_${identifier.toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    // Intento 1: API de tracker.gg (puede fallar si no hay API para CS2)
    let result = await fetchViaAPI(identifier);

    // Intento 2: Scraping de la página
    if (!result) {
        result = await fetchViaScraping(identifier);
    }

    if (!result) {
        throw new Error('CS2_STATS_NOT_FOUND');
    }

    setCache(cacheKey, result);
    return result;
}

module.exports = {
    getCS2Profile,
};
