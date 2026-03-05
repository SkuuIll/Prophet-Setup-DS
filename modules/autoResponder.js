// ═══ MÓDULO: autoResponder.js — Respuestas automáticas inteligentes ═══

// Respuestas organizadas por categoría
// Cada entrada: { patron: RegExp, respuestas: string[], prob: 0-1 }
const AUTO_RESPUESTAS = [
    // Saludos
    {
        patron: /\b(buenos\s*d[ií]as?|buen\s*d[ií]a|buenas|buenas\s*tardes?|buenas\s*noches?)\b/i,
        respuestas: [
            '¡Buenas! 👋 ¿Cómo van?',
            '¡Buenas buenas! ¿Todo bien? 🎮',
            '¡Hola! ¿Listos para gaming? 🔥',
            '¡Buenas! ¿Qué se juega hoy? 🎯',
        ],
        prob: 0.4
    },
    // GG / Well played
    {
        patron: /\b(gg|gg wp|bien jugado|bien jugados|excelente partida|tremenda partida)\b/i,
        respuestas: [
            '¡GG! 🏆 ¿Otra?',
            '¡GG WP! El esfuerzo siempre se nota 💪',
            '¡GG! ¿Cuántas más? 🎮',
            'GG! Eso es puro Prophet Gaming 🔥',
        ],
        prob: 0.6
    },
    // Tilt / Enojo
    {
        patron: /\b(me tilt[eé]|estoy tilteado?|me tiene tilteado?|hijo de|que bronca|me cago|la concha|la puta)/i,
        respuestas: [
            'El tilt es real pero la grieta también 😤 Respirá, tomá agua.',
            '🧘 Respira. Un paso a la vez. ¿Cuántas de baja?',
            'Todos pasamos por eso 😅 ¿Descansito o seguimos?',
            '¡Modo tóxico activado! Pero capaz un break ayuda 💆',
        ],
        prob: 0.5
    },
    // Rank / Rankear
    {
        patron: /\b(rankear|subir de rank|bajar de rank|subi|baj[eé] de rank|perdi el rank|no subo|caid[ao] de rank)/i,
        respuestas: [
            'El rank es un estado mental 🧠 ¿Qué juego?',
            '¡A rankear se ha dicho! Solo, duo o squad? 🎯',
            'Cada partida es una oportunidad 💪 ¿Squad o soli?',
            'El grind nunca para 🔥 ¡Dale que se puede!',
        ],
        prob: 0.45
    },
    // Cheater / hacker
    {
        patron: /\b(hackers?|cheaters?|cheatando|usando aimbot|hack|tr[am]poso)/i,
        respuestas: [
            'Reportalo y seguimos 💪 Que el sistema haga su trabajo.',
            'Los hackers son parte del ecosistema desafortunadamente 😤 ¿Pudiste reportarlo?',
            '¡Reporte enviado! (al menos mentalmente 😂) ¿Siguiente partida?',
        ],
        prob: 0.5
    },
    // Lag / conexión
    {
        patron: /\b(lagueando|lagg?eo|pines?|se me lag|sin internet|cortado( el| la)? inter)/i,
        respuestas: [
            '¡El lag, el gran villano! 📡 ¿Wifi o cable?',
            'Clásico del gaming sudamericano 😭 ¿Cuánto ping?',
            '¡El Internet de los dioses! 🌐 Esperamos que vuelva',
        ],
        prob: 0.5
    },
    // Comer / hambre
    {
        patron: /\b(voy a comer|tengo hambre|a comer|me voy a comer|comi|comiendo)\b/i,
        respuestas: [
            '¡Buen provecho! 🍕 Volvé con energía para el gaming 🎮',
            '¡A cargar pilas! 🍔 Que sin combustible no se juega',
            '¡Buen provecho! No olvides volver a la PC 💻',
        ],
        prob: 0.4
    },
    // Dormir / cansancio
    {
        patron: /\b(a dormir|me voy a dormir|buenas noches|cansado|me duermo|me mato de cansancio)\b/i,
        respuestas: [
            '¡Buenas noches! 💤 Descansá que mañana más gaming',
            '¡A dormir! 😴 Recargá que el grind sigue mañana',
            '¡Hasta mañana! 🌙 Que descanses',
        ],
        prob: 0.45
    },
    // Preguntas sobre comandos
    {
        patron: /\b(qu[eé] comandos?|c[oó]mo se usa|c[oó]mo funciona el bot|qu[eé] hace el bot)\b/i,
        respuestas: [
            '¡Usá `/ayuda` para ver todos los comandos del servidor! 📖',
            '¡El `/ayuda` es tu mejor amigo! Tiene todo lo que necesitás 📚',
        ],
        prob: 0.95
    },
];

/**
 * Procesa un mensaje y retorna una respuesta automática si aplica
 * @returns {string|null} La respuesta o null si no hay match
 */
function procesarAutoRespuesta(contenido) {
    for (const regla of AUTO_RESPUESTAS) {
        if (regla.patron.test(contenido)) {
            // Aplicar probabilidad — no siempre responde para no ser spam
            if (Math.random() > regla.prob) continue;

            const resp = regla.respuestas[Math.floor(Math.random() * regla.respuestas.length)];
            return resp;
        }
    }
    return null;
}

module.exports = { procesarAutoRespuesta };
