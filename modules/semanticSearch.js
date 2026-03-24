// ═══════════════════════════════════════════════════
//  MÓDULO: semanticSearch.js
//  Búsqueda semántica / base de conocimiento
// ═══════════════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const { stmts, _db } = require('../database');
const { callAI } = require('./aiSummaries');

// ═══════════════════════════════════════════════════
//  INICIALIZACIÓN DE TABLAS
// ═══════════════════════════════════════════════════

_db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        keywords TEXT,
        source TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        created_by TEXT
    );

    CREATE TABLE IF NOT EXISTS knowledge_embeddings (
        doc_id INTEGER PRIMARY KEY,
        embedding TEXT,
        model TEXT DEFAULT 'text-embedding-ada-002',
        created_at INTEGER,
        FOREIGN KEY (doc_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_knowledge_guild ON knowledge_documents(guild_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_documents(category);
`);

// ═══════════════════════════════════════════════════
//  GESTIÓN DE DOCUMENTOS
// ═══════════════════════════════════════════════════

/**
 * Añade un documento a la base de conocimiento
 */
function addDocument(guildId, title, content, category = 'general', keywords = [], source = null, userId = null) {
    const now = Date.now();
    const result = _db.prepare(`
        INSERT INTO knowledge_documents (guild_id, title, content, category, keywords, source, created_at, updated_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(guildId, title, content, category, JSON.stringify(keywords), source, now, now, userId);

    const docId = Number(result.lastInsertRowid);

    // Generar embedding si hay API disponible
    generateEmbedding(docId, content).catch(() => {});

    return { id: docId, title, category };
}

/**
 * Actualiza un documento existente
 */
function updateDocument(docId, title, content, category, keywords) {
    const doc = _db.prepare('SELECT * FROM knowledge_documents WHERE id = ?').get(docId);
    if (!doc) return null;

    _db.prepare(`
        UPDATE knowledge_documents 
        SET title = ?, content = ?, category = ?, keywords = ?, updated_at = ?
        WHERE id = ?
    `).run(
        title || doc.title,
        content || doc.content,
        category || doc.category,
        keywords ? JSON.stringify(keywords) : doc.keywords,
        Date.now(),
        docId
    );

    // Regenerar embedding
    if (content) {
        generateEmbedding(docId, content || doc.content).catch(() => {});
    }

    return _db.prepare('SELECT * FROM knowledge_documents WHERE id = ?').get(docId);
}

/**
 * Elimina un documento
 */
function deleteDocument(docId, guildId = null) {
    const query = guildId
        ? 'DELETE FROM knowledge_documents WHERE id = ? AND guild_id = ?'
        : 'DELETE FROM knowledge_documents WHERE id = ?';
    const params = guildId ? [docId, guildId] : [docId];

    _db.prepare('DELETE FROM knowledge_embeddings WHERE doc_id = ?').run(docId);
    return _db.prepare(query).run(...params).changes > 0;
}

/**
 * Obtiene un documento por ID
 */
function getDocument(docId) {
    const doc = _db.prepare('SELECT * FROM knowledge_documents WHERE id = ?').get(docId);
    if (doc) {
        doc.keywords = JSON.parse(doc.keywords || '[]');
    }
    return doc;
}

/**
 * Lista documentos de un servidor
 */
function listDocuments(guildId, category = null, limit = 20) {
    let query = 'SELECT id, title, category, source, created_at FROM knowledge_documents WHERE guild_id = ?';
    const params = [guildId];

    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }

    query += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(limit);

    return _db.prepare(query).all(...params);
}

// ═══════════════════════════════════════════════════
//  GENERACIÓN DE EMBEDDINGS
// ═══════════════════════════════════════════════════

/**
 * Genera embedding para un documento
 */
async function generateEmbedding(docId, content) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    try {
        const res = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'text-embedding-ada-002',
                input: content.substring(0, 8000)
            })
        });

        const data = await res.json();
        if (data.data?.[0]?.embedding) {
            _db.prepare(`
                INSERT OR REPLACE INTO knowledge_embeddings (doc_id, embedding, model, created_at)
                VALUES (?, ?, ?, ?)
            `).run(docId, JSON.stringify(data.data[0].embedding), 'text-embedding-ada-002', Date.now());

            return data.data[0].embedding;
        }
    } catch (e) {
        console.error('[SemanticSearch] Embedding error:', e.message);
    }

    return null;
}

