const test = require('node:test');
const assert = require('node:assert/strict');
const TycoonEngine = require('../games/tycoon/tycoonEngine');

test('Tycoon rechaza clics inválidos y limita el spam por usuario', () => {
    const id = 'test_tycoon_rate_' + Date.now();
    assert.equal(TycoonEngine.processClick(id, Infinity).success, false);
    assert.equal(TycoonEngine.processClick(id, -1).success, false);
    assert.equal(TycoonEngine.processClick(id, 'oops').success, false);

    let accepted = 0;
    let rateLimited = false;
    for (let i = 0; i < 10; i++) {
        const res = TycoonEngine.processClick(id, 15);
        if (res.success) accepted += 15;
        else { rateLimited = true; break; }
    }
    assert.equal(accepted, 30);
    assert.equal(rateLimited, true);
});
