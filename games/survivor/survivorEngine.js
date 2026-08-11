const { stmts } = require('../../database');
const EconomyBridge = require('../common/economyBridge');

class SurvivorEngine {
    /**
     * Valida y procesa el fin de partida de un jugador
     */
    processGameOver(userId, username, kills, survivalSeconds, levelReached) {
        const k = Math.max(0, Math.floor(Number(kills) || 0));
        const s = Math.max(0, Math.floor(Number(survivalSeconds) || 0));
        const lvl = Math.max(1, Math.floor(Number(levelReached) || 1));

        // Puntuación global del run
        const score = (k * 100) + (s * 50) + (lvl * 500);

        // Recompensa en monedas de Discord (con límite de seguridad de 5,000 por run)
        const baseCoins = (k * 2) + (s * 3) + (lvl * 20);
        const coinsEarned = Math.min(5000, Math.max(10, Math.floor(baseCoins)));

        // Guardar récord en la base de datos SQLite
        stmts.saveSurvivorScore(userId, username, score, k, s, coinsEarned);

        // Acreditar monedas virtuales al balance de Discord
        const credit = EconomyBridge.addCoins(
            userId,
            coinsEarned,
            'survivor_2d',
            'run_completed',
            `Sobrevivió ${s}s, ${k} kills, Nivel ${lvl}`
        );

        return {
            success: true,
            score,
            kills: k,
            survivalSeconds: s,
            levelReached: lvl,
            coinsEarned,
            newBalance: credit.balance
        };
    }

    /**
     * Obtiene la tabla de récords de Prophet Survivor
     */
    getLeaderboard(limit = 10) {
        return stmts.getSurvivorLeaderboard(limit);
    }
}

module.exports = new SurvivorEngine();
