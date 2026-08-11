/**
 * ═══ TYCOON v3 CLIENT ═══
 */
document.addEventListener('DOMContentLoaded', () => {
    let coins = 0;
    let productionPerSec = 0;
    let autoClicksPerSec = 0;
    let multiplier = 1;
    let prestigeLevel = 0;
    let critChance = 0.02;
    let critMultiplier = 8;
    let serversOwned = {};
    let adminsOwned = {};
    let researchOwned = {};
    let unlocks = { servers: {}, admins: {} };
    let missions = { list: [], claimed: {} };
    let synergies = [];
    let boost = null;
    let configs = { servers: {}, admins: {}, research: {} };
    let soundEnabled = true;
    let pendingPassiveGains = 0;
    let buyLock = false;
    let stats = {};

    const coinsEl = document.getElementById('tycoon-coins');
    const prodEl = document.getElementById('prod-per-sec');
    const multEl = document.getElementById('mult-display');
    const clicksEl = document.getElementById('clicks-per-sec');
    const clickMeta = document.getElementById('click-meta');
    const mainBtn = document.getElementById('btn-main-click');
    const serversListEl = document.getElementById('servers-list');
    const adminsListEl = document.getElementById('admins-list');
    const researchListEl = document.getElementById('research-list');
    const rackContainer = document.getElementById('rack-servers-display');
    const synergyRow = document.getElementById('synergy-row');
    const missionsBar = document.getElementById('missions-bar');
    const boostBanner = document.getElementById('boost-banner');
    const boostLabel = document.getElementById('boost-label');
    const boostTimer = document.getElementById('boost-timer');
    const statsMini = document.getElementById('stats-mini');
    const soundToggle = document.getElementById('btn-sound');
    const offlineModal = document.getElementById('offline-modal');
    const offlineTimeEl = document.getElementById('offline-time');
    const offlineCoinsValEl = document.getElementById('offline-coins-val');
    const btnClaimOffline = document.getElementById('btn-claim-offline');
    const btnPrestige = document.getElementById('btn-prestige');

    // Nav back preserve embed
    const navBack = document.getElementById('nav-back');
    if (navBack) {
        navBack.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.prophetNavigate) window.prophetNavigate('/games/hub/');
            else location.href = '/games/hub/';
        });
    }

    document.querySelectorAll('.store-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.store-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById(`tab-${tab.getAttribute('data-tab')}`);
            if (panel) panel.classList.add('active');
            if (window.SoundFX) SoundFX.playClick();
        });
    });

    if (soundToggle) {
        soundToggle.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            if (window.SoundFX) SoundFX.enabled = soundEnabled;
            soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
        });
    }

    if (btnClaimOffline) {
        btnClaimOffline.addEventListener('click', () => {
            offlineModal.classList.remove('active');
            if (soundEnabled && window.SoundFX) SoundFX.playCoin();
        });
    }

    // Click principal — optimistic + server authority
    if (mainBtn) {
        mainBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (soundEnabled && window.SoundFX) SoundFX.playClick();
            const rect = mainBtn.getBoundingClientRect();
            const x = e.clientX || (rect.left + rect.width / 2);
            const y = e.clientY || (rect.top + rect.height / 2);

            // Optimistic preview (server manda crits reales)
            const est = Math.max(1, Math.floor(1 * multiplier));
            coins += est;
            if (window.spawnFloatingText) spawnFloatingText(x, y, `+${formatNumber(est)}`, '#FFD54F');
            if (window.spawnRipple) spawnRipple(x, y, 'rgba(179,136,255,0.5)');
            updateUI();
            window.prophetClient.send({ type: 'tycoon:click', count: 1 });
        });
    }

    function handleStoreClick(e) {
        const btn = e.target.closest('.btn-buy, .btn-claim');
        if (!btn || btn.disabled || buyLock) return;
        e.preventDefault();

        const serverId = btn.getAttribute('data-server-id');
        const adminId = btn.getAttribute('data-admin-id');
        const researchId = btn.getAttribute('data-research-id');
        const missionId = btn.getAttribute('data-mission-id');

        buyLock = true;
        setTimeout(() => { buyLock = false; }, 300);

        if (serverId) {
            window.prophetClient.send({ type: 'tycoon:buy_server', serverId });
        } else if (adminId) {
            window.prophetClient.send({ type: 'tycoon:buy_admin', adminId });
        } else if (researchId) {
            window.prophetClient.send({ type: 'tycoon:buy_research', researchId });
        } else if (missionId) {
            window.prophetClient.send({ type: 'tycoon:claim_mission', missionId });
        }
        if (soundEnabled && window.SoundFX) SoundFX.playClick();
    }

    [serversListEl, adminsListEl, researchListEl, missionsBar].forEach(el => {
        if (el) el.addEventListener('click', handleStoreClick);
    });

    if (btnPrestige) {
        btnPrestige.addEventListener('click', () => {
            if (!confirm('¿Prestigiar? Se resetean servers/staff/research. +20% permanente.')) return;
            window.prophetClient.send({ type: 'tycoon:prestige' });
        });
    }

    function applyState(state) {
        if (!state) return;
        coins = state.coins || 0;
        serversOwned = state.servers || {};
        adminsOwned = state.admins || {};
        researchOwned = state.research || {};
        configs = state.configs || configs;
        productionPerSec = state.productionPerSec || 0;
        autoClicksPerSec = state.autoClicksPerSec || 0;
        multiplier = state.multiplier || 1;
        prestigeLevel = state.prestige || 0;
        critChance = state.critChance ?? 0.02;
        critMultiplier = state.critMultiplier || 8;
        unlocks = state.unlocks || { servers: {}, admins: {} };
        missions = state.missions || { list: [], claimed: {} };
        synergies = state.synergies || [];
        boost = state.boost || null;
        stats = state.stats || {};

        if (state.offlineEarned > 0 && offlineModal) {
            const minutes = Math.floor((state.offlineSeconds || 0) / 60);
            const hours = Math.floor(minutes / 60);
            let timeStr = `${minutes}m`;
            if (hours > 0) timeStr = `${hours}h ${minutes % 60}m`;
            if (offlineTimeEl) offlineTimeEl.textContent = timeStr;
            if (offlineCoinsValEl) offlineCoinsValEl.textContent = `+${formatNumber(state.offlineEarned)}`;
            offlineModal.classList.add('active');
            if (soundEnabled && window.SoundFX) SoundFX.playCoin();
        }

        updatePrestigeUI();
        renderAll();
        updateUI();
    }

    function renderAll() {
        renderStore();
        renderResearch();
        renderRack();
        renderSynergies();
        renderMissions();
        renderBoost();
        renderStats();
    }

    function renderStore() {
        if (!serversListEl) return;
        serversListEl.innerHTML = '';
        Object.values(configs.servers || {}).forEach(srv => {
            const count = serversOwned[srv.id] || 0;
            const cost = Math.floor(srv.baseCost * Math.pow(1.15, count));
            const unlocked = unlocks.servers?.[srv.id] !== false;
            // if unlocks empty, treat as unlocked for first servers
            const isUnlocked = unlocks.servers ? !!unlocks.servers[srv.id] : (srv.unlockAt || 0) === 0;
            const canAfford = coins >= cost && isUnlocked;

            const card = document.createElement('div');
            card.className = 'store-item-card' + (isUnlocked ? '' : ' locked');
            card.innerHTML = `
                <div class="item-left">
                    <div class="item-icon">${srv.icon || '💻'}</div>
                    <div class="item-details">
                        <div class="item-name">${srv.name}${count ? ` <span class="item-count-badge">x${count}</span>` : ''}</div>
                        <span class="item-meta">+${formatNumber(srv.baseProd)}/s · T${srv.tier || '?'}</span>
                        ${!isUnlocked ? `<span class="lock-hint">🔒 unlock ${formatNumber(srv.unlockAt || 0)}</span>` : ''}
                    </div>
                </div>
                <button type="button" class="btn-buy" data-server-id="${srv.id}" data-cost="${cost}"
                    ${(!canAfford || !isUnlocked) ? 'disabled' : ''}>
                    🪙 ${formatNumber(cost)}
                </button>
            `;
            serversListEl.appendChild(card);
        });

        if (adminsListEl) {
            adminsListEl.innerHTML = '';
            Object.values(configs.admins || {}).forEach(adm => {
                const owned = !!adminsOwned[adm.id];
                const isUnlocked = unlocks.admins ? !!unlocks.admins[adm.id] : true;
                const canAfford = coins >= adm.cost && !owned && isUnlocked;
                const card = document.createElement('div');
                card.className = 'store-item-card' + (isUnlocked ? '' : ' locked');
                card.innerHTML = `
                    <div class="item-left">
                        <div class="item-icon">${adm.icon || '🛡️'}</div>
                        <div class="item-details">
                            <div class="item-name">${adm.name}</div>
                            <span class="item-meta">${adm.desc || ''}</span>
                        </div>
                    </div>
                    <button type="button" class="btn-buy" data-admin-id="${adm.id}" data-cost="${adm.cost}"
                        data-owned="${owned ? '1' : ''}"
                        ${(owned || !canAfford || !isUnlocked) ? 'disabled' : ''}>
                        ${owned ? 'OK ✓' : `🪙 ${formatNumber(adm.cost)}`}
                    </button>
                `;
                adminsListEl.appendChild(card);
            });
        }
    }

    function renderResearch() {
        if (!researchListEl) return;
        researchListEl.innerHTML = '';
        Object.values(configs.research || {}).forEach(r => {
            const owned = !!researchOwned[r.id];
            const reqs = r.requires || {};
            const reqOk = Object.entries(reqs).every(([id, need]) => !need || researchOwned[id]);
            const can = !owned && reqOk && coins >= r.cost;
            const card = document.createElement('div');
            card.className = 'store-item-card' + (owned ? ' owned' : '');
            card.innerHTML = `
                <div class="item-left">
                    <div class="item-icon">${r.icon || '🔬'}</div>
                    <div class="item-details">
                        <div class="item-name">${r.name}</div>
                        <span class="item-meta">${r.desc || ''}</span>
                    </div>
                </div>
                <button type="button" class="btn-buy" data-research-id="${r.id}" data-cost="${r.cost}"
                    ${(!can || owned) ? 'disabled' : ''}>
                    ${owned ? 'DONE ✓' : `🪙 ${formatNumber(r.cost)}`}
                </button>
            `;
            researchListEl.appendChild(card);
        });
        if (!Object.keys(configs.research || {}).length) {
            researchListEl.innerHTML = '<div class="store-empty"><p>Lab desconectado…</p></div>';
        }
    }

    function renderRack() {
        if (!rackContainer) return;
        rackContainer.innerHTML = '';
        let n = 0;
        Object.entries(serversOwned).forEach(([id, count]) => {
            const conf = configs.servers?.[id];
            if (!conf || !count) return;
            const limit = Math.min(count, 2);
            for (let i = 0; i < limit; i++) {
                n++;
                const unit = document.createElement('div');
                unit.className = 'server-unit';
                unit.innerHTML = `
                    <div class="unit-leds">
                        <span class="led led-green"></span>
                        <span class="led led-blue"></span>
                        <span class="led led-blink"></span>
                    </div>
                    <div class="unit-info">${conf.icon || ''} ${conf.name} #${i + 1}</div>
                    <div class="unit-fan"></div>
                `;
                rackContainer.appendChild(unit);
            }
        });
        if (!n) {
            rackContainer.innerHTML = `<div class="server-unit" style="justify-content:center;opacity:.55"><div>Sin servers · comprá en la tienda</div></div>`;
        }
    }

    function renderSynergies() {
        if (!synergyRow) return;
        if (!synergies.length) {
            synergyRow.innerHTML = '';
            return;
        }
        synergyRow.innerHTML = synergies.map(s =>
            `<span class="synergy-chip">${s.label}</span>`
        ).join('');
    }

    function renderMissions() {
        if (!missionsBar) return;
        const list = missions.list || [];
        if (!list.length) {
            missionsBar.innerHTML = '';
            return;
        }
        missionsBar.innerHTML = list.map(m => {
            const claimed = missions.claimed?.[m.id];
            const done = (m.progress || 0) >= m.target;
            const pct = Math.min(100, Math.floor(((m.progress || 0) / m.target) * 100));
            return `
              <div class="mission-card ${done ? 'done' : ''} ${claimed ? 'claimed' : ''}">
                <div class="mission-label">${m.label}</div>
                <div class="mission-bar"><div class="mission-fill" style="width:${pct}%"></div></div>
                <div class="mission-meta">${m.progress || 0}/${m.target} · 🪙 ${formatNumber(m.reward)}</div>
                <button type="button" class="btn-claim" data-mission-id="${m.id}"
                  ${(!done || claimed) ? 'disabled' : ''}>
                  ${claimed ? 'OK' : done ? 'CLAIM' : '…'}
                </button>
              </div>`;
        }).join('');
    }

    function renderBoost() {
        if (!boostBanner) return;
        if (boost && boost.expiresAt > Date.now()) {
            boostBanner.style.display = 'flex';
            if (boostLabel) boostLabel.textContent = boost.label || 'BOOST';
            const left = Math.max(0, Math.ceil((boost.expiresAt - Date.now()) / 1000));
            if (boostTimer) boostTimer.textContent = `${left}s`;
        } else {
            boostBanner.style.display = 'none';
        }
    }

    function renderStats() {
        if (!statsMini) return;
        statsMini.innerHTML = `
          <div>Clicks: <strong>${formatNumber(stats.totalClicks || 0)}</strong></div>
          <div>Crits: <strong>${formatNumber(stats.totalCrits || 0)}</strong></div>
          <div>Lifetime: <strong>${formatNumber(stats.lifetimeEarned || 0)}</strong></div>
        `;
    }

    function updatePrestigeUI() {
        const lvl = document.getElementById('prestige-level');
        const bonus = document.getElementById('prestige-bonus');
        if (lvl) lvl.textContent = String(prestigeLevel);
        if (bonus) bonus.textContent = `+${prestigeLevel * 20}%`;
    }

    function updateUI() {
        if (coinsEl) coinsEl.textContent = formatNumber(Math.floor(coins));
        if (prodEl) prodEl.textContent = `+${formatNumber(productionPerSec)} /s`;
        if (multEl) multEl.textContent = `x${Number(multiplier).toFixed(2)}`;
        if (clicksEl) clicksEl.textContent = `${formatNumber(autoClicksPerSec)} /s`;
        if (clickMeta) clickMeta.textContent = `Crit ${(critChance * 100).toFixed(0)}% · x${critMultiplier}`;

        document.querySelectorAll('.btn-buy[data-cost]').forEach(btn => {
            if (btn.getAttribute('data-owned') === '1') {
                btn.disabled = true;
                return;
            }
            const cost = Number(btn.getAttribute('data-cost')) || 0;
            btn.disabled = coins < cost;
        });
        renderBoost();
    }

    // Events
    window.prophetClient.on('tycoon:state', (data) => applyState(data.state));

    window.prophetClient.on('tycoon:click_result', (data) => {
        if (data.coins != null) {
            coins = data.coins + pendingPassiveGains;
            if (data.crits > 0) {
                if (soundEnabled && window.SoundFX) SoundFX.playUpgrade();
                if (window.spawnFloatingText && mainBtn) {
                    const r = mainBtn.getBoundingClientRect();
                    spawnFloatingText(r.left + r.width / 2, r.top, `CRIT x${data.crits}!`, '#FF6BF0');
                }
            }
            updateUI();
        }
    });

    window.prophetClient.on('tycoon:buy_server_result', (data) => {
        if (data.success) {
            serversOwned[data.serverId] = data.count;
            coins = data.coins;
            productionPerSec = data.productionPerSec;
            autoClicksPerSec = data.autoClicksPerSec;
            if (data.multiplier) multiplier = data.multiplier;
            if (data.synergies) synergies = data.synergies;
            if (data.unlocks) unlocks = data.unlocks;
            if (soundEnabled && window.SoundFX) SoundFX.playUpgrade();
            renderAll();
            updateUI();
        } else if (window.showToast) showToast(data.error || 'Error', 'error');
    });

    window.prophetClient.on('tycoon:buy_admin_result', (data) => {
        if (data.success) {
            adminsOwned = data.admins || adminsOwned;
            coins = data.coins;
            productionPerSec = data.productionPerSec;
            autoClicksPerSec = data.autoClicksPerSec;
            if (data.multiplier) multiplier = data.multiplier;
            if (data.critChance != null) critChance = data.critChance;
            if (soundEnabled && window.SoundFX) SoundFX.playUpgrade();
            renderAll();
            updateUI();
        } else if (window.showToast) showToast(data.error || 'Error', 'error');
    });

    window.prophetClient.on('tycoon:buy_research_result', (data) => {
        if (data.success) {
            researchOwned = data.research || researchOwned;
            coins = data.coins;
            productionPerSec = data.productionPerSec || productionPerSec;
            if (data.multiplier) multiplier = data.multiplier;
            if (data.critChance != null) critChance = data.critChance;
            if (data.critMultiplier) critMultiplier = data.critMultiplier;
            if (soundEnabled && window.SoundFX) SoundFX.playUpgrade();
            renderAll();
            updateUI();
        } else if (window.showToast) showToast(data.error || 'Error', 'error');
    });

    window.prophetClient.on('tycoon:claim_mission_result', (data) => {
        if (data.success) {
            coins = data.coins;
            missions = data.missions || missions;
            if (soundEnabled && window.SoundFX) SoundFX.playCoin();
            if (window.spawnConfetti) spawnConfetti(20);
            renderMissions();
            updateUI();
        } else if (window.showToast) showToast(data.error || 'Error', 'error');
    });

    window.prophetClient.on('tycoon:prestige_result', (data) => {
        if (data.success) {
            coins = data.coins || 0;
            serversOwned = {};
            adminsOwned = {};
            researchOwned = {};
            prestigeLevel = data.prestige || 0;
            productionPerSec = data.productionPerSec || 0;
            autoClicksPerSec = data.autoClicksPerSec || 0;
            pendingPassiveGains = 0;
            if (data.unlocks) unlocks = data.unlocks;
            updatePrestigeUI();
            renderAll();
            updateUI();
            if (soundEnabled && window.SoundFX) SoundFX.playUpgrade();
            if (window.showToast) showToast(`Prestigio ${prestigeLevel}! ${data.multiplierBonus}`, 'success');
            if (window.spawnConfetti) spawnConfetti(40);
        } else if (window.showToast) showToast(data.error || 'Error', 'error');
    });

    window.prophetClient.on('tycoon:sync_result', (data) => {
        if (data.success && data.coins != null) {
            coins = data.coins;
            updateUI();
        }
    });

    window.prophetClient.on('reconnected', () => {
        window.prophetClient.send({ type: 'tycoon:init' });
    });

    // Loops
    setInterval(() => {
        if (productionPerSec > 0) {
            const g = productionPerSec / 10;
            coins += g;
            pendingPassiveGains += g;
            updateUI();
        }
    }, 100);

    setInterval(() => {
        if (autoClicksPerSec > 0) {
            const clickValue = Math.max(1, Math.floor(1 * multiplier));
            const g = clickValue * (autoClicksPerSec / 5);
            coins += g;
            pendingPassiveGains += g;
            updateUI();
        }
    }, 200);

    setInterval(() => {
        if (pendingPassiveGains >= 1) {
            const toSend = Math.floor(pendingPassiveGains);
            window.prophetClient.send({ type: 'tycoon:sync', addedCoins: toSend });
            pendingPassiveGains -= toSend;
        }
    }, 10000);

    setInterval(() => renderBoost(), 1000);

    renderAll();
    updateUI();

    (async () => {
        try {
            await window.prophetClient.connect();
            window.prophetClient.send({ type: 'tycoon:init' });
        } catch (e) {
            console.warn(e);
        }
    })();
});
