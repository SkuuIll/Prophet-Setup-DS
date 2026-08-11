const TrucoDeck = require('./trucoDeck');
const EconomyBridge = require('../common/economyBridge');

class TrucoEngine {
    constructor() {
        this.tables = new Map(); // tableId -> Table
        this.broadcastCallback = null;
    }

    setBroadcast(cb) {
        this.broadcastCallback = cb;
    }

    broadcast(tableId, payload) {
        if (this.broadcastCallback) {
            this.broadcastCallback(tableId, payload);
        }
    }

    generateTableCode() {
        const nums = '23456789';
        let code = 'TRU-';
        for (let i = 0; i < 3; i++) code += nums[Math.floor(Math.random() * nums.length)];
        return code;
    }

    /**
     * Crea una mesa de Truco 1v1
     */
    createTable(hostUserId, hostUsername, betAmount = 100, targetScore = 15) {
        const bet = Math.max(0, Math.floor(Number(betAmount) || 0));

        if (bet > 0) {
            const deduct = EconomyBridge.deductCoins(hostUserId, bet, 'cards_truco', 'table_bet', 'Creación de mesa de Truco');
            if (!deduct.success) {
                return { success: false, error: deduct.error || 'Saldo insuficiente para la apuesta' };
            }
        }

        const tableId = this.generateTableCode();
        const table = {
            tableId,
            betAmount: bet,
            pot: bet,
            targetScore: targetScore === 30 ? 30 : 15,
            state: 'WAITING_OPPONENT', // 'WAITING_OPPONENT', 'PLAYING', 'ROUND_END', 'FINISHED'
            players: [
                {
                    userId: hostUserId,
                    username: hostUsername || 'Host',
                    score: 0,
                    hand: [],
                    playedCards: [],
                    envidoPoints: 0,
                    envidoCalled: false
                }
            ],
            manoIndex: 0,
            turnIndex: 0,
            currentTrick: 0, // 0: primera, 1: segunda, 2: tercera
            trickCards: [], // [{ playerIdx, card }]
            trickWins: [], // [playerIdx or 'parda']
            trucoLevel: 1, // 1: base, 2: truco, 3: retruco, 4: vale cuatro
            trucoOwner: null, // quién tiene el derecho a subir
            envidoPlayed: false,
            pendingCanto: null, // { type, fromIdx, value, pointsIfNo }
            createdTime: Date.now()
        };

        this.tables.set(tableId, table);
        return { success: true, table: this.getPublicState(table, hostUserId) };
    }

    /**
     * Unirse a una mesa de Truco existente
     */
    joinTable(tableId, guestUserId, guestUsername) {
        const code = String(tableId || '').toUpperCase().trim();
        const table = this.tables.get(code);
        if (!table) return { success: false, error: 'Mesa no encontrada' };

        // Reconexión: el jugador ya está en la mesa
        const existingIdx = table.players.findIndex(p => p.userId === guestUserId);
        if (existingIdx !== -1) {
            return {
                success: true,
                reconnected: true,
                table: this.getPublicState(table, guestUserId)
            };
        }

        if (table.players.length >= 2) return { success: false, error: 'La mesa ya está completa' };
        if (table.state === 'FINISHED') return { success: false, error: 'La partida ya terminó' };

        if (table.betAmount > 0) {
            const deduct = EconomyBridge.deductCoins(guestUserId, table.betAmount, 'cards_truco', 'table_bet', `Unión a mesa ${table.tableId}`);
            if (!deduct.success) {
                return { success: false, error: deduct.error || 'Saldo insuficiente para igualar la apuesta' };
            }
            table.pot += table.betAmount;
        }

        table.players.push({
            userId: guestUserId,
            username: guestUsername || `Jugador_${String(guestUserId).slice(-4)}`,
            score: 0,
            hand: [],
            playedCards: [],
            envidoPoints: 0,
            envidoCalled: false
        });

        table.state = 'PLAYING';
        this.dealNewHand(table);

        this.broadcast(table.tableId, {
            type: 'truco:player_joined',
            table: this.getPublicState(table)
        });

        return { success: true, table: this.getPublicState(table, guestUserId) };
    }