/**
 * Calcula similitud de coseno entre dos vectores
 */
function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ═══════════════════════════════════════════════════
//  BÚSQUEDA SEMÁNTICA
// ═══════════════════════════════════════════════════

/**
 * Búsqueda por palabras clave
 */
function keywordSearch(guildId, query, limit = 5) {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    if (terms.length === 0) return [];

    const documents = _db.prepare(`
        SELECT * FROM knowledge_documents WHERE guild_id = ?
    `).all(guildId);

    const scored = documents.map(doc => {
        const content = (doc.title + ' ' + doc.content + ' ' + (doc.keywords || '')).toLowerCase();
        let score = 0;

        for (const term of terms) {
            const regex = new RegExp(term, 'gi');
            const matches = content.match(regex);
            if (matches) {
                score += matches.length;
            }
        }

        // Bonus por coincidencia exacta en título
        if (doc.title.toLowerCase().includes(query.toLowerCase())) {
            score += 10;
        }

        return { ...doc, score, keywords: JSON.parse(doc.keywords || '[]') };
    });

    return scored
        .filter(d => d.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

/**
 * Búsqueda semántica con embeddings
 */
async function semanticSearch(guildId, query, limit = 5) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        // Fallback a búsqueda por palabras clave
        return keywordSearch(guildId, query, limit);
    }

    try {
        // Generar embedding de la query
        const res = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'text-embedding-ada-002',
                input: query
            })
        });

        const data = await res.json();
        if (!data.data?.[0]?.embedding) {
            return keywordSearch(guildId, query, limit);
        }

        const queryEmbedding = data.data[0].embedding;

        // Obtener todos los embeddings del servidor
        const docs = _db.prepare(`
            SELECT kd.*, ke.embedding
            FROM knowledge_documents kd
            LEFT JOIN knowledge_embeddings ke ON kd.id = ke.doc_id
            WHERE kd.guild_id = ?
        `).all(guildId);

        // Calcular similitud
        const scored = docs.map(doc => {
            let similarity = 0;
            if (doc.embedding) {
                const docEmbedding = JSON.parse(doc.embedding);
                similarity = cosineSimilarity(queryEmbedding, docEmbedding);
            }

            return {
                ...doc,
                similarity,
                keywords: JSON.parse(doc.keywords || '[]'),
                embedding: undefined
            };
        });

        // Combinar con búsqueda por palabras clave
        const keywordResults = keywordSearch(guildId, query, limit * 2);
        const combined = new Map();

        for (const doc of scored) {
            combined.set(doc.id, doc);
        }

        for (const doc of keywordResults) {
            if (combined.has(doc.id)) {
                combined.get(doc.id).score = (combined.get(doc.id).similarity * 50) + doc.score;
            } else {
                combined.set(doc.id, { ...doc, similarity: 0 });
            }
        }

        return Array.from(combined.values())
            .sort((a, b) => (b.similarity * 50 + b.score) - (a.similarity * 50 + a.score))
            .slice(0, limit);
    } catch (e) {
        console.error('[SemanticSearch] Search error:', e.message);
        return keywordSearch(guildId, query, limit);
    }
}

/**
 * Búsqueda inteligente con IA
 */
