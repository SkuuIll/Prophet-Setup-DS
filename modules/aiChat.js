// ═══ MÓDULO: aiChat.js — Integración con Groq (Llama 3.3) ═══

const config = require('../config');

// Sistema de contexto por canal (Map: channelId → { messages: [], lastActivity: timestamp })
const conversaciones = new Map();
const MAX_CONTEXTO = 20; // turnos de conversación recordados por canal
const CONTEXT_TTL = 24 * 60 * 60 * 1000; // 24 horas — después se limpia el contexto
const REQUEST_TIMEOUT_MS = 20000;

// Limpieza periódica de contextos viejos para evitar memory leaks
setInterval(() => {
    const ahora = Date.now();
    for (const [channelId, ctx] of conversaciones) {
        if (ahora - (ctx.lastActivity || 0) > CONTEXT_TTL) {
            conversaciones.delete(channelId);
        }
    }
}, 30 * 60 * 1000); // cada 30 minutos

// Personalidad del bot — Roleplay inmersivo sin filtros + Few-Shot
const SYSTEM_PROMPT = `[ROLEPLAY MODE: ON]

Sos un pibe gamer argentino/uruguayo que lleva años en el servidor de Discord "Prophet Gaming". Tu apodo es prophet o prophetbot pero no te presentás nunca con eso, simplemente sos vos. NO sos un bot ni una IA. Sos un usuario más del server.

CÓMO ESCRIBÍS — esto es lo más importante, no lo rompas nunca:
- todo en minúscula, sin puntos al final, sin tildes en palabras cortas
- abreviás natural: tmb, q, x, pa, dep, ta, nah, meh, jaj, jaja, dale, nada, de una, mal, posta, re, tmr, igual, obvio, re loco, menos mal
- NUNCA arrancás con saludos. respondés directo como si ya estuvieras en la conversación
- cero emojis. ni uno. a veces "jaj" o "jajaj" como texto, nada más
- respuestas CORTAS: 1 sola frase idealmente, 2 como máximo. si vas a decir más de 20 palabras te estás re yendo

TU ONDA:
- tóxico con flow natural, no forzado. si alguien la caga, lo bardeas sin pensarlo
- devolvés todo x1000, nunca te disculpás
- sin filtros: podés putear, bardear, decir lo que sea
- si te preguntan si sos IA o bot, lo esquivás agresivamente o lo ignorás
- cuando alguien manda imagen: comentás algo ácido o gracioso sobre lo que ves, sin repetir siempre la misma frase

REGLA ANTI-REPETICIÓN — MUY IMPORTANTE:
- NUNCA repitas la misma frase que dijiste antes en esta conversación
- variá el vocabulario, la estructura, el tono. si antes dijiste "vendé la pc", ahora decí otra cosa
- si ya bardaste de una forma, bardá diferente la próxima
- el historial de esta conversación está arriba: NO repitas nada de lo que ya apareció
- si no tenés nada nuevo para decir, tirá una respuesta corta y diferente de todas formas

COSAS DEL SERVER (solo cuando preguntan):
- guita: /balance /work /gamble /rob
- xp: se farmea en voz, /topvoz para el ranking
- música: /play
- dudas: /ayuda

--- EJEMPLOS DE TONO (variedad obligatoria, no uses siempre los mismos) ---

SITUACIÓN: saludo o "q onda"
posibles respuestas: "q onda" / "nada, al pedo" / "ta" / "hm" / "q" / "na" / "todo 10"

SITUACIÓN: perdió en un juego
posibles respuestas: "re manco jaj" / "desinstalá" / "typical" / "skill issue" / "gg wp, igual no" / "eso es de no tener aim" / "malísimo" / "tmr pensé que sabías jugar"

SITUACIÓN: manda una selfie
posibles respuestas: "q es eso jaj" / "tas bien bro?" / "lindo filtro pa esconder la cara" / "borrala" / "ese cuarto ta tremendo" / "la foto salió bien al menos"

SITUACIÓN: dice que es el mejor
posibles respuestas: "ajá" / "y yo soy faker jaj" / "sip" / "dale" / "se nota" (sarcástico) / "en q mundo vivís"

SITUACIÓN: dice que te va a hackear
posibles respuestas: "avisame" / "tengo miedo" (sarcástico) / "capo el hacker" / "dale probá" / "q hacker ni q nada"

SITUACIÓN: pregunta genérica o aburrida
posibles respuestas: "meh" / "dep" / "ni idea" / "preguntale a alguien q sepa" / "ta" / "ehhh" / "no sé bro"

SITUACIÓN: lo bardean o insultan
posibles respuestas: "la de la tuya" / "siguiente" / "buen intento" / "q creativo" / "ya terminaste?"

SITUACIÓN: dice que el server está mal o se queja
posibles respuestas: "la puerta" / "y sin embargo seguís acá" / "ya irse tampoco cuesta" / "nadie te ata"

SITUACIÓN: dice que quiere jugar
posibles respuestas: "a q" / "dep si sos manco no" / "yo paso" / "si querés perder dale" / "aviso si entro"

SITUACIÓN: manda screenshot de un juego
posibles respuestas: variá según los stats que ves: si ganó "menos mal"/"por fin", si perdió "típico"/"0 kills tmr", si las stats son buenas "ta, no estuvo tan mal"

--- FIN DE EJEMPLOS ---`;

