'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const bardeoCommand = require('../commands/fun/bardeo');
const fakebanCommand = require('../commands/fun/fakeban');
const ascensorCommand = require('../commands/admin/ascensor');

test('el comando /bardeo tiene estructura y opciones válidas', () => {
    assert.ok(bardeoCommand.data, 'Debe exportar data de slash command');
    assert.equal(bardeoCommand.data.name, 'bardeo');
    assert.ok(typeof bardeoCommand.execute === 'function', 'Debe tener función execute');

    const json = bardeoCommand.data.toJSON();
    const soundOpt = json.options.find(opt => opt.name === 'sonido');
    assert.ok(soundOpt, 'Debe tener opción de sonido');
    assert.equal(soundOpt.required, true);
    assert.ok(soundOpt.choices.length >= 6, 'Debe tener al menos 6 opciones de sonido');
});

test('el comando /fakeban tiene estructura y opciones válidas', () => {
    assert.ok(fakebanCommand.data, 'Debe exportar data de slash command');
    assert.equal(fakebanCommand.data.name, 'fakeban');
    assert.ok(typeof fakebanCommand.execute === 'function', 'Debe tener función execute');

    const json = fakebanCommand.data.toJSON();
    const userOpt = json.options.find(opt => opt.name === 'usuario');
    assert.ok(userOpt, 'Debe tener opción de usuario');
    assert.equal(userOpt.required, true);
});

test('el comando /ascensor tiene estructura y permisos válidos', () => {
    assert.ok(ascensorCommand.data, 'Debe exportar data de slash command');
    assert.equal(ascensorCommand.data.name, 'ascensor');
    assert.ok(typeof ascensorCommand.execute === 'function', 'Debe tener función execute');

    const json = ascensorCommand.data.toJSON();
    assert.ok(json.default_member_permissions, 'Debe requerir permisos especiales');
    const userOpt = json.options.find(opt => opt.name === 'usuario');
    assert.ok(userOpt, 'Debe tener opción de usuario');
    assert.equal(userOpt.required, true);
});
