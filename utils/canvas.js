const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

/**
 * Genera una tarjeta de nivel premium
 */
async function generarTarjetaNivel(user, data) {
    const canvas = createCanvas(934, 282);
    const ctx = canvas.getContext('2d');

    // Fondo oscuro con degradado
    const grad = ctx.createLinearGradient(0, 0, 934, 282);
    grad.addColorStop(0, '#1a1a1c');
    grad.addColorStop(1, '#2c2c2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dibujar avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(141, 141, 100, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    try {
        const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
        ctx.drawImage(avatar, 41, 41, 200, 200);
    } catch (e) {
        // Fallback color si falla el avatar
        ctx.fillStyle = '#f5c542';
        ctx.fillRect(41, 41, 200, 200);
    }
    ctx.restore();

    // Borde del avatar
    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(141, 141, 100, 0, Math.PI * 2, true);
    ctx.stroke();

    // Texto de Usuario
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(user.displayName, 270, 100);

    // Nivel y Rank
    ctx.font = '30px sans-serif';
    ctx.fillStyle = '#f5c542';
    ctx.fillText(`NIVEL ${data.level}`, 270, 150);

    ctx.fillStyle = '#9e9e9e';
    ctx.font = '24px sans-serif';
    const rankText = `#${data.rank} RANK`;
    const rankWidth = ctx.measureText(rankText).width;
    ctx.fillText(rankText, 880 - rankWidth, 100);

    // Barra de progreso (Fondo)
    ctx.fillStyle = '#484848';
    ctx.beginPath();
    ctx.roundRect(270, 180, 610, 40, 20);
    ctx.fill();

    // Barra de progreso (Llenado)
    const progresoWidth = 610 * (data.xp / data.xpSiguiente);
    const gradProg = ctx.createLinearGradient(270, 0, 880, 0);
    gradProg.addColorStop(0, '#f5c542');
    gradProg.addColorStop(1, '#ff8c00');
    ctx.fillStyle = gradProg;
    ctx.beginPath();
    ctx.roundRect(270, 180, Math.max(progresoWidth, 20), 40, 20);
    ctx.fill();

    // Texto de XP
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    const xpText = `${data.xp} / ${data.xpSiguiente} XP`;
    const xpWidth = ctx.measureText(xpText).width;
    ctx.fillText(xpText, 880 - xpWidth, 170);

    return canvas.toBuffer();
}

/**
 * Genera una imagen de bienvenida dinámica
 */
async function generarBienvenida(member) {
    // Usar el banner como fondo base si es posible, sino crear gradient
    const canvas = createCanvas(1024, 450);
    const ctx = canvas.getContext('2d');

    // Fondo: intentamos cargar el banner, si no, gradient
    try {
        const bg = await loadImage('./assets/banner.png');
        ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

        // Poner una capa oscura por encima para que resalten las letras
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } catch (e) {
        // Fallback gradient solid si no hay banner
        const grad = ctx.createLinearGradient(0, 0, 1024, 450);
        grad.addColorStop(0, '#150050');
        grad.addColorStop(1, '#3F0071');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Dibujar avatar
    const avatarSize = 200;
    const avatarX = canvas.width / 2 - avatarSize / 2;
    const avatarY = 50;

    // Border del avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(canvas.width / 2, avatarY + avatarSize / 2, avatarSize / 2 + 10, 0, Math.PI * 2, true);
    ctx.fillStyle = '#BB86FC';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(canvas.width / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    try {
        const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    } catch (e) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    }
    ctx.restore();

    // Texto de BIENVENIDA
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`¡Bienvenido/a a Prophet Gaming!`, canvas.width / 2, 320);

    // Texto de Username
    ctx.fillStyle = '#BB86FC';
    ctx.font = 'bold 45px sans-serif';
    ctx.fillText(`${member.user.username}`, canvas.width / 2, 380);

    // Texto de Miembro #
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '28px sans-serif';
    ctx.fillText(`Sos el miembro #${member.guild.memberCount}`, canvas.width / 2, 420);

    return canvas.toBuffer();
}

module.exports = { generarTarjetaNivel, generarBienvenida };
