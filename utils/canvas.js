const { createCanvas, loadImage } = require('canvas');
const path = require('path');

// ─── COLORES TEMA PROPHET ─────────────────────────────────
const THEME = {
    bg1: '#0D0D15',
    bg2: '#1A1A2E',
    accent: '#BB86FC',
    accent2: '#E040FB',
    gold: '#FFD700',
    text: '#FFFFFF',
    sub: '#B0B0C0',
    bar_bg: '#2A2A40',
    bar_fg1: '#BB86FC',
    bar_fg2: '#7C4DFF',
};

// ─── Helper: rounded rect ─────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ─── Helper: círculo clip para avatar ────────────────────
function clipCircle(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
}

/**
 * Genera tarjeta de NIVEL premium
 */
async function generarTarjetaNivel(user, data) {
    const W = 934, H = 290;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // ── Fondo con degradado ──
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, THEME.bg1);
    bgGrad.addColorStop(1, THEME.bg2);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Panel translúcido izquierdo (panel de avatar) ──
    ctx.save();
    roundRect(ctx, 10, 10, 270, H - 20, 18);
    ctx.fillStyle = 'rgba(187,134,252,0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(187,134,252,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // ── Avatar ──
    const AX = 145, AY = H / 2, AR = 95;
    ctx.save();
    // Glow ring
    ctx.shadowColor = THEME.accent;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(AX, AY, AR + 8, 0, Math.PI * 2);
    const ringGrad = ctx.createLinearGradient(AX - AR, AY - AR, AX + AR, AY + AR);
    ringGrad.addColorStop(0, THEME.accent);
    ringGrad.addColorStop(1, THEME.accent2);
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.save();
    clipCircle(ctx, AX, AY, AR);
    try {
        const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
        ctx.drawImage(avatar, AX - AR, AY - AR, AR * 2, AR * 2);
    } catch {
        ctx.fillStyle = THEME.accent;
        ctx.fillRect(AX - AR, AY - AR, AR * 2, AR * 2);
    }
    ctx.restore();

    // ── Zona derecha ──
    const RX = 300; // inicio X del contenido derecho

    // Username
    ctx.fillStyle = THEME.text;
    ctx.font = 'bold 38px sans-serif';
    // Truncar si es muy largo
    let displayName = user.displayName || user.username;
    while (ctx.measureText(displayName).width > 490 && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
    }
    if (displayName !== (user.displayName || user.username)) displayName += '…';
    ctx.fillText(displayName, RX, 75);

    // Tag (username small)
    ctx.fillStyle = THEME.sub;
    ctx.font = '20px sans-serif';
    ctx.fillText(`@${user.username}`, RX, 108);

    // Nivel badge (derecha)
    const lvlText = `NV. ${data.level}`;
    ctx.font = 'bold 28px sans-serif';
    const lvlW = ctx.measureText(lvlText).width + 24;
    roundRect(ctx, W - lvlW - 20, 30, lvlW, 44, 10);
    const lvlGrad = ctx.createLinearGradient(W - lvlW - 20, 0, W - 20, 0);
    lvlGrad.addColorStop(0, THEME.accent);
    lvlGrad.addColorStop(1, THEME.accent2);
    ctx.fillStyle = lvlGrad;
    ctx.fill();
    ctx.fillStyle = THEME.text;
    ctx.fillText(lvlText, W - lvlW - 8, 63);

    // Rank
    ctx.fillStyle = THEME.sub;
    ctx.font = '22px sans-serif';
    ctx.fillText(`Rank #${data.rank}`, W - 130, 108);

    // ── Barra de XP ──
    const BX = RX, BY = 155, BW = W - RX - 30, BH = 28;

    // Label de XP
    ctx.fillStyle = THEME.sub;
    ctx.font = '18px sans-serif';
    ctx.fillText(`${data.xp.toLocaleString()} / ${data.xpSiguiente.toLocaleString()} XP`, BX, BY - 8);

    // Fondo barra
    ctx.save();
    roundRect(ctx, BX, BY, BW, BH, BH / 2);
    ctx.fillStyle = THEME.bar_bg;
    ctx.fill();
    ctx.restore();

    // Llenado barra
    const pct = Math.min(data.xp / data.xpSiguiente, 1);
    const fillW = Math.max(pct * BW, BH);
    ctx.save();
    roundRect(ctx, BX, BY, fillW, BH, BH / 2);
    const barGrad = ctx.createLinearGradient(BX, 0, BX + BW, 0);
    barGrad.addColorStop(0, THEME.bar_fg2);
    barGrad.addColorStop(1, THEME.bar_fg1);
    ctx.fillStyle = barGrad;
    ctx.shadowColor = THEME.accent;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();

    // % texto encima
    ctx.fillStyle = THEME.text;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`${Math.round(pct * 100)}%`, BX + fillW / 2 - 18, BY + 20);

    // ── Mensajes y XP total ──
    ctx.fillStyle = THEME.sub;
    ctx.font = '20px sans-serif';
    ctx.fillText(`💬 ${(data.messages || 0).toLocaleString()} mensajes`, RX, BY + 60);
    ctx.fillText(`⭐ ${data.xp.toLocaleString()} XP total`, RX + 260, BY + 60);

    // ── Línea decorativa lateral ──
    const lineGrad = ctx.createLinearGradient(0, 30, 0, H - 30);
    lineGrad.addColorStop(0, 'transparent');
    lineGrad.addColorStop(0.5, THEME.accent);
    lineGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(287, 30);
    ctx.lineTo(287, H - 30);
    ctx.stroke();

    return canvas.toBuffer();
}

