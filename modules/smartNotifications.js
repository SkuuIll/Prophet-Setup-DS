// ═══════════════════════════════════════════════════════════════
// SISTEMA DE NOTIFICACIONES INTELIGENTES
// Prophet Bot v2.9
// ═══════════════════════════════════════════════════════════════

const { _db: db } = require('../database');

// Tipos de notificaciones disponibles
const NOTIFICATION_TYPES = {
    STREAMER_LIVE: 'streamer_live',
    RAID_CREATED: 'raid_created',
    SERVER_ACTIVITY: 'server_activity',
    PROGRESS_SUMMARY: 'progress_summary',
    MENTION_KEYWORDS: 'mention_keywords',
    EVENT_REMINDER: 'event_reminder',
    QUEST_COMPLETE: 'quest_complete',
    ACHIEVEMENT_UNLOCK: 'achievement_unlock',
    LEVEL_UP: 'level_up',
    NEW_FEATURE: 'new_feature'
};

// ═══ GESTIÓN DE PREFERENCIAS ═══

function getUserPreferences(userId) {
    return db.prepare(`
        SELECT * FROM user_notifications 
        WHERE user_id = ? AND enabled = 1
    `).all(userId);
}

function setNotificationPreference(userId, type, target, config = {}) {
    const existing = db.prepare(`
        SELECT id FROM user_notifications 
        WHERE user_id = ? AND type = ? AND target = ?
    `).get(userId, type, target);

    if (existing) {
        return db.prepare(`
            UPDATE user_notifications 
            SET config = ?, enabled = 1 
            WHERE id = ?
        `).run(JSON.stringify(config), existing.id);
    }

    return db.prepare(`
        INSERT INTO user_notifications (user_id, type, target, config, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(userId, type, target, JSON.stringify(config), Date.now());
}

function disableNotification(userId, type, target = null) {
    if (target) {
        return db.prepare(`
            UPDATE user_notifications SET enabled = 0 
            WHERE user_id = ? AND type = ? AND target = ?
        `).run(userId, type, target);
    }
    return db.prepare(`
        UPDATE user_notifications SET enabled = 0 
        WHERE user_id = ? AND type = ?
    `).run(userId, type);
}

function getSubscribersForType(type, target = null) {
    if (target) {
        return db.prepare(`
            SELECT user_id, config FROM user_notifications 
            WHERE type = ? AND target = ? AND enabled = 1
        `).all(type, target);
    }
    return db.prepare(`
        SELECT user_id, config FROM user_notifications 
        WHERE type = ? AND enabled = 1
    `).all(type);
}

// ═══ COLA DE NOTIFICACIONES ═══

function queueNotification(userId, type, title, message, data = {}, scheduledFor = null) {
    return db.prepare(`
        INSERT INTO notification_queue 
        (user_id, type, title, message, data, scheduled_for, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, type, title, message, JSON.stringify(data), scheduledFor, Date.now());
}

function getPendingNotifications(userId = null) {
    if (userId) {
        return db.prepare(`
            SELECT * FROM notification_queue 
            WHERE user_id = ? AND sent = 0 
            AND (scheduled_for IS NULL OR scheduled_for <= ?)
            ORDER BY created_at ASC
        `).all(userId, Date.now());
    }
    return db.prepare(`
        SELECT * FROM notification_queue 
        WHERE sent = 0 
        AND (scheduled_for IS NULL OR scheduled_for <= ?)
        ORDER BY created_at ASC
        LIMIT 100
    `).all(Date.now());
}

function markNotificationSent(notificationId) {
    return db.prepare(`UPDATE notification_queue SET sent = 1 WHERE id = ?`).run(notificationId);
}

function clearSentNotifications(olderThanDays = 7) {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    return db.prepare(`DELETE FROM notification_queue WHERE sent = 1 AND created_at < ?`).run(cutoff);
}

// ═══ ENVÍO DE NOTIFICACIONES ═══

async function sendNotification(client, userId, title, message, data = {}) {
    try {
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) return { success: false, error: 'User not found' };

        const { EmbedBuilder } = require('discord.js');
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(message)
            .setColor(data.color || 0xBB86FC)
            .setTimestamp();

        if (data.thumbnail) embed.setThumbnail(data.thumbnail);
        if (data.footer) embed.setFooter({ text: data.footer });

        await user.send({ embeds: [embed] });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function processNotificationQueue(client) {
    const notifications = getPendingNotifications();
    let sent = 0;
    let failed = 0;

    for (const notif of notifications) {
        const data = notif.data ? JSON.parse(notif.data) : {};
        const result = await sendNotification(client, notif.user_id, notif.title, notif.message, data);
        
        if (result.success) {
            markNotificationSent(notif.id);
            sent++;
        } else {
            failed++;
        }

        // Pequeña pausa para evitar rate limits
        await new Promise(r => setTimeout(r, 100));
    }

    return { sent, failed };
}

// ═══ NOTIFICACIONES ESPECÍFICAS ═══

async function notifyStreamerLive(client, streamerName, streamerInfo, guild) {
    const subscribers = getSubscribersForType(NOTIFICATION_TYPES.STREAMER_LIVE, streamerName);
    const config = require('../config');

    for (const sub of subscribers) {
        const userConfig = JSON.parse(sub.config || '{}');
        
        await queueNotification(
            sub.user_id,
            NOTIFICATION_TYPES.STREAMER_LIVE,
            `🔴 ${streamerName} está en vivo!`,
            `¡${streamerName} empezó a transmitir!\n[Jugar → ${streamerInfo.game || 'Jugando'}]\n[Título: ${streamerInfo.title || 'Sin título'}]`,
            {
                thumbnail: streamerInfo.thumbnail,
                url: `https://twitch.tv/${streamerName}`,
                color: 0x9146FF
            }
        );
    }

    // Procesar cola inmediatamente
    return processNotificationQueue(client);
}

async function notifyRaidCreated(client, raidInfo) {
    const subscribers = getSubscribersForType(NOTIFICATION_TYPES.RAID_CREATED);
    
    for (const sub of subscribers) {
        const userConfig = JSON.parse(sub.config || '{}');
        
        // Solo notificar si es del juego que le interesa
        if (userConfig.games && !userConfig.games.includes(raidInfo.game)) continue;

        await queueNotification(
            sub.user_id,
            NOTIFICATION_TYPES.RAID_CREATED,
            `🎮 Raid de ${raidInfo.game}`,
            `Se armó una raid para **${raidInfo.game}**\nHora: ${raidInfo.time}\nParticipantes: ${raidInfo.current}/${raidInfo.max}`,
            {
                color: 0x69F0AE,
                footer: 'Reacciona para unirte'
            }
        );
    }

    return processNotificationQueue(client);
}

async function notifyProgressSummary(client, userId) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return { success: false, error: 'User not found' };

    const { calculateLevel } = require('./leveling');
    const currentLevel = calculateLevel(user.xp);
    const nextLevel = calculateLevel(user.xp + 100);

    const summary = [
        `📊 **Resumen de tu progreso**`,
        ``,
        `⭐ Nivel: ${currentLevel.level}`,
        `✨ XP: ${user.xp.toLocaleString()}`,
        `💬 Mensajes: ${user.messages.toLocaleString()}`,
        `💰 Coins: ${(user.balance + user.bank).toLocaleString()}`,
        `🎤 Minutos en voz: ${user.voice_minutes || 0}`,
        ``,
        `🔥 Racha de mensajes: ${user.message_streak || 0} días`
    ].join('\n');

    return sendNotification(client, userId, '📈 Tu resumen diario', summary, {
        color: 0x42A5F5,
        footer: 'Prophet Bot • Resumen automático'
    });
}

async function notifyServerActivity(client, userId, activityData) {
    const subscribers = getSubscribersForType(NOTIFICATION_TYPES.SERVER_ACTIVITY);
    
    const sub = subscribers.find(s => s.user_id === userId);
    if (!sub) return { success: false, error: 'Not subscribed' };

    return sendNotification(
        client,
        userId,
        '🏠 Actividad del servidor',
        activityData.message,
        { color: 0xBB86FC, ...activityData }
    );
}

// ═══ SISTEMA DE KEYWORDS ═══

function addKeywordWatch(userId, keyword) {
    return setNotificationPreference(userId, NOTIFICATION_TYPES.MENTION_KEYWORDS, keyword.toLowerCase());
}

function removeKeywordWatch(userId, keyword) {
    return disableNotification(userId, NOTIFICATION_TYPES.MENTION_KEYWORDS, keyword.toLowerCase());
}

function getUserKeywords(userId) {
    return db.prepare(`
        SELECT target FROM user_notifications 
        WHERE user_id = ? AND type = ? AND enabled = 1
    `).all(userId, NOTIFICATION_TYPES.MENTION_KEYWORDS).map(r => r.target);
}

async function checkKeywordMentions(client, message) {
    if (message.author.bot) return;

    // Buscar usuarios que tienen keywords en este mensaje
    const allKeywordWatchers = db.prepare(`
        SELECT user_id, target FROM user_notifications 
        WHERE type = ? AND enabled = 1
    `).all(NOTIFICATION_TYPES.MENTION_KEYWORDS);

    const mentioned = [];

    for (const watcher of allKeywordWatchers) {
        // No notificar si es el autor del mensaje
        if (watcher.user_id === message.author.id) continue;
        
        // Verificar si la keyword está en el mensaje
        const regex = new RegExp(`\\b${watcher.target}\\b`, 'i');
        if (regex.test(message.content)) {
            mentioned.push({
                userId: watcher.user_id,
                keyword: watcher.target
            });
        }
    }

    // Enviar notificaciones
    for (const mention of mentioned) {
        await sendNotification(
            client,
            mention.userId,
            `📌 Mención de keyword: "${mention.keyword}"`,
            `Tu keyword **"${mention.keyword}"** fue mencionada en ${message.guild?.name || 'un servidor'}:\n\n> ${message.content.substring(0, 200)}${message.content.length > 200 ? '...' : ''}\n\n[Canal: ${message.channel.name}]`,
            {
                color: 0xFFB74D,
                footer: 'Prophet Bot • Keyword Watcher'
            }
        );
    }

    return mentioned.length;
}

// ═══ EXPORTACIONES ═══

module.exports = {
    NOTIFICATION_TYPES,
    getUserPreferences,
    setNotificationPreference,
    disableNotification,
    getSubscribersForType,
    queueNotification,
    getPendingNotifications,
    markNotificationSent,
    clearSentNotifications,
    sendNotification,
    processNotificationQueue,
    notifyStreamerLive,
    notifyRaidCreated,
    notifyProgressSummary,
    notifyServerActivity,
    addKeywordWatch,
    removeKeywordWatch,
    getUserKeywords,
    checkKeywordMentions
};
