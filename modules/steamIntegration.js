// ═══════════════════════════════════════════════════
//  MÓDULO: steamIntegration.js
//  Integración con Steam
// ═══════════════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const { stmts, _db } = require('../database');

// Crear tabla para cuentas de Steam vinculadas
_db.exec(`
    CREATE TABLE IF NOT EXISTS steam_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        steam_id TEXT NOT NULL,
        steam_name TEXT,
        avatar_url TEXT,
        profile_url TEXT,
        linked_at INTEGER,
        last_updated INTEGER,
        UNIQUE(user_id, guild_id)
    );

    CREATE TABLE IF NOT EXISTS steam_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steam_account_id INTEGER,
        app_id INTEGER NOT NULL,
        name TEXT,
        playtime_forever INTEGER DEFAULT 0,
        playtime_2weeks INTEGER DEFAULT 0,
        img_icon_url TEXT,
        last_updated INTEGER,
        FOREIGN KEY (steam_account_id) REFERENCES steam_accounts(id) ON DELETE CASCADE,
        UNIQUE(steam_account_id, app_id)
    );

    CREATE INDEX IF NOT EXISTS idx_steam_user ON steam_accounts(user_id, guild_id);
`);

// ═══════════════════════════════════════════════════
//  FUNCIONES DE API
// ═══════════════════════════════════════════════════

/**
 * Resuelve un vanity URL a Steam ID
 */
async function resolveSteamId(input, apiKey) {
    // Si ya es un Steam ID numérico
    if (/^\d{17}$/.test(input)) {
        return input;
    }

    // Si es un vanity URL
    const vanityMatch = input.match(/steamcommunity\.com\/(id|profiles)\/([^\/]+)/);
    if (vanityMatch) {
        const [, type, identifier] = vanityMatch;
        
        if (type === 'profiles') {
            return identifier;
        }

        // Resolver vanity URL
        try {
            const res = await fetch(
                `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${encodeURIComponent(identifier)}`
            );
            const data = await res.json();
            if (data.response?.success === 1) {
                return data.response.steamid;
            }
        } catch (e) {
            return null;
        }
    }

    // Intentar resolver como vanity name directamente
    try {
        const res = await fetch(
            `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${encodeURIComponent(input)}`
        );
        const data = await res.json();
        if (data.response?.success === 1) {
            return data.response.steamid;
        }
    } catch (e) {
        return null;
    }

    return null;
}

/**
 * Obtiene información del perfil de Steam
 */
