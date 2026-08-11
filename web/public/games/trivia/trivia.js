/**
 * ════ PROPHET TRIVIA PARTY — CLIENT CONTROLLER ════
 */

let currentRoom = null;
let currentQuestion = null;
let myAnswerSelected = null;
let myUserId = null;
let soundEnabled = true;

// DOM Elements
const viewLobby = document.getElementById('view-lobby');
const viewQuestion = document.getElementById('view-question');
const viewReveal = document.getElementById('view-reveal');
const viewPodium = document.getElementById('view-podium');

const lobbySetupPanel = document.getElementById('lobby-setup-panel');
const lobbyRoomWaiting = document.getElementById('lobby-room-waiting');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom = document.getElementById('btn-join-room');
const inputRoomCode = document.getElementById('input-room-code');
const displayRoomCode = document.getElementById('display-room-code');
const waitingPlayersCount = document.getElementById('waiting-players-count');
const waitingPlayersList = document.getElementById('waiting-players-list');
const hostStartBar = document.getElementById('host-start-bar');
const btnStartGame = document.getElementById('btn-start-game');

// Question Elements
const qProgressText = document.getElementById('q-progress-text');
const qCategoryText = document.getElementById('q-category-text');
const timerBarFill = document.getElementById('timer-bar-fill');
const timerSecondsText = document.getElementById('timer-seconds-text');
const questionText = document.getElementById('question-text');
const answerCards = document.querySelectorAll('.answer-card');

// Reveal Elements
const feedbackIcon = document.getElementById('feedback-icon');
const feedbackTitle = document.getElementById('feedback-title');
const feedbackPoints = document.getElementById('feedback-points');
const scoreboardList = document.getElementById('scoreboard-list');

// Sound Toggle
const soundToggle = document.getElementById('btn-sound');
soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.innerText = soundEnabled ? '🔊' : '🔇';
});

function switchView(viewElement) {
    [viewLobby, viewQuestion, viewReveal, viewPodium].forEach(v => v.classList.remove('active'));
    viewElement.classList.add('active');
}

// ═══ GESTIÓN DEL LOBBY ═══
btnCreateRoom.addEventListener('click', () => {
    SoundFX.playClick();
    window.prophetClient.send({
        type: 'trivia:create_room',
        questionCount: 7
    });
});

btnJoinRoom.addEventListener('click', () => {
    const code = inputRoomCode.value.trim();
    if (!code) {
        alert('Ingresá el código de la sala');
        return;
    }
    SoundFX.playClick();
    window.prophetClient.send({
        type: 'trivia:join_room',
        roomId: code
    });
});

btnStartGame.addEventListener('click', () => {
    if (!currentRoom) return;
    SoundFX.playUpgrade();
    window.prophetClient.send({
        type: 'trivia:start_game',
        roomId: currentRoom.roomId
    });
});

function renderWaitingPlayers(players) {
    waitingPlayersList.innerHTML = '';
    waitingPlayersCount.innerText = players.length;
    players.forEach(p => {
        const pill = document.createElement('div');
        pill.className = 'waiting-player-pill';
        pill.innerHTML = `
            <span>${p.isHost ? '👑' : '🎮'}</span>
            <span>${p.username}</span>
        `;
        waitingPlayersList.appendChild(pill);
    });
}

// ═══ INTERACCIÓN DE RESPUESTAS ═══
answerCards.forEach(card => {
    card.addEventListener('click', () => {
        if (myAnswerSelected !== null) return;
        const optIndex = parseInt(card.getAttribute('data-index'), 10);
        myAnswerSelected = optIndex;
        card.classList.add('selected');
        answerCards.forEach(c => c.classList.add('disabled'));

        SoundFX.playClick();

        window.prophetClient.send({
            type: 'trivia:answer',
            roomId: currentRoom.roomId,
            optionIndex: optIndex
        });
    });
});

