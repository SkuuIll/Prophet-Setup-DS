const crypto = require('crypto');
const EconomyBridge = require('../common/economyBridge');
const cfg = require('../common/gamesConfig').casino;

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);

class RouletteEngine {
    static getNumberColor(num) {
        if (num === 0) return 'green';
        return RED_NUMBERS.has(num) ? 'red' : 'black';
    }

    /**
     * Parsea tipos de apuesta:
     * - straight:N  (pleno 35:1 → x36 total)
     * - split:A-B   (dos números adyacentes 17:1 → x18)
     * - red/black/even/odd/low/high (1:1 → x2)
     * - dozen_1|2|3, col_1|2|3 (2:1 → x3)
     */
    static evaluateBet(type, amount, winningNumber, winningColor) {
        const amt = Math.floor(Number(amount));
        let multiplier = 0;
        let won = false;

        if (type.startsWith('straight:')) {
            const targetNum = parseInt(type.split(':')[1], 10);
            if (targetNum === winningNumber) {
                multiplier = 36;
                won = true;
            }
        } else if (type.startsWith('split:')) {
            // split:5-8
            const parts = type.split(':')[1].split('-').map(n => parseInt(n, 10));
            if (parts.length === 2 && parts.includes(winningNumber)) {
                multiplier = 18;
                won = true;
            }
        } else if (type === 'red' && winningColor === 'red') {
            multiplier = 2;
            won = true;
        } else if (type === 'black' && winningColor === 'black') {
            multiplier = 2;
            won = true;
        } else if (type === 'even' && winningNumber > 0 && winningNumber % 2 === 0) {
            multiplier = 2;
            won = true;
        } else if (type === 'odd' && winningNumber > 0 && winningNumber % 2 !== 0) {
            multiplier = 2;
            won = true;
        } else if (type === 'low' && winningNumber >= 1 && winningNumber <= 18) {
            multiplier = 2;
            won = true;
        } else if (type === 'high' && winningNumber >= 19 && winningNumber <= 36) {
            multiplier = 2;
            won = true;
        } else if (type === 'dozen_1' && winningNumber >= 1 && winningNumber <= 12) {
            multiplier = 3;
            won = true;
        } else if (type === 'dozen_2' && winningNumber >= 13 && winningNumber <= 24) {
            multiplier = 3;
            won = true;
        } else if (type === 'dozen_3' && winningNumber >= 25 && winningNumber <= 36) {
            multiplier = 3;
            won = true;
        } else if (type === 'col_1' && winningNumber > 0 && winningNumber % 3 === 1) {
            multiplier = 3;
            won = true;
        } else if (type === 'col_2' && winningNumber > 0 && winningNumber % 3 === 2) {
            multiplier = 3;
            won = true;
        } else if (type === 'col_3' && winningNumber > 0 && winningNumber % 3 === 0) {
            multiplier = 3;
            won = true;
        }

        return { won, multiplier, payout: won ? amt * multiplier : 0 };
    }

    static spin(userId, bets) {
        if (!Array.isArray(bets) || bets.length === 0) {
            return { success: false, error: 'Debés colocar al menos una apuesta en el paño' };
        }

        let totalBet = 0;
        for (const b of bets) {
            const amt = Math.floor(Number(b.amount));
            if (isNaN(amt) || amt < cfg.minBetRouletteCell) {
                return { success: false, error: `Apuesta mínima por casillero: 🪙 ${cfg.minBetRouletteCell}` };
            }
            totalBet += amt;
        }

        if (totalBet > cfg.maxBetRouletteTotal) {
            return { success: false, error: `Apuesta máxima total: 🪙 ${cfg.maxBetRouletteTotal}` };
        }

        const deduct = EconomyBridge.deductCoins(
            userId, totalBet, 'casino_roulette', 'bet',
            `Tirada de Ruleta (${bets.length} fichas)`
        );
        if (!deduct.success) {
            return { success: false, error: deduct.error || 'Saldo insuficiente' };
        }

        // Server-side RNG
        const randomBuffer = crypto.randomBytes(4);
        const winningNumber = randomBuffer.readUInt32BE(0) % 37;
        const winningColor = this.getNumberColor(winningNumber);

        let totalWon = 0;
        const resultsDetails = [];

        for (const b of bets) {
            const amt = Math.floor(Number(b.amount));
            const type = String(b.type);
            const { won, multiplier, payout } = this.evaluateBet(type, amt, winningNumber, winningColor);
            totalWon += payout;
            resultsDetails.push({ type, amount: amt, won, payout, multiplier });
        }

        let finalBalance = deduct.balance;
        if (totalWon > 0) {
            const add = EconomyBridge.addCoins(
                userId, totalWon, 'casino_roulette', 'win',
                `Acierto en ${winningNumber} (${winningColor})`
            );
            finalBalance = add.balance;
        }

        return {
            success: true,
            winningNumber,
            winningColor,
            totalBet,
            totalWon,
            netProfit: totalWon - totalBet,
            balance: finalBalance,
            bets: resultsDetails
        };
    }
}

module.exports = RouletteEngine;
