const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const { createVerifiedBackup, pruneBackups } = require('../utils/databaseBackup');

test('crea un backup SQLite íntegro y elimina backups vencidos', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'prophet-backup-'));
    const sourcePath = path.join(directory, 'source.sqlite');
    const destination = path.join(directory, 'backups', 'prophet_current.sqlite');
    const source = new Database(sourcePath);

    try {
        source.exec("CREATE TABLE sample (value TEXT); INSERT INTO sample VALUES ('ok');");
        await createVerifiedBackup(source, destination);

        const backup = new Database(destination, { readonly: true });
        try {
            assert.equal(backup.prepare('SELECT value FROM sample').pluck().get(), 'ok');
            assert.equal(backup.pragma('quick_check', { simple: true }), 'ok');
        } finally {
            backup.close();
        }

        const oldBackup = path.join(directory, 'backups', 'prophet_old.sqlite');
        fs.copyFileSync(destination, oldBackup);
        const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
        fs.utimesSync(oldBackup, oldDate, oldDate);
        assert.deepEqual(pruneBackups(path.dirname(destination), 7 * 24 * 60 * 60 * 1000), ['prophet_old.sqlite']);
        assert.equal(fs.existsSync(destination), true);
    } finally {
        source.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
