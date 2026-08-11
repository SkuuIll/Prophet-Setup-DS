const crypto = require('crypto');
const EconomyBridge = require('../common/economyBridge');
const cfg = require('../common/gamesConfig').blackjack;

const BJ_SUITS = ['♠', '♥', '♦', '♣'];
const BJ_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

class BlackjackEngine {
    constructor() {
        this.tables = new Map(); // userId -> table (1 jugador vs banca por sesión)
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
        // Fisher-Yates con crypto
        for (let i = deck.length - 1; i > 0; i--) {
            const j = crypto.randomBytes(2).readUInt16BE(0) % (i + 1);
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

        return {
            total,
            isBlackjack: cards.length === 2 && total === 21,
            isBusted: total > 21,
            isSoft: aces > 0 && total <= 21
        };
    }

    canSplit(hand) {
        if (!hand || hand.length !== 2) return false;
        // Mismo valor de rank (pares de 10/J/Q/K también se pueden dividir)
        const v0 = hand[0].numVal === 10 ? 10 : hand[0].value;
        const v1 = hand[1].numVal === 10 ? 10 : hand[1].value;
        if (hand[0].numVal === 10 && hand[1].numVal === 10) return true;
        return hand[0].value === hand[1].value;
    }

    startHand(userId, amount) {
        const bet = Math.floor(Number(amount) || cfg.minBet);
        if (bet < cfg.minBet) {
            return { success: false, error: `Apuesta mínima: 🪙 ${cfg.minBet}` };
        }
        if (bet > cfg.maxBet) {
            return { success: false, error: `Apuesta máxima: 🪙 ${cfg.maxBet}` };
        }

        // Cancelar mesa previa si quedó colgada
        if (this.tables.has(userId)) {
            this.tables.delete(userId);
        }

        const deduct = EconomyBridge.deductCoins(userId, bet, 'cards_blackjack', 'bet', 'Mano de Blackjack');
        if (!deduct.success) {
            return { success: false, error: deduct.error || 'Saldo insuficiente' };
        }

        const deck = this.createDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];

        const playerVal = this.calculateHand(playerHand);

        const table = {
            userId,
            bet,
            originalBet: bet,
            deck,
            playerHand,
            dealerHand,
            splitHand: null,
            activeHand: 'main', // 'main' | 'split'
            state: 'PLAYING',
            result: null,
            doubled: false
        };

        this.tables.set(userId, table);

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
            canDouble: true,
            canSplit: this.canSplit(playerHand)
        };
    }

    hit(userId) {
        const table = this.tables.get(userId);
        if (!table || table.state !== 'PLAYING') return { success: false, error: 'Mano no activa' };

        const hand = table.activeHand === 'split' ? table.splitHand : table.playerHand;
        const card = table.deck.pop();
        hand.push(card);
        const playerVal = this.calculateHand(hand);

        if (playerVal.isBusted) {
            if (table.activeHand === 'main' && table.splitHand) {
                // Pasa a la mano split
                table.activeHand = 'split';
                return {
                    success: true,
                    card,
                    playerHand: table.playerHand,
                    playerScore: this.calculateHand(table.playerHand).total,
                    splitHand: table.splitHand,
                    splitScore: this.calculateHand(table.splitHand).total,
                    activeHand: 'split',
                    isBusted: true,
                    message: 'Mano principal se pasó · jugás el split'
                };
            }

            // Fin: bust sin split o bust del split
            if (table.splitHand && table.activeHand === 'split') {
                // Evaluar solo dealer vs main (si main no busted)
                const mainVal = this.calculateHand(table.playerHand);
                if (!mainVal.isBusted) {
                    return this.dealerPlay(userId);
                }
            }

            table.state = 'FINISHED';
            this.tables.delete(userId);
            return {
                success: true,
                card,
                playerHand: table.playerHand,
                playerScore: playerVal.total,
                isBusted: true,
                dealerHand: table.dealerHand,
                dealerScore: this.calculateHand(table.dealerHand).total,
                result: 'PERDISTE (Te pasaste de 21)',
                payout: 0
            };
        }

        return {
            success: true,
            card,
            playerHand: table.playerHand,
            playerScore: this.calculateHand(table.playerHand).total,
            splitHand: table.splitHand,
            splitScore: table.splitHand ? this.calculateHand(table.splitHand).total : null,
            activeHand: table.activeHand,
            isBusted: false,
            canDouble: false,
            canSplit: false
        };
    }

    stand(userId) {
        const table = this.tables.get(userId);
        if (!table || table.state !== 'PLAYING') return { success: false, error: 'Mano no activa' };

        if (table.activeHand === 'main' && table.splitHand) {
            table.activeHand = 'split';
            return {
                success: true,
                playerHand: table.playerHand,
                playerScore: this.calculateHand(table.playerHand).total,
                splitHand: table.splitHand,
                splitScore: this.calculateHand(table.splitHand).total,
                activeHand: 'split',
                message: 'Plantado en mano principal · jugás el split'
            };
        }

        return this.dealerPlay(userId);
    }

    doubleDown(userId) {
        const table = this.tables.get(userId);
        if (!table || table.state !== 'PLAYING') return { success: false, error: 'Mano no activa' };

        const hand = table.activeHand === 'split' ? table.splitHand : table.playerHand;
        if (hand.length !== 2) return { success: false, error: 'Solo podés doblar con 2 cartas' };

        const extraBet = table.activeHand === 'split' ? table.originalBet : table.originalBet;
        const deduct = EconomyBridge.deductCoins(userId, extraBet, 'cards_blackjack', 'double', 'Doblar en Blackjack');
        if (!deduct.success) {
            return { success: false, error: deduct.error || 'Saldo insuficiente para doblar' };
        }

        if (table.activeHand === 'split') {
            table.splitBet = (table.splitBet || table.originalBet) + extraBet;
        } else {
            table.bet += extraBet;
        }

        const card = table.deck.pop();
        hand.push(card);
        const playerVal = this.calculateHand(hand);

        if (playerVal.isBusted) {
            if (table.activeHand === 'main' && table.splitHand) {
                table.activeHand = 'split';
                return {
                    success: true,
                    card,
                    playerHand: table.playerHand,
                    playerScore: playerVal.total,
                    splitHand: table.splitHand,
                    activeHand: 'split',
                    isBusted: true,
                    balance: deduct.balance
                };
            }
            table.state = 'FINISHED';
            this.tables.delete(userId);
            return {
                success: true,
                card,
                playerHand: table.playerHand,
                playerScore: playerVal.total,
                isBusted: true,
                dealerHand: table.dealerHand,
                dealerScore: this.calculateHand(table.dealerHand).total,
                result: 'PERDISTE (Te pasaste de 21)',
                payout: 0,
                balance: deduct.balance
            };
        }

        // Tras doblar se planta automáticamente
        if (table.activeHand === 'main' && table.splitHand) {
            table.activeHand = 'split';
            return {
                success: true,
                card,
                playerHand: table.playerHand,
                playerScore: playerVal.total,
                splitHand: table.splitHand,
                activeHand: 'split',
                balance: deduct.balance,
                message: 'Doble en principal · jugás el split'
            };
        }

        return this.dealerPlay(userId);
    }

    /**
     * Dividir pares: segunda apuesta igual, dos manos independientes.
     */
    split(userId) {
        const table = this.tables.get(userId);
        if (!table || table.state !== 'PLAYING') return { success: false, error: 'Mano no activa' };
        if (table.splitHand) return { success: false, error: 'Ya dividiste esta mano' };
        if (!this.canSplit(table.playerHand)) return { success: false, error: 'No se puede dividir esta mano' };

        const deduct = EconomyBridge.deductCoins(
            userId, table.originalBet, 'cards_blackjack', 'split', 'Split de pares'
        );
        if (!deduct.success) {
            return { success: false, error: deduct.error || 'Saldo insuficiente para dividir' };
        }

        const second = table.playerHand.pop();
        table.splitHand = [second, table.deck.pop()];
        table.playerHand.push(table.deck.pop());
        table.splitBet = table.originalBet;
        table.activeHand = 'main';

        return {
            success: true,
            playerHand: table.playerHand,
            playerScore: this.calculateHand(table.playerHand).total,
            splitHand: table.splitHand,
            splitScore: this.calculateHand(table.splitHand).total,
            activeHand: 'main',
            balance: deduct.balance,
            canDouble: true,
            canSplit: false
        };
    }

    resolveHandVsDealer(hand, bet, dealerVal) {
        const playerVal = this.calculateHand(hand);
        if (playerVal.isBusted) {
            return { payout: 0, msg: `Bust (${playerVal.total})` };
        }
        if (dealerVal.isBusted) {
            return { payout: bet * 2, msg: `Gana ${playerVal.total} (dealer bust)` };
        }
        if (playerVal.total > dealerVal.total) {
            return { payout: bet * 2, msg: `Gana ${playerVal.total} vs ${dealerVal.total}` };
        }
        if (playerVal.total === dealerVal.total) {
            return { payout: bet, msg: `Push ${playerVal.total}` };
        }
        return { payout: 0, msg: `Pierde ${playerVal.total} vs ${dealerVal.total}` };
    }

    dealerPlay(userId) {
        const table = this.tables.get(userId);
        table.state = 'FINISHED';

        let dealerVal = this.calculateHand(table.dealerHand);
        while (dealerVal.total < cfg.dealerStandAt) {
            table.dealerHand.push(table.deck.pop());
            dealerVal = this.calculateHand(table.dealerHand);
        }

        const main = this.resolveHandVsDealer(table.playerHand, table.bet, dealerVal);
        let totalPayout = main.payout;
        let resultMsg = main.msg;

        if (table.splitHand) {
            const splitBet = table.splitBet || table.originalBet;
            const split = this.resolveHandVsDealer(table.splitHand, splitBet, dealerVal);
            totalPayout += split.payout;
            resultMsg = `Principal: ${main.msg} · Split: ${split.msg}`;
        }

        let newBal = 0;
        if (totalPayout > 0) {
            const add = EconomyBridge.addCoins(userId, totalPayout, 'cards_blackjack', 'win', resultMsg);
            newBal = add.balance;
        } else {
            newBal = EconomyBridge.getUserBalance(userId).balance;
        }

        this.tables.delete(userId);

        return {
            success: true,
            playerHand: table.playerHand,
            playerScore: this.calculateHand(table.playerHand).total,
            splitHand: table.splitHand,
            splitScore: table.splitHand ? this.calculateHand(table.splitHand).total : null,
            dealerHand: table.dealerHand,
            dealerScore: dealerVal.total,
            result: resultMsg,
            payout: totalPayout,
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
            payout = table.bet;
            resultMsg = 'EMPATE DE BLACKJACKS · Se devuelve la apuesta';
        } else {
            payout = Math.floor(table.bet * cfg.blackjackPayout);
            resultMsg = '¡BLACKJACK NATURAL! Paga 3 a 2';
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
