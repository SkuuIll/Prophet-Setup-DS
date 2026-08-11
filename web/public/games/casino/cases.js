/**
 * ════ CAJAS CS2 (CASE OPENING) — CLIENT CONTROLLER & REEL ANIMATION ════
 */

let availableCases = [];
let activeCase = null;
let isUnboxing = false;

const casesSelectorEl = document.getElementById('cases-selector');
const activeCaseNameEl = document.getElementById('active-case-name');
const activeCasePriceEl = document.getElementById('active-case-price');
const btnOpenCase = document.getElementById('btn-open-case');
const caseReelTrack = document.getElementById('case-reel-track');
const caseShowcaseGrid = document.getElementById('case-showcase-grid');

// Pestañas de Modo de Casino
document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.game-view').forEach(v => v.classList.remove('active'));

        tab.classList.add('active');
        const mode = tab.getAttribute('data-mode');
        document.getElementById(`view-${mode}`).classList.add('active');
        if (window.SoundFX) SoundFX.playClick();
    });
});

function selectCase(caseId) {
    if (isUnboxing) return;
    activeCase = availableCases.find(c => c.id === caseId) || availableCases[0];
    if (!activeCase) return;

    document.querySelectorAll('.case-card').forEach(c => c.classList.remove('active'));
    const selectedEl = document.querySelector(`.case-card[data-id="${caseId}"]`);
    if (selectedEl) selectedEl.classList.add('active');

    activeCaseNameEl.innerText = activeCase.name;
    activeCasePriceEl.innerText = `🪙 ${formatNumber(activeCase.cost)}`;
    btnOpenCase.innerText = `ABRIR CAJA POR 🪙 ${formatNumber(activeCase.cost)}`;

    // Pedir detalles para el showcase
    window.prophetClient.send({ type: 'cases:get_details', caseId: activeCase.id });
}

function renderCasesSelector() {
    casesSelectorEl.innerHTML = '';
    availableCases.forEach(c => {
        const card = document.createElement('div');
        card.className = `case-card ${activeCase && activeCase.id === c.id ? 'active' : ''}`;
        card.setAttribute('data-id', c.id);
        card.innerHTML = `
            <div class="case-icon-big">${c.icon}</div>
            <div class="case-info">
                <h4>${c.name}</h4>
                <div class="case-cost-tag">🪙 ${formatNumber(c.cost)}</div>
            </div>
        `;
        card.addEventListener('click', () => selectCase(c.id));
        casesSelectorEl.appendChild(card);
    });
}

function renderShowcase(details) {
    caseShowcaseGrid.innerHTML = '';
    if (!details || !details.items) return;

    const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    rarityOrder.forEach(rKey => {
        const items = details.items[rKey] || [];
        items.forEach(it => {
            const card = document.createElement('div');
            card.className = 'showcase-item-card';
            card.style.borderColor = getRarityColor(rKey);
            card.innerHTML = `
                <div class="showcase-item-icon">${it.icon}</div>
                <div class="showcase-item-name" style="color: ${getRarityColor(rKey)}">${it.name}</div>
                <div class="showcase-item-val">Valor: 🪙 ${formatNumber(it.valueCoins)}</div>
            `;
            caseShowcaseGrid.appendChild(card);
        });
    });
}

function getRarityColor(rarity) {
    const colors = {
        common: '#B0C3D9',
        uncommon: '#5E98D9',
        rare: '#4B69CD',
        epic: '#D32CE6',
        legendary: '#FFD700'
    };
    return colors[rarity] || '#FFFFFF';
}

