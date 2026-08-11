const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const WebSocket = require('ws');
require('dotenv').config();

const AuthManager = require('./games/common/authManager');
const EconomyBridge = require('./games/common/economyBridge');
const DiscordActivityAuth = require('./games/common/discordActivityAuth');
const TycoonEngine = require('./games/tycoon/tycoonEngine');
const CrashEngine = require('./games/casino/crashEngine');
const RouletteEngine = require('./games/casino/rouletteEngine');
const CasesEngine = require('./games/casino/casesEngine');
const TriviaEngine = require('./games/trivia/triviaEngine');
const TrucoEngine = require('./games/cards/trucoEngine');
const BlackjackEngine = require('./games/cards/blackjackEngine');
const UnoEngine = require('./games/cards/unoEngine');
const SurvivorEngine = require('./games/survivor/survivorEngine');

const PORT = parseInt(process.env.GAMES_PORT || '3850', 10);
const GAMES_DIR = path.join(__dirname, 'web', 'public', 'games');
const ASSETS_DIR = path.join(__dirname, 'assets');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.woff2': 'font/woff2',
    '.map': 'application/json'
};

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1e6) {
                reject(new Error('Body demasiado grande'));
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(new Error('JSON inválido'));
            }
        });
        req.on('error', reject);
    });
}

function sendJson(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
}

