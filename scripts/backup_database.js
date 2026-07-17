#!/usr/bin/env node

const path = require('path');
const { _db } = require('../database');
const { createVerifiedBackup, pruneBackups } = require('../utils/databaseBackup');

async function main() {
    const backupDir = path.join(__dirname, '..', 'data', 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destination = path.join(backupDir, `prophet_${timestamp}.sqlite`);

    await createVerifiedBackup(_db, destination);
    const removed = pruneBackups(backupDir, 7 * 24 * 60 * 60 * 1000);
    console.log(`Backup verificado: ${destination}`);
    if (removed.length) console.log(`Backups vencidos eliminados: ${removed.length}`);
}

main()
    .catch(error => {
        console.error(`Error creando backup: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(() => _db.close());
