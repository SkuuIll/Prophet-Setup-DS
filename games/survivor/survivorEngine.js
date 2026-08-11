const { stmts } = require('../../database');
const EconomyBridge = require('../common/economyBridge');
const cfg = require('../common/gamesConfig').survivor;

// Rate-limit: un submit de game_over cada 15s por usuario
const lastSubmit = new Map();

/**
 * Scoring v2:
 *  base = kills*100 + seconds*50 + level*500
 *  + waveReached*800
 *  + bossesKilled*5000
 *  + maxCombo*200
 *  + buildScore (armas/upgrades)
 * Coins con hitos, combo y boss bonus. Caps anti-cheat.
 */
class SurvivorEngine {
    processGameOver(userId, username, payload = {}) {
        // Compat: processGameOver(uid, name, kills, seconds, level)
        let kills, survivalSeconds, levelReached, waveReached, bossesKilled, maxCombo, upgradesTaken;
        if (typeof payload === 'number' || (arguments.length >= 5 && typeof arguments[2] === 'number')) {
            kills = arguments[2];
            survivalSeconds = arguments[3];
            levelReached = arguments[4];
            waveReached = arguments[5] != null ? arguments[5] : 0;
            bossesKilled = arguments[6] || 0;
            maxCombo = arguments[7] || 0;
            upgradesTaken = arguments[8] || 0;
        } else {
            kills = payload.kills;
            survivalSeconds = payload.seconds ?? payload.survivalSeconds;
            levelReached = payload.level ?? payload.levelReached;
            waveReached = payload.wave ?? payload.waveReached ?? 0;
            bossesKilled = payload.bosses ?? payload.bossesKilled ?? 0;
            maxCombo = payload.maxCombo ?? 0;
            upgradesTaken = payload.upgrades ?? payload.upgradesTaken ?? 0;
        }

        const now = Date.now();
        const last = lastSubmit.get(userId) || 0;
        if (now - last < 15000) {
            return { success: false, error: 'Esperá unos segundos antes de enviar otro resultado' };
        }

        let k = Math.max(0, Math.floor(Number(kills) || 0));
        let s = Math.max(0, Math.floor(Number(survivalSeconds) || 0));
        let lvl = Math.max(1, Math.floor(Number(levelReached) || 1));
        let wave = Math.max(0, Math.floor(Number(waveReached) || 0));
        let bosses = Math.max(0, Math.floor(Number(bossesKilled) || 0));
        let combo = Math.max(0, Math.floor(Number(maxCombo) || 0));
        let ups = Math.max(0, Math.floor(Number(upgradesTaken) || 0));

        // Caps anti-cheat
        k = Math.min(k, cfg.maxKillsPerRun);
        s = Math.min(s, cfg.maxSecondsPerRun);
        lvl = Math.min(lvl, cfg.maxLevelPerRun);
        wave = Math.min(wave, 40);
        bosses = Math.min(bosses, 12);
        combo = Math.min(combo, 200);
        ups = Math.min(ups, 60);

        // Consistencia: no más de ~3 kills/seg + margen
        const maxKillsForTime = Math.max(10, Math.floor(s * 3.5) + 50);
        if (k > maxKillsForTime) k = maxKillsForTime;

        const maxLvlForTime = Math.max(1, Math.floor(s / 7) + 3);
        if (lvl > maxLvlForTime) lvl = maxLvlForTime;

        // Oleadas ~ cada 30s + 1 base
        const maxWaveForTime = Math.max(1, Math.floor(s / 25) + 2);
        if (wave > maxWaveForTime) wave = maxWaveForTime;

        // Bosses ~ cada 90s a lo sumo
        const maxBossesForTime = Math.max(0, Math.floor(s / 80));
        if (bosses > maxBossesForTime) bosses = maxBossesForTime;

        const score =
            (k * 100) +
            (s * 50) +
            (lvl * 500) +
            (wave * 800) +
            (bosses * 5000) +
            (combo * 200) +
            (ups * 150);

        let coinsEarned = Math.floor(
            (k * 2) +
            (s * 3) +
            (lvl * 20) +
            (wave * 40) +
            (bosses * 250) +
            Math.min(400, combo * 3)
        );

        const milestones = [];
        for (const m of cfg.milestoneRewards) {
            if (s >= m.seconds) {
                coinsEarned += m.coins;
                milestones.push(m.id);
            }
        }

        // Hitos extra de oleada / boss
        if (wave >= 5) { coinsEarned += 80; milestones.push('wave_5'); }
        if (wave >= 10) { coinsEarned += 200; milestones.push('wave_10'); }
        if (bosses >= 1) { coinsEarned += 120; milestones.push('boss_1'); }
        if (bosses >= 3) { coinsEarned += 350; milestones.push('boss_3'); }
        if (combo >= 25) { coinsEarned += 100; milestones.push('combo_25'); }

        coinsEarned = Math.min(cfg.maxCoinsReward, Math.max(10, coinsEarned));

        stmts.saveSurvivorScore(userId, username, score, k, s, coinsEarned);

        const credit = EconomyBridge.addCoins(
            userId,
            coinsEarned,
            'survivor_2d',
            'run_completed',
            `W${wave} · ${s}s · ${k} kills · ${bosses} bosses · combo ${combo}`
        );

        lastSubmit.set(userId, now);

        return {
            success: true,
            score,
            kills: k,
            survivalSeconds: s,
            levelReached: lvl,
            waveReached: wave,
            bossesKilled: bosses,
            maxCombo: combo,
            coinsEarned,
            milestones,
            newBalance: credit.balance,
            breakdown: {
                kills: k * 100,
                time: s * 50,
                level: lvl * 500,
                wave: wave * 800,
                bosses: bosses * 5000,
                combo: combo * 200,
                upgrades: ups * 150
            }
        };
    }

    getLeaderboard(limit = 10) {
        return stmts.getSurvivorLeaderboard(Math.min(50, Math.max(1, limit)));
    }
}

module.exports = new SurvivorEngine();
