/**
 * ════ PROPHET SURVIVOR — ARMAS, PROYECTILES Y GEMAS ════
 */

class XPGem {
    constructor(x, y, value = 10) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.radius = value >= 50 ? 7 : 5;
        this.color = value >= 50 ? '#FF3D00' : (value >= 25 ? '#39FF14' : '#00E5FF');
        this.collected = false;
    }

    draw(ctx, camera) {
        const cx = this.x - camera.x;
        const cy = this.y - camera.y;

        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, vx, vy, damage, radius = 4, color = '#00E5FF', isAoE = false, aoeRadius = 0) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.radius = radius;
        this.color = color;
        this.isAoE = isAoE;
        this.aoeRadius = aoeRadius;
        this.life = 120; // 2 segundos a 60fps
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
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
        ctx.restore();
    }
}

class DamageNumber {
    constructor(x, y, text, color = '#FFFFFF') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 40;
        this.vy = -1.2;
    }

    update() {
        this.y += this.vy;
        this.life--;
    }

    draw(ctx, camera) {
        const cx = this.x - camera.x;
        const cy = this.y - camera.y;

        ctx.save();
        ctx.fillStyle = this.color;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.max(0, this.life / 40);
        ctx.fillText(this.text, cx, cy);
        ctx.restore();
    }
}

class WeaponManager {
    constructor(player) {
        this.player = player;
        this.plasmaCount = 1;
        this.plasmaAngle = 0;
        this.plasmaRadius = 70;
        this.plasmaDamage = 25;

        this.laserCooldown = 0;
        this.laserRate = 35; // Frames entre disparos
        this.laserDamage = 35;

        this.rocketCooldown = 0;
        this.rocketRate = 90;
        this.rocketDamage = 80;
        this.hasRockets = false;
    }

    update(enemies, projectiles) {
        // 1. Orbes de Plasma (Giran alrededor del jugador)
        this.plasmaAngle += 0.05;

        // 2. Láser Automático
        this.laserCooldown--;
        if (this.laserCooldown <= 0 && enemies.length > 0) {
            this.laserCooldown = Math.max(10, Math.floor(this.laserRate * this.player.cooldownMultiplier));
            const target = this.getNearestEnemy(enemies);
            if (target) {
                const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
                const speed = 12;
                projectiles.push(new Projectile(
                    this.player.x,
                    this.player.y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    Math.floor(this.laserDamage * this.player.damageMultiplier),
                    4,
                    '#00E5FF'
                ));
            }
        }

        // 3. Misiles AoE
        if (this.hasRockets) {
            this.rocketCooldown--;
            if (this.rocketCooldown <= 0 && enemies.length > 0) {
                this.rocketCooldown = Math.max(25, Math.floor(this.rocketRate * this.player.cooldownMultiplier));
                const target = this.getNearestEnemy(enemies);
                if (target) {
                    const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
                    const speed = 8;
                    projectiles.push(new Projectile(
                        this.player.x,
                        this.player.y,
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed,
                        Math.floor(this.rocketDamage * this.player.damageMultiplier),
                        7,
                        '#FF9100',
                        true,
                        60 // Radio de explosión
                    ));
                }
            }
        }
    }

    drawPlasma(ctx, camera) {
        for (let i = 0; i < this.plasmaCount; i++) {
            const angle = this.plasmaAngle + (i * (Math.PI * 2 / this.plasmaCount));
            const px = this.player.x + Math.cos(angle) * this.plasmaRadius;
            const py = this.player.y + Math.sin(angle) * this.plasmaRadius;

            ctx.save();
            ctx.fillStyle = '#BB86FC';
            ctx.shadowColor = '#BB86FC';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(px - camera.x, py - camera.y, 8, 0, Math.PI * 2);
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
                radius: 8,
                damage: Math.floor(this.plasmaDamage * this.player.damageMultiplier)
            });
        }
        return positions;
    }

    getNearestEnemy(enemies) {
        let nearest = null;
        let minDist = 600; // Rango de visión de disparo

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
