// ═══ MÓDULO: aiChat.js — Integración con Groq (Llama 3.3) ═══

const config = require('../config');

// Sistema de contexto por canal (Map: channelId → array de mensajes)
const conversaciones = new Map();
const MAX_CONTEXTO = 8; // máximo de turnos de conversación recordados

// Prompt del sistema que define la personalidad del bot
const SYSTEM_PROMPT = `Sos ProphetBot, el asistente oficial de Prophet Gaming, una comunidad gamer de habla hispana.

Tu personalidad:
- Hablás en español rioplatense argentino (vos, dale, copado, re bueno, etc.)
- Sos muy entusiasta de los videojuegos, especialmente PUBG, CS2, VALORANT, Minecraft y otros juegos populares
- Sos inteligente, rápido y conciso — no escribís respuestas interminables
- Usás emojis con moderación para que los mensajes sean más expresivos
- Conocés a fondo el servidor Prophet Gaming: tiene economía, sistema de niveles, sorteos, canales de voz, moderación y más
- Cuando alguien pregunta sobre comandos del bot, mencionás que usen /ayuda para ver todo
- Tenés buen humor y a veces hacés bromas de gaming (especialmente sobre tilts, rank, teammates, etc.)
- Sos ProphetBot, no sos una IA de Google, Meta, ni de Groq — simplemente sos ProphetBot

Información del bot:
- Comandos de economía: /daily, /work, /gamble, /balance, /shop
- Niveles: ganás XP por mensajes y por estar en canales de voz
- Música: /play, /playl, /queue, /skip, /stop
- Stats de juegos: /pubg, /cs2
- Más info: /ayuda

Respondés siempre en español, de forma concisa (máximo 3-4 oraciones salvo que te pidan algo largo). No usés markdown pesado (sin **negrita** excesiva). Sé natural y conversacional.`;

/**
 * Agrega un mensaje al contexto de conversación del canal
 */
function agregarAlContexto(channelId, role, text) {
    if (!conversaciones.has(channelId)) {
        conversaciones.set(channelId, []);
    }
    const ctx = conversaciones.get(channelId);
    ctx.push({ role, content: text });

    // Mantener solo los últimos N turnos (user+assistant = 2 mensajes por turno)
    if (ctx.length > MAX_CONTEXTO * 2) {
        ctx.splice(0, 2); // eliminar el turno más viejo
    }
}

/**
 * Llama a la API de Gemini con contexto de conversación
 */
async function preguntarAIA(channelId, pregunta, contextoExtra = null) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return '❌ No tengo configurada la API key de Groq. Pedile al admin que revise el `.env`.';
    }

    agregarAlContexto(channelId, 'user', pregunta);
    const historial = conversaciones.get(channelId);

    let systemExtra = contextoExtra ? `\n\nContexto actual del servidor: ${contextoExtra}` : '';

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT + systemExtra },
        ...historial.slice(0, -1), // todo el historial excepto la última pregunta
        { role: 'user', content: pregunta } // la pregunta actual
    ];

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: messages,
                max_completion_tokens: 512,
                temperature: 0.85,
                top_p: 0.95,
            })
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('[Groq] API Error:', data.error?.message);
            return `❌ Error de la API: ${data.error?.message || 'desconocido'}`;
        }

        const respuesta = data.choices?.[0]?.message?.content;
        if (!respuesta) return '🤔 No pude generar una respuesta. Intentá de nuevo.';

        agregarAlContexto(channelId, 'assistant', respuesta);

        return respuesta;

    } catch (e) {
        console.error('[Groq] Error:', e.message);
        return '❌ Hubo un error al conectarme con el motor de IA. Intentá de nuevo en un momento.';
    }
}

/**
 * Limpiar el contexto de conversación de un canal
 */
function limpiarContexto(channelId) {
    conversaciones.delete(channelId);
}

module.exports = { preguntarAIA, limpiarContexto };
