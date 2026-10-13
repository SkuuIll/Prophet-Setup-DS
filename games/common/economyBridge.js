const { stmts } = require('../../database');

function parsePositiveCoins(amount) {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    const coins = Math.floor(parsed);
    return Number.isSafeInteger(coins) && coins > 0 ? coins : null;
}

class EconomyBridge {
    /**
     * Obtiene el balance y datos esenciales de un usuario
     */
    static getUserBalance(userId) {
        const user = stmts.getUser(userId);
        if (!user) return { balance: 0, bank: 0, level: 1, xp: 0 };
        return {
            balance: user.balance || 0,
            bank: user.bank || 0,
            level: user.level || 1,
            xp: user.xp || 0
        };
    }

    /**
     * Descuenta monedas para una apuesta o compra de forma atómica
     */
    static deductCoins(userId, amount, game, action = 'bet', details = '') {
        const amt = parsePositiveCoins(amount);
        if (amt === null) {
            return { success: false, error: 'Monto inválido' };
        }
        return stmts.atomicModifyBalance(userId, -amt, game, action, details);
    }

    /**
     * Acredita monedas por victoria o recompensa de forma atómica
     */
    static addCoins(userId, amount, game, action = 'win', details = '') {
        const amt = parsePositiveCoins(amount);
        if (amt === null) {
            return { success: false, error: 'Monto inválido' };
        }
        return stmts.atomicModifyBalance(userId, amt, game, action, details);
    }
}

module.exports = EconomyBridge;
module.exports.parsePositiveCoins = parsePositiveCoins;
