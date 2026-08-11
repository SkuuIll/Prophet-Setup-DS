/**
 * ════ BLACKJACK 21 — CLIENT CONTROLLER ════
 */

const bjBetInput = document.getElementById('bj-bet-input');
const btnBjDeal = document.getElementById('btn-bj-deal');
const bjBetPanel = document.getElementById('bj-bet-panel');
const bjActionsPanel = document.getElementById('bj-actions-panel');
const btnBjHit = document.getElementById('btn-bj-hit');
const btnBjStand = document.getElementById('btn-bj-stand');
const btnBjDouble = document.getElementById('btn-bj-double');
const btnBjSplit = document.getElementById('btn-bj-split');

const bjDealerCards = document.getElementById('bj-dealer-cards');
const bjPlayerCards = document.getElementById('bj-player-cards');
const bjDealerScore = document.getElementById('bj-dealer-score');
const bjPlayerScore = document.getElementById('bj-player-score');
const bjResultBanner = document.getElementById('bj-result-banner');

function setSplitVisible(show) {
    if (btnBjSplit) btnBjSplit.style.display = show ? 'inline-flex' : 'none';
}

bjBetInput.addEventListener('input', () => {
    const val = parseInt(bjBetInput.value, 10) || 100;
    btnBjDeal.innerText = `REPARTIR (${formatNumber(val)})`;
});

btnBjDeal.addEventListener('click', () => {
    const bet = parseInt(bjBetInput.value, 10) || 100;
    SoundFX.playClick();
    setSplitVisible(false);
    window.prophetClient.send({
        type: 'blackjack:start',
        betAmount: bet
    });
});

btnBjHit.addEventListener('click', () => {
    SoundFX.playClick();
    window.prophetClient.send({ type: 'blackjack:hit' });
});

btnBjStand.addEventListener('click', () => {
    SoundFX.playClick();
    window.prophetClient.send({ type: 'blackjack:stand' });
});

btnBjDouble.addEventListener('click', () => {
    SoundFX.playCoin();
    window.prophetClient.send({ type: 'blackjack:double' });
});

if (btnBjSplit) {
    btnBjSplit.addEventListener('click', () => {
        SoundFX.playClick();
        window.prophetClient.send({ type: 'blackjack:split' });
    });
}

function renderBjPlayerHand(cards, score) {
    bjPlayerCards.innerHTML = '';
    cards.forEach(c => bjPlayerCards.appendChild(renderBjCard(c.value, c.suit)));
    bjPlayerScore.innerText = score;
}

function renderBjDealerHand(cards, score, isFinished = false) {
    bjDealerCards.innerHTML = '';
    cards.forEach((c, idx) => {
        if (!isFinished && idx === 1) {
            bjDealerCards.appendChild(renderBjCard(null, null, true));
        } else {
            bjDealerCards.appendChild(renderBjCard(c.value, c.suit));
        }
    });
    bjDealerScore.innerText = isFinished ? score : (cards[0]?.numVal || '--');
}

window.initBlackjackEvents = () => {
    window.prophetClient.on('blackjack:started', (data) => {
        if (!data.success) {
            alert(data.error || 'Error al iniciar mano');
            return;
        }

        document.getElementById('cards-balance').innerText = formatNumber(data.balance);
        renderBjPlayerHand(data.playerHand, data.playerScore);
        renderBjDealerHand([data.dealerVisibleCard, {}], data.playerScore, false);

        if (data.playerScore === 21 && data.result) {
            bjResultBanner.innerText = data.result;
            renderBjDealerHand(data.dealerHand, data.dealerScore, true);
            bjBetPanel.style.display = 'flex';
            bjActionsPanel.style.display = 'none';
            setSplitVisible(false);
            SoundFX.playWin ? SoundFX.playWin() : SoundFX.playUpgrade();
        } else {
            bjResultBanner.innerText = 'TU TURNO: Pedir · Plantarse · Doblar' + (data.canSplit ? ' · Dividir' : '');
            bjBetPanel.style.display = 'none';
            bjActionsPanel.style.display = 'flex';
            btnBjDouble.disabled = !data.canDouble;
            setSplitVisible(!!data.canSplit);
            SoundFX.playCard ? SoundFX.playCard() : SoundFX.playClick();
        }
    });

    window.prophetClient.on('blackjack:split_result', (data) => {
        if (!data.success) {
            if (window.showToast) showToast(data.error || 'No se pudo dividir', 'error');
            return;
        }
        if (data.balance !== undefined) {
            document.getElementById('cards-balance').innerText = formatNumber(data.balance);
        }
        renderBjPlayerHand(data.playerHand, data.playerScore);
        bjResultBanner.innerText = data.message || 'Mano dividida · jugá la principal';
        setSplitVisible(false);
        btnBjDouble.disabled = !data.canDouble;
        SoundFX.playClick();
    });

    window.prophetClient.on('blackjack:hit_result', (data) => {
        if (!data.success) return;

        renderBjPlayerHand(data.playerHand, data.playerScore);

        if (data.isBusted) {
            renderBjDealerHand(data.dealerHand, data.dealerScore, true);
            bjResultBanner.innerText = data.result;
            bjBetPanel.style.display = 'flex';
            bjActionsPanel.style.display = 'none';
            SoundFX.playClick();
        }
    });

    window.prophetClient.on('blackjack:stand_result', (data) => {
        if (!data.success) return;

        renderBjDealerHand(data.dealerHand, data.dealerScore, true);
        bjResultBanner.innerText = data.result;
        if (data.balance !== undefined) {
            document.getElementById('cards-balance').innerText = formatNumber(data.balance);
        }

        bjBetPanel.style.display = 'flex';
        bjActionsPanel.style.display = 'none';

        if (data.payout > 0) {
            SoundFX.playWin();
            if (window.spawnConfetti) spawnConfetti(28);
        } else {
            SoundFX.playLose();
        }
    });

    window.prophetClient.on('blackjack:double_result', (data) => {
        if (!data.success) {
            if (window.showToast) showToast(data.error || 'Error al doblar', 'error');
            else alert(data.error || 'Error al doblar');
            return;
        }

        renderBjPlayerHand(data.playerHand, data.playerScore);
        renderBjDealerHand(data.dealerHand, data.dealerScore, true);
        bjResultBanner.innerText = data.result;

        if (data.balance !== undefined) {
            document.getElementById('cards-balance').innerText = formatNumber(data.balance);
        }

        bjBetPanel.style.display = 'flex';
        bjActionsPanel.style.display = 'none';

        if (data.payout > 0) {
            SoundFX.playWin();
            if (window.spawnConfetti) spawnConfetti(28);
        } else {
            SoundFX.playLose();
        }
    });
};

// ═══ INICIALIZADOR GENERAL ═══
document.addEventListener('DOMContentLoaded', async () => {
    const navBack = document.getElementById('nav-back-cards');
    if (navBack) {
        navBack.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.prophetNavigate) window.prophetNavigate('/games/hub/');
            else location.href = '/games/hub/';
        });
    }

    const authData = await window.prophetClient.connect();
    if (authData) {
        myUserId = authData.userId;
        window.__cardsUserId = authData.userId;
        if (window.setUnoUserId) window.setUnoUserId(authData.userId);
        document.getElementById('cards-balance').innerText = formatNumber(authData.balance);
    }

    window.initTrucoEvents();
    window.initBlackjackEvents();
    if (window.initUnoEvents) window.initUnoEvents();
});
