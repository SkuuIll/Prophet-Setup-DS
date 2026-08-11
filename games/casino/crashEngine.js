const crypto = require('crypto');
const EconomyBridge = require('../common/economyBridge');
const cfg = require('../common/gamesConfig').casino;

class CrashEngine {
    constructor() {
        this.state = 'WAITING'; // WAITING | RUNNING | CRASHED
        this.roundId = 0;
        this.countdown = cfg.crashCountdownSec;
        this.currentMultiplier = 1.00;
        this.crashPoint = 1.00;
        this.serverSeed = '';
        this.salt = '';
        this.currentHash = '';
        this.startTime = 0;
        this.activeBets = new Map();
        this.cashoutLocks = new Set(); // evita doble cashout / race
        this.history = [];
        this.broadcastCallback = null;
        this.loopInterval = null;

        this.initRound();
        this.startLoop();
    }

    setBroadcast(cb) {
        this.broadcastCallback = cb;
    }

    broadcast(data) {
        if (this.broadcastCallback) this.broadcastCallback(data);
    }

    /**
     * Provably Fair: hash = SHA256(serverSeed + salt) se publica ANTES.
     * Tras el crash se revela seed+salt para verificar.
     */
    initRound() {
        this.state = 'WAITING';
        this.countdown = cfg.crashCountdownSec;
        this.currentMultiplier = 1.00;
        this.activeBets.clear();
        this.cashoutLocks.clear();
        this.roundId++;

        this.serverSeed = crypto.randomBytes(32).toString('hex');
        this.salt = crypto.randomBytes(16).toString('hex');
        this.currentHash = crypto.createHash('sha256')
            .update(this.serverSeed + this.salt)
            .digest('hex');

        const intVal = parseInt(this.currentHash.slice(0, 8), 16);
        const r = intVal / Math.pow(2, 32);
        const rtp = Math.round((1 - cfg.crashHouseEdge) * 100); // 96

        // ~1/25 instant crash at 1.00x (house edge component)
        if (intVal % 25 === 0) {
            this.crashPoint = 1.00;
        } else {
            let cp = Math.floor((rtp / (1 - r))) / 100;
            if (cp < 1.00) cp = 1.00;
            this.crashPoint = Math.min(cp, 500.00);
        }
    }

