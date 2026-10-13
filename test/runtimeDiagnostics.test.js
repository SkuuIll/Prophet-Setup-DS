const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { classifyLine, recentLogSummary, summarizeApps } = require('../scripts/diagnose_runtime');

test('Diagnóstico: clasifica errores sin revelar texto privado', t => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'prophet-logs-'));
    t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
    const filename = path.join(folder, 'test-error.log');
    fs.writeFileSync(filename, [
        '2026-10-13 info: guildMemberAdd processed successfully',
        '2026-10-13 Error: guildMemberAdd bienvenida sin permisos TOKEN_SUPER_SECRETO_123',
        '2026-10-13 SQLITE_BUSY database is locked',
        '2026-10-13 DiscordAPIError Missing Permissions',
    ].join('\n'));
    assert.equal(classifyLine('Información: jugador entró correctamente'), null);
    assert.equal(classifyLine('guildMemberRemove failed'), 'notifications');
    const summary = recentLogSummary(filename);
    assert.equal(summary.checked, true);
    assert.equal(summary.counts.notifications, 1);
    assert.equal(summary.counts.sqlite, 1);
    assert.equal(summary.counts.discord, 1);
    assert.equal(JSON.stringify(summary).includes('TOKEN_SUPER_SECRETO'), false);
});

test('Diagnóstico: resume PM2 con datos permitidos, nunca variables privadas', () => {
    const apps = [{
        name: 'ProphetBot',
        pm2_env: {
            status: 'online', restart_time: 2, pm_err_log_path: '/nonexistent',
            DISCORD_TOKEN: 'SUPER_SECRETO', env: { JWT_SECRET: 'OTRO_SECRETO' },
        },
        monit: { memory: 104857600, cpu: 3.5 },
    }];
    const summarized = summarizeApps(apps);
    assert.equal(summarized.length, 4);
    assert.equal(summarized[0].memoryMB, 100);
    assert.equal(summarized[0].restarts, 2);
    assert.equal(summarized[0].online, true);
    assert.equal(summarized[1].present, false);
    assert.doesNotMatch(JSON.stringify(summarized), /SUPER_SECRETO|OTRO_SECRETO/);
});
