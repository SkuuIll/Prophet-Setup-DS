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

    // 3. Inyectar monedas soft (simula progreso legítimo; sync tiene anti-cheat)
    const { stmts } = require('../database');
    stmts.saveTycoonSave(testUserId, 5000, {}, {}, 0, Date.now());

    // Rehidratar lifetime vía clicks para desbloqueos
    for (let i = 0; i < 5; i++) TycoonEngine.processClick(testUserId, 10);

    const buyRes = TycoonEngine.buyServer(testUserId, 'vps_entry');
    assert.ok(buyRes.success, `Buying VPS should succeed: ${buyRes.error || ''}`);
    assert.strictEqual(buyRes.count, 1, 'VPS count should be 1');
    assert.ok(buyRes.productionPerSec >= 1, 'Production per sec should be at least 1');

    // 4. Buy admin (unlock por monedas + lifetime + gastado)
    const buyAdminRes = TycoonEngine.buyAdmin(testUserId, 'mod_junior');
    assert.ok(buyAdminRes.success, `Buying mod_junior should succeed: ${buyAdminRes.error || ''}`);
    assert.strictEqual(buyAdminRes.autoClicksPerSec, 1, 'Auto click per sec should be 1');

    // 5. Research tree
    const resTree = TycoonEngine.buyResearch(testUserId, 'better_cooling');
    assert.ok(resTree.success, `Research should succeed: ${resTree.error || ''}`);
    assert.ok(resTree.multiplier > 1, 'Research should raise multiplier');

    // 6. Sync anti-cheat: no debe aceptar sumas absurdas
    const before = TycoonEngine.loadUserGameState(testUserId);
    const sync = TycoonEngine.syncPassiveGains(testUserId, 999999999);
    assert.ok(sync.success);
    assert.ok(sync.coins < before.coins + 1000000, 'Sync must cap absurd client claims');
});
