const test = require('node:test');
const assert = require('node:assert/strict');
const { isLocalDemoAllowed } = require('../games/common/websocketSecurity');

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
