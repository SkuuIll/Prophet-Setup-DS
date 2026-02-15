// ═══════════════════════════════════════════════════
//  PROPHET BOT — Configuración
// ═══════════════════════════════════════════════════

require('dotenv').config();

module.exports = {
    // Token del bot (usar variable de entorno en producción)
    TOKEN: process.env.DISCORD_TOKEN,

    // ID del servidor
    GUILD_ID: '412085943936221206',

    // Canales especiales (se resuelven por nombre al iniciar index.js)
    CHANNELS: {
        BIENVENIDOS: '👋│bienvenidos',
        LOGS: '🤖│logs-bots',
        REGLAS: '📌│reglas',
        ANUNCIOS: '📢│anuncios',
        COMANDOS_BOT: '🤖│comandos-bot',
        SUGERENCIAS: '❓│preguntas', // Usamos preguntas por ahora
    },

    // Roles del servidor
    ROLES: {
        PROPHET: null,    // 👑 Prophet
        STAFF: null,      // 🛡️ Staff
        MODERADOR: null,  // ⚔️ Moderador
        VIP: null,        // 💎 VIP
        VETERANO: null,   // 🌟 Veterano
        MIEMBRO: null,    // 👤 Miembro
        NUEVO: 'Nuevo',   // 🆕 Nuevo (Rol que se da al entrar)
        BOTS: null,       // 🤖 Bots
    },

    // Colores para embeds
    COLORES: {
        PRINCIPAL: 0xF5C542,   // Dorado Prophet
        EXITO: 0x2ECC71,       // Verde
        SUCCESS: 0x2ECC71,     // Verde (alias para economy commands)
        ERROR: 0xE74C3C,       // Rojo
        WARN: 0xF39C12,        // Naranja
        INFO: 0x3498DB,        // Azul
        MUSICA: 0x9B59B6,      // Violeta
        NIVEL: 0x2ECC71,       // Verde
        MODERACION: 0xE74C3C,  // Rojo
    },

    // Sistema de niveles
    NIVELES: {
        XP_MIN: 15,          // XP mínimo por mensaje
        XP_MAX: 25,          // XP máximo por mensaje
        COOLDOWN: 60000,     // Cooldown en ms (60 segundos)
        ROLES_POR_NIVEL: {   // nivel: nombre del rol (Debe coincidir EXACTAMENTE con el nombre del rol en Discord)
            5: 'Miembro',
            10: 'Veterano',
            20: 'VIP',
        }
    },

    // Anti-spam
    ANTISPAM: {
        MAX_MENSAJES: 5,        // Mensajes permitidos en el intervalo
        INTERVALO: 3000,        // Intervalo en ms (3 segundos)
        MUTE_DURACION: 300000,  // Duración del mute en ms (5 minutos)
        MAX_MENCIONES: 5,       // Máximo de menciones por mensaje
        MAX_MAYUSCULAS: 70,     // Porcentaje máximo de mayúsculas
        FILTRAR_INVITES: true,  // Filtrar invitaciones de Discord
        FILTRAR_LINKS: false,   // Filtrar todos los links
        PALABRAS_PROHIBIDAS: [
            // Agregar palabras prohibidas acá
        ],
    },

    // Anti-raid
    ANTIRAID: {
        CUENTAS_NUEVAS: 5,      // Cuentas nuevas que activan alerta
        INTERVALO: 10000,       // En qué tiempo (10 segundos)
        EDAD_MINIMA: 604800000, // Edad mínima de cuenta (7 días en ms)
    },

    // Moderación
    MODERACION: {
        WARNS_PARA_MUTE: 3,
        WARNS_PARA_KICK: 5,
        MUTE_DURACION: 3600000,  // 1 hora
    },

    // Música
    MUSICA: {
        VOLUMEN_DEFAULT: 50,
        MAX_COLA: 50,
    },

    // Economía
    ECONOMIA: {
        CURRENCY: '🪙',              // Emoji de la moneda
        DAILY_COOLDOWN: 86400000,     // 24 horas en ms
        DAILY_MIN: 100,               // Mínimo de daily
        DAILY_MAX: 500,               // Máximo de daily
        WORK_COOLDOWN: 1800000,       // 30 minutos en ms
        WORK_MIN: 50,                 // Mínimo de work
        WORK_MAX: 300,                // Máximo de work
    },

    // Sugerencias
    SUGERENCIAS: {
        CHANNEL_ID: null,  // Se resuelve automáticamente al iniciar
    },

    // Permisos — Roles que pueden usar comandos de moderación
    STAFF_ROLES: ['👑 Prophet', '🛡️ Staff', '⚔️ Moderador'],
};
