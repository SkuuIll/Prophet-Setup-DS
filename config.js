// ═══════════════════════════════════════════════════
//  PROPHET BOT — Configuración
// ═══════════════════════════════════════════════════

// .env es la fuente de verdad del runtime; evita que PM2 conserve secretos rotados.
require('dotenv').config({ override: true });

const config = {
    // Token del bot principal (usar variable de entorno en producción)
    TOKEN: process.env.DISCORD_TOKEN,
    
    // Token del bot de música secundario
    MUSIC_TOKEN: process.env.DISCORD_MUSIC_TOKEN,

    // ID del servidor
    GUILD_ID: process.env.GUILD_ID || '412085943936221206',

    // Canales especiales (se resuelven por nombre al iniciar index.js)
    CHANNELS: {
        REGLAS: '📜・reglas',
        BIENVENIDOS: '👋・bienvenidos',
        ANUNCIOS: '📢・anuncios',
        ROLES: '🏷️・roles',
        CHAT: '💬・chat',
        COMANDOS_BOT: '🤖・bot',
        LOGS: '⚙️・logs',
        STAFF: '🛡️・chat-staff',
        ARCHIVOS: '📁・archivos',
    },

    // Roles del servidor
    // Roles del servidor (Nombres EXACTOS con emojis)
    ROLES: {
        PROPHET: '👑 Prophet',
        STAFF: '🛡️ Staff',
        MODERADOR: '⚔️ Moderador',
        VIP: '💎 VIP',
        VETERANO: '🌟 Veterano',
        MIEMBRO: '👤 Miembro',
        NUEVO: '🆕 Nuevo',
        BOTS: '🤖 Bots',
    },

    // Roles de juegos para el select menu (podés poner los IDs directos acá para que no dependan del nombre)
    ROLES_JUEGOS: {
        VALORANT: null,   // Ej: '123456789012345678' — si es null, busca por nombre
        LOL: null,
        MINECRAFT: null,
        CS2: null,
        PUBG: null,
        GTA: null,
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
        COOLDOWN: 60000,             // Cooldown en ms (60 segundos)
        VOICE_XP_POR_MINUTO: 5,      // XP por minuto en canal de voz
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
            // Juegos específicos / Estadísticas / Esports / Trackers
            'pubg.report', 'pubg.com', 'pubglookup.com', 'tracker.gg', 'op.gg', 'faceit.com', 'blitz.gg', 'u.gg', 'porofessor.gg',
            'mobalytics.gg', 'hltv.org', 'dotabuff.com', 'gametracker.com', 'vlr.gg', 'sportskeeda.com', 'ign.com', 'ign.es', 'liquipedia.net',
            'esports.com', 'nexusmods.com', 'curseforge.com', 'roblox.com', 'minecraft.net', 'lolchess.gg', 'tftactics.gg',
            'valoranttracker.org', 'r6.tracker.network', 'apex.tracker.gg', 'fortnitetracker.com', 'csgostats.gg', 'leetify.com',
            'steamdb.info', 'steamstat.us', 'howlongtobeat.com', 'igdb.com', 'dekudeals.com', 'isthereanydeal.com', 'gg.deals',
            'vandal.net', 'meristation.as.com', 'hobbyconsolas.com', 'vidaextra.com',

            // Redes Sociales / Video / Streaming / Mensajería
            'youtube.com', 'youtu.be', 'twitch.tv', 'twitter.com', 'x.com', 'instagram.com', 'facebook.com', 'fb.gg',
            'tiktok.com', 'reddit.com', 'discord.com', 'discord.gg', 'medaltv.com', 'medal.tv', 'kick.com', 'rumble.com',
            'trovo.live', 't.me', 'telegram.org', 'whatsapp.com', 'wa.me', 'pinterest.com', 'linkedin.com', 'tumblr.com',
            'vimeo.com', 'dailymotion.com', 'bilibili.tv', 'snapchat.com', 'threads.net', 'quora.com', 'resetera.com',
            'neogaf.com', 'forocoches.com', 'mediavida.com', 'elotrolado.net', 'meneame.net',

            // Gaming Platforms / Publishers / Tiendas de Juegos
            'steamcommunity.com', 'steampowered.com', 'epicgames.com', 'battle.net', 'xbox.com', 'playstation.com',
            'nintendo.com', 'ea.com', 'origin.com', 'ubisoft.com', 'riotgames.com', 'blizzard.com', 'rockstargames.com',
            'activision.com', 'gog.com', 'itch.io', 'vandal.elespanol.com', '3djuegos.com', 'hoyoverse.com', 'genshin.mihoyo.com',
            'humblebundle.com', 'fanatical.com', 'greenmangaming.com', 'kinguin.net', 'eneba.com', 'g2a.com', 'cdkeys.com',

            // Tech / Desarrollo / Foros
            'github.com', 'gitlab.com', 'stackoverflow.com', 'xda-developers.com', 'tomshardware.com',
            'pcgamer.com', 'kotaku.com', 'polygon.com', 'eurogamer.net', 'eurogamer.es', 'theverge.com', 'engadget.com', 'techradar.com',
            'xataka.com', 'genbeta.com', 'hipertextual.com', 'applesfera.com', 'techcrunch.com', 'wired.com', 'arstechnica.com',
            'cnet.com', 'zdnet.com', 'mashable.com', 'gizmodo.com', 'venturebeat.com',
            'codepen.io', 'jsfiddle.net', 'codesandbox.io', 'replit.com', 'npmjs.com',

            // Tools / Images / Misc / Compras / Donaciones
            'google.com', 'google.com.ar', 'imgur.com', 'imgur.io', 'tenor.com', 'giphy.com', 'prnt.sc', 'gyazo.com', 'lightshot.com',
            'pastebin.com', 'hastebin.com', 'rentry.co', 'ghostbin.com', 'wikipedia.org', 'mercadolibre.com.ar', 'mercadolibre.com',
            'amazon.com', 'amazon.es', 'aliexpress.com', 'spotify.com', 'soundcloud.com', 'discordapp.com', 'discordapp.net',
            'netflix.com', 'primevideo.com', 'max.com', 'hbo.com', 'hbomax.com', 'hulu.com', 'peacocktv.com', 'appletv.com', 'tv.apple.com',
            'disneyplus.com', 'crunchyroll.com', 'funimation.com', 'animeflv.net', 'jkanime.net', 'tioanime.com', 'pluto.tv', 'vix.com',
            'start.gg', 'canva.com', 'fandom.com', 'wikia.com', 'patreon.com', 'ko-fi.com', 'buymeacoffee.com', 'cafecito.app',
            'paypal.com', 'paypal.me', 'mercadopago.com.ar',

            // Archivos / Nubes seguras
            'drive.google.com', 'docs.google.com', 'dropbox.com', 'onedrive.live.com', 'wetransfer.com', 'mega.nz', 'mediafire.com',
            'gofile.io', 'file.io', 'catbox.moe', 'puu.sh'
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
        BOOST_REWARD: 5000,           // Recompensa por boostear el servidor
    },

    // Sugerencias
    SUGERENCIAS: {
        CHANNEL_ID: null,  // Se resuelve automáticamente al iniciar
    },

    // Permisos — Roles que pueden usar comandos de moderación
    STAFF_ROLES: ['👑 Prophet', '🛡️ Staff', '⚔️ Moderador'],

    // Lavalink / Shoukaku
    LAVALINK: {
        URL: process.env.LAVALINK_URL || 'localhost:2333',
        PASSWORD: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
        SECURE: process.env.LAVALINK_SECURE === 'true',
    },

    // Dashboard interno
    DASHBOARD: {
        ENABLED: process.env.DASHBOARD_ENABLED !== 'false',
        HOST: process.env.DASHBOARD_HOST || '127.0.0.1',
        PORT: Number.parseInt(process.env.DASHBOARD_PORT || '3789', 10),
        TOKEN: process.env.DASHBOARD_TOKEN || null,
        REFRESH_MS: Number.parseInt(process.env.DASHBOARD_REFRESH_MS || '30000', 10),
    },

    // APIs externas (Gaming Stats)
    APIS: {
        PUBG: {
            KEY: process.env.PUBG_API_KEY,
            BASE_URL: 'https://api.pubg.com',
            RATE_LIMIT: 10,         // Requests por minuto
            CACHE_TTL: 300000,      // 5 minutos
        },
        TRACKER: {
            KEY: process.env.TRACKER_API_KEY,
            BASE_URL: 'https://api.tracker.gg/api/v2',
            CACHE_TTL: 300000,      // 5 minutos
        },
        TWITCH: {
            CLIENT_ID: process.env.TWITCH_CLIENT_ID,
            CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,
            BASE_URL: 'https://api.twitch.tv/helix',
            AUTH_URL: 'https://id.twitch.tv/oauth2/token',
            CACHE_TTL: 300000,      // 5 minutos
        }
    },

    // Recursos Visuales
    ASSETS: {
        LOGO: './assets/logo.png',
        BANNER: './assets/banner.png',
        MUSIC_BANNER: 'https://raw.githubusercontent.com/SkuuIll/Prophet-Setup-DS/main/assets/music_banner.png',
    },

    // Sistema de Apodos Trol Argentinos (Nivel 10+)
    TROLL_NICKNAMES: {
        ENABLED: false,            // Activar/desactivar sistema globalmente
        MIN_LEVEL: 10,             // Nivel mínimo requerido para aplicar apodo trol
        COOLDOWN: 30 * 60 * 1000,  // Cooldown entre cambios automáticos (30 minutos)
        LOG_CHANGES: false,        // Registrar cambios en el canal de logs
    }
};

