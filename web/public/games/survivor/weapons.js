/**
 * ════ PROPHET SURVIVOR — ARMAS, PROYECTILES, GEMAS, PARTÍCULAS v3 ════
 */

class XPGem {
    constructor(x, y, value = 10) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.radius = value >= 80 ? 11 : value >= 40 ? 8 : value >= 20 ? 6 : 5;
        this.color = value >= 80 ? '#FFD700' : value >= 40 ? '#FF6D00' : (value >= 20 ? '#76FF03' : '#18FFFF');
        this.phase = Math.random() * Math.PI * 2;
    }

    draw(ctx, camera) {
        const cx = this.x - camera.x;
        const cy = this.y - camera.y + Math.sin(performance.now() / 300 + this.phase) * 3;
        const r = this.radius;
        const t = performance.now() / 1000;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t + this.phase);
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.7, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.45);
        ctx.lineTo(r * 0.3, 0);
        ctx.lineTo(0, r * 0.2);
        ctx.lineTo(-r * 0.15, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, vx, vy, damage, radius = 4, color = '#00E5FF', opts = {}) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.radius = radius;
        this.color = color;
        this.isAoE = !!opts.isAoE;
        this.aoeRadius = opts.aoeRadius || 0;
        this.pierce = opts.pierce || 0;
        this.homing = opts.homing || 0;
        this.slow = opts.slow || 0;
        this.life = opts.life || 120;
        this.hits = 0;
        this.trail = [];
        this.kind = opts.kind || 'bolt';
    }

    update(dt = 1, enemies = []) {
        if (this.homing > 0 && enemies.length) {
            let nearest = null;
            let minD = 350;
            for (const e of enemies) {
                const d = Math.hypot(e.x - this.x, e.y - this.y);
                if (d < minD) { minD = d; nearest = e; }
            }
            if (nearest) {
                const desired = Math.atan2(nearest.y - this.y, nearest.x - this.x);
                const cur = Math.atan2(this.vy, this.vx);
                let diff = desired - cur;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                const turn = Math.max(-0.12 * this.homing, Math.min(0.12 * this.homing, diff));
                const speed = Math.hypot(this.vx, this.vy) || 10;
                const na = cur + turn;
                this.vx = Math.cos(na) * speed;
                this.vy = Math.sin(na) * speed;
            }
        }

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 8) this.trail.shift();
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
    }

    draw(ctx, camera) {
        for (let i = 0; i < this.trail.length; i++) {
            const p = this.trail[i];
            const alpha = (i / this.trail.length) * 0.45;
            const r = this.radius * (i / this.trail.length) * 0.9;
            ctx.beginPath();
            ctx.fillStyle = hexToRgba(this.color, alpha);
            ctx.arc(p.x - camera.x, p.y - camera.y, Math.max(1, r), 0, Math.PI * 2);
            ctx.fill();
        }

        const cx = this.x - camera.x;
        const cy = this.y - camera.y;
        const angle = Math.atan2(this.vy, this.vx);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;

        if (this.isAoE || this.kind === 'rocket') {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(-6, -5);
            ctx.lineTo(-4, 0);
            ctx.lineTo(-6, 5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#FFEB3B';
            ctx.beginPath();
            ctx.moveTo(-4, 0);
            ctx.lineTo(-12, -3);
            ctx.lineTo(-10, 0);
            ctx.lineTo(-12, 3);
            ctx.closePath();
            ctx.fill();
        } else if (this.kind === 'frost') {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(8, 0);
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                ctx.lineTo(Math.cos(a) * 5, Math.sin(a) * 5);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            const grad = ctx.createLinearGradient(-8, 0, 10, 0);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.4, this.color);
            grad.addColorStop(1, '#FFFFFF');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, 0, 10, this.radius, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

class DamageNumber {
    constructor(x, y, text, color = '#FFFFFF') {
        this.x = x + (Math.random() - 0.5) * 16;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 45;
        this.vy = -1.4;
        this.scale = 1 + Math.min(1, Number(text) / 80);
    }

    update() {
        this.y += this.vy;
        this.vy *= 0.97;
        this.life--;
    }

    draw(ctx, camera) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.min(1, this.life / 20);
        ctx.fillStyle = this.color;
        ctx.font = `900 ${Math.floor(12 * this.scale)}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.fillText(String(this.text), this.x - camera.x, this.y - camera.y);
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color, size = 3) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.life = 20 + Math.random() * 20;
        this.maxLife = this.life;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.94;
        this.vy *= 0.94;
        this.life--;
    }

    draw(ctx, camera) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.size * (this.life / this.maxLife), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string') return `rgba(255,255,255,${alpha})`;
    if (hex.startsWith('rgb')) return hex;
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    if (full.length !== 6) return `rgba(255,255,255,${alpha})`;
    const n = parseInt(full, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * WeaponManager v3 — builds con tags, niveles y sinérgias
 * Tags: plasma | laser | rocket | frost | utility | body
 */
class WeaponManager {
    constructor(player) {
        this.player = player;

        // Plasma orbs
        this.plasmaCount = 1;
        this.plasmaAngle = 0;
        this.plasmaRadius = 70;
        this.plasmaDamage = 18;
        this.plasmaTick = new WeakMap(); // enemy -> last tick time

        // Laser
        this.laserCooldown = 0;
        this.laserRate = 32;
        this.laserDamage = 32;
        this.laserPierce = 0;
        this.laserMultishot = 1;

        // Rockets
        this.rocketCooldown = 0;
        this.rocketRate = 95;
        this.rocketDamage = 75;
        this.hasRockets = false;
        this.rocketAoe = 55;

        // Frost bolts
        this.hasFrost = false;
        this.frostCooldown = 0;
        this.frostRate = 55;
        this.frostDamage = 22;

        // Homing drones
        this.hasDrones = false;
        this.droneCooldown = 0;
        this.droneRate = 70;
        this.droneDamage = 28;

        // Aura pulse
        this.hasAura = false;
        this.auraRadius = 90;
        this.auraDamage = 4;
        this.auraPulse = 0;

        // Build tracking
        this.owned = { plasma: 1 };
        this.tags = { plasma: 1 };
        this.levels = {};
    }

    addTag(tag, n = 1) {
        this.tags[tag] = (this.tags[tag] || 0) + n;
    }

    /** Sinergias activas del build */
    getSynergies() {
        const s = [];
        if ((this.tags.plasma || 0) >= 3) s.push({ id: 'plasma_storm', label: 'Tormenta de Plasma', mult: 1.15 });
        if ((this.tags.laser || 0) >= 3) s.push({ id: 'overclock', label: 'Overclock Láser', mult: 1.12 });
        if ((this.tags.rocket || 0) >= 2 && (this.tags.laser || 0) >= 1) s.push({ id: 'artillery', label: 'Artillería', mult: 1.18 });
        if ((this.tags.frost || 0) >= 2) s.push({ id: 'permafrost', label: 'Permafrost', mult: 1.1 });
        if ((this.tags.utility || 0) >= 3) s.push({ id: 'engineer', label: 'Ingeniero', mult: 1.08 });
        if (Object.keys(this.tags).length >= 4) s.push({ id: 'polybuild', label: 'Poly-build', mult: 1.1 });
        return s;
    }

    damageMult() {
        let m = this.player.damageMultiplier || 1;
        for (const s of this.getSynergies()) m *= s.mult;
        return m;
    }

    update(enemies, projectiles, dt = 1) {
        this.plasmaAngle += 0.05 * dt;
        const dmgM = this.damageMult();

        // Laser
        this.laserCooldown -= dt;
        if (this.laserCooldown <= 0 && enemies.length > 0) {
            this.laserCooldown = Math.max(8, Math.floor(this.laserRate * this.player.cooldownMultiplier));
            const target = this.getNearestEnemy(enemies);
            if (target) {
                const baseAngle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
                const shots = this.laserMultishot;
                for (let i = 0; i < shots; i++) {
                    const spread = shots === 1 ? 0 : (i - (shots - 1) / 2) * 0.12;
                    const angle = baseAngle + spread;
                    const speed = 13;
                    projectiles.push(new Projectile(
                        this.player.x, this.player.y,
                        Math.cos(angle) * speed, Math.sin(angle) * speed,
                        Math.floor(this.laserDamage * dmgM),
                        4, '#00E5FF',
                        { pierce: this.laserPierce, kind: 'bolt' }
                    ));
                }
            }
        }

        // Rockets
        if (this.hasRockets) {
            this.rocketCooldown -= dt;
            if (this.rocketCooldown <= 0 && enemies.length > 0) {
                this.rocketCooldown = Math.max(22, Math.floor(this.rocketRate * this.player.cooldownMultiplier));
                const target = this.getNearestEnemy(enemies);
                if (target) {
                    const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
                    projectiles.push(new Projectile(
                        this.player.x, this.player.y,
                        Math.cos(angle) * 7.5, Math.sin(angle) * 7.5,
                        Math.floor(this.rocketDamage * dmgM),
                        7, '#FF9100',
                        { isAoE: true, aoeRadius: this.rocketAoe, homing: 1.2, kind: 'rocket' }
                    ));
                }
            }
        }

        // Frost
        if (this.hasFrost) {
            this.frostCooldown -= dt;
            if (this.frostCooldown <= 0 && enemies.length > 0) {
                this.frostCooldown = Math.max(15, Math.floor(this.frostRate * this.player.cooldownMultiplier));
                const target = this.getNearestEnemy(enemies);
                if (target) {
                    const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
                    projectiles.push(new Projectile(
                        this.player.x, this.player.y,
                        Math.cos(angle) * 10, Math.sin(angle) * 10,
                        Math.floor(this.frostDamage * dmgM),
                        5, '#80D8FF',
                        { slow: 0.45, kind: 'frost', life: 90 }
                    ));
                }
            }
        }

        // Homing drones
        if (this.hasDrones) {
            this.droneCooldown -= dt;
            if (this.droneCooldown <= 0 && enemies.length > 0) {
                this.droneCooldown = Math.max(18, Math.floor(this.droneRate * this.player.cooldownMultiplier));
                const angle = Math.random() * Math.PI * 2;
                projectiles.push(new Projectile(
                    this.player.x, this.player.y,
                    Math.cos(angle) * 6, Math.sin(angle) * 6,
                    Math.floor(this.droneDamage * dmgM),
                    5, '#B388FF',
                    { homing: 2.2, pierce: 1, kind: 'bolt', life: 140 }
                ));
            }
        }

        // Aura pulse
        if (this.hasAura) {
            this.auraPulse -= dt;
            if (this.auraPulse <= 0) {
                this.auraPulse = 12;
                for (const e of enemies) {
                    if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < this.auraRadius + e.radius) {
                        e.hp -= Math.floor(this.auraDamage * dmgM);
                        e.hitFlash = 3;
                    }
                }
            }
        }
    }

    /** Daño de orbes de plasma con tick rate por enemigo */
    applyPlasmaDamage(enemies, now = performance.now()) {
        const orbs = this.getPlasmaPositions();
        const dmgM = this.damageMult();
        const tickMs = 180;
        let hits = 0;
        for (const orb of orbs) {
            for (const e of enemies) {
                if (Math.hypot(orb.x - e.x, orb.y - e.y) < orb.radius + e.radius) {
                    const last = this.plasmaTick.get(e) || 0;
                    if (now - last >= tickMs) {
                        this.plasmaTick.set(e, now);
                        const dmg = Math.floor(this.plasmaDamage * dmgM);
                        e.hp -= dmg;
                        e.hitFlash = 4;
                        hits++;
                    }
                }
            }
        }
        return hits;
    }

    drawPlasma(ctx, camera) {
        // Aura ring
        if (this.hasAura) {
            const cx = this.player.x - camera.x;
            const cy = this.player.y - camera.y;
            const pulse = 0.15 + Math.sin(performance.now() / 200) * 0.08;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 229, 195, ${pulse})`;
            ctx.lineWidth = 2;
            ctx.arc(cx, cy, this.auraRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        for (let i = 0; i < this.plasmaCount; i++) {
            const angle = this.plasmaAngle + (i * (Math.PI * 2 / this.plasmaCount));
            const px = this.player.x + Math.cos(angle) * this.plasmaRadius;
            const py = this.player.y + Math.sin(angle) * this.plasmaRadius;
            const cx = px - camera.x;
            const cy = py - camera.y;
            const pulse = 7 + Math.sin(performance.now() / 120 + i) * 1.5;

            ctx.save();
            if (i === 0) {
                ctx.strokeStyle = 'rgba(179, 136, 255, 0.12)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(this.player.x - camera.x, this.player.y - camera.y, this.plasmaRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            const grad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, pulse + 4);
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(0.35, '#E040FB');
            grad.addColorStop(1, 'rgba(124, 77, 255, 0)');
            ctx.fillStyle = grad;
            ctx.shadowColor = '#BB86FC';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    getPlasmaPositions() {
        const positions = [];
        for (let i = 0; i < this.plasmaCount; i++) {
            const angle = this.plasmaAngle + (i * (Math.PI * 2 / this.plasmaCount));
            positions.push({
                x: this.player.x + Math.cos(angle) * this.plasmaRadius,
                y: this.player.y + Math.sin(angle) * this.plasmaRadius,
                radius: 10,
                damage: Math.floor(this.plasmaDamage * this.damageMult())
            });
        }
        return positions;
    }

    getNearestEnemy(enemies) {
        let nearest = null;
        let minDist = 650;
        for (const e of enemies) {
            const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = e;
            }
        }
        return nearest;
    }
}

window.XPGem = XPGem;
window.Projectile = Projectile;
window.DamageNumber = DamageNumber;
window.Particle = Particle;
window.WeaponManager = WeaponManager;
