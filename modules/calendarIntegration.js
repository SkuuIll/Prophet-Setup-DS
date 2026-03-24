// ═══════════════════════════════════════════════════
//  MÓDULO: calendarIntegration.js
//  Integración con calendarios y eventos
// ═══════════════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { stmts, _db } = require('../database');

// Crear tablas para eventos y calendarios
_db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        event_type TEXT DEFAULT 'general',
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
        location TEXT,
        image_url TEXT,
        recurring TEXT,
        recurring_end INTEGER,
        discord_event_id TEXT,
        discord_channel_id TEXT,
        discord_message_id TEXT,
        reminder_sent INTEGER DEFAULT 0,
        created_by TEXT,
        created_at INTEGER,
        updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS event_participants (
        event_id INTEGER,
        user_id TEXT NOT NULL,
        status TEXT DEFAULT 'interested',
        joined_at INTEGER,
        PRIMARY KEY (event_id, user_id),
        FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS calendar_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        name TEXT NOT NULL,
        calendar_type TEXT DEFAULT 'discord',
        google_calendar_id TEXT,
        discord_channel_id TEXT,
        sync_enabled INTEGER DEFAULT 1,
        last_sync INTEGER,
        created_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_events_guild ON calendar_events(guild_id);
    CREATE INDEX IF NOT EXISTS idx_events_time ON calendar_events(start_time);
    CREATE INDEX IF NOT EXISTS idx_events_recurring ON calendar_events(recurring);
`);

// ═══════════════════════════════════════════════════
//  GESTIÓN DE EVENTOS
// ═══════════════════════════════════════════════════

/**
 * Crea un nuevo evento
 */
function createEvent(guildId, eventData, userId = null) {
    const now = Date.now();
    const result = _db.prepare(`
        INSERT INTO calendar_events 
        (guild_id, title, description, event_type, start_time, end_time, timezone, location, image_url, recurring, recurring_end, discord_channel_id, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        guildId,
        eventData.title,
        eventData.description || null,
        eventData.eventType || 'general',
        eventData.startTime,
        eventData.endTime || null,
        eventData.timezone || 'America/Argentina/Buenos_Aires',
        eventData.location || null,
        eventData.imageUrl || null,
        eventData.recurring || null,
        eventData.recurringEnd || null,
        eventData.discordChannelId || null,
        userId,
        now,
        now
    );

    const eventId = Number(result.lastInsertRowid);

    // Si es recurrente, programar instancias futuras
    if (eventData.recurring) {
        scheduleRecurringEvents(eventId, eventData);
    }

    return getEvent(eventId);
}

/**
 * Obtiene un evento por ID
 */
function getEvent(eventId) {
    const event = _db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(eventId);
    if (event) {
        event.participants = getEventParticipants(eventId);
    }
    return event;
}

/**
 * Actualiza un evento
 */
function updateEvent(eventId, eventData, guildId = null) {
    const event = getEvent(eventId);
    if (!event) return null;

    if (guildId && event.guild_id !== guildId) return null;

    const now = Date.now();
    _db.prepare(`
        UPDATE calendar_events 
        SET title = COALESCE(?, title),
            description = COALESCE(?, description),
            event_type = COALESCE(?, event_type),
            start_time = COALESCE(?, start_time),
            end_time = COALESCE(?, end_time),
            location = COALESCE(?, location),
            image_url = COALESCE(?, image_url),
            recurring = COALESCE(?, recurring),
            updated_at = ?
        WHERE id = ?
    `).run(
        eventData.title || null,
        eventData.description || null,
        eventData.eventType || null,
        eventData.startTime || null,
        eventData.endTime || null,
        eventData.location || null,
        eventData.imageUrl || null,
        eventData.recurring || null,
        now,
        eventId
    );

    return getEvent(eventId);
}

/**
 * Elimina un evento
 */
function deleteEvent(eventId, guildId = null) {
    const query = guildId
        ? 'DELETE FROM calendar_events WHERE id = ? AND guild_id = ?'
        : 'DELETE FROM calendar_events WHERE id = ?';
    const params = guildId ? [eventId, guildId] : [eventId];

    return _db.prepare(query).run(...params).changes > 0;
}

