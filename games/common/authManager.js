const crypto = require('crypto');
const { stmts } = require('../../database');

class AuthManager {
    /**
     * Genera un token seguro de sesión única para un usuario de Discord
     */
    static createSession(userId, ttlMinutes = 120) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const ttlMs = ttlMinutes * 60 * 1000;
        stmts.createGameSession(rawToken, userId, ttlMs);
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

        return {
            userId: session.user_id,
            user,
            token,
            expiresAt: session.expires_at
        };
    }

    /**
     * Elimina el token (logout o sesión completada)
     */
    static revokeToken(token) {
        stmts.deleteGameSession(token);
    }
}

module.exports = AuthManager;
