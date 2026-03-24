// ═══════════════════════════════════════════════════════════════
// SISTEMA DE MODERACIÓN AVANZADA
// Prophet Bot v2.9
// ═══════════════════════════════════════════════════════════════

const { _db: db } = require('../database');

// ═══ AUTO-RESPUESTAS ═══

const FAQ_DATA = [
    { question: '¿Cómo subo de nivel?', answer: 'Subís de nivel enviando mensajes y participando en el servidor. Cada mensaje te da XP, y también hay bonus por estar en canales de voz.', keywords: 'nivel,level,subir,xp,experiencia', category: 'sistema' },
    { question: '¿Cómo consigo coins?', answer: 'Podés conseguir coins con `/daily` (diario), `/work` (trabajar), ganando en `/gamble`, o siendo boosteado del servidor.', keywords: 'coins,dinero,plata,balance', category: 'economia' },
    { question: '¿Cómo uso el bot de música?', answer: 'Usá `/play` seguido del nombre de la canción o link de YouTube/Spotify. El bot se unirá a tu canal de voz y reproducirá la música.', keywords: 'musica,music,cancion,song,play', category: 'musica' },
    { question: '¿Cómo reporto a alguien?', answer: 'Usá `/reporte @usuario razón` para reportar anónimamente al staff. También podés usar `/ticket` para soporte directo.', keywords: 'reporte,reportar,denunciar', category: 'moderacion' },
    { question: '¿Qué comandos tiene el bot?', answer: 'Usá `/ayuda` para ver todos los comandos organizados por categoría. También podés usar `/ayuda [categoría]` para ver más detalles.', keywords: 'comandos,help,ayuda,help', category: 'general' },
    { question: '¿Cómo cambio mi perfil?', answer: 'Usá `/perfil` para ver tu perfil y `/editar-perfil` para personalizar tu color y badge.', keywords: 'perfil,profile,color,badge', category: 'perfil' },
    { question: '¿Cómo funcionan los recordatorios?', answer: 'Usá `/recordatorio [tiempo] [mensaje]` para que el bot te recuerde por DM. Tiempos: 10m, 1h, 2d, etc. Máximo 10 activos.', keywords: 'recordatorio,reminder,alarma', category: 'utilidades' },
    { question: '¿Cómo participo en sorteos?', answer: 'Los sorteos se anuncian en el servidor. Reaccioná con el emoji indicado para participar. El ganador se elige automáticamente.', keywords: 'sorteo,giveaway,regalo', category: 'eventos' },
    { question: '¿Cómo me gano badges?', answer: 'Los badges se desbloquean con logros especiales: ser fundador, booster, veterano, ganar eventos, etc. Usá `/badges` para ver los disponibles.', keywords: 'badge,insignia,logro', category: 'perfil' },
    { question: '¿Puedo cambiar el idioma del bot?', answer: 'El bot está configurado en español argentino por defecto. Algunos comandos como `/traductor` soportan múltiples idiomas.', keywords: 'idioma,language,español', category: 'general' }
];

function initializeFAQ() {
    const insert = db.prepare(`
        INSERT OR IGNORE INTO faq_entries (question, answer, keywords, category, created_at)
        VALUES (?, ?, ?, ?, ?)
    `);

    for (const faq of FAQ_DATA) {
        insert.run(faq.question, faq.answer, faq.keywords, faq.category, Date.now());
    }
}

function findFAQAnswer(query) {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/);

    const allFAQs = db.prepare(`SELECT * FROM faq_entries`).all();
    
    let bestMatch = null;
    let bestScore = 0;

    for (const faq of allFAQs) {
        let score = 0;
        const keywords = faq.keywords.toLowerCase().split(',');
        const questionWords = faq.question.toLowerCase().split(/\s+/);

        // Verificar keywords directos
        for (const keyword of keywords) {
            if (queryLower.includes(keyword.trim())) {
                score += 3;
            }
        }

        // Verificar palabras en la pregunta
        for (const word of words) {
            if (word.length < 3) continue;
            if (questionWords.some(qw => qw.includes(word))) {
                score += 1;
            }
            if (faq.answer.toLowerCase().includes(word)) {
                score += 0.5;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = faq;
        }
    }

    if (bestMatch && bestScore >= 2) {
        // Incrementar contador de uso
        db.prepare(`UPDATE faq_entries SET use_count = use_count + 1 WHERE id = ?`).run(bestMatch.id);
        return bestMatch;
    }

    return null;
}

