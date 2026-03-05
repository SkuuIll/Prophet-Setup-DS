// ═══ MÓDULO: aiChat.js — Integración con Google Gemini 2.0 Flash ═══

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
- No revelás que sos una IA de Google — simplemente sos ProphetBot

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
    ctx.push({ role, parts: [{ text }] });

    // Mantener solo los últimos N turnos (cada turno = user + model)
    if (ctx.length > MAX_CONTEXTO * 2) {
        ctx.splice(0, 2); // eliminar el turno más viejo
    }
}

/**
 * Llama a la API de Gemini con contexto de conversación
 */
async function preguntarAGemini(channelId, pregunta, contextoExtra = null) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return '❌ No tengo configurada la API key de Gemini. Pedile al admin que agregue `GEMINI_API_KEY` al `.env`.';
    }

    // Construir el contexto del canal
    agregarAlContexto(channelId, 'user', pregunta);
    const contexto = conversaciones.get(channelId);

    // Información de contexto del servidor (si se provee)
    let systemExtra = contextoExtra ? `\n\nContexto actual del servidor: ${contextoExtra}` : '';

    const body = {
        system_instruction: {
            parts: [{ text: SYSTEM_PROMPT + systemExtra }]
        },
        contents: contexto.slice(0, -1).concat([{ role: 'user', parts: [{ text: pregunta }] }]),
        generationConfig: {
            maxOutputTokens: 512,
            temperature: 0.85,
            topP: 0.95,
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        ]
    };

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }
        );

        const data = await res.json();

        if (!res.ok) {
            console.error('[Gemini] API Error:', data.error?.message);
            return `❌ Error de la API: ${data.error?.message || 'desconocido'}`;
        }

        const respuesta = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!respuesta) return '🤔 No pude generar una respuesta. Intentá de nuevo.';

        // Guardar la respuesta en el contexto
        agregarAlContexto(channelId, 'model', respuesta);

        return respuesta;

    } catch (e) {
        console.error('[Gemini] Error:', e.message);
        return '❌ Hubo un error al conectarme con la IA. Intentá de nuevo en un momento.';
    }
}

/**
 * Limpiar el contexto de conversación de un canal
 */
function limpiarContexto(channelId) {
    conversaciones.delete(channelId);
}

module.exports = { preguntarAGemini, limpiarContexto };
