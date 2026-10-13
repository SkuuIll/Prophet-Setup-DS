#!/usr/bin/env node
// Diagnóstico de SOLO LECTURA. No muestra tokens, variables de entorno ni líneas de logs.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const EXPECTED = ['ProphetBot', 'ProphetMusic', 'ProphetGames', 'ProphetLavalink'];
const CHECKS = {
    notifications: /bienvenid|despedid|guildMemberAdd|guildMemberRemove|member.?notification/i,
    discord: /DiscordAPIError|Missing Access|Missing Permissions|Unknown Interaction|gateway.*disconnect|Invalid Intents/i,
    lavalink: /Lavalink|Shoukaku|player.*disconnect|No available nodes/i,
    sqlite: /SQLITE_BUSY|SQLITE_CORRUPT|database is locked|better-sqlite3/i,
    network: /ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND/i,
    code: /UnhandledPromiseRejection|uncaughtException|TypeError|ReferenceError|SyntaxError|MODULE_NOT_FOUND|Cannot find module/i,
    limits: /rate.?limit|429 Too Many Requests/i,
};
const BAD = /error|failed|denied|denegad|missing|sin permisos|not found|expirad|could not|cannot|exception|invalid|rejected|timeout|ECONN|ETIMEDOUT|SQLITE_/i;

function classifyLine(line) {
    if (!BAD.test(line)) return null;
    for (const [kind, re] of Object.entries(CHECKS)) {
        if (re.test(line)) return kind;
    }
    return 'other';
}

function recentLogSummary(filename, byteLimit = 128 * 1024) {
    const counts = {};
    if (typeof filename !== 'string' || !filename) return { checked: false, counts };
    try {
        const stat = fs.statSync(filename);
        if (!stat.isFile()) return { checked: false, counts };
        const size = Math.min(stat.size, byteLimit);
        const buffer = Buffer.alloc(size);
        const fd = fs.openSync(filename, 'r');
        try {
            fs.readSync(fd, buffer, 0, size, stat.size - size);
        } finally {
            fs.closeSync(fd);
        }
        for (const line of buffer.toString('utf8').split(/\r?\n/).slice(-1000)) {
            const category = classifyLine(line);
            if (category) counts[category] = (counts[category] || 0) + 1;
        }
        return { checked: true, bytesExamined: size, counts };
    } catch {
        return { checked: false, counts };
    }
}

function summarizeApps(apps) {
    return EXPECTED.map(name => {
        const app = Array.isArray(apps) ? apps.find(item => item.name === name) : null;
        if (!app) return { name, present: false, online: false };
        const status = app.pm2_env?.status || 'unknown';
        return {
            name, present: true, online: status === 'online', status,
            restarts: Number(app.pm2_env?.restart_time || 0),
            unstableRestarts: Number(app.pm2_env?.unstable_restarts || 0),
            memoryMB: Math.round(Number(app.monit?.memory || 0) / 1024 / 1024),
            cpuPercent: Number(app.monit?.cpu || 0),
            recentErrorCategories: recentLogSummary(app.pm2_env?.pm_err_log_path),
        };
    });
}

function getGitRevision(root) {
    try {
        return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
            cwd: root, stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000,
        }).toString('utf8').trim();
    } catch { return 'no disponible'; }
}

async function healthProbe(url) {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(1800) });
        return { reachable: true, status: response.status, ok: response.ok };
    } catch { return { reachable: false }; }
}

async function main() {
    const root = path.resolve(__dirname, '..');
    let apps = [], pm2Error = null;
    try {
        apps = JSON.parse(execFileSync('pm2', ['jlist'], {
            cwd: root, stdio: ['ignore', 'pipe', 'ignore'], timeout: 8000,
            maxBuffer: 8 * 1024 * 1024,
        }).toString('utf8'));
    } catch {
        pm2Error = 'No fue posible consultar PM2; comprobar permisos y disponibilidad del comando.';
    }
    const services = summarizeApps(apps);
    const errors = services.filter(x => !x.online).map(x => x.name);
    const report = {
        generatedAt: new Date().toISOString(),
        mode: 'solo_lectura',
        root, gitCommit: getGitRevision(root),
        nodeVersion: process.version,
        platform: process.platform,
        freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
        pm2Error,
        services,
        offlineServices: errors,
        databaseFilePresent: fs.existsSync(path.join(root, 'data', 'prophet.sqlite')),
        health: {
            dashboard: await healthProbe('http://127.0.0.1:3789/api/health'),
            games: await healthProbe('http://127.0.0.1:3850/api/games/health'),
        },
        notes: [
            'Los recuentos de errores provienen de fragmentos recientes de logs, no necesariamente de errores activos.',
            'Ninguna prueba confirma Server Members Intent en el Portal de Discord ni la entrega real de mensajes.',
            'El informe no contiene tokens, valores de entorno ni texto completo de logs.',
        ],
    };
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

if (require.main === module) {
    main().catch(() => {
        process.stderr.write('No se pudo completar el diagnóstico. Revisar permisos del entorno.\n');
        process.exitCode = 1;
    });
}

module.exports = { classifyLine, recentLogSummary, summarizeApps };
