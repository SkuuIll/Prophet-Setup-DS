/**
 * ═══ Discord Activities — OAuth + sesión de juego ═══
 * Nunca confiar en userId del cliente: se verifica con la API de Discord.
 */

const AuthManager = require('./authManager');

const DISCORD_API = 'https://discord.com/api/v10';

function getClientCredentials() {
    let clientId = process.env.DISCORD_CLIENT_ID
        || process.env.VITE_DISCORD_CLIENT_ID
        || process.env.ACTIVITY_CLIENT_ID
        || '';

    // Fallback: el Application ID está en el bot token (base64 del primer segmento)
    if (!clientId && process.env.DISCORD_TOKEN) {
        try {
            const part = process.env.DISCORD_TOKEN.split('.')[0];
            // base64url padding
            const padded = part + '==='.slice((part.length + 3) % 4);
            const decoded = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
            if (/^\d{15,22}$/.test(decoded)) clientId = decoded;
        } catch (_) { /* ignore */ }
    }

    const clientSecret = process.env.DISCORD_CLIENT_SECRET
        || process.env.ACTIVITY_CLIENT_SECRET
        || '';
    return { clientId, clientSecret };
}

/**
 * Intercambia el code OAuth del Embedded App SDK por access_token.
 */
async function exchangeCodeForToken(code) {
    const { clientId, clientSecret } = getClientCredentials();
    if (!clientId || !clientSecret) {
        return {
            success: false,
            error: 'Falta DISCORD_CLIENT_ID o DISCORD_CLIENT_SECRET en el servidor'
        };
    }
    if (!code) {
        return { success: false, error: 'Falta code OAuth' };
    }

    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: String(code)
    });

    const res = await fetch(`${DISCORD_API.replace('/v10', '')}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
        return {
            success: false,
            error: data.error_description || data.error || 'Error al intercambiar OAuth code',
            status: res.status
        };
    }

    return {
        success: true,
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        scope: data.scope
    };
}

/**
 * Obtiene el usuario de Discord con el access_token (server-side, confiable).
 */
async function fetchDiscordUser(accessToken) {
    const res = await fetch(`${DISCORD_API}/users/@me`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
    if (!res.ok) {
        return { success: false, error: 'No se pudo obtener el usuario de Discord' };
    }
    const user = await res.json();
    if (!user?.id) {
        return { success: false, error: 'Respuesta de usuario inválida' };
    }
    return { success: true, user };
}

/**
 * Asegura fila de usuario en DB y crea sessionToken de juego.
 */
function ensureUserAndSession(discordUser, ttlMinutes = 180) {
    const user = discordUser;
    const username = user.global_name || user.username || `User_${String(user.id).slice(-4)}`;

    try {
        const { stmts } = require('../../database');
        if (stmts.getUser && !stmts.getUser(user.id)) {
            if (stmts.atomicModifyBalance) {
                stmts.atomicModifyBalance(user.id, 0, 'activity', 'ensure_user', 'Activity bootstrap');
            }
        }
    } catch (_) { /* non-fatal */ }

    const sessionToken = AuthManager.createSession(user.id, ttlMinutes, {
        username,
        globalName: user.global_name || null,
        avatar: user.avatar || null
    });

    return {
        success: true,
        sessionToken,
        user: {
            id: user.id,
            username,
            discriminator: user.discriminator,
            avatar: user.avatar,
            global_name: user.global_name
        }
    };
}

/**
 * Crea sesión de juego a partir de un access_token de Discord ya emitido.
 * Útil cuando el cliente solo obtuvo access_token vía /api/token.
 */
async function createSessionFromAccessToken(accessToken, ttlMinutes = 180) {
    if (!accessToken) return { success: false, error: 'Falta access_token' };
    const userResult = await fetchDiscordUser(accessToken);
    if (!userResult.success) return userResult;
    const session = ensureUserAndSession(userResult.user, ttlMinutes);
    return {
        success: true,
        access_token: accessToken,
        sessionToken: session.sessionToken,
        user: session.user
    };
}

/**
 * Flujo completo Activity: code → token → user → game session token.
 */
async function createActivitySession(code, ttlMinutes = 180) {
    const tokenResult = await exchangeCodeForToken(code);
    if (!tokenResult.success) return tokenResult;

    const session = await createSessionFromAccessToken(tokenResult.access_token, ttlMinutes);
    if (!session.success) return session;

    return {
        success: true,
        access_token: tokenResult.access_token,
        sessionToken: session.sessionToken,
        user: session.user
    };
}

/**
 * Config pública para el cliente (sin secretos).
 */
function getPublicConfig() {
    const { clientId, clientSecret } = getClientCredentials();
    return {
        clientId,
        activityEnabled: Boolean(clientId),
        oauthReady: Boolean(clientId && clientSecret),
        scopes: ['identify', 'guilds', 'applications.commands']
    };
}

module.exports = {
    getClientCredentials,
    exchangeCodeForToken,
    fetchDiscordUser,
    createActivitySession,
    createSessionFromAccessToken,
    ensureUserAndSession,
    getPublicConfig
};
