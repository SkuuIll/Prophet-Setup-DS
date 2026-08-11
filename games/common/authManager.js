const crypto = require('crypto');
const { stmts } = require('../../database');

// Metadata de sesión en memoria (username/avatar de Discord Activity)
const sessionMeta = new Map(); // token -> { username, avatar, globalName }

class AuthManager {
    /**
     * Genera un token de sesión. meta opcional: { username, avatar, globalName }
     */
    static createSession(userId, ttlMinutes = 120, meta = {}) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const ttlMs = ttlMinutes * 60 * 1000;
        stmts.createGameSession(rawToken, userId, ttlMs);
        if (meta && (meta.username || meta.avatar || meta.globalName)) {
            sessionMeta.set(rawToken, {
                username: meta.username || meta.globalName || null,
                avatar: meta.avatar || null,
                globalName: meta.globalName || null
            });
        }
        return rawToken;
    }

    /**
     * Valida el token y devuelve los datos del usuario si es válido
     */
    static validateToken(token) {
        if (!token || typeof token !== 'string') return null;
        const session = stmts.getGameSession(token);
        if (!session) return null;

        let user = stmts.getUser(session.user_id);
        if (!user) {
            user = { id: session.user_id, balance: 0, bank: 0, level: 1, xp: 0 };
        }

        const meta = sessionMeta.get(token) || {};
        const username = meta.username
            || meta.globalName
            || user.username
            || null;

        return {
            userId: session.user_id,
            user: {
                ...user,
                username: username || user.username,
                avatar: meta.avatar || user.avatar || null
            },
            username,
            avatar: meta.avatar || null,
            token,
            expiresAt: session.expires_at
        };
    }

    /**
     * Actualiza metadata de una sesión viva (ej. después de OAuth Activity)
     */
    static setSessionMeta(token, meta = {}) {
        if (!token) return;
        const prev = sessionMeta.get(token) || {};
        sessionMeta.set(token, {
            username: meta.username || prev.username || null,
            avatar: meta.avatar || prev.avatar || null,
            globalName: meta.globalName || prev.globalName || null
        });
    }

    static revokeToken(token) {
        sessionMeta.delete(token);
        stmts.deleteGameSession(token);
    }
}

module.exports = AuthManager;