    /**
     * Re-sincronizar estado de mesa (reconexión sin re-pagar)
     */
    getTableState(tableId, userId) {
        const table = this.tables.get(String(tableId || '').toUpperCase().trim());
        if (!table) return { success: false, error: 'Mesa no encontrada' };
        const inTable = table.players.some(p => p.userId === userId);
        if (!inTable) return { success: false, error: 'No estás en esta mesa' };
        return { success: true, table: this.getPublicState(table, userId) };
    }

    /**
     * Reparte 3 cartas a cada jugador y calcula el envido
     */
    dealNewHand(table) {
        const deck = TrucoDeck.createShuffledDeck();

        table.players[0].hand = [deck[0], deck[1], deck[2]];
        table.players[1].hand = [deck[3], deck[4], deck[5]];

        table.players[0].playedCards = [];
        table.players[1].playedCards = [];

        table.players[0].envidoPoints = TrucoDeck.calculateEnvido(table.players[0].hand);
        table.players[1].envidoPoints = TrucoDeck.calculateEnvido(table.players[1].hand);

        table.currentTrick = 0;
        table.trickCards = [];
        table.trickWins = [];
        table.trucoLevel = 1;
        table.trucoOwner = null;
        table.envidoPlayed = false;
        table.pendingCanto = null;

        table.turnIndex = table.manoIndex;

        this.broadcast(table.tableId, {
            type: 'truco:hand_dealt',
            tableId: table.tableId,
            manoIndex: table.manoIndex,
            turnIndex: table.turnIndex
        });
    }

    /**
     * Jugar una carta en la mesa
     */
    playCard(tableId, userId, cardIndex) {
        const table = this.tables.get(tableId);
        if (!table || table.state !== 'PLAYING') return { success: false, error: 'Partida no activa' };

        const playerIdx = table.players.findIndex(p => p.userId === userId);
        if (playerIdx === -1) return { success: false, error: 'No pertenecés a esta mesa' };

        if (table.pendingCanto) {
            return { success: false, error: 'Hay un canto pendiente de respuesta' };
        }

        if (table.turnIndex !== playerIdx) {
            return { success: false, error: 'No es tu turno de jugar' };
        }

        const player = table.players[playerIdx];
        const idx = parseInt(cardIndex, 10);
        if (isNaN(idx) || idx < 0 || idx >= player.hand.length) {
            return { success: false, error: 'Carta inválida' };
        }

        const card = player.hand.splice(idx, 1)[0];
        player.playedCards.push(card);
        table.trickCards.push({ playerIdx, card });

        this.broadcast(table.tableId, {
            type: 'truco:card_played',
            playerIdx,
            card,
            currentTrick: table.currentTrick
        });

        // Si ambos jugadores tiraron carta en la vuelta actual
        if (table.trickCards.length === 2) {
            this.resolveTrick(table);
        } else {
            // Turno del otro jugador
            table.turnIndex = 1 - table.turnIndex;
        }

        return { success: true };
    }

    /**
     * Resuelve una vuelta (primera, segunda o tercera)
     */
    resolveTrick(table) {
        const [first, second] = table.trickCards;
        let winnerIdx = null;

        if (first.card.power > second.card.power) {
            winnerIdx = first.playerIdx;
        } else if (second.card.power > first.card.power) {
            winnerIdx = second.playerIdx;
        } else {
            winnerIdx = 'parda'; // Empate
        }

        table.trickWins.push(winnerIdx);
        table.trickCards = [];

        // Verificar si la mano de 3 vueltas ya tiene ganador
        const handWinner = this.checkHandWinner(table.trickWins, table.manoIndex);

        if (handWinner !== null) {
            // Se define la mano
            const pointsWon = table.trucoLevel;
            table.players[handWinner].score += pointsWon;

            this.broadcast(table.tableId, {
                type: 'truco:hand_finished',
                winnerIdx: handWinner,
                pointsWon,
                trickWins: table.trickWins,
                scores: [table.players[0].score, table.players[1].score]
            });

            // Verificar si alguien ganó la partida
            if (table.players[handWinner].score >= table.targetScore) {
                this.finishGame(table, handWinner);
            } else {
                // Siguiente mano
                table.manoIndex = 1 - table.manoIndex;
                setTimeout(() => this.dealNewHand(table), 2500);
            }
        } else {
            // Siguiente vuelta
            table.currentTrick++;
            table.turnIndex = winnerIdx === 'parda' ? table.manoIndex : winnerIdx;

            this.broadcast(table.tableId, {
                type: 'truco:trick_resolved',
                winnerIdx,
                nextTurn: table.turnIndex,
                currentTrick: table.currentTrick
            });
        }
    }

