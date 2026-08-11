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
const crashParticles = [];
let crashAnimT = 0;

function drawCrashCurve() {
    const w = crashCanvas.width;
    const h = crashCanvas.height;
    crashAnimT += 0.016;

    // Fondo
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#120a22');
    bg.addColorStop(1, '#07040f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = 'rgba(200, 180, 255, 0.35)';
    for (let i = 0; i < 40; i++) {
        const sx = (i * 97 + crashAnimT * 12) % w;
        const sy = (i * 53) % (h - 40);
        ctx.globalAlpha = 0.2 + (i % 5) * 0.12;
        ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;

    // Grid
    ctx.strokeStyle = 'rgba(179, 136, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 40; x < w; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h - 30);
        ctx.stroke();
    }
    for (let y = 20; y < h - 30; y += 40) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = 'rgba(179, 136, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 10);
    ctx.lineTo(40, h - 30);
    ctx.lineTo(w - 10, h - 30);
    ctx.stroke();

    if (crashState === 'RUNNING' || crashState === 'CRASHED') {
        const startX = 40;
        const startY = h - 30;
        const progress = Math.min(1, (currentMultiplier - 1.0) / 10);
        const endX = startX + (w - 100) * progress;
        const endY = startY - (h - 90) * Math.pow(progress, 0.85);
        const isDead = crashState === 'CRASHED';
        const mainColor = isDead ? '#FF5252' : '#00E5C3';

        // Curve fill
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX + (endX - startX) * 0.55, startY, endX, endY);
        ctx.lineTo(endX, startY);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, endY, 0, startY);
        grad.addColorStop(0, isDead ? 'rgba(255, 82, 82, 0.35)' : 'rgba(0, 229, 195, 0.28)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fill();

        // Curve stroke
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX + (endX - startX) * 0.55, startY, endX, endY);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 4;
        ctx.shadowColor = mainColor;
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Trail particles while flying
        if (!isDead && Math.random() < 0.6) {
            crashParticles.push({
                x: endX, y: endY,
                vx: -1 - Math.random() * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 20 + Math.random() * 15,
                max: 35,
                color: mainColor
            });
        }

        // Rocket ship (vector)
        ctx.save();
        ctx.translate(endX, endY);
        const angle = Math.atan2(endY - startY, endX - startX) - Math.PI / 2;
        ctx.rotate(isDead ? angle + 0.8 : Math.atan2(-(endY - (startY - 20)), endX - (startX + 40)));

        if (isDead) {
            // Explosion burst
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2 + crashAnimT * 3;
                const r = 10 + (i % 3) * 6 + Math.sin(crashAnimT * 8 + i) * 4;
                ctx.fillStyle = i % 2 ? '#FFD54F' : '#FF5252';
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.font = '22px serif';
            ctx.fillText('💥', -12, 8);
        } else {
            // Ship body
            ctx.shadowColor = mainColor;
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#E8E0FF';
            ctx.beginPath();
            ctx.moveTo(0, -14);
            ctx.lineTo(8, 10);
            ctx.lineTo(0, 6);
            ctx.lineTo(-8, 10);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#00E5C3';
            ctx.beginPath();
            ctx.moveTo(-5, 8);
            ctx.lineTo(0, 18 + Math.sin(crashAnimT * 20) * 3);
            ctx.lineTo(5, 8);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#7C4DFF';
            ctx.beginPath();
            ctx.arc(0, -2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // Particles update/draw
    for (let i = crashParticles.length - 1; i >= 0; i--) {
        const p = crashParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) { crashParticles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life / p.max;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

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
        if (soundEnabled) {
            if (SoundFX.playCrash) SoundFX.playCrash();
            else SoundFX.playClick();
        }
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
