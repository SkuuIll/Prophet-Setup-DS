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
function handleTicketClose(req, res, client) {
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
function handleGiveawayEnd(req, res, client) {
    try {
        const body = req.body || {};
        const messageId = body?.messageId;
        
        if (!messageId) throw new Error('messageId es requerido');

        const giveaway = stmts.getGiveaway(messageId);
        if (!giveaway) throw new Error('Sorteo no encontrado');
        if (giveaway.ended) throw new Error('El sorteo ya terminó');

        const entries = stmts.getGiveawayEntries(messageId);
        if (entries.length === 0) throw new Error('No hay participantes');

        const winner = entries[Math.floor(Math.random() * entries.length)];
        stmts.endGiveaway(messageId);

        const guild = client.guilds.cache.get(config.GUILD_ID) || client.guilds.cache.first();
        const channel = guild?.channels?.cache?.get(giveaway.channel_id);

        if (channel) {
            await channel.send(`🎉 ¡El sorteo de **${giveaway.prize}** ha terminado!\n🎁 Ganador: <@${winner.user_id}>`);
        }

        stmts.addLog('giveaway_ended', { messageId, winner: winner.user_id, prize: giveaway.prize, fromDashboard: true });
        
        security.auditLog('giveaway_ended', {
            userId: req.user?.id,
            ipAddress: req.clientInfo?.ipAddress,
            resource: 'giveaway',
            resourceId: messageId,
            details: { winner: winner.user_id, prize: giveaway.prize }
        });

        sendJson(res, 200, { ok: true, winner: winner.user_id });
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
function handleSummarySend(req, res, client) {
    try {
        const result = sendDailySummary(client);
        
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
    return async (req, res) => {
        const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = requestUrl.pathname;
        const method = req.method;
        
        // Aplicar middleware base (headers de seguridad, CORS, etc.)
        middleware.apiSecurity(req, res, () => {
            // Rutas de autenticación (manejadas por authRoutes)
            if (pathname.startsWith('/api/auth') || 
                pathname.startsWith('/api/users') || 
                pathname.startsWith('/api/security')) {
                
                const handled = handleAuthRoutes(req, res, pathname, method);
                if (handled) return;
            }
            
            // API de health (público)
            if (pathname === '/api/health' && method === 'GET') {
                return handleHealth(req, res, client);
            }
            
            // Rutas protegidas que requieren autenticación
            if (pathname.startsWith('/api/')) {
                return middleware.authenticate(req, res, () => {
                    // Dashboard principal
                    if (pathname === '/api/dashboard' && method === 'GET') {
                        return middleware.requirePermission('dashboard:read')(req, res, () => 
                            handleDashboard(req, res, client)
                        );
                    }
                    
                    // Actualizar configuración
                    if (pathname === '/api/config' && method === 'POST') {
                        return middleware.requirePermission('config:write')(req, res, () => 
                            handleConfigUpdate(req, res, client)
                        );
                    }
                    
                    // Tickets
                    if (pathname === '/api/tickets/close' && method === 'POST') {
                        return middleware.requirePermission('tickets:close')(req, res, () => 
                            handleTicketClose(req, res, client)
                        );
                    }
                    
                    // Sorteos
                    if (pathname === '/api/giveaways/end' && method === 'POST') {
                        return middleware.requirePermission('giveaways:end')(req, res, () => 
                            handleGiveawayEnd(req, res, client)
                        );
                    }
                    
                    // Recordatorios
                    if (pathname === '/api/reminders/delete' && method === 'POST') {
                        return middleware.requirePermission('moderation:write')(req, res, () => 
                            handleReminderDelete(req, res)
                        );
                    }
                    
                    // Warns
                    if (pathname === '/api/warns/clear' && method === 'POST') {
                        return middleware.requirePermission('moderation:write')(req, res, () => 
                            handleWarnsClear(req, res)
                        );
                    }
                    
                    // Resumen
                    if (pathname === '/api/summary/send' && method === 'POST') {
                        return middleware.requirePermission('config:write')(req, res, () => 
                            handleSummarySend(req, res, client)
                        );
                    }
                    
                    // Seguridad
                    if (pathname === '/api/security/summary' && method === 'GET') {
                        return middleware.requirePermission('security:read')(req, res, () => 
                            handleSecuritySummary(req, res)
                        );
                    }
                    
                    // Ruta no encontrada
                    sendJson(res, 404, { ok: false, error: 'Ruta no encontrada' });
                });
            }
            
            // Redirección de raíz
            if (pathname === '/') {
                return sendRedirect(res, '/dashboard');
            }
            
            // Archivos estáticos
            if (method === 'GET' && STATIC_FILES[pathname]) {
                const asset = STATIC_FILES[pathname];
                return serveStaticFile(res, asset.filePath, asset.contentType);
            }
            
            // Método no permitido
            if (method !== 'GET') {
                return sendText(res, 405, 'Método no permitido.');
            }
            
            // Ruta no encontrada
            sendText(res, 404, 'Ruta no encontrada.');
        });
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
        return null;
    }
    
    if (securityVerification.warnings.length > 0) {
        console.warn('⚠️  Advertencias de seguridad:');
        securityVerification.warnings.forEach(warn => console.warn(`   - ${warn}`));
    }
    
    // Inicializar seguridad (crear tablas, usuario admin, etc.)
    await initializeSecurity();
    
    // Crear servidor HTTP o HTTPS
    const useHttps = process.env.HTTPS_ENABLED === 'true';
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
            console.log('⚠️  Usando HTTP en lugar de HTTPS');
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
        const protocol = useHttps ? 'https' : 'http';
        const authMode = 'autenticación JWT + RBAC';
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔐 DASHBOARD SEGURO INICIADO');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`   URL: ${protocol}://${host}:${port}/dashboard`);
        console.log(`   Modo: ${authMode}`);
        console.log(`   HTTPS: ${useHttps ? 'Habilitado' : 'Deshabilitado'}`);
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        
        if (!useHttps && host !== '127.0.0.1' && host !== 'localhost') {
            console.warn('⚠️  ADVERTENCIA: El dashboard está accesible externamente sin HTTPS.');
            console.warn('   Se recomienda usar HTTPS en producción.');
        }
    });
    
    return server;
}

module.exports = { startDashboardServer };
