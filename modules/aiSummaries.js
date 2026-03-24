// ═══════════════════════════════════════════════════
//  MÓDULO: aiSummaries.js
//  Resúmenes automáticos con IA
// ═══════════════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');

// ═══════════════════════════════════════════════════
//  GENERACIÓN DE RESÚMENES
// ═══════════════════════════════════════════════════

/**
 * Genera un resumen de actividad del servidor usando IA
 */
async function generateServerSummary(client, days = 7) {
    const analytics = stmts.getAnalyticsMetrics(days);
    const healthChecks = stmts.getHealthChecks();
    const topCommands = stmts.getCommandMetrics(days, 10);
    const topChannels = stmts.getTopAnalyticsBuckets('messages_channel', days, 5);

    // Preparar datos para la IA
    const summaryData = {
        period: `${days} días`,
        totalMessages: analytics.filter(r => r.metric === 'messages_total').reduce((sum, r) => sum + r.value, 0),
        totalCommands: analytics.filter(r => r.metric === 'commands_total').reduce((sum, r) => sum + r.value, 0),
        totalVoiceMinutes: analytics.filter(r => r.metric === 'voice_minutes').reduce((sum, r) => sum + r.value, 0),
        topCommands: topCommands.slice(0, 5).map(c => ({ name: c.command, uses: c.total })),
        topChannels: topChannels.slice(0, 3).map(c => ({ id: c.bucket, messages: c.total })),
        errors: analytics.filter(r => r.metric === 'error_events').reduce((sum, r) => sum + r.value, 0),
        healthStatus: healthChecks.filter(h => h.status === 'ok').length,
        healthWarnings: healthChecks.filter(h => h.status === 'warn').length,
        healthErrors: healthChecks.filter(h => h.status === 'error').length,
    };

    const prompt = `Generá un resumen ejecutivo breve y amigable para el staff de un servidor Discord gaming. Usá tono casual argentino pero profesional.

DATOS DEL PERÍODO (${summaryData.period}):
- Mensajes totales: ${summaryData.totalMessages}
- Comandos usados: ${summaryData.totalCommands}
- Minutos en voz: ${summaryData.totalVoiceMinutes}
- Errores registrados: ${summaryData.errors}
- Estado de salud: ${summaryData.healthStatus} OK, ${summaryData.healthWarnings} advertencias, ${summaryData.healthErrors} errores

COMANDOS MÁS USADOS:
${summaryData.topCommands.map(c => `- /${c.name}: ${c.uses} usos`).join('\n')}

INSTRUCCIONES:
1. Resumen en 3-4 bullet points máximo
2. Destacar tendencias positivas
3. Mencionar problemas si los hay
4. Sugerir una acción concreta si hay errores
5. No uses markdown, texto plano`;

    try {
        const response = await callAI(prompt, 500);
        return {
            success: true,
            summary: response,
            data: summaryData
        };
    } catch (error) {
        console.error('[AI Summary] Error:', error.message);
        return {
            success: false,
            error: error.message,
            data: summaryData
        };
    }
}

/**
 * Genera un resumen de un ticket
 */
