const test = require('node:test');
const assert = require('node:assert/strict');
const EconomyBridge = require('../games/common/economyBridge');

test('La economía valida cantidades positivas y enteras seguras', () => {
    assert.equal(EconomyBridge.parsePositiveCoins(12), 12);
    assert.equal(EconomyBridge.parsePositiveCoins('3.9'), 3);
    for (const amount of [-1, 0, 'Infinity', Infinity, NaN, Number.MAX_VALUE,
        Number.MAX_SAFE_INTEGER + 1, 'abc', null]) {
        assert.equal(EconomyBridge.parsePositiveCoins(amount), null,
            `Monto inválido aceptado: ${String(amount)}`);
    }
});

test('La economía rechaza montos negativos antes de tocar SQLite', () => {
    const debit = EconomyBridge.deductCoins('123456789012345678', -1000, 'test');
    const credit = EconomyBridge.addCoins('123456789012345678', Infinity, 'test');
    assert.equal(debit.success, false);
    assert.equal(credit.success, false);
});