// ═══ EVENTOS WEBSOCKET DE TRIVIA ═══
window.initTriviaEvents = () => {
    // 1. Sala Creada
    window.prophetClient.on('trivia:room_created', (data) => {
        if (data.success) {
            currentRoom = data.room;
            displayRoomCode.innerText = data.room.roomId;
            lobbySetupPanel.style.display = 'none';
            lobbyRoomWaiting.style.display = 'block';
            hostStartBar.style.display = 'block';
            renderWaitingPlayers(data.room.players);
            if (soundEnabled) SoundFX.playUpgrade();
        } else {
            alert(data.error || 'No se pudo crear la sala');
        }
    });

    // 2. Jugador Unido
    window.prophetClient.on('trivia:room_joined', (data) => {
        if (data.success) {
            currentRoom = data.room;
            displayRoomCode.innerText = data.room.roomId;
            lobbySetupPanel.style.display = 'none';
            lobbyRoomWaiting.style.display = 'block';
            hostStartBar.style.display = data.room.hostUserId === myUserId ? 'block' : 'none';
            renderWaitingPlayers(data.room.players);
            if (soundEnabled) SoundFX.playUpgrade();
        } else {
            alert(data.error || 'No se pudo unir a la sala');
        }
    });

    // 3. Nuevo Jugador Entró a la Sala
    window.prophetClient.on('trivia:player_joined', (data) => {
        if (data.room) {
            currentRoom = data.room;
            renderWaitingPlayers(data.room.players);
            if (soundEnabled) SoundFX.playCoin();
        }
    });

    // 4. Comienza una Pregunta
    window.prophetClient.on('trivia:question_start', (data) => {
        currentQuestion = data;
        myAnswerSelected = null;

        qProgressText.innerText = `Pregunta ${data.questionIndex + 1} de ${data.totalQuestions}`;
        qCategoryText.innerText = data.category;
        questionText.innerText = data.question;

        for (let i = 0; i < 4; i++) {
            document.getElementById(`ans-text-${i}`).innerText = data.options[i] || '--';
        }

        answerCards.forEach(c => {
            c.className = c.className.replace(/\b(selected|disabled|correct-highlight)\b/g, '').trim();
        });

        timerBarFill.style.width = '100%';
        timerSecondsText.innerText = `${data.timeLimit}s`;

        switchView(viewQuestion);
        if (soundEnabled) SoundFX.playClick();
    });

    // 5. Timer Tick
    window.prophetClient.on('trivia:timer_tick', (data) => {
        if (currentQuestion) {
            const ratio = Math.max(0, data.timeLeft / currentQuestion.timeLimit);
            timerBarFill.style.width = `${ratio * 100}%`;
            timerSecondsText.innerText = `${data.timeLeft}s`;
        }
    });

    // 6. Revelación de Respuesta
    window.prophetClient.on('trivia:reveal', (data) => {
        const correctIdx = data.correctIndex;
        const myPlayer = (data.leaderboard || []).find(p => p.userId === myUserId);
        const wasCorrect = myAnswerSelected === correctIdx;

        if (wasCorrect) {
            feedbackIcon.innerText = '✅';
            feedbackTitle.innerText = '¡RESPUESTA CORRECTA!';
            feedbackTitle.style.color = 'var(--color-success)';
            feedbackPoints.innerText = `+${myPlayer?.lastPoints || 850} PTS ${myPlayer?.streak > 1 ? `🔥 Racha x${myPlayer.streak}` : ''}`;
            if (soundEnabled) SoundFX.playUpgrade();
        } else {
            feedbackIcon.innerText = '❌';
            feedbackTitle.innerText = myAnswerSelected === null ? '¡SE ACABÓ EL TIEMPO!' : '¡INCORRECTO!';
            feedbackTitle.style.color = 'var(--color-danger)';
            feedbackPoints.innerText = '+0 PTS';
            if (soundEnabled) SoundFX.playClick();
        }

        // Render Scoreboard
        scoreboardList.innerHTML = '';
        (data.leaderboard || []).forEach((p, idx) => {
            const row = document.createElement('div');
            row.className = `score-row ${p.userId === myUserId ? 'highlight' : ''}`;
            row.innerHTML = `
                <span>#${idx + 1} ${p.username} ${p.streak > 1 ? `🔥${p.streak}` : ''}</span>
                <span style="color: var(--color-gold);">${formatNumber(p.score)} pts</span>
            `;
            scoreboardList.appendChild(row);
        });

        switchView(viewReveal);
    });

    // 7. Podio Final
    window.prophetClient.on('trivia:podium', (data) => {
        const podium = data.podium || [];

        // 1er Puesto
        if (podium[0]) {
            document.getElementById('place-1-name').innerText = podium[0].username;
            document.getElementById('place-1-score').innerText = `${formatNumber(podium[0].score)} pts`;
        }
        // 2do Puesto
        if (podium[1]) {
            document.getElementById('place-2-name').innerText = podium[1].username;
            document.getElementById('place-2-score').innerText = `${formatNumber(podium[1].score)} pts`;
        } else {
            document.getElementById('place-2').style.opacity = '0.3';
        }
        // 3er Puesto
        if (podium[2]) {
            document.getElementById('place-3-name').innerText = podium[2].username;
            document.getElementById('place-3-score').innerText = `${formatNumber(podium[2].score)} pts`;
        } else {
            document.getElementById('place-3').style.opacity = '0.3';
        }

        switchView(viewPodium);
        if (soundEnabled) {
            if (SoundFX.playWin) SoundFX.playWin();
            else SoundFX.playUpgrade();
        }
        if (window.spawnConfetti) spawnConfetti(48);
    });
};

document.getElementById('btn-restart-trivia').addEventListener('click', () => {
    location.reload();
});

// ═══ INICIALIZADOR GENERAL ═══
document.addEventListener('DOMContentLoaded', async () => {
    const authData = await window.prophetClient.connect();
    if (authData) {
        myUserId = authData.userId;
        document.getElementById('trivia-balance').innerText = formatNumber(authData.balance);
    }

    window.initTriviaEvents();
});