    checkHandWinner(wins, manoIdx) {
        if (wins.length === 2) {
            // 2 a 0
            if (wins[0] === 0 && wins[1] === 0) return 0;
            if (wins[0] === 1 && wins[1] === 1) return 1;
            // 1ra parda -> gana el que gana 2da
            if (wins[0] === 'parda' && wins[1] !== 'parda') return wins[1];
            // 2da parda -> gana el que ganó 1ra
            if (wins[1] === 'parda' && wins[0] !== 'parda') return wins[0];
            // Doble parda -> gana mano
            if (wins[0] === 'parda' && wins[1] === 'parda') return manoIdx;
            // 1-1 distinto -> va a tercera (null)
        } else if (wins.length === 3) {
            // Contar vueltas no pardas
            const count = [0, 0];
            for (const w of wins) {
                if (w === 0 || w === 1) count[w]++;
            }
            if (count[0] > count[1]) return 0;
            if (count[1] > count[0]) return 1;
            // Empate en vueltas (ej. parda en alguna): gana quien ganó la 1ra no-parda, o mano
            for (const w of wins) {
                if (w === 0 || w === 1) return w;
            }
            return manoIdx;
        }
        return null;
    }

    /**
     * Realizar un Canto (Envido o Truco)
     */
    makeCanto(tableId, userId, cantoType) {
        const table = this.tables.get(tableId);
        if (!table || table.state !== 'PLAYING') return { success: false, error: 'Mesa inactiva' };

        const playerIdx = table.players.findIndex(p => p.userId === userId);
        if (playerIdx === -1) return { success: false, error: 'Jugador no válido' };

        const rivalIdx = 1 - playerIdx;

        if (cantoType === 'truco') {
            if (table.trucoLevel >= 2) return { success: false, error: 'El Truco ya fue cantado' };
            table.pendingCanto = { type: 'truco', fromIdx: playerIdx, value: 2, pointsIfNo: 1 };
        } else if (cantoType === 'retruco') {
            if (table.trucoLevel !== 2 || table.trucoOwner === playerIdx) return { success: false, error: 'No podés cantar Retruco' };
            table.pendingCanto = { type: 'retruco', fromIdx: playerIdx, value: 3, pointsIfNo: 2 };
        } else if (cantoType === 'vale_cuatro') {
            if (table.trucoLevel !== 3 || table.trucoOwner === playerIdx) return { success: false, error: 'No podés cantar Vale Cuatro' };
            table.pendingCanto = { type: 'vale_cuatro', fromIdx: playerIdx, value: 4, pointsIfNo: 3 };
        } else if (cantoType === 'envido') {
            if (table.envidoPlayed || table.currentTrick > 0) return { success: false, error: 'El Envido solo se canta en primera vuelta' };
            table.pendingCanto = { type: 'envido', fromIdx: playerIdx, value: 2, pointsIfNo: 1, chain: 1 };
        } else if (cantoType === 'envido_envido') {
            // Respuesta en cadena: suma +2 (total 4 si venía de envido)
            if (table.currentTrick > 0) return { success: false, error: 'Envido solo en primera' };
            if (!table.pendingCanto || !['envido', 'envido_envido'].includes(table.pendingCanto.type)) {
                return { success: false, error: 'Solo podés subir un Envido pendiente' };
            }
            if (table.pendingCanto.fromIdx === playerIdx) return { success: false, error: 'No podés subir tu propio canto' };
            const prev = table.pendingCanto;
            table.pendingCanto = {
                type: 'envido_envido',
                fromIdx: playerIdx,
                value: (prev.value || 2) + 2,
                pointsIfNo: prev.value || 2,
                chain: (prev.chain || 1) + 1
            };
        } else if (cantoType === 'real_envido') {
            if (table.envidoPlayed || table.currentTrick > 0) return { success: false, error: 'No se puede cantar Real Envido ahora' };
            // Si hay envido pendiente, se suma
            if (table.pendingCanto && ['envido', 'envido_envido', 'real_envido'].includes(table.pendingCanto.type)) {
                if (table.pendingCanto.fromIdx === playerIdx) return { success: false, error: 'No podés subir tu propio canto' };
                const prev = table.pendingCanto;
                table.pendingCanto = {
                    type: 'real_envido',
                    fromIdx: playerIdx,
                    value: (prev.value || 0) + 3,
                    pointsIfNo: prev.value || 1,
                    chain: (prev.chain || 1) + 1
                };
            } else {
                table.pendingCanto = { type: 'real_envido', fromIdx: playerIdx, value: 3, pointsIfNo: 1, chain: 1 };
            }
        } else if (cantoType === 'falta_envido') {
            if (table.envidoPlayed || table.currentTrick > 0) return { success: false, error: 'No se puede cantar Falta Envido ahora' };
            const maxScore = Math.max(table.players[0].score, table.players[1].score);
            const faltaPoints = Math.max(1, table.targetScore - maxScore);
            // Si hay cadena de envido, falta la define
            if (table.pendingCanto && ['envido', 'envido_envido', 'real_envido'].includes(table.pendingCanto.type)) {
                if (table.pendingCanto.fromIdx === playerIdx) return { success: false, error: 'No podés subir tu propio canto' };
                table.pendingCanto = {
                    type: 'falta_envido',
                    fromIdx: playerIdx,
                    value: faltaPoints,
                    pointsIfNo: table.pendingCanto.value || 1,
                    chain: (table.pendingCanto.chain || 1) + 1
                };
            } else {
                table.pendingCanto = { type: 'falta_envido', fromIdx: playerIdx, value: faltaPoints, pointsIfNo: 1, chain: 1 };
            }
        } else {
            return { success: false, error: 'Canto no reconocido' };
        }

        this.broadcast(table.tableId, {
            type: 'truco:canto_made',
            cantoType,
            fromIdx: playerIdx,
            targetIdx: rivalIdx
        });

        return { success: true };
    }

