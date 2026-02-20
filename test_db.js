const fs = require('fs');
const Database = require('better-sqlite3');
const db = new Database('data/prophet.sqlite');
db.pragma('journal_mode = WAL');
console.log('SQLite works');