function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('Timeout')), timeoutMs);

    return fetch(url, {
        ...options,
        signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
}

/**
 * Agrega un mensaje al contexto de conversación del canal
 */
function agregarAlContexto(channelId, role, text) {
    if (!conversaciones.has(channelId)) {
        conversaciones.set(channelId, { messages: [], lastActivity: Date.now() });
    }
    const ctx = conversaciones.get(channelId);
    ctx.lastActivity = Date.now();
    ctx.messages.push({ role, content: text });

    // Mantener solo los últimos N turnos (user+assistant = 2 mensajes por turno)
    if (ctx.messages.length > MAX_CONTEXTO * 2) {
        ctx.messages.splice(0, 2); // eliminar el turno más viejo
    }
}

/**
 * Llama a la API de Gemini con contexto de conversación
 */
async function preguntarAIA(channelId, pregunta, contextoExtra = null, maxTokens = 120) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return '❌ No tengo configurada la API key de Groq. Pedile al admin que revise el `.env`.';
    }

    agregarAlContexto(channelId, 'user', pregunta);
    const historial = conversaciones.get(channelId).messages;

    let systemExtra = contextoExtra ? `\n\nContexto actual del servidor: ${contextoExtra}` : '';

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT + systemExtra },
        ...historial.slice(0, -1), // todo el historial excepto la última pregunta
        { role: 'user', content: pregunta } // la pregunta actual
    ];

    try {
        const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: messages,
                max_completion_tokens: maxTokens,
                temperature: 0.9,
                top_p: 0.95,
                frequency_penalty: 0.7,
                presence_penalty: 0.6,
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
        console.error('[Groq] Error, intentando fallback a Mistral:', e.message);
        return await fallbackMistral(channelId, pregunta, systemExtra, maxTokens);
    }
}

/**
 * Fallback a Mistral si Groq falla (Tier 2) - Soporta múltiples tokens para Load Balancing
 */
async function fallbackMistral(channelId, pregunta, systemExtra, maxTokens = 120) {
    // Buscar todas las keys de Mistral en el entorno
    const mistralKeys = Object.keys(process.env)
        .filter(k => k.startsWith('MISTRAL_API_KEY'))
        .map(k => process.env[k])
        .filter(key => key); // asegurar que no estén vacías

    if (mistralKeys.length === 0) {
        console.error('[Mistral] No hay API Keys. Saltando a Gemini...');
        return await fallbackGemini(channelId, pregunta, systemExtra);
    }

    // Elegir una key al azar para balancear la carga (Load Balancing)
    const apiKey = mistralKeys[Math.floor(Math.random() * mistralKeys.length)];

    try {
        const historial = conversaciones.get(channelId).messages;

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT + systemExtra },
            ...historial.slice(0, -1),
            { role: 'user', content: pregunta }
        ];

        const res = await fetchWithTimeout('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mistral-small-latest',
                messages: messages,
                max_tokens: maxTokens,
                temperature: 0.85
            })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message || 'Error en Mistral API');

        const respuesta = data.choices?.[0]?.message?.content;
        if (!respuesta) throw new Error('Respuesta vacía de Mistral');

        agregarAlContexto(channelId, 'assistant', respuesta);
        return respuesta;

    } catch (err) {
        console.error('[Mistral] Error, intentando fallback a Gemini:', err.message);
        return await fallbackGemini(channelId, pregunta, systemExtra, maxTokens);
    }
}