// ═══ SERVIDOR HTTP PARA ASSETS Y API REST ═══
const server = http.createServer(async (req, res) => {
    // Headers para Discord Activities (iframe en client.discord.com)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Permitir embebido en Discord
    res.setHeader('Content-Security-Policy',
        "frame-ancestors https://discord.com https://*.discord.com https://discordapp.com https://*.discordapp.com https://*.discordsays.com;"
    );
    // Quitar X-Frame-Options si algún proxy lo pone
    res.removeHeader('X-Frame-Options');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = parsedUrl.pathname;

    // Log útil para depurar launches de Activity (sin body/secretos)
    if (!pathname.match(/\.(css|js|mjs|png|jpg|svg|ico|woff2?)$/i)) {
        console.log(`[HTTP] ${req.method} ${pathname} host=${req.headers.host || '-'} ua=${(req.headers['user-agent'] || '').slice(0, 60)}`);
    }

    // ─── API: config pública Activity ───
    if (pathname === '/api/games/config' || pathname === '/.proxy/api/games/config') {
        return sendJson(res, 200, DiscordActivityAuth.getPublicConfig());
    }

    // ─── API: OAuth token exchange (Discord Activities) ───
    // Discord tutorial usa POST /api/token
    if ((pathname === '/api/token' || pathname === '/.proxy/api/token'
        || pathname === '/api/games/token' || pathname === '/.proxy/api/games/token')
        && req.method === 'POST') {
        try {
            const data = await readJsonBody(req);
            const result = await DiscordActivityAuth.exchangeCodeForToken(data.code);
            if (!result.success) {
                return sendJson(res, 400, { error: result.error });
            }
            return sendJson(res, 200, { access_token: result.access_token });
        } catch (e) {
            return sendJson(res, 400, { error: e.message || 'Error OAuth' });
        }
    }

    // ─── API: Activity full auth → game session ───
    if ((pathname === '/api/games/activity-auth' || pathname === '/.proxy/api/games/activity-auth')
        && req.method === 'POST') {
        try {
            const data = await readJsonBody(req);
            const result = await DiscordActivityAuth.createActivitySession(data.code, data.ttlMinutes || 180);
            if (!result.success) {
                return sendJson(res, 400, { error: result.error });
            }
            const eco = EconomyBridge.getUserBalance(result.user.id);
            return sendJson(res, 200, {
                sessionToken: result.sessionToken,
                access_token: result.access_token,
                user: result.user,
                balance: eco.balance,
                bank: eco.bank,
                level: eco.level
            });
        } catch (e) {
            console.error('activity-auth error:', e);
            return sendJson(res, 500, { error: e.message || 'Error de autenticación Activity' });
        }
    }

    // ─── API REST sesión ───
    if (pathname === '/api/games/session-info' || pathname === '/.proxy/api/games/session-info') {
        const token = parsedUrl.searchParams.get('token');
        const session = AuthManager.validateToken(token);
        if (!session) {
            return sendJson(res, 401, { error: 'Token inválido o expirado' });
        }

        const eco = EconomyBridge.getUserBalance(session.userId);
        return sendJson(res, 200, {
            userId: session.userId,
            username: session.user?.username || session.userId,
            level: eco.level,
            xp: eco.xp,
            balance: eco.balance,
            bank: eco.bank
        });
    }

    if ((pathname === '/api/games/create-token' || pathname === '/.proxy/api/games/create-token')
        && req.method === 'POST') {
        try {
            const data = await readJsonBody(req);
            // Solo permitir create-token desde bots internos con secret
            const internalSecret = process.env.GAMES_INTERNAL_SECRET || '';
            if (internalSecret && data.secret !== internalSecret) {
                return sendJson(res, 403, { error: 'No autorizado' });
            }
            if (!data.userId) {
                return sendJson(res, 400, { error: 'Falta userId' });
            }
            const token = AuthManager.createSession(data.userId, data.ttlMinutes || 120);
            return sendJson(res, 200, { token });
        } catch (e) {
            return sendJson(res, 400, { error: e.message || 'JSON inválido' });
        }
    }

    // ─── STATIC: /assets/* (logo, banners del bot) ───
    if (pathname.startsWith('/assets/')) {
        const assetRel = path.normalize(pathname.replace(/^\/assets\//, '')).replace(/^(\.\.[\/\\])+/, '');
        const assetPath = path.join(ASSETS_DIR, assetRel);
        if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
            const ext = path.extname(assetPath).toLowerCase();
            res.writeHead(200, {
                'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
                'Cache-Control': 'public, max-age=3600'
            });
            return fs.createReadStream(assetPath).pipe(res);
        }
        res.writeHead(404);
        return res.end('asset not found');
    }

    // ─── STATIC FILES ROUTING ───
    // Discord Activity entry "/" y rutas cortas /tycoon /casino etc.
    const SHORT_GAMES = {
        '/': '/games/hub/index.html',
        '/games': '/games/hub/index.html',
        '/games/': '/games/hub/index.html',
        '/hub': '/games/hub/index.html',
        '/hub/': '/games/hub/index.html',
        '/tycoon': '/games/tycoon/index.html',
        '/tycoon/': '/games/tycoon/index.html',
        '/casino': '/games/casino/index.html',
        '/casino/': '/games/casino/index.html',
        '/trivia': '/games/trivia/index.html',
        '/trivia/': '/games/trivia/index.html',
        '/cards': '/games/cards/index.html',
        '/cards/': '/games/cards/index.html',
        '/survivor': '/games/survivor/index.html',
        '/survivor/': '/games/survivor/index.html',
        '/games/hub': '/games/hub/index.html',
        '/games/hub/': '/games/hub/index.html',
        '/games/tycoon': '/games/tycoon/index.html',
        '/games/tycoon/': '/games/tycoon/index.html',
        '/games/casino': '/games/casino/index.html',
        '/games/casino/': '/games/casino/index.html',
        '/games/trivia': '/games/trivia/index.html',
        '/games/trivia/': '/games/trivia/index.html',
        '/games/cards': '/games/cards/index.html',
        '/games/cards/': '/games/cards/index.html',
        '/games/survivor': '/games/survivor/index.html',
        '/games/survivor/': '/games/survivor/index.html'
    };
    if (SHORT_GAMES[pathname]) {
        pathname = SHORT_GAMES[pathname];
    }

    // Mapear /games/* a web/public/games/*
    // Nunca usar path absoluto en join (evita path.join(dir, '/tycoon') → '/tycoon')
    let relativePath = pathname.replace(/^\/games\//, '').replace(/^\//, '');
    if (pathname.startsWith('/vendor/')) {
        relativePath = pathname.replace(/^\//, '');
    }
    let safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '').replace(/^[/\\]+/, '');
    let filePath = path.join(GAMES_DIR, safePath);

    // Si es directorio, buscar index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 - Prophet Games: Archivo no encontrado');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const noCache = ext === '.html' || ext === '.js' || ext === '.mjs' || ext === '.css';
    res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': noCache ? 'no-store, no-cache, must-revalidate' : 'public, max-age=300'
    });
    fs.createReadStream(filePath).pipe(res);
});

