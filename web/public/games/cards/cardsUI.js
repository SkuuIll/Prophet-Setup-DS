/**
 * ════ CARDS UI RENDERER & CARD COMPONENTS ════
 */

const SUIT_ICONS = {
    espada: '⚔️',
    basto: '🪵',
    oro: '🪙',
    copa: '🍷'
};

function renderSpanishCard(number, suit, onClick = null) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card-spanish';
    cardEl.innerHTML = `
        <div class="card-number-corner">${number}</div>
        <div class="card-suit-center">${SUIT_ICONS[suit] || suit}</div>
        <div class="card-number-corner" style="text-align: right;">${number}</div>
    `;
    if (onClick) {
        cardEl.addEventListener('click', onClick);
    }
    return cardEl;
}

function renderBjCard(value, suit) {
    const isRed = suit === '♥' || suit === '♦';
    const cardEl = document.createElement('div');
    cardEl.className = `card-bj ${isRed ? 'red-card' : ''}`;
    cardEl.innerHTML = `
        <div style="font-size: 0.9rem;">${value} ${suit}</div>
        <div style="font-size: 1.8rem; text-align: center;">${suit}</div>
        <div style="font-size: 0.9rem; text-align: right;">${value} ${suit}</div>
    `;
    return cardEl;
}

// Mode Selector Tabs
document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.game-view').forEach(v => v.classList.remove('active'));

        tab.classList.add('active');
        const mode = tab.getAttribute('data-mode');
        document.getElementById(`view-${mode}`).classList.add('active');
    });
});