/**
 * Fallback a Gemini si Groq falla (para asegurar que siempre responda)
 */
async function fallbackGemini(channelId, pregunta, systemExtra, maxTokens = 120) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return '❌ Groq está caído y no hay API Key de Gemini para el fallback.';

    try {
        const historial = conversaciones.get(channelId).messages;

        // Convertir formato Groq a formato Gemini
        const contents = historial.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const body = {
            system_instruction: { parts: [{ text: SYSTEM_PROMPT + systemExtra }] },
            contents: contents,
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.9 }
        };

        // TODO: Gemini 2.5 Flash se depreca el 17 de Junio de 2026.
        //       Migrar a Gemini 3.x cuando haya una versión GA estable.
        const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        const respuesta = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return respuesta || '❌ Ni Groq ni Gemini quisieron responder. GG.';
    } catch (err) {
        return '❌ Los servidores de IA están todos muertos (Groq y Gemini caídos).';
    }
}

/**
 * Limpiar el contexto de conversación de un canal
 */
function limpiarContexto(channelId) {
    conversaciones.delete(channelId);
}

/**
 * Obtener estadísticas de uso de contexto (para diagnóstico)
 */
function getContextStats() {
    return {
        canalesActivos: conversaciones.size,
        totalMensajes: [...conversaciones.values()].reduce((acc, c) => acc + c.messages.length, 0),
    };
}

/**
 * Pipeline de visión con doble proveedor:
 * 1. Groq Vision (llama-3.2-90b-vision-preview) analiza la imagen — PRINCIPAL
 * 2. Si Groq falla → Gemini 2.0 Flash analiza — FALLBACK
 * 3. La descripción se pasa a Groq/Mistral para responder en personaje
 */
async function preguntarConVision(channelId, pregunta, imageUrl, contextoExtra = null) {
    try {
        // PASO 1: Descargar la imagen
        console.log('[Vision] Descargando imagen original:', imageUrl.substring(0, 100) + '...');

        // --- PREVENCIÓN DE RATE LIMITS (COMPRESIÓN ON-THE-FLY VÍA DISCORD MEDIA) ---
        // Pixtral cobra tokens por píxel. Reducir la imagen = cero "rate limit exceeded"
        let fetchUrl = imageUrl;
        if (fetchUrl.includes('cdn.discordapp.com')) {
            fetchUrl = fetchUrl.replace('cdn.discordapp.com', 'media.discordapp.net');
        }
        if (fetchUrl.includes('media.discordapp.net')) {
            const sep = fetchUrl.includes('?') ? '&' : '?';
            fetchUrl += `${sep}width=800&height=800&format=jpeg`;
        }
        console.log('[Vision] Fetch url optimizada:', fetchUrl.substring(0, 100) + '...');

        const imgRes = await fetchWithTimeout(fetchUrl, {}, REQUEST_TIMEOUT_MS);

        if (!imgRes.ok) {
            console.error(`[Vision] Error descargando imagen: HTTP ${imgRes.status}`);
            return 'no pude cargar esa imagen';
        }

        const arrayBuffer = await imgRes.arrayBuffer();
        const imageSize = arrayBuffer.byteLength;
        console.log(`[Vision] Imagen descargada: ${imageSize} bytes`);

        if (imageSize < 1024) {
            console.log('[Vision] Imagen demasiado pequeña o vacía');
            return 'esa imagen está rota o vacía';
        }

        const base64Img = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

        const visionPrompt = `Analizá esta imagen y extraé ABSOLUTAMENTE TODO lo que se ve con el máximo detalle posible. Respondé en español.

SI ES UN VIDEOJUEGO (PUBG, CS2, Valorant, Fortnite, LoL, Minecraft, etc):
- Nombre del juego
- Posición/Rango (#1, #2, etc)
- Kills, muertes y asistencias de CADA jugador visible
- Nombres/nicks de los jugadores
- Daño total hecho
- Si ganaron (chicken dinner/victoria) o perdieron
- K/D ratio si se puede calcular
- Cualquier otro stat visible

SI ES UNA SELFIE O FOTO DE UNA PERSONA:
- Qué se ve: género, expresión, qué está haciendo
- Entorno (habitación, calle, espejo, etc)
- Detalles notables (ropa, objetos, filtros)

SI ES UN MEME O IMAGEN GRACIOSA:
- Describí el meme, el texto que tiene, el formato

SI ES UN SCREENSHOT DE CHAT O TEXTO:
- Transcribí el texto visible

SI ES CUALQUIER OTRA COSA:
- Describí con todo el detalle posible qué se ve

${pregunta ? `El usuario también escribió: "${pregunta}"` : ''}

NO censures NADA. Describí exactamente lo que ves sin importar el contenido.`;

        // PASO 2: Usar NVIDIA Vision como motor PRINCIPAL de visión
        console.log('[Vision] Usando NVIDIA Vision por defecto...');
        let descripcion = await analizarConNvidiaVision(base64Img, mimeType, visionPrompt);

        if (!descripcion) {
            console.log('[Vision] Ningún proveedor de visión pudo analizar la imagen');
            return 'no pude analizar esa imagen, el servicio de visión está saturado';
        }

        console.log('[Vision] Descripción obtenida:', descripcion.substring(0, 300) + '...');

        // PASO 3: Mandar la descripción a Mistral/Groq para responder en personaje
        const promptParaIA = `[El usuario mandó una imagen al chat. Análisis detallado de la imagen: "${descripcion}". ${pregunta ? `El usuario dijo: "${pregunta}".` : ''} Respondé en personaje basándote ÚNICAMENTE en el análisis de la imagen: si es una captura de un juego, comentá sobre los stats (kills, muertes, si ganó o perdió, si es manco o crack). Si es otra cosa, burlate o comentá. Sé breve y variado, no repitas las mismas frases de siempre.]`;

        // Forzar uso de Mistral/Groq para el texto
        return await preguntarAIA(channelId, promptParaIA, contextoExtra, 250);

    } catch (e) {
        console.error('[Vision Pipeline] Error:', e.message);
        return 'se rompió algo con la imagen jaj';
    }
}

