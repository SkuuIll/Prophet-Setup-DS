const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

async function createVerifiedBackup(db, destination) {
    if (!db || typeof db.backup !== 'function') {
        throw new TypeError('Se requiere una conexión SQLite válida');
    }

    fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
    await db.backup(destination);
    fs.chmodSync(destination, 0o600);

    const backup = new Database(destination, { readonly: true, fileMustExist: true });
    try {
        const result = backup.pragma('quick_check', { simple: true });
        if (result !== 'ok') {
            throw new Error(`quick_check devolvió: ${result}`);
        }
    } finally {
        backup.close();
    }

    return destination;
}

function pruneBackups(directory, retentionMs, now = Date.now()) {
    if (!fs.existsSync(directory)) return [];

    const removed = [];
    for (const filename of fs.readdirSync(directory)) {
        if (!filename.startsWith('prophet_') || !filename.endsWith('.sqlite')) continue;
        const filePath = path.join(directory, filename);
        if (fs.statSync(filePath).mtimeMs < now - retentionMs) {
            fs.unlinkSync(filePath);
            removed.push(filename);
        }
    }
    return removed;
}

module.exports = { createVerifiedBackup, pruneBackups };