    startLoop() {
        if (this.loopInterval) clearInterval(this.loopInterval);

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
                // multiplicador = e^(0.065 * t)
                const mult = Math.max(1.00, Math.floor(Math.exp(0.065 * elapsedSec) * 100) / 100);
                this.currentMultiplier = mult;

                // Auto cashouts (sin race: processCashout es idempotente)
                for (const bet of this.activeBets.values()) {
                    if (!bet.cashedOut && bet.autoCashout > 0 && mult >= bet.autoCashout) {
                        this.processCashout(bet.userId, bet.autoCashout);
                    }
                }

                if (mult >= this.crashPoint) {
                    this.state = 'CRASHED';
                    this.currentMultiplier = this.crashPoint;

                    this.history.unshift({
                        roundId: this.roundId,
                        crashPoint: this.crashPoint
                    });
                    if (this.history.length > cfg.crashHistorySize) this.history.pop();

                    this.broadcast({
                        type: 'crash:crashed',
                        roundId: this.roundId,
                        crashPoint: this.crashPoint,
                        serverSeed: this.serverSeed,
                        salt: this.salt,
                        hash: this.currentHash,
                        bets: this.getBetsSummary()
                    });

                    setTimeout(() => this.initRound(), cfg.crashPostCrashDelayMs);
                } else {
                    this.broadcast({
                        type: 'crash:tick',
                        multiplier: mult,
                        bets: this.getBetsSummary()
                    });
                }
            }
        }, 100);

        if (this.loopInterval.unref) this.loopInterval.unref();
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
        if (isNaN(amt) || amt < cfg.minBet) {
            return { success: false, error: `Apuesta mínima: 🪙 ${cfg.minBet}` };
        }
        if (amt > cfg.maxBet) {
            return { success: false, error: `Apuesta máxima: 🪙 ${cfg.maxBet}` };
        }

        if (this.activeBets.has(userId)) {
            return { success: false, error: 'Ya apostaste en esta ronda' };
        }

        const deduct = EconomyBridge.deductCoins(
            userId, amt, 'casino_crash', 'bet', `Ronda #${this.roundId}`
        );
        if (!deduct.success) {
            return { success: false, error: deduct.error || 'Saldo insuficiente' };
        }

        const autoCo = Number(autoCashout);
        this.activeBets.set(userId, {
            userId,
            username: username || `Jugador_${String(userId).slice(-4)}`,
            amount: amt,
            autoCashout: autoCo > 1.01 ? Math.floor(autoCo * 100) / 100 : 0,
            cashedOut: false,
            cashoutMultiplier: 0,
            winAmount: 0
        });

        this.broadcast({
            type: 'crash:bet_placed',
            bets: this.getBetsSummary()
        });

        return {
            success: true,
            balance: deduct.balance,
            amount: amt,
            roundId: this.roundId
        };
    }

    /**
     * Cashout atómico: lock por userId evita doble retiro concurrente.
     */
    processCashout(userId, requestedMultiplier = null) {
        if (this.state !== 'RUNNING') {
            return { success: false, error: 'La ronda no está activa o ya explotó' };
        }

        if (this.cashoutLocks.has(userId)) {
            return { success: false, error: 'Cashout en proceso' };
        }

        const bet = this.activeBets.get(userId);
        if (!bet) {
            return { success: false, error: 'No tenés una apuesta activa en esta ronda' };
        }
        if (bet.cashedOut) {
            return { success: false, error: 'Ya retiraste tus ganancias' };
        }

        // Lock antes de cualquier side-effect
        this.cashoutLocks.add(userId);

        try {
            // Re-check after lock
            if (this.state !== 'RUNNING' || bet.cashedOut) {
                return { success: false, error: 'Cashout no disponible' };
            }

            // Multiplicador efectivo: nunca por encima del actual ni del crash
            let mult = this.currentMultiplier;
            if (requestedMultiplier && requestedMultiplier > 1) {
                mult = Math.min(mult, Math.floor(Number(requestedMultiplier) * 100) / 100);
            }
            if (mult > this.crashPoint || mult < 1.01) {
                return { success: false, error: '¡Demasiado tarde! La nave ya explotó' };
            }

            // Marcar cashedOut ANTES de acreditar (idempotencia)
            bet.cashedOut = true;
            const winAmount = Math.floor(bet.amount * mult);
            bet.cashoutMultiplier = mult;
            bet.winAmount = winAmount;

            const add = EconomyBridge.addCoins(
                userId, winAmount, 'casino_crash', 'win',
                `Cashout ${mult}x · Ronda #${this.roundId}`
            );

            this.broadcast({
                type: 'crash:player_cashout',
                userId,
                username: bet.username,
                multiplier: mult,
                winAmount,
                bets: this.getBetsSummary()
            });

            return {
                success: true,
                multiplier: mult,
                winAmount,
                balance: add.balance
            };
        } finally {
            this.cashoutLocks.delete(userId);
        }
    }

    getState() {
        return {
            state: this.state,
            roundId: this.roundId,
            countdown: Math.max(0, Math.round(this.countdown * 10) / 10),
            currentMultiplier: this.currentMultiplier,
            hash: this.currentHash,
            history: this.history,
            bets: this.getBetsSummary(),
            limits: { minBet: cfg.minBet, maxBet: cfg.maxBet }
        };
    }

    /** Verificación offline de una ronda (para UI "Provably Fair") */
    static verifyRound(serverSeed, salt, expectedHash) {
        const hash = crypto.createHash('sha256').update(serverSeed + salt).digest('hex');
        return hash === expectedHash;
    }
}

module.exports = new CrashEngine();
