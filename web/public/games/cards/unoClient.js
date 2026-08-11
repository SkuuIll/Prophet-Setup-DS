/**
 * ════ UNO CLÁSICO — CLIENT ════
 */

let unoTable = null;
let unoUserId = null;
let pendingColorCardId = null;

window.setUnoUserId = (id) => { unoUserId = id; };

const COLOR_HEX = {
    red: '#e53935',
    yellow: '#fdd835',
    green: '#43a047',
    blue: '#1e88e5',
    wild: '#212121'
};

const VALUE_LABEL = {
    skip: '⊘',
    reverse: '↺',
    draw2: '+2',
    wild: 'W',
    wild4: '+4'
};

function unoEls() {
    return {
        lobby: document.getElementById('uno-lobby-panel'),
        stage: document.getElementById('uno-table-stage'),
        bet: document.getElementById('uno-bet-input'),
        maxP: document.getElementById('uno-max-players'),
        target: document.getElementById('uno-target-select'),
        code: document.getElementById('uno-room-code-input'),
        btnCreate: document.getElementById('btn-create-uno'),
        btnJoin: document.getElementById('btn-join-uno'),
        btnStart: document.getElementById('btn-uno-start'),
        btnDraw: document.getElementById('btn-uno-draw'),
        btnPass: document.getElementById('btn-uno-pass'),
        btnUno: document.getElementById('btn-uno-call'),
        hand: document.getElementById('uno-hand'),
        opponents: document.getElementById('uno-opponents'),
        discard: document.getElementById('uno-discard'),
        deck: document.getElementById('uno-deck-pile'),
        colorBanner: document.getElementById('uno-color-banner'),
        status: document.getElementById('uno-status'),
        log: document.getElementById('uno-log'),
        pot: document.getElementById('uno-pot'),
        tableId: document.getElementById('uno-table-id'),
        colorModal: document.getElementById('uno-color-modal'),
        challengeModal: document.getElementById('uno-challenge-modal'),
        scores: document.getElementById('uno-scores')
    };
}

function renderUnoCard(card, opts = {}) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `uno-card color-${card.color || 'wild'}${opts.playable ? ' playable' : ''}${opts.small ? ' small' : ''}`;
    el.dataset.cardId = card.id || '';

    const isWild = card.type === 'wild' || card.type === 'wild4';
    const bg = isWild
        ? 'linear-gradient(135deg,#111 0%,#333 40%,#e53935 40%,#e53935 55%,#fdd835 55%,#fdd835 70%,#43a047 70%,#43a047 85%,#1e88e5 85%)'
        : COLOR_HEX[card.color] || '#333';

    const label = VALUE_LABEL[card.type] || VALUE_LABEL[card.value] || card.value;
    const sub = isWild ? (card.chosenColor ? (card.chosenColor[0] || '').toUpperCase() : '★') : '';

    el.innerHTML = `
        <span class="uno-card-inner" style="background:${isWild ? bg : COLOR_HEX[card.color]}">
            <span class="uno-card-val">${label}</span>
            ${sub ? `<span class="uno-card-sub">${sub}</span>` : ''}
        </span>
    `;

    if (opts.onClick) el.addEventListener('click', opts.onClick);
    return el;
}

function isPlayable(card, table) {
    if (!table || !card) return false;
    if (table.pendingDraw > 0 && table.pendingDrawType === 'draw2') {
        return table.allowStackDraw2 && card.type === 'draw2';
    }
    if (table.pendingDraw > 0 && table.pendingDrawType === 'wild4') return false;
    if (card.type === 'wild' || card.type === 'wild4') return true;
    if (card.color === table.currentColor) return true;
    const top = table.topCard;
    if (card.type === 'number' && top?.type === 'number' && card.value === top.value) return true;
    if (card.type !== 'number' && card.type !== 'wild' && card.type !== 'wild4' && top && card.type === top.type) return true;
    return false;
}

