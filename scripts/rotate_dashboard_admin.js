#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const security = require('../web/security');
const { _db } = require('../database');

async function main() {
    const user = _db.prepare(`
        SELECT id, username FROM dashboard_users
        WHERE role = 'superadmin'
        ORDER BY id ASC LIMIT 1
    `).get();
    if (!user) throw new Error('No existe un superadmin del dashboard');

    const password = `A!a1${crypto.randomBytes(18).toString('base64url')}`;
    const passwordHash = await security.hashPassword(password);
    const now = Date.now();

    _db.transaction(() => {
        _db.prepare(`
            UPDATE dashboard_users
            SET password_hash = ?, password_changed_at = ?, must_change_password = 1,
                failed_login_attempts = 0, locked_until = NULL, updated_at = ?
            WHERE id = ?
        `).run(passwordHash, now, now, user.id);
        _db.prepare('DELETE FROM dashboard_sessions WHERE user_id = ?').run(user.id);
        _db.prepare('UPDATE refresh_tokens SET revoked = 1, revoked_at = ? WHERE user_id = ?').run(now, user.id);
    })();

    const credentialsPath = path.join(__dirname, '..', 'data', '.dashboard_credentials.txt');
    fs.writeFileSync(
        credentialsPath,
        `Dashboard Admin Credentials\nGenerated: ${new Date(now).toISOString()}\nUsername: ${user.username}\nPassword: ${password}\n\nChange this password after the first login.\n`,
        { encoding: 'utf8', mode: 0o600 }
    );
    fs.chmodSync(credentialsPath, 0o600);
    console.log('Credencial del superadmin rotada y sesiones anteriores revocadas.');
}

main()
    .then(() => {
        _db.close();
        process.exit(0);
    })
    .catch(error => {
        console.error(`Error rotando credencial: ${error.message}`);
        _db.close();
        process.exit(1);
    });