/**
 * Lista eventos de un servidor
 */
function listEvents(guildId, options = {}) {
    let query = 'SELECT * FROM calendar_events WHERE guild_id = ?';
    const params = [guildId];

    if (options.upcoming) {
        query += ' AND start_time >= ?';
        params.push(Date.now());
    }

    if (options.type) {
        query += ' AND event_type = ?';
        params.push(options.type);
    }

    query += ' ORDER BY start_time ASC';

    if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
    }

    return _db.prepare(query).all(...params);
}

/**
 * Obtiene eventos próximos (para recordatorios)
 */
function getUpcomingEvents(guildId, withinMs = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    const endTime = now + withinMs;

    return _db.prepare(`
        SELECT * FROM calendar_events 
        WHERE guild_id = ? 
        AND start_time BETWEEN ? AND ?
        AND reminder_sent = 0
        ORDER BY start_time ASC
    `).all(guildId, now, endTime);
}

// ═══════════════════════════════════════════════════
//  PARTICIPANTES
// ═══════════════════════════════════════════════════

/**
 * Añade participante a un evento
 */
function addParticipant(eventId, userId, status = 'interested') {
    _db.prepare(`
        INSERT OR REPLACE INTO event_participants (event_id, user_id, status, joined_at)
        VALUES (?, ?, ?, ?)
    `).run(eventId, userId, status, Date.now());
}

/**
 * Remueve participante de un evento
 */
function removeParticipant(eventId, userId) {
    return _db.prepare('DELETE FROM event_participants WHERE event_id = ? AND user_id = ?')
        .run(eventId, userId).changes > 0;
}

/**
 * Obtiene participantes de un evento
 */
function getEventParticipants(eventId) {
    return _db.prepare('SELECT * FROM event_participants WHERE event_id = ?').all(eventId);
}

/**
 * Cuenta participantes
 */
function countParticipants(eventId, status = null) {
    if (status) {
        return _db.prepare('SELECT COUNT(*) as count FROM event_participants WHERE event_id = ? AND status = ?')
            .get(eventId, status).count;
    }
    return _db.prepare('SELECT COUNT(*) as count FROM event_participants WHERE event_id = ?')
        .get(eventId).count;
}

// ═══════════════════════════════════════════════════
//  EVENTOS RECURRENTES
// ═══════════════════════════════════════════════════

/**
 * Programa instancias de eventos recurrentes
 */
function scheduleRecurringEvents(parentEventId, eventData) {
    const { recurring, recurringEnd, startTime } = eventData;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const ONE_WEEK = 7 * ONE_DAY;

    let interval = 0;
    switch (recurring) {
        case 'daily': interval = ONE_DAY; break;
        case 'weekly': interval = ONE_WEEK; break;
        case 'biweekly': interval = 2 * ONE_WEEK; break;
        case 'monthly': interval = 30 * ONE_DAY; break;
    }

    if (interval === 0 || !recurringEnd) return;

    let nextTime = startTime + interval;
    const events = [];

    while (nextTime < recurringEnd) {
        events.push({
            ...eventData,
            startTime: nextTime,
            endTime: eventData.endTime ? eventData.endTime + interval : null,
            recurring: null, // Las instancias no son recurrentes
            recurringEnd: null
        });
        nextTime += interval;
    }

    return events;
}

/**
 * Procesa eventos recurrentes
 */
function processRecurringEvents() {
    const now = Date.now();
    
    // Obtener eventos recurrentes que ya pasaron
    const expiredRecurring = _db.prepare(`
        SELECT * FROM calendar_events 
        WHERE recurring IS NOT NULL 
        AND start_time < ?
        AND (recurring_end IS NULL OR recurring_end > ?)
    `).all(now, now);

    for (const event of expiredRecurring) {
        // Crear siguiente instancia
        const nextEvent = calculateNextOccurrence(event);
        if (nextEvent) {
            createEvent(event.guild_id, {
                ...event,
                startTime: nextEvent.startTime,
                endTime: nextEvent.endTime,
                recurring: null,
                recurringEnd: null
            }, event.created_by);
        }

        // Marcar el original como no recurrente para no procesarlo de nuevo
        _db.prepare('UPDATE calendar_events SET recurring = NULL WHERE id = ?').run(event.id);
    }
}

