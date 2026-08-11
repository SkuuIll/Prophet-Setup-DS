/**
 * ════ PROPHET SURVIVOR — MOTOR PRINCIPAL (CANVAS 2D) ════
 */

const canvas = document.getElementById('survivor-canvas');
const ctx = canvas.getContext('2d');

// HUD Elements
const hudLevel = document.getElementById('hud-level');
const hudXpFill = document.getElementById('hud-xp-fill');
const hudTime = document.getElementById('hud-time');
const hudKills = document.getElementById('hud-kills');
const hudCoins = document.getElementById('hud-coins');
const hudHpFill = document.getElementById('hud-hp-fill');
const hudHpText = document.getElementById('hud-hp-text');

// Modales
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

// Joystick
const joystickZone = document.getElementById('joystick-zone');
const joystickStick = document.getElementById('joystick-stick');

let myUserId = null;
let myBalance = 0;
let isPaused = false;
let isGameOver = false;

// Configuración de Pantalla
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Teclado
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

// Joystick Touch
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
    if (!touchInput.active && e.type === 'pointerdown') touchInput.active = true;
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
        this.invulnerableFrames = 0;
    }

    update() {
        // Movimiento por Teclado
        let vx = 0;
        let vy = 0;
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
            this.x += (vx / len) * this.speed;
            this.y += (vy / len) * this.speed;
        }

        if (this.invulnerableFrames > 0) this.invulnerableFrames--;
    }

    takeDamage(amount) {
        if (this.invulnerableFrames > 0) return;
        this.hp -= amount;
        this.invulnerableFrames = 25; // Medio segundo de invulnerabilidad
        SoundFX.playClick();

        if (this.hp <= 0) {
            this.hp = 0;
            triggerGameOver();
        }
    }

    addXP(amount) {
        this.xp += amount;
        if (this.xp >= this.xpNeeded) {
            this.levelUp();
        }
    }

    levelUp() {
        this.xp -= this.xpNeeded;
        this.level++;
        this.xpNeeded = Math.floor(this.xpNeeded * 1.35);
        this.hp = Math.min(this.maxHp, this.hp + 25); // Cura al subir nivel
        SoundFX.playUpgrade();
        showLevelUpModal();
    }

    draw(ctx, camera) {
        const cx = this.x - camera.x;
        const cy = this.y - camera.y;

        ctx.save();
        if (this.invulnerableFrames % 4 > 1) {
            ctx.globalAlpha = 0.5;
        }

        // Aura
        ctx.fillStyle = 'rgba(187, 134, 252, 0.2)';
        ctx.beginPath();
        ctx.arc(cx, cy, this.radius + 6, 0, Math.PI * 2);
        ctx.fill();

        // Cuerpo Héroe
        ctx.fillStyle = '#00BFA5';
        ctx.shadowColor = '#00BFA5';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Núcleo
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ══════════════ CLASE ENEMIGO ══════════════
class Enemy {
    constructor(x, y, type = 'drone') {
        this.x = x;
        this.y = y;
        this.type = type;

        if (type === 'boss') {
            this.radius = 32;
            this.hp = 1200;
            this.maxHp = 1200;
            this.speed = 1.2;
            this.damage = 30;
            this.xpVal = 100;
            this.color = '#D50000';
        } else if (type === 'mutant') {
            this.radius = 18;
            this.hp = 90;
            this.maxHp = 90;
            this.speed = 1.8;
            this.damage = 15;
            this.xpVal = 25;
            this.color = '#FFA000';
        } else {
            // Drone estándar
            this.radius = 12;
            this.hp = 35;
            this.maxHp = 35;
            this.speed = 2.4;
            this.damage = 8;
            this.xpVal = 10;
            this.color = '#FF1744';
        }
    }

    update(player) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
    }

    draw(ctx, camera) {
        const cx = this.x - camera.x;
        const cy = this.y - camera.y;

        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Barra de Vida
        if (this.hp < this.maxHp) {
            const barW = this.radius * 2;
            const barH = 4;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(cx - this.radius, cy - this.radius - 8, barW, barH);
            ctx.fillStyle = '#39FF14';
            ctx.fillRect(cx - this.radius, cy - this.radius - 8, (this.hp / this.maxHp) * barW, barH);
        }

        ctx.restore();
    }
}

// ══════════════ ESTADO DEL JUEGO ══════════════
let player = new Player();
let weapons = new WeaponManager(player);
let enemies = [];
let projectiles = [];
let gems = [];
let damageNumbers = [];

let gameTimer = 0;
let totalKills = 0;
let spawnTimer = 0;
let bossSpawned = false;

function initGame() {
    player = new Player();
    weapons = new WeaponManager(player);
    enemies = [];
    projectiles = [];
    gems = [];
    damageNumbers = [];
    gameTimer = 0;
    totalKills = 0;
    spawnTimer = 0;
    bossSpawned = false;
    isPaused = false;
    isGameOver = false;

    modalGameOver.style.display = 'none';
    modalLevelUp.style.display = 'none';
}

