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
        REGLAS: '📜・reglas',
        BIENVENIDOS: '👋・bienvenidos',
        ANUNCIOS: '📢・anuncios',
        ROLES: '🏷️・roles',
        CHAT: '💬・chat',
        CHAT_VIP: '💎・chat-vip',
        MULTIMEDIA: '🖼️・multimedia',
        SOPORTE: '❓・soporte',
        COMANDOS_BOT: '🤖・bot-comandos',
        STREAMS: '🖥️・streams',
        LOGS: '⚙️・logs',
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
        PRINCIPAL: 0xBB86FC,   // Violeta Prophet (usado en la mayoría de embeds)
        EXITO: 0x69F0AE,       // Verde Menta
        SUCCESS: 0x69F0AE,     // Verde Menta (alias)
        ERROR: 0xEF5350,       // Rojo suave
        WARN: 0xFFB74D,        // Naranja suave
        INFO: 0x42A5F5,        // Azul
        MUSICA: 0xBB86FC,      // Violeta (igual que principal)
        NIVEL: 0x69F0AE,       // Verde Menta
        MODERACION: 0xEF5350,  // Rojo suave
        DISCONNECT: 0x37474F,  // Gris oscuro (desconexión)
    },

    // Sistema de niveles
    NIVELES: {
        XP_MIN: 15,          // XP mínimo por mensaje
        XP_MAX: 25,          // XP máximo por mensaje
        COOLDOWN: 60000,     // Cooldown en ms (60 segundos)
        ROLES_POR_NIVEL: {   // nivel: nombre del rol (Debe coincidir EXACTAMENTE con el nombre del rol en Discord)
            1: '🌱 Novato',
            5: '🔹 Aprendiz',
            10: '🔷 Gamer',
            20: '💠 Pro Player',
            30: '🌟 Veterano',
            40: '👑 Elite',
            50: '🔥 Leyenda',
            75: '🐉 Maestro',
            100: '⚡ Dios del Server',
        }
    },

    // Anti-spam
    ANTISPAM: {
        MAX_MENSAJES: 8,        // Mensajes permitidos (Aumentado para ser más permisivo)
        INTERVALO: 3000,        // Intervalo en ms (3 segundos)
        MUTE_DURACION: 60000,   // Duración del mute en ms (Reducido a 1 minuto)
        MAX_MENCIONES: 10,      // Máximo de menciones por mensaje (Aumentado)
        MAX_MAYUSCULAS: 80,     // Porcentaje máximo de mayúsculas (Aumentado)
        FILTRAR_INVITES: true,  // Filtrar invitaciones de Discord
        FILTRAR_LINKS: true,    // Filtrar links externos
        WHITELIST_DOMAINS: [    // Dominios permitidos (Links conocidos)
            // Redes Sociales / Video
            'youtube.com', 'youtu.be', 'twitch.tv', 'twitter.com', 'x.com',
            'instagram.com', 'facebook.com', 'tiktok.com', 'reddit.com', 'discord.com', 'discord.gg',

            // Gaming Platforms
            'steamcommunity.com', 'steampowered.com', 'epicgames.com', 'battle.net',
            'roblox.com', 'minecraft.net', 'xbox.com', 'playstation.com', 'nintendo.com',
            'ea.com', 'origin.com', 'ubisoft.com', 'riotgames.com', 'blizzard.com',
            'rockstargames.com', 'activision.com',

            // Tools / Images / Misc
            'google.com', 'imgur.com', 'tenor.com', 'giphy.com',
            'github.com', 'pastebin.com', 'wikipedia.org',
            'spotify.com', 'soundcloud.com', 'kick.com'
        ],
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

    // Moderación (Más permisivo)
    MODERACION: {
        WARNS_PARA_MUTE: 5,      // Aumentado de 3 a 5
        WARNS_PARA_KICK: 10,     // Aumentado de 5 a 10
        MUTE_DURACION: 600000,   // 10 minutos
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

    // Recursos Visuales
    ASSETS: {
        LOGO: './assets/logo.png',
        BANNER: './assets/banner.png',
    }
};
