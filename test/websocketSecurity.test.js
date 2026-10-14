const test = require('node:test');
const assert = require('node:assert/strict');
const { isLocalDemoAllowed, consumeMessageBudget, MAX_MESSAGES_PER_WINDOW, MESSAGE_WINDOW_MS } = require('../games/common/websocketSecurity');

test('Un visitante público nunca puede utilizar la sesión demo', () => {
    assert.equal(isLocalDemoAllowed({
        enabled: 'true', nodeEnv: 'development', address: '200.89.178.47',
    }), false);
});

test('Ni siquiera loopback habilita demo en producción', () => {
    assert.equal(isLocalDemoAllowed({
        enabled: 'true', nodeEnv: 'production', address: '127.0.0.1',
    }), false);
});

test('Demo local exige habilitación explícita', () => {
    assert.equal(isLocalDemoAllowed({
        enabled: 'false', nodeEnv: 'development', address: '127.0.0.1',
    }), false);
    assert.equal(isLocalDemoAllowed({
        enabled: 'true', nodeEnv: 'development', address: '::1',
    }), true);
});


test('El presupuesto de mensajes WS limita spam y se restaura en una ventana nueva', () => {
    const budget = { startedAt: 1000, count: 0 };
    for (let i = 0; i < MAX_MESSAGES_PER_WINDOW; i++) {
        assert.equal(consumeMessageBudget(budget, 1000 + i), true);
    }
    assert.equal(consumeMessageBudget(budget, 1500), false);
    assert.equal(consumeMessageBudget(budget, 1000 + MESSAGE_WINDOW_MS), true);
    assert.equal(budget.count, 1);
});