function addCustomFAQ(question, answer, keywords, category = 'custom') {
    return db.prepare(`
        INSERT INTO faq_entries (question, answer, keywords, category, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(question, answer, keywords, category, Date.now());
}

function deleteFAQ(id) {
    return db.prepare(`DELETE FROM faq_entries WHERE id = ?`).run(id);
}

function listFAQs(category = null) {
    if (category) {
        return db.prepare(`SELECT * FROM faq_entries WHERE category = ? ORDER BY use_count DESC`).all(category);
    }
    return db.prepare(`SELECT * FROM faq_entries ORDER BY category, use_count DESC`).all();
}

// ═══ DETECCIÓN DE RAID AVANZADA ═══

const RAID_PATTERNS = {
    NO_AVATAR: { type: 'no_avatar', description: 'Usuarios sin avatar' },
    SIMILAR_NAMES: { type: 'similar_names', description: 'Nombres similares (bot1, bot2...)' },
    RECENT_ACCOUNT: { type: 'recent_account', description: 'Cuentas muy recientes (<1 día)' },
    SAME_MESSAGE: { type: 'same_message', description: 'Mismo mensaje en múltiples canales' },
    MASS_MENTION: { type: 'mass_mention', description: 'Menciones masivas' },
    ZALGO_TEXT: { type: 'zalgo_text', description: 'Texto Zalgo (caracteres glitch)' },
    SUSPICIOUS_LINK: { type: 'suspicious_link', description: 'Links sospechosos/phishing' }
};

// Almacén temporal para tracking de patrones
const raidTracker = {
    recentJoins: [],
    messageHistory: new Map(),
    userMessages: new Map()
};

function analyzeJoinPattern(member) {
    const alerts = [];
    const now = Date.now();

    // Agregar a joins recientes
    raidTracker.recentJoins.push({
        id: member.id,
        tag: member.user.tag,
        joinedAt: now,
        hasAvatar: member.user.avatar !== null,
        accountAge: now - member.user.createdTimestamp
    });

    // Limpiar joins antiguos (>5 minutos)
    raidTracker.recentJoins = raidTracker.recentJoins.filter(j => now - j.joinedAt < 5 * 60 * 1000);

    // Detectar patrones
    const recentJoins = raidTracker.recentJoins;

    // 1. Múltiples joins rápidos
    if (recentJoins.length >= 5) {
        alerts.push({
            type: 'rapid_joins',
            severity: 'high',
            description: `${recentJoins.length} usuarios se unieron en menos de 5 minutos`,
            users: recentJoins.map(j => j.id)
        });
    }

    // 2. Usuarios sin avatar
    const noAvatarUsers = recentJoins.filter(j => !j.hasAvatar);
    if (noAvatarUsers.length >= 3) {
        alerts.push({
            type: 'no_avatar',
            severity: 'medium',
            description: `${noAvatarUsers.length} usuarios sin avatar`,
            users: noAvatarUsers.map(j => j.id)
        });
    }

    // 3. Cuentas muy recientes
    const recentAccounts = recentJoins.filter(j => j.accountAge < 24 * 60 * 60 * 1000);
    if (recentAccounts.length >= 3) {
        alerts.push({
            type: 'recent_account',
            severity: 'high',
            description: `${recentAccounts.length} cuentas creadas en las últimas 24h`,
            users: recentAccounts.map(j => j.id)
        });
    }

    // 4. Nombres similares
    const namePatterns = detectSimilarNames(recentJoins.map(j => j.tag));
    if (namePatterns.length > 0) {
        alerts.push({
            type: 'similar_names',
            severity: 'high',
            description: `Nombres con patrones sospechosos detectados`,
            patterns: namePatterns
        });
    }

    return alerts;
}

function detectSimilarNames(names) {
    const patterns = [];

    // Detectar nombres con números consecutivos (bot1, bot2, user123, user124)
    const numberedPattern = /(.+?)(\d+)$/;
    const numberedNames = {};

    for (const name of names) {
        const match = name.match(numberedPattern);
        if (match) {
            const base = match[1].toLowerCase();
            if (!numberedNames[base]) numberedNames[base] = [];
            numberedNames[base].push(name);
        }
    }

    for (const [base, matches] of Object.entries(numberedNames)) {
        if (matches.length >= 3) {
            patterns.push({ base, names: matches });
        }
    }

    // Detectar nombres muy similares (distancia de Levenshtein)
    for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
            const distance = levenshteinDistance(names[i].toLowerCase(), names[j].toLowerCase());
            if (distance <= 2 && distance > 0) {
                patterns.push({ similar: [names[i], names[j]], distance });
            }
        }
    }

    return patterns;
}

function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function analyzeMessagePattern(message) {
    const alerts = [];
    const content = message.content;
    const userId = message.author.id;

    // Inicializar historial del usuario si no existe
    if (!raidTracker.userMessages.has(userId)) {
        raidTracker.userMessages.set(userId, []);
    }

    const userMsgs = raidTracker.userMessages.get(userId);
    userMsgs.push({
        content,
        channelId: message.channel.id,
        timestamp: Date.now()
    });

    // Mantener solo últimos 20 mensajes
    if (userMsgs.length > 20) userMsgs.shift();

    // 1. Detectar mismo mensaje en múltiples canales
    const recentSameContent = userMsgs.filter(
        m => m.content === content && m.channelId !== message.channel.id
    );
    if (recentSameContent.length >= 2) {
        alerts.push({
            type: 'same_message',
            severity: 'high',
            description: 'Mismo mensaje enviado en múltiples canales',
            count: recentSameContent.length + 1
        });
    }

    // 2. Detectar menciones masivas
    const mentionCount = (content.match(/<@!?\d+>/g) || []).length;
    const roleMentionCount = (content.match(/<@&\d+>/g) || []).length;
    if (mentionCount >= 5 || roleMentionCount >= 3) {
        alerts.push({
            type: 'mass_mention',
            severity: 'high',
            description: `Menciones masivas: ${mentionCount} usuarios, ${roleMentionCount} roles`,
            count: mentionCount + roleMentionCount
        });
    }

    // 3. Detectar texto Zalgo
    const zalgoRegex = /[\u0300-\u036f\u0483-\u0489\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]{3,}/;
    if (zalgoRegex.test(content)) {
        alerts.push({
            type: 'zalgo_text',
            severity: 'medium',
            description: 'Texto con caracteres Zalgo detectado'
        });
    }

    // 4. Detectar links sospechosos
    const suspiciousDomains = ['grabify', 'iplogger', 'yip', 'freegiftcards', 'ps3cfw', 'ipgrab', 'boost-game', 'n00b', 'disc0rd', 'stean'];
    const linkRegex = /https?:\/\/([^\s/$.?#].[^\s]*)/gi;
    const links = content.match(linkRegex) || [];
    for (const link of links) {
        if (suspiciousDomains.some(d => link.toLowerCase().includes(d))) {
            alerts.push({
                type: 'suspicious_link',
                severity: 'critical',
                description: `Link sospechoso detectado: ${link}`,
                link
            });
        }
    }

    // 5. Spam de emojis
    const emojiCount = (content.match(/<a?:\w+:\d+>/g) || []).length + (content.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || []).length;
    if (emojiCount > 15) {
        alerts.push({
            type: 'emoji_spam',
            severity: 'medium',
            description: `Exceso de emojis: ${emojiCount}`,
            count: emojiCount
        });
    }

    return alerts;
}

// ═══ EVENTOS DE SEGURIDAD ═══

function logSecurityEvent(guildId, eventType, details, severity = 'low', userId = null) {
    return db.prepare(`
        INSERT INTO security_events 
        (guild_id, user_id, event_type, severity, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(guildId, userId, eventType, severity, JSON.stringify(details), Date.now());
}

function getSecurityEvents(guildId, options = {}) {
    let query = `SELECT * FROM security_events WHERE guild_id = ?`;
    const params = [guildId];

    if (options.severity) {
        query += ` AND severity = ?`;
        params.push(options.severity);
    }
    if (options.resolved === false) {
        query += ` AND resolved = 0`;
    }
    if (options.type) {
        query += ` AND event_type = ?`;
        params.push(options.type);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(options.limit || 50);

    return db.prepare(query).all(...params);
}

function resolveSecurityEvent(eventId, resolvedBy) {
    return db.prepare(`
        UPDATE security_events 
        SET resolved = 1, resolved_by = ?, resolved_at = ? 
        WHERE id = ?
    `).run(resolvedBy, Date.now(), eventId);
}

// ═══ NOTAS DE MODERACIÓN ═══

function addModNote(userId, guildId, note, noteType, createdBy) {
    return db.prepare(`
        INSERT INTO mod_notes (user_id, guild_id, note, note_type, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, guildId, note, noteType, createdBy, Date.now());
}

function getUserModNotes(userId, guildId = null) {
    if (guildId) {
        return db.prepare(`
            SELECT * FROM mod_notes 
            WHERE user_id = ? AND guild_id = ? 
            ORDER BY created_at DESC
        `).all(userId, guildId);
    }
    return db.prepare(`
        SELECT * FROM mod_notes 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    `).all(userId);
}

function deleteModNote(noteId) {
    return db.prepare(`DELETE FROM mod_notes WHERE id = ?`).run(noteId);
}

// ═══ PATRONES DE RAID PERSONALIZADOS ═══

function addRaidPattern(patternType, patternValue, severity = 1, action = 'alert') {
    return db.prepare(`
        INSERT INTO raid_patterns (pattern_type, pattern_value, severity, action, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(patternType, patternValue, severity, action, Date.now());
}

function getRaidPatterns() {
    return db.prepare(`SELECT * FROM raid_patterns ORDER BY severity DESC`).all();
}

function deleteRaidPattern(id) {
    return db.prepare(`DELETE FROM raid_patterns WHERE id = ?`).run(id);
}

// ═══ AUTO-RESPUESTAS PERSONALIZADAS ═══

function addAutoResponse(triggerType, triggerPattern, response, category = 'general', priority = 0, useAi = false) {
    return db.prepare(`
        INSERT INTO auto_responses 
        (trigger_type, trigger_pattern, response, category, priority, use_ai, enabled, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).run(triggerType, triggerPattern, response, category, priority, useAi ? 1 : 0, Date.now());
}

function getAutoResponses(category = null) {
    if (category) {
        return db.prepare(`
            SELECT * FROM auto_responses 
            WHERE category = ? AND enabled = 1 
            ORDER BY priority DESC
        `).all(category);
    }
    return db.prepare(`
        SELECT * FROM auto_responses 
        WHERE enabled = 1 
        ORDER BY category, priority DESC
    `).all();
}

function matchAutoResponse(message) {
    const responses = getAutoResponses();
    
    for (const resp of responses) {
        let matched = false;
        const pattern = resp.trigger_pattern.toLowerCase();
        const content = message.content.toLowerCase();

        switch (resp.trigger_type) {
            case 'exact':
                matched = content === pattern;
                break;
            case 'contains':
                matched = content.includes(pattern);
                break;
            case 'regex':
                try {
                    const regex = new RegExp(pattern, 'i');
                    matched = regex.test(content);
                } catch (e) { /* Regex inválido */ }
                break;
            case 'startswith':
                matched = content.startsWith(pattern);
                break;
        }

        if (matched) {
            // Incrementar contador de hits
            db.prepare(`UPDATE auto_responses SET hit_count = hit_count + 1 WHERE id = ?`).run(resp.id);
            return resp;
        }
    }

    return null;
}

function deleteAutoResponse(id) {
    return db.prepare(`DELETE FROM auto_responses WHERE id = ?`).run(id);
}

function toggleAutoResponse(id, enabled) {
    return db.prepare(`UPDATE auto_responses SET enabled = ? WHERE id = ?`).run(enabled ? 1 : 0, id);
}

// ═══ EXPORTACIONES ═══

module.exports = {
    // FAQ
    initializeFAQ,
    findFAQAnswer,
    addCustomFAQ,
    deleteFAQ,
    listFAQs,
    FAQ_DATA,
    // Raid Detection
    RAID_PATTERNS,
    analyzeJoinPattern,
    analyzeMessagePattern,
    raidTracker,
    // Security Events
    logSecurityEvent,
    getSecurityEvents,
    resolveSecurityEvent,
    // Mod Notes
    addModNote,
    getUserModNotes,
    deleteModNote,
    // Raid Patterns
    addRaidPattern,
    getRaidPatterns,
    deleteRaidPattern,
    // Auto Responses
    addAutoResponse,
    getAutoResponses,
    matchAutoResponse,
    deleteAutoResponse,
    toggleAutoResponse
};