// ═══ SERVIDOR WEBSOCKET PARA JUEGOS EN TIEMPO REAL ═══
// Acepta /ws y /.proxy/ws (proxy de Discord Activities)
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (pathname === '/ws' || pathname === '/.proxy/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

// Conectar broadcast de Crash a todos los clientes conectados
CrashEngine.setBroadcast((payload) => {
    const msg = JSON.stringify(payload);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
});

// Conectar broadcast de Trivia por sala
TriviaEngine.setBroadcast((roomId, payload) => {
    const msg = JSON.stringify(payload);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.currentRoomId === roomId) {
            client.send(msg);
        }
    });
});

// Conectar broadcast de Truco por mesa
TrucoEngine.setBroadcast((tableId, payload) => {
    const msg = JSON.stringify(payload);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.currentTableId === tableId) {
            client.send(msg);
        }
    });
});

// UNO: broadcast genérico + personalizado (cada uno ve su mano)
UnoEngine.setBroadcast((tableId, payload) => {
    const msg = JSON.stringify(payload);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.currentUnoTableId === tableId) {
            client.send(msg);
        }
    });
});
UnoEngine.setPersonalBroadcast((tableId, buildForUser) => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.currentUnoTableId === tableId && client.userId) {
            const payload = buildForUser(client.userId);
            client.send(JSON.stringify(payload));
        }
    });
});