/**
 * Calcula la próxima ocurrencia de un evento recurrente
 */
function calculateNextOccurrence(event) {
    const { recurring, start_time, end_time, recurring_end } = event;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const ONE_WEEK = 7 * ONE_DAY;

    let interval = 0;
    switch (recurring) {
        case 'daily': interval = ONE_DAY; break;
        case 'weekly': interval = ONE_WEEK; break;
        case 'biweekly': interval = 2 * ONE_WEEK; break;
        case 'monthly': interval = 30 * ONE_DAY; break;
    }

    if (interval === 0) return null;

    const nextStart = start_time + interval;
    const nextEnd = end_time ? end_time + interval : null;

    if (recurring_end && nextStart > recurring_end) return null;

    return { startTime: nextStart, endTime: nextEnd };
}

// ═══════════════════════════════════════════════════
//  INTEGRACIÓN CON DISCORD SCHEDULED EVENTS
// ═══════════════════════════════════════════════════

/**
 * Sincroniza con Discord Scheduled Events
 */
async function syncWithDiscordEvents(guild, channelId = null) {
    try {
        const discordEvents = await guild.scheduledEvents.fetch();
        let synced = 0;

        for (const [eventId, event] of discordEvents) {
            // Verificar si ya existe en nuestra DB
            const existing = _db.prepare(`
                SELECT id FROM calendar_events 
                WHERE guild_id = ? AND discord_event_id = ?
            `).get(guild.id, eventId);

            if (!existing) {
                createEvent(guild.id, {
                    title: event.name,
                    description: event.description,
                    eventType: 'discord',
                    startTime: event.scheduledStartTimestamp,
                    endTime: event.scheduledEndTimestamp,
                    location: event.entityType === 3 ? event.entityMetadata?.location : null,
                    discordEventId: eventId,
                    discordChannelId: channelId
                });

                synced++;
            }
        }

        return { success: true, synced };
    } catch (e) {
        console.error('[Calendar] Discord sync error:', e.message);
        return { success: false, error: e.message };
    }
}

/**
 * Crea un Discord Scheduled Event desde nuestro evento
 */
async function createDiscordEvent(guild, event) {
    try {
        const options = {
            name: event.title,
            description: event.description || undefined,
            scheduledStartTime: event.start_time,
            scheduledEndTime: event.end_time || undefined,
            privacyLevel: 2, // GUILD_ONLY
            entityType: 3, // EXTERNAL
            entityMetadata: event.location ? { location: event.location } : undefined
        };

        const discordEvent = await guild.scheduledEvents.create(options);

        // Guardar referencia
        _db.prepare('UPDATE calendar_events SET discord_event_id = ? WHERE id = ?')
            .run(discordEvent.id, event.id);

        return { success: true, discordEvent };
    } catch (e) {
        console.error('[Calendar] Discord event creation error:', e.message);
        return { success: false, error: e.message };
    }
}

// ═══════════════════════════════════════════════════
//  EMBEDS
// ═══════════════════════════════════════════════════

const EVENT_TYPE_EMOJIS = {
    'general': '📅',
    'gaming': '🎮',
    'tournament': '🏆',
    'stream': '📺',
    'community': '👥',
    'meeting': '💼',
    'announcement': '📢',
    'discord': '💎'
};

const STATUS_EMOJIS = {
    'going': '✅',
    'interested': '⭐',
    'not_going': '❌'
};

/**
 * Formatea fecha y hora
 */
