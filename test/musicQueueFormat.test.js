const test = require('node:test');
const assert = require('node:assert/strict');
const { _test } = require('../commands/music/queue');

test('Música: duraciones de cola calculadas sin NaN ni saltos', () => {
    assert.equal(_test.formatDuration([]), '0 min');
    assert.equal(_test.formatDuration([{ duration: '3:15' }, { duration: '1:45' }]), '5 min');
    assert.equal(_test.formatDuration([{ duration: '1:10:00' }, { duration: '0:50:00' }]), '2 h 0 min');
    assert.equal(_test.formatDuration([{ duration: 'unknown' }, { duration: '2:00' }]), '2 min');
});