// ═══ ANIMACIÓN DEL CARRETE CS2 ═══
function animateReel(reel, winningIndex, winningItem) {
    isUnboxing = true;
    btnOpenCase.disabled = true;

    // Resetear posición de la pista
    caseReelTrack.style.transition = 'none';
    caseReelTrack.style.transform = 'translateX(0px)';
    caseReelTrack.innerHTML = '';

    // Llenar carrete
    reel.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'reel-item';
        itemEl.innerHTML = `
            <div class="reel-item-icon">${item.icon}</div>
            <div class="reel-item-name">${item.name}</div>
            <div class="reel-item-rarity-bar" style="background: ${getRarityColor(item.rarity)}; box-shadow: 0 0 8px ${getRarityColor(item.rarity)}"></div>
        `;
        caseReelTrack.appendChild(itemEl);
    });

    // Forzar reflow
    void caseReelTrack.offsetWidth;

    // Calcular desplazamiento exacto para centrar el item #winningIndex bajo la aguja
    const itemWidth = 140;
    const viewportWidth = caseReelTrack.parentElement.offsetWidth;
    const randomJitter = (Math.random() - 0.5) * 50; // Pequeña variación para realismo
    const targetOffset = -(winningIndex * itemWidth + itemWidth / 2 - viewportWidth / 2 + randomJitter);

    // Animación con inercia de CS2 (5.2 segundos)
    caseReelTrack.style.transition = 'transform 5.2s cubic-bezier(0.12, 0.8, 0.15, 1)';
    caseReelTrack.style.transform = `translateX(${targetOffset}px)`;

    // Sonidos de ticks mientras gira
    let tickCount = 0;
    const tickTimer = setInterval(() => {
        tickCount++;
        SoundFX.playClick();
        if (tickCount > 35) clearInterval(tickTimer);
    }, 130);

    setTimeout(() => {
        clearInterval(tickTimer);
        isUnboxing = false;
        btnOpenCase.disabled = false;

        // Sonido de victoria y modal
        SoundFX.playUpgrade();
        spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2 - 50, `¡DESBLOQUEADO: ${winningItem.name}!`, getRarityColor(winningItem.rarity));
    }, 5300);
}

btnOpenCase.addEventListener('click', () => {
    if (isUnboxing || !activeCase) return;
    window.prophetClient.send({
        type: 'cases:open',
        caseId: activeCase.id
    });
});

window.initCasesEvents = () => {
    window.prophetClient.send({ type: 'cases:get_list' });

    window.prophetClient.on('cases:list', (data) => {
        availableCases = data.list || [];
        if (availableCases.length > 0) {
            selectCase(availableCases[0].id);
        }
        renderCasesSelector();
    });

    window.prophetClient.on('cases:details', (data) => {
        renderShowcase(data.details);
    });

    window.prophetClient.on('cases:open_result', (data) => {
        if (!data.success) {
            alert(data.error || 'Error al abrir caja');
            btnOpenCase.disabled = false;
            return;
        }

        document.getElementById('casino-balance').innerText = formatNumber(data.balance);
        animateReel(data.reel, data.winningIndex, data.winningItem);

        // Pity + crédito soft-sell
        setTimeout(() => {
            if (data.winningItem?.credited) {
                const label = data.winningItem.softSold
                    ? `Venta soft +${formatNumber(data.winningItem.credited)}`
                    : `+${formatNumber(data.winningItem.credited)} monedas`;
                if (window.spawnFloatingText) {
                    spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2 + 20, label, '#FFD54F');
                }
            }
            if (data.pityTriggered) {
                if (window.spawnFloatingText) {
                    spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2 + 50, '★ PITY!', '#FFD700');
                }
            }
            updatePityUI(data.pity);
        }, 5400);
    });

    window.prophetClient.on('cases:pity', (data) => updatePityUI(data.pity));
    window.prophetClient.send({ type: 'cases:get_pity' });
};

function updatePityUI(pity) {
    if (!pity) return;
    let el = document.getElementById('cases-pity-bar');
    if (!el) {
        const host = document.getElementById('view-cases') || document.body;
        el = document.createElement('div');
        el.id = 'cases-pity-bar';
        el.style.cssText = 'margin:10px 0;padding:10px 14px;border-radius:12px;background:rgba(179,136,255,.1);border:1px solid rgba(179,136,255,.25);font-size:13px;display:flex;gap:16px;flex-wrap:wrap;align-items:center';
        host.insertBefore(el, host.firstChild);
    }
    const epicLeft = Math.max(0, (pity.pityEpicAt || 25) - (pity.sinceEpic || 0));
    const legLeft = Math.max(0, (pity.pityLegendaryAt || 80) - (pity.sinceLegendary || 0));
    el.innerHTML = `
        <strong>Pity</strong>
        <span>Épico en ≤${epicLeft} aperturas</span>
        <span>Legendario en ≤${legLeft}</span>
        <span style="opacity:.7">${pity.opens || 0} abiertas</span>
    `;
    // Mini historial
    if (pity.history?.length) {
        const last = pity.history.slice(0, 5).map(h =>
            `<span title="${h.item}" style="opacity:.85">${h.icon || '🎁'}</span>`
        ).join(' ');
        el.innerHTML += `<span style="margin-left:auto">Recientes: ${last}</span>`;
    }
}

// ═══ INICIALIZADOR GENERAL DEL CASINO ═══
document.addEventListener('DOMContentLoaded', async () => {
    const authData = await window.prophetClient.connect();
    if (authData) {
        document.getElementById('casino-balance').innerText = formatNumber(authData.balance);
    }

    window.initCrashEvents();
    window.initRouletteEvents();
    window.initCasesEvents();
});
