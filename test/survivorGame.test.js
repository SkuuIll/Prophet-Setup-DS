const test = require('node:test');
const assert = require('node:assert');
const SurvivorEngine = require('../games/survivor/survivorEngine');
const { stmts } = require('../database');

test('Survivor: Game over score and reward calculation', () => {
    const testUserId = 'test_survivor_' + Date.now();
    const kills = 50;
    const seconds = 120;
    const level = 6;

    const res = SurvivorEngine.processGameOver(testUserId, 'TestHero', kills, seconds, level);

    assert.ok(res.success, 'Processing game over should succeed');
    // score = 50*100 + 120*50 + 6*500 = 14000 (sin wave/boss/combo)
    assert.strictEqual(res.score, 14000, 'Score should be 14000');
    // coins base = 50*2 + 120*3 + 6*20 = 580 + hito 60s (50) = 630
    assert.strictEqual(res.coinsEarned, 630, 'Coins earned should include milestone bonus');
    assert.ok(res.milestones && res.milestones.includes('survive_1m'), 'Should unlock 1-minute milestone');

    const lb = SurvivorEngine.getLeaderboard(5);
    assert.ok(Array.isArray(lb), 'Leaderboard should be an array');
    const myEntry = lb.find(e => e.user_id === testUserId);
    assert.ok(myEntry, 'Leaderboard must include the test user');
    assert.strictEqual(myEntry.high_score, 14000, 'High score must match');
});

test('Survivor: Rich scoring with waves, bosses and combo', () => {
    const testUserId = 'test_survivor_rich_' + Date.now();
    const res = SurvivorEngine.processGameOver(testUserId, 'WaveHero', {
        kills: 80,
        seconds: 200,
        level: 10,
        wave: 5,
        bosses: 2,
        maxCombo: 30,
        upgrades: 8
    });
    assert.ok(res.success);
    // 80*100 + 200*50 + 10*500 + 5*800 + 2*5000 + 30*200 + 8*150
    // = 8000 + 10000 + 5000 + 4000 + 10000 + 6000 + 1200 = 44200
    assert.strictEqual(res.score, 44200);
    assert.ok(res.coinsEarned > 630);
    assert.ok(res.milestones.includes('wave_5'));
    assert.ok(res.milestones.includes('boss_1'));
    assert.ok(res.breakdown && res.breakdown.bosses === 10000);
});
