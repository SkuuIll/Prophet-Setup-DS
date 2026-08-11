/**
 * Configuración central del hub de juegos (apuestas, límites, economía soft).
 * Todo es moneda virtual del bot — sin dinero real.
 */

module.exports = {
    casino: {
        minBet: 10,
        maxBet: 50000,
        maxBetRouletteTotal: 100000,
        minBetRouletteCell: 5,
        crashHouseEdge: 0.04, // 96% RTP
        crashHistorySize: 20,
        crashCountdownSec: 5,
        crashPostCrashDelayMs: 3000
    },
    blackjack: {
        minBet: 10,
        maxBet: 25000,
        maxPlayersPerTable: 6,
        blackjackPayout: 2.5, // 3:2 (bet * 2.5 total return)
        dealerStandAt: 17
    },
    truco: {
        minBet: 0,
        maxBet: 50000,
        defaultTarget: 15,
        allowFlor: false // activable en futuro
    },
    uno: {
        minBet: 0,
        maxBet: 50000,
        minPlayers: 2,
        maxPlayers: 6,
        defaultTargetScore: 300, // 0 = quick 1 mano
        allowStackDraw2: true
    },
    tycoon: {
        offlineMaxHours: 12,
        offlineEfficiency: 0.85,
        costRatio: 1.15,
        prestigeMultiplierPerLevel: 0.20,
        prestigeMinProduction: 100, // prod/s mínima para prestigiar
        maxSyncCoinsPerTick: 500000 // anti-cheat client sync
    },
    survivor: {
        maxKillsPerRun: 5000,
        maxSecondsPerRun: 3600,
        maxLevelPerRun: 50,
        maxCoinsReward: 8000,
        milestoneRewards: [
            { seconds: 60, coins: 50, id: 'survive_1m' },
            { seconds: 180, coins: 150, id: 'survive_3m' },
            { seconds: 300, coins: 400, id: 'survive_5m' },
            { seconds: 600, coins: 1000, id: 'survive_10m' },
            { seconds: 900, coins: 1800, id: 'survive_15m' }
        ]
    },
    trivia: {
        defaultQuestions: 10,
        timeLimit: 15,
        // Premios base; se escalan con tamaño de sala y dificultad
        prizes: [3000, 1500, 750],
        perfectBonus: 500,
        streakCap: 8
    },
    cases: {
        pityEpicAt: 25,
        pityLegendaryAt: 80,
        historySize: 20,
        // % del valueCoins acreditado al vender/auto-cash skins no-moneda
        softSellRate: 0.35
    }
};
