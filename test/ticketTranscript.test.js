const test = require('node:test');
const assert = require('node:assert/strict');
const { renderTranscriptLine, createPlainTicketTranscript } = require('../utils/ticketTranscript');

test('Tickets: el historial de respaldo incluye mensajes y adjuntos', async () => {
    const fetched = [];
    const messages = [
        { id: '2', createdTimestamp: 1720000000000, content: 'Mensaje reciente',
            author: { tag: 'UsuarioB' }, attachments: new Map() },
        { id: '1', createdTimestamp: 1719999999000, content: 'Hola',
            author: { tag: 'UsuarioA' }, attachments: new Map([['file', { url: 'https://example.org/prueba.png' }]]) },
    ];
    const channel = {
        id: '123456789012345678',
        messages: { async fetch(options) {
            fetched.push(options);
            if (fetched.length === 1) {
                const map = new Map(messages.map(m => [m.id, m]));
                return { size: map.size, values: () => map.values(), last: () => messages[1] };
            }
            return { size: 0, values: () => [][Symbol.iterator](), last: () => null };
        } },
    };
    const attachment = await createPlainTicketTranscript(channel, '987654321098765432');
    assert.equal(attachment.name, 'ticket-987654321098765432.txt');
    const content = attachment.attachment.toString('utf8');
    assert.match(content, /UsuarioA: Hola/);
    assert.match(content, /https:\/\/example.org\/prueba.png/);
    assert.match(content, /UsuarioB: Mensaje reciente/);
    assert.ok(content.indexOf('UsuarioA: Hola') < content.indexOf('UsuarioB: Mensaje reciente'));
    assert.match(renderTranscriptLine(messages[0]), /UsuarioB: Mensaje reciente/);
});
