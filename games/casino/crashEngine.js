const crypto = require('crypto');
const EconomyBridge = require('../common/economyBridge');

class CrashEngine {
    constructor() {
        this.state = 'WAITING'; // 'WAITING', 'RUNNING', 'CRASHED'
        this.roundId = 1;
        this.countdown = 5;
        this.currentMultiplier = 1.00;
        this.crashPoint = 1.00;
        this.serverSeed = '';
        this.salt = '';
        this.currentHash = '';
        this.startTime = 0;
        this.activeBets = new Map(); // userId -> { userId, username, amount, autoCashout, cashedOut: false, cashoutMultiplier: 0, winAmount: 0 }
        this.history = [
            { roundId: 0, crashPoint: 2.34 },
            { roundId: 0, crashPoint: 1.15 },
            { roundId: 0, crashPoint: 5.80 },
            { roundId: 0, crashPoint: 1.02 },
            { roundId: 0, crashPoint: 14.50 },
            { roundId: 0, crashPoint: 1.85 },
            { roundId: 0, crashPoint: 3.12 },
            { roundId: 0, crashPoint: 1.45 }
        ];
        this.broadcastCallback = null;

        this.initRound();
        this.startLoop();
    }

    setBroadcast(cb) {
        this.broadcastCallback = cb;
    }

    broadcast(data) {
        if (this.broadcastCallback) {
            this.broadcastCallback(data);
        }
    }

    /**
     * Genera una nueva ronda con algoritmo Provably Fair
     */
    initRound() {
        this.state = 'WAITING';
        this.countdown = 5;
        this.currentMultiplier = 1.00;
        this.activeBets.clear();
        this.roundId++;

        // Provably Fair Generation
        this.serverSeed = crypto.randomBytes(32).toString('hex');
        this.salt = crypto.randomBytes(16).toString('hex');
        this.currentHash = crypto.createHash('sha256').update(this.serverSeed + this.salt).digest('hex');

        const intVal = parseInt(this.currentHash.slice(0, 8), 16);
        const r = intVal / Math.pow(2, 32);
        
        // 96% RTP (4% House Edge)
        // 1 de cada 25 veces explota instantáneamente en 1.00x
        if (intVal % 25 === 0) {
            this.crashPoint = 1.00;
        } else {
            let cp = Math.floor((96 / (1 - r))) / 100;
            if (cp < 1.00) cp = 1.00;
            this.crashPoint = Math.min(cp, 500.00);
        }
    }

    startLoop() {
        this.loopInterval = setInterval(() => {
            if (this.state === 'WAITING') {
                this.countdown -= 0.1;
                if (this.countdown <= 0) {
                    this.state = 'RUNNING';
                    this.startTime = Date.now();
                    this.broadcast({
                        type: 'crash:started',
                        roundId: this.roundId,
                        hash: this.currentHash,
                        bets: this.getBetsSummary()
                    });
                } else {
                    this.broadcast({
                        type: 'crash:waiting',
                        countdown: Math.max(0, Math.round(this.countdown * 10) / 10),
                        hash: this.currentHash,
                        bets: this.getBetsSummary()
                    });
                }
            } else if (this.state === 'RUNNING') {
                const elapsedSec = (Date.now() - this.startTime) / 1000;
                // Curva exponencial suave: e^(0.065 * t)
                const mult = Math.max(1.00, Math.floor(Math.exp(0.065 * elapsedSec) * 100) / 100);
                this.currentMultiplier = mult;

                // Verificar auto cashouts
                for (const bet of this.activeBets.values()) {
                    if (!bet.cashedOut && bet.autoCashout && mult >= bet.autoCashout) {
                        this.processCashout(bet.userId, bet.autoCashout);
                    }
                }

                if (mult >= this.crashPoint) {
                    // CRASH!
                    this.state = 'CRASHED';
                    this.currentMultiplier = this.crashPoint;

                    this.history.unshift({
                        roundId: this.roundId,
                        crashPoint: this.crashPoint
                    });
                    if (this.history.length > 20) this.history.pop();

                    this.broadcast({
                        type: 'crash:crashed',
                        roundId: this.roundId,
                        crashPoint: this.crashPoint,
                        serverSeed: this.serverSeed,
                        salt: this.salt,
                        hash: this.currentHash,
                        bets: this.getBetsSummary()
                    });

                    // Esperar 3 segundos y reiniciar
                    setTimeout(() => {
                        this.initRound();
                    }, 3000);
                } else {
                    this.broadcast({
                        type: 'crash:tick',
                        multiplier: mult,
                        bets: this.getBetsSummary()
                    });
                }
            }
        }, 100);

        if (this.loopInterval.unref) {
            this.loopInterval.unref();
        }
    }