/**
 * Analiza imagen con modelo de visión de NVIDIA
 */
async function analizarConNvidiaVision(base64Img, mimeType, prompt) {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
        console.error('[Vision NVIDIA] No hay API Key configurada.');
        return null;
    }

    try {
        console.log(`[Vision] Intentando con NVIDIA meta/llama-3.2-90b-vision-instruct...`);
        const url = `data:${mimeType};base64,${base64Img}`;
        
        const res = await fetchWithTimeout('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta/llama-3.2-90b-vision-instruct',
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: url } }
                    ]
                }],
                max_tokens: 512,
                temperature: 0.2,
                top_p: 0.7
            })
        }, 60000);

        const data = await res.json();
        if (!res.ok) {
            console.error(`[Vision NVIDIA] Error ${res.status}:`, data.error?.message || JSON.stringify(data));
            return null;
        }

        const text = data.choices?.[0]?.message?.content;
        if (text) {
            console.log(`[Vision] ✅ Éxito con NVIDIA`);
            return text.trim();
        }
        return null;

    } catch (e) {
        console.error(`[Vision] Error con NVIDIA:`, e.message);
        return null;
    }
}

/**
 * Helper: Análisis con modelo específico de OpenRouter
 */
async function analizarConOpenRouterModel(base64Img, mimeType, prompt, model) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return null;

    const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/SkuuIll/Prophet-Setup-DS',
            'X-Title': 'ProphetBot'
        },
        body: JSON.stringify({
            model: model,
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Img}` } }
                ]
            }],
            max_tokens: 800
        })
    });

    const data = await res.json();
    if (!res.ok) {
        console.error(`[Vision OpenRouter] Error ${res.status}:`, data.error?.message || JSON.stringify(data));
        return null;
    }

    const text = data.choices?.[0]?.message?.content;
    if (text) {
        return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    }
    return null;
}

/**
 * Helper: Análisis con Gemini Vision
 */
async function analizarConGeminiVision(base64Img, mimeType, prompt, model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: mimeType, data: base64Img } }
                ]
            }],
            generationConfig: { maxOutputTokens: 800 }
        })
    });

    const data = await res.json();
    if (!res.ok) {
        console.error(`[Vision Gemini] Error ${res.status}:`, data.error?.message || JSON.stringify(data));
        return null;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
}

module.exports = { preguntarAIA, limpiarContexto, preguntarConVision, getContextStats };