async function generateTicketSummary(messages) {
    if (!messages || messages.length === 0) {
        return { success: false, error: 'No hay mensajes para resumir' };
    }

    const conversationText = messages
        .slice(0, 50) // Limitar a 50 mensajes
        .map(m => `[${m.author}]: ${m.content}`)
        .join('\n');

    const prompt = `Resumí brevemente este ticket de soporte para el staff. Incluye:
1. El problema principal
2. Qué se discutió
3. Estado actual (resuelto/pendiente)
4. Acción recomendada si quedó pendiente

CONVERSACIÓN:
${conversationText}

Respondé en máximo 100 palabras, en español, sin markdown.`;

    try {
        const response = await callAI(prompt, 200);
        return { success: true, summary: response };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Genera un resumen de reportes para moderadores
 */
async function generateReportsSummary(reports) {
    if (!reports || reports.length === 0) {
        return { success: true, summary: 'No hay reportes recientes.' };
    }

    const reportsText = reports
        .slice(0, 10)
        .map(r => `- Usuario ${r.user_id}: ${r.reason || 'Sin razón'} (${r.created_at})`)
        .join('\n');

    const prompt = `Analizá estos reportes recientes y generá un resumen para el staff de moderación:

REPORTES:
${reportsText}

INSTRUCCIONES:
1. Identificar patrones (mismo usuario reportado múltiples veces, tipo de problema común)
2. Clasificar urgencia (alta/media/baja)
3. Sugerir prioridad de revisión
4. Máximo 150 palabras, español, sin markdown`;

    try {
        const response = await callAI(prompt, 300);
        return { success: true, summary: response };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Genera un resumen de una conversación larga
 */
async function generateConversationSummary(messages, maxMessages = 100) {
    if (!messages || messages.length < 10) {
        return { success: false, error: 'Se necesitan al menos 10 mensajes para generar un resumen' };
    }

    const conversationText = messages
        .slice(0, maxMessages)
        .map(m => `[${m.author?.username || 'Usuario'}]: ${m.content?.substring(0, 200) || '[archivo/emoji]'}`)
        .join('\n');

    const prompt = `Resumí esta conversación de Discord de forma breve y amigable:

CONVERSACIÓN:
${conversationText}

INSTRUCCIONES:
1. Tema principal de la conversación
2. Puntos más interesantes o graciosos
3. Conclusión o estado actual
4. Máximo 80 palabras, español casual, sin markdown`;

    try {
        const response = await callAI(prompt, 200);
        return { success: true, summary: response };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Genera sugerencias de moderación basadas en el historial
 */
async function generateModerationSuggestions(userId, warns, recentActivity) {
    const prompt = `Como asistente de moderación, analizá este caso y sugerí acciones:

USUARIO: ${userId}
WARNS PREVIOS: ${warns.length}
ULTIMOS WARNS: ${warns.slice(0, 3).map(w => `- ${w.reason} (${w.created_at})`).join('\n') || 'Ninguno'}
ACTIVIDAD RECIENTE: ${recentActivity || 'Sin datos'}

INSTRUCCIONES:
1. Evaluar si es usuario reincidente
2. Sugerir acción (advertencia verbal, warn, mute, kick, ban)
3. Justificar brevemente
4. Máximo 100 palabras, español, sin markdown`;

    try {
        const response = await callAI(prompt, 250);
        return { success: true, suggestion: response };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Prioriza reportes automáticamente
 */
async function prioritizeReports(reports) {
    if (!reports || reports.length === 0) {
        return { success: true, priorities: [] };
    }

    const reportsText = reports
        .slice(0, 20)
        .map((r, i) => `${i + 1}. ID ${r.id}: User ${r.user_id} - "${r.reason || 'Sin razón'}" - ${r.created_at}`)
        .join('\n');

    const prompt = `Priorizá estos reportes de moderación del más urgente al menos urgente:

REPORTES:
${reportsText}

INSTRUCCIONES:
1. Clasificá cada uno como ALTA, MEDIA o BAJA prioridad
2. Justificá brevemente las de alta prioridad
3. Formato: "[PRIORIDAD] ID X - breve razón"
4. Máximo 150 palabras total`;

    try {
        const response = await callAI(prompt, 300);
        return { success: true, priorities: response };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════
//  FUNCIÓN AUXILIAR PARA LLAMAR A LA IA
// ═══════════════════════════════════════════════════

async function callAI(prompt, maxTokens = 300) {
    const apiKey = process.env.GROQ_API_KEY;

    if (apiKey) {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: maxTokens,
                    temperature: 0.7
                })
            });

            const data = await res.json();
            if (data.choices?.[0]?.message?.content) {
                return data.choices[0].message.content;
            }
        } catch (e) {
            console.error('[AI] Groq error:', e.message);
        }
    }

    // Fallback a Mistral
    const mistralKey = process.env.MISTRAL_API_KEY;
    if (mistralKey) {
        try {
            const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${mistralKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'mistral-small-latest',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: maxTokens,
                    temperature: 0.7
                })
            });

            const data = await res.json();
            if (data.choices?.[0]?.message?.content) {
                return data.choices[0].message.content;
            }
        } catch (e) {
            console.error('[AI] Mistral error:', e.message);
        }
    }

    // Fallback a Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
                })
            });

            const data = await res.json();
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            }
        } catch (e) {
            console.error('[AI] Gemini error:', e.message);
        }
    }

    throw new Error('No hay proveedores de IA disponibles');
}

// ═══════════════════════════════════════════════════
//  COMANDO PARA RESUMIR
// ═══════════════════════════════════════════════════

async function sendWeeklySummary(client) {
    const result = await generateServerSummary(client, 7);

    if (!result.success) {
        return result;
    }

    const embed = new EmbedBuilder()
        .setColor(0xBB86FC)
        .setTitle('📊 Resumen Semanal del Servidor')
        .setDescription(result.summary)
        .addFields(
            { name: '📈 Estadísticas', value: `💬 ${result.data.totalMessages} mensajes\n⚡ ${result.data.totalCommands} comandos\n🎤 ${Math.round(result.data.totalVoiceMinutes / 60)}h en voz`, inline: true },
            { name: '🏥 Salud del Sistema', value: `✅ ${result.data.healthStatus} OK\n⚠️ ${result.data.healthWarnings} advertencias\n❌ ${result.data.healthErrors} errores`, inline: true }
        )
        .setFooter({ text: 'Prophet Bot · Resumen Automático' })
        .setTimestamp();

    return { success: true, embed };
}

module.exports = {
    generateServerSummary,
    generateTicketSummary,
    generateReportsSummary,
    generateConversationSummary,
    generateModerationSuggestions,
    prioritizeReports,
    sendWeeklySummary,
    callAI,
};
