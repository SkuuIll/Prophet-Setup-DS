const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');

const config = require('../config');
const { stmts } = require('../database');
const { getDashboardSnapshot, updateEditableConfig, sendDailySummary } = require('./dashboardState');

const PUBLIC_DIR = path.join(__dirname, 'public');
const LOCAL_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

const STATIC_FILES = {
    '/dashboard': { filePath: path.join(PUBLIC_DIR, 'index.html'), contentType: 'text/html; charset=utf-8' },
    '/dashboard/': { filePath: path.join(PUBLIC_DIR, 'index.html'), contentType: 'text/html; charset=utf-8' },
    '/dashboard/app.js': { filePath: path.join(PUBLIC_DIR, 'app.js'), contentType: 'application/javascript; charset=utf-8' },
    '/dashboard/styles.css': { filePath: path.join(PUBLIC_DIR, 'styles.css'), contentType: 'text/css; charset=utf-8' },
};

function safeCompare(a, b) {
    const left = Buffer.from(String(a || ''));
    const right = Buffer.from(String(b || ''));

    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
}

function getRequestToken(req, requestUrl) {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    return req.headers['x-dashboard-token'] || requestUrl.searchParams.get('token') || bearer || null;
}

function isLocalRequest(req) {
    return LOCAL_ADDRESSES.has(req.socket.remoteAddress);
}

function isAuthorized(req, requestUrl) {
    if (!config.DASHBOARD.TOKEN) {
        return isLocalRequest(req);
    }

    return safeCompare(getRequestToken(req, requestUrl), config.DASHBOARD.TOKEN);
}

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, text) {
    res.writeHead(statusCode, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
    });
    res.end(text);
}

function sendRedirect(res, location) {
    res.writeHead(302, { Location: location, 'Cache-Control': 'no-store' });
    res.end();
}

function serveStaticFile(res, filePath, contentType) {
    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-store',
        });
        res.end(content);
    } catch (error) {
        sendText(res, 500, `No se pudo servir el recurso: ${error.message}`);
    }
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';

        req.on('data', chunk => {
            raw += chunk;
            if (raw.length > 64 * 1024) {
                reject(new Error('El payload excede el límite permitido.'));
            }
        });

        req.on('end', () => {
            if (!raw) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(raw));
            } catch {
                reject(new Error('El body debe ser JSON válido.'));
            }
        });

        req.on('error', reject);
    });
}

function requestHandler(client) {
    return async (req, res) => {
        const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = requestUrl.pathname;

        if (pathname === '/') {
            const token = requestUrl.searchParams.get('token');
            sendRedirect(res, token ? `/dashboard?token=${encodeURIComponent(token)}` : '/dashboard');
            return;
        }

        if (!isAuthorized(req, requestUrl)) {
            sendText(res, config.DASHBOARD.TOKEN ? 401 : 403, config.DASHBOARD.TOKEN ? 'Dashboard token inválido o ausente.' : 'Acceso permitido solo desde localhost.');
            return;
        }

        if (pathname === '/api/health' && req.method === 'GET') {
            sendJson(res, 200, {
                ok: true,
                ready: client.isReady(),
                generatedAt: new Date().toISOString(),
            });
            return;
        }

        if (pathname === '/api/dashboard' && req.method === 'GET') {
            try {
                sendJson(res, 200, getDashboardSnapshot(client));
            } catch (error) {
                sendJson(res, 500, {
                    ok: false,
                    error: error.message,
                });
            }
            return;
        }

        if (pathname === '/api/config' && req.method === 'POST') {
            try {
                const body = await readJsonBody(req);
                const updates = Array.isArray(body?.updates)
                    ? body.updates
                    : body?.key
                        ? [{ key: body.key, value: body.value }]
                        : [];
                const updated = updateEditableConfig(client, updates);
                sendJson(res, 200, {
                    ok: true,
                    updated,
                    generatedAt: new Date().toISOString(),
                });
            } catch (error) {
                sendJson(res, 400, {
                    ok: false,
                    error: error.message,
                });
            }
            return;
        }

        if (pathname === '/api/tickets/close' && req.method === 'POST') {
            try {
                const body = await readJsonBody(req);
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

                sendJson(res, 200, { ok: true, deleted: channelId });
            } catch (error) {
                sendJson(res, 400, { ok: false, error: error.message });
            }
            return;
        }

        if (pathname === '/api/giveaways/end' && req.method === 'POST') {
            try {
                const body = await readJsonBody(req);
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
                sendJson(res, 200, { ok: true, winner: winner.user_id });
            } catch (error) {
                sendJson(res, 400, { ok: false, error: error.message });
            }
            return;
        }

        if (pathname === '/api/reminders/delete' && req.method === 'POST') {
            try {
                const body = await readJsonBody(req);
                const reminderId = body?.id;
                if (!reminderId) throw new Error('id es requerido');

                const deleted = stmts.deleteReminder(reminderId);
                if (!deleted) throw new Error('Recordatorio no encontrado');

                stmts.addLog('reminder_deleted', { reminderId, fromDashboard: true });
                sendJson(res, 200, { ok: true, deleted: reminderId });
            } catch (error) {
                sendJson(res, 400, { ok: false, error: error.message });
            }
            return;
        }

        if (pathname === '/api/warns/clear' && req.method === 'POST') {
            try {
                const body = await readJsonBody(req);
                const userId = body?.userId;
                if (!userId) throw new Error('userId es requerido');

                stmts.clearWarns(userId);
                stmts.addLog('warns_cleared', { userId, fromDashboard: true });
                sendJson(res, 200, { ok: true, cleared: userId });
            } catch (error) {
                sendJson(res, 400, { ok: false, error: error.message });
            }
            return;
        }

        if (pathname === '/api/summary/send' && req.method === 'POST') {
            try {
                const result = await sendDailySummary(client);
                sendJson(res, 200, { ok: result.success, ...(result.success ? { channelId: result.channelId } : { error: result.error }) });
            } catch (error) {
                sendJson(res, 400, { ok: false, error: error.message });
            }
            return;
        }

        if (req.method !== 'GET') {
            sendText(res, 405, 'Método no permitido.');
            return;
        }

        if (STATIC_FILES[pathname]) {
            const asset = STATIC_FILES[pathname];
            serveStaticFile(res, asset.filePath, asset.contentType);
            return;
        }

        sendText(res, 404, 'Ruta no encontrada.');
    };
}

function startDashboardServer(client) {
    if (!config.DASHBOARD.ENABLED) {
        console.log('🌐 Dashboard interno deshabilitado por configuración');
        return null;
    }

    const server = http.createServer(requestHandler(client));

    server.on('error', (error) => {
        console.error(`❌ Error iniciando dashboard interno: ${error.message}`);
    });

    server.listen(config.DASHBOARD.PORT, config.DASHBOARD.HOST, () => {
        const authHint = config.DASHBOARD.TOKEN ? ' · protegido por token' : ' · solo localhost';
        console.log(`🌐 Dashboard interno: http://${config.DASHBOARD.HOST}:${config.DASHBOARD.PORT}/dashboard${authHint}`);
    });

    return server;
}

module.exports = { startDashboardServer };
