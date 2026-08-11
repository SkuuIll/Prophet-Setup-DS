/**
 * ════ PROPHET SURVIVOR — MOTOR PRINCIPAL v3 (CANVAS 2D) ════
 * Oleadas, bosses cíclicos, combos, builds con tags, dash, scoring rico.
 */

const canvas = document.getElementById('survivor-canvas');
const ctx = canvas.getContext('2d');

const hudLevel = document.getElementById('hud-level');
const hudXpFill = document.getElementById('hud-xp-fill');
const hudTime = document.getElementById('hud-time');
const hudKills = document.getElementById('hud-kills');
const hudCoins = document.getElementById('hud-coins');
const hudHpFill = document.getElementById('hud-hp-fill');
const hudHpText = document.getElementById('hud-hp-text');

const modalLevelUp = document.getElementById('modal-levelup');
const upgradeCardsContainer = document.getElementById('upgrade-cards-container');
const modalGameOver = document.getElementById('modal-gameover');
const goTime = document.getElementById('go-time');
const goKills = document.getElementById('go-kills');
const goLevel = document.getElementById('go-level');
const goScore = document.getElementById('go-score');
const goCoins = document.getElementById('go-coins');
const btnReplay = document.getElementById('btn-replay');
const btnShowLb = document.getElementById('btn-show-lb');
const modalLeaderboard = document.getElementById('modal-leaderboard');
const btnCloseLb = document.getElementById('btn-close-lb');
const lbTableBody = document.getElementById('lb-table-body');

const joystickZone = document.getElementById('joystick-zone');
const joystickStick = document.getElementById('joystick-stick');

let myUserId = null;
let myBalance = 0;
let isPaused = false;
let isGameOver = false;
let started = false;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (!started && (e.key === ' ' || e.key === 'Enter' || e.key === 'w' || e.key === 'ArrowUp')) {
        started = true;
    }
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('pointerdown', () => { if (!started) started = true; });

let touchInput = { x: 0, y: 0, active: false };
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    joystickZone.style.display = 'block';
    joystickZone.addEventListener('pointerdown', handleTouch);
    window.addEventListener('pointermove', handleTouch);
    window.addEventListener('pointerup', () => {
        touchInput = { x: 0, y: 0, active: false };
        joystickStick.style.transform = 'translate(-50%, -50%)';
    });
}

