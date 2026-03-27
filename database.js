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
        last_work INTEGER DEFAULT 0,
        last_xp INTEGER DEFAULT 0,
        birthday TEXT,
        voice_minutes INTEGER DEFAULT 0,
        reputation INTEGER DEFAULT 0,
        message_streak INTEGER DEFAULT 0,
        last_message_date TEXT,
        profile_color TEXT,
        profile_badge TEXT,
        timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
        language TEXT DEFAULT 'es',
        ai_enabled INTEGER DEFAULT 1,
        notifications_enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS starboards (
        message_id TEXT PRIMARY KEY,
        star_message_id TEXT,
        channel_id TEXT,
        stars INTEGER DEFAULT 0
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

    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        music_volume INTEGER DEFAULT 10,
        prefix TEXT DEFAULT '/'
    );

    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        details TEXT,
        timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS badge_definitions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        rarity TEXT DEFAULT 'common',
        requirement_type TEXT,
        requirement_value INTEGER,
        reward_xp INTEGER DEFAULT 0,
        reward_coins INTEGER DEFAULT 0,
        created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_badges (
        user_id TEXT,
        badge_id TEXT,
        unlocked_at INTEGER,
        progress INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, badge_id)
    );

    CREATE TABLE IF NOT EXISTS achievement_definitions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        requirement_type TEXT,
        requirement_value INTEGER,
        reward_xp INTEGER DEFAULT 0,
        reward_coins INTEGER DEFAULT 0,
        reward_badge_id TEXT,
        created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
        user_id TEXT,
        achievement_id TEXT,
        completed_at INTEGER,
        progress INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS quest_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'daily',
        category TEXT,
        requirement_type TEXT,
        requirement_value INTEGER,
        reward_xp INTEGER DEFAULT 0,
        reward_coins INTEGER DEFAULT 0,
        reward_badge_id TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        quest_id TEXT,
        type TEXT,
        progress INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        claimed INTEGER DEFAULT 0,
        started_at INTEGER,
        completed_at INTEGER,
        expires_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
        language TEXT DEFAULT 'es',
        ai_enabled INTEGER DEFAULT 1,
        notifications_enabled INTEGER DEFAULT 1,
        embed_style TEXT DEFAULT 'default',
        reminder_format TEXT DEFAULT 'relative',
        privacy_level TEXT DEFAULT 'normal'
    );

    CREATE TABLE IF NOT EXISTS temp_channels (
        channel_id TEXT PRIMARY KEY,
        guild_id TEXT,
        owner_id TEXT,
        created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS twitch_subs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        streamer TEXT,
        channel_id TEXT,
        role_ping TEXT,
        last_live INTEGER DEFAULT 0,
        last_stream_id TEXT
    );

    CREATE TABLE IF NOT EXISTS youtube_subs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        yt_channel_id TEXT,
        yt_channel_name TEXT,
        discord_channel TEXT,
        role_ping TEXT,
        last_video_id TEXT
    );

    CREATE TABLE IF NOT EXISTS github_subs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        repo TEXT,
        discord_channel TEXT,
        role_ping TEXT,
        track_commits INTEGER DEFAULT 1,
        track_releases INTEGER DEFAULT 1,
        last_commit_sha TEXT,
        last_release_tag TEXT
    );

    CREATE TABLE IF NOT EXISTS game_servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        ip TEXT,
        port INTEGER,
        game TEXT,
        discord_channel TEXT,
        role_ping TEXT,
        last_status INTEGER DEFAULT 1,
        label TEXT
    );

    CREATE TABLE IF NOT EXISTS discord_webhooks (
        channel_id TEXT PRIMARY KEY,
        webhook_url TEXT
    );

    CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT,
        message TEXT NOT NULL,
        remind_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_daily (
        date TEXT NOT NULL,
        metric TEXT NOT NULL,
        bucket TEXT NOT NULL DEFAULT 'global',
        value INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (date, metric, bucket)
    );

    CREATE TABLE IF NOT EXISTS command_metrics_daily (
        date TEXT NOT NULL,
        command TEXT NOT NULL,
        total INTEGER NOT NULL DEFAULT 0,
        success INTEGER NOT NULL DEFAULT 0,
        errors INTEGER NOT NULL DEFAULT 0,
        total_duration_ms INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (date, command)
    );

    CREATE TABLE IF NOT EXISTS health_checks (
        name TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        last_run_at INTEGER,
        last_ok_at INTEGER,
        last_error_at INTEGER,
        last_duration_ms INTEGER,
        consecutive_failures INTEGER NOT NULL DEFAULT 0,
        details TEXT
    );

    CREATE TABLE IF NOT EXISTS user_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        target TEXT,
        enabled INTEGER DEFAULT 1,
        config TEXT,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        scheduled_for INTEGER,
        sent INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_state (
        user_id TEXT PRIMARY KEY,
        last_leaderboard_page INTEGER DEFAULT 1,
        last_shop_page INTEGER DEFAULT 1,
        last_ecotop_page INTEGER DEFAULT 1,
        last_top_page INTEGER DEFAULT 1,
        last_command TEXT,
        last_command_at INTEGER,
        last_viewed_profile TEXT,
        preferences TEXT
    );

    CREATE TABLE IF NOT EXISTS auto_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trigger_type TEXT NOT NULL,
        trigger_pattern TEXT NOT NULL,
        response TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        priority INTEGER DEFAULT 0,
        use_ai INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1,
        hit_count INTEGER DEFAULT 0,
        created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS raid_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_type TEXT NOT NULL,
        pattern_value TEXT NOT NULL,
        severity INTEGER DEFAULT 1,
        action TEXT DEFAULT 'alert',
        triggered_count INTEGER DEFAULT 0,
        last_triggered INTEGER,
        created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT,
        event_type TEXT NOT NULL,
        severity TEXT DEFAULT 'low',
        details TEXT,
        action_taken TEXT,
        resolved INTEGER DEFAULT 0,
        resolved_by TEXT,
        resolved_at INTEGER,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mod_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        note TEXT NOT NULL,
        note_type TEXT DEFAULT 'info',
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS faq_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        keywords TEXT,
        category TEXT DEFAULT 'general',
        use_count INTEGER DEFAULT 0,
        created_at INTEGER
    );
