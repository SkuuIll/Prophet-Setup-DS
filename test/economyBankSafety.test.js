const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { _db, stmts } = require('../database');

test('Banco: depósitos/retiros no duplican ni crean monedas negativas', t => {
    const id = 'bank_test_' + crypto.randomUUID().replaceAll('-', '');
    t.after(() => _db.prepare('DELETE FROM users WHERE id = ?').run(id));

    assert.equal(stmts.addMoney(id, 100), 100);
    assert.deepEqual(stmts.transferBank(id, 30, 'dep'),
        { success: true, balance: 70, bank: 30 });
    assert.deepEqual(stmts.transferBank(id, 15, 'with'),
        { success: true, balance: 85, bank: 15 });

    for (const amount of [-50, 0, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        assert.equal(stmts.transferBank(id, amount, 'dep'), false);
        assert.equal(stmts.transferBank(id, amount, 'with'), false);
        assert.equal(stmts.removeMoney(id, amount), false);
    }
    assert.equal(stmts.transferBank(id, 1, 'unknown'), false);
    assert.equal(stmts.transferBank(id, 20, 'with'), false);
    assert.equal(stmts.transferBank(id, 86, 'dep'), false);
    assert.equal(stmts.getEconomy(id).balance, 85);
    assert.equal(stmts.getEconomy(id).bank, 15);
    assert.equal(stmts.removeMoney(id, 50), true);
    assert.equal(stmts.getEconomy(id).balance, 35);
});

test('Saldo: impide altas negativas y créditos mayores al límite seguro', t => {
    const id = 'bank_test_' + crypto.randomUUID().replaceAll('-', '');
    t.after(() => _db.prepare('DELETE FROM users WHERE id = ?').run(id));
    assert.throws(() => stmts.addMoney(id, -1), RangeError);
    assert.throws(() => stmts.addMoney(id, Infinity), RangeError);
    assert.equal(stmts.addMoney(id, Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
    assert.throws(() => stmts.addMoney(id, 1), RangeError);
    assert.equal(stmts.getEconomy(id).balance, Number.MAX_SAFE_INTEGER);
});
