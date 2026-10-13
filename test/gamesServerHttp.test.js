const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');

async function freePort() {
    const server = net.createServer();
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const port = server.address().port;
    await new Promise(resolve => server.close(resolve));
    return port;
}

test('Games HTTP: health, assets, sesión inválida y secreto interno ausente', { timeout: 30000 }, async t => {
    const port = await freePort();
    const root = path.resolve(__dirname, '..');
    const child = spawn(process.execPath, ['games_server.js'], {
        cwd: root,
        env: {
            ...process.env,
            GAMES_PORT: String(port),
            GAMES_BIND_HOST: '127.0.0.1',
            GAMES_INTERNAL_SECRET: '',
            GAMES_DEMO_ENABLED: 'false',
            NODE_ENV: 'production',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let errors = '';
    child.stdout.on('data', data => { errors = (errors + String(data)).slice(-4000); });
    child.stderr.on('data', data => { errors = (errors + String(data)).slice(-4000); });
    t.after(() => {
        if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
    });
    const base = `http://127.0.0.1:${port}`;
    let healthy = false;
    for (let attempt = 0; attempt < 65; attempt++) {
        if (child.exitCode !== null) break;
        try {
            const res = await fetch(base + '/api/games/health', { signal: AbortSignal.timeout(800) });
            if (res.ok) {
                const data = await res.json();
                assert.equal(data.ok, true);
                healthy = true;
                break;
            }
        } catch {}
        await new Promise(r => setTimeout(r, 175));
    }
    assert.equal(healthy, true, 'Games no arrancó: ' + errors);

    const hub = await fetch(base + '/games/hub/');
    assert.equal(hub.status, 200);
    assert.match(hub.headers.get('content-type') || '', /text\/html/);

    const missingSecret = await fetch(base + '/api/games/create-token', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: '123456789012345678', secret: 'invalid' }),
    });
    assert.equal(missingSecret.status, 503);

    const invalid = await fetch(base + '/api/games/session-info?token=fake');
    assert.equal(invalid.status, 401);

    const hidden = await fetch(base + '/.env');
    assert.equal(hidden.status, 404);
});