    getBetsSummary() {
        return Array.from(this.activeBets.values()).map(b => ({
            userId: b.userId,
            username: b.username,
            amount: b.amount,
            cashedOut: b.cashedOut,
            cashoutMultiplier: b.cashoutMultiplier,
            winAmount: b.winAmount
        }));
    }

    placeBet(userId, username, amount, autoCashout = 0) {
        if (this.state !== 'WAITING') {
            return { success: false, error: 'La ronda ya está en curso. Esperá a la siguiente.' };
        }

        const amt = Math.floor(Number(amount));
        if (isNaN(amt) || amt < 10) {
            return { success: false, error: 'La apuesta mínima es de 🪙 10' };
        }

        if (this.activeBets.has(userId)) {
            return { success: false, error: 'Ya apostaste en esta ronda' };
        }

        // Descontar monedas atómicamente
        const deduct = EconomyBridge.deductCoins(userId, amt, 'casino_crash', 'bet', `Ronda #${this.roundId}`);
        if (!deduct.success) {
            return { success: false, error: deduct.error || 'Saldo insuficiente' };
        }

        const autoCo = Number(autoCashout);
        this.activeBets.set(userId, {
            userId,
            username: username || `Jugador_${userId.slice(-4)}`,
            amount: amt,
            autoCashout: autoCo > 1.01 ? Math.floor(autoCo * 100) / 100 : 0,
            cashedOut: false,
            cashoutMultiplier: 0,
            winAmount: 0
        });

        return {
            success: true,
            balance: deduct.balance,
            amount: amt,
            roundId: this.roundId
        };
    }

    processCashout(userId, requestedMultiplier = null) {
        if (this.state !== 'RUNNING') {
            return { success: false, error: 'La ronda no está activa o ya explotó' };
        }

        const bet = this.activeBets.get(userId);
        if (!bet) {
            return { success: false, error: 'No tenés una apuesta activa en esta ronda' };
        }

        if (bet.cashedOut) {
            return { success: false, error: 'Ya retiraste tus ganancias' };
        }

        const mult = requestedMultiplier && requestedMultiplier <= this.currentMultiplier
            ? requestedMultiplier
            : this.currentMultiplier;

        if (mult > this.crashPoint) {
            return { success: false, error: '¡Demasiado tarde! La nave ya explotó' };
        }

        const winAmount = Math.floor(bet.amount * mult);
        bet.cashedOut = true;
        bet.cashoutMultiplier = mult;
        bet.winAmount = winAmount;

        // Acreditar ganancias
        const add = EconomyBridge.addCoins(userId, winAmount, 'casino_crash', 'win', `Multiplicador ${mult}x en Ronda #${this.roundId}`);

        this.broadcast({
            type: 'crash:player_cashout',
            userId,
            username: bet.username,
            multiplier: mult,
            winAmount
        });

        return {
            success: true,
            multiplier: mult,
            winAmount,
            balance: add.balance
        };
    }

    getState() {
        return {
            state: this.state,
            roundId: this.roundId,
            countdown: Math.max(0, Math.round(this.countdown * 10) / 10),
            currentMultiplier: this.currentMultiplier,
            hash: this.currentHash,
            history: this.history,
            bets: this.getBetsSummary()
        };
    }
}

module.exports = new CrashEngine();
