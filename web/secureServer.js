// ═══════════════════════════════════════════════════
//  PROPHET BOT — Servidor Dashboard Seguro
// ═══════════════════════════════════════════════════

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { URL } = require('url');

const config = require('../config');
const { stmts } = require('../database');
const { getDashboardSnapshot, updateEditableConfig, sendDailySummary } = require('./dashboardState');
const security = require('./security');
const middleware = require('./middleware');
const { handleAuthRoutes } = require('./authRoutes');
const { initializeSecurity, verifySecurityConfig, getSecuritySummary } = require('./initSecurity');

const PUBLIC_DIR = path.join(__dirname, 'public');

// ═══════════════════════════════════════════════════
//  CONFIGURACIÓN
// ═══════════════════════════════════════════════════

const STATIC_FILES = {
    '/dashboard': { filePath: path.join(PUBLIC_DIR, 'index.html'), contentType: 'text/html; charset=utf-8' },
    '/dashboard/': { filePath: path.join(PUBLIC_DIR, 'index.html'), contentType: 'text/html; charset=utf-8' },
    '/dashboard/app.js': { filePath: path.join(PUBLIC_DIR, 'app.js'), contentType: 'application/javascript; charset=utf-8' },
    '/dashboard/styles.css': { filePath: path.join(PUBLIC_DIR, 'styles.css'), contentType: 'text/css; charset=utf-8' },
};

// ═══════════════════════════════════════════════════
//  UTILIDADES
// ═══════════════════════════════════════════════════

function sendJson(res, statusCode, payload) {
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        ...security.getSecurityHeaders()
    };
    
    res.writeHead(statusCode, headers);
    res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, text) {
    res.writeHead(statusCode, {
        'Content-Type': 'text/plain; charset=utf-8',
        ...security.getSecurityHeaders()
    });
    res.end(text);
}

function sendRedirect(res, location) {
    res.writeHead(302, { 
        Location: location, 
        ...security.getSecurityHeaders()
    });
    res.end();
}

function serveStaticFile(res, filePath, contentType) {
    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, {
            'Content-Type': contentType,
            ...security.getSecurityHeaders()
        });
        res.end(content);
    } catch (error) {
        sendText(res, 500, `No se pudo servir el recurso: ${error.message}`);
    }
}

// ═══════════════════════════════════════════════════
//  HANDLERS DE API PROTEGIDOS
// ═══════════════════════════════════════════════════

/**
 * GET /api/health - Health check público
 */
function handleHealth(req, res, client) {
    sendJson(res, 200, {
        ok: true,
        ready: client.isReady(),
        generatedAt: new Date().toISOString(),
    });
}

/**
 * GET /api/dashboard - Snapshot completo del dashboard
 */
function handleDashboard(req, res, client) {
    try {
        const snapshot = getDashboardSnapshot(client);
        sendJson(res, 200, snapshot);
    } catch (error) {
        sendJson(res, 500, { ok: false, error: error.message });
    }
}

/**
 * POST /api/config - Actualizar configuración
 */
function handleConfigUpdate(req, res, client) {
    try {
        const body = req.body || {};
        const updates = Array.isArray(body?.updates)
            ? body.updates
            : body?.key
                ? [{ key: body.key, value: body.value }]
                : [];
        
        const updated = updateEditableConfig(client, updates);
        
        security.auditLog('config_updated', {
            userId: req.user?.id,
            ipAddress: req.clientInfo?.ipAddress,
            userAgent: req.clientInfo?.userAgent,
            details: { updates: updated.map(u => u.key) }
        });
        
        sendJson(res, 200, {
            ok: true,
            updated,
            generatedAt: new Date().toISOString(),
        });
    } catch (error) {
        sendJson(res, 400, { ok: false, error: error.message });
    }
}

/**
 * POST /api/tickets/close - Cerrar ticket
 */
async function handleTicketClose(req, res, client) {
    try {
        const body = req.body || {};
        const channelId = body?.channelId;
        
        if (!channelId) throw new Error('channelId es requerido');

        const ticket = stmts.getTicket(channelId);
        if (!ticket) throw new Error('Ticket no encontrado');

        const guild = client.guilds.cache.get(config.GUILD_ID) || client.guilds.cache.first();
        const channel = guild?.channels?.cache?.get(channelId);

        if (channel) {
            await channel.delete('Cerrado desde dashboard');
        }

        stmts.deleteTicket(channelId);
        stmts.addLog('ticket_closed', { channelId, userId: ticket.user_id, closedFrom: 'dashboard' });
        
        security.auditLog('ticket_closed', {
            userId: req.user?.id,
            ipAddress: req.clientInfo?.ipAddress,
            resource: 'ticket',
            resourceId: channelId
        });

        sendJson(res, 200, { ok: true, deleted: channelId });
    } catch (error) {
        sendJson(res, 400, { ok: false, error: error.message });
    }
}

/**
 * POST /api/giveaways/end - Finalizar sorteo
 */
