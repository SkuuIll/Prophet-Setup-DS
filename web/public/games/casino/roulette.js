/**
 * ════ RULETA EUROPEA — CLIENT CONTROLLER & WHEEL CANVAS ════
 */

const WHEEL_NUMBERS = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];
const RED_SET = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

let selectedChip = 10;
let rouletteBets = new Map(); // key -> amount
let isSpinning = false;
let wheelAngle = 0;
let ballAngle = 0;

const wheelCanvas = document.getElementById('roulette-wheel-canvas');
const wheelCtx = wheelCanvas.getContext('2d');
const rouletteTableEl = document.getElementById('roulette-table');
const rouletteTotalBetEl = document.getElementById('roulette-total-bet');
const btnRouletteSpin = document.getElementById('btn-roulette-spin');
const btnRouletteClear = document.getElementById('btn-roulette-clear');
const rouletteResultBanner = document.getElementById('roulette-result-banner');

// Chip Selector
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedChip = parseInt(chip.getAttribute('data-chip'), 10);
    });
});

// ═══ CONSTRUIR TABLERO DE APUESTAS EUROPEO ═══
function buildRouletteTable() {
    rouletteTableEl.innerHTML = '';

    // 0 (Green)
    const zeroCell = document.createElement('div');
    zeroCell.className = 'table-cell cell-zero';
    zeroCell.innerText = '0';
    zeroCell.setAttribute('data-bet', 'straight:0');
    zeroCell.addEventListener('click', () => placeRouletteBet('straight:0'));
    rouletteTableEl.appendChild(zeroCell);

    // Numbers 1 to 36 in 3 rows
    for (let col = 0; col < 12; col++) {
        for (let row = 2; row >= 0; row--) {
            const num = (col * 3) + (row + 1);
            const isRed = RED_SET.has(num);
            const cell = document.createElement('div');
            cell.className = `table-cell ${isRed ? 'cell-red' : 'cell-black'}`;
            cell.style.gridColumn = col + 2;
            cell.style.gridRow = 3 - row;
            cell.innerText = num;
            cell.setAttribute('data-bet', `straight:${num}`);
            cell.addEventListener('click', () => placeRouletteBet(`straight:${num}`));
            rouletteTableEl.appendChild(cell);
        }
    }

    // 2 to 1 Columns (Right)
    for (let r = 0; r < 3; r++) {
        const colCell = document.createElement('div');
        colCell.className = 'table-cell cell-outside';
        colCell.style.gridColumn = 14;
        colCell.style.gridRow = r + 1;
        colCell.innerText = '2:1';
        const cId = `col_${3 - r}`;
        colCell.setAttribute('data-bet', cId);
        colCell.addEventListener('click', () => placeRouletteBet(cId));
        rouletteTableEl.appendChild(colCell);
    }

    // Dozens (Row 4)
    const dozens = [
        { label: '1ª Docena (1-12)', bet: 'dozen_1', col: '2 / 6' },
        { label: '2ª Docena (13-24)', bet: 'dozen_2', col: '6 / 10' },
        { label: '3ª Docena (25-36)', bet: 'dozen_3', col: '10 / 14' }
    ];
    dozens.forEach(d => {
        const dCell = document.createElement('div');
        dCell.className = 'table-cell cell-outside';
        dCell.style.gridColumn = d.col;
        dCell.style.gridRow = '4';
        dCell.innerText = d.label;
        dCell.setAttribute('data-bet', d.bet);
        dCell.addEventListener('click', () => placeRouletteBet(d.bet));
        rouletteTableEl.appendChild(dCell);
    });

    // Outside Bets (Row 5): 1-18, Even, Red, Black, Odd, 19-36
    const outsides = [
        { label: '1 - 18', bet: 'low', col: '2 / 4' },
        { label: 'PAR', bet: 'even', col: '4 / 6' },
        { label: 'ROJO', bet: 'red', col: '6 / 8', color: '#D63031' },
        { label: 'NEGRO', bet: 'black', col: '8 / 10', color: '#2D3436' },
        { label: 'IMPAR', bet: 'odd', col: '10 / 12' },
        { label: '19 - 36', bet: 'high', col: '12 / 14' }
    ];
    outsides.forEach(o => {
        const oCell = document.createElement('div');
        oCell.className = 'table-cell cell-outside';
        if (o.color) oCell.style.background = o.color;
        oCell.style.gridColumn = o.col;
        oCell.style.gridRow = '5';
        oCell.innerText = o.label;
        oCell.setAttribute('data-bet', o.bet);
        oCell.addEventListener('click', () => placeRouletteBet(o.bet));
        rouletteTableEl.appendChild(oCell);
    });
}
buildRouletteTable();

function placeRouletteBet(betKey) {
    if (isSpinning) return;
    const current = rouletteBets.get(betKey) || 0;
    rouletteBets.set(betKey, current + selectedChip);
    SoundFX.playClick();
    updateTableChips();
}

function updateTableChips() {
    let total = 0;
    document.querySelectorAll('.table-cell').forEach(cell => {
        const key = cell.getAttribute('data-bet');
        const badge = cell.querySelector('.cell-chip-badge');
        if (badge) badge.remove();

        const amt = rouletteBets.get(key) || 0;
        if (amt > 0) {
            total += amt;
            const b = document.createElement('span');
            b.className = 'cell-chip-badge';
            b.innerText = formatNumber(amt);
            cell.appendChild(b);
        }
    });

    rouletteTotalBetEl.innerText = `🪙 ${formatNumber(total)}`;
}