/**
 * Genera tarjeta de BIENVENIDA premium
 */
async function generarBienvenida(member) {
    const W = 1024, H = 480;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // ── Fondo ──
    let bgLoaded = false;
    try {
        const bgPath = path.join(__dirname, '../assets/banner.png');
        const bg = await loadImage(bgPath);
        ctx.drawImage(bg, 0, 0, W, H);
        // Overlay oscuro para legibilidad
        ctx.fillStyle = 'rgba(10, 10, 20, 0.68)';
        ctx.fillRect(0, 0, W, H);
        bgLoaded = true;
    } catch {
        // Gradient fallback
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#0A0A14');
        grad.addColorStop(0.5, '#1A0A2E');
        grad.addColorStop(1, '#0A0A14');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }

    // ── Partículas decorativas (círculos difusos) ──
    const particles = [
        { x: 80, y: 80, r: 60, c: 'rgba(187,134,252,0.15)' },
        { x: 950, y: 400, r: 80, c: 'rgba(224,64,251,0.10)' },
        { x: 500, y: 450, r: 50, c: 'rgba(187,134,252,0.08)' },
        { x: 150, y: 380, r: 40, c: 'rgba(124,77,255,0.12)' },
    ];
    for (const p of particles) {
        const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        rg.addColorStop(0, p.c);
        rg.addColorStop(1, 'transparent');
        ctx.fillStyle = rg;
        ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }

    // ── Panel central translúcido ──
    ctx.save();
    roundRect(ctx, W / 2 - 370, 15, 740, H - 30, 24);
    ctx.fillStyle = 'rgba(13,13,21,0.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(187,134,252,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // ── Avatar con glow ──
    const AX = W / 2, AY = 168, AR = 90;

    // Glow doble anillo
    ctx.save();
    ctx.shadowColor = THEME.accent;
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(AX, AY, AR + 12, 0, Math.PI * 2);
    const aGrad = ctx.createLinearGradient(AX - AR, AY - AR, AX + AR, AY + AR);
    aGrad.addColorStop(0, THEME.accent);
    aGrad.addColorStop(1, THEME.accent2);
    ctx.strokeStyle = aGrad;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    clipCircle(ctx, AX, AY, AR);
    try {
        const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
        ctx.drawImage(avatar, AX - AR, AY - AR, AR * 2, AR * 2);
    } catch {
        const fb = ctx.createLinearGradient(AX - AR, AY - AR, AX + AR, AY + AR);
        fb.addColorStop(0, THEME.accent);
        fb.addColorStop(1, THEME.accent2);
        ctx.fillStyle = fb;
        ctx.fillRect(AX - AR, AY - AR, AR * 2, AR * 2);
    }
    ctx.restore();

    // ── Texto "¡BIENVENIDO/A!" ──
    ctx.textAlign = 'center';
    ctx.shadowColor = THEME.accent;
    ctx.shadowBlur = 16;
    ctx.fillStyle = THEME.accent;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('✦  ¡BIENVENIDO/A A LA FAMILIA!  ✦', AX, 290);
    ctx.shadowBlur = 0;

    // ── Username grande ──
    ctx.fillStyle = THEME.text;
    ctx.font = 'bold 46px sans-serif';
    let uname = member.user.username;
    while (ctx.measureText(uname).width > 680 && uname.length > 3) uname = uname.slice(0, -1);
    if (uname !== member.user.username) uname += '…';
    ctx.fillText(uname, AX, 345);

    // ── Subtítulo "servidor · miembro #N" ──
    ctx.fillStyle = THEME.sub;
    ctx.font = '22px sans-serif';
    ctx.fillText(`Prophet Gaming  ·  Miembro #${member.guild.memberCount.toLocaleString()}`, AX, 385);

    // ── Línea decorativa inferior ──
    ctx.save();
    const lineGrad = ctx.createLinearGradient(AX - 200, 0, AX + 200, 0);
    lineGrad.addColorStop(0, 'transparent');
    lineGrad.addColorStop(0.5, THEME.accent);
    lineGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(AX - 200, 408);
    ctx.lineTo(AX + 200, 408);
    ctx.stroke();
    ctx.restore();

    // ── Hint inferior ──
    ctx.fillStyle = 'rgba(176,176,192,0.7)';
    ctx.font = '17px sans-serif';
    ctx.fillText('Leé las reglas y presentate en el chat 👋', AX, 440);

    ctx.textAlign = 'left';
    return canvas.toBuffer();
}

module.exports = { generarTarjetaNivel, generarBienvenida };
