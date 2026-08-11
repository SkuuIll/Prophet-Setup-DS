const QuestionBank = require('./questionBank');
const EconomyBridge = require('../common/economyBridge');
const cfg = require('../common/gamesConfig').trivia || {};

class TriviaEngine {
    constructor() {
        this.rooms = new Map();
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

    createRoom(hostUserId, hostUsername, questionCount = null) {
        const qCount = Math.min(15, Math.max(5, Number(questionCount) || cfg.defaultQuestions || 10));
        const roomId = this.generateRoomCode();
        const questions = QuestionBank.getRandomQuestions(qCount);

        const room = {
            roomId,
            hostUserId,
            state: 'LOBBY',
            players: new Map(),
            questions,
            currentQuestionIndex: 0,
            timeLeft: cfg.timeLimit || 15,
            questionStartTime: 0,
            timerInterval: null,
            createdTime: Date.now(),
            // Meta de partida
            firstBlood: null, // userId que acertó primero más veces
            stats: {}
        };

        room.players.set(hostUserId, this._newPlayer(hostUserId, hostUsername || 'Host', true));

        this.rooms.set(roomId, room);
        return { success: true, room: this.getPublicRoomState(room) };
    }

    _newPlayer(userId, username, isHost = false) {
        return {
            userId,
            username: username || `Jugador_${String(userId).slice(-4)}`,
            score: 0,
            streak: 0,
            bestStreak: 0,
            correct: 0,
            wrong: 0,
            perfectSpeed: 0, // respuestas en <3s
            currentAnswer: null,
            answerTime: 0,
            lastPoints: 0,
            isHost
        };
    }

    joinRoom(roomId, userId, username) {
        const room = this.rooms.get(String(roomId || '').toUpperCase().trim());
        if (!room) {
            return { success: false, error: 'La sala no existe o ya finalizó' };
        }

        if (room.state !== 'LOBBY') {
            return { success: false, error: 'La partida ya comenzó. Esperá a la siguiente.' };
        }

        if (room.players.size >= 12) {
            return { success: false, error: 'Sala llena (máx 12)' };
        }

        if (!room.players.has(userId)) {
            room.players.set(userId, this._newPlayer(userId, username));
        }

        this.broadcastToRoom(room.roomId, {
            type: 'trivia:player_joined',
            room: this.getPublicRoomState(room)
        });

        return { success: true, room: this.getPublicRoomState(room) };
    }

    startGame(roomId, requestingUserId) {
        const room = this.rooms.get(roomId);
        if (!room) return { success: false, error: 'Sala no encontrada' };
        if (room.hostUserId !== requestingUserId) return { success: false, error: 'Solo el anfitrión puede iniciar la partida' };
        if (room.state !== 'LOBBY') return { success: false, error: 'La partida ya inició' };
        if (room.players.size < 1) return { success: false, error: 'No hay jugadores' };

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
        room.timeLeft = q.timeLimit || cfg.timeLimit || 15;
        room.questionStartTime = Date.now();
        room.firstCorrectThisQ = null;

        for (const p of room.players.values()) {
            p.currentAnswer = null;
            p.answerTime = 0;
            p.lastPoints = 0;
        }

        this.broadcastToRoom(room.roomId, {
            type: 'trivia:question_start',
            questionIndex: room.currentQuestionIndex,
            totalQuestions: room.questions.length,
            category: q.category,
            difficulty: q.difficulty || 'normal',
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

            const allAnswered = Array.from(room.players.values()).every(p => p.currentAnswer !== null);

            if (room.timeLeft <= 0 || allAnswered) {
                clearInterval(room.timerInterval);
                this.revealAnswer(room);
            }
        }, 1000);

        if (room.timerInterval.unref) room.timerInterval.unref();
    }

    /**
     * Scoring v2:
     *  base 400
     *  + speed 0-600 (ratio tiempo restante)
     *  + streak bonus 0-400 (cap 8)
     *  + first blood +100
     *  + difficulty mult (easy 0.9 / normal 1 / hard 1.25)
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
        const timeLimit = q.timeLimit || cfg.timeLimit || 15;
        const streakCap = cfg.streakCap || 8;

        if (isCorrect) {
            const remainingRatio = Math.max(0, Math.min(1, (timeLimit - elapsedSec) / timeLimit));
            const speedPts = Math.floor(600 * remainingRatio);
            const streakPts = Math.min(streakCap, player.streak) * 50;
            let firstBlood = 0;
            if (!room.firstCorrectThisQ) {
                room.firstCorrectThisQ = userId;
                firstBlood = 100;
            }
            const diff = (q.difficulty || 'normal').toLowerCase();
            const diffMul = diff === 'hard' || diff === 'dificil' ? 1.25
                : diff === 'easy' || diff === 'facil' ? 0.9 : 1.0;

            const pointsGained = Math.floor((400 + speedPts + streakPts + firstBlood) * diffMul);
            player.score += pointsGained;
            player.streak += 1;
            player.bestStreak = Math.max(player.bestStreak, player.streak);
            player.correct += 1;
            player.lastPoints = pointsGained;
            if (elapsedSec <= 3) player.perfectSpeed += 1;
        } else {
            player.streak = 0;
            player.wrong += 1;
            player.lastPoints = 0;
        }

        this.broadcastToRoom(room.roomId, {
            type: 'trivia:player_answered',
            userId,
            totalAnswered: Array.from(room.players.values()).filter(p => p.currentAnswer !== null).length,
            totalPlayers: room.players.size
        });

        return { success: true, correct: isCorrect, points: player.lastPoints, streak: player.streak };
    }

    revealAnswer(room) {
        room.state = 'REVEAL';
        const q = room.questions[room.currentQuestionIndex];
        const leaderboard = this.getLeaderboard(room);

        this.broadcastToRoom(room.roomId, {
            type: 'trivia:reveal',
            correctIndex: q.correctIndex,
            explanation: q.explanation || null,
            leaderboard,
            perPlayer: leaderboard.map(p => ({
                userId: p.userId,
                lastPoints: room.players.get(p.userId)?.lastPoints || 0,
                streak: p.streak
            }))
        });

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

    endGame(room) {
        room.state = 'PODIUM';
        if (room.timerInterval) clearInterval(room.timerInterval);

        const leaderboard = this.getLeaderboard(room);
        const basePrizes = cfg.prizes || [3000, 1500, 750];
        // Escala con jugadores (más gente = pozo mayor)
        const scale = 1 + Math.max(0, room.players.size - 2) * 0.12;
        const perfectBonus = cfg.perfectBonus || 500;

        leaderboard.forEach((winner, idx) => {
            let reward = 0;
            if (idx < basePrizes.length) {
                reward = Math.floor(basePrizes[idx] * scale);
            }
            // Perfect game: todas correctas
            const p = room.players.get(winner.userId);
            if (p && p.correct === room.questions.length && p.wrong === 0) {
                reward += perfectBonus;
                winner.perfect = true;
            }
            // Best streak bonus
            if (p && p.bestStreak >= 5) {
                reward += 150;
                winner.streakBonus = true;
            }

            if (reward > 0) {
                EconomyBridge.addCoins(
                    winner.userId, reward, 'trivia_party', 'podium_win',
                    `${idx + 1}º Trivia ${room.roomId}`
                );
            }
            winner.rewardCoins = reward;
        });

        this.broadcastToRoom(room.roomId, {
            type: 'trivia:podium',
            podium: leaderboard.slice(0, 3),
            leaderboard,
            scale: Math.round(scale * 100) / 100
        });

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
                bestStreak: p.bestStreak,
                correct: p.correct,
                wrong: p.wrong,
                isHost: p.isHost
            }))
            .sort((a, b) => b.score - a.score || b.correct - a.correct);
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
