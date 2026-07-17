'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateMathExpression } = require('../utils/mathExpression');

test('evalúa precedencia, paréntesis y potencias', () => {
    assert.equal(evaluateMathExpression('2 + 3 * 4'), 14);
    assert.equal(evaluateMathExpression('(2 + 3) * 4'), 20);
    assert.equal(evaluateMathExpression('2^3^2'), 512);
    assert.equal(evaluateMathExpression('2**8'), 256);
});

test('evalúa funciones y constantes permitidas', () => {
    assert.equal(evaluateMathExpression('sqrt(16) + abs(-2)'), 6);
    assert.ok(Math.abs(evaluateMathExpression('sin(pi/2)') - 1) < 1e-12);
});

test('rechaza propiedades, funciones desconocidas y expresiones incompletas', () => {
    assert.throws(() => evaluateMathExpression('constructor.constructor(1)'), /Carácter no permitido/);
    assert.throws(() => evaluateMathExpression('random()'), /Función no soportada/);
    assert.throws(() => evaluateMathExpression('2 +'), /Expresión incompleta/);
    assert.throws(() => evaluateMathExpression('1 / 0'), /dividir por cero/);
});
