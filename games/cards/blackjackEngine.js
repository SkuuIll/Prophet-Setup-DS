const EconomyBridge = require('../common/economyBridge');

const BJ_SUITS = ['♠', '♥', '♦', '♣'];
const BJ_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

class BlackjackEngine {
    constructor() {
        this.tables = new Map();
    }

    createDeck() {
        const deck = [];
        for (const suit of BJ_SUITS) {
            for (const value of BJ_VALUES) {
                let numVal = parseInt(value, 10);
                if (['J', 'Q', 'K'].includes(value)) numVal = 10;
                if (value === 'A') numVal = 11;
                deck.push({ suit, value, numVal });
            }
        }
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    calculateHand(cards) {
        let total = 0;
        let aces = 0;

        for (const c of cards) {
            total += c.numVal;
            if (c.value === 'A') aces++;
        }

        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        const isBlackjack = cards.length === 2 && total === 21;
        const isBusted = total > 21;

        return { total, isBlackjack, isBusted };
    }

    /**
     * Inicia una mano de Blackjack para un jugador
     */
    startHand(userId, amount) {
        const bet = Math.max(10, Math.floor(Number(amount) || 10));

        const deduct = EconomyBridge.deductCoins(userId, bet, 'cards_blackjack', 'bet', `Mano de Blackjack`);
        if (!deduct.success) {
            return { success: false, error: deduct.error || 'Saldo insuficiente' };
        }

        const deck = this.createDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()]; // dealerHand[1] is hidden

        const playerVal = this.calculateHand(playerHand);

        const table = {
            userId,
            bet,
            deck,
            playerHand,
            dealerHand,
            state: 'PLAYING', // 'PLAYING', 'FINISHED'
            result: null
        };

        this.tables.set(userId, table);

        // Si el jugador sacó Blackjack natural
        if (playerVal.isBlackjack) {
            return this.resolveBlackjack(userId);
        }

        return {
            success: true,
            bet,
            playerHand,
            playerScore: playerVal.total,
            dealerVisibleCard: dealerHand[0],
            balance: deduct.balance,
            canDouble: true
        };
    }

    hit(userId) {
        const table = this.tables.get(userId);
        if (!table || table.state !== 'PLAYING') return { success: false, error: 'Mano no activa' };

        const card = table.deck.pop();
        table.playerHand.push(card);
        const playerVal = this.calculateHand(table.playerHand);

        if (playerVal.isBusted) {
            table.state = 'FINISHED';
            table.result = 'BUSTED';
            this.tables.delete(userId);

            return {
                success: true,
                card,
                playerHand: table.playerHand,
                playerScore: playerVal.total,
                isBusted: true,
                dealerHand: table.dealerHand,
                dealerScore: this.calculateHand(table.dealerHand).total,
                result: 'PERDISTE (Te pasaste de 21) 💥',
                payout: 0
            };
        }

        return {
            success: true,
            card,
            playerHand: table.playerHand,
            playerScore: playerVal.total,
            isBusted: false
        };
    }

    stand(userId) {
        const table = this.tables.get(userId);
        if (!table || table.state !== 'PLAYING') return { success: false, error: 'Mano no activa' };

        return this.dealerPlay(userId);
    }

    doubleDown(userId) {
        const table = this.tables.get(userId);
        if (!table || table.state !== 'PLAYING') return { success: false, error: 'Mano no activa' };
        if (table.playerHand.length !== 2) return { success: false, error: 'Solo podés doblar en las primeras 2 cartas' };

        const deduct = EconomyBridge.deductCoins(userId, table.bet, 'cards_blackjack', 'double', `Doblar apuesta en Blackjack`);
        if (!deduct.success) {
            return { success: false, error: deduct.error || 'Saldo insuficiente para doblar' };
        }

        table.bet *= 2;
        const card = table.deck.pop();
        table.playerHand.push(card);

        const playerVal = this.calculateHand(table.playerHand);
        if (playerVal.isBusted) {
            table.state = 'FINISHED';
            table.result = 'BUSTED';
            this.tables.delete(userId);
            return {
                success: true,
                card,
                playerHand: table.playerHand,
                playerScore: playerVal.total,
                isBusted: true,
                dealerHand: table.dealerHand,
                dealerScore: this.calculateHand(table.dealerHand).total,
                result: 'PERDISTE (Te pasaste de 21) 💥',
                payout: 0
            };
        }

        return this.dealerPlay(userId);
    }

    dealerPlay(userId) {
        const table = this.tables.get(userId);
        table.state = 'FINISHED';

        let dealerVal = this.calculateHand(table.dealerHand);
        while (dealerVal.total < 17) {
            table.dealerHand.push(table.deck.pop());
            dealerVal = this.calculateHand(table.dealerHand);
        }

        const playerVal = this.calculateHand(table.playerHand);
        let payout = 0;
        let resultMsg = '';

        if (dealerVal.isBusted) {
            payout = table.bet * 2;
            resultMsg = '¡GANASTE! (El Dealer se pasó de 21) 🎉';
        } else if (playerVal.total > dealerVal.total) {
            payout = table.bet * 2;
            resultMsg = `¡GANASTE! (${playerVal.total} contra ${dealerVal.total}) 🎉`;
        } else if (playerVal.total === dealerVal.total) {
            payout = table.bet; // Push
            resultMsg = 'EMPATE (Push) · Se te devuelve la apuesta 🤝';
        } else {
            payout = 0;
            resultMsg = `PERDISTE (${dealerVal.total} contra ${playerVal.total}) ❌`;
        }

        let newBal = 0;
        if (payout > 0) {
            const add = EconomyBridge.addCoins(userId, payout, 'cards_blackjack', 'win', resultMsg);
            newBal = add.balance;
        }

        this.tables.delete(userId);

        return {
            success: true,
            playerHand: table.playerHand,
            playerScore: playerVal.total,
            dealerHand: table.dealerHand,
            dealerScore: dealerVal.total,
            result: resultMsg,
            payout,
            balance: newBal
        };
    }

    resolveBlackjack(userId) {
        const table = this.tables.get(userId);
        table.state = 'FINISHED';

        const dealerVal = this.calculateHand(table.dealerHand);
        let payout = 0;
        let resultMsg = '';

        if (dealerVal.isBlackjack) {
            payout = table.bet; // Push
            resultMsg = 'EMPATE DE BLACKJACKS · Se devuelve la apuesta 🤝';
        } else {
            // Paga 3:2 (ej: bet 100 -> payout 250)
            payout = Math.floor(table.bet * 2.5);
            resultMsg = '¡BLACKJACK NATURAL! Paga 3 a 2 👑';
        }

        const add = EconomyBridge.addCoins(userId, payout, 'cards_blackjack', 'blackjack_win', resultMsg);
        this.tables.delete(userId);

        return {
            success: true,
            playerHand: table.playerHand,
            playerScore: 21,
            dealerHand: table.dealerHand,
            dealerScore: dealerVal.total,
            result: resultMsg,
            payout,
            balance: add.balance
        };
    }
}

module.exports = new BlackjackEngine();