function applyUnoTable(table) {
    if (!table) return;
    unoTable = table;
    const e = unoEls();
    if (e.lobby) e.lobby.style.display = 'none';
    if (e.stage) e.stage.style.display = 'flex';

    if (e.tableId) e.tableId.textContent = table.tableId;
    if (e.pot) e.pot.textContent = `Pozo: 🪙 ${formatNumber(table.pot || 0)}`;

    const my = (table.players || []).find(p => p.userId === unoUserId);
    const myTurn = my && table.turnIndex === table.myIndex && table.state === 'PLAYING';

    // Status
    if (e.status) {
        if (table.state === 'LOBBY') {
            e.status.textContent = `Lobby · ${table.players.length}/${table.maxPlayers} jugadores · esperando host`;
        } else if (table.state === 'COLOR_PICK' && table.pendingWild?.playerIdx === table.myIndex) {
            e.status.textContent = 'Elegí un color para el comodín';
        } else if (table.state === 'FINISHED') {
            e.status.textContent = 'Partida finalizada';
        } else if (myTurn) {
            if (table.pendingDraw > 0) {
                e.status.textContent = `Tu turno · castigo +${table.pendingDraw} (robá o apilá)`;
            } else {
                e.status.textContent = 'Tu turno · jugá una carta o robá';
            }
        } else {
            const cur = table.players[table.turnIndex];
            e.status.textContent = `Turno de ${cur?.username || '…'}`;
        }
    }

    // Color banner
    if (e.colorBanner) {
        const col = table.currentColor || 'wild';
        e.colorBanner.style.background = COLOR_HEX[col] || '#444';
        e.colorBanner.textContent = (table.colorLabels && table.colorLabels[col]) || col || '—';
    }

    // Discard
    if (e.discard) {
        e.discard.innerHTML = '';
        if (table.topCard) {
            e.discard.appendChild(renderUnoCard(table.topCard, { small: false }));
        }
    }
    if (e.deck) {
        e.deck.innerHTML = `<div class="uno-deck-back"><span>UNO</span><small>${table.deckCount || 0}</small></div>`;
    }

    // Opponents
    if (e.opponents) {
        e.opponents.innerHTML = '';
        (table.players || []).forEach((p, idx) => {
            if (p.userId === unoUserId) return;
            const row = document.createElement('div');
            row.className = `uno-opp${p.isTurn ? ' turn' : ''}${p.saidUno ? ' uno-said' : ''}`;
            row.innerHTML = `
                <div class="uno-opp-name">${p.username}${p.isHost ? ' 👑' : ''}</div>
                <div class="uno-opp-cards">${'🂠'.repeat(Math.min(8, p.cardCount))}${p.cardCount > 8 ? '+' : ''} <b>${p.cardCount}</b></div>
                <div class="uno-opp-score">${p.score} pts</div>
                ${p.cardCount === 1 && !p.saidUno ? '<button class="btn-catch-uno" data-uid="' + p.userId + '">¡ATRAPAR UNO!</button>' : ''}
                ${p.saidUno ? '<span class="uno-badge">UNO!</span>' : ''}
            `;
            e.opponents.appendChild(row);
        });
        e.opponents.querySelectorAll('.btn-catch-uno').forEach(btn => {
            btn.addEventListener('click', () => {
                window.prophetClient.send({
                    type: 'uno:catch_uno',
                    tableId: table.tableId,
                    targetUserId: btn.getAttribute('data-uid')
                });
            });
        });
    }

    // Scores bar
    if (e.scores) {
        e.scores.innerHTML = (table.players || []).map(p =>
            `<span class="uno-score-pill${p.userId === unoUserId ? ' me' : ''}${p.isTurn ? ' turn' : ''}">${p.username}: <b>${p.score}</b> · ${p.cardCount}🎴</span>`
        ).join('');
    }

    // Hand
    if (e.hand) {
        e.hand.innerHTML = '';
        const hand = my?.hand || [];
        hand.forEach(card => {
            const playable = myTurn && isPlayable(card, table);
            e.hand.appendChild(renderUnoCard(card, {
                playable,
                onClick: () => {
                    if (!playable) return;
                    if (window.SoundFX) SoundFX.playClick();
                    if (card.type === 'wild' || card.type === 'wild4') {
                        pendingColorCardId = card.id;
                        openColorModal(true);
                        return;
                    }
                    window.prophetClient.send({
                        type: 'uno:play',
                        tableId: table.tableId,
                        cardId: card.id
                    });
                }
            }));
        });
    }

    // Buttons
    if (e.btnStart) {
        e.btnStart.style.display = (table.state === 'LOBBY' && table.hostUserId === unoUserId) ? 'inline-flex' : 'none';
    }
    if (e.btnDraw) e.btnDraw.disabled = !myTurn || table.state !== 'PLAYING';
    if (e.btnPass) e.btnPass.disabled = !myTurn || !table.drawnThisTurn || table.pendingDraw > 0;
    if (e.btnUno) {
        e.btnUno.disabled = !(my && my.hand && my.hand.length === 1);
        e.btnUno.classList.toggle('pulse', my && my.hand && my.hand.length === 1 && !my.saidUno);
    }

    // Color pick modal from server
    if (table.state === 'COLOR_PICK' && table.pendingWild?.playerIdx === table.myIndex) {
        openColorModal(false);
    } else if (e.colorModal && table.state !== 'COLOR_PICK') {
        // don't auto-close if user opened for wild play
        if (!pendingColorCardId) e.colorModal.style.display = 'none';
    }

    // Challenge modal for +4
    if (e.challengeModal) {
        const cw = table.challengeWindow;
        const show = cw?.open && cw.targetIdx === table.myIndex && table.pendingDrawType === 'wild4';
        e.challengeModal.style.display = show ? 'flex' : 'none';
    }

    // Log
    if (e.log) {
        e.log.innerHTML = (table.log || []).map(l => `<div class="uno-log-line">${l.text}</div>`).join('');
    }
}

