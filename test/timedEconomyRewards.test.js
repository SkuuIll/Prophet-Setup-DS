const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { stmts, _db } = require('../database');

test('Daily y Work: cooldown y acreditación en una única transacción', t => {
    const userId = 'reward_test_' + crypto.randomUUID().replaceAll('-', '');
    t.after(() => _db.prepare('DELETE FROM users WHERE id = ?').run(userId));
    const now = Date.now();
    const cooldown = 1800000;

    const daily = stmts.claimTimedReward(userId, 'daily', 500, now, cooldown);
    assert.equal(daily.success, true);
    assert.equal(daily.balance, 500);
    assert.equal(stmts.claimTimedReward(userId, 'daily', 500, now, cooldown).success, false);
    assert.equal(stmts.getEconomy(userId).balance, 500);

    const work = stmts.claimTimedReward(userId, 'work', 100, now, cooldown);
    assert.equal(work.success, true);
    assert.equal(stmts.claimTimedReward(userId, 'work', 100, now + 1, cooldown).success, false);
    assert.equal(stmts.getEconomy(userId).balance, 600);
    assert.equal(stmts.claimTimedReward(userId, 'work', 100, now + cooldown, cooldown).success, true);
    assert.equal(stmts.getEconomy(userId).balance, 700);
});

test('Daily y Work: valores inválidos no acreditan monedas', t => {
    const userId = 'reward_test_' + crypto.randomUUID().replaceAll('-', '');
    t.after(() => _db.prepare('DELETE FROM users WHERE id = ?').run(userId));
    const now = Date.now();
    for (const [kind, amount, cooldown] of [
        ['fake', 10, 1000],
        ['daily', -100, 1000],
        ['daily', 1.5, 1000],
        ['work', 100, -1],
        ['work', Infinity, 1000],
    ]) {
        assert.equal(stmts.claimTimedReward(userId, kind, amount, now, cooldown).success, false);
    }
    assert.equal(stmts.getEconomy(userId).balance, 0);
});
