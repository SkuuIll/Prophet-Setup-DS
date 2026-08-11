/**
 * ════ MAZO ESPAÑOL & JERARQUÍA OFICIAL — TRUCO ARGENTINO ════
 */

const SUITS = ['espada', 'basto', 'oro', 'copa'];
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

class TrucoDeck {
    /**
     * Devuelve el ranking de poder de una carta en el Truco Argentino (14 más alta, 1 más baja)
     */
    static getCardPower(number, suit) {
        if (number === 1 && suit === 'espada') return 14; // Macho
        if (number === 1 && suit === 'basto') return 13;  // Hembra
        if (number === 7 && suit === 'espada') return 12; // 7 de espada
        if (number === 7 && suit === 'oro') return 11;    // 7 de oro
        if (number === 3) return 10;
        if (number === 2) return 9;
        if (number === 1 && (suit === 'oro' || suit === 'copa')) return 8; // Ases falsos
        if (number === 12) return 7; // Reyes
        if (number === 11) return 6; // Caballos
        if (number === 10) return 5; // Sotas
        if (number === 7 && (suit === 'copa' || suit === 'basto')) return 4; // Sietes falsos
        if (number === 6) return 3;
        if (number === 5) return 2;
        if (number === 4) return 1;
        return 0;
    }

    /**
     * Calcula el valor de una carta para el Envido (figuras 10, 11, 12 valen 0)
     */
    static getEnvidoCardValue(number) {
        if (number >= 10) return 0;
        return number;
    }

    /**
     * Calcula el puntaje de Envido para una mano de 3 cartas
     */
    static calculateEnvido(cards) {
        if (!Array.isArray(cards) || cards.length === 0) return 0;

        // Agrupar por palo
        const bySuit = {};
        for (const c of cards) {
            if (!bySuit[c.suit]) bySuit[c.suit] = [];
            bySuit[c.suit].push(this.getEnvidoCardValue(c.number));
        }

        let maxEnvido = 0;

        for (const suit in bySuit) {
            const vals = bySuit[suit].sort((a, b) => b - a);
            if (vals.length >= 2) {
                // 2 o 3 cartas del mismo palo -> suma de las dos más altas + 20
                const sum = 20 + vals[0] + vals[1];
                if (sum > maxEnvido) maxEnvido = sum;
            } else if (vals.length === 1) {
                // 1 sola carta del palo
                if (vals[0] > maxEnvido) maxEnvido = vals[0];
            }
        }

        return maxEnvido;
    }

    /**
     * Genera un mazo de 40 cartas mezcladas
     */
    static createShuffledDeck() {
        const deck = [];
        for (const suit of SUITS) {
            for (const number of NUMBERS) {
                deck.push({
                    number,
                    suit,
                    power: this.getCardPower(number, suit),
                    envidoVal: this.getEnvidoCardValue(number)
                });
            }
        }

        // Fisher-Yates shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    }
}

module.exports = TrucoDeck;
