const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { _db } = require('../database');
const security = require('../web/security');

test('Dashboard: un JWT con un rol antiguo no conserva privilegios', t => {
    security.initSecurityTables();
    const username = 'test_role_' + randomUUID().replace(/-/g, '');
    const now = Date.now();
    const userResult = _db.prepare(
        'INSERT INTO dashboard_users (username, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(username, 'test_hash', 'admin', now, now);
    const userId = Number(userResult.lastInsertRowid);
    const sessionId = randomUUID();
    t.after(() => {
        _db.prepare('DELETE FROM dashboard_sessions WHERE user_id = ?').run(userId);
        _db.prepare('DELETE FROM dashboard_users WHERE id = ?').run(userId);
    });
    _db.prepare(
        'INSERT INTO dashboard_sessions (id, user_id, refresh_token_hash, created_at, expires_at, last_activity_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(sessionId, userId, 'hash_' + randomUUID(), now, now + 3600000, now);

    assert.equal(security.verifySession(sessionId, userId, 'admin'), true);
    _db.prepare('UPDATE dashboard_users SET role = ? WHERE id = ?').run('viewer', userId);
    assert.equal(security.verifySession(sessionId, userId, 'admin'), false,
        'El JWT antiguo debe quedar invalidado al bajar permisos');
    assert.equal(_db.prepare('SELECT id FROM dashboard_sessions WHERE id = ?').get(sessionId),
        undefined, 'La sesión obsoleta debe revocarse');
});
