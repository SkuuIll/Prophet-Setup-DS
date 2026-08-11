/**
 * ═══ UTILIDADES COMPARTIDAS — PROPHET GAMES v2 ═══
 */

function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const n = Math.floor(Number(num));
    if (Math.abs(n) < 1000) return n.toLocaleString('es-AR');

    const suffixes = ['', 'K', 'M', 'B', 'T', 'Q'];
    const i = Math.min(suffixes.length - 1, Math.floor(Math.log10(Math.abs(n)) / 3));
    const formatted = (n / Math.pow(10, i * 3)).toFixed(1).replace(/\.0$/, '');
    return `${formatted}${suffixes[i]}`;
}

function showToast(message, type = 'info', duration = 2800) {
    let el = document.querySelector('.prophet-toast');
    if (!el) {
        el = document.createElement('div');
        el.className = 'prophet-toast';
        document.body.appendChild(el);
    }
    el.className = `prophet-toast ${type === 'error' ? 'error' : type === 'success' ? 'success' : ''}`;
    el.textContent = message;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove('show'), duration);
}

class SoundFX {
    static enabled = true;

    static init() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) this.ctx = new AC();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    static _tone(type, freqStart, freqEnd, duration, volume = 0.2, delay = 0) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const t0 = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, t0);
        if (freqEnd !== freqStart) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);
        }
        gain.gain.setValueAtTime(volume, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t0);
        osc.stop(t0 + duration + 0.02);
    }

    static playClick() {
        this._tone('sine', 520, 140, 0.055, 0.18);
    }

    static playCoin() {
        this._tone('triangle', 988, 988, 0.08, 0.2);
        this._tone('triangle', 1319, 1319, 0.18, 0.18, 0.07);
    }

    static playUpgrade() {
        [523, 659, 784, 1047].forEach((f, i) => {
            this._tone('square', f, f, 0.09, 0.1, i * 0.055);
        });
    }

    static playWin() {
        [523, 659, 784, 1047, 1319].forEach((f, i) => {
            this._tone('triangle', f, f * 1.01, 0.12, 0.12, i * 0.07);
        });
    }

    static playLose() {
        this._tone('sawtooth', 280, 90, 0.35, 0.12);
    }

    static playWhoosh() {
        this._tone('sine', 200, 80, 0.2, 0.08);
    }

    static playTick() {
        this._tone('square', 800, 600, 0.03, 0.06);
    }

    static playCrash() {
        this._tone('sawtooth', 180, 40, 0.45, 0.15);
        this._tone('square', 90, 30, 0.5, 0.1, 0.05);
    }

    static playCard() {
        this._tone('triangle', 340, 220, 0.06, 0.1);
    }
}

function spawnFloatingText(x, y, text, color = '#FFD54F') {
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style, {
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        color,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '1.35rem',
        fontWeight: '800',
        pointerEvents: 'none',
        zIndex: '9999',
        textShadow: `0 0 12px rgba(0,0,0,0.85), 0 0 8px ${color}`,
        transform: 'translate(-50%, -50%)',
        transition: 'all 0.85s cubic-bezier(0.2, 0.8, 0.2, 1)',
        opacity: '1',
        whiteSpace: 'nowrap'
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => {
        el.style.top = `${y - 72}px`;
        el.style.opacity = '0';
        el.style.transform = 'translate(-50%, -50%) scale(1.2)';
    });
    setTimeout(() => el.remove(), 850);
}

function spawnRipple(x, y, color = 'rgba(179, 136, 255, 0.5)') {
    const el = document.createElement('div');
    Object.assign(el.style, {
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        border: `2px solid ${color}`,
        transform: 'translate(-50%, -50%) scale(0.3)',
        pointerEvents: 'none',
        zIndex: '9998',
        opacity: '0.9',
        transition: 'all 0.5s ease-out'
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => {
        el.style.transform = 'translate(-50%, -50%) scale(6)';
        el.style.opacity = '0';
    });
    setTimeout(() => el.remove(), 520);
}

function spawnConfetti(count = 40) {
    const colors = ['#B388FF', '#00E5C3', '#FFD54F', '#FF6BF0', '#69F0AE', '#40C4FF'];
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        const size = 6 + Math.random() * 8;
        const x = Math.random() * window.innerWidth;
        const rot = Math.random() * 360;
        Object.assign(p.style, {
            position: 'fixed',
            left: `${x}px`,
            top: '-12px',
            width: `${size}px`,
            height: `${size * (0.5 + Math.random())}px`,
            background: colors[i % colors.length],
            borderRadius: Math.random() > 0.5 ? '2px' : '50%',
            zIndex: '9997',
            pointerEvents: 'none',
            opacity: '0.95',
            transform: `rotate(${rot}deg)`,
            transition: `top ${1.2 + Math.random()}s linear, opacity 0.4s ease ${0.9 + Math.random() * 0.4}s, transform ${1.5}s ease-out`
        });
        document.body.appendChild(p);
        requestAnimationFrame(() => {
            p.style.top = `${window.innerHeight + 20}px`;
            p.style.opacity = '0';
            p.style.transform = `rotate(${rot + 400 + Math.random() * 200}deg) translateX(${(Math.random() - 0.5) * 120}px)`;
        });
        setTimeout(() => p.remove(), 2200);
    }
}

window.formatNumber = formatNumber;
window.showToast = showToast;
window.SoundFX = SoundFX;
window.spawnFloatingText = spawnFloatingText;
window.spawnRipple = spawnRipple;
window.spawnConfetti = spawnConfetti;