    /**
     * Responder a un Canto (Quiero o No Quiero)
     */
    respondCanto(tableId, userId, response) {
        const table = this.tables.get(tableId);
        if (!table || !table.pendingCanto) return { success: false, error: 'No hay canto pendiente' };

        const playerIdx = table.players.findIndex(p => p.userId === userId);
        const canto = table.pendingCanto;
        if (canto.fromIdx === playerIdx) return { success: false, error: 'No podés responderte a vos mismo' };

        const wants = response === 'quiero';
        const rivalIdx = canto.fromIdx;

        const isEnvidoFamily = ['envido', 'envido_envido', 'real_envido', 'falta_envido'].includes(canto.type);
        if (isEnvidoFamily) {
            table.envidoPlayed = true;
            if (wants) {
                const p0Envido = table.players[0].envidoPoints;
                const p1Envido = table.players[1].envidoPoints;
                let envidoWinner = null;

                if (p0Envido > p1Envido) envidoWinner = 0;
                else if (p1Envido > p0Envido) envidoWinner = 1;
                else envidoWinner = table.manoIndex; // Mano gana en empate

                table.players[envidoWinner].score += canto.value;

                const envidoWin = table.players[envidoWinner].score >= table.targetScore;

                this.broadcast(table.tableId, {
                    type: 'truco:envido_result',
                    winnerIdx: envidoWinner,
                    p0Envido,
                    p1Envido,
                    pointsGained: canto.value,
                    cantoType: canto.type,
                    chain: canto.chain || 1,
                    scores: [table.players[0].score, table.players[1].score]
                });

                if (envidoWin) {
                    table.pendingCanto = null;
                    this.finishGame(table, envidoWinner);
                    return { success: true };
                }
            } else {
                table.players[rivalIdx].score += canto.pointsIfNo;
                this.broadcast(table.tableId, {
                    type: 'truco:canto_rejected',
                    winnerIdx: rivalIdx,
                    pointsGained: canto.pointsIfNo,
                    cantoType: canto.type,
                    scores: [table.players[0].score, table.players[1].score]
                });
            }
        } else {
            // Truco / Retruco / Vale Cuatro
            if (wants) {
                table.trucoLevel = canto.value;
                table.trucoOwner = rivalIdx;
                this.broadcast(table.tableId, {
                    type: 'truco:canto_accepted',
                    cantoType: canto.type,
                    trucoLevel: canto.value
                });
            } else {
                // No quiero al truco -> se termina la mano
                table.players[rivalIdx].score += canto.pointsIfNo;
                this.broadcast(table.tableId, {
                    type: 'truco:hand_finished',
                    winnerIdx: rivalIdx,
                    pointsWon: canto.pointsIfNo,
                    scores: [table.players[0].score, table.players[1].score]
                });

                if (table.players[rivalIdx].score >= table.targetScore) {
                    this.finishGame(table, rivalIdx);
                    return { success: true };
                }

                table.manoIndex = 1 - table.manoIndex;
                setTimeout(() => this.dealNewHand(table), 2500);
            }
        }

        table.pendingCanto = null;
        return { success: true };
    }

