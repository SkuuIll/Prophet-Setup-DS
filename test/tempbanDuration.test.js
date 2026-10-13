const test = require('node:test');
const assert = require('node:assert/strict');
const command = require('../commands/mod/tempban');

test('Tempban: analiza toda la duración y rechaza texto malformado', () => {
    const { parseDuration, formatDuration } = command._test;
    assert.equal(parseDuration('30m'), 1800000);
    assert.equal(parseDuration('2h'), 7200000);
    assert.equal(parseDuration('1d12h'), 129600000);
    assert.equal(parseDuration('3d2h15m'), 267300000);
    assert.equal(formatDuration(129600000), '1d 12h');
    for (const invalid of ['30', '30mgarbage', 'x1d', '1d1x', '-4h', '', '31d', '0m', '999999999999999d']) {
        assert.equal(parseDuration(invalid), 0, invalid);
    }
});