// ══════════════ SPAWN DE ENEMIGOS ══════════════
function spawnEnemyWave() {
    spawnTimer++;
    // Frecuencia de aparición aumenta con el tiempo
    const spawnRate = Math.max(20, 70 - Math.floor(gameTimer / 10));

    if (spawnTimer % spawnRate === 0) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.max(canvas.width, canvas.height) / 2 + 100;
        const ex = player.x + Math.cos(angle) * dist;
        const ey = player.y + Math.sin(angle) * dist;

        const isMutant = Math.random() < 0.25 + (gameTimer / 300);
        enemies.push(new Enemy(ex, ey, isMutant ? 'mutant' : 'drone'));
    }

    // Spawn de Jefe a los 2 minutos (120s)
    if (gameTimer >= 120 && !bossSpawned) {
        bossSpawned = true;
        enemies.push(new Enemy(player.x + 400, player.y + 400, 'boss'));
        SoundFX.playUpgrade();
    }
}

// ══════════════ BUCLE PRINCIPAL (60 FPS) ══════════════
let lastTimestamp = performance.now();
setInterval(() => {
    if (!isPaused && !isGameOver) {
        gameTimer++;
        const mins = String(Math.floor(gameTimer / 60)).padStart(2, '0');
        const secs = String(gameTimer % 60).padStart(2, '0');
        hudTime.innerText = `${mins}:${secs}`;
    }
}, 1000);