function formatDateTime(timestamp, timezone = 'America/Argentina/Buenos_Aires') {
    return new Intl.DateTimeFormat('es-AR', {
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(timestamp));
}

/**
 * Formatea tiempo relativo
 */
function formatRelativeTime(timestamp) {
    const diff = timestamp - Date.now();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

    if (diff < 0) return 'Ya pasó';
    if (days > 0) return `en ${days}d ${hours}h`;
    if (hours > 0) return `en ${hours}h ${minutes}m`;
    return `en ${minutes} minutos`;
}

/**
 * Genera embed de evento
 */
function generateEventEmbed(event) {
    const emoji = EVENT_TYPE_EMOJIS[event.event_type] || '📅';
    const participants = getEventParticipants(event.id);
    const going = participants.filter(p => p.status === 'going').length;
    const interested = participants.filter(p => p.status === 'interested').length;

    const embed = new EmbedBuilder()
        .setColor(event.event_type === 'tournament' ? 0xFFD700 : 
                  event.event_type === 'gaming' ? 0x5865F2 : 0x00AE86)
        .setTitle(`${emoji} ${event.title}`)
        .setDescription(event.description || 'Sin descripción')
        .addFields(
            { 
                name: '🕐 Cuándo', 
                value: `${formatDateTime(event.start_time, event.timezone)}\n_${formatRelativeTime(event.start_time)}_`,
                inline: true 
            },
            { 
                name: '📍 Dónde', 
                value: event.location || 'Sin ubicación definida',
                inline: true 
            },
            { 
                name: '👥 Participantes', 
                value: `✅ ${going} yendo\n⭐ ${interested} interesados`,
                inline: true 
            }
        );

    if (event.recurring) {
        embed.addFields({
            name: '🔄 Recurrente',
            value: event.recurring.charAt(0).toUpperCase() + event.recurring.slice(1),
            inline: true
        });
    }

    if (event.image_url) {
        embed.setImage(event.image_url);
    }

    embed.setFooter({ text: `ID: ${event.id}` }).setTimestamp();

    return embed;
}

/**
 * Genera embed de lista de eventos
 */
function generateEventListEmbed(events, title = '📅 Próximos Eventos') {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(title)
        .setDescription(
            events.length === 0 
                ? 'No hay eventos programados'
                : events.map(e => {
                    const emoji = EVENT_TYPE_EMOJIS[e.event_type] || '📅';
                    return `${emoji} **${e.title}**\n${formatDateTime(e.start_time, e.timezone)}\n_${formatRelativeTime(e.start_time)}_`;
                }).join('\n\n')
        )
        .setTimestamp();

    return embed;
}

// ═══════════════════════════════════════════════════
//  RECORDATORIOS AUTOMÁTICOS
// ═══════════════════════════════════════════════════

/**
 * Envía recordatorios de eventos próximos
 */
async function sendEventReminders(client, guildId) {
    const events = getUpcomingEvents(guildId, 60 * 60 * 1000); // 1 hora

    for (const event of events) {
        const channel = event.discord_channel_id 
            ? await client.channels.fetch(event.discord_channel_id).catch(() => null)
            : null;

        if (channel) {
            const embed = generateEventEmbed(event);
            const participants = getEventParticipants(event.id);
            const mentions = participants
                .filter(p => p.status === 'going')
                .map(p => `<@${p.user_id}>`)
                .join(' ');

            await channel.send({
                content: `📢 **Recordatorio: El evento comienza pronto!** ${mentions}`,
                embeds: [embed]
            }).catch(() => {});

            // Marcar como enviado
            _db.prepare('UPDATE calendar_events SET reminder_sent = 1 WHERE id = ?').run(event.id);
        }
    }
}

// ═══════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════

module.exports = {
    // Gestión de eventos
    createEvent,
    getEvent,
    updateEvent,
    deleteEvent,
    listEvents,
    getUpcomingEvents,
    // Participantes
    addParticipant,
    removeParticipant,
    getEventParticipants,
    countParticipants,
    // Recurrentes
    processRecurringEvents,
    calculateNextOccurrence,
    // Discord Events
    syncWithDiscordEvents,
    createDiscordEvent,
    // Embeds
    generateEventEmbed,
    generateEventListEmbed,
    formatDateTime,
    formatRelativeTime,
    // Recordatorios
    sendEventReminders,
    // Constantes
    EVENT_TYPE_EMOJIS,
    STATUS_EMOJIS
};
