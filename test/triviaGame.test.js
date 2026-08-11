const test = require('node:test');
const assert = require('node:assert');
const QuestionBank = require('../games/trivia/questionBank');
const TriviaEngine = require('../games/trivia/triviaEngine');

test('Trivia: Question Bank integrity', () => {
    const questions = QuestionBank.getAll();
    assert.ok(questions.length >= 10, 'Question bank should have at least 10 questions');

    questions.forEach(q => {
        assert.ok(q.id, 'Question must have an ID');
        assert.ok(q.question, 'Question must have text');
        assert.strictEqual(q.options.length, 4, 'Question must have exactly 4 options');
        assert.ok(q.correctIndex >= 0 && q.correctIndex <= 3, 'Correct index must be between 0 and 3');
    });
});

test('Trivia: Room lifecycle (create, join, answer, leaderboard)', () => {
    const hostId = 'test_host_' + Date.now();
    const playerId = 'test_player_' + Date.now();

    // 1. Create Room
    const createRes = TriviaEngine.createRoom(hostId, 'ElHost', 3);
    assert.ok(createRes.success, 'Creating room should succeed');
    const roomId = createRes.room.roomId;
    assert.ok(roomId.startsWith('PRP-'), 'Room code must start with PRP-');

    // 2. Join Room
    const joinRes = TriviaEngine.joinRoom(roomId, playerId, 'PlayerTwo');
    assert.ok(joinRes.success, 'Joining room should succeed');
    assert.strictEqual(joinRes.room.players.length, 2, 'Room should have 2 players');

    // 3. Start Game
    const startRes = TriviaEngine.startGame(roomId, hostId);
    assert.ok(startRes.success, 'Host should be able to start game');

    // 4. Submit Answer for both players
    const room = TriviaEngine.rooms.get(roomId);
    assert.strictEqual(room.state, 'QUESTION', 'Room state should be QUESTION');
    const correctIdx = room.questions[0].correctIndex;

    const ansRes1 = TriviaEngine.submitAnswer(roomId, hostId, correctIdx);
    assert.ok(ansRes1.success, 'Host submitting correct answer should succeed');

    const ansRes2 = TriviaEngine.submitAnswer(roomId, playerId, (correctIdx + 1) % 4);
    assert.ok(ansRes2.success, 'Player 2 submitting answer should succeed');

    const hostPlayer = room.players.get(hostId);
    assert.ok(hostPlayer.score >= 500, 'Correct answer should award at least 500 points');
    assert.strictEqual(hostPlayer.streak, 1, 'Streak should be 1');

    const secondPlayer = room.players.get(playerId);
    assert.strictEqual(secondPlayer.score, 0, 'Incorrect answer should award 0 points');
    assert.strictEqual(secondPlayer.streak, 0, 'Streak should be 0');

    // Clean up
    if (room.timerInterval) clearInterval(room.timerInterval);
    TriviaEngine.rooms.delete(roomId);
});
