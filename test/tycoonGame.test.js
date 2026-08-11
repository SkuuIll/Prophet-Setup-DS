const test = require('node:test');
const assert = require('node:assert');
const AuthManager = require('../games/common/authManager');
const EconomyBridge = require('../games/common/economyBridge');
const TycoonEngine = require('../games/tycoon/tycoonEngine');

test('Prophet Games: AuthManager create and validate session', () => {
    const testUserId = 'test_user_9999';
    const token = AuthManager.createSession(testUserId, 60);
    assert.ok(token && typeof token === 'string', 'Token should be a non-empty string');

    const session = AuthManager.validateToken(token);
    assert.strictEqual(session.userId, testUserId, 'Session userId should match');

    AuthManager.revokeToken(token);
    const sessionAfter = AuthManager.validateToken(token);
    assert.strictEqual(sessionAfter, null, 'Session should be null after revoke');
});

test('Prophet Games: Tycoon Engine click, buy and offline earnings', () => {
    const testUserId = 'test_user_tycoon_' + Date.now();
    
    // 1. Initial State
    const initState = TycoonEngine.loadUserGameState(testUserId);
    assert.ok(initState.coins >= 0, 'Coins should be non-negative');

    // 2. Click
    const clickRes = TycoonEngine.processClick(testUserId, 1);
    assert.ok(clickRes.success, 'Click should be successful');
    assert.ok(clickRes.coins >= 1, 'Coins should increase after click');

    // 3. Give coins to test buying server
    TycoonEngine.syncPassiveGains(testUserId, 1000);
    const buyRes = TycoonEngine.buyServer(testUserId, 'vps_entry');
    assert.ok(buyRes.success, 'Buying VPS should succeed');
    assert.strictEqual(buyRes.count, 1, 'VPS count should be 1');
    assert.ok(buyRes.productionPerSec >= 1, 'Production per sec should be at least 1');

    // 4. Buy admin
    const buyAdminRes = TycoonEngine.buyAdmin(testUserId, 'mod_junior');
    assert.ok(buyAdminRes.success, 'Buying mod_junior should succeed');
    assert.strictEqual(buyAdminRes.autoClicksPerSec, 1, 'Auto click per sec should be 1');
});
