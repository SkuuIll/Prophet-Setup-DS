// ═══════════════════════════════════════════════════
//  PROPHET BOT — Base de Datos JSON
//  Sin dependencias externas, persistencia a disco
// ═══════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'prophet.json');

// Estructura inicial
const DEFAULT_DATA = {
    users: {},        // { [userId]: { xp, level, messages, last_xp, inventory: [] } }
    warns: [],        // { id, user_id, mod_id, reason, created_at }
    reaction_roles: {},// { [messageId]: { [emoji]: roleId } }
    giveaways: {},    // { [messageId]: { channel_id, prize, end_time, ended, host_id, entries: [] } }
    tickets: {},      // { [channelId]: { user_id, created_at } }
    tempbans: [],     // { guild_id, user_id, mod_id, reason, unban_at }
    config: {},       // { [key]: value }
    logs: [],         // { type, data, timestamp }
    _warnIdCounter: 0,
};

// Cargar datos
function loadDB() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const raw = fs.readFileSync(DB_PATH, 'utf-8');
            return { ...DEFAULT_DATA, ...JSON.parse(raw) };
        }
    } catch (err) {
        console.error('⚠️ Error leyendo DB, usando datos vacíos:', err.message);
    }
    return { ...DEFAULT_DATA };
}

// Guardar datos (debounced)
let saveTimeout = null;
function saveDB() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
            fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        } catch (err) {
            console.error('❌ Error guardando DB:', err.message);
        }
    }, 1000); // Guardar máximo una vez por segundo
}

// Instancia
const data = loadDB();

// ═══ QUERIES (compatibles con la interfaz original) ═══