`);

// ─── COLUMN MIGRATIONS (safe, idempotent) ───
try { db.exec(`ALTER TABLE users ADD COLUMN last_xp INTEGER DEFAULT 0`); } catch (e) { /* ya existe */ }
try { db.exec(`ALTER TABLE users ADD COLUMN birthday TEXT`); } catch (e) { /* ya existe */ }
try { db.exec(`ALTER TABLE users ADD COLUMN voice_minutes INTEGER DEFAULT 0`); } catch (e) { /* ya existe */ }
try { db.exec(`ALTER TABLE users ADD COLUMN reputation INTEGER DEFAULT 0`); } catch (e) { /* ya existe */ }
try { db.exec(`ALTER TABLE users ADD COLUMN message_streak INTEGER DEFAULT 0`); } catch (e) { /* ya existe */ }
try { db.exec(`ALTER TABLE users ADD COLUMN last_message_date TEXT`); } catch (e) { /* ya existe */ }
try { db.exec(`ALTER TABLE users ADD COLUMN profile_color TEXT`); } catch (e) { /* ya existe */ }
try { db.exec(`ALTER TABLE users ADD COLUMN profile_badge TEXT`); } catch (e) { /* ya existe */ }
try { db.exec(`ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires'`); } catch (e) { /* ya existe */ }
try { db.exec(`ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'es'`); } catch (e) { /* ya existe */ }
try { db.exec(`ALTER TABLE users ADD COLUMN ai_enabled INTEGER DEFAULT 1`); } catch (e) { /* ya existe */ }
try { db.exec(`ALTER TABLE users ADD COLUMN notifications_enabled INTEGER DEFAULT 1`); } catch (e) { /* ya existe */ }
try { db.exec(`ALTER TABLE user_preferences ADD COLUMN last_rep_given INTEGER DEFAULT 0`); } catch (e) { /* ya existe */ }

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
const ANALYTICS_TIMEZONE = 'America/Argentina/Buenos_Aires';

const getOrCreateUser = (id) => {
    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
        db.prepare('INSERT INTO users (id) VALUES (?)').run(id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }
    return user;
};

function getAnalyticsDateKey(timestamp = Date.now()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: ANALYTICS_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date(timestamp));
}

function getSinceDateKey(days = 7) {
    const safeDays = Math.max(1, Number.parseInt(days, 10) || 7);
    return getAnalyticsDateKey(Date.now() - ((safeDays - 1) * 24 * 60 * 60 * 1000));
}

