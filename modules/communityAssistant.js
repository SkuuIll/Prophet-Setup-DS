// ═══════════════════════════════════════════════════
//  MÓDULO: communityAssistant.js
//  Asistente contextual de comunidad con IA
// ═══════════════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');
const { callAI } = require('./aiSummaries');

// Memoria contextual por usuario y canal
const userMemory = new Map();
const channelMemory = new Map();

// TTL de memoria: 1 hora
const MEMORY_TTL = 60 * 60 * 1000;

// Limpieza periódica
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of userMemory) {
        if (now - data.lastAccess > MEMORY_TTL) {
            userMemory.delete(key);
        }
    }
    for (const [key, data] of channelMemory) {
        if (now - data.lastAccess > MEMORY_TTL) {
            channelMemory.delete(key);
        }
    }
}, 30 * 60 * 1000);

// ═══════════════════════════════════════════════════
//  CONOCIMIENTO DEL SERVIDOR
// ═══════════════════════════════════════════════════

const SERVER_KNOWLEDGE = {
    rules: [
        'Respetar a todos los miembros del servidor',
        'No spam ni auto-promoción sin autorización',
        'Usar los canales apropiados para cada tema',
        'No contenido NSFW',
        'No discriminación ni acoso',
        'Seguir las instrucciones del Staff'
    ],
    channels: {
        general: 'Canal de chat general para conversaciones casuales',
        gaming: 'Para buscar gente para jugar y coordinar partidas',
        music: 'Para usar comandos de música (/play, /skip, etc)',
        staff: 'Canal exclusivo para el staff (soporte, reportes)',
        announcements: 'Anuncios importantes del servidor',
        voice: 'Canales de voz para jugar, escuchar música o charlar'
    },
    commands: {
        economy: ['/balance', '/daily', '/work', '/gamble', '/rob', '/shop', '/transferir'],
        leveling: ['/nivel', '/top', '/topvoz', '/perfil'],
        music: ['/play', '/skip', '/queue', '/pause', '/resume', '/stop'],
        utility: ['/help', '/avatar', '/userinfo', '/serverinfo', '/misiones'],
        fun: ['/8ball', '/meme', '/confesion', '/suggest'],
        mod: ['/warn', '/kick', '/ban', '/mute', '/clear', '/slowmode']
    },
    roles: {
        nuevo: 'Rol inicial para nuevos miembros',
        member: 'Miembro verificado del servidor',
        vip: 'Miembro destacado con beneficios extra',
        booster: 'Miembro que boostea el servidor',
        staff: 'Equipo de moderación y administración'
    },
    events: {
        weekly: 'Eventos semanales de gaming y community night',
        giveaways: 'Sorteos regulares de juegos y contenido',
        tournaments: 'Torneos de Valorant, LoL, CS2 y otros juegos'
    },
    faq: [
        { q: '¿Cómo gano XP?', a: 'Enviando mensajes, usando comandos y estando en canales de voz.' },
        { q: '¿Cómo obtengo monedas?', a: 'Usa /daily cada día, /work, /gamble (con riesgo) o participa en eventos.' },
        { q: '¿Puedo poner música?', a: 'Sí, únete a un canal de voz y usa /play [canción o URL].' },
        { q: '¿Cómo reporto a alguien?', a: 'Usa /reporte [usuario] [razón] o abre un ticket en #tickets.' },
        { q: '¿Cómo cambio mis roles de juego?', a: 'Reacciona al mensaje de roles en #roles o usa el menú de selección.' },
        { q: '¿Qué hago si me banearon injustamente?', a: 'Apela en el canal de tickets o contacta a un admin por DM.' }
    ]
};

// ═══════════════════════════════════════════════════
//  FUNCIONES DE MEMORIA
// ═══════════════════════════════════════════════════

function addToUserMemory(userId, interaction) {
    if (!userMemory.has(userId)) {
        userMemory.set(userId, { interactions: [], preferences: {}, lastAccess: Date.now() });
    }
    const memory = userMemory.get(userId);
    memory.lastAccess = Date.now();
    memory.interactions.push({
        type: interaction.type,
        topic: interaction.topic,
        timestamp: Date.now()
    });
    // Mantener solo las últimas 20 interacciones
    if (memory.interactions.length > 20) {
        memory.interactions.shift();
    }
}

function addToChannelMemory(channelId, context) {
    if (!channelMemory.has(channelId)) {
        channelMemory.set(channelId, { context: [], lastAccess: Date.now() });
    }
    const memory = channelMemory.get(channelId);
    memory.lastAccess = Date.now();
    memory.context.push({
        topic: context.topic,
        summary: context.summary,
        timestamp: Date.now()
    });
    // Mantener solo los últimos 10 contextos
    if (memory.context.length > 10) {
        memory.context.shift();
    }
}

function getUserMemory(userId) {
    return userMemory.get(userId) || { interactions: [], preferences: {} };
}

function getChannelMemory(channelId) {
    return channelMemory.get(channelId) || { context: [] };
}

// ═══════════════════════════════════════════════════
//  ASISTENTE CONTEXTUAL
// ═══════════════════════════════════════════════════

/**
 * Responde preguntas sobre el servidor con contexto
 */