const stmts = {
    // ── Usuarios / Niveles ──
    getUser(userId) {
        return data.users[userId] || null;
    },
    upsertUser(userData) {
        data.users[userData.user_id] = userData;
        saveDB();
    },
    getTop(limit) {
        return Object.values(data.users)
            .sort((a, b) => b.xp - a.xp)
            .slice(0, limit);
    },
    getRank(userId) {
        const userXp = data.users[userId]?.xp || 0;
        const rank = Object.values(data.users).filter(u => u.xp > userXp).length;
        return { rank };
    },

    // ── Economía ──
    getEconomy(userId) {
        const user = data.users[userId] || {};
        return {
            balance: user.balance || 0,
            bank: user.bank || 0,
            last_daily: user.last_daily || 0,
            last_work: user.last_work || 0
        };
    },
    addMoney(userId, amount, type = 'balance') { // type: 'balance' | 'bank'
        if (!data.users[userId]) data.users[userId] = { xp: 0, level: 0, messages: 0 };
        if (!data.users[userId][type]) data.users[userId][type] = 0;

        data.users[userId][type] += amount;
        saveDB();
        return data.users[userId][type];
    },
    removeMoney(userId, amount, type = 'balance') {
        const user = data.users[userId];
        if (!user) return false;
        if ((user[type] || 0) < amount) return false;

        user[type] -= amount;
        saveDB();
        return true;
    },
    setEconomy(userId, key, value) { // key: last_daily, last_work
        if (!data.users[userId]) data.users[userId] = { xp: 0, level: 0, messages: 0 };
        data.users[userId][key] = value;
        saveDB();
    },
    transferBank(userId, amount, direction) { // direction: 'dep' (balance->bank) | 'with' (bank->balance)
        if (!data.users[userId]) return false;
        const user = data.users[userId];
        const balance = user.balance || 0;
        const bank = user.bank || 0;

        if (direction === 'dep') {
            if (balance < amount) return false;
            user.balance -= amount;
            user.bank = (user.bank || 0) + amount;
        } else if (direction === 'with') {
            if (bank < amount) return false;
            user.bank -= amount;
            user.balance = (user.balance || 0) + amount;
        }
        saveDB();
        return { success: true, balance: user.balance, bank: user.bank };
    },

    // ── Inventario ──
    getInventory(userId) {
        return data.users[userId]?.inventory || [];
    },
    addItem(userId, itemId, quantity = 1) {
        if (!data.users[userId]) data.users[userId] = { xp: 0, level: 0, messages: 0 };
        const user = data.users[userId];
        if (!user.inventory) user.inventory = [];

        const item = user.inventory.find(i => i.id === itemId);
        if (item) {
            item.amount += quantity;
        } else {
            user.inventory.push({ id: itemId, amount: quantity });
        }
        saveDB();
        return user.inventory;
    },
    removeItem(userId, itemId, quantity = 1) {
        const user = data.users[userId];
        if (!user || !user.inventory) return false;

        const itemIndex = user.inventory.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return false;

        if (user.inventory[itemIndex].amount <= quantity) {
            user.inventory.splice(itemIndex, 1);
        } else {
            user.inventory[itemIndex].amount -= quantity;
        }
        saveDB();
        return true;
    },

    // ── Warns ──
    addWarn(userId, modId, reason) {
        data._warnIdCounter++;
        data.warns.push({
            id: data._warnIdCounter,
            user_id: userId,
            mod_id: modId,
            reason,
            created_at: new Date().toISOString(),
        });
        saveDB();
    },
    getWarns(userId) {
        return data.warns
            .filter(w => w.user_id === userId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    countWarns(userId) {
        return { total: data.warns.filter(w => w.user_id === userId).length };
    },
    clearWarns(userId) {
        data.warns = data.warns.filter(w => w.user_id !== userId);
        saveDB();
    },
    deleteWarn(id) {
        data.warns = data.warns.filter(w => w.id !== id);
        saveDB();
    },

    // ── Reaction Roles ──
    addReactionRole(messageId, emoji, roleId) {
        if (!data.reaction_roles[messageId]) data.reaction_roles[messageId] = {};
        data.reaction_roles[messageId][emoji] = roleId;
        saveDB();
    },
    getReactionRole(messageId, emoji) {
        return data.reaction_roles[messageId]?.[emoji] ? { role_id: data.reaction_roles[messageId][emoji] } : null;
    },
    getReactionRoles(messageId) {
        const roles = data.reaction_roles[messageId] || {};
        return Object.entries(roles).map(([emoji, role_id]) => ({ message_id: messageId, emoji, role_id }));
    },
    deleteReactionRoles(messageId) {
        delete data.reaction_roles[messageId];
        saveDB();
    },

    // ── Sorteos ──
    addGiveaway(messageId, channelId, prize, endTime, hostId) {
        data.giveaways[messageId] = { channel_id: channelId, prize, end_time: endTime, ended: false, host_id: hostId, entries: [] };
        saveDB();
    },
    getGiveaway(messageId) {
        const g = data.giveaways[messageId];
        return g ? { message_id: messageId, ...g } : null;
    },
    getActiveGiveaways() {
        return Object.entries(data.giveaways)
            .filter(([, g]) => !g.ended)
            .map(([id, g]) => ({ message_id: id, ...g }));
    },
    endGiveaway(messageId) {
        if (data.giveaways[messageId]) {
            data.giveaways[messageId].ended = true;
            saveDB();
        }
    },
    addGiveawayEntry(messageId, userId) {
        const g = data.giveaways[messageId];
        if (g && !g.entries.includes(userId)) {
            g.entries.push(userId);
            saveDB();
        }
    },
    getGiveawayEntries(messageId) {
        const g = data.giveaways[messageId];
        return (g?.entries || []).map(uid => ({ user_id: uid }));
    },
    countGiveawayEntries(messageId) {
        return { total: data.giveaways[messageId]?.entries.length || 0 };
    },

    // ── Tickets ──
    addTicket(channelId, userId) {
        data.tickets[channelId] = { user_id: userId, created_at: new Date().toISOString() };
        saveDB();
    },
    getTicket(channelId) {
        return data.tickets[channelId] || null;
    },
    deleteTicket(channelId) {
        delete data.tickets[channelId];
        saveDB();
    },

    // ── Tempbans ──
    addTempban(guildId, userId, modId, reason, unbanAt) {
        if (!data.tempbans) data.tempbans = [];
        data.tempbans.push({ guild_id: guildId, user_id: userId, mod_id: modId, reason, unban_at: unbanAt });
        saveDB();
    },
    getActiveTempbans() {
        if (!data.tempbans) data.tempbans = [];
        return data.tempbans.filter(tb => tb.unban_at <= Date.now());
    },
    removeTempban(guildId, userId) {
        if (!data.tempbans) data.tempbans = [];
        data.tempbans = data.tempbans.filter(tb => !(tb.guild_id === guildId && tb.user_id === userId));
        saveDB();
    },

    // ── Config ──
    getConfig(key) {
        return data.config[key] !== undefined ? { value: data.config[key] } : null;
    },
    // ── Logs / Memoria de Acciones ──
    addLog(type, details) {
        if (!data.logs) data.logs = [];
        data.logs.push({
            type,
            details,
            timestamp: new Date().toISOString()
        });
        // Mantener últimos 100 eventos
        if (data.logs.length > 100) data.logs.shift();
        saveDB();
    },
    getLogs(limit = 10) {
        if (!data.logs) data.logs = [];
        return data.logs.slice(-limit).reverse();
    },
};

// Guardar al salir
process.on('exit', () => {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        try {
            fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
            fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        } catch (e) { }
    }
});

process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());

module.exports = { data, stmts };