btnRouletteClear.addEventListener('click', () => {
    if (isSpinning) return;
    rouletteBets.clear();
    updateTableChips();
});

// ═══ DIBUJAR LA RULETA EUROPEA EN CANVAS ═══
function drawRouletteWheel() {
    const cx = wheelCanvas.width / 2;
    const cy = wheelCanvas.height / 2;
    const radius = cx - 15;
    const numSlots = WHEEL_NUMBERS.length;
    const arc = (2 * Math.PI) / numSlots;

    wheelCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);

    // Borde exterior madera/metal
    wheelCtx.beginPath();
    wheelCtx.arc(cx, cy, radius + 10, 0, 2 * Math.PI);
    wheelCtx.fillStyle = '#2c1e13';
    wheelCtx.fill();
    wheelCtx.strokeStyle = '#DAA520';
    wheelCtx.lineWidth = 4;
    wheelCtx.stroke();

    // Casilleros
    wheelCtx.save();
    wheelCtx.translate(cx, cy);
    wheelCtx.rotate(wheelAngle);

    for (let i = 0; i < numSlots; i++) {
        const angle = i * arc;
        const num = WHEEL_NUMBERS[i];
        const isRed = RED_SET.has(num);

        wheelCtx.beginPath();
        wheelCtx.moveTo(0, 0);
        wheelCtx.arc(0, 0, radius, angle, angle + arc);
        wheelCtx.fillStyle = num === 0 ? '#008751' : isRed ? '#D63031' : '#1e272e';
        wheelCtx.fill();
        wheelCtx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        wheelCtx.lineWidth = 1;
        wheelCtx.stroke();

        // Número
        wheelCtx.save();
        wheelCtx.rotate(angle + arc / 2);
        wheelCtx.textAlign = 'right';
        wheelCtx.fillStyle = '#FFFFFF';
        wheelCtx.font = 'bold 12px monospace';
        wheelCtx.fillText(num.toString(), radius - 8, 4);
        wheelCtx.restore();
    }
    wheelCtx.restore();

    // Centro dorado
    wheelCtx.beginPath();
    wheelCtx.arc(cx, cy, 35, 0, 2 * Math.PI);
    wheelCtx.fillStyle = '#DAA520';
    wheelCtx.fill();
    wheelCtx.strokeStyle = '#553c1e';
    wheelCtx.lineWidth = 3;
    wheelCtx.stroke();

    // Bolita
    if (isSpinning) {
        wheelCtx.save();
        wheelCtx.translate(cx, cy);
        wheelCtx.rotate(ballAngle);
        wheelCtx.beginPath();
        wheelCtx.arc(radius - 28, 0, 6, 0, 2 * Math.PI);
        wheelCtx.fillStyle = '#FFFFFF';
        wheelCtx.shadowColor = '#FFFFFF';
        wheelCtx.shadowBlur = 10;
        wheelCtx.fill();
        wheelCtx.restore();
    }
}
drawRouletteWheel();

// ═══ GIRO DE RULETA ═══
btnRouletteSpin.addEventListener('click', () => {
    if (isSpinning) return;
    if (rouletteBets.size === 0) {
        alert('Colocá fichas en el paño antes de girar');
        return;
    }

    const betsArray = Array.from(rouletteBets.entries()).map(([type, amount]) => ({ type, amount }));
    btnRouletteSpin.disabled = true;

    window.prophetClient.send({
        type: 'roulette:spin',
        bets: betsArray
    });
});

window.initRouletteEvents = () => {
    window.prophetClient.on('roulette:spin_result', (data) => {
        if (!data.success) {
            alert(data.error || 'Error en la tirada');
            btnRouletteSpin.disabled = false;
            return;
        }

        isSpinning = true;
        rouletteResultBanner.innerText = 'GIRANDO... 🎡';

        // Animación de giro
        const targetNumber = data.winningNumber;
        const targetIndex = WHEEL_NUMBERS.indexOf(targetNumber);
        const arc = (2 * Math.PI) / WHEEL_NUMBERS.length;

        let speed = 0.25;
        let ballSpeed = 0.45;
        const startTime = Date.now();
        const duration = 4000; // 4 segundos

        const animInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                clearInterval(animInterval);
                isSpinning = false;
                btnRouletteSpin.disabled = false;

                // Anunciar resultado
                const colorEmoji = data.winningColor === 'red' ? '🔴' : data.winningColor === 'black' ? '⚫' : '🟢';
                rouletteResultBanner.innerHTML = `NÚMERO <strong>${data.winningNumber} ${colorEmoji}</strong>`;

                if (data.totalWon > 0) {
                    SoundFX.playUpgrade();
                    rouletteResultBanner.innerHTML += ` · <span style="color: var(--color-success);">¡GANASTE 🪙 ${formatNumber(data.totalWon)}!</span>`;
                } else {
                    SoundFX.playClick();
                }

                document.getElementById('casino-balance').innerText = formatNumber(data.balance);
                drawRouletteWheel();
                return;
            }

            // Desaceleración
            speed = Math.max(0.01, 0.25 * (1 - progress));
            ballSpeed = Math.max(0.01, 0.45 * (1 - progress));

            wheelAngle += speed;
            ballAngle -= ballSpeed;
            drawRouletteWheel();
        }, 16);
    });
};
