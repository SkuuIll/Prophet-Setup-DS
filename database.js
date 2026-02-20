const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

const OLD_DB_PATH = path.join(DB_DIR, 'prophet.json');
const DB_PATH = path.join(DB_DIR, 'prophet.sqlite');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ─── INITIALIZATION ───
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        messages INTEGER DEFAULT 0,
        balance INTEGER DEFAULT 0,
        bank INTEGER DEFAULT 0,
        last_daily INTEGER DEFAULT 0,
        last_work INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_inventory (
        user_id TEXT,
        item_id TEXT,
        amount INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS warns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        mod_id TEXT,
        reason TEXT,
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reaction_roles (
        message_id TEXT,
        emoji TEXT,
        role_id TEXT,
        PRIMARY KEY (message_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS giveaways (
        message_id TEXT PRIMARY KEY,
        channel_id TEXT,
        prize TEXT,
        end_time INTEGER,
        ended INTEGER DEFAULT 0,
        host_id TEXT
    );

    CREATE TABLE IF NOT EXISTS giveaway_entries (
        message_id TEXT,
        user_id TEXT,
        PRIMARY KEY (message_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS tickets (
        channel_id TEXT PRIMARY KEY,
        user_id TEXT,
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tempbans (
        guild_id TEXT,
        user_id TEXT,
        mod_id TEXT,
        reason TEXT,
        unban_at INTEGER,
        PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        details TEXT,
        timestamp TEXT
    );
`);

// ─── MIGRATION ───
// Check if we need to migrate from prophet.json (only once)
if (fs.existsSync(OLD_DB_PATH)) {
    try {
        const hasMigrated = db.prepare("SELECT value FROM config WHERE key = 'migrated_json'").get();
        if (!hasMigrated) {
            console.log('🔄 Migrando de prophet.json a SQLite...');
            const raw = fs.readFileSync(OLD_DB_PATH, 'utf-8');
            const data = JSON.parse(raw);
            const tx = db.transaction(() => {
                // Users
                const insertUser = db.prepare('INSERT OR REPLACE INTO users (id, xp, level, messages, balance, bank, last_daily, last_work) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
                const insertInv = db.prepare('INSERT OR REPLACE INTO user_inventory (user_id, item_id, amount) VALUES (?, ?, ?)');
                for (const [uid, user] of Object.entries(data.users || {})) {
                    insertUser.run(uid, user.xp || 0, user.level || 0, user.messages || 0, user.balance || 0, user.bank || 0, user.last_daily || 0, user.last_work || 0);
                    for (const item of (user.inventory || [])) {
                        insertInv.run(uid, item.id, item.amount);
                    }
                }

                // Warns
                const insertWarn = db.prepare('INSERT INTO warns (user_id, mod_id, reason, created_at) VALUES (?, ?, ?, ?)');
                for (const w of (data.warns || [])) {
                    insertWarn.run(w.user_id, w.mod_id, w.reason, w.created_at);
                }

                // Reaction roles
                const insertRR = db.prepare('INSERT OR REPLACE INTO reaction_roles (message_id, emoji, role_id) VALUES (?, ?, ?)');
                for (const [msgId, emojis] of Object.entries(data.reaction_roles || {})) {
                    for (const [emoji, roleId] of Object.entries(emojis)) {
                        insertRR.run(msgId, emoji, roleId);
                    }
                }

                // Giveaways
                const insertGw = db.prepare('INSERT OR REPLACE INTO giveaways (message_id, channel_id, prize, end_time, ended, host_id) VALUES (?, ?, ?, ?, ?, ?)');
                const insertGwEntry = db.prepare('INSERT OR REPLACE INTO giveaway_entries (message_id, user_id) VALUES (?, ?)');
                for (const [msgId, gw] of Object.entries(data.giveaways || {})) {
                    insertGw.run(msgId, gw.channel_id, gw.prize, gw.end_time, gw.ended ? 1 : 0, gw.host_id);
                    for (const uid of (gw.entries || [])) {
                        insertGwEntry.run(msgId, uid);
                    }
                }

                // Tickets
                const insertTicket = db.prepare('INSERT OR REPLACE INTO tickets (channel_id, user_id, created_at) VALUES (?, ?, ?)');
                for (const [chId, t] of Object.entries(data.tickets || {})) {
                    insertTicket.run(chId, t.user_id, t.created_at);
                }

                // Tempbans
                const insertTb = db.prepare('INSERT OR REPLACE INTO tempbans (guild_id, user_id, mod_id, reason, unban_at) VALUES (?, ?, ?, ?, ?)');
                for (const tb of (data.tempbans || [])) {
                    insertTb.run(tb.guild_id, tb.user_id, tb.mod_id, tb.reason, tb.unban_at);
                }

                // Config
                const insertCfg = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
                for (const [k, v] of Object.entries(data.config || {})) {
                    insertCfg.run(k, JSON.stringify(v));
                }

                // Logs
                const insertLog = db.prepare('INSERT INTO logs (type, details, timestamp) VALUES (?, ?, ?)');
                for (const l of (data.logs || [])) {
                    insertLog.run(l.type, JSON.stringify(l.details), l.timestamp);
                }

                insertCfg.run('migrated_json', '1');
            });
            tx();
            console.log('✅ Migración completada.');
        }
    } catch (e) {
        console.error('❌ Error migrando json a sqlite:', e.message);
    }
}

// ─── HELPER FUNCTIONS ───
const getOrCreateUser = (id) => {
    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
        db.prepare('INSERT INTO users (id) VALUES (?)').run(id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }
    return user;
};

// ─── API STATEMENTS ───
const stmts = {
    // ── Usuarios / Niveles ──
    getUser(userId) {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) || null;
    },
    upsertUser(userData) {
        db.prepare('INSERT OR REPLACE INTO users (id, xp, level, messages, balance, bank, last_daily, last_work) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
            userData.user_id, userData.xp || 0, userData.level || 0, userData.messages || 0,
            userData.balance || 0, userData.bank || 0, userData.last_daily || 0, userData.last_work || 0
        );
    },
    getTop(limit) {
        return db.prepare('SELECT * FROM users ORDER BY xp DESC LIMIT ?').all(limit);
    },
    getEcoTop(limit = 10) {
        return db.prepare('SELECT id, balance, bank, (balance + bank) as total FROM users ORDER BY total DESC LIMIT ?').all(limit);
    },
    getRank(userId) {
        const user = stmts.getUser(userId);
        const userXp = user ? user.xp : 0;
        const rank = db.prepare('SELECT COUNT(*) as count FROM users WHERE xp > ?').get(userXp).count;
        return { rank };
    },

    // ── Economía ──
    getEconomy(userId) {
        const user = db.prepare('SELECT balance, bank, last_daily, last_work FROM users WHERE id = ?').get(userId);
        return user || { balance: 0, bank: 0, last_daily: 0, last_work: 0 };
    },
    addMoney(userId, amount, type = 'balance') {
        const allowedTypes = ['balance', 'bank'];
        const targetType = allowedTypes.includes(type) ? type : 'balance';
        getOrCreateUser(userId);
        db.prepare(`UPDATE users SET ${targetType} = ${targetType} + ? WHERE id = ?`).run(amount, userId);
        return db.prepare(`SELECT ${targetType} FROM users WHERE id = ?`).get(userId)[targetType];
    },
    removeMoney(userId, amount, type = 'balance') {
        const allowedTypes = ['balance', 'bank'];
        const targetType = allowedTypes.includes(type) ? type : 'balance';
        const user = stmts.getEconomy(userId);
        if (user[targetType] < amount) return false;
        db.prepare(`UPDATE users SET ${targetType} = ${targetType} - ? WHERE id = ?`).run(amount, userId);
        return true;
    },
    setEconomy(userId, key, value) {
        const allowedKeys = ['last_daily', 'last_work'];
        if (allowedKeys.includes(key)) {
            getOrCreateUser(userId);
            db.prepare(`UPDATE users SET ${key} = ? WHERE id = ?`).run(value, userId);
        }
    },
    transferBank(userId, amount, direction) {
        let user = stmts.getEconomy(userId);
        if (direction === 'dep') {
            if (user.balance < amount) return false;
            db.prepare('UPDATE users SET balance = balance - ?, bank = bank + ? WHERE id = ?').run(amount, amount, userId);
        } else if (direction === 'with') {
            if (user.bank < amount) return false;
            db.prepare('UPDATE users SET bank = bank - ?, balance = balance + ? WHERE id = ?').run(amount, amount, userId);
        }
        user = stmts.getEconomy(userId);
        return { success: true, balance: user.balance, bank: user.bank };
    },

    // ── Inventario ──
    getInventory(userId) {
        return db.prepare('SELECT item_id as id, amount FROM user_inventory WHERE user_id = ?').all(userId);
    },
    addItem(userId, itemId, quantity = 1) {
        getOrCreateUser(userId);
        db.prepare('INSERT INTO user_inventory (user_id, item_id, amount) VALUES (?, ?, ?) ON CONFLICT(user_id, item_id) DO UPDATE SET amount = amount + ?').run(userId, itemId, quantity, quantity);
        return stmts.getInventory(userId);
    },
    removeItem(userId, itemId, quantity = 1) {
        const item = db.prepare('SELECT amount FROM user_inventory WHERE user_id = ? AND item_id = ?').get(userId, itemId);
        if (!item) return false;

        if (item.amount <= quantity) {
            db.prepare('DELETE FROM user_inventory WHERE user_id = ? AND item_id = ?').run(userId, itemId);
        } else {
            db.prepare('UPDATE user_inventory SET amount = amount - ? WHERE user_id = ? AND item_id = ?').run(quantity, userId, itemId);
        }
        return true;
    },

    // ── Warns ──
    addWarn(userId, modId, reason) {
        db.prepare('INSERT INTO warns (user_id, mod_id, reason, created_at) VALUES (?, ?, ?, ?)').run(userId, modId, reason, new Date().toISOString());
    },
    getWarns(userId) {
        return db.prepare('SELECT * FROM warns WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    },
    countWarns(userId) {
        const row = db.prepare('SELECT COUNT(*) as total FROM warns WHERE user_id = ?').get(userId);
        return { total: row ? row.total : 0 };
    },
    clearWarns(userId) {
        db.prepare('DELETE FROM warns WHERE user_id = ?').run(userId);
    },
    deleteWarn(id) {
        db.prepare('DELETE FROM warns WHERE id = ?').run(id);
    },

    // ── Reaction Roles ──
    addReactionRole(messageId, emoji, roleId) {
        db.prepare('INSERT OR REPLACE INTO reaction_roles (message_id, emoji, role_id) VALUES (?, ?, ?)').run(messageId, emoji, roleId);
    },
    getReactionRole(messageId, emoji) {
        return db.prepare('SELECT role_id FROM reaction_roles WHERE message_id = ? AND emoji = ?').get(messageId, emoji) || null;
    },
    getReactionRoles(messageId) {
        return db.prepare('SELECT message_id, emoji, role_id FROM reaction_roles WHERE message_id = ?').all(messageId);
    },
    deleteReactionRoles(messageId) {
        db.prepare('DELETE FROM reaction_roles WHERE message_id = ?').run(messageId);
    },

    // ── Sorteos ──
    addGiveaway(messageId, channelId, prize, endTime, hostId) {
        db.prepare('INSERT OR REPLACE INTO giveaways (message_id, channel_id, prize, end_time, ended, host_id) VALUES (?, ?, ?, ?, 0, ?)').run(
            messageId, channelId, prize, endTime, hostId
        );
    },
    getGiveaway(messageId) {
        return db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(messageId) || null;
    },
    getActiveGiveaways() {
        return db.prepare('SELECT * FROM giveaways WHERE ended = 0').all();
    },
    endGiveaway(messageId) {
        db.prepare('UPDATE giveaways SET ended = 1 WHERE message_id = ?').run(messageId);
    },
    addGiveawayEntry(messageId, userId) {
        db.prepare('INSERT OR IGNORE INTO giveaway_entries (message_id, user_id) VALUES (?, ?)').run(messageId, userId);
    },
    getGiveawayEntries(messageId) {
        return db.prepare('SELECT user_id FROM giveaway_entries WHERE message_id = ?').all(messageId);
    },
    countGiveawayEntries(messageId) {
        const row = db.prepare('SELECT COUNT(*) as total FROM giveaway_entries WHERE message_id = ?').get(messageId);
        return { total: row.total };
    },

    // ── Tickets ──
    addTicket(channelId, userId) {
        db.prepare('INSERT OR REPLACE INTO tickets (channel_id, user_id, created_at) VALUES (?, ?, ?)').run(channelId, userId, new Date().toISOString());
    },
    getTicket(channelId) {
        return db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId) || null;
    },
    deleteTicket(channelId) {
        db.prepare('DELETE FROM tickets WHERE channel_id = ?').run(channelId);
    },

    // ── Tempbans ──
    addTempban(guildId, userId, modId, reason, unbanAt) {
        db.prepare('INSERT OR REPLACE INTO tempbans (guild_id, user_id, mod_id, reason, unban_at) VALUES (?, ?, ?, ?, ?)').run(guildId, userId, modId, reason, unbanAt);
    },
    getActiveTempbans() {
        return db.prepare('SELECT * FROM tempbans WHERE unban_at <= ?').all(Date.now());
    },
    removeTempban(guildId, userId) {
        db.prepare('DELETE FROM tempbans WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
    },

    // ── Config ──
    getConfig(key) {
        const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
        return row ? { value: JSON.parse(row.value) } : null;
    },
    setConfig(key, value) {
        db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
    },

    // ── Logs ──
    addLog(type, details) {
        db.prepare('INSERT INTO logs (type, details, timestamp) VALUES (?, ?, ?)').run(type, JSON.stringify(details), new Date().toISOString());
        // Clean up old logs to keep only the last 100
        const result = db.prepare('SELECT COUNT(*) as count FROM logs').get();
        if (result.count > 100) {
            db.prepare('DELETE FROM logs WHERE id IN (SELECT id FROM logs ORDER BY timestamp ASC LIMIT ?)').run(result.count - 100);
        }
    },
    getLogs(limit = 10) {
        const rows = db.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?').all(limit);
        return rows.map(r => ({
            type: r.type,
            details: JSON.parse(r.details),
            timestamp: r.timestamp
        }));
    }
};

module.exports = {
    stmts,
    // Provide a dummy 'data' object in case some module tries to access it, though it shouldn't be used now.
    data: new Proxy({}, {
        get() {
            return {};
        }
    })
};
