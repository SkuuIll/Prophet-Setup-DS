const test = require('node:test');
const assert = require('node:assert/strict');
const {
    internalSecretReady,
    verifyInternalSecret,
    validDiscordUserId,
    normalizeSessionMinutes,
} = require('../games/common/internalTokenAuth');

const secret = 'f'.repeat(40);

test('La ruta interna falla cerrada sin secreto o con secreto corto', () => {
    assert.equal(internalSecretReady(''), false);
    assert.equal(internalSecretReady('short'), false);
    assert.equal(verifyInternalSecret('', ''), false);
    assert.equal(verifyInternalSecret('short', 'short'), false);
});

test('El secreto interno exige coincidencia exacta', () => {
    assert.equal(verifyInternalSecret(secret, secret), true);
    assert.equal(verifyInternalSecret(secret, 'f'.repeat(39)), false);
    assert.equal(verifyInternalSecret(secret, 'g'.repeat(40)), false);
    assert.equal(verifyInternalSecret(secret, null), false);
});

test('Solo IDs de usuario Discord con forma válida', () => {
    assert.equal(validDiscordUserId('123456789012345678'), true);
    assert.equal(validDiscordUserId('1234567890123456789'), true);
    assert.equal(validDiscordUserId('1234'), false);
    assert.equal(validDiscordUserId('12345678901234567x'), false);
    assert.equal(validDiscordUserId(123456789012345678), false);
});

test('No permitir sesiones de juego con duración ilimitada o inválida', () => {
    assert.equal(normalizeSessionMinutes(120), 120);
    assert.equal(normalizeSessionMinutes(999999), 180);
    assert.equal(normalizeSessionMinutes('Infinity'), 120);
    assert.equal(normalizeSessionMinutes(-10), 120);
    assert.equal(normalizeSessionMinutes('x'), 120);
    assert.equal(normalizeSessionMinutes(2.9), 2);
});
