const QuestionBank = require('./questionBank');
const EconomyBridge = require('../common/economyBridge');

class TriviaEngine {
    constructor() {
        this.rooms = new Map(); // roomId -> Room
        this.broadcastCallback = null;
    }

    setBroadcast(cb) {
        this.broadcastCallback = cb;
    }

    broadcastToRoom(roomId, payload) {
        if (this.broadcastCallback) {
            this.broadcastCallback(roomId, payload);
        }
    }

    generateRoomCode() {
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const nums = '23456789';
        let code = 'PRP-';
        for (let i = 0; i < 3; i++) code += nums[Math.floor(Math.random() * nums.length)];
        return code;
    }

    /**
     * Crea una sala nueva de Trivia
     */
    createRoom(hostUserId, hostUsername, questionCount = 7) {
        const roomId = this.generateRoomCode();
        const questions = QuestionBank.getRandomQuestions(questionCount);

        const room = {
            roomId,
            hostUserId,
            state: 'LOBBY', // 'LOBBY', 'QUESTION', 'REVEAL', 'LEADERBOARD', 'PODIUM'
            players: new Map(),
            questions,
            currentQuestionIndex: 0,
            timeLeft: 15,
            questionStartTime: 0,
            timerInterval: null,
            createdTime: Date.now()
        };

        // Agregar al host como jugador
        room.players.set(hostUserId, {
            userId: hostUserId,
            username: hostUsername || 'Host',
            score: 0,
            streak: 0,
            currentAnswer: null,
            answerTime: 0,
            isHost: true
        });

        this.rooms.set(roomId, room);
        return { success: true, room: this.getPublicRoomState(room) };
    }

    /**
     * Se une a una sala existente
     */
    joinRoom(roomId, userId, username) {
        const room = this.rooms.get(roomId.toUpperCase().trim());
        if (!room) {
            return { success: false, error: 'La sala no existe o ya finalizó' };
        }

        if (room.state !== 'LOBBY') {
            return { success: false, error: 'La partida ya comenzó. Esperá a la siguiente.' };
        }

        if (!room.players.has(userId)) {
            room.players.set(userId, {
                userId,
                username: username || `Jugador_${userId.slice(-4)}`,
                score: 0,
                streak: 0,
                currentAnswer: null,
                answerTime: 0,
                isHost: false
            });
        }

        this.broadcastToRoom(room.roomId, {
            type: 'trivia:player_joined',
            room: this.getPublicRoomState(room)
        });

        return { success: true, room: this.getPublicRoomState(room) };
    }

    /**
     * Inicia la partida (Solo el Host)
     */
    startGame(roomId, requestingUserId) {
        const room = this.rooms.get(roomId);
        if (!room) return { success: false, error: 'Sala no encontrada' };
        if (room.hostUserId !== requestingUserId) return { success: false, error: 'Solo el anfitrión puede iniciar la partida' };
        if (room.state !== 'LOBBY') return { success: false, error: 'La partida ya inició' };

        room.currentQuestionIndex = 0;
        this.startQuestion(room);
        return { success: true };
    }

    startQuestion(room) {
        const q = room.questions[room.currentQuestionIndex];
        if (!q) {
            this.endGame(room);
            return;
        }

        room.state = 'QUESTION';
        room.timeLeft = q.timeLimit || 15;
        room.questionStartTime = Date.now();

        // Resetear respuestas de jugadores
        for (const p of room.players.values()) {
            p.currentAnswer = null;
            p.answerTime = 0;
        }

        this.broadcastToRoom(room.roomId, {
            type: 'trivia:question_start',
            questionIndex: room.currentQuestionIndex,
            totalQuestions: room.questions.length,
            category: q.category,
            question: q.question,
            options: q.options,
            timeLimit: room.timeLeft
        });

        if (room.timerInterval) clearInterval(room.timerInterval);

        room.timerInterval = setInterval(() => {
            room.timeLeft -= 1;
            this.broadcastToRoom(room.roomId, {
                type: 'trivia:timer_tick',
                timeLeft: room.timeLeft
            });

            // Verificar si todos respondieron
            const allAnswered = Array.from(room.players.values()).every(p => p.currentAnswer !== null);

            if (room.timeLeft <= 0 || allAnswered) {
                clearInterval(room.timerInterval);
                this.revealAnswer(room);
            }
        }, 1000);

        if (room.timerInterval.unref) {
            room.timerInterval.unref();
        }
    }

