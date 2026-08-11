/**
 * ═══ UTILIDADES COMPARTIDAS — PROPHET GAMES ═══
 */

// ─── Formateador de números (1.2K, 3.5M, 9.8B, 10.2T) ───
function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const n = Math.floor(num);
    if (n < 1000) return n.toLocaleString('es-AR');

    const suffixes = ['', 'K', 'M', 'B', 'T', 'Q'];
    const i = Math.floor(Math.log10(Math.abs(n)) / 3);
    if (i >= suffixes.length) return n.toExponential(2);

    const formatted = (n / Math.pow(10, i * 3)).toFixed(1).replace(/\.0$/, '');
    return `${formatted} ${suffixes[i]}`;
}

// ─── Sintetizador de Sonidos (Web Audio API nativo) ───
class SoundFX {
    static init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    static playClick() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.06);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.06);
    }

    static playCoin() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
        osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // E6

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    static playUpgrade() {
        this.init();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        notes.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + index * 0.06);

            gain.gain.setValueAtTime(0.15, this.ctx.currentTime + index * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (index + 1) * 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + index * 0.06);
            osc.stop(this.ctx.currentTime + (index + 1) * 0.08);
        });
    }
}

// ─── Generador de Partículas de Texto Flotante ───
function spawnFloatingText(x, y, text, color = '#FFD700') {
    const el = document.createElement('div');
    el.innerText = text;
    el.style.position = 'fixed';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    el.style.fontFamily = "'JetBrains Mono', monospace";
    el.style.fontSize = '1.25rem';
    el.style.fontWeight = 'bold';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '9999';
    el.style.textShadow = '0 0 10px rgba(0,0,0,0.8), 0 0 5px ' + color;
    el.style.transform = 'translate(-50%, -50%)';
    el.style.transition = 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)';
    el.style.opacity = '1';

    document.body.appendChild(el);

    requestAnimationFrame(() => {
        el.style.top = `${y - 65}px`;
        el.style.opacity = '0';
        el.style.transform = 'translate(-50%, -50%) scale(1.15)';
    });

    setTimeout(() => {
        el.remove();
    }, 800);
}
