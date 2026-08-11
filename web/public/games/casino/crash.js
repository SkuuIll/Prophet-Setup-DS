/**
 * ════ CRASH (AVIATOR) — GAME CLIENT CONTROLLER ════
 */

let crashState = 'WAITING';
let currentMultiplier = 1.00;
let myBet = null; // { amount, autoCashout, cashedOut: false }
let crashHistory = [];
let soundEnabled = true;

// DOM Elements
const crashCanvas = document.getElementById('crash-canvas');
const ctx = crashCanvas.getContext('2d');
const crashStatusText = document.getElementById('crash-status-text');
const crashMultiplierText = document.getElementById('crash-multiplier');
const crashBetInput = document.getElementById('crash-bet-input');
const crashAutoInput = document.getElementById('crash-autoco-input');
const btnCrashAction = document.getElementById('btn-crash-action');
const crashBetsList = document.getElementById('crash-bets-list');
const crashPlayersCount = document.getElementById('crash-players-count');
const crashHistoryBar = document.getElementById('crash-history');
const crashHashShort = document.getElementById('crash-hash-short');
const fairnessModal = document.getElementById('fairness-modal');
const fairHashVal = document.getElementById('fair-hash-val');
const fairSeedVal = document.getElementById('fair-seed-val');

function adjustCrashBet(factor) {
    let val = parseFloat(crashBetInput.value) || 100;
    if (factor === 'max') {
        const rawBal = document.getElementById('casino-balance').innerText.replace(/\./g, '').replace(/,/g, '');
        val = parseInt(rawBal, 10) || 1000;
    } else {
        val = Math.max(10, Math.floor(val * factor));
    }
    crashBetInput.value = val;
    updateActionButton();
}

crashBetInput.addEventListener('input', updateActionButton);

function updateActionButton() {
    if (crashState === 'WAITING') {
        if (myBet) {
            btnCrashAction.className = 'btn-casino-action btn-secondary';
            btnCrashAction.innerText = `APUESTA FIJADA (🪙 ${formatNumber(myBet.amount)})`;
            btnCrashAction.disabled = true;
        } else {
            btnCrashAction.className = 'btn-casino-action btn-bet';
            const amt = parseInt(crashBetInput.value, 10) || 100;
            btnCrashAction.innerText = `APOSTAR 🪙 ${formatNumber(amt)}`;
            btnCrashAction.disabled = false;
        }
    } else if (crashState === 'RUNNING') {
        if (myBet && !myBet.cashedOut) {
            const currentWin = Math.floor(myBet.amount * currentMultiplier);
            btnCrashAction.className = 'btn-casino-action btn-cashout';
            btnCrashAction.innerText = `RETIRAR 🪙 ${formatNumber(currentWin)}`;
            btnCrashAction.disabled = false;
        } else {
            btnCrashAction.className = 'btn-casino-action btn-secondary';
            btnCrashAction.innerText = myBet?.cashedOut ? `RETIRADO ✅ (${myBet.multiplier}x)` : 'RONDA EN CURSO...';
            btnCrashAction.disabled = true;
        }
    } else if (crashState === 'CRASHED') {
        btnCrashAction.className = 'btn-casino-action btn-secondary';
        btnCrashAction.innerText = 'NAVE EXPLOTADA 💥';
        btnCrashAction.disabled = true;
    }
}

btnCrashAction.addEventListener('click', () => {
    if (crashState === 'WAITING' && !myBet) {
        const amt = parseInt(crashBetInput.value, 10);
        const autoCo = parseFloat(crashAutoInput.value) || 0;
        window.prophetClient.send({
            type: 'crash:bet',
            amount: amt,
            autoCashout: autoCo
        });
    } else if (crashState === 'RUNNING' && myBet && !myBet.cashedOut) {
        window.prophetClient.send({
            type: 'crash:cashout',
            multiplier: currentMultiplier
        });
    }
});

// Provably Fair Click
document.getElementById('btn-show-fairness').addEventListener('click', () => {
    fairnessModal.classList.add('active');
});

// ═══ CANVAS RENDERING LOOP (60 FPS) ═══
function drawCrashCurve() {
    const w = crashCanvas.width;
    const h = crashCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Fondo grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 40; x < w; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h - 30);
        ctx.stroke();
    }
    for (let y = 30; y < h - 30; y += 50) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    // Ejes
    ctx.strokeStyle = 'rgba(187, 134, 252, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 10);
    ctx.lineTo(40, h - 30);
    ctx.lineTo(w - 10, h - 30);
    ctx.stroke();

    if (crashState === 'RUNNING' || crashState === 'CRASHED') {
        const startX = 40;
        const startY = h - 30;

        // Progreso relativo
        const progress = Math.min(1, (currentMultiplier - 1.0) / 10);
        const endX = startX + (w - 100) * progress;
        const endY = startY - (h - 90) * Math.pow(progress, 0.85);

        // Curva
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(
            startX + (endX - startX) * 0.6,
            startY,
            endX,
            endY
        );

        ctx.strokeStyle = crashState === 'CRASHED' ? '#EF5350' : '#03DAC6';
        ctx.lineWidth = 4;
        ctx.shadowColor = crashState === 'CRASHED' ? 'rgba(239, 83, 80, 0.8)' : 'rgba(3, 218, 198, 0.8)';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Relleno bajo la curva
        ctx.lineTo(endX, startY);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, endY, 0, startY);
        grad.addColorStop(0, crashState === 'CRASHED' ? 'rgba(239, 83, 80, 0.25)' : 'rgba(3, 218, 198, 0.2)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fill();

        // Icono del Cohete / Nave
        ctx.font = '24px serif';
        ctx.fillText(crashState === 'CRASHED' ? '💥' : '🚀', endX - 12, endY - 6);
    }

    requestAnimationFrame(drawCrashCurve);
}
drawCrashCurve();

