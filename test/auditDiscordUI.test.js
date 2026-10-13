const test = require('node:test');
const assert = require('node:assert/strict');
const { auditCommandSources } = require('../scripts/audit_discord_ui');

test('Inventario de UI contempla comandos de todas las categorías reales', () => {
    const audit = auditCommandSources();
    assert.ok(audit.total >= 90, 'Se esperaban los comandos reales de Prophet Bot');
    assert.ok(audit.categories.admin.total >= 10);
    assert.ok(audit.categories.music.total >= 8);
    assert.ok(audit.categories.mod.total >= 8);
    assert.ok(audit.categories.utility.total >= 20);
    assert.ok(audit.redesigned > 0);
    assert.equal(audit.pending + audit.redesigned, audit.total);
    assert.ok(audit.files.some(x => x.path === 'utility/ayuda.js' && x.themeIntegrated));
    assert.ok(audit.files.some(x => x.path === 'economy/balance.js' && x.themeIntegrated));
});