    /**
     * Irse al Mazo
     */
    foldHand(tableId, userId) {
        const table = this.tables.get(tableId);
        if (!table || table.state !== 'PLAYING') return { success: false, error: 'Mesa inactiva' };

        const playerIdx = table.players.findIndex(p => p.userId === userId);
        if (playerIdx === -1) return { success: false, error: 'Jugador no válido' };

        const winnerIdx = 1 - playerIdx;
        const points = table.trucoLevel;
        table.players[winnerIdx].score += points;

        this.broadcast(table.tableId, {
            type: 'truco:player_folded',
            foldedIdx: playerIdx,
            winnerIdx,
            pointsWon: points,
            scores: [table.players[0].score, table.players[1].score]
        });

        if (table.players[winnerIdx].score >= table.targetScore) {
            this.finishGame(table, winnerIdx);
        } else {
            table.manoIndex = 1 - table.manoIndex;
            setTimeout(() => this.dealNewHand(table), 2500);
        }

        return { success: true };
    }

    finishGame(table, winnerIdx) {
        table.state = 'FINISHED';
        const winner = table.players[winnerIdx];

        if (table.pot > 0) {
            EconomyBridge.addCoins(winner.userId, table.pot, 'cards_truco', 'table_win', `Victoria en Truco (${table.tableId})`);
        }

        this.broadcast(table.tableId, {
            type: 'truco:game_over',
            winnerIdx,
            winnerUsername: winner.username,
            potWon: table.pot,
            scores: [table.players[0].score, table.players[1].score]
        });

        setTimeout(() => this.tables.delete(table.tableId), 300000);
    }

    getPublicState(table, forUserId = null) {
        return {
            tableId: table.tableId,
            betAmount: table.betAmount,
            pot: table.pot,
            targetScore: table.targetScore,
            state: table.state,
            players: table.players.map(p => ({
                userId: p.userId,
                username: p.username,
                score: p.score,
                playedCards: p.playedCards,
                // Ocultar cartas en mano a rivales
                hand: p.userId === forUserId ? p.hand : p.hand.map(() => ({ hidden: true })),
                cardCount: p.hand.length,
                envidoPoints: p.userId === forUserId ? p.envidoPoints : null
            })),
            manoIndex: table.manoIndex,
            turnIndex: table.turnIndex,
            currentTrick: table.currentTrick,
            trickWins: table.trickWins,
            trucoLevel: table.trucoLevel,
            pendingCanto: table.pendingCanto
        };
    }
}

module.exports = new TrucoEngine();
