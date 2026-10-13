const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { stmts, _db } = require('../database');
const command = require('../commands/context/darCoins');

test('Dar Coins (contexto): rechaza importes mal formados y transfiere íntegramente', async t => {
    const senderId = 'ctx_sender_' + crypto.randomUUID().replaceAll('-', '');
    const recipientId = 'ctx_receiver_' + crypto.randomUUID().replaceAll('-', '');
    t.after(() => _db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(senderId, recipientId));
    stmts.addMoney(senderId, 100);

    const messages = [];
    const user = { id: senderId, tag: 'Sender#0',
        displayAvatarURL: () => 'https://example.com/a.png', toString: () => '<@sender>' };
    const recipient = { id: recipientId, bot: false, tag: 'Receiver#0',
        send: async () => {}, toString: () => '<@receiver>' };
    const makeInteraction = raw => ({
        customId: 'pay_modal_' + recipientId,
        fields: { getTextInputValue: () => raw },
        user,
        client: { users: { fetch: async () => recipient } },
        reply: async msg => { messages.push(msg); return msg; },
    });

    await command.handleModal(makeInteraction('-20'));
    await command.handleModal(makeInteraction('1e2'));
    assert.equal(stmts.getEconomy(senderId).balance, 100);
    assert.equal(stmts.getEconomy(recipientId).balance, 0);

    await command.handleModal(makeInteraction('25'));
    assert.equal(stmts.getEconomy(senderId).balance, 75);
    assert.equal(stmts.getEconomy(recipientId).balance, 25);
    assert.equal(messages.length, 3);
});
