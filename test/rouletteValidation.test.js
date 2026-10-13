const test = require('node:test');
const assert = require('node:assert/strict');
const RouletteEngine = require('../games/casino/rouletteEngine');

test('Ruleta: rechaza fichas inválidas antes de descontar monedas', () => {
    assert.equal(RouletteEngine.isValidBetType('red'), true);
    assert.equal(RouletteEngine.isValidBetType('straight:36'), true);
    assert.equal(RouletteEngine.isValidBetType('split:12-15'), true);
    for (const type of ['straight:99', 'split:1-99', 'split:3-3',
        'black:1', 'dozen_7', null, '__proto__']) {
        assert.equal(RouletteEngine.isValidBetType(type), false);
    }

    const wrong = RouletteEngine.spin('123456789012345678', [
        { type: 'straight:99', amount: 20 },
    ]);
    assert.equal(wrong.success, false);
    assert.match(wrong.error, /tipo.*inválido/i);
});

test('Ruleta: límite de fichas y montos infinitos', () => {
    assert.equal(RouletteEngine.spin('123456789012345678',
        Array.from({ length: 100 }, () => ({ type: 'red', amount: 20 }))).success, false);
    assert.equal(RouletteEngine.spin('123456789012345678',
        [{ type: 'red', amount: Infinity }]).success, false);
});
