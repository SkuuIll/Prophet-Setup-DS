const test = require('node:test');
const assert = require('node:assert/strict');
const { stmts } = require('../database');
const TycoonEngine = require('../games/tycoon/tycoonEngine');

test('Tycoon: clientes no pueden inyectar ganancias sin producción', () => {
    const id = 'test_tycoon_zero_prod_' + Date.now();
    stmts.saveTycoonSave(id, 0, {}, {}, 0, Date.now() - 30000);
    const answer = TycoonEngine.syncPassiveGains(id, Number.MAX_SAFE_INTEGER);
    assert.equal(answer.success, true);
    assert.equal(answer.applied, 0);
    assert.equal(answer.coins, 0);
});

test('Tycoon: ganancias pasivas según producción real, no monto enviado', () => {
    const id = 'test_tycoon_passive_' + Date.now();
    stmts.saveTycoonSave(id, 0, { vps_entry: 2 }, {}, 0, Date.now() - 2600);
    const first = TycoonEngine.syncPassiveGains(id, 999999999);
    assert.equal(first.success, true);
    assert.ok(first.applied >= 2 && first.applied <= 10,
        'Dos generadores no pueden dar millones de monedas en dos segundos');
    const repeated = TycoonEngine.syncPassiveGains(id, 999999999);
    assert.equal(repeated.applied, 0,
        'Repetir un sync inmediatamente no debe aumentar el saldo');
});