async function handleGiveawayEnd(req, res, client) {
    try {
        const body = req.body || {};
        const messageId = body?.messageId;
        
        if (!messageId) throw new Error('messageId es requerido');

        const giveaway = stmts.getGiveaway(messageId);
        if (!giveaway) throw new Error('Sorteo no encontrado');
        if (giveaway.ended) throw new Error('El sorteo ya terminó');

        const { finalizarSorteo } = require('../modules/giveaways');
        const result = await finalizarSorteo(client, giveaway);
        if (!result.ended) throw new Error(result.error || 'El sorteo ya se está finalizando');

        stmts.addLog('giveaway_ended', { messageId, winners: result.winners, prize: giveaway.prize, fromDashboard: true });
        
        security.auditLog('giveaway_ended', {
            userId: req.user?.id,
            ipAddress: req.clientInfo?.ipAddress,
            resource: 'giveaway',
            resourceId: messageId,
            details: { winners: result.winners, prize: giveaway.prize }
        });

        sendJson(res, 200, { ok: true, winners: result.winners });
    } catch (error) {
        sendJson(res, 400, { ok: false, error: error.message });
    }
}

/**
 * POST /api/reminders/delete - Eliminar recordatorio
 */
function handleReminderDelete(req, res) {
    try {
        const body = req.body || {};
        const reminderId = body?.id;
        
        if (!reminderId) throw new Error('id es requerido');

        const deleted = stmts.deleteReminder(reminderId);
        if (!deleted) throw new Error('Recordatorio no encontrado');

        stmts.addLog('reminder_deleted', { reminderId, fromDashboard: true });
        
        security.auditLog('reminder_deleted', {
            userId: req.user?.id,
            ipAddress: req.clientInfo?.ipAddress,
            resource: 'reminder',
            resourceId: reminderId
        });

        sendJson(res, 200, { ok: true, deleted: reminderId });
    } catch (error) {
        sendJson(res, 400, { ok: false, error: error.message });
    }
}

/**
 * POST /api/warns/clear - Limpiar warns
 */
function handleWarnsClear(req, res) {
    try {
        const body = req.body || {};
        const userId = body?.userId;
        
        if (!userId) throw new Error('userId es requerido');

        stmts.clearWarns(userId);
        stmts.addLog('warns_cleared', { userId, fromDashboard: true });
        
        security.auditLog('warns_cleared', {
            userId: req.user?.id,
            ipAddress: req.clientInfo?.ipAddress,
            resource: 'user',
            resourceId: userId
        });

        sendJson(res, 200, { ok: true, cleared: userId });
    } catch (error) {
        sendJson(res, 400, { ok: false, error: error.message });
    }
}

/**
 * POST /api/summary/send - Enviar resumen diario
 */
async function handleSummarySend(req, res, client) {
    try {
        const result = await sendDailySummary(client);
        
        security.auditLog('summary_sent', {
            userId: req.user?.id,
            ipAddress: req.clientInfo?.ipAddress,
            details: { success: result.success }
        });
        
        sendJson(res, 200, { 
            ok: result.success, 
            ...(result.success ? { channelId: result.channelId } : { error: result.error }) 
        });
    } catch (error) {
        sendJson(res, 400, { ok: false, error: error.message });
    }
}

/**
 * GET /api/security/summary - Resumen de seguridad
 */
function handleSecuritySummary(req, res) {
    try {
        const summary = getSecuritySummary();
        const configVerification = verifySecurityConfig();
        
        sendJson(res, 200, {
            ok: true,
            summary,
            config: {
                valid: configVerification.valid,
                errors: configVerification.errors,
                warnings: configVerification.warnings
            }
        });
    } catch (error) {
        sendJson(res, 500, { ok: false, error: error.message });
    }
}

// ═══════════════════════════════════════════════════
//  ROUTER PRINCIPAL
// ═══════════════════════════════════════════════════

