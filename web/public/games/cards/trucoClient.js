/**
 * ════ TRUCO ARGENTINO — CLIENT CONTROLLER ════
 */

let currentTrucoTable = null;
let myUserId = null;
let isMyTurn = false;

// DOM Elements
const trucoLobbyPanel = document.getElementById('truco-lobby-panel');
const trucoTableStage = document.getElementById('truco-table-stage');
const btnCreateTruco = document.getElementById('btn-create-truco');
const btnJoinTruco = document.getElementById('btn-join-truco');
const trucoBetInput = document.getElementById('truco-bet-input');
const trucoTargetSelect = document.getElementById('truco-target-select');
const trucoRoomCodeInput = document.getElementById('truco-room-code-input');

const scoreP0 = document.getElementById('score-p0');
const scoreP1 = document.getElementById('score-p1');
const labelP0 = document.getElementById('label-p0');
const labelP1 = document.getElementById('label-p1');
const displayTrucoTable = document.getElementById('display-truco-table');
const displayTrucoPot = document.getElementById('display-truco-pot');
const rivalInfo = document.getElementById('rival-info');
const playerHandFan = document.getElementById('player-hand-fan');

const btnCantoEnvido = document.getElementById('btn-canto-envido');
const btnCantoReal = document.getElementById('btn-canto-real');
const btnCantoTruco = document.getElementById('btn-canto-truco');
const btnCantoMazo = document.getElementById('btn-canto-mazo');

const cantoModal = document.getElementById('canto-modal');
const cantoModalText = document.getElementById('canto-modal-text');
const btnCantoQuiero = document.getElementById('btn-canto-quiero');
const btnCantoNoQuiero = document.getElementById('btn-canto-noquiero');

// ═══ CREAR / UNIRSE A MESA ═══
btnCreateTruco.addEventListener('click', () => {
    const bet = parseInt(trucoBetInput.value, 10) || 0;
    const target = parseInt(trucoTargetSelect.value, 10) || 15;
    SoundFX.playClick();

    window.prophetClient.send({
        type: 'truco:create_table',
        betAmount: bet,
        targetScore: target
    });
});

btnJoinTruco.addEventListener('click', () => {
    const code = trucoRoomCodeInput.value.trim();
    if (!code) {
        alert('Ingresá el código de la mesa');
        return;
    }
    SoundFX.playClick();

    window.prophetClient.send({
        type: 'truco:join_table',
        tableId: code
    });
});

function initTableUI(table) {
    currentTrucoTable = table;
    trucoLobbyPanel.style.display = 'none';
    trucoTableStage.style.display = 'flex';

    displayTrucoTable.innerText = table.tableId;
    displayTrucoPot.innerText = `Pozo: 🪙 ${formatNumber(table.pot)}`;

    updateScores(table.players);
    renderHand(table);
}

function updateScores(players) {
    if (players[0]) {
        labelP0.innerText = players[0].username;
        scoreP0.innerText = players[0].score;
    }
    if (players[1]) {
        labelP1.innerText = players[1].username;
        scoreP1.innerText = players[1].score;
        rivalInfo.innerText = `${players[1].username} (Tantos: ${players[1].score})`;
    } else {
        rivalInfo.innerText = 'Esperando rival... (Compartí el código)';
    }
}

function renderHand(table) {
    playerHandFan.innerHTML = '';
    const myPlayer = (table.players || []).find(p => p.userId === myUserId) || table.players[0];
    if (!myPlayer || !myPlayer.hand) return;

    myPlayer.hand.forEach((card, idx) => {
        if (!card.hidden) {
            const cardNode = renderSpanishCard(card.number, card.suit, () => {
                SoundFX.playClick();
                window.prophetClient.send({
                    type: 'truco:play_card',
                    tableId: currentTrucoTable.tableId,
                    cardIndex: idx
                });
            });
            playerHandFan.appendChild(cardNode);
        }
    });
}