wss.on('connection', (ws) => {
    let sessionUser = null;
    ws.isAlive = true;

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', (messageRaw) => {
        try {
            const data = JSON.parse(messageRaw);

            // 1. Autenticación Inicial
            if (data.type === 'auth') {
                const session = AuthManager.validateToken(data.token);
                if (!session) {
                    // Demo mode: allow local testing without Discord token
                    if (data.token === 'demo_token' || !data.token) {
                        sessionUser = {
                            userId: 'demo_user',
                            username: 'Demo',
                            user: { id: 'demo_user', username: 'Demo' }
                        };
                        ws.userId = 'demo_user';
                        ws.send(JSON.stringify({
                            type: 'auth_success',
                            userId: 'demo_user',
                            username: 'Demo',
                            user: sessionUser.user,
                            balance: 10000,
                            bank: 0,
                            level: 1,
                            demo: true
                        }));
                        return;
                    }
                    ws.send(JSON.stringify({ type: 'auth_error', message: 'Token de sesión inválido o expirado' }));
                    return;
                }
                const displayName = session.username
                    || session.user?.username
                    || `Jugador_${String(session.userId).slice(-4)}`;
                sessionUser = {
                    ...session,
                    username: displayName,
                    avatar: session.avatar || session.user?.avatar || null
                };
                ws.userId = session.userId;
                const balanceData = EconomyBridge.getUserBalance(session.userId);
                ws.send(JSON.stringify({
                    type: 'auth_success',
                    userId: session.userId,
                    username: displayName,
                    avatar: sessionUser.avatar,
                    user: {
                        id: session.userId,
                        username: displayName,
                        avatar: sessionUser.avatar
                    },
                    balance: balanceData.balance,
                    bank: balanceData.bank,
                    level: balanceData.level
                }));
                return;
            }

            // Exigir autenticación para el resto de acciones
            if (!sessionUser) {
                ws.send(JSON.stringify({ type: 'error', message: 'No autenticado. Envía { type: "auth", token: "..." } primero' }));
                return;
            }

            const userId = sessionUser.userId;
            const username = sessionUser.username
                || sessionUser.user?.username
                || `Jugador_${String(userId).slice(-4)}`;

            // ─── HANDLERS DE TYCOON ───
            if (data.type === 'tycoon:init') {
                const state = TycoonEngine.loadUserGameState(userId);
                ws.send(JSON.stringify({ type: 'tycoon:state', state }));
            }
            else if (data.type === 'tycoon:click') {
                const resClick = TycoonEngine.processClick(userId, data.count || 1);
                ws.send(JSON.stringify({ type: 'tycoon:click_result', ...resClick }));
            }
            else if (data.type === 'tycoon:buy_server') {
                const resBuy = TycoonEngine.buyServer(userId, data.serverId);
                ws.send(JSON.stringify({ type: 'tycoon:buy_server_result', ...resBuy }));
            }
            else if (data.type === 'tycoon:buy_admin') {
                const resAdmin = TycoonEngine.buyAdmin(userId, data.adminId);
                ws.send(JSON.stringify({ type: 'tycoon:buy_admin_result', ...resAdmin }));
            }
            else if (data.type === 'tycoon:sync') {
                const resSync = TycoonEngine.syncPassiveGains(userId, data.addedCoins || 0);
                ws.send(JSON.stringify({ type: 'tycoon:sync_result', ...resSync }));
            }
            else if (data.type === 'tycoon:prestige') {
                const resPrestige = TycoonEngine.doPrestige(userId);
                ws.send(JSON.stringify({ type: 'tycoon:prestige_result', ...resPrestige }));
            }
            else if (data.type === 'tycoon:buy_research') {
                const resRes = TycoonEngine.buyResearch(userId, data.researchId);
                ws.send(JSON.stringify({ type: 'tycoon:buy_research_result', ...resRes }));
            }
            else if (data.type === 'tycoon:claim_mission') {
                const resMis = TycoonEngine.claimMission(userId, data.missionId);
                ws.send(JSON.stringify({ type: 'tycoon:claim_mission_result', ...resMis }));
            }

            // ─── HANDLERS DE CRASH ───
            else if (data.type === 'crash:init') {
                const state = CrashEngine.getState();
                ws.send(JSON.stringify({ type: 'crash:state', state }));
            }
            else if (data.type === 'crash:bet') {
                const resBet = CrashEngine.placeBet(userId, username, data.amount, data.autoCashout);
                ws.send(JSON.stringify({ type: 'crash:bet_result', ...resBet }));
            }
            else if (data.type === 'crash:cashout') {
                const resCashout = CrashEngine.processCashout(userId, data.multiplier);
                ws.send(JSON.stringify({ type: 'crash:cashout_result', ...resCashout }));
            }

            // ─── HANDLERS DE RULETA ───
            else if (data.type === 'roulette:spin') {
                const resSpin = RouletteEngine.spin(userId, data.bets);
                ws.send(JSON.stringify({ type: 'roulette:spin_result', ...resSpin }));
            }

            // ─── HANDLERS DE CAJAS CS2 ───
            else if (data.type === 'cases:get_list') {
                const list = CasesEngine.getCasesList();
                ws.send(JSON.stringify({ type: 'cases:list', list }));
            }
            else if (data.type === 'cases:get_details') {
                const details = CasesEngine.getCaseDetails(data.caseId);
                ws.send(JSON.stringify({ type: 'cases:details', caseId: data.caseId, details }));
            }
            else if (data.type === 'cases:open') {
                const resOpen = CasesEngine.openCase(userId, data.caseId);
                ws.send(JSON.stringify({ type: 'cases:open_result', ...resOpen }));
            }
            else if (data.type === 'cases:get_pity') {
                const pity = CasesEngine.getPityState(userId);
                ws.send(JSON.stringify({ type: 'cases:pity', pity }));
            }

            // ─── HANDLERS DE TRIVIA PARTY ───
            else if (data.type === 'trivia:create_room') {
                const resCreate = TriviaEngine.createRoom(userId, username, data.questionCount || 7);
                if (resCreate.success) {
                    ws.currentRoomId = resCreate.room.roomId;
                }
                ws.send(JSON.stringify({ type: 'trivia:room_created', ...resCreate }));
            }
            else if (data.type === 'trivia:join_room') {
                const resJoin = TriviaEngine.joinRoom(data.roomId, userId, username);
                if (resJoin.success) {
                    ws.currentRoomId = resJoin.room.roomId;
                }
                ws.send(JSON.stringify({ type: 'trivia:room_joined', ...resJoin }));
            }
            else if (data.type === 'trivia:start_game') {
                const resStart = TriviaEngine.startGame(data.roomId, userId);
                ws.send(JSON.stringify({ type: 'trivia:start_result', ...resStart }));
            }
            else if (data.type === 'trivia:answer') {
                const resAns = TriviaEngine.submitAnswer(data.roomId, userId, data.optionIndex);
                ws.send(JSON.stringify({ type: 'trivia:answer_result', ...resAns }));
            }

            // ─── HANDLERS DE TRUCO ARGENTINO ───
            else if (data.type === 'truco:create_table') {
                const resTruco = TrucoEngine.createTable(userId, username, data.betAmount, data.targetScore);
                if (resTruco.success) {
                    ws.currentTableId = resTruco.table.tableId;
                }
                ws.send(JSON.stringify({ type: 'truco:table_created', ...resTruco }));
            }
            else if (data.type === 'truco:join_table') {
                const resJoin = TrucoEngine.joinTable(data.tableId, userId, username);
                if (resJoin.success) {
                    ws.currentTableId = resJoin.table.tableId;
                }
                ws.send(JSON.stringify({ type: 'truco:table_joined', ...resJoin }));
            }
            else if (data.type === 'truco:resync') {
                const resSync = TrucoEngine.getTableState(data.tableId || ws.currentTableId, userId);
                if (resSync.success) ws.currentTableId = resSync.table.tableId;
                ws.send(JSON.stringify({ type: 'truco:resync_result', ...resSync }));
            }
            else if (data.type === 'truco:play_card') {
                const resPlay = TrucoEngine.playCard(data.tableId, userId, data.cardIndex);
                ws.send(JSON.stringify({ type: 'truco:play_card_result', ...resPlay }));
            }
            else if (data.type === 'truco:canto') {
                const resCanto = TrucoEngine.makeCanto(data.tableId, userId, data.cantoType);
                ws.send(JSON.stringify({ type: 'truco:canto_result', ...resCanto }));
            }
            else if (data.type === 'truco:respond_canto') {
                const resResp = TrucoEngine.respondCanto(data.tableId, userId, data.response);
                ws.send(JSON.stringify({ type: 'truco:respond_canto_result', ...resResp }));
            }
            else if (data.type === 'truco:fold') {
                const resFold = TrucoEngine.foldHand(data.tableId, userId);
                ws.send(JSON.stringify({ type: 'truco:fold_result', ...resFold }));
            }

            // ─── HANDLERS DE UNO ───
            else if (data.type === 'uno:create_table') {
                const resUno = UnoEngine.createTable(userId, username, {
                    betAmount: data.betAmount,
                    maxPlayers: data.maxPlayers,
                    targetScore: data.targetScore,
                    allowStackDraw2: data.allowStackDraw2,
                    drawToMatch: data.drawToMatch
                });
                if (resUno.success) ws.currentUnoTableId = resUno.table.tableId;
                ws.send(JSON.stringify({ type: 'uno:table_created', ...resUno }));
            }
            else if (data.type === 'uno:join_table') {
                const resJoin = UnoEngine.joinTable(data.tableId, userId, username);
                if (resJoin.success) ws.currentUnoTableId = resJoin.table.tableId;
                ws.send(JSON.stringify({ type: 'uno:table_joined', ...resJoin }));
            }
            else if (data.type === 'uno:start') {
                const resStart = UnoEngine.startGame(data.tableId || ws.currentUnoTableId, userId);
                if (resStart.success) ws.currentUnoTableId = resStart.table.tableId;
                ws.send(JSON.stringify({ type: 'uno:start_result', ...resStart }));
            }
            else if (data.type === 'uno:play') {
                const resPlay = UnoEngine.playCard(
                    data.tableId || ws.currentUnoTableId,
                    userId,
                    data.cardId,
                    data.color
                );
                ws.send(JSON.stringify({ type: 'uno:play_result', ...resPlay }));
            }
            else if (data.type === 'uno:choose_color') {
                const resCol = UnoEngine.chooseColor(
                    data.tableId || ws.currentUnoTableId,
                    userId,
                    data.color
                );
                ws.send(JSON.stringify({ type: 'uno:color_result', ...resCol }));
            }
            else if (data.type === 'uno:draw') {
                const resDraw = UnoEngine.drawCard(data.tableId || ws.currentUnoTableId, userId);
                ws.send(JSON.stringify({ type: 'uno:draw_result', ...resDraw }));
            }
            else if (data.type === 'uno:pass') {
                const resPass = UnoEngine.passTurn(data.tableId || ws.currentUnoTableId, userId);
                ws.send(JSON.stringify({ type: 'uno:pass_result', ...resPass }));
            }
            else if (data.type === 'uno:call_uno') {
                const resCall = UnoEngine.callUno(data.tableId || ws.currentUnoTableId, userId);
                ws.send(JSON.stringify({ type: 'uno:call_result', ...resCall }));
            }
            else if (data.type === 'uno:catch_uno') {
                const resCatch = UnoEngine.catchUno(
                    data.tableId || ws.currentUnoTableId,
                    userId,
                    data.targetUserId
                );
                ws.send(JSON.stringify({ type: 'uno:catch_result', ...resCatch }));
            }
            else if (data.type === 'uno:challenge') {
                const resCh = UnoEngine.challengeWild4(
                    data.tableId || ws.currentUnoTableId,
                    userId,
                    !!data.accept
                );
                ws.send(JSON.stringify({ type: 'uno:challenge_result', ...resCh }));
            }
            else if (data.type === 'uno:resync') {
                const resSync = UnoEngine.getTableState(data.tableId || ws.currentUnoTableId, userId);
                if (resSync.success) ws.currentUnoTableId = resSync.table.tableId;
                ws.send(JSON.stringify({ type: 'uno:resync_result', ...resSync }));
            }

            // ─── HANDLERS DE BLACKJACK ───
            else if (data.type === 'blackjack:start') {
                const resBJ = BlackjackEngine.startHand(userId, data.betAmount);
                ws.send(JSON.stringify({ type: 'blackjack:started', ...resBJ }));
            }
            else if (data.type === 'blackjack:hit') {
                const resHit = BlackjackEngine.hit(userId);
                ws.send(JSON.stringify({ type: 'blackjack:hit_result', ...resHit }));
            }
            else if (data.type === 'blackjack:stand') {
                const resStand = BlackjackEngine.stand(userId);
                ws.send(JSON.stringify({ type: 'blackjack:stand_result', ...resStand }));
            }
            else if (data.type === 'blackjack:double') {
                const resDouble = BlackjackEngine.doubleDown(userId);
                ws.send(JSON.stringify({ type: 'blackjack:double_result', ...resDouble }));
            }
            else if (data.type === 'blackjack:split') {
                const resSplit = BlackjackEngine.split(userId);
                ws.send(JSON.stringify({ type: 'blackjack:split_result', ...resSplit }));
            }

            // ─── HANDLERS DE PROPHET SURVIVOR ───
            else if (data.type === 'survivor:game_over') {
                const resOver = SurvivorEngine.processGameOver(userId, username, {
                    kills: data.kills,
                    seconds: data.seconds,
                    level: data.level,
                    wave: data.wave,
                    bosses: data.bosses,
                    maxCombo: data.maxCombo,
                    upgrades: data.upgrades
                });
                ws.send(JSON.stringify({ type: 'survivor:game_over_result', ...resOver }));
            }
            else if (data.type === 'survivor:get_leaderboard') {
                const lb = SurvivorEngine.getLeaderboard(10);
                ws.send(JSON.stringify({ type: 'survivor:leaderboard', leaderboard: lb }));
            }

            // ─── PING/PONG ───
            else if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
        } catch (err) {
            console.error('Error procesando mensaje WebSocket:', err);
            ws.send(JSON.stringify({ type: 'error', message: 'Mensaje inválido' }));
        }
    });
});

// Heartbeat cada 30 segundos
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
});

server.listen(PORT, () => {
    const cfg = DiscordActivityAuth.getPublicConfig();
    console.log(`🎮 Prophet Games Hub & WebSocket server corriendo en el puerto ${PORT}`);
    console.log(`🌐 Acceso local: http://127.0.0.1:${PORT}/games/`);
    console.log(`🎯 Discord Activity entry: http://127.0.0.1:${PORT}/`);
    if (cfg.oauthReady) {
        console.log(`🔐 Activity OAuth listo (clientId=${cfg.clientId})`);
    } else if (cfg.clientId) {
        console.log(`⚠️  Activity: clientId=${cfg.clientId} pero falta DISCORD_CLIENT_SECRET en .env`);
    } else {
        console.log(`⚠️  Activity OAuth DESHABILITADO (faltan DISCORD_CLIENT_ID / SECRET)`);
    }
});

module.exports = { server, wss };
