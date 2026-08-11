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
    // score = 50*100 + 120*50 + 6*500 = 5000 + 6000 + 3000 = 14000
    assert.strictEqual(res.score, 14000, 'Score should be 14000');
    // coins = 50*2 + 120*3 + 6*20 = 100 + 360 + 120 = 580
    assert.strictEqual(res.coinsEarned, 580, 'Coins earned should be 580');

    // Verify leaderboard includes the score
    const lb = SurvivorEngine.getLeaderboard(5);
    assert.ok(Array.isArray(lb), 'Leaderboard should be an array');
    const myEntry = lb.find(e => e.user_id === testUserId);
    assert.ok(myEntry, 'Leaderboard must include the test user');
    assert.strictEqual(myEntry.high_score, 14000, 'High score must match');
});
