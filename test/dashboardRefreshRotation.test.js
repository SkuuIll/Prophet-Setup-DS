const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { _db } = require('../database');
const security = require('../web/security');
const { handleRefresh } = require('../web/authRoutes');

function fakeResponse() {
    return {
        statusCode: null,
        body: null,
        writeHead(statusCode) { this.statusCode = statusCode; },
        end(payload) { this.body = JSON.parse(payload); },
    };
}

test('Dashboard: refresh token rotado no puede reutilizarse', async t => {
    security.initSecurityTables();
    const username = 'rotate_' + crypto.randomUUID().replaceAll('-', '');
    const now = Date.now();
    const userId = Number(_db.prepare(
        'INSERT INTO dashboard_users (username, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(username, 'test_hash', 'viewer', now, now).lastInsertRowid);
    t.after(() => {
        _db.prepare('DELETE FROM dashboard_sessions WHERE user_id = ?').run(userId);
        _db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
        _db.prepare('DELETE FROM dashboard_users WHERE id = ?').run(userId);
    });
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const originalSessionId = crypto.randomUUID();
    _db.prepare(
        'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(crypto.randomUUID(), userId, hash, now + 3600000, now);
    _db.prepare(
        'INSERT INTO dashboard_sessions (id, user_id, refresh_token_hash, created_at, expires_at, last_activity_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(originalSessionId, userId, hash, now, now + 3600000, now);

    const request = { body: { refreshToken },
        headers: { 'user-agent': 'test' },
        socket: { remoteAddress: '127.0.0.1' } };
    const first = fakeResponse();
    await handleRefresh(request, first);
    assert.equal(first.statusCode, 200, JSON.stringify(first.body));
    assert.ok(first.body.tokens.refreshToken);
    assert.notEqual(first.body.tokens.refreshToken, refreshToken);
    assert.equal(_db.prepare('SELECT id FROM dashboard_sessions WHERE id = ?')
        .get(originalSessionId), undefined);

    const second = fakeResponse();
    await handleRefresh(request, second);
    assert.equal(second.statusCode, 401);
    assert.equal(_db.prepare('SELECT COUNT(*) AS count FROM dashboard_sessions WHERE user_id = ?')
        .get(userId).count, 1, 'La segunda solicitud no debe crear otra sesión');
});