function handleTouch(e) {
    if (!touchInput.active && e.type === 'pointerdown') {
        touchInput.active = true;
        started = true;
    }
    if (!touchInput.active) return;

    const rect = joystickZone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.min(45, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const sx = Math.cos(angle) * dist;
    const sy = Math.sin(angle) * dist;
    joystickStick.style.transform = `translate(calc(-50% + ${sx}px), calc(-50% + ${sy}px))`;
    touchInput.x = sx / 45;
    touchInput.y = sy / 45;
}

// Stars background (parallax)
const stars = Array.from({ length: 80 }, () => ({
    x: Math.random() * 4000 - 2000,
    y: Math.random() * 4000 - 2000,
    z: 0.3 + Math.random() * 0.7,
    s: 0.6 + Math.random() * 1.8
}));

// ══════════════ CLASE JUGADOR ══════════════
class Player {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.radius = 16;
        this.speed = 3.5;
        this.maxHp = 100;
        this.hp = 100;
        this.level = 1;
        this.xp = 0;
        this.xpNeeded = 30;
        this.magnetRadius = 90;
        this.damageMultiplier = 1.0;
        this.cooldownMultiplier = 1.0;
        this.armor = 0; // reducción % daño
        this.lifesteal = 0;
        this.xpBonus = 1;
        this.invulnerableFrames = 0;
        this.angle = 0;
        this.trail = [];
        this.dashCooldown = 0;
        this.dashFrames = 0;
        this.lastVx = 0;
        this.lastVy = 0;
        this.regen = 0;
        this.regenAcc = 0;
    }

    update(dt = 1) {
        let vx = 0, vy = 0;
        if (keys['w'] || keys['arrowup']) vy -= 1;
        if (keys['s'] || keys['arrowdown']) vy += 1;
        if (keys['a'] || keys['arrowleft']) vx -= 1;
        if (keys['d'] || keys['arrowright']) vx += 1;

        if (touchInput.active) {
            vx = touchInput.x;
            vy = touchInput.y;
        }

        const len = Math.hypot(vx, vy);
        if (len > 0) {
            this.lastVx = vx / len;
            this.lastVy = vy / len;
            let spd = this.speed;
            if (this.dashFrames > 0) spd *= 2.8;
            this.x += this.lastVx * spd * dt;
            this.y += this.lastVy * spd * dt;
            this.angle = Math.atan2(this.lastVy, this.lastVx);
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 12) this.trail.shift();
        } else if (this.trail.length) {
            this.trail.shift();
        }

        // Dash con Shift / Space
        if (this.dashCooldown > 0) this.dashCooldown -= dt;
        if (this.dashFrames > 0) this.dashFrames -= dt;
        if ((keys[' '] || keys['shift']) && this.dashCooldown <= 0 && started && !isPaused) {
            this.dashFrames = 10;
            this.dashCooldown = 90;
            this.invulnerableFrames = Math.max(this.invulnerableFrames, 12);
            spawnBurst(this.x, this.y, '#00E5C3', 8);
        }

        if (this.invulnerableFrames > 0) this.invulnerableFrames -= dt;

        // Regen pasiva
        if (this.regen > 0 && this.hp < this.maxHp) {
            this.regenAcc += this.regen * dt;
            if (this.regenAcc >= 1) {
                const heal = Math.floor(this.regenAcc);
                this.regenAcc -= heal;
                this.hp = Math.min(this.maxHp, this.hp + heal);
            }
        }
    }

    takeDamage(amount) {
        if (this.invulnerableFrames > 0 || this.dashFrames > 0) return;
        const reduced = Math.max(1, Math.floor(amount * (1 - Math.min(0.6, this.armor))));
        this.hp -= reduced;
        this.invulnerableFrames = 22;
        // Rompe combo al recibir daño
        comboCount = 0;
        SoundFX.playClick();
        spawnBurst(this.x, this.y, '#FF5252', 6);

        if (this.hp <= 0) {
            this.hp = 0;
            triggerGameOver();
        }
    }

    addXP(amount) {
        this.xp += Math.floor(amount * this.xpBonus);
        while (this.xp >= this.xpNeeded) this.levelUp();
    }

    levelUp() {
        this.xp -= this.xpNeeded;
        this.level++;
        this.xpNeeded = Math.floor(this.xpNeeded * 1.32 + 8);
        this.hp = Math.min(this.maxHp, this.hp + 20 + Math.floor(this.level * 0.5));
        SoundFX.playUpgrade();
        spawnBurst(this.x, this.y, '#B388FF', 18);
        showLevelUpModal();
    }

    draw(ctx, camera) {
        const cx = this.x - camera.x;
        const cy = this.y - camera.y;

        // Movement trail
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            const a = (i / this.trail.length) * 0.35;
            ctx.beginPath();
            ctx.fillStyle = `rgba(0, 229, 195, ${a})`;
            ctx.arc(t.x - camera.x, t.y - camera.y, 4 + i * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        if (this.invulnerableFrames % 4 > 1) ctx.globalAlpha = 0.45;

        // Outer aura
        const aura = ctx.createRadialGradient(cx, cy, 4, cx, cy, this.radius + 14);
        aura.addColorStop(0, 'rgba(0, 229, 195, 0.35)');
        aura.addColorStop(1, 'rgba(0, 229, 195, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(cx, cy, this.radius + 14, 0, Math.PI * 2);
        ctx.fill();

        // Ship body
        ctx.translate(cx, cy);
        ctx.rotate(this.angle);

        // Thruster flame
        const flame = 6 + Math.sin(performance.now() / 50) * 4;
        const fGrad = ctx.createLinearGradient(-this.radius - flame, 0, -this.radius + 4, 0);
        fGrad.addColorStop(0, 'rgba(255, 152, 0, 0)');
        fGrad.addColorStop(0.5, '#FF6D00');
        fGrad.addColorStop(1, '#18FFFF');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.moveTo(-this.radius + 2, -5);
        ctx.lineTo(-this.radius - flame, 0);
        ctx.lineTo(-this.radius + 2, 5);
        ctx.closePath();
        ctx.fill();

        // Hull
        ctx.shadowColor = '#00E5C3';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#0D9488';
        ctx.strokeStyle = '#5EEAD4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.radius + 4, 0);
        ctx.lineTo(-this.radius * 0.7, this.radius * 0.85);
        ctx.lineTo(-this.radius * 0.4, 0);
        ctx.lineTo(-this.radius * 0.7, -this.radius * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cockpit
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#E0F7FA';
        ctx.beginPath();
        ctx.ellipse(2, 0, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wing accents
        ctx.fillStyle = '#B388FF';
        ctx.fillRect(-4, -this.radius * 0.7, 8, 2.5);
        ctx.fillRect(-4, this.radius * 0.7 - 2.5, 8, 2.5);

        ctx.restore();
    }
}

// ══════════════ CLASE ENEMIGO ══════════════
const ENEMY_DEFS = {
    drone:   { radius: 13, hp: 35,  speed: 2.4, damage: 8,  xp: 10,  color: '#F50057', color2: '#FF80AB' },
    swarm:   { radius: 9,  hp: 14,  speed: 3.4, damage: 5,  xp: 5,   color: '#E040FB', color2: '#EA80FC' },
    tank:    { radius: 22, hp: 220, speed: 1.1, damage: 18, xp: 35,  color: '#607D8B', color2: '#90A4AE' },
    mutant:  { radius: 18, hp: 95,  speed: 1.9, damage: 14, xp: 25,  color: '#FF9100', color2: '#FFD180' },
    elite:   { radius: 20, hp: 280, speed: 2.0, damage: 20, xp: 55,  color: '#FFD600', color2: '#FFFF8D' },
    splitter:{ radius: 16, hp: 70,  speed: 1.7, damage: 12, xp: 20,  color: '#69F0AE', color2: '#B9F6CA' },
    boss:    { radius: 38, hp: 1400,speed: 1.15,damage: 28, xp: 120, color: '#FF1744', color2: '#FF8A80' },
    megaboss:{ radius: 52, hp: 4200,speed: 0.95,damage: 40, xp: 300, color: '#D500F9', color2: '#EA80FC' }
};

class Enemy {
    constructor(x, y, type = 'drone', scale = 1) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.phase = Math.random() * Math.PI * 2;
        this.hitFlash = 0;
        this.slowUntil = 0;
        this.slowFactor = 1;

        const def = ENEMY_DEFS[type] || ENEMY_DEFS.drone;
        this.radius = def.radius * (type === 'swarm' ? 1 : Math.min(1.4, 0.9 + scale * 0.1));
        this.hp = Math.floor(def.hp * scale);
        this.maxHp = this.hp;
        this.baseSpeed = def.speed * (0.95 + Math.random() * 0.1);
        this.speed = this.baseSpeed;
        this.damage = Math.floor(def.damage * (0.9 + scale * 0.1));
        this.xpVal = Math.floor(def.xp * scale);
        this.color = def.color;
        this.color2 = def.color2;
        this.orbitDir = Math.random() < 0.5 ? 1 : -1;
    }

    applySlow(factor, frames) {
        this.slowFactor = Math.min(this.slowFactor, factor);
        this.slowUntil = Math.max(this.slowUntil, frames);
    }

    update(player, dt = 1) {
        if (this.slowUntil > 0) {
            this.slowUntil -= dt;
            if (this.slowUntil <= 0) this.slowFactor = 1;
        }
        const spd = this.baseSpeed * this.slowFactor;
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        // Elites orbitan un poco
        if (this.type === 'elite') {
            const ox = Math.cos(angle + this.orbitDir * 0.7) * spd * dt;
            const oy = Math.sin(angle + this.orbitDir * 0.7) * spd * dt;
            this.x += Math.cos(angle) * spd * 0.55 * dt + ox * 0.45;
            this.y += Math.sin(angle) * spd * 0.55 * dt + oy * 0.45;
        } else if (this.type === 'swarm') {
            // Zigzag
            const zig = Math.sin(performance.now() / 120 + this.phase) * 0.6;
            this.x += (Math.cos(angle) + Math.cos(angle + Math.PI / 2) * zig) * spd * dt;
            this.y += (Math.sin(angle) + Math.sin(angle + Math.PI / 2) * zig) * spd * dt;
        } else {
            this.x += Math.cos(angle) * spd * dt;
            this.y += Math.sin(angle) * spd * dt;
        }
        this.facing = angle;
        if (this.hitFlash > 0) this.hitFlash -= dt;
    }

    draw(ctx, camera) {
        const cx = this.x - camera.x;
        const cy = this.y - camera.y;
        const t = performance.now() / 1000;
        const pulse = 1 + Math.sin(t * 4 + this.phase) * 0.06;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(pulse, pulse);

        if (this.hitFlash > 0) {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#FFFFFF';
        }

        if (this.type === 'boss' || this.type === 'megaboss') {
            // Multi-ring boss
            ctx.rotate(t * 0.5);
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 22;
            for (let r = 0; r < 3; r++) {
                ctx.strokeStyle = r === 0 ? this.color : this.color2;
                ctx.lineWidth = 3 - r * 0.5;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius - r * 8, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.fillStyle = this.color;
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 + t;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * (this.radius + 6), Math.sin(a) * (this.radius + 6), 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#FFEBEE';
            ctx.beginPath();
            ctx.arc(0, 0, this.type === 'megaboss' ? 14 : 10, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'tank') {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.rect(-this.radius, -this.radius * 0.7, this.radius * 2, this.radius * 1.4);
            ctx.fill();
            ctx.fillStyle = this.color2;
            ctx.fillRect(-this.radius * 0.5, -this.radius * 0.35, this.radius, this.radius * 0.7);
        } else if (this.type === 'elite') {
            ctx.rotate(t * 1.2);
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 18;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = this.color2;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.45, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'splitter' || this.type === 'swarm') {
            ctx.rotate(this.facing || 0);
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2;
                const r = i % 2 === 0 ? this.radius : this.radius * 0.5;
                if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'mutant') {
            // Angular mutant
            ctx.rotate(this.facing || 0);
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.radius + 4, 0);
            ctx.lineTo(-this.radius * 0.6, this.radius);
            ctx.lineTo(-this.radius * 0.2, 0);
            ctx.lineTo(-this.radius * 0.6, -this.radius);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = this.color2;
            ctx.beginPath();
            ctx.arc(2, 0, 5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Drone with wings
            ctx.rotate(this.facing || 0);
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            // Wings
            ctx.fillStyle = this.color2;
            ctx.globalAlpha = this.hitFlash > 0 ? 0.7 : 0.85;
            ctx.beginPath();
            ctx.ellipse(-2, -this.radius * 0.9, this.radius * 0.9, 4, -0.3, 0, Math.PI * 2);
            ctx.ellipse(-2, this.radius * 0.9, this.radius * 0.9, 4, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Body
            ctx.globalAlpha = 1;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eye
            ctx.fillStyle = '#FFE082';
            ctx.beginPath();
            ctx.arc(this.radius * 0.35, 0, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(this.radius * 0.4, 0, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // HP bar
        if (this.hp < this.maxHp) {
            const barW = this.radius * 2.2;
            const barH = 4;
            const bx = cx - barW / 2;
            const by = cy - this.radius - 12;
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(bx, by, barW, barH);
            const pct = Math.max(0, this.hp / this.maxHp);
            ctx.fillStyle = pct > 0.5 ? '#69F0AE' : pct > 0.25 ? '#FFD54F' : '#FF5252';
            ctx.fillRect(bx, by, barW * pct, barH);
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.strokeRect(bx, by, barW, barH);
        }
    }
}

// ══════════════ OBJECT POOLS ══════════════
const enemyPool = [];
const particlePool = [];
const MAX_POOL = 200;

function acquireEnemy(x, y, type) {
    let e = enemyPool.pop();
    if (e) {
        Object.assign(e, new Enemy(x, y, type));
        return e;
    }
    return new Enemy(x, y, type);
}

function releaseEnemy(e) {
    if (enemyPool.length < MAX_POOL) enemyPool.push(e);
}

function spawnBurst(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        let p = particlePool.pop();
        if (p) {
            Object.assign(p, new Particle(x, y, color, 2 + Math.random() * 3));
            particles.push(p);
        } else {
            particles.push(new Particle(x, y, color, 2 + Math.random() * 3));
        }
    }
}

// ══════════════ ESTADO DEL JUEGO ══════════════
let player = new Player();
let weapons = new WeaponManager(player);
let enemies = [];
let projectiles = [];
let gems = [];
let damageNumbers = [];
let particles = [];

let gameTimer = 0;
let totalKills = 0;
let spawnTimer = 0;
let lastFrameTime = 0;
const TARGET_DT = 1000 / 60;

// Sistema de oleadas / combo / builds
let currentWave = 1;
let waveAnnounce = 0;
let waveAnnounceText = '';
let bossesKilled = 0;
let nextBossAt = 90;
let upgradesTaken = 0;
let comboCount = 0;
let maxCombo = 0;
let comboTimer = 0;
let runScore = 0;
let eliteTimer = 0;
const upgradeCounts = {};

const WAVE_TABLE = [
    { at: 0,   name: 'Calentamiento',   types: ['drone'],                    dens: 0.7 },
    { at: 25,  name: 'Enjambre',        types: ['drone', 'swarm'],           dens: 1.0 },
    { at: 50,  name: 'Blindados',       types: ['drone', 'tank', 'swarm'],   dens: 1.1 },
    { at: 80,  name: 'Mutación',        types: ['mutant', 'drone', 'swarm'], dens: 1.2 },
    { at: 120, name: 'Élite hostil',    types: ['elite', 'mutant', 'tank'],  dens: 1.3 },
    { at: 160, name: 'División',        types: ['splitter', 'swarm', 'drone'], dens: 1.35 },
    { at: 210, name: 'Asedio total',    types: ['elite', 'tank', 'mutant', 'swarm'], dens: 1.5 },
    { at: 270, name: 'Caos Prophecy',   types: ['elite', 'splitter', 'tank', 'mutant'], dens: 1.7 },
    { at: 360, name: 'Colapso final',   types: ['elite', 'megaboss', 'tank', 'swarm'], dens: 1.9 }
];

function getWavePhase() {
    let phase = WAVE_TABLE[0];
    for (const w of WAVE_TABLE) {
        if (gameTimer >= w.at) phase = w;
    }
    return phase;
}

function pickEnemyType(phase) {
    const types = phase.types;
    // Bias: más swarms al final
    const r = Math.random();
    if (r < 0.15 && types.includes('swarm')) return 'swarm';
    if (r < 0.25 && types.includes('tank')) return 'tank';
    if (r < 0.12 && types.includes('elite')) return 'elite';
    if (r < 0.18 && types.includes('splitter')) return 'splitter';
    if (r < 0.3 && types.includes('mutant')) return 'mutant';
    return types[Math.floor(Math.random() * types.length)] || 'drone';
}

function difficultyScale() {
    return 1 + gameTimer / 180 + (currentWave - 1) * 0.08;
}

function initGame() {
    player = new Player();
    weapons = new WeaponManager(player);
    enemies = [];
    projectiles = [];
    gems = [];
    damageNumbers = [];
    particles = [];
    gameTimer = 0;
    totalKills = 0;
    spawnTimer = 0;
    currentWave = 1;
    waveAnnounce = 0;
    waveAnnounceText = '';
    bossesKilled = 0;
    nextBossAt = 90;
    upgradesTaken = 0;
    comboCount = 0;
    maxCombo = 0;
    comboTimer = 0;
    runScore = 0;
    eliteTimer = 0;
    for (const k of Object.keys(upgradeCounts)) delete upgradeCounts[k];
    isPaused = false;
    isGameOver = false;
    started = false;
    lastFrameTime = 0;
    modalGameOver.style.display = 'none';
    modalLevelUp.style.display = 'none';
    hudKills.innerText = '0';
    hudTime.innerText = '00:00';
    updateComboHud();
}

function spawnAtEdge(type, scale) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(canvas.width, canvas.height) / 2 + 80 + Math.random() * 60;
    const ex = player.x + Math.cos(angle) * dist;
    const ey = player.y + Math.sin(angle) * dist;
    const e = acquireEnemy(ex, ey, type);
    // Re-apply scale
    if (scale !== 1) {
        Object.assign(e, new Enemy(ex, ey, type, scale));
    }
    enemies.push(e);
    return e;
}

function spawnEnemyWave() {
    spawnTimer++;
    const phase = getWavePhase();
    const waveNum = WAVE_TABLE.findIndex(w => w === phase) + 1;
    if (waveNum > currentWave) {
        currentWave = waveNum;
        waveAnnounce = 120;
        waveAnnounceText = `OLEADA ${currentWave}: ${phase.name}`;
        SoundFX.playUpgrade();
    }

    const dens = phase.dens * difficultyScale();
    const baseRate = Math.max(10, Math.floor(55 / dens));
    const cap = Math.min(90, 28 + currentWave * 4 + Math.floor(gameTimer / 20));

    if (enemies.length < cap && spawnTimer % baseRate === 0) {
        const type = pickEnemyType(phase);
        const batch = type === 'swarm' ? 3 + Math.floor(Math.random() * 3) : 1;
        for (let i = 0; i < batch; i++) {
            spawnAtEdge(type, difficultyScale());
        }
    }

    // Elite pack cada ~45s
    eliteTimer++;
    if (eliteTimer >= 45 * 60 && enemies.length < cap) {
        eliteTimer = 0;
        spawnAtEdge('elite', difficultyScale() * 1.2);
        spawnAtEdge('mutant', difficultyScale());
    }

    // Bosses cíclicos
    if (gameTimer >= nextBossAt) {
        const isMega = bossesKilled >= 2 && bossesKilled % 3 === 2;
        const b = spawnAtEdge(isMega ? 'megaboss' : 'boss', difficultyScale());
        nextBossAt += 85 + bossesKilled * 10;
        waveAnnounce = 150;
        waveAnnounceText = isMega ? '⚠ MEGA-BOSS INCOMING' : '⚠ BOSS INCOMING';
        SoundFX.playUpgrade();
        spawnBurst(b.x, b.y, b.color, 28);
    }
}

function registerKill(e) {
    totalKills++;
    hudKills.innerText = totalKills;

    // Combo
    comboCount++;
    comboTimer = 120; // 2s a 60fps
    if (comboCount > maxCombo) maxCombo = comboCount;
    const comboMul = 1 + Math.min(2, comboCount * 0.05);
    updateComboHud();

    // Score local
    const base = e.type === 'megaboss' ? 5000 : e.type === 'boss' ? 2500 : e.type === 'elite' ? 400 : 100;
    runScore += Math.floor(base * comboMul);

    // Boss tracking
    if (e.type === 'boss' || e.type === 'megaboss') {
        bossesKilled++;
        // Drop XP gordo
        gems.push(new XPGem(e.x, e.y, e.xpVal));
        gems.push(new XPGem(e.x + 20, e.y - 10, Math.floor(e.xpVal * 0.5)));
    }

    // Splitter spawns 2 swarms
    if (e.type === 'splitter') {
        for (let i = 0; i < 2; i++) {
            const child = new Enemy(
                e.x + (Math.random() - 0.5) * 30,
                e.y + (Math.random() - 0.5) * 30,
                'swarm',
                difficultyScale() * 0.7
            );
            enemies.push(child);
        }
    }

    // Lifesteal
    if (player.lifesteal > 0 && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + player.lifesteal);
    }

    const xp = Math.floor(e.xpVal * (1 + Math.min(1, comboCount * 0.02)));
    gems.push(new XPGem(e.x, e.y, xp));
}

function updateComboHud() {
    let el = document.getElementById('hud-combo');
    if (!el) {
        const row = document.querySelector('.hud-stats-row');
        if (row) {
            el = document.createElement('div');
            el.className = 'hud-stat-pill';
            el.id = 'hud-combo-wrap';
            el.innerHTML = `<span>🔥</span><span id="hud-combo">x0</span>`;
            row.insertBefore(el, row.querySelector('.btn-quit-game'));
        }
    }
    const c = document.getElementById('hud-combo');
    if (c) {
        c.innerText = comboCount > 1 ? `x${comboCount}` : '—';
        c.style.color = comboCount >= 20 ? '#FFD700' : comboCount >= 10 ? '#FF9100' : '#fff';
    }
    let w = document.getElementById('hud-wave');
    if (!w) {
        const row = document.querySelector('.hud-stats-row');
        if (row) {
            const pill = document.createElement('div');
            pill.className = 'hud-stat-pill';
            pill.innerHTML = `<span>🌊</span><span id="hud-wave">W1</span>`;
            row.insertBefore(pill, row.querySelector('.btn-quit-game'));
        }
    }
    w = document.getElementById('hud-wave');
    if (w) w.innerText = `W${currentWave}`;
}

// Timer second tick
setInterval(() => {
    if (!isPaused && !isGameOver && started) {
        gameTimer++;
        const mins = String(Math.floor(gameTimer / 60)).padStart(2, '0');
        const secs = String(gameTimer % 60).padStart(2, '0');
        hudTime.innerText = `${mins}:${secs}`;
    }
}, 1000);

function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    // Delta time (capped para evitar saltos al volver de tab en background)
    if (!lastFrameTime) lastFrameTime = timestamp || performance.now();
    const rawDt = (timestamp || performance.now()) - lastFrameTime;
    lastFrameTime = timestamp || performance.now();
    const dt = Math.min(rawDt, 50) / TARGET_DT; // 1.0 = 60fps

    const camera = {
        x: player.x - canvas.width / 2,
        y: player.y - canvas.height / 2
    };

    drawBackground(ctx, camera);

    if (!started) {
        player.draw(ctx, camera);
        drawStartOverlay(ctx);
        return;
    }

    if (isPaused || isGameOver) {
        gems.forEach(g => g.draw(ctx, camera));
        enemies.forEach(e => e.draw(ctx, camera));
        weapons.drawPlasma(ctx, camera);
        projectiles.forEach(p => p.draw(ctx, camera));
        player.draw(ctx, camera);
        particles.forEach(p => p.draw(ctx, camera));
        damageNumbers.forEach(d => d.draw(ctx, camera));
        return;
    }

    // Updates (escalados por delta)
    player.update(dt);
    weapons.update(enemies, projectiles, dt);
    spawnEnemyWave();

    // Combo decay
    if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) {
            comboCount = 0;
            updateComboHud();
        }
    }
    if (waveAnnounce > 0) waveAnnounce -= dt;

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.update(dt, enemies);

        let hit = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
                if (p.isAoE) {
                    enemies.forEach(subE => {
                        if (Math.hypot(subE.x - p.x, subE.y - p.y) < p.aoeRadius) {
                            subE.hp -= p.damage;
                            subE.hitFlash = 6;
                            damageNumbers.push(new DamageNumber(subE.x, subE.y, p.damage, '#FFA000'));
                        }
                    });
                    spawnBurst(p.x, p.y, '#FF9100', 14);
                    hit = true;
                    break;
                } else {
                    e.hp -= p.damage;
                    e.hitFlash = 6;
                    if (p.slow) e.applySlow(1 - p.slow, 90);
                    damageNumbers.push(new DamageNumber(e.x, e.y, p.damage, p.kind === 'frost' ? '#80D8FF' : '#00E5FF'));
                    spawnBurst(p.x, p.y, p.color, 4);
                    p.hits = (p.hits || 0) + 1;
                    if (p.hits > (p.pierce || 0)) {
                        hit = true;
                        break;
                    }
                }
            }
        }
        if (hit) {
            projectiles.splice(i, 1);
            if (window.SoundFX) SoundFX.playTick();
        } else if (p.life <= 0) {
            projectiles.splice(i, 1);
        }
    }

    // Plasma ticks
    weapons.applyPlasmaDamage(enemies);

    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.update(player, dt);

        if (Math.hypot(e.x - player.x, e.y - player.y) < e.radius + player.radius) {
            player.takeDamage(e.damage);
        }

        if (e.hp <= 0) {
            spawnBurst(e.x, e.y, e.color, e.type === 'boss' || e.type === 'megaboss' ? 30 : 10);
            registerKill(e);
            releaseEnemy(enemies.splice(i, 1)[0]);
        }
    }

    for (let i = gems.length - 1; i >= 0; i--) {
        const g = gems[i];
        const dist = Math.hypot(g.x - player.x, g.y - player.y);
        if (dist < player.magnetRadius) {
            const angle = Math.atan2(player.y - g.y, player.x - g.x);
            g.x += Math.cos(angle) * 7;
            g.y += Math.sin(angle) * 7;
        }
        if (dist < player.radius + g.radius) {
            player.addXP(g.value);
            gems.splice(i, 1);
            SoundFX.playCoin();
        }
    }

    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        damageNumbers[i].update();
        if (damageNumbers[i].life <= 0) damageNumbers.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            const dead = particles.splice(i, 1)[0];
            if (particlePool.length < MAX_POOL) particlePool.push(dead);
        }
    }

    // Draw world
    gems.forEach(g => g.draw(ctx, camera));
    enemies.forEach(e => e.draw(ctx, camera));
    weapons.drawPlasma(ctx, camera);
    projectiles.forEach(p => p.draw(ctx, camera));
    player.draw(ctx, camera);
    particles.forEach(p => p.draw(ctx, camera));
    damageNumbers.forEach(d => d.draw(ctx, camera));

    // Wave announce
    if (waveAnnounce > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, waveAnnounce / 40);
        ctx.textAlign = 'center';
        ctx.font = '900 28px Outfit, sans-serif';
        ctx.fillStyle = '#FF5252';
        ctx.shadowColor = 'rgba(255,23,68,0.6)';
        ctx.shadowBlur = 16;
        ctx.fillText(waveAnnounceText, canvas.width / 2, 120);
        ctx.restore();
    }

    // Combo big number
    if (comboCount >= 5) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.textAlign = 'right';
        ctx.font = '900 22px Outfit, sans-serif';
        ctx.fillStyle = comboCount >= 20 ? '#FFD700' : '#FF9100';
        ctx.fillText(`COMBO x${comboCount}`, canvas.width - 24, canvas.height - 48);
        ctx.restore();
    }

    // Vignette
    const vig = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.25,
        canvas.width / 2, canvas.height / 2, canvas.height * 0.75
    );
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(5, 2, 12, 0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // HUD update
    hudLevel.innerText = `LVL ${player.level}`;
    hudXpFill.style.width = `${Math.min(100, (player.xp / player.xpNeeded) * 100)}%`;
    hudHpFill.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
    hudHpText.innerText = `${Math.floor(player.hp)} / ${player.maxHp} HP`;
}

