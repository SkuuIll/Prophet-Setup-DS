// ═══════════════════════════════════════════════════
//  MÓDULO: staffToolsIntegration.js
//  Integración con herramientas de staff (Notion, Trello)
// ═══════════════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const { stmts, _db } = require('../database');

// Crear tablas para integraciones
_db.exec(`
    CREATE TABLE IF NOT EXISTS notion_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        workspace_name TEXT,
        database_id TEXT,
        access_token TEXT,
        last_sync INTEGER,
        sync_enabled INTEGER DEFAULT 1,
        created_at INTEGER,
        UNIQUE(guild_id)
    );

    CREATE TABLE IF NOT EXISTS trello_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        board_id TEXT,
        board_name TEXT,
        api_key TEXT,
        api_token TEXT,
        list_ids TEXT,
        last_sync INTEGER,
        sync_enabled INTEGER DEFAULT 1,
        created_at INTEGER,
        UNIQUE(guild_id)
    );

    CREATE TABLE IF NOT EXISTS synced_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        platform_item_id TEXT NOT NULL,
        discord_type TEXT NOT NULL,
        discord_id TEXT,
        title TEXT,
        status TEXT,
        url TEXT,
        synced_at INTEGER,
        UNIQUE(platform, platform_item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_synced_guild ON synced_items(guild_id);
`);

// ═══════════════════════════════════════════════════
//  NOTION INTEGRATION
// ═══════════════════════════════════════════════════

/**
 * Configura Notion para un servidor
 */
