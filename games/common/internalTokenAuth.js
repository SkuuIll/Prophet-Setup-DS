const crypto = require('node:crypto');

// Las rutas internas no deben aceptar peticiones si el secreto falta o es débil.
function internalSecretReady(secret) {
    return typeof secret === 'string' && Buffer.byteLength(secret, 'utf8') >= 32;
}

function verifyInternalSecret(expected, supplied) {
    if (!internalSecretReady(expected) || typeof supplied !== 'string') return false;
    const left = Buffer.from(expected, 'utf8');
    const right = Buffer.from(supplied, 'utf8');
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function validDiscordUserId(userId) {
    return typeof userId === 'string' && /^\d{17,20}$/.test(userId);
}

// Nunca aceptar TTL arbitrarios del navegador: 1 a 180 minutos.
function normalizeSessionMinutes(value, fallback = 120) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
    return Math.min(180, Math.max(1, Math.floor(numeric)));
}

module.exports = {
    internalSecretReady,
    verifyInternalSecret,
    validDiscordUserId,
    normalizeSessionMinutes,
};