function openColorModal(forPlay) {
    const e = unoEls();
    if (!e.colorModal) return;
    e.colorModal.style.display = 'flex';
    e.colorModal.dataset.forPlay = forPlay ? '1' : '0';
}

function initUnoUI() {
    const e = unoEls();
    if (!e.btnCreate) return;

    e.btnCreate.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        window.prophetClient.send({
            type: 'uno:create_table',
            betAmount: parseInt(e.bet?.value, 10) || 0,
            maxPlayers: parseInt(e.maxP?.value, 10) || 4,
            targetScore: parseInt(e.target?.value, 10) || 0,
            allowStackDraw2: true
        });
    });

    e.btnJoin?.addEventListener('click', () => {
        const code = (e.code?.value || '').trim();
        if (!code) return alert('Ingresá el código de mesa');
        if (window.SoundFX) SoundFX.playClick();
        window.prophetClient.send({ type: 'uno:join_table', tableId: code });
    });

    e.btnStart?.addEventListener('click', () => {
        if (!unoTable) return;
        window.prophetClient.send({ type: 'uno:start', tableId: unoTable.tableId });
    });

    e.btnDraw?.addEventListener('click', () => {
        if (!unoTable) return;
        window.prophetClient.send({ type: 'uno:draw', tableId: unoTable.tableId });
    });

    e.btnPass?.addEventListener('click', () => {
        if (!unoTable) return;
        window.prophetClient.send({ type: 'uno:pass', tableId: unoTable.tableId });
    });

    e.btnUno?.addEventListener('click', () => {
        if (!unoTable) return;
        if (window.SoundFX) SoundFX.playUpgrade?.() || SoundFX.playClick();
        window.prophetClient.send({ type: 'uno:call_uno', tableId: unoTable.tableId });
    });

    // Color buttons
    document.querySelectorAll('[data-uno-color]').forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.getAttribute('data-uno-color');
            if (!unoTable) return;
            const forPlay = e.colorModal?.dataset.forPlay === '1';
            if (forPlay && pendingColorCardId) {
                window.prophetClient.send({
                    type: 'uno:play',
                    tableId: unoTable.tableId,
                    cardId: pendingColorCardId,
                    color
                });
                pendingColorCardId = null;
            } else {
                window.prophetClient.send({
                    type: 'uno:choose_color',
                    tableId: unoTable.tableId,
                    color
                });
            }
            if (e.colorModal) e.colorModal.style.display = 'none';
        });
    });

    document.getElementById('btn-uno-accept-plus4')?.addEventListener('click', () => {
        if (!unoTable) return;
        // accept = false means take the +4 (not challenge)
        window.prophetClient.send({ type: 'uno:challenge', tableId: unoTable.tableId, accept: false });
    });
    document.getElementById('btn-uno-challenge-plus4')?.addEventListener('click', () => {
        if (!unoTable) return;
        window.prophetClient.send({ type: 'uno:challenge', tableId: unoTable.tableId, accept: true });
    });
}

window.initUnoEvents = function initUnoEvents() {
    initUnoUI();

    const onTable = (data) => {
        if (!data.success) {
            alert(data.error || 'Error UNO');
            return;
        }
        if (data.table) applyUnoTable(data.table);
        if (data.needColor) openColorModal(false);
        if (data.potWon) {
            if (window.SoundFX) SoundFX.playWin?.();
            alert(`¡Ganaste el pozo de 🪙 ${formatNumber(data.potWon)}!`);
        }
    };

    window.prophetClient.on('uno:table_created', onTable);
    window.prophetClient.on('uno:table_joined', onTable);
    window.prophetClient.on('uno:start_result', onTable);
    window.prophetClient.on('uno:play_result', onTable);
    window.prophetClient.on('uno:color_result', onTable);
    window.prophetClient.on('uno:draw_result', onTable);
    window.prophetClient.on('uno:pass_result', onTable);
    window.prophetClient.on('uno:call_result', onTable);
    window.prophetClient.on('uno:catch_result', onTable);
    window.prophetClient.on('uno:challenge_result', onTable);
    window.prophetClient.on('uno:resync_result', onTable);
    window.prophetClient.on('uno:state', (data) => {
        if (data.table) applyUnoTable(data.table);
    });
    window.prophetClient.on('uno:game_over', (data) => {
        if (window.SoundFX) SoundFX.playWin?.();
        const pot = data.potWon ? ` · Pozo 🪙 ${formatNumber(data.potWon)}` : '';
        alert(`🏆 Gana ${data.winnerUsername}${pot}`);
    });
    window.prophetClient.on('uno:hand_over', (data) => {
        if (window.SoundFX) SoundFX.playUpgrade?.();
    });
};

