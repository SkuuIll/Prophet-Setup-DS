const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const WebSocket = require('ws');
require('dotenv').config();

const AuthManager = require('./games/common/authManager');
const EconomyBridge = require('./games/common/economyBridge');
const TycoonEngine = require('./games/tycoon/tycoonEngine');
const CrashEngine = require('./games/casino/crashEngine');
const RouletteEngine = require('./games/casino/rouletteEngine');
const CasesEngine = require('./games/casino/casesEngine');
const TriviaEngine = require('./games/trivia/triviaEngine');
const TrucoEngine = require('./games/cards/trucoEngine');
const BlackjackEngine = require('./games/cards/blackjackEngine');
const SurvivorEngine = require('./games/survivor/survivorEngine');

const PORT = parseInt(process.env.GAMES_PORT || '3850', 10);
const GAMES_DIR = path.join(__dirname, 'web', 'public', 'games');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.woff2': 'font/woff2'
};

// ═══ SERVIDOR HTTP PARA ASSETS Y API REST ═══
const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = parsedUrl.pathname;

    // ─── API REST ───
    if (pathname === '/api/games/session-info') {
        const token = parsedUrl.searchParams.get('token');
        const session = AuthManager.validateToken(token);
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Token inválido o expirado' }));
        }

        const eco = EconomyBridge.getUserBalance(session.userId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            userId: session.userId,
            username: session.user.id,
            level: eco.level,
            xp: eco.xp,
            balance: eco.balance,
            bank: eco.bank
        }));
    }

    if (pathname === '/api/games/create-token' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                if (!data.userId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Falta userId' }));
                }
                const token = AuthManager.createSession(data.userId, data.ttlMinutes || 120);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ token }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'JSON inválido' }));
            }
        });
        return;
    }

    // ─── STATIC FILES ROUTING ───
    if (pathname === '/' || pathname === '/games' || pathname === '/games/') {
        pathname = '/games/hub/index.html';
    } else if (pathname === '/games/hub' || pathname === '/games/hub/') {
        pathname = '/games/hub/index.html';
    } else if (pathname === '/games/tycoon' || pathname === '/games/tycoon/') {
        pathname = '/games/tycoon/index.html';
    } else if (pathname === '/games/casino' || pathname === '/games/casino/') {
        pathname = '/games/casino/index.html';
    } else if (pathname === '/games/trivia' || pathname === '/games/trivia/') {
        pathname = '/games/trivia/index.html';
    } else if (pathname === '/games/cards' || pathname === '/games/cards/') {
        pathname = '/games/cards/index.html';
    } else if (pathname === '/games/survivor' || pathname === '/games/survivor/') {
        pathname = '/games/survivor/index.html';
    }

    // Mapear /games/* a web/public/games/*
    let relativePath = pathname.replace(/^\/games\//, '');
    let safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
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

    res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
});

// ═══ SERVIDOR WEBSOCKET PARA JUEGOS EN TIEMPO REAL ═══
const wss = new WebSocket.Server({ server, path: '/ws' });

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
                    ws.send(JSON.stringify({ type: 'auth_error', message: 'Token de sesión inválido o expirado' }));
                    return;
                }
                sessionUser = session;
                const balanceData = EconomyBridge.getUserBalance(session.userId);
                ws.send(JSON.stringify({
                    type: 'auth_success',
                    userId: session.userId,
                    user: session.user,
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
            const username = `Jugador_${userId.slice(-4)}`;

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

            // ─── HANDLERS DE PROPHET SURVIVOR ───
            else if (data.type === 'survivor:game_over') {
                const resOver = SurvivorEngine.processGameOver(userId, username, data.kills, data.seconds, data.level);
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
    console.log(`🎮 Prophet Games Hub & WebSocket server corriendo en el puerto ${PORT}`);
    console.log(`🌐 Acceso local: http://127.0.0.1:${PORT}/games/`);
});

module.exports = { server, wss };
