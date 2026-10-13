const test = require('node:test');
const assert = require('node:assert/strict');
const { stmts } = require('../database');
const { cerrarTicket } = require('../modules/tickets');

test('Tickets: si falla el archivado nunca se elimina el canal ni su registro', async t => {
    const originalGet = stmts.getTicket;
    const originalDelete = stmts.deleteTicket;
    const oldLog = console.error;
    const oldWarn = console.warn;
    let deleted = 0, deletedRow = 0, response;
    stmts.getTicket = () => ({ user_id: '123456789012345678' });
    stmts.deleteTicket = () => { deletedRow++; };
    console.error = () => {};
    console.warn = () => {};
    t.after(() => {
        stmts.getTicket = originalGet;
        stmts.deleteTicket = originalDelete;
        console.error = oldLog;
        console.warn = oldWarn;
    });
    await cerrarTicket({
        channelId: '987654321098765432',
        channel: {
            id: '987654321098765432',
            messages: { fetch: async () => new Map() },
            delete: async () => { deleted++; },
        },
        user: { id: '555555555555555555', tag: 'Moderador' },
        client: { users: { fetch: async () => ({ send: async () => {} }) } },
        guild: { name: 'Test', channels: { cache: { get: () => null } } },
        reply: async () => {},
        editReply: async x => { response = x; },
    });
    assert.equal(deleted, 0);
    assert.equal(deletedRow, 0);
    assert.match(JSON.stringify(response), /permanecerá abierto/);
});