function drawBackground(ctx, camera) {
    // Deep space gradient
    const bg = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.45, 40,
        canvas.width * 0.5, canvas.height * 0.5, Math.max(canvas.width, canvas.height) * 0.7
    );
    bg.addColorStop(0, '#1a0f2e');
    bg.addColorStop(0.45, '#0c0718');
    bg.addColorStop(1, '#05020a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars
    for (const s of stars) {
        const sx = ((s.x - camera.x * s.z) % canvas.width + canvas.width) % canvas.width;
        const sy = ((s.y - camera.y * s.z) % canvas.height + canvas.height) % canvas.height;
        ctx.fillStyle = `rgba(220, 200, 255, ${0.25 + s.z * 0.55})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.s, 0, Math.PI * 2);
        ctx.fill();
    }

    // Neon grid floor
    const gridSize = 72;
    const offsetX = -((camera.x % gridSize) + gridSize) % gridSize;
    const offsetY = -((camera.y % gridSize) + gridSize) % gridSize;

    ctx.save();
    ctx.strokeStyle = 'rgba(155, 92, 255, 0.07)';
    ctx.lineWidth = 1;
    for (let x = offsetX; x < canvas.width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = offsetY; y < canvas.height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Accent lines denser near player
    ctx.strokeStyle = 'rgba(0, 229, 195, 0.05)';
    const midGrid = gridSize * 2;
    const ox2 = -((camera.x % midGrid) + midGrid) % midGrid;
    const oy2 = -((camera.y % midGrid) + midGrid) % midGrid;
    for (let x = ox2; x < canvas.width + midGrid; x += midGrid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = oy2; y < canvas.height + midGrid; y += midGrid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    ctx.restore();
}

function drawStartOverlay(ctx) {
    ctx.fillStyle = 'rgba(5, 2, 12, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 42px Outfit, sans-serif';
    ctx.shadowColor = 'rgba(179, 136, 255, 0.7)';
    ctx.shadowBlur = 20;
    ctx.fillText('PROPHET SURVIVOR', canvas.width / 2, canvas.height / 2 - 40);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(200, 190, 230, 0.85)';
    ctx.font = '600 16px Outfit, sans-serif';
    ctx.fillText('WASD mover · Space/Shift dash · builds con sinergias', canvas.width / 2, canvas.height / 2 + 8);

    const pulse = 0.55 + Math.sin(performance.now() / 400) * 0.45;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#00E5C3';
    ctx.font = '800 18px Outfit, sans-serif';
    ctx.fillText('▸ PRESIONÁ ESPACIO O TOCÁ PARA EMPEZAR', canvas.width / 2, canvas.height / 2 + 52);
    ctx.restore();
}

// ══════════════ LEVEL UP — builds con tags ══════════════
function getUpgradePool() {
    return [
        {
            id: 'plasma', tag: 'plasma', max: 6,
            name: 'Orbe de Plasma +1', desc: 'Más orbes orbitales', icon: '◉',
            apply: () => { weapons.plasmaCount++; weapons.addTag('plasma'); weapons.plasmaDamage += 3; }
        },
        {
            id: 'plasma_rad', tag: 'plasma', max: 4,
            name: 'Órbita expandida', desc: 'Mayor radio de plasma', icon: '◎',
            apply: () => { weapons.plasmaRadius += 18; weapons.addTag('plasma'); }
        },
        {
            id: 'rockets', tag: 'rocket', max: 1,
            name: 'Misiles Rastreadores', desc: 'AoE con homing', icon: '▲',
            apply: () => { weapons.hasRockets = true; weapons.addTag('rocket'); },
            once: true
        },
        {
            id: 'rocket_aoe', tag: 'rocket', max: 3,
            name: 'Warheads +', desc: 'Más radio de explosión', icon: '💥',
            apply: () => { weapons.rocketAoe += 18; weapons.rocketDamage += 20; weapons.addTag('rocket'); },
            req: () => weapons.hasRockets
        },
        {
            id: 'frost', tag: 'frost', max: 1,
            name: 'Rayo Gélido', desc: 'Proyectiles que ralentizan', icon: '❄',
            apply: () => { weapons.hasFrost = true; weapons.addTag('frost'); },
            once: true
        },
        {
            id: 'drones', tag: 'laser', max: 1,
            name: 'Drones Homing', desc: 'Drones que persiguen enemigos', icon: '🛸',
            apply: () => { weapons.hasDrones = true; weapons.addTag('laser'); },
            once: true
        },
        {
            id: 'aura', tag: 'utility', max: 1,
            name: 'Aura de Pulso', desc: 'Daño de área pasivo', icon: '🌀',
            apply: () => { weapons.hasAura = true; weapons.addTag('utility'); },
            once: true
        },
        {
            id: 'multishot', tag: 'laser', max: 3,
            name: 'Multishot Láser', desc: '+1 haz láser', icon: '✧',
            apply: () => { weapons.laserMultishot++; weapons.addTag('laser'); }
        },
        {
            id: 'pierce', tag: 'laser', max: 3,
            name: 'Perforación', desc: 'Láseres atraviesan enemigos', icon: '→',
            apply: () => { weapons.laserPierce++; weapons.laserDamage += 8; weapons.addTag('laser'); }
        },
        {
            id: 'damage', tag: 'body', max: 8,
            name: 'Daño Global +20%', desc: 'Más daño en todo', icon: '◆',
            apply: () => { player.damageMultiplier += 0.20; weapons.addTag('body'); }
        },
        {
            id: 'cooldown', tag: 'utility', max: 5,
            name: 'Cadencia +18%', desc: 'Disparás más rápido', icon: '⚡',
            apply: () => { player.cooldownMultiplier *= 0.82; weapons.addTag('utility'); }
        },
        {
            id: 'magnet', tag: 'utility', max: 4,
            name: 'Imán de Gemas', desc: 'Atrae XP desde más lejos', icon: '🧲',
            apply: () => { player.magnetRadius += 45; weapons.addTag('utility'); }
        },
        {
            id: 'speed', tag: 'body', max: 5,
            name: 'Propulsión +', desc: 'Movimiento más ágil', icon: '»',
            apply: () => { player.speed += 0.55; weapons.addTag('body'); }
        },
        {
            id: 'maxhp', tag: 'body', max: 6,
            name: 'Casco Reforzado', desc: '+40 HP y cura', icon: '♥',
            apply: () => { player.maxHp += 40; player.hp += 40; weapons.addTag('body'); }
        },
        {
            id: 'armor', tag: 'body', max: 4,
            name: 'Blindaje', desc: '−12% daño recibido', icon: '🛡',
            apply: () => { player.armor = Math.min(0.55, player.armor + 0.12); weapons.addTag('body'); }
        },
        {
            id: 'lifesteal', tag: 'body', max: 3,
            name: 'Drenaje', desc: 'Curás al matar', icon: '🩸',
            apply: () => { player.lifesteal += 2; weapons.addTag('body'); }
        },
        {
            id: 'regen', tag: 'utility', max: 3,
            name: 'Nano-regen', desc: 'Regeneración pasiva', icon: '💚',
            apply: () => { player.regen += 0.15; weapons.addTag('utility'); }
        },
        {
            id: 'xpboost', tag: 'utility', max: 3,
            name: 'Scanner XP', desc: '+15% experiencia', icon: '📡',
            apply: () => { player.xpBonus += 0.15; weapons.addTag('utility'); }
        }
    ];
}

function showLevelUpModal() {
    isPaused = true;
    upgradeCardsContainer.innerHTML = '';
    const pool = getUpgradePool().filter(u => {
        const cnt = upgradeCounts[u.id] || 0;
        if (u.max && cnt >= u.max) return false;
        if (u.once && cnt >= 1) return false;
        if (u.req && !u.req()) return false;
        return true;
    });

    // Weighted: prefer weapons you already invested in (build focus) 60%, random 40%
    const picks = [];
    const used = new Set();
    while (picks.length < 3 && used.size < pool.length) {
        let choice;
        if (Math.random() < 0.45 && Object.keys(weapons.tags).length) {
            const tags = Object.keys(weapons.tags);
            const tag = tags[Math.floor(Math.random() * tags.length)];
            const focused = pool.filter(u => u.tag === tag && !used.has(u.id));
            choice = focused.length ? focused[Math.floor(Math.random() * focused.length)]
                : pool[Math.floor(Math.random() * pool.length)];
        } else {
            choice = pool[Math.floor(Math.random() * pool.length)];
        }
        if (choice && !used.has(choice.id)) {
            used.add(choice.id);
            picks.push(choice);
        }
    }

    picks.forEach(upg => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        const lvl = (upgradeCounts[upg.id] || 0) + 1;
        const syn = weapons.getSynergies().map(s => s.label).slice(0, 2).join(' · ');
        card.innerHTML = `
            <div class="upgrade-icon">${upg.icon}</div>
            <div class="upgrade-name">${upg.name}</div>
            <div class="upgrade-desc">${upg.desc}${lvl > 1 ? ` · Nv.${lvl}` : ''}</div>
            <div class="upgrade-desc" style="opacity:.6;font-size:11px;margin-top:4px">${upg.tag}${syn ? ' · ' + syn : ''}</div>
        `;
        card.addEventListener('click', () => {
            upg.apply();
            upgradeCounts[upg.id] = (upgradeCounts[upg.id] || 0) + 1;
            upgradesTaken++;
            SoundFX.playUpgrade();
            modalLevelUp.style.display = 'none';
            isPaused = false;
        });
        upgradeCardsContainer.appendChild(card);
    });
    modalLevelUp.style.display = 'flex';
}

function triggerGameOver() {
    isGameOver = true;
    SoundFX.playLose();
    spawnBurst(player.x, player.y, '#FF5252', 40);

    const mins = String(Math.floor(gameTimer / 60)).padStart(2, '0');
    const secs = String(gameTimer % 60).padStart(2, '0');
    goTime.innerText = `${mins}:${secs}`;
    goKills.innerText = totalKills;
    goLevel.innerText = player.level;
    const finalScore =
        (totalKills * 100) +
        (gameTimer * 50) +
        (player.level * 500) +
        (currentWave * 800) +
        (bossesKilled * 5000) +
        (maxCombo * 200) +
        (upgradesTaken * 150);
    goScore.innerText = formatNumber(finalScore);
    modalGameOver.style.display = 'flex';

    // Extra stats en UI si existen
    const goExtra = document.getElementById('go-extra');
    if (goExtra) {
        goExtra.innerText = `Oleada ${currentWave} · ${bossesKilled} bosses · combo máx x${maxCombo}`;
    }

    if (window.prophetClient) {
        window.prophetClient.send({
            type: 'survivor:game_over',
            kills: totalKills,
            seconds: gameTimer,
            level: player.level,
            wave: currentWave,
            bosses: bossesKilled,
            maxCombo,
            upgrades: upgradesTaken
        });
    }
}

btnReplay.addEventListener('click', () => {
    initGame();
    started = true;
});

btnShowLb.addEventListener('click', () => {
    window.prophetClient.send({ type: 'survivor:get_leaderboard' });
});

btnCloseLb.addEventListener('click', () => {
    modalLeaderboard.style.display = 'none';
});

window.initSurvivorEvents = () => {
    window.prophetClient.on('survivor:game_over_result', (data) => {
        if (data.success) {
            goCoins.innerText = `+${formatNumber(data.coinsEarned)} monedas`;
            document.getElementById('hud-coins').innerText = formatNumber(data.newBalance);
            SoundFX.playWin();
        }
    });

    window.prophetClient.on('survivor:leaderboard', (data) => {
        lbTableBody.innerHTML = '';
        (data.leaderboard || []).forEach((row, idx) => {
            const div = document.createElement('div');
            div.className = 'lb-row';
            div.innerHTML = `
                <span>#${idx + 1} ${row.username}</span>
                <span>${row.max_kills} kills · ${row.max_time}s</span>
                <span style="color: var(--color-gold); font-weight: 900;">${formatNumber(row.high_score)} pts</span>
            `;
            lbTableBody.appendChild(div);
        });
        modalLeaderboard.style.display = 'flex';
    });
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authData = await window.prophetClient.connect();
        if (authData) {
            myUserId = authData.userId;
            myBalance = authData.balance;
            document.getElementById('hud-coins').innerText = formatNumber(authData.balance);
        }
    } catch (_) { /* demo */ }

    window.initSurvivorEvents();
    initGame();
    requestAnimationFrame(gameLoop);
});