function createRequestHandler(client) {
    return (req, res) => {
        const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = requestUrl.pathname;
        const method = req.method;
        req.query = Object.fromEntries(requestUrl.searchParams.entries());

        if (
            pathname.startsWith('/api/auth') ||
            pathname.startsWith('/api/users') ||
            pathname.startsWith('/api/security')
        ) {
            if (handleAuthRoutes(req, res, pathname, method)) {
                return;
            }
        }

        if (pathname === '/api/health' && method === 'GET') {
            return middleware.apiSecurity(req, res, () => handleHealth(req, res, client));
        }

        if (pathname === '/api/dashboard' && method === 'GET') {
            return middleware.protectedApi('dashboard:read')(req, res, () => handleDashboard(req, res, client));
        }

        if (pathname === '/api/config' && method === 'POST') {
            return middleware.protectedApi('config:write')(req, res, () => handleConfigUpdate(req, res, client));
        }

        if (pathname === '/api/tickets/close' && method === 'POST') {
            return middleware.protectedApi('tickets:close')(req, res, () => handleTicketClose(req, res, client));
        }

        if (pathname === '/api/giveaways/end' && method === 'POST') {
            return middleware.protectedApi('giveaways:end')(req, res, () => handleGiveawayEnd(req, res, client));
        }

        if (pathname === '/api/reminders/delete' && method === 'POST') {
            return middleware.protectedApi('moderation:write')(req, res, () => handleReminderDelete(req, res));
        }

        if (pathname === '/api/warns/clear' && method === 'POST') {
            return middleware.protectedApi('moderation:write')(req, res, () => handleWarnsClear(req, res));
        }

        if (pathname === '/api/summary/send' && method === 'POST') {
            return middleware.protectedApi('config:write')(req, res, () => handleSummarySend(req, res, client));
        }

        if (pathname === '/api/security/summary' && method === 'GET') {
            return middleware.protectedApi('security:read')(req, res, () => handleSecuritySummary(req, res));
        }

        if (pathname.startsWith('/api/')) {
            return sendJson(res, 404, { ok: false, error: 'Ruta no encontrada' });
        }

        if (pathname === '/') {
            return sendRedirect(res, '/dashboard');
        }

        if (method === 'GET' && STATIC_FILES[pathname]) {
            const asset = STATIC_FILES[pathname];
            return serveStaticFile(res, asset.filePath, asset.contentType);
        }

        if (method !== 'GET') {
            return sendText(res, 405, 'Método no permitido.');
        }

        sendText(res, 404, 'Ruta no encontrada.');
    };
}

// ═══════════════════════════════════════════════════
//  INICIALIZACIÓN DEL SERVIDOR
// ═══════════════════════════════════════════════════

async function startDashboardServer(client) {
    if (!config.DASHBOARD.ENABLED) {
        console.log('🌐 Dashboard deshabilitado por configuración');
        return null;
    }
    
    // Verificar configuración de seguridad
    const securityVerification = verifySecurityConfig();
    
    if (securityVerification.errors.length > 0) {
        console.error('❌ Errores de configuración de seguridad:');
        securityVerification.errors.forEach(err => console.error(`   - ${err}`));
        throw new Error('La configuración de seguridad del dashboard no es válida.');
    }
    
    if (securityVerification.warnings.length > 0) {
        console.warn('⚠️  Advertencias de seguridad:');
        securityVerification.warnings.forEach(warn => console.warn(`   - ${warn}`));
    }
    
    // Inicializar seguridad (crear tablas, usuario admin, etc.)
    const securityReady = await initializeSecurity();
    if (!securityReady) {
        throw new Error('Falló la inicialización de seguridad del dashboard.');
    }
    
    // Crear servidor HTTP o HTTPS
    const useHttps = process.env.HTTPS_ENABLED === 'true';
    let servingHttps = useHttps;
    let server;
    
    if (useHttps) {
        const sslKey = process.env.SSL_KEY_PATH || path.join(__dirname, '..', 'data', 'ssl', 'key.pem');
        const sslCert = process.env.SSL_CERT_PATH || path.join(__dirname, '..', 'data', 'ssl', 'cert.pem');
        
        try {
            const httpsOptions = {
                key: fs.readFileSync(sslKey),
                cert: fs.readFileSync(sslCert)
            };
            server = https.createServer(httpsOptions, createRequestHandler(client));
        } catch (error) {
            console.error('❌ Error cargando certificados SSL:', error.message);
            const localOnly = ['127.0.0.1', 'localhost', '::1'].includes(config.DASHBOARD.HOST);
            if (!localOnly) {
                throw new Error('No se permite fallback a HTTP para un dashboard expuesto externamente.');
            }
            console.log('⚠️  Usando HTTP local en lugar de HTTPS');
            servingHttps = false;
            server = http.createServer(createRequestHandler(client));
        }
    } else {
        server = http.createServer(createRequestHandler(client));
    }
    
    // Manejo de errores
    server.on('error', (error) => {
        console.error(`❌ Error en servidor dashboard: ${error.message}`);
    });
    
    // Iniciar servidor
    const host = config.DASHBOARD.HOST;
    const port = config.DASHBOARD.PORT;
    
    server.listen(port, host, () => {
        const protocol = servingHttps ? 'https' : 'http';
        const authMode = 'autenticación JWT + RBAC';
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔐 DASHBOARD SEGURO INICIADO');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`   URL: ${protocol}://${host}:${port}/dashboard`);
        console.log(`   Modo: ${authMode}`);
        console.log(`   HTTPS: ${servingHttps ? 'Habilitado' : 'Deshabilitado'}`);
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        
        if (!servingHttps && !['127.0.0.1', 'localhost', '::1'].includes(host)) {
            console.warn('⚠️  ADVERTENCIA: El dashboard está accesible externamente sin HTTPS.');
            console.warn('   Se recomienda usar HTTPS en producción.');
        }
    });
    
    return server;
}

module.exports = { startDashboardServer };
