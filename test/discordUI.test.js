const test = require('node:test');
const assert = require('node:assert/strict');
const { makeEmbed, notice, parseCoinAmount, walletFields } = require('../utils/discordUI');

test('Formato Prophet: aviso privado y tono de error', () => {
    const payload = notice({ title: 'No disponible', description: 'Intentá otra vez.', tone: 'error' });
    assert.equal(payload.flags, 64);
    assert.equal(payload.embeds.length, 1);
    const embed = payload.embeds[0].toJSON();
    assert.equal(embed.title, 'No disponible');
    assert.match(embed.description, /Intentá/);
    assert.match(embed.footer.text, /Prophet Gaming/);
});

test('Formato Prophet: los campos de embed respetan los límites de Discord', () => {
    const payload = makeEmbed({ title: 'Información', description: 'x'.repeat(5000),
        fields: [{ name: 'A'.repeat(300), value: 'B'.repeat(1300), inline: true }] });
    const embed = payload.toJSON();
    assert.ok(embed.description.length <= 4096);
    assert.ok(embed.fields[0].name.length <= 256);
    assert.ok(embed.fields[0].value.length <= 1024);
});

test('Economía: interpreta miles de manera consistente sin aceptar entradas ambiguas', () => {
    assert.equal(parseCoinAmount('todo', 1000), 1000);
    assert.equal(parseCoinAmount('ALL', 250), 250);
    assert.equal(parseCoinAmount('2.500', 0), 2500);
    assert.equal(parseCoinAmount('2,500', 0), 2500);
    assert.equal(parseCoinAmount('2500', 0), 2500);
    for (const invalid of ['', '0', '-500', '1e3', '100abc', '1.2', '1,2', 'NaN', 'Infinity']) {
        assert.equal(parseCoinAmount(invalid, 0), null, invalid);
    }
    assert.equal(parseCoinAmount('todo', 0), null);
});

test('Economía: recibo muestra efectivo, banco y patrimonio', () => {
    const fields = walletFields(2500, 3000, '$');
    assert.equal(fields.length, 3);
    assert.match(fields[0].value, /2.500/);
    assert.match(fields[1].value, /3.000/);
    assert.match(fields[2].value, /5.500/);
});
