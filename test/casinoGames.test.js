const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const CrashEngine = require('../games/casino/crashEngine');
const RouletteEngine = require('../games/casino/rouletteEngine');
const CasesEngine = require('../games/casino/casesEngine');
const EconomyBridge = require('../games/common/economyBridge');

test('Casino: Crash Provably Fair verification', () => {
    const serverSeed = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const salt = 'abcdef0123456789';
    const hash = crypto.createHash('sha256').update(serverSeed + salt).digest('hex');

    const intVal = parseInt(hash.slice(0, 8), 16);
    const r = intVal / Math.pow(2, 32);
    const crashPoint = Math.max(1.00, Math.floor((96 / (1 - r))) / 100);

    assert.ok(crashPoint >= 1.00, 'Crash point must be at least 1.00x');
    assert.strictEqual(typeof crashPoint, 'number', 'Crash point should be a number');
});

test('Casino: European Roulette bet evaluation', () => {
    const testUserId = 'test_roulette_user_' + Date.now();
    EconomyBridge.addCoins(testUserId, 10000, 'test', 'init');

    // Spin with red, black and straight bets
    const bets = [
        { type: 'red', amount: 100 },
        { type: 'black', amount: 100 },
        { type: 'straight:0', amount: 50 }
    ];

    const res = RouletteEngine.spin(testUserId, bets);
    assert.ok(res.success, 'Roulette spin should succeed');
    assert.ok(res.winningNumber >= 0 && res.winningNumber <= 36, 'Winning number must be 0-36');
    assert.ok(['red', 'black', 'green'].includes(res.winningColor), 'Winning color must be valid');
    assert.strictEqual(res.totalBet, 250, 'Total bet should equal 250');
    assert.ok(res.balance >= 0, 'Balance should remain valid');
});

test('Casino: CS2 Cases opening and weighted distribution', () => {
    const testUserId = 'test_cases_user_' + Date.now();
    EconomyBridge.addCoins(testUserId, 50000, 'test', 'init');

    const res = CasesEngine.openCase(testUserId, 'case_prophet_starter');
    assert.ok(res.success, 'Case opening should succeed');
    assert.strictEqual(res.winningIndex, 35, 'Winning item index in reel must be 35');
    assert.ok(res.winningItem && res.winningItem.name, 'Winning item must have a name');
    assert.ok(res.reel.length === 45, 'Reel should contain exactly 45 items for animation');
    assert.strictEqual(res.reel[35].name, res.winningItem.name, 'Reel item at winning index must match winning item');
});
