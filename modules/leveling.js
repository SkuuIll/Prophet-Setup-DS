// ═══════════════════════════════════════════════════
//  MÓDULO: Sistema de Niveles y XP
// ═══════════════════════════════════════════════════

const { stmts } = require('../database');
const config = require('../config');

/**
 * Calcular XP necesario para un nivel
 */
function xpParaNivel(nivel) {
    return Math.floor(100 * Math.pow(nivel, 1.5));
}

/**
 * Procesar XP de un mensaje
 */
function procesarXP(userId) {
    const ahora = Date.now();
    let user = stmts.getUser(userId);

    if (!user) {
        user = { user_id: userId, xp: 0, level: 0, messages: 0, last_xp: 0 };
    }

    // Verificar cooldown
    if (ahora - user.last_xp < config.NIVELES.COOLDOWN) {
        stmts.upsertUser({ ...user, messages: user.messages + 1 });
        return { subioNivel: false, nuevoNivel: user.level, xpTotal: user.xp, rolNuevo: null };
    }

    // Dar XP aleatorio
    const xpGanado = Math.floor(Math.random() * (config.NIVELES.XP_MAX - config.NIVELES.XP_MIN + 1)) + config.NIVELES.XP_MIN;
    user.xp += xpGanado;
    user.messages += 1;
    user.last_xp = ahora;

    // Verificar subida de nivel
    let subioNivel = false;
    let rolNuevo = null;

    while (user.xp >= xpParaNivel(user.level + 1)) {
        user.level++;
        subioNivel = true;

        if (config.NIVELES.ROLES_POR_NIVEL[user.level]) {
            rolNuevo = config.NIVELES.ROLES_POR_NIVEL[user.level];
        }
    }

    stmts.upsertUser(user);

    return {
        subioNivel,
        nuevoNivel: user.level,
        xpTotal: user.xp,
        xpSiguiente: xpParaNivel(user.level + 1),
        rolNuevo,
    };
}

/**
 * Obtener datos de nivel de un usuario
 */
function obtenerNivel(userId) {
    const user = stmts.getUser(userId);
    if (!user) return null;

    const rank = stmts.getRank(userId);

    return {
        ...user,
        xpSiguiente: xpParaNivel(user.level + 1),
        rank: rank.rank + 1,
        progreso: user.xp / xpParaNivel(user.level + 1),
    };
}

/**
 * Obtener top N usuarios
 */
function obtenerTop(limite = 10) {
    return stmts.getTop(limite);
}

/**
 * Generar barra de progreso visual
 */
function barraProgreso(porcentaje, largo = 20) {
    const lleno = Math.round(porcentaje * largo);
    const vacio = largo - lleno;
    return '█'.repeat(lleno) + '░'.repeat(vacio);
}

module.exports = { procesarXP, obtenerNivel, obtenerTop, xpParaNivel, barraProgreso };