function configureNotion(guildId, accessToken, databaseId, workspaceName = null) {
    _db.prepare(`
        INSERT OR REPLACE INTO notion_configs 
        (guild_id, workspace_name, database_id, access_token, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(guildId, workspaceName, databaseId, accessToken, Date.now());

    return { success: true };
}

/**
 * Obtiene la configuración de Notion
 */
function getNotionConfig(guildId) {
    return _db.prepare('SELECT * FROM notion_configs WHERE guild_id = ?').get(guildId);
}

/**
 * Desactiva Notion
 */
function disableNotion(guildId) {
    return _db.prepare('DELETE FROM notion_configs WHERE guild_id = ?').run(guildId).changes > 0;
}

/**
 * Busca en una base de datos de Notion
 */
async function searchNotionDatabase(config, query) {
    try {
        const res = await fetch('https://api.notion.com/v1/databases/' + config.database_id + '/query', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.access_token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filter: query ? {
                    or: [
                        { property: 'Name', title: { contains: query } },
                        { property: 'Title', title: { contains: query } }
                    ]
                } : undefined,
                page_size: 20
            })
        });

        if (!res.ok) {
            const error = await res.json();
            return { error: error.message || `Error: ${res.status}` };
        }

        const data = await res.json();
        return data.results.map(page => ({
            id: page.id,
            title: page.properties.Name?.title?.[0]?.plain_text || 
                   page.properties.Title?.title?.[0]?.plain_text || 
                   'Sin título',
            status: page.properties.Status?.select?.name || 
                    page.properties.Estado?.select?.name || 
                    null,
            url: page.url,
            lastEdited: page.last_edited_time
        }));
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Crea una página en Notion
 */
async function createNotionPage(config, title, content, properties = {}) {
    try {
        const res = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.access_token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                parent: { database_id: config.database_id },
                properties: {
                    Name: { title: [{ text: { content: title } }] },
                    ...properties
                }
            })
        });

        if (!res.ok) {
            const error = await res.json();
            return { error: error.message || `Error: ${res.status}` };
        }

        const data = await res.json();
        return { 
            success: true, 
            pageId: data.id, 
            url: data.url 
        };
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Sincroniza tickets con Notion
 */
async function syncTicketsToNotion(guildId, tickets) {
    const config = getNotionConfig(guildId);
    if (!config) return { error: 'Notion no configurado' };

    const synced = [];

    for (const ticket of tickets) {
        // Verificar si ya está sincronizado
        const existing = _db.prepare(`
            SELECT * FROM synced_items 
            WHERE platform = 'notion' AND discord_id = ?
        `).get(ticket.channel_id);

        if (!existing) {
            const result = await createNotionPage(config, 
                `Ticket: ${ticket.user_id}`,
                ticket.reason || 'Sin descripción',
                {
                    Status: { select: { name: 'Open' } },
                    UserID: { rich_text: [{ text: { content: ticket.user_id } }] }
                }
            );

            if (result.success) {
                _db.prepare(`
                    INSERT INTO synced_items 
                    (guild_id, platform, platform_item_id, discord_type, discord_id, title, status, url, synced_at)
                    VALUES (?, 'notion', ?, 'ticket', ?, ?, 'open', ?, ?)
                `).run(guildId, result.pageId, ticket.channel_id, `Ticket: ${ticket.user_id}`, result.url, Date.now());

                synced.push(result);
            }
        }
    }

    return { success: true, synced: synced.length };
}

// ═══════════════════════════════════════════════════
//  TRELLO INTEGRATION
// ═══════════════════════════════════════════════════

/**
 * Configura Trello para un servidor
 */
function configureTrello(guildId, apiKey, apiToken, boardId, boardName, listIds = {}) {
    _db.prepare(`
        INSERT OR REPLACE INTO trello_configs 
        (guild_id, board_id, board_name, api_key, api_token, list_ids, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(guildId, boardId, boardName, apiKey, apiToken, JSON.stringify(listIds), Date.now());

    return { success: true };
}

/**
 * Obtiene la configuración de Trello
 */
function getTrelloConfig(guildId) {
    const config = _db.prepare('SELECT * FROM trello_configs WHERE guild_id = ?').get(guildId);
    if (config) {
        config.listIds = JSON.parse(config.list_ids || '{}');
    }
    return config;
}

/**
 * Desactiva Trello
 */
function disableTrello(guildId) {
    return _db.prepare('DELETE FROM trello_configs WHERE guild_id = ?').run(guildId).changes > 0;
}

/**
 * Obtiene tableros de Trello
 */
async function getTrelloBoards(apiKey, apiToken) {
    try {
        const res = await fetch(
            `https://api.trello.com/1/members/me/boards?key=${apiKey}&token=${apiToken}`
        );

        if (!res.ok) return { error: `Error: ${res.status}` };

        const boards = await res.json();
        return boards.map(b => ({
            id: b.id,
            name: b.name,
            url: b.url,
            lists: b.lists
        }));
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Obtiene listas de un tablero
 */
async function getTrelloLists(boardId, apiKey, apiToken) {
    try {
        const res = await fetch(
            `https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${apiToken}`
        );

        if (!res.ok) return { error: `Error: ${res.status}` };

        return await res.json();
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Crea una tarjeta en Trello
 */
async function createTrelloCard(config, listId, name, description = '', labels = []) {
    try {
        const params = new URLSearchParams({
            key: config.api_key,
            token: config.api_token,
            idList: listId,
            name,
            desc: description
        });

        if (labels.length > 0) {
            params.append('idLabels', labels.join(','));
        }

        const res = await fetch(`https://api.trello.com/1/cards?${params}`, {
            method: 'POST'
        });

        if (!res.ok) {
            const error = await res.json();
            return { error: error.message || `Error: ${res.status}` };
        }

        const card = await res.json();
        return { 
            success: true, 
            cardId: card.id, 
            url: card.url,
            shortUrl: card.shortUrl
        };
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Obtiene tarjetas de un tablero
 */
async function getTrelloCards(config) {
    try {
        const res = await fetch(
            `https://api.trello.com/1/boards/${config.board_id}/cards?key=${config.api_key}&token=${config.api_token}`
        );

        if (!res.ok) return { error: `Error: ${res.status}` };

        const cards = await res.json();
        return cards.map(c => ({
            id: c.id,
            name: c.name,
            desc: c.desc,
            url: c.url,
            shortUrl: c.shortUrl,
            listId: c.idList,
            labels: c.labels?.map(l => l.name) || [],
            due: c.due
        }));
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Actualiza una tarjeta
 */
async function updateTrelloCard(config, cardId, updates) {
    try {
        const params = new URLSearchParams({
            key: config.api_key,
            token: config.api_token,
            ...updates
        });

        const res = await fetch(`https://api.trello.com/1/cards/${cardId}?${params}`, {
            method: 'PUT'
        });

        if (!res.ok) return { error: `Error: ${res.status}` };

        return { success: true };
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Mueve una tarjeta a otra lista
 */
async function moveTrelloCard(config, cardId, listId) {
    return updateTrelloCard(config, cardId, { idList: listId });
}

/**
 * Sincroniza reportes con Trello
 */
async function syncReportsToTrello(guildId, reports) {
    const config = getTrelloConfig(guildId);
    if (!config) return { error: 'Trello no configurado' };

    const listId = config.listIds.reports;
    if (!listId) return { error: 'Lista de reportes no configurada' };

    const synced = [];

    for (const report of reports) {
        const existing = _db.prepare(`
            SELECT * FROM synced_items 
            WHERE platform = 'trello' AND discord_id = ?
        `).get(`report_${report.id}`);

        if (!existing) {
            const result = await createTrelloCard(config, listId,
                `Reporte: ${report.user_id}`,
                report.reason || 'Sin descripción',
                ['red'] // Label rojo para reportes
            );

            if (result.success) {
                _db.prepare(`
                    INSERT INTO synced_items 
                    (guild_id, platform, platform_item_id, discord_type, discord_id, title, status, url, synced_at)
                    VALUES (?, 'trello', ?, 'report', ?, ?, 'open', ?, ?)
                `).run(guildId, result.cardId, `report_${report.id}`, `Reporte: ${report.user_id}`, result.url, Date.now());

                synced.push(result);
            }
        }
    }

    return { success: true, synced: synced.length };
}

// ═══════════════════════════════════════════════════
//  EMBEDS
// ═══════════════════════════════════════════════════

/**
 * Genera embed de estado de sincronización
 */
function generateSyncStatusEmbed(guildId) {
    const notionConfig = getNotionConfig(guildId);
    const trelloConfig = getTrelloConfig(guildId);

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🔄 Estado de Sincronización')
        .addFields(
            { 
                name: '📝 Notion', 
                value: notionConfig 
                    ? `✅ Configurado\nBase de datos: ${notionConfig.database_id?.substring(0, 8)}...`
                    : '❌ No configurado',
                inline: true 
            },
            { 
                name: '📋 Trello', 
                value: trelloConfig 
                    ? `✅ Configurado\nTablero: ${trelloConfig.board_name || 'N/A'}`
                    : '❌ No configurado',
                inline: true 
            }
        )
        .setTimestamp();

    return embed;
}

/**
 * Genera embed de items sincronizados
 */
function generateSyncedItemsEmbed(guildId, type = null) {
    let query = 'SELECT * FROM synced_items WHERE guild_id = ?';
    const params = [guildId];

    if (type) {
        query += ' AND discord_type = ?';
        params.push(type);
    }

    query += ' ORDER BY synced_at DESC LIMIT 20';

    const items = _db.prepare(query).all(...params);

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📦 Items Sincronizados')
        .setDescription(
            items.length === 0 
                ? 'No hay items sincronizados'
                : items.map(i => 
                    `${i.discord_type === 'ticket' ? '🎫' : '📢'} **${i.title}**\n[${i.platform}] ${i.url}`
                ).join('\n\n')
        )
        .setTimestamp();

    return embed;
}

// ═══════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════

module.exports = {
    // Notion
    configureNotion,
    getNotionConfig,
    disableNotion,
    searchNotionDatabase,
    createNotionPage,
    syncTicketsToNotion,
    // Trello
    configureTrello,
    getTrelloConfig,
    disableTrello,
    getTrelloBoards,
    getTrelloLists,
    createTrelloCard,
    getTrelloCards,
    updateTrelloCard,
    moveTrelloCard,
    syncReportsToTrello,
    // Embeds
    generateSyncStatusEmbed,
    generateSyncedItemsEmbed
};