// ─── API STATEMENTS ───
const stmts = {
    // ── Usuarios / Niveles ──
    getUser(userId) {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) || null;
    },
    upsertUser(userData) {
        const userId = userData.user_id || userData.id;
        const current = getOrCreateUser(userId);
        const mergedUser = {
            xp: userData.xp ?? current.xp ?? 0,
            level: userData.level ?? current.level ?? 0,
            messages: userData.messages ?? current.messages ?? 0,
            balance: userData.balance ?? current.balance ?? 0,
            bank: userData.bank ?? current.bank ?? 0,
            last_daily: userData.last_daily ?? current.last_daily ?? 0,
            last_work: userData.last_work ?? current.last_work ?? 0,
            last_xp: userData.last_xp ?? current.last_xp ?? 0,
            birthday: userData.birthday ?? current.birthday ?? null,
            voice_minutes: userData.voice_minutes ?? current.voice_minutes ?? 0,
        };

        db.prepare('UPDATE users SET xp = ?, level = ?, messages = ?, balance = ?, bank = ?, last_daily = ?, last_work = ?, last_xp = ?, birthday = ?, voice_minutes = ? WHERE id = ?').run(
            mergedUser.xp,
            mergedUser.level,
            mergedUser.messages,
            mergedUser.balance,
            mergedUser.bank,
            mergedUser.last_daily,
            mergedUser.last_work,
            mergedUser.last_xp,
            mergedUser.birthday,
            mergedUser.voice_minutes,
            userId
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
    getAllConfig() {
        return db.prepare('SELECT key, value FROM config ORDER BY key ASC').all().map(row => ({
            key: row.key,
            value: JSON.parse(row.value)
        }));
    },
    setConfig(key, value) {
        db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
    },
    deleteConfig(key) {
        db.prepare('DELETE FROM config WHERE key = ?').run(key);
    },

    // ── Analítica ──
    incrementAnalyticsMetric(metric, bucket = 'global', amount = 1, timestamp = Date.now()) {
        const dateKey = getAnalyticsDateKey(timestamp);
        const normalizedBucket = bucket == null ? 'global' : String(bucket);
        const safeAmount = Number.isFinite(amount) ? Math.trunc(amount) : 0;

        db.prepare(`
            INSERT INTO analytics_daily (date, metric, bucket, value, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(date, metric, bucket) DO UPDATE SET
                value = value + excluded.value,
                updated_at = excluded.updated_at
        `).run(dateKey, metric, normalizedBucket, safeAmount, timestamp);
    },
    getAnalyticsMetrics(days = 7) {
        const sinceDate = getSinceDateKey(days);
        return db.prepare('SELECT date, metric, bucket, value FROM analytics_daily WHERE date >= ? ORDER BY date ASC, metric ASC, bucket ASC').all(sinceDate);
    },
    getTopAnalyticsBuckets(metric, days = 7, limit = 10) {
        const sinceDate = getSinceDateKey(days);
        return db.prepare(`
            SELECT bucket, SUM(value) as total
            FROM analytics_daily
            WHERE date >= ? AND metric = ?
            GROUP BY bucket
            ORDER BY total DESC, bucket ASC
            LIMIT ?
        `).all(sinceDate, metric, limit);
    },
    recordCommandExecution(command, ok = true, durationMs = 0, timestamp = Date.now()) {
        const dateKey = getAnalyticsDateKey(timestamp);
        const safeDuration = Number.isFinite(durationMs) ? Math.max(0, Math.round(durationMs)) : 0;

        db.prepare(`
            INSERT INTO command_metrics_daily (date, command, total, success, errors, total_duration_ms, updated_at)
            VALUES (?, ?, 1, ?, ?, ?, ?)
            ON CONFLICT(date, command) DO UPDATE SET
                total = total + 1,
                success = success + excluded.success,
                errors = errors + excluded.errors,
                total_duration_ms = total_duration_ms + excluded.total_duration_ms,
                updated_at = excluded.updated_at
        `).run(dateKey, command, ok ? 1 : 0, ok ? 0 : 1, safeDuration, timestamp);

        stmts.incrementAnalyticsMetric('commands_total', 'global', 1, timestamp);
        if (!ok) stmts.incrementAnalyticsMetric('command_errors', 'global', 1, timestamp);
    },
    getCommandMetrics(days = 7, limit = 10) {
        const sinceDate = getSinceDateKey(days);
        return db.prepare(`
            SELECT command, SUM(total) as total, SUM(success) as success, SUM(errors) as errors,
                   SUM(total_duration_ms) as total_duration_ms, MAX(updated_at) as updated_at
            FROM command_metrics_daily
            WHERE date >= ?
            GROUP BY command
            ORDER BY total DESC, command ASC
            LIMIT ?
        `).all(sinceDate, limit);
    },
    setHealthCheck(name, payload = {}) {
        const current = db.prepare('SELECT * FROM health_checks WHERE name = ?').get(name);
        const timestamp = payload.timestamp ?? Date.now();
        const status = payload.status || 'ok';
        const details = JSON.stringify(payload.details || {});
        const previousFailures = current?.consecutive_failures || 0;
        const consecutiveFailures = status === 'error'
            ? previousFailures + 1
            : status === 'ok'
                ? 0
                : previousFailures;
        const lastOkAt = status === 'ok' ? timestamp : (current?.last_ok_at ?? null);
        const lastErrorAt = status === 'error' ? timestamp : (current?.last_error_at ?? null);
        const lastDurationMs = Number.isFinite(payload.durationMs)
            ? Math.max(0, Math.round(payload.durationMs))
            : (current?.last_duration_ms ?? null);
        const lastRunAt = payload.lastRunAt ?? timestamp;

        db.prepare(`
            INSERT OR REPLACE INTO health_checks (
                name, status, last_run_at, last_ok_at, last_error_at, last_duration_ms, consecutive_failures, details
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(name, status, lastRunAt, lastOkAt, lastErrorAt, lastDurationMs, consecutiveFailures, details);
    },
    getHealthChecks() {
        return db.prepare('SELECT * FROM health_checks ORDER BY name ASC').all().map(row => {
            let details = {};
            try {
                details = row.details ? JSON.parse(row.details) : {};
            } catch {
                details = { raw: row.details };
            }

            return {
                ...row,
                details
            };
        });
    },

    // ── Logs ──
    addLog(type, details) {
        db.prepare('INSERT INTO logs (type, details, timestamp) VALUES (?, ?, ?)').run(type, JSON.stringify(details), new Date().toISOString());
        // Keep only the last 100 logs — single efficient DELETE
        db.prepare('DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY id DESC LIMIT 100)').run();
    },
    getLogs(limit = 10) {
        return db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT ?').all(limit).map(l => ({
            ...l,
            details: JSON.parse(l.details)
        }));
    },
    // ── Starboard ──
    getStarboard(messageId) {
        return db.prepare('SELECT * FROM starboards WHERE message_id = ?').get(messageId);
    },
    updateStarboard(messageId, starMessageId, channelId, stars) {
        db.prepare('INSERT OR REPLACE INTO starboards (message_id, star_message_id, channel_id, stars) VALUES (?, ?, ?, ?)').run(messageId, starMessageId, channelId, stars);
    },
    removeStarboard(messageId) {
        db.prepare('DELETE FROM starboards WHERE message_id = ?').run(messageId);
    },
    // ── Birthdays ──
    setBirthday(userId, dateStr) {
        getOrCreateUser(userId);
        db.prepare('UPDATE users SET birthday = ? WHERE id = ?').run(dateStr, userId);
    },
    getBirthday(userId) {
        return db.prepare('SELECT birthday FROM users WHERE id = ?').get(userId)?.birthday;
    },
    getTodayBirthdays(memDayMonth) {
        // SQL LIKE operator for e.g '%/05'
        return db.prepare(`SELECT id FROM users WHERE birthday LIKE ?`).all(`%${memDayMonth}`);
    },
    // ── Canales de voz temporales ──
    addTempChannel(channelId, guildId, ownerId) {
        db.prepare('INSERT OR REPLACE INTO temp_channels (channel_id, guild_id, owner_id, created_at) VALUES (?, ?, ?, ?)').run(channelId, guildId, ownerId, Date.now());
    },
    removeTempChannel(channelId) {
        db.prepare('DELETE FROM temp_channels WHERE channel_id = ?').run(channelId);
    },
    getTempChannels(guildId) {
        return db.prepare('SELECT * FROM temp_channels WHERE guild_id = ?').all(guildId);
    },
    isTempChannel(channelId) {
        return !!db.prepare('SELECT 1 FROM temp_channels WHERE channel_id = ?').get(channelId);
    },

    // ── Twitch Subs ──
    addTwitchSub(guildId, streamer, channelId, rolePing) {
        db.prepare('INSERT INTO twitch_subs (guild_id, streamer, channel_id, role_ping) VALUES (?, ?, ?, ?)').run(guildId, streamer.toLowerCase(), channelId, rolePing || null);
    },
    removeTwitchSub(guildId, streamer) {
        return db.prepare('DELETE FROM twitch_subs WHERE guild_id = ? AND streamer = ?').run(guildId, streamer.toLowerCase()).changes > 0;
    },
    getTwitchSubs(guildId) {
        return db.prepare('SELECT * FROM twitch_subs WHERE guild_id = ?').all(guildId);
    },
    getAllTwitchSubs() {
        return db.prepare('SELECT * FROM twitch_subs').all();
    },
    updateTwitchSub(id, lastLive, lastStreamId) {
        db.prepare('UPDATE twitch_subs SET last_live = ?, last_stream_id = ? WHERE id = ?').run(lastLive, lastStreamId, id);
    },

    // ── YouTube Subs ──
    addYoutubeSub(guildId, ytChannelId, ytChannelName, discordChannel, rolePing) {
        db.prepare('INSERT INTO youtube_subs (guild_id, yt_channel_id, yt_channel_name, discord_channel, role_ping) VALUES (?, ?, ?, ?, ?)').run(guildId, ytChannelId, ytChannelName, discordChannel, rolePing || null);
    },
    removeYoutubeSub(guildId, ytChannelId) {
        return db.prepare('DELETE FROM youtube_subs WHERE guild_id = ? AND yt_channel_id = ?').run(guildId, ytChannelId).changes > 0;
    },
    getYoutubeSubs(guildId) {
        return db.prepare('SELECT * FROM youtube_subs WHERE guild_id = ?').all(guildId);
    },
    getAllYoutubeSubs() {
        return db.prepare('SELECT * FROM youtube_subs').all();
    },
    updateYoutubeSub(id, lastVideoId) {
        db.prepare('UPDATE youtube_subs SET last_video_id = ? WHERE id = ?').run(lastVideoId, id);
    },

    // ── GitHub Subs ──
    addGithubSub(guildId, repo, discordChannel, rolePing, trackCommits, trackReleases) {
        db.prepare('INSERT INTO github_subs (guild_id, repo, discord_channel, role_ping, track_commits, track_releases) VALUES (?, ?, ?, ?, ?, ?)').run(guildId, repo, discordChannel, rolePing || null, trackCommits ? 1 : 0, trackReleases ? 1 : 0);
    },
    removeGithubSub(guildId, repo) {
        return db.prepare('DELETE FROM github_subs WHERE guild_id = ? AND repo = ?').run(guildId, repo).changes > 0;
    },
    getGithubSubs(guildId) {
        return db.prepare('SELECT * FROM github_subs WHERE guild_id = ?').all(guildId);
    },
    getAllGithubSubs() {
        return db.prepare('SELECT * FROM github_subs').all();
    },
    updateGithubSub(id, lastCommitSha, lastReleaseTag) {
        db.prepare('UPDATE github_subs SET last_commit_sha = ?, last_release_tag = ? WHERE id = ?').run(lastCommitSha, lastReleaseTag, id);
    },

    // ── Game Servers ──
    addGameServer(guildId, ip, port, game, discordChannel, rolePing, label) {
        db.prepare('INSERT INTO game_servers (guild_id, ip, port, game, discord_channel, role_ping, label) VALUES (?, ?, ?, ?, ?, ?, ?)').run(guildId, ip, port, game, discordChannel, rolePing || null, label || `${ip}:${port}`);
    },
    removeGameServer(guildId, ip) {
        return db.prepare('DELETE FROM game_servers WHERE guild_id = ? AND ip = ?').run(guildId, ip).changes > 0;
    },
    getGameServers(guildId) {
        return db.prepare('SELECT * FROM game_servers WHERE guild_id = ?').all(guildId);
    },
    getAllGameServers() {
        return db.prepare('SELECT * FROM game_servers').all();
    },
    updateGameServerStatus(id, status) {
        db.prepare('UPDATE game_servers SET last_status = ? WHERE id = ?').run(status ? 1 : 0, id);
    },

    // ── Discord Webhooks (para /anuncio) ──
    setDiscordWebhook(channelId, webhookUrl) {
        db.prepare('INSERT OR REPLACE INTO discord_webhooks (channel_id, webhook_url) VALUES (?, ?)').run(channelId, webhookUrl);
    },
    getDiscordWebhook(channelId) {
        return db.prepare('SELECT webhook_url FROM discord_webhooks WHERE channel_id = ?').get(channelId)?.webhook_url;
    },
    removeDiscordWebhook(channelId) {
        db.prepare('DELETE FROM discord_webhooks WHERE channel_id = ?').run(channelId);
    },

    // ── Recordatorios ──
    addReminder(userId, guildId, message, remindAt) {
        const result = db.prepare('INSERT INTO reminders (user_id, guild_id, message, remind_at, created_at) VALUES (?, ?, ?, ?, ?)').run(userId, guildId || null, message, remindAt, Date.now());
        return Number(result.lastInsertRowid);
    },
    getReminder(reminderId) {
        return db.prepare('SELECT * FROM reminders WHERE id = ?').get(reminderId) || null;
    },
    getUserReminders(userId) {
        return db.prepare('SELECT * FROM reminders WHERE user_id = ? ORDER BY remind_at ASC').all(userId);
    },
    getPendingReminders() {
        return db.prepare('SELECT * FROM reminders ORDER BY remind_at ASC').all();
    },
    deleteReminder(reminderId, userId = null) {
        const result = userId
            ? db.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?').run(reminderId, userId)
            : db.prepare('DELETE FROM reminders WHERE id = ?').run(reminderId);
        return result.changes > 0;
    },

    // ── Voice XP ──
    addVoiceMinutes(userId, minutes, xp) {
        // Asegura que el usuario exista, luego suma minutos de voz y XP
        db.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)').run(userId);
        db.prepare('UPDATE users SET voice_minutes = voice_minutes + ?, xp = xp + ? WHERE id = ?').run(minutes, xp, userId);
    },
    getTopVoice(limit = 10) {
        return db.prepare('SELECT id, voice_minutes, xp, level FROM users WHERE voice_minutes > 0 ORDER BY voice_minutes DESC LIMIT ?').all(limit);
    },
    getVoiceRank(userId) {
        return db.prepare('SELECT COUNT(*) as rank FROM users WHERE voice_minutes > (SELECT voice_minutes FROM users WHERE id = ?)').get(userId);
    },

    // ═══════════════════════════════════════════════════
    //  SISTEMA DE PERFILES AVANZADOS
    // ═══════════════════════════════════════════════════

    // ── Rachas de mensajes ──
    updateMessageStreak(userId) {
        const today = getAnalyticsDateKey();
        const user = getOrCreateUser(userId);

        if (user.last_message_date === today) {
            return { streak: user.message_streak || 0, updated: false };
        }

        const yesterday = getAnalyticsDateKey(Date.now() - 24 * 60 * 60 * 1000);
        let newStreak = 1;

        if (user.last_message_date === yesterday) {
            newStreak = (user.message_streak || 0) + 1;
        }

        db.prepare('UPDATE users SET message_streak = ?, last_message_date = ? WHERE id = ?').run(newStreak, today, userId);
        return { streak: newStreak, updated: true, previousStreak: user.message_streak || 0 };
    },
    getMessageStreak(userId) {
        const user = stmts.getUser(userId);
        if (!user) return 0;
        return user.message_streak || 0;
    },

    // ── Reputación ──
    addReputation(userId, amount = 1) {
        getOrCreateUser(userId);
        db.prepare('UPDATE users SET reputation = reputation + ? WHERE id = ?').run(amount, userId);
        return db.prepare('SELECT reputation FROM users WHERE id = ?').get(userId).reputation;
    },
    getReputation(userId) {
        return stmts.getUser(userId)?.reputation || 0;
    },
    getTopReputation(limit = 10) {
        return db.prepare('SELECT id, reputation FROM users WHERE reputation > 0 ORDER BY reputation DESC LIMIT ?').all(limit);
    },

    // ── Perfil personalizado ──
    setProfileColor(userId, color) {
        getOrCreateUser(userId);
        db.prepare('UPDATE users SET profile_color = ? WHERE id = ?').run(color, userId);
    },
    setProfileBadge(userId, badgeId) {
        getOrCreateUser(userId);
        db.prepare('UPDATE users SET profile_badge = ? WHERE id = ?').run(badgeId, userId);
    },
    getProfileSettings(userId) {
        const user = stmts.getUser(userId);
        return {
            color: user?.profile_color || null,
            badge: user?.profile_badge || null,
            timezone: user?.timezone || 'America/Argentina/Buenos_Aires',
            language: user?.language || 'es',
        };
    },

    // ═══════════════════════════════════════════════════
    //  SISTEMA DE BADGES
    // ═══════════════════════════════════════════════════

    // ── Definiciones de badges ──
    createBadgeDefinition(badge) {
        db.prepare(`
            INSERT OR REPLACE INTO badge_definitions (id, name, description, icon, rarity, requirement_type, requirement_value, reward_xp, reward_coins, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(badge.id, badge.name, badge.description, badge.icon, badge.rarity || 'common',
            badge.requirement_type, badge.requirement_value, badge.reward_xp || 0, badge.reward_coins || 0, Date.now());
    },
    getBadgeDefinition(badgeId) {
        return db.prepare('SELECT * FROM badge_definitions WHERE id = ?').get(badgeId) || null;
    },
    getAllBadgeDefinitions() {
        return db.prepare('SELECT * FROM badge_definitions ORDER BY rarity, name').all();
    },

    // ── Badges de usuario ──
    unlockBadge(userId, badgeId) {
        const existing = db.prepare('SELECT * FROM user_badges WHERE user_id = ? AND badge_id = ?').get(userId, badgeId);
        if (existing) return { unlocked: false, alreadyUnlocked: true };

        const badge = stmts.getBadgeDefinition(badgeId);
        if (!badge) return { unlocked: false, error: 'Badge not found' };

        db.prepare('INSERT INTO user_badges (user_id, badge_id, unlocked_at, progress) VALUES (?, ?, ?, 100)').run(userId, badgeId, Date.now());

        if (badge.reward_xp > 0) {
            db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(badge.reward_xp, userId);
        }
        if (badge.reward_coins > 0) {
            db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(badge.reward_coins, userId);
        }

        return { unlocked: true, badge };
    },
    updateBadgeProgress(userId, badgeId, progress) {
        const badge = stmts.getBadgeDefinition(badgeId);
        if (!badge) return false;

        const existing = db.prepare('SELECT * FROM user_badges WHERE user_id = ? AND badge_id = ?').get(userId, badgeId);

        if (existing) {
            db.prepare('UPDATE user_badges SET progress = ? WHERE user_id = ? AND badge_id = ?').run(progress, userId, badgeId);
        } else {
            db.prepare('INSERT INTO user_badges (user_id, badge_id, unlocked_at, progress) VALUES (?, ?, NULL, ?)').run(userId, badgeId, progress);
        }

        if (!existing?.unlocked_at && progress >= badge.requirement_value) {
            return stmts.unlockBadge(userId, badgeId);
        }

        return { progress, badge };
    },
    getUserBadges(userId) {
        return db.prepare(`
            SELECT ub.*, bd.name, bd.description, bd.icon, bd.rarity
            FROM user_badges ub
            JOIN badge_definitions bd ON ub.badge_id = bd.id
            WHERE ub.user_id = ?
            ORDER BY ub.unlocked_at DESC
        `).all(userId);
    },
    getUserBadgeProgress(userId, badgeId) {
        return db.prepare('SELECT * FROM user_badges WHERE user_id = ? AND badge_id = ?').get(userId, badgeId) || null;
    },

    // ═══════════════════════════════════════════════════
    //  SISTEMA DE LOGROS (ACHIEVEMENTS)
    // ═══════════════════════════════════════════════════

    // ── Definiciones de logros ──
    createAchievementDefinition(achievement) {
        db.prepare(`
            INSERT OR REPLACE INTO achievement_definitions (id, name, description, category, requirement_type, requirement_value, reward_xp, reward_coins, reward_badge_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(achievement.id, achievement.name, achievement.description, achievement.category || 'general',
            achievement.requirement_type, achievement.requirement_value, achievement.reward_xp || 0,
            achievement.reward_coins || 0, achievement.reward_badge_id || null, Date.now());
    },
    getAchievementDefinition(achievementId) {
        return db.prepare('SELECT * FROM achievement_definitions WHERE id = ?').get(achievementId) || null;
    },
    getAllAchievementDefinitions() {
        return db.prepare('SELECT * FROM achievement_definitions ORDER BY category, name').all();
    },
    getAchievementsByCategory(category) {
        return db.prepare('SELECT * FROM achievement_definitions WHERE category = ? ORDER BY name').all(category);
    },

    // ── Logros de usuario ──
    completeAchievement(userId, achievementId) {
        const existing = db.prepare('SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?').get(userId, achievementId);
        if (existing?.completed_at) return { completed: false, alreadyCompleted: true };

        const achievement = stmts.getAchievementDefinition(achievementId);
        if (!achievement) return { completed: false, error: 'Achievement not found' };

        db.prepare('INSERT OR REPLACE INTO user_achievements (user_id, achievement_id, completed_at, progress) VALUES (?, ?, ?, 100)').run(userId, achievementId, Date.now());

        if (achievement.reward_xp > 0) {
            db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(achievement.reward_xp, userId);
        }
        if (achievement.reward_coins > 0) {
            db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(achievement.reward_coins, userId);
        }
        if (achievement.reward_badge_id) {
            stmts.unlockBadge(userId, achievement.reward_badge_id);
        }

        return { completed: true, achievement };
    },
    updateAchievementProgress(userId, achievementId, progress) {
        const achievement = stmts.getAchievementDefinition(achievementId);
        if (!achievement) return false;

        const existing = db.prepare('SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?').get(userId, achievementId);

        if (existing?.completed_at) return { alreadyCompleted: true };

        if (existing) {
            db.prepare('UPDATE user_achievements SET progress = ? WHERE user_id = ? AND achievement_id = ?').run(progress, userId, achievementId);
        } else {
            db.prepare('INSERT INTO user_achievements (user_id, achievement_id, completed_at, progress) VALUES (?, ?, NULL, ?)').run(userId, achievementId, progress);
        }

        if (progress >= achievement.requirement_value) {
            return stmts.completeAchievement(userId, achievementId);
        }

        return { progress, achievement };
    },
    getUserAchievements(userId) {
        return db.prepare(`
            SELECT ua.*, ad.name, ad.description, ad.category
            FROM user_achievements ua
            JOIN achievement_definitions ad ON ua.achievement_id = ad.id
            WHERE ua.user_id = ?
            ORDER BY ua.completed_at DESC
        `).all(userId);
    },
    getUserAchievementProgress(userId, achievementId) {
        return db.prepare('SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?').get(userId, achievementId) || null;
    },

    // ═══════════════════════════════════════════════════
    //  SISTEMA DE MISIONES (QUESTS)
    // ═══════════════════════════════════════════════════

    // ── Plantillas de misiones ──
    createQuestTemplate(quest) {
        db.prepare(`
            INSERT OR REPLACE INTO quest_templates (id, name, description, type, category, requirement_type, requirement_value, reward_xp, reward_coins, reward_badge_id, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        `).run(quest.id, quest.name, quest.description, quest.type || 'daily', quest.category || 'general',
            quest.requirement_type, quest.requirement_value, quest.reward_xp || 0,
            quest.reward_coins || 0, quest.reward_badge_id || null, Date.now());
    },
    getQuestTemplate(questId) {
        return db.prepare('SELECT * FROM quest_templates WHERE id = ? AND is_active = 1').get(questId) || null;
    },
    getActiveQuestTemplates(type = null) {
        if (type) {
            return db.prepare('SELECT * FROM quest_templates WHERE is_active = 1 AND type = ?').all(type);
        }
        return db.prepare('SELECT * FROM quest_templates WHERE is_active = 1').all();
    },

    // ── Misiones de usuario ──
    startUserQuest(userId, questId, type = 'daily') {
        const quest = stmts.getQuestTemplate(questId);
        if (!quest) return { started: false, error: 'Quest not found' };

        const now = Date.now();
        let expiresAt = null;

        if (type === 'daily') {
            expiresAt = now + 24 * 60 * 60 * 1000;
        } else if (type === 'weekly') {
            expiresAt = now + 7 * 24 * 60 * 60 * 1000;
        }

        const result = db.prepare(`
            INSERT INTO user_quests (user_id, quest_id, type, progress, completed, claimed, started_at, expires_at)
            VALUES (?, ?, ?, 0, 0, 0, ?, ?)
        `).run(userId, questId, type, now, expiresAt);

        return { started: true, questId: Number(result.lastInsertRowid), quest, expiresAt };
    },
    updateQuestProgress(userId, questId, progress) {
        const userQuest = db.prepare('SELECT * FROM user_quests WHERE user_id = ? AND quest_id = ? AND completed = 0').get(userId, questId);
        if (!userQuest) return null;

        const quest = stmts.getQuestTemplate(questId);
        if (!quest) return null;

        db.prepare('UPDATE user_quests SET progress = ? WHERE id = ?').run(progress, userQuest.id);

        if (progress >= quest.requirement_value) {
            db.prepare('UPDATE user_quests SET completed = 1, completed_at = ? WHERE id = ?').run(Date.now(), userQuest.id);
            return { completed: true, quest };
        }

        return { progress, quest };
    },
    claimQuestReward(userId, userQuestId) {
        const userQuest = db.prepare('SELECT * FROM user_quests WHERE id = ? AND user_id = ? AND completed = 1 AND claimed = 0').get(userQuestId, userId);
        if (!userQuest) return { claimed: false, error: 'Quest not found or already claimed' };

        const quest = stmts.getQuestTemplate(userQuest.quest_id);
        if (!quest) return { claimed: false, error: 'Quest template not found' };

        db.prepare('UPDATE user_quests SET claimed = 1 WHERE id = ?').run(userQuestId);

        if (quest.reward_xp > 0) {
            db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(quest.reward_xp, userId);
        }
        if (quest.reward_coins > 0) {
            db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(quest.reward_coins, userId);
        }
        if (quest.reward_badge_id) {
            stmts.unlockBadge(userId, quest.reward_badge_id);
        }

        return { claimed: true, rewards: { xp: quest.reward_xp, coins: quest.reward_coins, badge: quest.reward_badge_id } };
    },
    getUserActiveQuests(userId) {
        return db.prepare(`
            SELECT uq.*, qt.name, qt.description, qt.requirement_type, qt.requirement_value, qt.reward_xp, qt.reward_coins
            FROM user_quests uq
            JOIN quest_templates qt ON uq.quest_id = qt.id
            WHERE uq.user_id = ? AND uq.completed = 0 AND (uq.expires_at IS NULL OR uq.expires_at > ?)
            ORDER BY uq.expires_at ASC
        `).all(userId, Date.now());
    },
    getUserCompletedQuests(userId, limit = 10) {
        return db.prepare(`
            SELECT uq.*, qt.name, qt.description, qt.reward_xp, qt.reward_coins
            FROM user_quests uq
            JOIN quest_templates qt ON uq.quest_id = qt.id
            WHERE uq.user_id = ? AND uq.completed = 1
            ORDER BY uq.completed_at DESC
            LIMIT ?
        `).all(userId, limit);
    },
    assignDailyQuests(userId) {
        const dailyQuests = stmts.getActiveQuestTemplates('daily');
        const now = Date.now();
        const today = getAnalyticsDateKey();

        const existingToday = db.prepare(`
            SELECT quest_id FROM user_quests
            WHERE user_id = ? AND type = 'daily' AND started_at >= ?
        `).all(userId, now - 24 * 60 * 60 * 1000);

        const existingIds = new Set(existingToday.map(q => q.quest_id));
        const assigned = [];

        for (const quest of dailyQuests.slice(0, 3)) {
            if (!existingIds.has(quest.id)) {
                const expiresAt = now + 24 * 60 * 60 * 1000;
                db.prepare(`
                    INSERT INTO user_quests (user_id, quest_id, type, progress, completed, claimed, started_at, expires_at)
                    VALUES (?, ?, 'daily', 0, 0, 0, ?, ?)
                `).run(userId, quest.id, now, expiresAt);
                assigned.push(quest);
            }
        }

        return assigned;
    },
    cleanupExpiredQuests() {
        return db.prepare('DELETE FROM user_quests WHERE expires_at IS NOT NULL AND expires_at < ? AND completed = 0').run(Date.now()).changes;
    },

    // ═══════════════════════════════════════════════════
    //  PREFERENCIAS DE USUARIO
    // ═══════════════════════════════════════════════════

    getUserPreferences(userId) {
        let prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
        if (!prefs) {
            db.prepare('INSERT INTO user_preferences (user_id) VALUES (?)').run(userId);
            prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
        }
        return prefs;
    },
    setUserPreference(userId, key, value) {
        const allowedKeys = ['timezone', 'language', 'ai_enabled', 'notifications_enabled', 'embed_style', 'reminder_format', 'privacy_level'];
        if (!allowedKeys.includes(key)) return false;

        getOrCreateUser(userId);
        db.prepare(`UPDATE user_preferences SET ${key} = ? WHERE user_id = ?`).run(value, userId);

        if (['timezone', 'language', 'ai_enabled', 'notifications_enabled'].includes(key)) {
            db.prepare(`UPDATE users SET ${key} = ? WHERE id = ?`).run(value, userId);
        }

        return true;
    },
    setMultipleUserPreferences(userId, prefs) {
        const allowedKeys = ['timezone', 'language', 'ai_enabled', 'notifications_enabled', 'embed_style', 'reminder_format', 'privacy_level'];
        const updates = Object.entries(prefs).filter(([key]) => allowedKeys.includes(key));

        if (updates.length === 0) return false;

        getOrCreateUser(userId);

        for (const [key, value] of updates) {
            db.prepare(`UPDATE user_preferences SET ${key} = ? WHERE user_id = ?`).run(value, userId);
            if (['timezone', 'language', 'ai_enabled', 'notifications_enabled'].includes(key)) {
                db.prepare(`UPDATE users SET ${key} = ? WHERE id = ?`).run(value, userId);
            }
        }

        return true;
    },

    // ═══════════════════════════════════════════════════
    //  ESTADÍSTICAS DE PERFIL
    // ═══════════════════════════════════════════════════

    getFullProfile(userId) {
        const user = stmts.getUser(userId);
        if (!user) return null;

        const badges = stmts.getUserBadges(userId);
        const achievements = stmts.getUserAchievements(userId);
        const activeQuests = stmts.getUserActiveQuests(userId);
        const preferences = stmts.getUserPreferences(userId);
        const xpRank = stmts.getRank(userId);
        const voiceRank = stmts.getVoiceRank(userId);

        return {
            user,
            badges,
            achievements: achievements.filter(a => a.completed_at),
            achievementProgress: achievements.filter(a => !a.completed_at),
            activeQuests,
            preferences,
            ranks: {
                xp: xpRank.rank + 1,
                voice: voiceRank?.rank ? voiceRank.rank + 1 : null,
            },
        };
    },

    // ── Progreso automático ──
    checkAndAwardProgress(userId, type, value = 1) {
        const results = { badges: [], achievements: [], quests: [] };

        // Check badges
        const badgeDefs = db.prepare('SELECT * FROM badge_definitions WHERE requirement_type = ?').all(type);
        for (const badge of badgeDefs) {
            const progress = stmts.getUserBadgeProgress(userId, badge.id);
            if (!progress?.unlocked_at) {
                const result = stmts.updateBadgeProgress(userId, badge.id, value);
                if (result?.unlocked) results.badges.push(result.badge);
            }
        }

        // Check achievements
        const achievementDefs = db.prepare('SELECT * FROM achievement_definitions WHERE requirement_type = ?').all(type);
        for (const achievement of achievementDefs) {
            const progress = stmts.getUserAchievementProgress(userId, achievement.id);
            if (!progress?.completed_at) {
                const result = stmts.updateAchievementProgress(userId, achievement.id, value);
                if (result?.completed) results.achievements.push(result.achievement);
            }
        }

        // Check quests
        const activeQuests = stmts.getUserActiveQuests(userId);
        for (const quest of activeQuests) {
            if (quest.requirement_type === type) {
                const result = stmts.updateQuestProgress(userId, quest.quest_id, quest.progress + value);
                if (result?.completed) results.quests.push(result.quest);
            }
        }

        return results;
    },

    // ─── GUILD SETTINGS (Volume) ───
    getGuildSettings: (guildId) => {
        let settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
        if (!settings) {
            db.prepare('INSERT INTO guild_settings (guild_id, music_volume) VALUES (?, 10)').run(guildId);
            settings = { guild_id: guildId, music_volume: 10, prefix: '/' };
        }
        return settings;
    },
    setGuildVolume: (guildId, volume) => {
        db.prepare(`
            INSERT INTO guild_settings (guild_id, music_volume) VALUES (?, ?)
            ON CONFLICT(guild_id) DO UPDATE SET music_volume = excluded.music_volume
        `).run(guildId, volume);
    }
};

module.exports = {
    stmts,
    _db: db,
    // Provide a dummy 'data' object in case some module tries to access it, though it shouldn't be used now.
    data: new Proxy({}, {
        get() {
            return {};
        }
    })
};
