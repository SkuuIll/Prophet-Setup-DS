const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { stmts, _db } = require('../database');

test('Transferencias: un envío atómico debita y acredita exactamente una vez', t => {
    const sender = 'sender_' + crypto.randomUUID().replaceAll('-', '');
    const recipient = 'receiver_' + crypto.randomUUID().replaceAll('-', '');
    t.after(() => {
        _db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(sender, recipient);
    });

    assert.equal(stmts.atomicModifyBalance(sender, 100, 'test', 'initial').success, true);
    const transfer = stmts.transferMoney(sender, recipient, 35);
    assert.deepEqual(transfer, { success: true, balance: 65, recipientBalance: 35 });
    assert.equal(stmts.getEconomy(sender).balance, 65);
    assert.equal(stmts.getEconomy(recipient).balance, 35);

    assert.equal(stmts.transferMoney(sender, recipient, 70).success, false);
    assert.equal(stmts.transferMoney(sender, recipient, -1).success, false);
    assert.equal(stmts.transferMoney(sender, sender, 5).success, false);
    assert.equal(stmts.transferMoney(sender, recipient, 0.5).success, false);

    assert.equal(stmts.getEconomy(sender).balance, 65);
    assert.equal(stmts.getEconomy(recipient).balance, 35);
    _db.prepare('DELETE FROM game_logs WHERE user_id = ?').run(sender);
});

test('Transferencias: no cobra al remitente si el destinatario alcanzó el límite', t => {
    const sender = 'sender_' + crypto.randomUUID().replaceAll('-', '');
    const recipient = 'receiver_' + crypto.randomUUID().replaceAll('-', '');
    t.after(() => {
        _db.prepare('DELETE FROM game_logs WHERE user_id IN (?, ?)').run(sender, recipient);
        _db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(sender, recipient);
    });

    stmts.atomicModifyBalance(sender, 100);
    stmts.atomicModifyBalance(recipient, Number.MAX_SAFE_INTEGER);
    const denied = stmts.transferMoney(sender, recipient, 1);
    assert.equal(denied.success, false);
    assert.equal(stmts.getEconomy(sender).balance, 100);
    assert.equal(stmts.getEconomy(recipient).balance, Number.MAX_SAFE_INTEGER);
});