async function askCommunityAssistant(userId, channelId, question, guild) {
    // Obtener contexto del usuario y canal
    const userMem = getUserMemory(userId);
    const channelMem = getChannelMemory(channelId);

    // Construir contexto
    const context = {
        recentInteractions: userMem.interactions.slice(-5),
        channelContext: channelMem.context.slice(-3),
        serverConfig: {
            name: guild?.name || 'Prophet Gaming',
            memberCount: guild?.memberCount || 0
        }
    };

    // Detectar intención de la pregunta
    const intent = detectIntent(question);

    // Construir prompt con conocimiento del servidor
    const knowledgeBase = buildKnowledgeBase(intent);

    const prompt = `Sos un asistente útil de un servidor Discord gaming llamado "${context.serverConfig.name}".
Respondé en español de forma amigable y concisa (máximo 100 palabras).

PREGUNTA DEL USUARIO: "${question}"

CONOCIMIENTO DEL SERVIDOR:
${knowledgeBase}

${context.recentInteractions.length > 0 ? `CONTEXT: El usuario preguntó recientemente sobre: ${context.recentInteractions.map(i => i.topic).join(', ')}` : ''}

INSTRUCCIONES:
- Respondé directamente a la pregunta
- Si no sabés algo, decilo honestamente
- Si es sobre reglas, ser claro y directo
- Si es sobre comandos, menciona los relevantes
- Si es sobre roles o canales, explicá brevemente
- No uses markdown, texto plano`;

    try {
        const response = await callAI(prompt, 200);

        // Guardar en memoria
        addToUserMemory(userId, { type: 'question', topic: intent });

        return {
            success: true,
            response,
            intent
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Detecta la intención de la pregunta
 */
function detectIntent(question) {
    const q = question.toLowerCase();

    if (/regla|prohibido|permitido|puedo|debo| banned|baneado|warn|mute/i.test(q)) {
        return 'rules';
    }
    if (/comando|command|\/\w+|ayuda|help|como uso|cómo funciona/i.test(q)) {
        return 'commands';
    }
    if (/canal|channel|dónde|donde|va en|va a/i.test(q)) {
        return 'channels';
    }
    if (/rol|rank|rango|permiso|permisos|acceso/i.test(q)) {
        return 'roles';
    }
    if (/xp|nivel|level|subir|rango|top|ranking/i.test(q)) {
        return 'leveling';
    }
    if (/moneda|coin|plata|dinero|balance|daily|economy|economía/i.test(q)) {
        return 'economy';
    }
    if (/música|music|play|song|canción|escuchar/i.test(q)) {
        return 'music';
    }
    if (/evento|event|torneo|tournament|sorteo|giveaway/i.test(q)) {
        return 'events';
    }
    if (/report|reporte|denunciar|staff|admin|mod|moderador/i.test(q)) {
        return 'moderation';
    }

    return 'general';
}

/**
 * Construye la base de conocimiento según la intención
 */
function buildKnowledgeBase(intent) {
    let knowledge = '';

    if (intent === 'rules' || intent === 'general') {
        knowledge += `\nREGLAS:\n${SERVER_KNOWLEDGE.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
    }

    if (intent === 'commands' || intent === 'general') {
        knowledge += `\nCOMANDOS PRINCIPALES:\n`;
        for (const [category, cmds] of Object.entries(SERVER_KNOWLEDGE.commands)) {
            knowledge += `- ${category}: ${cmds.join(', ')}\n`;
        }
    }

    if (intent === 'channels' || intent === 'general') {
        knowledge += `\nCANALES IMPORTANTES:\n`;
        for (const [name, desc] of Object.entries(SERVER_KNOWLEDGE.channels)) {
            knowledge += `- ${name}: ${desc}\n`;
        }
    }

    if (intent === 'roles' || intent === 'general') {
        knowledge += `\nROLES:\n`;
        for (const [name, desc] of Object.entries(SERVER_KNOWLEDGE.roles)) {
            knowledge += `- ${name}: ${desc}\n`;
        }
    }

    if (intent === 'events') {
        knowledge += `\nEVENTOS:\n`;
        for (const [type, desc] of Object.entries(SERVER_KNOWLEDGE.events)) {
            knowledge += `- ${type}: ${desc}\n`;
        }
    }

    // Siempre incluir FAQs relevantes
    const relevantFaqs = SERVER_KNOWLEDGE.faq.filter(faq => {
        const keywords = [intent, 'general'];
        return keywords.some(k => faq.a.toLowerCase().includes(k) || faq.q.toLowerCase().includes(k));
    });

    if (relevantFaqs.length > 0) {
        knowledge += `\nFAQS COMUNES:\n`;
        relevantFaqs.forEach(faq => {
            knowledge += `- P: ${faq.q}\n  R: ${faq.a}\n`;
        });
    }

    return knowledge;
}

/**
 * Sugiere respuestas rápidas basadas en el contexto
 */
function getSuggestedResponses(intent) {
    const suggestions = {
        rules: ['Ver reglas completas', 'Cómo reportar una violación', 'Consecuencias de las reglas'],
        commands: ['Lista de comandos', 'Cómo usar música', 'Comandos de economía'],
        channels: ['Mapa de canales', 'Canal de gaming', 'Canales de voz'],
        roles: ['Cómo obtener roles', 'Roles de juego', 'Beneficios VIP'],
        leveling: ['Cómo subir de nivel', 'Ver mi nivel', 'Top del servidor'],
        economy: ['Cómo ganar monedas', '/daily', 'Tienda'],
        music: ['/play', 'Cola de música', 'Cómo escuchar música'],
        events: ['Próximos eventos', 'Sorteos activos', 'Torneos'],
        moderation: ['Cómo reportar', 'Abrir ticket', 'Contactar staff']
    };

    return suggestions[intent] || suggestions.general || ['Ver ayuda', 'Contactar staff'];
}

// ═══════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════

module.exports = {
    askCommunityAssistant,
    detectIntent,
    getSuggestedResponses,
    addToUserMemory,
    addToChannelMemory,
    getUserMemory,
    getChannelMemory,
    SERVER_KNOWLEDGE
};