    /**
     * Registra la respuesta de un jugador
     */
    submitAnswer(roomId, userId, optionIndex) {
        const room = this.rooms.get(roomId);
        if (!room || room.state !== 'QUESTION') {
            return { success: false, error: 'No se aceptan respuestas en este momento' };
        }

        const player = room.players.get(userId);
        if (!player) return { success: false, error: 'No estás en esta sala' };
        if (player.currentAnswer !== null) return { success: false, error: 'Ya enviaste tu respuesta' };

        const opt = parseInt(optionIndex, 10);
        if (isNaN(opt) || opt < 0 || opt > 3) return { success: false, error: 'Opción inválida' };

        const elapsedSec = (Date.now() - room.questionStartTime) / 1000;
        player.currentAnswer = opt;
        player.answerTime = elapsedSec;

        const q = room.questions[room.currentQuestionIndex];
        const isCorrect = opt === q.correctIndex;

        if (isCorrect) {
            // Fórmula de velocidad (500 a 1000 pts)
            const remainingRatio = Math.max(0, (q.timeLimit - elapsedSec) / q.timeLimit);
            const pointsGained = 500 + Math.floor(500 * remainingRatio) + (player.streak * 50);
            player.score += pointsGained;
            player.streak += 1;
            player.lastPoints = pointsGained;
        } else {
            player.streak = 0;
            player.lastPoints = 0;
        }

        this.broadcastToRoom(room.roomId, {
            type: 'trivia:player_answered',
            userId,
            totalAnswered: Array.from(room.players.values()).filter(p => p.currentAnswer !== null).length,
            totalPlayers: room.players.size
        });

        return { success: true };
    }

    /**
     * Revela la respuesta correcta y muestra el scoreboard
     */
    revealAnswer(room) {
        room.state = 'REVEAL';
        const q = room.questions[room.currentQuestionIndex];

        const leaderboard = this.getLeaderboard(room);

        this.broadcastToRoom(room.roomId, {
            type: 'trivia:reveal',
            correctIndex: q.correctIndex,
            leaderboard
        });

        // Esperar 4 segundos y mostrar pantalla de posiciones o pasar a la siguiente
        const revealTimeout = setTimeout(() => {
            if (room.currentQuestionIndex + 1 < room.questions.length) {
                room.currentQuestionIndex++;
                this.startQuestion(room);
            } else {
                this.endGame(room);
            }
        }, 4000);
        if (revealTimeout.unref) revealTimeout.unref();
    }

    /**
     * Termina la partida y entrega premios a los 3 primeros
     */
    endGame(room) {
        room.state = 'PODIUM';
        if (room.timerInterval) clearInterval(room.timerInterval);

        const leaderboard = this.getLeaderboard(room);
        const prizes = [2500, 1000, 500];

        leaderboard.slice(0, 3).forEach((winner, idx) => {
            const reward = prizes[idx] || 0;
            if (reward > 0) {
                EconomyBridge.addCoins(winner.userId, reward, 'trivia_party', 'podium_win', `${idx + 1}º Puesto en Trivia (${room.roomId})`);
            }
            winner.rewardCoins = reward;
        });

        this.broadcastToRoom(room.roomId, {
            type: 'trivia:podium',
            podium: leaderboard.slice(0, 3),
            leaderboard
        });

        // Eliminar sala después de 5 minutos
        const cleanupTimeout = setTimeout(() => {
            this.rooms.delete(room.roomId);
        }, 300000);
        if (cleanupTimeout.unref) cleanupTimeout.unref();
    }

    getLeaderboard(room) {
        return Array.from(room.players.values())
            .map(p => ({
                userId: p.userId,
                username: p.username,
                score: p.score,
                streak: p.streak,
                isHost: p.isHost
            }))
            .sort((a, b) => b.score - a.score);
    }

    getPublicRoomState(room) {
        return {
            roomId: room.roomId,
            hostUserId: room.hostUserId,
            state: room.state,
            players: this.getLeaderboard(room),
            totalQuestions: room.questions.length,
            currentQuestionIndex: room.currentQuestionIndex
        };
    }
}

module.exports = new TriviaEngine();
