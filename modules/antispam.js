// ═══════════════════════════════════════════════════
//  MÓDULO: Anti-Spam
// ═══════════════════════════════════════════════════

const config = require('../config');

// Tracker de mensajes por usuario
const mensajesRecientes = new Map();

// Tracker anti-raid
const entradasRecientes = [];

/**
 * Verificar si un mensaje es spam
 * @returns {{ esSpam: boolean, razon: string }} 
 */
function verificarSpam(message) {
    const { author, content, mentions } = message;
    if (author.bot) return { esSpam: false };

    // Verificar si es staff
    const miembro = message.member;
    if (miembro && config.STAFF_ROLES.some(r => miembro.roles.cache.some(role => role.name === r))) {
        return { esSpam: false };
    }

    // 1. Flood — muchos mensajes seguidos
    const ahora = Date.now();
    const key = author.id;

    if (!mensajesRecientes.has(key)) {
        mensajesRecientes.set(key, []);
    }

    const historial = mensajesRecientes.get(key);
    historial.push(ahora);

    // Limpiar mensajes viejos
    const recientes = historial.filter(t => ahora - t < config.ANTISPAM.INTERVALO);
    mensajesRecientes.set(key, recientes);

    if (recientes.length >= config.ANTISPAM.MAX_MENSAJES) {
        mensajesRecientes.set(key, []); // Reset
        return { esSpam: true, razon: `Flood: ${recientes.length} mensajes en ${config.ANTISPAM.INTERVALO / 1000}s` };
    }

    // 2. Invitaciones de Discord
    if (config.ANTISPAM.FILTRAR_INVITES) {
        const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+/gi;
        if (inviteRegex.test(content)) {
            return { esSpam: true, razon: 'Invitación de Discord no autorizada' };
        }
    }

    // 3. Links externos (con whitelist)
    if (config.ANTISPAM.FILTRAR_LINKS) {
        const linkRegex = /https?:\/\/[^\s]+/gi;
        const links = content.match(linkRegex);

        if (links) {
            for (const link of links) {
                try {
                    const url = new URL(link);
                    const domain = url.hostname.toLowerCase().replace(/^www\./, '');

                    // Revisar whitelist (coincidencia exacta o subdominio)
                    const allowed = config.ANTISPAM.WHITELIST_DOMAINS.some(wl =>
                        domain === wl || domain.endsWith('.' + wl)
                    );

                    if (!allowed) {
                        return { esSpam: true, razon: `Link no autorizado: ${domain}` };
                    }
                } catch (e) {
                    // Si falla el parseo URL pero paso el regex, mejor bloquear
                    return { esSpam: true, razon: 'Link sospechoso' };
                }
            }
        }
    }

    // 4. Menciones masivas
    if (mentions.everyone || mentions.users.size >= config.ANTISPAM.MAX_MENCIONES) {
        return { esSpam: true, razon: `Menciones masivas (${mentions.users.size})` };
    }

    // 5. Mayúsculas excesivas (solo mensajes >10 chars)
    if (content.length > 10) {
        const letras = content.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
        if (letras.length > 0) {
            const mayus = letras.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length;
            const porcentaje = (mayus / letras.length) * 100;
            if (porcentaje > config.ANTISPAM.MAX_MAYUSCULAS) {
                return { esSpam: true, razon: `Exceso de mayúsculas (${Math.round(porcentaje)}%)` };
            }
        }
    }

    // 6. Palabras prohibidas
    if (config.ANTISPAM.PALABRAS_PROHIBIDAS.length > 0) {
        const contenidoLower = content.toLowerCase();
        for (const palabra of config.ANTISPAM.PALABRAS_PROHIBIDAS) {
            if (contenidoLower.includes(palabra.toLowerCase())) {
                return { esSpam: true, razon: `Palabra prohibida detectada` };
            }
        }
    }

    return { esSpam: false };
}

/**
 * Verificar si hay un raid en progreso
 */
function verificarRaid(member) {
    const ahora = Date.now();
    const edadCuenta = ahora - member.user.createdTimestamp;

    // Solo trackear cuentas nuevas
    if (edadCuenta > config.ANTIRAID.EDAD_MINIMA) return { esRaid: false };

    entradasRecientes.push(ahora);

    // Limpiar entradas viejas
    while (entradasRecientes.length > 0 && ahora - entradasRecientes[0] > config.ANTIRAID.INTERVALO) {
        entradasRecientes.shift();
    }

    if (entradasRecientes.length >= config.ANTIRAID.CUENTAS_NUEVAS) {
        return {
            esRaid: true,
            razon: `${entradasRecientes.length} cuentas nuevas en ${config.ANTIRAID.INTERVALO / 1000}s`
        };
    }

    return { esRaid: false };
}

// Limpiar caché cada 5 minutos
setInterval(() => {
    const ahora = Date.now();
    for (const [key, historial] of mensajesRecientes) {
        const filtrado = historial.filter(t => ahora - t < 60000);
        if (filtrado.length === 0) {
            mensajesRecientes.delete(key);
        } else {
            mensajesRecientes.set(key, filtrado);
        }
    }
}, 300000);

module.exports = { verificarSpam, verificarRaid };
