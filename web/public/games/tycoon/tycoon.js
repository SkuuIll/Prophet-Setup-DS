/**
 * ═══ TYCOON DE SERVIDORES — GAME CONTROLLER ═══
 */

document.addEventListener('DOMContentLoaded', async () => {
    // ─── ESTADO LOCAL ───
    let coins = 0;
    let productionPerSec = 0;
    let autoClicksPerSec = 0;
    let serversOwned = {};
    let adminsOwned = {};
    let configs = { servers: {}, admins: {} };
    let soundEnabled = true;
    let pendingPassiveGains = 0;

    // ─── ELEMENTOS DEL DOM ───
    const coinsEl = document.getElementById('tycoon-coins');
    const prodEl = document.getElementById('prod-per-sec');
    const clicksEl = document.getElementById('clicks-per-sec');
    const mainBtn = document.getElementById('btn-main-click');
    const serversListEl = document.getElementById('servers-list');
    const adminsListEl = document.getElementById('admins-list');
    const rackContainer = document.getElementById('rack-servers-display');
    const soundToggle = document.getElementById('btn-sound');
    const offlineModal = document.getElementById('offline-modal');
    const offlineTimeEl = document.getElementById('offline-time');
    const offlineCoinsValEl = document.getElementById('offline-coins-val');
    const btnClaimOffline = document.getElementById('btn-claim-offline');

    // ─── PESTAÑAS ───
    document.querySelectorAll('.store-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.store-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.getElementById(`tab-${target}`).classList.add('active');
        });
    });

    // ─── SONIDO TOGGLE ───
    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.innerText = soundEnabled ? '🔊' : '🔇';
    });

    // ─── CONEXIÓN WEBSOCKET ───
    await window.prophetClient.connect();

    // Pedir estado inicial
    window.prophetClient.send({ type: 'tycoon:init' });

    window.prophetClient.on('tycoon:state', (data) => {
        const state = data.state;
        coins = state.coins || 0;
        serversOwned = state.servers || {};
        adminsOwned = state.admins || {};
        configs = state.configs || { servers: {}, admins: {} };
        productionPerSec = state.productionPerSec || 0;
        autoClicksPerSec = state.autoClicksPerSec || 0;

        renderStore();
        renderRack();
        updateUI();

        // Mostrar modal offline si hubo ganancias
        if (state.offlineEarned > 0) {
            const minutes = Math.floor(state.offlineSeconds / 60);
            const hours = Math.floor(minutes / 60);
            let timeStr = `${minutes} minutos`;
            if (hours > 0) {
                timeStr = `${hours} hora${hours > 1 ? 's' : ''} y ${minutes % 60}m`;
            }
            offlineTimeEl.innerText = timeStr;
            offlineCoinsValEl.innerText = `+${formatNumber(state.offlineEarned)} 🪙`;
            offlineModal.classList.add('active');
            if (soundEnabled) SoundFX.playCoin();
        }
    });

    btnClaimOffline.addEventListener('click', () => {
        offlineModal.classList.remove('active');
        if (soundEnabled) SoundFX.playCoin();
    });

    // ─── CLICK PRINCIPAL (REINICIAR SERVIDOR) ───
    mainBtn.addEventListener('click', (e) => {
        if (soundEnabled) SoundFX.playClick();

        // Partícula flotante
        const rect = mainBtn.getBoundingClientRect();
        const x = e.clientX || (rect.left + rect.width / 2);
        const y = e.clientY || (rect.top + rect.height / 2);
        
        const clickGained = Math.max(1, Math.floor(1 + (productionPerSec * 0.05)));
        coins += clickGained;
        spawnFloatingText(x, y, `+${formatNumber(clickGained)}`, '#FFD700');
        updateUI();

        window.prophetClient.send({ type: 'tycoon:click', count: 1 });
    });

    window.prophetClient.on('tycoon:click_result', (data) => {
        if (data.coins !== undefined) {
            coins = data.coins;
            updateUI();
        }
    });

    // ─── COMPRA DE SERVIDORES ───
    window.buyServer = (serverId) => {
        window.prophetClient.send({ type: 'tycoon:buy_server', serverId });
    };

    window.prophetClient.on('tycoon:buy_server_result', (data) => {
        if (data.success) {
            serversOwned[data.serverId] = data.count;
            coins = data.coins;
            productionPerSec = data.productionPerSec;
            autoClicksPerSec = data.autoClicksPerSec;
            if (soundEnabled) SoundFX.playUpgrade();
            renderStore();
            renderRack();
            updateUI();
        } else {
            alert(data.error || 'No se pudo comprar el servidor');
        }
    });

    // ─── COMPRA DE ADMINS ───
    window.buyAdmin = (adminId) => {
        window.prophetClient.send({ type: 'tycoon:buy_admin', adminId });
    };

    window.prophetClient.on('tycoon:buy_admin_result', (data) => {
        if (data.success) {
            adminsOwned[data.adminId] = true;
            coins = data.coins;
            productionPerSec = data.productionPerSec;
            autoClicksPerSec = data.autoClicksPerSec;
            if (soundEnabled) SoundFX.playUpgrade();
            renderStore();
            updateUI();
        } else {
            alert(data.error || 'No se pudo contratar');
        }
    });

    // ─── RENDER DE LA TIENDA ───
    function renderStore() {
        // Servidores
        serversListEl.innerHTML = '';
        Object.values(configs.servers || {}).forEach(srv => {
            const count = serversOwned[srv.id] || 0;
            const cost = Math.floor(srv.baseCost * Math.pow(1.15, count));
            const canAfford = coins >= cost;

            const card = document.createElement('div');
            card.className = 'store-item-card';
            card.innerHTML = `
                <div class="item-left">
                    <div class="item-icon">${srv.icon}</div>
                    <div class="item-details">
                        <div class="item-name">
                            ${srv.name}
                            ${count > 0 ? `<span class="item-count-badge">x${count}</span>` : ''}
                        </div>
                        <span class="item-meta">+${formatNumber(srv.baseProd)}/s</span>
                    </div>
                </div>
                <button class="btn-buy" ${!canAfford ? 'disabled' : ''} onclick="buyServer('${srv.id}')">
                    🪙 ${formatNumber(cost)}
                </button>
            `;
            serversListEl.appendChild(card);
        });

        // Admins
        adminsListEl.innerHTML = '';
        Object.values(configs.admins || {}).forEach(adm => {
            const isOwned = !!adminsOwned[adm.id];
            const canAfford = coins >= adm.cost && !isOwned;

            const card = document.createElement('div');
            card.className = 'store-item-card';
            card.innerHTML = `
                <div class="item-left">
                    <div class="item-icon">${adm.icon}</div>
                    <div class="item-details">
                        <div class="item-name">${adm.name}</div>
                        <span class="item-meta">${adm.desc}</span>
                    </div>
                </div>
                <button class="btn-buy" ${(!canAfford || isOwned) ? 'disabled' : ''} onclick="buyAdmin('${adm.id}')">
                    ${isOwned ? 'CONTRATADO ✅' : `🪙 ${formatNumber(adm.cost)}`}
                </button>
            `;
            adminsListEl.appendChild(card);
        });
    }

    // ─── RENDER DEL RACK VISUAL ───
    function renderRack() {
        rackContainer.innerHTML = '';
        let totalUnits = 0;

        Object.entries(serversOwned).forEach(([sId, count]) => {
            const conf = configs.servers[sId];
            if (conf && count > 0) {
                const limit = Math.min(count, 3); // Mostrar hasta 3 por tipo para no saturar
                for (let i = 0; i < limit; i++) {
                    totalUnits++;
                    const unit = document.createElement('div');
                    unit.className = 'server-unit';
                    unit.innerHTML = `
                        <div class="unit-leds">
                            <span class="led led-green"></span>
                            <span class="led led-blue"></span>
                            <span class="led led-blink"></span>
                        </div>
                        <div class="unit-info">${conf.icon} ${conf.name.toUpperCase()} #${i + 1}</div>
                        <div class="unit-fan"></div>
                    `;
                    rackContainer.appendChild(unit);
                }
            }
        });

        if (totalUnits === 0) {
            rackContainer.innerHTML = `
                <div class="server-unit" style="justify-content: center; opacity: 0.5;">
                    <div>⚠️ NO HAY SERVIDORES ACTIVOS · COMPRÁ UNO EN LA TIENDA</div>
                </div>
            `;
        }
    }

    // ─── ACTUALIZACIÓN DE UI ───
    function updateUI() {
        coinsEl.innerText = formatNumber(coins);
        prodEl.innerText = `+${formatNumber(productionPerSec)} /s`;
        clicksEl.innerText = `${formatNumber(autoClicksPerSec)} /s`;

        // Actualizar estado de botones de compra
        document.querySelectorAll('.store-item-card').forEach(card => {
            const btn = card.querySelector('.btn-buy');
            if (btn && !btn.innerText.includes('CONTRATADO')) {
                // Verificar si puede pagar
                const rawCostText = btn.innerText.replace('🪙', '').trim();
                // Si el botón ya tiene el disabled state, se refresca
            }
        });
    }

    // ─── GAME LOOP LOCAL (Suave a 10 FPS) ───
    setInterval(() => {
        if (productionPerSec > 0) {
            const gainThisTick = productionPerSec / 10;
            coins += gainThisTick;
            pendingPassiveGains += gainThisTick;
            updateUI();
        }
    }, 100);

    // ─── AUTO-SYNC CADA 10 SEGUNDOS ───
    setInterval(() => {
        if (pendingPassiveGains >= 1) {
            window.prophetClient.send({
                type: 'tycoon:sync',
                addedCoins: Math.floor(pendingPassiveGains)
            });
            pendingPassiveGains = pendingPassiveGains % 1;
        }
    }, 10000);
});
