const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { stmts, _db } = require('../database');

test('Economía: cobros y apuestas son transaccionales y no admiten saldos negativos', t => {
    const userId = 'test_atomic_' + crypto.randomUUID().replaceAll('-', '');
    t.after(() => {
        _db.prepare('DELETE FROM game_logs WHERE user_id = ?').run(userId);
        _db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    });

    assert.equal(stmts.atomicModifyBalance(userId, 100, 'test', 'deposit').success, true);
    const bet = stmts.atomicModifyBalance(userId, -70, 'test', 'bet');
    assert.equal(bet.success, true);
    assert.equal(bet.balance, 30);
    assert.equal(bet.previousBalance, 100);

    const denied = stmts.atomicModifyBalance(userId, -50, 'test', 'bet');
    assert.equal(denied.success, false);
    assert.equal(denied.balance, 30);

    for (const amount of [NaN, Infinity, -Infinity, 1.25, -0.5, Number.MAX_SAFE_INTEGER + 1]) {
        assert.equal(stmts.atomicModifyBalance(userId, amount, 'test').success, false,
            'Cantidad inválida: ' + amount);
    }
    assert.equal(stmts.getEconomy(userId).balance, 30);
    const logs = _db.prepare('SELECT amount FROM game_logs WHERE user_id = ? ORDER BY id').all(userId);
    assert.deepEqual(logs.map(x => x.amount), [100, -70]);
});

test('Economía: rechaza premios que superarían el límite entero seguro', t => {
    const userId = 'test_atomic_' + crypto.randomUUID().replaceAll('-', '');
    t.after(() => {
        _db.prepare('DELETE FROM game_logs WHERE user_id = ?').run(userId);
        _db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    });
    assert.equal(stmts.atomicModifyBalance(userId, Number.MAX_SAFE_INTEGER, 'test').success, true);
    assert.equal(stmts.atomicModifyBalance(userId, 1, 'test').success, false);
    assert.equal(stmts.getEconomy(userId).balance, Number.MAX_SAFE_INTEGER);
});