async function intelligentSearch(guildId, query, context = {}) {
    const results = await semanticSearch(guildId, query, 5);

    if (results.length === 0) {
        return {
            success: false,
            message: 'No se encontraron resultados relevantes en la base de conocimiento.',
            results: []
        };
    }

    // Usar IA para sintetizar respuesta
    const contextText = results.map((r, i) => 
        `[${i + 1}] ${r.title}\n${r.content.substring(0, 500)}`
    ).join('\n\n---\n\n');

    const prompt = `Sos un asistente de búsqueda para un servidor Discord. Basado en estos documentos encontrados, respondé la consulta del usuario de forma clara y útil.

CONSULTA: "${query}"

DOCUMENTOS ENCONTRADOS:
${contextText}

INSTRUCCIONES:
1. Respondé en español de forma concisa (máximo 150 palabras)
2. Cita las fuentes con [1], [2], etc. cuando uses información
3. Si la información no está completa, mencioná qué falta
4. No uses markdown, texto plano`;

    try {
        const aiResponse = await callAI(prompt, 300);
        return {
            success: true,
            response: aiResponse,
            results: results.map(r => ({
                id: r.id,
                title: r.title,
                category: r.category,
                similarity: r.similarity,
                score: r.score
            }))
        };
    } catch (e) {
        // Retornar resultados sin procesar
        return {
            success: true,
            response: null,
            results: results.slice(0, 3).map(r => ({
                id: r.id,
                title: r.title,
                content: r.content.substring(0, 300),
                category: r.category
            }))
        };
    }
}

// ═══════════════════════════════════════════════════
//  SINCRONIZACIÓN DESDE DISCORD
// ═══════════════════════════════════════════════════

/**
 * Indexa mensajes de un canal
 */
async function indexChannel(guildId, channelId, client, limit = 100) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) return { indexed: 0 };

        const messages = await channel.messages.fetch({ limit });
        let indexed = 0;

        for (const msg of messages.values()) {
            if (msg.author.bot || !msg.content || msg.content.length < 20) continue;

            // Verificar si ya existe
            const existing = _db.prepare(`
                SELECT id FROM knowledge_documents 
                WHERE guild_id = ? AND source = ? AND content = ?
            `).get(guildId, `channel:${channelId}`, msg.content.substring(0, 500));

            if (!existing) {
                addDocument(
                    guildId,
                    `Mensaje en #${channel.name}`,
                    msg.content,
                    'channel_archive',
                    [],
                    `channel:${channelId}`,
                    msg.author.id
                );
                indexed++;
            }
        }

        return { indexed, total: messages.size };
    } catch (e) {
        console.error('[SemanticSearch] Index error:', e.message);
        return { indexed: 0, error: e.message };
    }
}

/**
 * Indexa reglas del servidor
 */
function indexRules(guildId, rules) {
    for (const [index, rule] of rules.entries()) {
        addDocument(
            guildId,
            `Regla ${index + 1}`,
            rule,
            'rules',
            ['regla', 'norma', 'reglamento'],
            'server_rules'
        );
    }
    return { indexed: rules.length };
}

/**
 * Indexa FAQs
 */
function indexFAQs(guildId, faqs) {
    for (const faq of faqs) {
        addDocument(
            guildId,
            faq.question,
            `P: ${faq.question}\nR: ${faq.answer}`,
            'faq',
            faq.keywords || [],
            'server_faq'
        );
    }
    return { indexed: faqs.length };
}

// ═══════════════════════════════════════════════════
//  ESTADÍSTICAS
// ═══════════════════════════════════════════════════

function getStats(guildId) {
    const total = _db.prepare('SELECT COUNT(*) as count FROM knowledge_documents WHERE guild_id = ?').get(guildId);
    const byCategory = _db.prepare(`
        SELECT category, COUNT(*) as count 
        FROM knowledge_documents 
        WHERE guild_id = ? 
        GROUP BY category
    `).all(guildId);
    const withEmbeddings = _db.prepare(`
        SELECT COUNT(*) as count 
        FROM knowledge_documents kd
        JOIN knowledge_embeddings ke ON kd.id = ke.doc_id
        WHERE kd.guild_id = ?
    `).get(guildId);

    return {
        total: total.count,
        byCategory,
        withEmbeddings: withEmbeddings.count
    };
}

// ═══════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════

module.exports = {
    addDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    listDocuments,
    keywordSearch,
    semanticSearch,
    intelligentSearch,
    indexChannel,
    indexRules,
    indexFAQs,
    getStats
};
