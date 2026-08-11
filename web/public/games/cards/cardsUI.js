/**
 * ════ CARDS UI RENDERER v2 — Cartas reales CSS ════
 */

const SPANISH_SUITS = {
    espada: { symbol: '♠', label: 'Espada', color: '#1a1a2e', accent: '#2d3a5c' },
    basto:  { symbol: '♣', label: 'Basto',  color: '#1b3d1f', accent: '#2d5a32' },
    oro:    { symbol: '◆', label: 'Oro',    color: '#8B6914', accent: '#C9A227' },
    copa:   { symbol: '♥', label: 'Copa',   color: '#8B1A1A', accent: '#C62828' }
};

const FACE_MAP = { 1: 'AS', 10: 'SOTA', 11: 'CABALLO', 12: 'REY' };

function renderSpanishCard(number, suit, onClick = null) {
    const meta = SPANISH_SUITS[suit] || SPANISH_SUITS.espada;
    const isGold = suit === 'oro';
    const isCup = suit === 'copa';
    const face = FACE_MAP[number] || String(number);

    const cardEl = document.createElement('div');
    cardEl.className = `card-spanish suit-${suit}${isGold ? ' suit-gold' : ''}${isCup ? ' suit-red' : ''}`;
    cardEl.dataset.number = number;
    cardEl.dataset.suit = suit;

    cardEl.innerHTML = `
        <div class="cs-corner cs-tl">
            <span class="cs-rank">${number}</span>
            <span class="cs-mini">${meta.symbol}</span>
        </div>
        <div class="cs-center">
            <span class="cs-suit-big">${meta.symbol}</span>
            <span class="cs-face-label">${face}</span>
        </div>
        <div class="cs-corner cs-br">
            <span class="cs-rank">${number}</span>
            <span class="cs-mini">${meta.symbol}</span>
        </div>
        <div class="cs-pattern"></div>
    `;

    if (onClick) {
        cardEl.addEventListener('click', onClick);
        cardEl.classList.add('playable');
    }
    return cardEl;
}

function renderBjCard(value, suit, faceDown = false) {
    if (faceDown) {
        const back = document.createElement('div');
        back.className = 'card-bj card-back-bj';
        back.innerHTML = `<div class="bj-back-pattern"></div>`;
        return back;
    }

    const isRed = suit === '♥' || suit === '♦' || suit === 'H' || suit === 'D';
    const suitSym = ({ H: '♥', D: '♦', C: '♣', S: '♠' }[suit]) || suit;
    const displayVal = value === 1 || value === 'A' ? 'A'
        : value === 11 || value === 'J' ? 'J'
        : value === 12 || value === 'Q' ? 'Q'
        : value === 13 || value === 'K' ? 'K'
        : String(value);

    const cardEl = document.createElement('div');
    cardEl.className = `card-bj ${isRed ? 'red-card' : 'black-card'}`;
    cardEl.innerHTML = `
        <div class="bj-corner bj-tl">
            <span class="bj-rank">${displayVal}</span>
            <span class="bj-suit">${suitSym}</span>
        </div>
        <div class="bj-center-suit">${suitSym}</div>
        <div class="bj-corner bj-br">
            <span class="bj-rank">${displayVal}</span>
            <span class="bj-suit">${suitSym}</span>
        </div>
    `;
    return cardEl;
}

function renderCardBack(size = 'normal') {
    const el = document.createElement('div');
    el.className = size === 'small' ? 'card-back card-back-sm' : 'card-back';
    el.innerHTML = `<div class="back-inner"><span>P</span></div>`;
    return el;
}

// Mode Selector Tabs
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

window.renderSpanishCard = renderSpanishCard;
window.renderBjCard = renderBjCard;
window.renderCardBack = renderCardBack;