// ═══ EVENTOS WEBSOCKET DE CRASH ═══
function renderHistory() {
    crashHistoryBar.innerHTML = '';
    crashHistory.forEach(item => {
        const span = document.createElement('span');
        const m = item.crashPoint;
        span.className = `history-badge ${m >= 10 ? 'badge-gold' : m >= 2 ? 'badge-green' : 'badge-red'}`;
        span.innerText = `${m.toFixed(2)}x`;
        crashHistoryBar.appendChild(span);
    });
}

function renderBetsList(bets) {
    crashBetsList.innerHTML = '';
    crashPlayersCount.innerText = bets.length;
    bets.forEach(b => {
        const row = document.createElement('div');
        row.className = 'live-bet-item';
        row.innerHTML = `
            <span>${b.username}</span>
            <span style="color: ${b.cashedOut ? 'var(--color-success)' : 'var(--color-gold)'}">
                ${b.cashedOut ? `+🪙 ${formatNumber(b.winAmount)} (${b.cashoutMultiplier}x)` : `🪙 ${formatNumber(b.amount)}`}
            </span>
        `;
        crashBetsList.appendChild(row);
    });
}

window.initCrashEvents = () => {
    window.prophetClient.send({ type: 'crash:init' });

    window.prophetClient.on('crash:state', (data) => {
        const s = data.state;
        crashState = s.state;
        currentMultiplier = s.currentMultiplier;
        crashHistory = s.history || [];
        renderHistory();
        renderBetsList(s.bets || []);
        crashHashShort.innerText = s.hash ? `${s.hash.slice(0, 10)}...` : 'hash';
        fairHashVal.innerText = s.hash || '--';
        updateActionButton();
    });

    window.prophetClient.on('crash:waiting', (data) => {
        crashState = 'WAITING';
        currentMultiplier = 1.00;
        crashMultiplierText.className = 'crash-multiplier-text';
        crashMultiplierText.innerText = `${data.countdown.toFixed(1)}s`;
        crashStatusText.innerText = 'PREPARANDO LANZAMIENTO...';
        crashHashShort.innerText = `${data.hash.slice(0, 10)}...`;
        fairHashVal.innerText = data.hash;
        fairSeedVal.innerText = '(Oculto hasta que explote la nave)';
        renderBetsList(data.bets || []);
        updateActionButton();
    });

    window.prophetClient.on('crash:started', (data) => {
        crashState = 'RUNNING';
        crashStatusText.innerText = 'EN VUELO';
        renderBetsList(data.bets || []);
        updateActionButton();
    });

    window.prophetClient.on('crash:tick', (data) => {
        if (crashState === 'RUNNING') {
            currentMultiplier = data.multiplier;
            crashMultiplierText.innerText = `${currentMultiplier.toFixed(2)}x`;
            renderBetsList(data.bets || []);
            updateActionButton();
        }
    });

    window.prophetClient.on('crash:crashed', (data) => {
        crashState = 'CRASHED';
        currentMultiplier = data.crashPoint;
        crashMultiplierText.className = 'crash-multiplier-text text-crashed';
        crashMultiplierText.innerText = `@ ${data.crashPoint.toFixed(2)}x`;
        crashStatusText.innerText = '¡CRASH! EXPLOTÓ';
        fairSeedVal.innerText = `${data.serverSeed} (Salt: ${data.salt})`;
        crashHistory.unshift({ roundId: data.roundId, crashPoint: data.crashPoint });
        renderHistory();
        renderBetsList(data.bets || []);
        myBet = null;
        updateActionButton();
        if (soundEnabled) SoundFX.playClick();
    });

    window.prophetClient.on('crash:bet_result', (data) => {
        if (data.success) {
            myBet = { amount: data.amount, cashedOut: false };
            document.getElementById('casino-balance').innerText = formatNumber(data.balance);
            updateActionButton();
            if (soundEnabled) SoundFX.playCoin();
        } else {
            alert(data.error || 'Error al apostar');
        }
    });

    window.prophetClient.on('crash:cashout_result', (data) => {
        if (data.success) {
            if (myBet) {
                myBet.cashedOut = true;
                myBet.multiplier = data.multiplier;
            }
            document.getElementById('casino-balance').innerText = formatNumber(data.balance);
            updateActionButton();
            if (soundEnabled) SoundFX.playUpgrade();
        } else {
            alert(data.error || 'No se pudo retirar');
        }
    });
};