function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    if (isPaused || isGameOver) return;

    // 1. Updates
    player.update();
    weapons.update(enemies, projectiles);
    spawnEnemyWave();

    // Actualizar Proyectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.update();

        // Impacto con Enemigos
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            const dist = Math.hypot(p.x - e.x, p.y - e.y);

            if (dist < p.radius + e.radius) {
                if (p.isAoE) {
                    // Explosión AoE
                    enemies.forEach(subE => {
                        if (Math.hypot(subE.x - p.x, subE.y - p.y) < p.aoeRadius) {
                            subE.hp -= p.damage;
                            damageNumbers.push(new DamageNumber(subE.x, subE.y, p.damage, '#FFA000'));
                        }
                    });
                } else {
                    e.hp -= p.damage;
                    damageNumbers.push(new DamageNumber(e.x, e.y, p.damage, '#00E5FF'));
                }

                projectiles.splice(i, 1);
                SoundFX.playClick();
                break;
            }
        }

        if (p.life <= 0) projectiles.splice(i, 1);
    }

    // Impacto de Orbes de Plasma con Enemigos
    const plasmaOrbs = weapons.getPlasmaPositions();
    plasmaOrbs.forEach(orb => {
        enemies.forEach(e => {
            if (Math.hypot(orb.x - e.x, orb.y - e.y) < orb.radius + e.radius) {
                e.hp -= 2; // Daño continuo por contacto
                damageNumbers.push(new DamageNumber(e.x, e.y, orb.damage, '#BB86FC'));
            }
        });
    });

    // Actualizar Enemigos
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.update(player);

        // Daño al Jugador
        if (Math.hypot(e.x - player.x, e.y - player.y) < e.radius + player.radius) {
            player.takeDamage(e.damage);
        }

        // Enemigo Muerto
        if (e.hp <= 0) {
            gems.push(new XPGem(e.x, e.y, e.xpVal));
            enemies.splice(i, 1);
            totalKills++;
            hudKills.innerText = totalKills;
        }
    }

    // Gemas de XP e Imán
    for (let i = gems.length - 1; i >= 0; i--) {
        const g = gems[i];
        const dist = Math.hypot(g.x - player.x, g.y - player.y);

        if (dist < player.magnetRadius) {
            // Succión magnética
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

    // Floating Damage Numbers
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const d = damageNumbers[i];
        d.update();
        if (d.life <= 0) damageNumbers.splice(i, 1);
    }

    // 2. Render Canvas
    const camera = {
        x: player.x - canvas.width / 2,
        y: player.y - canvas.height / 2
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo Grid Futurista
    drawGrid(ctx, camera);

    // Dibujar Gemas
    gems.forEach(g => g.draw(ctx, camera));

    // Dibujar Enemigos
    enemies.forEach(e => e.draw(ctx, camera));

    // Dibujar Proyectiles y Plasma
    weapons.drawPlasma(ctx, camera);
    projectiles.forEach(p => p.draw(ctx, camera));

    // Dibujar Jugador
    player.draw(ctx, camera);

    // Dibujar Números de Daño
    damageNumbers.forEach(d => d.draw(ctx, camera));

    // 3. Update HUD
    hudLevel.innerText = `LVL ${player.level}`;
    hudXpFill.style.width = `${Math.min(100, (player.xp / player.xpNeeded) * 100)}%`;
    hudHpFill.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
    hudHpText.innerText = `${Math.floor(player.hp)} / ${player.maxHp} HP`;
}

function drawGrid(ctx, camera) {
    const gridSize = 64;
    const startX = -((camera.x % gridSize) + gridSize);
    const startY = -((camera.y % gridSize) + gridSize);

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    for (let x = startX; x < canvas.width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = startY; y < canvas.height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    ctx.restore();
}

// ══════════════ LEVEL UP CARDS ══════════════
const UPGRADE_POOL = [
    { id: 'plasma', name: 'Orbe de Plasma +1', desc: 'Añade una bola orbital giratoria adicional', icon: '🔮', apply: () => weapons.plasmaCount++ },
    { id: 'rockets', name: 'Misiles Rastreadores', desc: 'Lanza proyectiles AoE explosivos a distancia', icon: '🚀', apply: () => weapons.hasRockets = true },
    { id: 'damage', name: 'Daño Global +25%', desc: 'Incrementa el daño de todas tus armas', icon: '🔺', apply: () => player.damageMultiplier += 0.25 },
    { id: 'cooldown', name: 'Cadencia de Ataque +20%', desc: 'Tus armas disparan mucho más rápido', icon: '⚡', apply: () => player.cooldownMultiplier *= 0.8 },
    { id: 'magnet', name: 'Imán de Gemas +50%', desc: 'Atrae gemas de XP desde mucho más lejos', icon: '🧲', apply: () => player.magnetRadius += 50 },
    { id: 'speed', name: 'Velocidad +15%', desc: 'Aumenta tu velocidad de movimiento', icon: '👟', apply: () => player.speed += 0.6 },
    { id: 'maxhp', name: 'Vida Máxima +50', desc: 'Aumenta la salud y cura al instante', icon: '🩸', apply: () => { player.maxHp += 50; player.hp += 50; } }
];

function showLevelUpModal() {
    isPaused = true;
    upgradeCardsContainer.innerHTML = '';

    const shuffled = [...UPGRADE_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);
    shuffled.forEach(upg => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `
            <div class="upgrade-icon">${upg.icon}</div>
            <div class="upgrade-name">${upg.name}</div>
            <div class="upgrade-desc">${upg.desc}</div>
        `;
        card.addEventListener('click', () => {
            upg.apply();
            SoundFX.playUpgrade();
            modalLevelUp.style.display = 'none';
            isPaused = false;
        });
        upgradeCardsContainer.appendChild(card);
    });

    modalLevelUp.style.display = 'flex';
}

// ══════════════ GAME OVER & PREMIOS ══════════════
function triggerGameOver() {
    isGameOver = true;
    SoundFX.playClick();

    const mins = String(Math.floor(gameTimer / 60)).padStart(2, '0');
    const secs = String(gameTimer % 60).padStart(2, '0');

    goTime.innerText = `${mins}:${secs}`;
    goKills.innerText = totalKills;
    goLevel.innerText = player.level;
    const finalScore = (totalKills * 100) + (gameTimer * 50) + (player.level * 500);
    goScore.innerText = formatNumber(finalScore);

    modalGameOver.style.display = 'flex';

    // Enviar resultado al servidor para registrar récord y acreditar monedas
    window.prophetClient.send({
        type: 'survivor:game_over',
        kills: totalKills,
        seconds: gameTimer,
        level: player.level
    });
}

btnReplay.addEventListener('click', () => {
    initGame();
});

btnShowLb.addEventListener('click', () => {
    window.prophetClient.send({ type: 'survivor:get_leaderboard' });
});

btnCloseLb.addEventListener('click', () => {
    modalLeaderboard.style.display = 'none';
});

// ══════════════ EVENTOS WEBSOCKET ══════════════
window.initSurvivorEvents = () => {
    window.prophetClient.on('survivor:game_over_result', (data) => {
        if (data.success) {
            goCoins.innerText = `+🪙 ${formatNumber(data.coinsEarned)}`;
            document.getElementById('hud-coins').innerText = formatNumber(data.newBalance);
            SoundFX.playUpgrade();
        }
    });

    window.prophetClient.on('survivor:leaderboard', (data) => {
        lbTableBody.innerHTML = '';
        (data.leaderboard || []).forEach((row, idx) => {
            const div = document.createElement('div');
            div.className = 'lb-row';
            div.innerHTML = `
                <span>#${idx + 1} ${row.username}</span>
                <span>💀 ${row.max_kills} | ⏱️ ${row.max_time}s</span>
                <span style="color: var(--color-gold); font-weight: 900;">${formatNumber(row.high_score)} pts</span>
            `;
            lbTableBody.appendChild(div);
        });
        modalLeaderboard.style.display = 'flex';
    });
};

// Iniciar Juego
document.addEventListener('DOMContentLoaded', async () => {
    const authData = await window.prophetClient.connect();
    if (authData) {
        myUserId = authData.userId;
        myBalance = authData.balance;
        document.getElementById('hud-coins').innerText = formatNumber(authData.balance);
    }

    window.initSurvivorEvents();
    initGame();
    requestAnimationFrame(gameLoop);
});