// ═══ CANTOS ═══
const btnCantoFalta = document.getElementById('btn-canto-falta');
const btnCantoEnvido2 = document.getElementById('btn-canto-envido2');
btnCantoEnvido.addEventListener('click', () => sendCanto('envido'));
if (btnCantoEnvido2) btnCantoEnvido2.addEventListener('click', () => sendCanto('envido_envido'));
btnCantoReal.addEventListener('click', () => sendCanto('real_envido'));
if (btnCantoFalta) btnCantoFalta.addEventListener('click', () => sendCanto('falta_envido'));
btnCantoTruco.addEventListener('click', () => sendCanto('truco'));
btnCantoMazo.addEventListener('click', () => {
    if (confirm('¿Querés irte al mazo? Le darás los puntos en juego al rival.')) {
        window.prophetClient.send({
            type: 'truco:fold',
            tableId: currentTrucoTable.tableId
        });
    }
});

function sendCanto(cantoType) {
    SoundFX.playClick();
    window.prophetClient.send({
        type: 'truco:canto',
        tableId: currentTrucoTable.tableId,
        cantoType
    });
}

btnCantoQuiero.addEventListener('click', () => {
    cantoModal.style.display = 'none';
    window.prophetClient.send({
        type: 'truco:respond_canto',
        tableId: currentTrucoTable.tableId,
        response: 'quiero'
    });
});

btnCantoNoQuiero.addEventListener('click', () => {
    cantoModal.style.display = 'none';
    window.prophetClient.send({
        type: 'truco:respond_canto',
        tableId: currentTrucoTable.tableId,
        response: 'no_quiero'
    });
});

// ═══ EVENTOS WEBSOCKET DE TRUCO ═══
window.initTrucoEvents = () => {
    window.prophetClient.on('truco:table_created', (data) => {
        if (data.success) {
            initTableUI(data.table);
            SoundFX.playUpgrade();
        } else {
            alert(data.error || 'Error al crear mesa');
        }
    });

    window.prophetClient.on('truco:table_joined', (data) => {
        if (data.success) {
            initTableUI(data.table);
            SoundFX.playUpgrade();
        } else {
            alert(data.error || 'Error al unirse');
        }
    });

    window.prophetClient.on('truco:player_joined', (data) => {
        if (data.table) {
            initTableUI(data.table);
            SoundFX.playCoin();
        }
    });

    window.prophetClient.on('truco:hand_dealt', () => {
        // Limpiar cartas del paño central
        for (let i = 0; i < 3; i++) {
            document.getElementById(`slot-trick-${i}`).innerHTML = '';
        }
        SoundFX.playUpgrade();
    });

    window.prophetClient.on('truco:card_played', (data) => {
        const slot = document.getElementById(`slot-trick-${data.currentTrick}`);
        if (slot) {
            const cardEl = renderSpanishCard(data.card.number, data.card.suit);
            cardEl.style.transform = 'scale(0.85)';
            slot.appendChild(cardEl);
        }
        SoundFX.playClick();
    });

    window.prophetClient.on('truco:canto_made', (data) => {
        const myIdx = (currentTrucoTable?.players || []).findIndex(p => p.userId === myUserId);
        if (data.targetIdx === myIdx) {
            cantoModalText.innerText = `¡El rival cantó ${data.cantoType.toUpperCase().replace('_', ' ')}!`;
            cantoModal.style.display = 'block';
            SoundFX.playCoin();
        }
    });

    window.prophetClient.on('truco:hand_finished', (data) => {
        scoreP0.innerText = data.scores[0];
        scoreP1.innerText = data.scores[1];
        SoundFX.playUpgrade();
        spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2 - 40, `+${data.pointsWon} Tantos`, '#FFD700');
    });

    window.prophetClient.on('truco:game_over', (data) => {
        SoundFX.playUpgrade();
        alert(`🏆 ¡PARTIDA FINALIZADA!\nGanador: ${data.winnerUsername}\nPozo ganado: 🪙 ${formatNumber(data.potWon)} monedas`);
        location.reload();
    });
};