async function getSteamProfile(steamId, apiKey) {
    try {
        const res = await fetch(
            `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`
        );

        if (!res.ok) return { error: `Error de API: ${res.status}` };

        const data = await res.json();
        const player = data.response?.players?.[0];

        if (!player) return { error: 'Perfil no encontrado' };

        return {
            steamId: player.steamid,
            personaName: player.personaname,
            avatar: player.avatarfull,
            profileUrl: player.profileurl,
            visibility: player.communityvisibilitystate,
            personaState: player.personastate,
            gameExtraInfo: player.gameextrainfo,
            gameServerIp: player.gameserverip,
            lastLogoff: player.lastlogoff,
            timeCreated: player.timecreated,
            countryCode: player.loccountrycode
        };
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Obtiene los juegos del usuario
 */
async function getOwnedGames(steamId, apiKey) {
    try {
        const res = await fetch(
            `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`
        );

        if (!res.ok) return { error: `Error de API: ${res.status}` };

        const data = await res.json();
        const games = data.response?.games || [];

        return games.map(g => ({
            appId: g.appid,
            name: g.name,
            playtimeForever: g.playtime_forever || 0,
            playtime2weeks: g.playtime_2weeks || 0,
            iconUrl: g.img_icon_url 
                ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
                : null
        }));
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Obtiene amigos del usuario
 */
async function getFriendList(steamId, apiKey) {
    try {
        const res = await fetch(
            `https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${apiKey}&steamid=${steamId}&relationship=friend`
        );

        if (!res.ok) {
            if (res.status === 401) return { error: 'Perfil privado' };
            return { error: `Error: ${res.status}` };
        }

        const data = await res.json();
        return data.friendslist?.friends || [];
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Obtiene logros de un juego
 */
async function getPlayerAchievements(steamId, appId, apiKey) {
    try {
        const res = await fetch(
            `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${apiKey}&steamid=${steamId}&appid=${appId}`
        );

        if (!res.ok) return { error: `Error: ${res.status}` };

        const data = await res.json();
        const achievements = data.playerstats?.achievements || [];

        const unlocked = achievements.filter(a => a.achieved === 1);
        const total = achievements.length;

        return {
            total,
            unlocked: unlocked.length,
            percentage: total > 0 ? Math.round((unlocked.length / total) * 100) : 0,
            achievements: unlocked.slice(0, 5).map(a => a.name)
        };
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Obtiene información de un juego específico
 */
async function getAppDetails(appId) {
    try {
        const res = await fetch(
            `https://store.steampowered.com/api/appdetails?appids=${appId}`
        );

        const data = await res.json();
        const app = data[appId];

        if (!app?.success) return { error: 'Juego no encontrado' };

        return app.data;
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Obtiene usuarios jugando un juego
 */
async function getCurrentPlayers(appId, apiKey) {
    try {
        const res = await fetch(
            `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?key=${apiKey}&appid=${appId}`
        );

        const data = await res.json();
        return data.response?.player_count || 0;
    } catch (e) {
        return 0;
    }
}

// ═══════════════════════════════════════════════════
//  GESTIÓN DE CUENTAS
// ═══════════════════════════════════════════════════

/**
 * Vincula una cuenta de Steam
 */
async function linkSteamAccount(userId, guildId, input, apiKey) {
    const steamId = await resolveSteamId(input, apiKey);

    if (!steamId) {
        return { success: false, error: 'No se pudo encontrar la cuenta de Steam' };
    }

    const profile = await getSteamProfile(steamId, apiKey);

    if (profile.error) {
        return { success: false, error: profile.error };
    }

    // Guardar en base de datos
    const result = _db.prepare(`
        INSERT OR REPLACE INTO steam_accounts 
        (user_id, guild_id, steam_id, steam_name, avatar_url, profile_url, linked_at, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, guildId, profile.steamId, profile.personaName, profile.avatar, profile.profileUrl, Date.now(), Date.now());

    // Obtener y guardar juegos
    const games = await getOwnedGames(steamId, apiKey);
    if (!games.error && games.length > 0) {
        const insertGame = _db.prepare(`
            INSERT OR REPLACE INTO steam_games 
            (steam_account_id, app_id, name, playtime_forever, playtime_2weeks, img_icon_url, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const game of games.slice(0, 100)) { // Limitar a 100 juegos
            insertGame.run(
                result.lastInsertRowid,
                game.appId,
                game.name,
                game.playtimeForever,
                game.playtime2weeks || 0,
                game.iconUrl,
                Date.now()
            );
        }
    }

    return { success: true, profile };
}

/**
 * Desvincula la cuenta de Steam
 */
function unlinkSteamAccount(userId, guildId) {
    const account = _db.prepare('SELECT id FROM steam_accounts WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
    
    if (account) {
        _db.prepare('DELETE FROM steam_games WHERE steam_account_id = ?').run(account.id);
    }

    return _db.prepare('DELETE FROM steam_accounts WHERE user_id = ? AND guild_id = ?')
        .run(userId, guildId).changes > 0;
}

/**
 * Obtiene la cuenta vinculada
 */
function getLinkedSteamAccount(userId, guildId) {
    const account = _db.prepare('SELECT * FROM steam_accounts WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
    
    if (account) {
        account.games = _db.prepare(`
            SELECT * FROM steam_games 
            WHERE steam_account_id = ? 
            ORDER BY playtime_forever DESC 
            LIMIT 20
        `).all(account.id);
    }

    return account;
}

// ═══════════════════════════════════════════════════
//  EMBEDS
// ═══════════════════════════════════════════════════

const STATUS_EMOJIS = {
    0: '�Offline',      // Offline
    1: '🟢 Online',     // Online
    2: '🎮 In-Game',    // In-game
    3: '🔴 Away',       // Away
    4: '💤 Snooze',     // Snooze
    5: '💼 Trading',    // Looking to trade
    6: '🎯 PlayTogether' // Looking to play
};

/**
 * Genera embed de perfil de Steam
 */
async function generateSteamProfileEmbed(account, apiKey) {
    const profile = await getSteamProfile(account.steam_id, apiKey);

    if (profile.error) {
        return { error: profile.error };
    }

    const statusEmoji = STATUS_EMOJIS[profile.personaState] || '❓';
    const currentlyPlaying = profile.gameExtraInfo 
        ? `\n🎮 Jugando: **${profile.gameExtraInfo}**`
        : '';

    const embed = new EmbedBuilder()
        .setColor(0x1b2838)
        .setTitle(` Steam - ${profile.personaName}`)
        .setURL(profile.profileUrl)
        .setThumbnail(profile.avatar)
        .setDescription(`${statusEmoji}${currentlyPlaying}`)
        .addFields(
            { name: '🆔 Steam ID', value: profile.steamId, inline: true },
            { name: '🌐 País', value: profile.countryCode || 'N/A', inline: true }
        );

    // Añadir juegos si están disponibles localmente
    if (account.games && account.games.length > 0) {
        const totalPlaytime = account.games.reduce((sum, g) => sum + (g.playtime_forever || 0), 0);
        const topGames = account.games.slice(0, 5);

        embed.addFields(
            { name: '📚 Juegos', value: `${account.games.length} juegos`, inline: true },
            { name: '⏱️ Tiempo total', value: `${Math.round(totalPlaytime / 60)} horas`, inline: true },
            { 
                name: '🏆 Top Jugados', 
                value: topGames.map((g, i) => 
                    `${i + 1}. **${g.name}** - ${Math.round(g.playtime_forever / 60)}h`
                ).join('\n'),
                inline: false 
            }
        );
    }

    if (profile.timeCreated) {
        embed.addFields({
            name: '📅 Miembro desde',
            value: new Date(profile.timeCreated * 1000).toLocaleDateString('es-AR'),
            inline: true
        });
    }

    embed.setFooter({ text: 'Steam Integration' }).setTimestamp();

    return embed;
}

/**
 * Genera embed de biblioteca de juegos
 */
function generateLibraryEmbed(account, page = 0, perPage = 10) {
    if (!account.games || account.games.length === 0) {
        return { error: 'No hay juegos en la biblioteca' };
    }

    const totalPages = Math.ceil(account.games.length / perPage);
    const start = page * perPage;
    const games = account.games.slice(start, start + perPage);

    const embed = new EmbedBuilder()
        .setColor(0x1b2838)
        .setTitle(`📚 Biblioteca de ${account.steam_name}`)
        .setDescription(
            games.map((g, i) => {
                const playtime = Math.round(g.playtime_forever / 60);
                return `${start + i + 1}. **${g.name}**\n   ⏱️ ${playtime} horas jugadas`;
            }).join('\n\n')
        )
        .setFooter({ text: `Página ${page + 1}/${totalPages} · ${account.games.length} juegos` })
        .setTimestamp();

    return embed;
}

/**
 * Genera embed de un juego específico
 */
async function generateGameEmbed(appId, steamId = null, apiKey = null) {
    const [details, players] = await Promise.all([
        getAppDetails(appId),
        apiKey ? getCurrentPlayers(appId, apiKey) : 0
    ]);

    if (details.error) {
        return { error: details.error };
    }

    const embed = new EmbedBuilder()
        .setColor(0x1b2838)
        .setTitle(details.name)
        .setURL(`https://store.steampowered.com/app/${appId}`)
        .setThumbnail(details.header_image)
        .setDescription(details.short_description?.substring(0, 200) || 'Sin descripción')
        .addFields(
            { name: '💰 Precio', value: details.is_free ? 'Gratis' : (details.price_overview?.final_formatted || 'N/A'), inline: true },
            { name: '👥 Jugando ahora', value: players.toLocaleString(), inline: true },
            { name: '⭐ Reviews', value: details.metacritic?.score ? `${details.metacritic.score}/100` : 'N/A', inline: true }
        );

    if (details.genres?.length > 0) {
        embed.addFields({
            name: '🏷️ Géneros',
            value: details.genres.slice(0, 5).map(g => g.description).join(', '),
            inline: false
        });
    }

    embed.setFooter({ text: details.developers?.[0] || 'Desarrollador desconocido' });

    return embed;
}

// ═══════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════

module.exports = {
    // API
    resolveSteamId,
    getSteamProfile,
    getOwnedGames,
    getFriendList,
    getPlayerAchievements,
    getAppDetails,
    getCurrentPlayers,
    // Gestión de cuentas
    linkSteamAccount,
    unlinkSteamAccount,
    getLinkedSteamAccount,
    // Embeds
    generateSteamProfileEmbed,
    generateLibraryEmbed,
    generateGameEmbed,
    // Constantes
    STATUS_EMOJIS
};