config.CANALES = config.CHANNELS;

// Aliases — se resuelven por separado en resolverIDs() después de resolver los primarios
config.CHANNEL_ALIASES = {
    BIENVENIDA: 'BIENVENIDOS',
    GENERAL: 'CHAT',
    LOGS_MOD: 'REPORTES',
};

// Roles protegidos (no auto-asignables) — se evalúa después de resolverIDs
config.getProtectedRoleIds = function () {
    return [this.ROLES.PROPHET, this.ROLES.STAFF, this.ROLES.MODERADOR, this.ROLES.VIP, this.ROLES.BOTS].filter(Boolean);
};

config.validateConfig = function validateConfig() {
    const errors = [];
    const warnings = [];

    if (!config.TOKEN) errors.push('Falta la variable de entorno DISCORD_TOKEN.');
    if (!config.GUILD_ID) errors.push('Falta la variable de entorno GUILD_ID.');
    if (!Number.isInteger(config.DASHBOARD.PORT) || config.DASHBOARD.PORT < 1 || config.DASHBOARD.PORT > 65535) {
        errors.push('DASHBOARD_PORT debe ser un puerto válido entre 1 y 65535.');
    }
    if (!Number.isInteger(config.DASHBOARD.REFRESH_MS) || config.DASHBOARD.REFRESH_MS < 5000) {
        errors.push('DASHBOARD_REFRESH_MS debe ser un número entero mayor o igual a 5000.');
    }
    if (!config.LAVALINK.PASSWORD || config.LAVALINK.PASSWORD === 'youshallnotpass') {
        warnings.push('LAVALINK_PASSWORD está usando el valor por defecto.');
    }
    if (!config.DASHBOARD.TOKEN && !['127.0.0.1', 'localhost', '::1'].includes(config.DASHBOARD.HOST)) {
        warnings.push('El dashboard escucha fuera de localhost sin DASHBOARD_TOKEN.');
    }

    return { errors, warnings };
};

module.exports = config;
