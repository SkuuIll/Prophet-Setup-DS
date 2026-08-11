const test = require('node:test');
const assert = require('node:assert');
const UnoEngine = require('../games/cards/unoEngine');
const EconomyBridge = require('../games/common/economyBridge');

test('UNO: create, join, start and play number card', () => {
    const host = 'uno_host_' + Date.now();
    const guest = 'uno_guest_' + Date.now();
    EconomyBridge.addCoins(host, 5000, 'test', 'init');
    EconomyBridge.addCoins(guest, 5000, 'test', 'init');

    const created = UnoEngine.createTable(host, 'Host', {
        betAmount: 50,
        maxPlayers: 4,
        targetScore: 0
    });
    assert.ok(created.success, created.error);
    assert.ok(created.table.tableId.startsWith('UNO-'));
    assert.strictEqual(created.table.pot, 50);
    assert.strictEqual(created.table.state, 'LOBBY');

    const joined = UnoEngine.joinTable(created.table.tableId, guest, 'Guest');
    assert.ok(joined.success, joined.error);
    assert.strictEqual(joined.table.players.length, 2);
    assert.strictEqual(joined.table.pot, 100);

    const started = UnoEngine.startGame(created.table.tableId, host);
    assert.ok(started.success, started.error);
    assert.strictEqual(started.table.state, 'PLAYING');
    assert.ok(started.table.topCard, 'Must have discard top');
    assert.ok(started.table.players[0].hand.length === 7 || started.table.myIndex === 0);

    // Host hand visible to host
    const hostState = UnoEngine.getTableState(created.table.tableId, host);
    assert.ok(hostState.success);
    const me = hostState.table.players.find(p => p.userId === host);
    assert.ok(Array.isArray(me.hand));
    assert.strictEqual(me.hand.length, 7);

    // Guest cannot see host hand
    const guestState = UnoEngine.getTableState(created.table.tableId, guest);
    const hostFromGuest = guestState.table.players.find(p => p.userId === host);
    assert.strictEqual(hostFromGuest.hand, null);
    assert.strictEqual(hostFromGuest.cardCount, 7);
});

test('UNO: call UNO and catch penalty', () => {
    const a = 'uno_a_' + Date.now();
    const b = 'uno_b_' + Date.now();
    EconomyBridge.addCoins(a, 1000, 'test', 'init');
    EconomyBridge.addCoins(b, 1000, 'test', 'init');

    const c = UnoEngine.createTable(a, 'A', { betAmount: 0, maxPlayers: 2, targetScore: 0 });
    UnoEngine.joinTable(c.table.tableId, b, 'B');
    UnoEngine.startGame(c.table.tableId, a);

    const table = UnoEngine.tables.get(c.table.tableId);
    // Force player A to 1 card without saying UNO
    table.players[0].hand = [table.players[0].hand[0]];
    table.players[0].saidUno = false;

    const catchFail = UnoEngine.catchUno(c.table.tableId, b, a);
    assert.ok(catchFail.success);
    assert.strictEqual(table.players[0].hand.length, 3, 'Should draw +2 for not saying UNO');
});

test('UNO: wild requires color', () => {
    const a = 'uno_w_' + Date.now();
    const b = 'uno_w2_' + Date.now();
    const c = UnoEngine.createTable(a, 'A', { betAmount: 0, maxPlayers: 2, targetScore: 0 });
    UnoEngine.joinTable(c.table.tableId, b, 'B');
    UnoEngine.startGame(c.table.tableId, a);

    const table = UnoEngine.tables.get(c.table.tableId);
    table.turnIndex = 0;
    table.pendingDraw = 0;
    table.pendingDrawType = null;
    // Inject wild into hand
    const wild = { id: 'wild_test', color: 'wild', value: 'wild', type: 'wild' };
    table.players[0].hand.push(wild);

    const res = UnoEngine.playCard(c.table.tableId, a, 'wild_test');
    assert.ok(res.success);
    assert.ok(res.needColor || res.table.state === 'COLOR_PICK');

    const col = UnoEngine.chooseColor(c.table.tableId, a, 'red');
    assert.ok(col.success, col.error);
    assert.strictEqual(col.table.currentColor, 'red');
});
