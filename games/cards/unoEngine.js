/**
 * ═══ UNO CLÁSICO MULTIJUGADOR ═══
 * Reglas oficiales + house rules divertidas:
 *  - 2–6 jugadores, mazo 108 cartas
 *  - Skip, Reverse, +2, Wild, Wild+4
 *  - Stack de +2 sobre +2 (house)
 *  - Challenge de Wild+4 (oficial)
 *  - Grito UNO obligatorio (si no, +2 al ser atrapado)
 *  - Modo quick (1 mano) o puntos (meta 200/300/500)
 *  - Apuesta por jugador → pozo al ganador de la partida
 */

const EconomyBridge = require('../common/economyBridge');
const cfg = require('../common/gamesConfig').uno || {};

const COLORS = ['red', 'yellow', 'green', 'blue'];
const COLOR_LABEL = { red: 'Rojo', yellow: 'Amarillo', green: 'Verde', blue: 'Azul' };

function makeId() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildDeck() {
    const deck = [];
    for (const color of COLORS) {
        deck.push({ id: makeId(), color, value: '0', type: 'number' });
        for (let n = 1; n <= 9; n++) {
            deck.push({ id: makeId(), color, value: String(n), type: 'number' });
            deck.push({ id: makeId(), color, value: String(n), type: 'number' });
        }
        for (const t of ['skip', 'reverse', 'draw2']) {
            deck.push({ id: makeId(), color, value: t, type: t });
            deck.push({ id: makeId(), color, value: t, type: t });
        }
    }
    for (let i = 0; i < 4; i++) {
        deck.push({ id: makeId(), color: 'wild', value: 'wild', type: 'wild' });
        deck.push({ id: makeId(), color: 'wild', value: 'wild4', type: 'wild4' });
    }
    return shuffle(deck);
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function cardPoints(card) {
    if (!card) return 0;
    if (card.type === 'number') return parseInt(card.value, 10) || 0;
    if (card.type === 'skip' || card.type === 'reverse' || card.type === 'draw2') return 20;
    if (card.type === 'wild' || card.type === 'wild4') return 50;
    return 0;
}

function publicCard(card) {
    if (!card) return null;
    return {
        id: card.id,
        color: card.color,
        value: card.value,
        type: card.type,
        chosenColor: card.chosenColor || null
    };
}

class UnoEngine {
    constructor() {
        this.tables = new Map();
        this.broadcastCallback = null;
        this.personalBroadcast = null; // (tableId, (userId) => payload)
    }

    setBroadcast(cb) {
        this.broadcastCallback = cb;
    }

    setPersonalBroadcast(cb) {
        this.personalBroadcast = cb;
    }

    broadcast(tableId, payload) {
        if (this.broadcastCallback) this.broadcastCallback(tableId, payload);
    }

    broadcastState(table) {
        if (this.personalBroadcast) {
            this.personalBroadcast(table.tableId, (userId) => ({
                type: 'uno:state',
                table: this.getPublicState(table, userId)
            }));
        } else {
            this.broadcast(table.tableId, {
                type: 'uno:state',
                table: this.getPublicState(table, null)
            });
        }
    }

    generateCode() {
        const nums = '23456789';
        let code = 'UNO-';
        for (let i = 0; i < 3; i++) code += nums[Math.floor(Math.random() * nums.length)];
        return code;
    }

    createTable(hostUserId, hostUsername, opts = {}) {
        const bet = Math.max(0, Math.floor(Number(opts.betAmount) || 0));
        const maxPlayers = Math.min(6, Math.max(2, Number(opts.maxPlayers) || 4));
        const targetScore = [0, 200, 300, 500].includes(Number(opts.targetScore))
            ? Number(opts.targetScore)
            : (opts.mode === 'points' ? 300 : 0); // 0 = quick (1 mano)
        const allowStackDraw2 = opts.allowStackDraw2 !== false;
        const drawToMatch = opts.drawToMatch === true;

        if (bet > 0) {
            const maxBet = cfg.maxBet ?? 50000;
            if (bet > maxBet) return { success: false, error: `Apuesta máx ${maxBet}` };
            const deduct = EconomyBridge.deductCoins(
                hostUserId, bet, 'cards_uno', 'table_buyin', 'Buy-in mesa UNO'
            );
            if (!deduct.success) {
                return { success: false, error: deduct.error || 'Saldo insuficiente' };
            }
        }

        let tableId = this.generateCode();
        while (this.tables.has(tableId)) tableId = this.generateCode();

        const table = {
            tableId,
            hostUserId,
            betAmount: bet,
            pot: bet,
            maxPlayers,
            targetScore,
            allowStackDraw2,
            drawToMatch,
            state: 'LOBBY', // LOBBY | PLAYING | COLOR_PICK | CHALLENGE | FINISHED
            players: [{
                userId: hostUserId,
                username: hostUsername || 'Host',
                hand: [],
                score: 0,
                saidUno: false,
                connected: true
            }],
            deck: [],
            discard: [],
            currentColor: null,
            direction: 1, // 1 clockwise, -1 counter
            turnIndex: 0,
            pendingDraw: 0,
            pendingDrawType: null, // 'draw2' | 'wild4'
            lastPlayedBy: null,
            pendingWild: null, // { playerIdx, card, isWild4 }
            challengeWindow: null, // { fromIdx, targetIdx, expires... }
            mustDraw: false,
            drawnThisTurn: false,
            handNumber: 0,
            log: [],
            createdAt: Date.now()
        };

        this.tables.set(tableId, table);
        return { success: true, table: this.getPublicState(table, hostUserId) };
    }

    joinTable(tableId, userId, username) {
        const code = String(tableId || '').toUpperCase().trim();
        const table = this.tables.get(code);
        if (!table) return { success: false, error: 'Mesa no encontrada' };
        if (table.state !== 'LOBBY') return { success: false, error: 'La partida ya empezó' };
        if (table.players.some(p => p.userId === userId)) {
            return { success: true, table: this.getPublicState(table, userId) };
        }
        if (table.players.length >= table.maxPlayers) {
            return { success: false, error: 'Mesa llena' };
        }

        if (table.betAmount > 0) {
            const deduct = EconomyBridge.deductCoins(
                userId, table.betAmount, 'cards_uno', 'table_buyin', `Buy-in ${table.tableId}`
            );
            if (!deduct.success) {
                return { success: false, error: deduct.error || 'Saldo insuficiente' };
            }
            table.pot += table.betAmount;
        }

        table.players.push({
            userId,
            username: username || `Jugador_${String(userId).slice(-4)}`,
            hand: [],
            score: 0,
            saidUno: false,
            connected: true
        });

        this.broadcastState(table);
        return { success: true, table: this.getPublicState(table, userId) };
    }

    startGame(tableId, userId) {
        const table = this.tables.get(tableId);
        if (!table) return { success: false, error: 'Mesa no encontrada' };
        if (table.hostUserId !== userId) return { success: false, error: 'Solo el host puede iniciar' };
        if (table.state !== 'LOBBY') return { success: false, error: 'Ya está en juego' };
        if (table.players.length < 2) return { success: false, error: 'Mínimo 2 jugadores' };

        this._startHand(table);
        this.broadcastState(table);
        this._pushLog(table, '¡Partida UNO iniciada!');
        return { success: true, table: this.getPublicState(table, userId) };
    }

    _startHand(table) {
        table.deck = buildDeck();
        table.discard = [];
        table.direction = 1;
        table.pendingDraw = 0;
        table.pendingDrawType = null;
        table.pendingWild = null;
        table.challengeWindow = null;
        table.mustDraw = false;
        table.drawnThisTurn = false;
        table.handNumber += 1;
        table.state = 'PLAYING';

        for (const p of table.players) {
            p.hand = [];
            p.saidUno = false;
            for (let i = 0; i < 7; i++) p.hand.push(table.deck.pop());
        }

        // Primera carta del descarte (no wild4)
        let first = table.deck.pop();
        let guard = 0;
        while (first && first.type === 'wild4' && guard++ < 20) {
            table.deck.unshift(first);
            table.deck = shuffle(table.deck);
            first = table.deck.pop();
        }
        if (first.type === 'wild') {
            first.chosenColor = COLORS[Math.floor(Math.random() * 4)];
            table.currentColor = first.chosenColor;
        } else {
            table.currentColor = first.color;
        }
        table.discard.push(first);
        table.turnIndex = 0;
        table.lastPlayedBy = null;

        // Aplicar efecto de primera carta
        if (first.type === 'skip') {
            table.turnIndex = this._nextIndex(table, 0);
            this._pushLog(table, 'Primera carta SKIP — se salta al primer jugador');
        } else if (first.type === 'reverse') {
            table.direction *= -1;
            if (table.players.length === 2) {
                table.turnIndex = this._nextIndex(table, 0);
            }
            this._pushLog(table, 'Primera carta REVERSE');
        } else if (first.type === 'draw2') {
            table.pendingDraw = 2;
            table.pendingDrawType = 'draw2';
            this._pushLog(table, 'Primera carta +2 — el primero debe robar o apilar');
        }
    }

    _nextIndex(table, from = table.turnIndex, steps = 1) {
        const n = table.players.length;
        let i = from;
        for (let s = 0; s < steps; s++) {
            i = (i + table.direction + n) % n;
        }
        return i;
    }

    _drawCards(table, playerIdx, count) {
        const p = table.players[playerIdx];
        const drawn = [];
        for (let i = 0; i < count; i++) {
            if (table.deck.length === 0) this._recycleDiscard(table);
            if (table.deck.length === 0) break;
            const c = table.deck.pop();
            p.hand.push(c);
            drawn.push(publicCard(c));
        }
        p.saidUno = false;
        return drawn;
    }

    _recycleDiscard(table) {
        if (table.discard.length <= 1) return;
        const top = table.discard.pop();
        const rest = table.discard;
        table.discard = [top];
        table.deck = shuffle(rest.map(c => {
            const copy = { ...c };
            delete copy.chosenColor;
            if (copy.type === 'wild' || copy.type === 'wild4') copy.color = 'wild';
            return copy;
        }));
    }

    _pushLog(table, text) {
        table.log.unshift({ t: Date.now(), text });
        if (table.log.length > 30) table.log.length = 30;
    }

    _top(table) {
        return table.discard[table.discard.length - 1] || null;
    }

    _canPlay(table, card) {
        const top = this._top(table);
        if (table.pendingDraw > 0 && table.pendingDrawType === 'draw2') {
            if (table.allowStackDraw2 && card.type === 'draw2') return true;
            return false;
        }
        if (table.pendingDraw > 0 && table.pendingDrawType === 'wild4') {
            return false; // debe robar o challenge, no jugar
        }
        if (card.type === 'wild' || card.type === 'wild4') return true;
        if (card.color === table.currentColor) return true;
        if (card.type === 'number' && top?.type === 'number' && card.value === top.value) return true;
        if (
            card.type !== 'number' &&
            card.type !== 'wild' &&
            card.type !== 'wild4' &&
            top &&
            card.type === top.type
        ) return true;
        return false;
    }

    playCard(tableId, userId, cardId, chosenColor = null) {
        const table = this.tables.get(tableId);
        if (!table || table.state !== 'PLAYING') {
            return { success: false, error: 'No se puede jugar ahora' };
        }

        const playerIdx = table.players.findIndex(p => p.userId === userId);
        if (playerIdx === -1) return { success: false, error: 'No estás en la mesa' };
        if (playerIdx !== table.turnIndex) return { success: false, error: 'No es tu turno' };
        if (table.pendingWild) return { success: false, error: 'Elegí un color primero' };

        const hand = table.players[playerIdx].hand;
        const cardIndex = hand.findIndex(c => c.id === cardId);
        if (cardIndex < 0) return { success: false, error: 'Carta no encontrada' };
        const card = hand[cardIndex];

        if (!this._canPlay(table, card)) {
            return { success: false, error: 'Esa carta no se puede jugar' };
        }

        // Wild sin color: dejar en mano hasta chooseColor (o pasar carta en pending)
        if ((card.type === 'wild' || card.type === 'wild4') && !COLORS.includes(chosenColor)) {
            const [held] = hand.splice(cardIndex, 1);
            table.state = 'COLOR_PICK';
            table.pendingWild = {
                playerIdx,
                card: held,
                isWild4: held.type === 'wild4'
            };
            this.broadcastState(table);
            return {
                success: true,
                needColor: true,
                table: this.getPublicState(table, userId)
            };
        }

        const [played] = hand.splice(cardIndex, 1);
        return this._finishPlay(table, playerIdx, played, chosenColor || null);
    }

    chooseColor(tableId, userId, color) {
        const table = this.tables.get(tableId);
        if (!table || (table.state !== 'COLOR_PICK' && table.state !== 'PLAYING')) {
            return { success: false, error: 'No hay selección de color' };
        }
        if (!COLORS.includes(color)) return { success: false, error: 'Color inválido' };

        const playerIdx = table.players.findIndex(p => p.userId === userId);
        if (!table.pendingWild || table.pendingWild.playerIdx !== playerIdx) {
            return { success: false, error: 'No te toca elegir color' };
        }

        const card = table.pendingWild.card;
        table.pendingWild = null;
        table.state = 'PLAYING';
        if (!card) return { success: false, error: 'Carta inválida' };
        return this._finishPlay(table, playerIdx, card, color);
    }

    _finishPlay(table, playerIdx, card, chosenColor) {
        const player = table.players[playerIdx];
        if (!card) return { success: false, error: 'Carta inválida' };

        // Snapshot for wild4 challenge (hand already without this card)
        if (card.type === 'wild4') {
            table._colorBeforeLastWild = table.currentColor;
            player._handSnapshotBeforeWild4 = player.hand.map(c => ({
                color: c.color, type: c.type, value: c.value
            }));
        }

        if (card.type === 'wild' || card.type === 'wild4') {
            card.chosenColor = chosenColor;
            table.currentColor = chosenColor;
        } else {
            table.currentColor = card.color;
        }

        table.discard.push(card);
        table.lastPlayedBy = playerIdx;
        table.drawnThisTurn = false;
        table.mustDraw = false;

        // UNO auto-flag: si queda 1 carta y no dijo UNO, es vulnerable
        if (player.hand.length === 1) {
            // saidUno se pone con callUno
            if (!player.saidUno) {
                this._pushLog(table, `${player.username} tiene 1 carta (sin gritar UNO)`);
            }
        }
        if (player.hand.length === 0) {
            return this._handWon(table, playerIdx);
        }
        if (player.hand.length > 1) {
            player.saidUno = false;
        }

        // Efectos
        let skipExtra = false;
        if (card.type === 'skip') {
            skipExtra = true;
            this._pushLog(table, `${player.username} jugó SKIP`);
        } else if (card.type === 'reverse') {
            table.direction *= -1;
            this._pushLog(table, `${player.username} jugó REVERSE`);
            if (table.players.length === 2) skipExtra = true; // reverse = skip en 2p
        } else if (card.type === 'draw2') {
            if (table.pendingDrawType === 'draw2' && table.pendingDraw > 0) {
                table.pendingDraw += 2;
            } else {
                table.pendingDraw = 2;
                table.pendingDrawType = 'draw2';
            }
            this._pushLog(table, `${player.username} jugó +2 (stack ${table.pendingDraw})`);
        } else if (card.type === 'wild4') {
            table.pendingDraw = 4;
            table.pendingDrawType = 'wild4';
            table.challengeWindow = {
                byIdx: playerIdx,
                targetIdx: this._nextIndex(table, playerIdx),
                open: true
            };
            this._pushLog(table, `${player.username} jugó +4 ${COLOR_LABEL[chosenColor] || ''}`);
        } else if (card.type === 'wild') {
            this._pushLog(table, `${player.username} cambió a ${COLOR_LABEL[chosenColor]}`);
        } else {
            this._pushLog(table, `${player.username} jugó ${card.color} ${card.value}`);
        }

        // Avanzar turno
        let next = this._nextIndex(table, playerIdx);
        if (skipExtra) next = this._nextIndex(table, next);
        table.turnIndex = next;

        // Si hay pending draw2 y no se puede stackear, el jugador actual debe robar
        // (queda en su turno hasta que robe o apile)

        this.broadcastState(table);
        return { success: true, table: this.getPublicState(table, player.userId) };
    }

    drawCard(tableId, userId) {
        const table = this.tables.get(tableId);
        if (!table || table.state !== 'PLAYING') {
            return { success: false, error: 'No se puede robar ahora' };
        }
        const playerIdx = table.players.findIndex(p => p.userId === userId);
        if (playerIdx === -1) return { success: false, error: 'No estás en la mesa' };
        if (playerIdx !== table.turnIndex) return { success: false, error: 'No es tu turno' };

        // Resolver stack pendiente
        if (table.pendingDraw > 0) {
            const n = table.pendingDraw;
            const drawn = this._drawCards(table, playerIdx, n);
            table.pendingDraw = 0;
            table.pendingDrawType = null;
            table.challengeWindow = null;
            table.turnIndex = this._nextIndex(table, playerIdx);
            table.drawnThisTurn = false;
            this._pushLog(table, `${table.players[playerIdx].username} robó ${n} por castigo`);
            this.broadcastState(table);
            return {
                success: true,
                drawnCount: n,
                drawn: drawn, // only for this player response
                table: this.getPublicState(table, userId)
            };
        }

        if (table.drawnThisTurn && !table.drawToMatch) {
            // Ya robó: puede pasar
            return this.passTurn(tableId, userId);
        }

        // Robar 1 (o hasta poder jugar si drawToMatch)
        let drawn = [];
        if (table.drawToMatch) {
            let guard = 0;
            while (guard++ < 30) {
                const d = this._drawCards(table, playerIdx, 1);
                if (!d.length) break;
                drawn.push(...d);
                const last = table.players[playerIdx].hand[table.players[playerIdx].hand.length - 1];
                if (this._canPlay(table, last)) break;
            }
        } else {
            drawn = this._drawCards(table, playerIdx, 1);
        }

        table.drawnThisTurn = true;
        const lastCard = table.players[playerIdx].hand[table.players[playerIdx].hand.length - 1];
        const canPlayDrawn = lastCard && this._canPlay(table, lastCard);

        this._pushLog(table, `${table.players[playerIdx].username} robó del mazo`);
        this.broadcastState(table);

        return {
            success: true,
            drawnCount: drawn.length,
            canPlayDrawn,
            drawnCardId: canPlayDrawn ? lastCard.id : null,
            table: this.getPublicState(table, userId)
        };
    }

    passTurn(tableId, userId) {
        const table = this.tables.get(tableId);
        if (!table || table.state !== 'PLAYING') return { success: false, error: 'Partida inactiva' };
        const playerIdx = table.players.findIndex(p => p.userId === userId);
        if (playerIdx !== table.turnIndex) return { success: false, error: 'No es tu turno' };
        if (table.pendingDraw > 0) {
            return { success: false, error: 'Debés robar el castigo (o apilar +2)' };
        }
        if (!table.drawnThisTurn) {
            return { success: false, error: 'Primero robá una carta' };
        }

        table.drawnThisTurn = false;
        table.turnIndex = this._nextIndex(table, playerIdx);
        this._pushLog(table, `${table.players[playerIdx].username} pasó`);
        this.broadcastState(table);
        return { success: true, table: this.getPublicState(table, userId) };
    }

    callUno(tableId, userId) {
        const table = this.tables.get(tableId);
        if (!table || (table.state !== 'PLAYING' && table.state !== 'COLOR_PICK')) {
            return { success: false, error: 'Partida inactiva' };
        }
        const p = table.players.find(x => x.userId === userId);
        if (!p) return { success: false, error: 'No estás en la mesa' };
        if (p.hand.length !== 1) {
            return { success: false, error: 'Solo podés gritar UNO con 1 carta' };
        }
        p.saidUno = true;
        this._pushLog(table, `¡${p.username} gritó UNO!`);
        this.broadcastState(table);
        return { success: true, table: this.getPublicState(table, userId) };
    }

    /** Atrapar a alguien que no gritó UNO */
    catchUno(tableId, userId, targetUserId) {
        const table = this.tables.get(tableId);
        if (!table || table.state !== 'PLAYING') return { success: false, error: 'Partida inactiva' };
        const catcher = table.players.find(p => p.userId === userId);
        const targetIdx = table.players.findIndex(p => p.userId === targetUserId);
        if (!catcher || targetIdx < 0) return { success: false, error: 'Jugador inválido' };

        const target = table.players[targetIdx];
        if (target.hand.length !== 1 || target.saidUno) {
            return { success: false, error: 'No se puede atrapar (ya dijo UNO o no tiene 1 carta)' };
        }

        this._drawCards(table, targetIdx, 2);
        this._pushLog(table, `${catcher.username} atrapó a ${target.username} (+2 por no decir UNO)`);
        this.broadcastState(table);
        return { success: true, table: this.getPublicState(table, userId) };
    }

    /** Challenge Wild +4 */
    challengeWild4(tableId, userId, accept) {
        const table = this.tables.get(tableId);
        if (!table || table.state !== 'PLAYING') return { success: false, error: 'Partida inactiva' };
        if (!table.challengeWindow?.open || table.pendingDrawType !== 'wild4') {
            return { success: false, error: 'No hay +4 para desafiar' };
        }

        const playerIdx = table.players.findIndex(p => p.userId === userId);
        if (playerIdx !== table.challengeWindow.targetIdx) {
            return { success: false, error: 'Solo el afectado puede responder al +4' };
        }

        const byIdx = table.challengeWindow.byIdx;
        table.challengeWindow = null;

        if (!accept) {
            // Acepta el +4
            this._drawCards(table, playerIdx, table.pendingDraw || 4);
            table.pendingDraw = 0;
            table.pendingDrawType = null;
            table.turnIndex = this._nextIndex(table, playerIdx);
            this._pushLog(table, `${table.players[playerIdx].username} aceptó el +4`);
            this.broadcastState(table);
            return { success: true, challenged: false, table: this.getPublicState(table, userId) };
        }

        // Challenge: ¿el que jugó +4 tenía carta del color vigente ANTES del +4?
        // Color antes del wild: miramos la carta debajo del top
        const under = table.discard[table.discard.length - 2];
        const colorBefore = under
            ? (under.chosenColor || under.color)
            : table.currentColor;
        // Nota: al jugar wild4 ya cambió currentColor; usamos under
        const prevColor = under?.type === 'wild' || under?.type === 'wild4'
            ? (under.chosenColor || COLORS[0])
            : (under?.color || colorBefore);

        const offender = table.players[byIdx];
        // Reconstruct: offender already played wild4 so hand doesn't have it.
        // Official rule: challenge if offender had a card matching the color BEFORE the wild4.
        // We stored... we need to track colorBefore on play. Fix: save lastColorBeforeWild
        const checkColor = table._colorBeforeLastWild || prevColor;
        const hadMatch = (offender._handSnapshotBeforeWild4 || []).some(
            c => c.color === checkColor && c.type !== 'wild' && c.type !== 'wild4'
        );
        // Without snapshot, approximate: can't know. Store snapshot in _finishPlay.

        // Fallback if no snapshot: 30% random is unfair. Require snapshot.
        let illegal = false;
        if (Array.isArray(offender._handSnapshotBeforeWild4)) {
            illegal = offender._handSnapshotBeforeWild4.some(
                c => c.color === checkColor && c.type !== 'wild' && c.type !== 'wild4'
            );
        }

        if (illegal) {
            // Challenge success: offender draws 4, target draws 0
            this._drawCards(table, byIdx, 4);
            table.pendingDraw = 0;
            table.pendingDrawType = null;
            // Turn stays on target (they don't draw, they play)
            table.turnIndex = playerIdx;
            this._pushLog(table, `¡Challenge OK! ${offender.username} tenía ${COLOR_LABEL[checkColor]} y roba 4`);
        } else {
            // Fail: target draws 6
            this._drawCards(table, playerIdx, 6);
            table.pendingDraw = 0;
            table.pendingDrawType = null;
            table.turnIndex = this._nextIndex(table, playerIdx);
            this._pushLog(table, `Challenge fallido. ${table.players[playerIdx].username} roba 6`);
        }

        delete offender._handSnapshotBeforeWild4;
        this.broadcastState(table);
        return {
            success: true,
            challenged: true,
            challengeWon: illegal,
            table: this.getPublicState(table, userId)
        };
    }

    // Patch _finishPlay for wild4 snapshot - I'll integrate below by modifying play path

    _handWon(table, winnerIdx) {
        const winner = table.players[winnerIdx];
        let points = 0;
        for (let i = 0; i < table.players.length; i++) {
            if (i === winnerIdx) continue;
            for (const c of table.players[i].hand) points += cardPoints(c);
        }
        winner.score += points;
        this._pushLog(table, `¡${winner.username} gana la mano! +${points} pts`);

        const target = table.targetScore || 0;
        if (target > 0 && winner.score >= target) {
            return this._finishMatch(table, winnerIdx);
        }
        if (target === 0) {
            // Quick: una sola mano
            return this._finishMatch(table, winnerIdx);
        }

        // Nueva mano
        this._startHand(table);
        this.broadcastState(table);
        this.broadcast(table.tableId, {
            type: 'uno:hand_over',
            winnerIdx,
            winnerUsername: winner.username,
            points,
            scores: table.players.map(p => ({ userId: p.userId, username: p.username, score: p.score }))
        });
        return { success: true, handWon: true, table: this.getPublicState(table, winner.userId) };
    }

    _finishMatch(table, winnerIdx) {
        table.state = 'FINISHED';
        const winner = table.players[winnerIdx];
        let potWon = 0;
        if (table.pot > 0) {
            EconomyBridge.addCoins(
                winner.userId, table.pot, 'cards_uno', 'match_win',
                `Victoria UNO ${table.tableId}`
            );
            potWon = table.pot;
            table.pot = 0;
        }
        this._pushLog(table, `🏆 ${winner.username} gana la partida`);
        this.broadcastState(table);
        this.broadcast(table.tableId, {
            type: 'uno:game_over',
            winnerIdx,
            winnerUsername: winner.username,
            potWon,
            scores: table.players.map(p => ({
                userId: p.userId,
                username: p.username,
                score: p.score
            }))
        });
        setTimeout(() => this.tables.delete(table.tableId), 600000);
        return {
            success: true,
            matchWon: true,
            potWon,
            table: this.getPublicState(table, winner.userId)
        };
    }

    getTableState(tableId, userId) {
        const table = this.tables.get(String(tableId || '').toUpperCase().trim());
        if (!table) return { success: false, error: 'Mesa no encontrada' };
        const inTable = table.players.some(p => p.userId === userId);
        if (!inTable) return { success: false, error: 'No estás en esta mesa' };
        return { success: true, table: this.getPublicState(table, userId) };
    }

    getPublicState(table, forUserId = null) {
        const top = this._top(table);
        return {
            tableId: table.tableId,
            hostUserId: table.hostUserId,
            state: table.state,
            betAmount: table.betAmount,
            pot: table.pot,
            maxPlayers: table.maxPlayers,
            targetScore: table.targetScore,
            allowStackDraw2: table.allowStackDraw2,
            currentColor: table.currentColor,
            direction: table.direction,
            turnIndex: table.turnIndex,
            pendingDraw: table.pendingDraw,
            pendingDrawType: table.pendingDrawType,
            deckCount: table.deck.length,
            discardCount: table.discard.length,
            topCard: publicCard(top),
            handNumber: table.handNumber,
            pendingWild: table.pendingWild
                ? { playerIdx: table.pendingWild.playerIdx, isWild4: table.pendingWild.isWild4 }
                : null,
            challengeWindow: table.challengeWindow
                ? {
                    byIdx: table.challengeWindow.byIdx,
                    targetIdx: table.challengeWindow.targetIdx,
                    open: table.challengeWindow.open
                }
                : null,
            drawnThisTurn: table.drawnThisTurn,
            log: table.log.slice(0, 12),
            players: table.players.map((p, idx) => ({
                userId: p.userId,
                username: p.username,
                score: p.score,
                cardCount: p.hand.length,
                saidUno: p.saidUno,
                isTurn: idx === table.turnIndex && table.state === 'PLAYING',
                isHost: p.userId === table.hostUserId,
                // Solo tu mano completa
                hand: p.userId === forUserId
                    ? p.hand.map(publicCard)
                    : null
            })),
            myIndex: forUserId
                ? table.players.findIndex(p => p.userId === forUserId)
                : -1,
            colors: COLORS,
            colorLabels: COLOR_LABEL
        };
    }
}

module.exports = new UnoEngine();
