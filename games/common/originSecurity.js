// Validar Origin en HTTP y WebSockets sin confiar en sufijos parciales.
// Las peticiones same-origin no necesitan un header de CORS explícito.
const DISCORD_DOMAINS = ['discord.com', 'discordapp.com', 'discordsays.com'];

function isAllowedGamesOrigin(origin, host, configuredOrigins = '', nodeEnv = 'production') {
    if (origin === undefined || origin === null || origin === '') return true;
    if (typeof origin !== 'string') return false;
    let parsed;
    try {
        parsed = new URL(origin);
    } catch {
        return false;
    }
    if (parsed.origin !== origin || parsed.username || parsed.password) return false;
    const hostname = parsed.hostname.toLowerCase();
    const secure = parsed.protocol === 'https:';
    const loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

    if (secure && DISCORD_DOMAINS.some(domain =>
        hostname === domain || hostname.endsWith('.' + domain))) {
        return true;
    }

    // El reverse proxy conserva Host de la web que sirvió los juegos.
    // Un origen HTTP solo se admite en localhost durante desarrollo.
    const ownHost = typeof host === 'string' && parsed.host.toLowerCase() === host.toLowerCase();
    if (ownHost && (secure || (loopback && nodeEnv !== 'production'))) return true;

    return String(configuredOrigins).split(',').some(item => {
        const allowed = item.trim();
        if (!allowed || allowed !== origin) return false;
        return secure || (loopback && nodeEnv !== 'production');
    });
}

module.exports = { isAllowedGamesOrigin };
