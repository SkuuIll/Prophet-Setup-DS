const test = require('node:test');
const assert = require('node:assert');
const TrucoDeck = require('../games/cards/trucoDeck');
const TrucoEngine = require('../games/cards/trucoEngine');
const BlackjackEngine = require('../games/cards/blackjackEngine');
const EconomyBridge = require('../games/common/economyBridge');

test('Cards: Truco Deck hierarchy power rank', () => {
    const macho = TrucoDeck.getCardPower(1, 'espada');
    const hembra = TrucoDeck.getCardPower(1, 'basto');
    const sieteEspada = TrucoDeck.getCardPower(7, 'espada');
    const sieteOro = TrucoDeck.getCardPower(7, 'oro');
    const tres = TrucoDeck.getCardPower(3, 'copa');
    const dos = TrucoDeck.getCardPower(2, 'oro');
    const asFalso = TrucoDeck.getCardPower(1, 'copa');
    const cuatro = TrucoDeck.getCardPower(4, 'espada');

    assert.ok(macho > hembra, '1 Espada must beat 1 Basto');
    assert.ok(hembra > sieteEspada, '1 Basto must beat 7 Espada');
    assert.ok(sieteEspada > sieteOro, '7 Espada must beat 7 Oro');
    assert.ok(sieteOro > tres, '7 Oro must beat 3s');
    assert.ok(tres > dos, '3 must beat 2');
    assert.ok(dos > asFalso, '2 must beat As Falso');
    assert.ok(asFalso > cuatro, 'As Falso must beat 4');
    assert.strictEqual(cuatro, 1, '4 must be the lowest card rank (1)');
});

test('Cards: Truco Envido calculation math', () => {
    // 7 Espada + 6 Espada + 1 Oro = 20 + 7 + 6 = 33
    const hand1 = [
        { number: 7, suit: 'espada' },
        { number: 6, suit: 'espada' },
        { number: 1, suit: 'oro' }
    ];
    assert.strictEqual(TrucoDeck.calculateEnvido(hand1), 33, '7 and 6 of same suit must equal 33');

    // 12 Copa + 11 Copa + 3 Basto = 20 + 0 + 0 = 20
    const hand2 = [
        { number: 12, suit: 'copa' },
        { number: 11, suit: 'copa' },
        { number: 3, suit: 'basto' }
    ];
    assert.strictEqual(TrucoDeck.calculateEnvido(hand2), 20, 'Two figures of same suit must equal 20');

    // Different suits: 1 Espada, 5 Copa, 12 Oro = 5
    const hand3 = [
        { number: 1, suit: 'espada' },
        { number: 5, suit: 'copa' },
        { number: 12, suit: 'oro' }
    ];
    assert.strictEqual(TrucoDeck.calculateEnvido(hand3), 5, 'Different suits must take highest single card (5)');
});

test('Cards: Blackjack hand value and Aces logic', () => {
    // Ace + King = 21 (Blackjack)
    const bjHand = [{ value: 'A', numVal: 11 }, { value: 'K', numVal: 10 }];
    const resBJ = BlackjackEngine.calculateHand(bjHand);
    assert.strictEqual(resBJ.total, 21, 'A + K should equal 21');
    assert.strictEqual(resBJ.isBlackjack, true, 'A + K must be Blackjack');

    // Ace + 8 + 5 = 1 + 8 + 5 = 14 (Ace reduced from 11 to 1)
    const softHand = [{ value: 'A', numVal: 11 }, { value: '8', numVal: 8 }, { value: '5', numVal: 5 }];
    const resSoft = BlackjackEngine.calculateHand(softHand);
    assert.strictEqual(resSoft.total, 14, 'A + 8 + 5 should equal 14');
    assert.strictEqual(resSoft.isBusted, false, 'Hand should not bust');

    // 10 + 7 + 8 = 25 (Busted)
    const bustHand = [{ value: '10', numVal: 10 }, { value: '7', numVal: 7 }, { value: '8', numVal: 8 }];
    const resBust = BlackjackEngine.calculateHand(bustHand);
    assert.strictEqual(resBust.total, 25, 'Hand total should be 25');
    assert.strictEqual(resBust.isBusted, true, 'Hand should be busted');
});
