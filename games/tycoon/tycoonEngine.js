/**
 * ═══ TYCOON DE SERVIDORES v3 — Idle profundo ═══
 * Soft currency local. Progresión: unlocks, sinergias, research, misiones, crits, prestigio.
 */

const { stmts } = require('../../database');
const cfg = require('../common/gamesConfig').tycoon;

// ─── SERVIDORES (generadores) ───
const SERVERS_CONFIG = {
    vps_entry: {
        id: 'vps_entry', name: 'VPS Casual', icon: '💻',
        baseCost: 15, baseProd: 1, unlockAt: 0, tier: 1,
        tags: ['starter', 'cs2'],
        desc: '10 slots para 5v5 con amigos.'
    },
    cs2_comp: {
        id: 'cs2_comp', name: 'CS2 128-Tick', icon: '🔫',
        baseCost: 100, baseProd: 8, unlockAt: 25, tier: 2,
        tags: ['cs2', 'comp'],
        desc: 'Competitivo de alto tickrate.'
    },
    pubg_custom: {
        id: 'pubg_custom', name: 'PUBG Custom', icon: '🪂',
        baseCost: 1100, baseProd: 45, unlockAt: 500, tier: 3,
        tags: ['pubg', 'battle'],
        desc: '100 players en Erangel custom.'
    },
    valorant_scrim: {
        id: 'valorant_scrim', name: 'Valorant Scrim Box', icon: '🎯',
        baseCost: 4500, baseProd: 120, unlockAt: 3000, tier: 3,
        tags: ['valorant', 'comp'],
        desc: 'Salas privadas para scrims y VOD review.'
    },
    rust_dedicated: {
        id: 'rust_dedicated', name: 'Rust 500x', icon: '🪵',
        baseCost: 12000, baseProd: 260, unlockAt: 12000, tier: 4,
        tags: ['rust', 'chaos'],
        desc: 'Wipe tóxico. Ingresos brutales.'
    },
    lol_customs: {
        id: 'lol_customs', name: 'LoL Tournament Realm', icon: '🐉',
        baseCost: 35000, baseProd: 520, unlockAt: 40000, tier: 4,
        tags: ['lol', 'comp'],
        desc: 'Custom 5v5 con torneos semanales.'
    },
    ark_cluster: {
        id: 'ark_cluster', name: 'ARK Cluster', icon: '🦖',
        baseCost: 130000, baseProd: 1400, unlockAt: 150000, tier: 5,
        tags: ['ark', 'cluster'],
        desc: 'Cluster multi-mapa con mods pesados.'
    },
    minecraft_net: {
        id: 'minecraft_net', name: 'Minecraft Network', icon: '⛏️',
        baseCost: 400000, baseProd: 3200, unlockAt: 500000, tier: 5,
        tags: ['mc', 'network'],
        desc: 'Lobby + minijuegos + survival economies.'
    },
    datacenter_prophet: {
        id: 'datacenter_prophet', name: 'Datacenter Prophet', icon: '🏢',
        baseCost: 1400000, baseProd: 9500, unlockAt: 2000000, tier: 6,
        tags: ['endgame', 'prophet'],
        desc: 'Fibra propia y refrigeración líquida.'
    },
    orbital_node: {
        id: 'orbital_node', name: 'Nodo Orbital 0-lag', icon: '🛰️',
        baseCost: 12000000, baseProd: 55000, unlockAt: 20000000, tier: 7,
        tags: ['endgame', 'prophet', 'mythic'],
        desc: 'Latencia sub-ms. Solo para emperadores del hosting.'
    }
};

// ─── STAFF ───
const ADMINS_CONFIG = {
    mod_junior: {
        id: 'mod_junior', name: 'Mod Junior', icon: '🛡️', cost: 500,
        type: 'autoclick', value: 1, unlockAt: 100,
        desc: '+1 auto-click/s · reinicia servers colgados.'
    },
    community_mgr: {
        id: 'community_mgr', name: 'Community Manager', icon: '📣', cost: 2500,
        type: 'click_mult', value: 0.5, unlockAt: 800,
        desc: '+50% valor de cada click manual.'
    },
    mod_senior: {
        id: 'mod_senior', name: 'Mod Senior', icon: '⚔️', cost: 5000,
        type: 'multiplier', value: 0.10, unlockAt: 2000,
        desc: '+10% producción global.'
    },
    event_host: {
        id: 'event_host', name: 'Host de Torneos', icon: '🏆', cost: 18000,
        type: 'crit', value: 0.05, unlockAt: 8000,
        desc: '+5% chance de click crítico (x8).'
    },
    sysadmin: {
        id: 'sysadmin', name: 'SysAdmin Linux', icon: '🐧', cost: 50000,
        type: 'multiplier', value: 0.25, unlockAt: 25000,
        desc: '+25% producción global.'
    },
    devops: {
        id: 'devops', name: 'DevOps SRE', icon: '📦', cost: 150000,
        type: 'offline', value: 0.10, unlockAt: 80000,
        desc: '+10% eficiencia offline (hasta 95%).'
    },
    anticheat_ai: {
        id: 'anticheat_ai', name: 'IA Anti-Cheat', icon: '🤖', cost: 500000,
        type: 'multiplier', value: 0.50, unlockAt: 250000,
        desc: '+50% producción global.'
    },
    prophet_bot_core: {
        id: 'prophet_bot_core', name: 'Núcleo Prophet v3', icon: '👑', cost: 5000000,
        type: 'multiplier', value: 1.00, unlockAt: 2000000,
        desc: '+100% producción (duplica todo).'
    }
};

// ─── RESEARCH (mejoras permanentes hasta prestigio) ───
const RESEARCH_CONFIG = {
    better_cooling: {
        id: 'better_cooling', name: 'Cooling líquido', icon: '❄️',
        cost: 2000, type: 'prod_mult', value: 0.08,
        desc: '+8% producción · disipa calor de racks.',
        requires: {}
    },
    fiber_upgrade: {
        id: 'fiber_upgrade', name: 'Uplink 10Gbps', icon: '🌐',
        cost: 15000, type: 'prod_mult', value: 0.12,
        desc: '+12% producción · menos packet loss.',
        requires: { better_cooling: true }
    },
    auto_scale: {
        id: 'auto_scale', name: 'Auto-scaling K8s', icon: '📈',
        cost: 80000, type: 'prod_mult', value: 0.18,
        desc: '+18% producción · escala con la demanda.',
        requires: { fiber_upgrade: true }
    },
    lucky_clicks: {
        id: 'lucky_clicks', name: 'Scripts de luck', icon: '🍀',
        cost: 12000, type: 'crit_chance', value: 0.04,
        desc: '+4% crit en clicks.',
        requires: {}
    },
    golden_reboot: {
        id: 'golden_reboot', name: 'Reboot dorado', icon: '✨',
        cost: 60000, type: 'crit_mult', value: 2,
        desc: 'Críticos x10 en vez de x8.',
        requires: { lucky_clicks: true }
    },
    offline_batteries: {
        id: 'offline_batteries', name: 'UPS industrial', icon: '🔋',
        cost: 40000, type: 'offline_eff', value: 0.05,
        desc: '+5% offline efficiency.',
        requires: {}
    }
};

// Sinergias: si tenés N de un tag, bonus
const SYNERGIES = [
    { id: 'cs2_stack', tag: 'cs2', min: 5, bonus: 0.15, label: 'Stack CS2 +15%' },
    { id: 'comp_scene', tag: 'comp', min: 4, bonus: 0.12, label: 'Escena competitiva +12%' },
    { id: 'chaos_net', tag: 'chaos', min: 3, bonus: 0.20, label: 'Caos controlado +20%' },
    { id: 'prophet_empire', tag: 'prophet', min: 2, bonus: 0.25, label: 'Imperio Prophet +25%' },
    { id: 'endgame_infra', tag: 'endgame', min: 2, bonus: 0.30, label: 'Infra endgame +30%' }
];

const MISSION_TEMPLATES = [
    { id: 'click_50', type: 'clicks', target: 50, reward: 200, label: 'Hacé 50 reinicios manuales' },
    { id: 'click_200', type: 'clicks', target: 200, reward: 900, label: 'Hacé 200 reinicios' },
    { id: 'earn_1k', type: 'earned', target: 1000, reward: 350, label: 'Generá 1.000 monedas' },
    { id: 'earn_10k', type: 'earned', target: 10000, reward: 2500, label: 'Generá 10.000 monedas' },
    { id: 'buy_3', type: 'buys', target: 3, reward: 400, label: 'Comprá 3 servidores' },
    { id: 'buy_10', type: 'buys', target: 10, reward: 2000, label: 'Comprá 10 servidores' },
    { id: 'crit_5', type: 'crits', target: 5, reward: 600, label: 'Conseguí 5 clicks críticos' },
    { id: 'own_5_types', type: 'types', target: 3, reward: 1500, label: 'Tené 3 tipos de server distintos' }
];

function defaultMeta() {
    return {
        research: {},
        stats: {
            totalClicks: 0,
            totalEarned: 0,
            totalBuys: 0,
            totalCrits: 0,
            totalSpent: 0,
            lifetimeEarned: 0,
            bestProduction: 0
        },
        missions: {
            dayKey: '',
            list: [],
            claimed: {}
        },
        boost: null, // { mult, expiresAt, label }
        chain: { lastBuyAt: 0, streak: 0 } // combo de compras rápidas
    };
}

function extractMeta(admins = {}) {
    if (admins && admins.__meta && typeof admins.__meta === 'object') {
        return {
            ...defaultMeta(),
            ...admins.__meta,
            research: admins.__meta.research || {},
            stats: { ...defaultMeta().stats, ...(admins.__meta.stats || {}) },
            missions: { ...defaultMeta().missions, ...(admins.__meta.missions || {}) }
        };
    }
    return defaultMeta();
}

function stripMeta(admins = {}) {
    const out = { ...admins };
    delete out.__meta;
    return out;
}

function withMeta(admins = {}, meta) {
    return { ...stripMeta(admins), __meta: meta };
}

function dayKey(ts = Date.now()) {
    const d = new Date(ts);
    return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

function rollDailyMissions(seedStr) {
    // Deterministic-ish shuffle from day key
    let h = 0;
    for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
    const pool = [...MISSION_TEMPLATES];
    for (let i = pool.length - 1; i > 0; i--) {
        h = (h * 1664525 + 1013904223) >>> 0;
        const j = h % (i + 1);
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3).map(m => ({
        id: m.id,
        type: m.type,
        target: m.target,
        reward: m.reward,
        label: m.label,
        progress: 0
    }));
}

function ensureMissions(meta) {
    const key = dayKey();
    if (meta.missions.dayKey !== key || !meta.missions.list?.length) {
        meta.missions = {
            dayKey: key,
            list: rollDailyMissions(key),
            claimed: {}
        };
    }
    return meta;
}

function tagCounts(servers = {}) {
    const counts = {};
    for (const [sid, n] of Object.entries(servers)) {
        if (sid.startsWith('__')) continue;
        const conf = SERVERS_CONFIG[sid];
        if (!conf || !n) continue;
        for (const tag of conf.tags || []) {
            counts[tag] = (counts[tag] || 0) + n;
        }
    }
    return counts;
}

function activeSynergies(servers = {}) {
    const tags = tagCounts(servers);
    return SYNERGIES.filter(s => (tags[s.tag] || 0) >= s.min).map(s => ({
        id: s.id,
        label: s.label,
        bonus: s.bonus
    }));
}

class TycoonEngine {
    static getConfigs() {
        return {
            servers: SERVERS_CONFIG,
            admins: ADMINS_CONFIG,
            research: RESEARCH_CONFIG,
            synergies: SYNERGIES
        };
    }

    static calculateServerCost(serverId, currentCount = 0) {
        const conf = SERVERS_CONFIG[serverId];
        if (!conf) return 0;
        return Math.floor(conf.baseCost * Math.pow(cfg.costRatio, currentCount));
    }

    static totalOwned(servers = {}) {
        let t = 0;
        for (const [k, v] of Object.entries(servers)) {
            if (k.startsWith('__')) continue;
            t += Number(v) || 0;
        }
        return t;
    }

    static isServerUnlocked(serverId, servers = {}, prestige = 0) {
        const conf = SERVERS_CONFIG[serverId];
        if (!conf) return false;
        if (conf.unlockAt <= 0) return true;
        // Soft unlock: monedas invertidas aprox = sum costs, usamos prod proxy: total owned * prestige boost
        // Mejor: unlock por monedas totales lifetime en meta — se pasa desde caller
        return true; // se valida en buy con lifetime
    }

    static calculateProduction(servers = {}, adminsRaw = {}, prestige = 0, meta = null) {
        const admins = stripMeta(adminsRaw);
        meta = meta || extractMeta(adminsRaw);

        let basePerSec = 0;
        for (const [sId, count] of Object.entries(servers)) {
            if (sId.startsWith('__')) continue;
            const conf = SERVERS_CONFIG[sId];
            if (conf && count > 0) basePerSec += conf.baseProd * count;
        }

        let multiplier = 1.0;
        let autoClicksPerSec = 0;
        let clickMult = 1.0;
        let critChance = 0.02; // base 2%
        let critMultiplier = 8;
        let offlineBonus = 0;

        for (const [aId, has] of Object.entries(admins)) {
            if (!has || aId.startsWith('__')) continue;
            const conf = ADMINS_CONFIG[aId];
            if (!conf) continue;
            switch (conf.type) {
                case 'multiplier': multiplier += conf.value; break;
                case 'autoclick': autoClicksPerSec += conf.value; break;
                case 'click_mult': clickMult += conf.value; break;
                case 'crit': critChance += conf.value; break;
                case 'offline': offlineBonus += conf.value; break;
            }
        }

        // Research
        for (const [rId, has] of Object.entries(meta.research || {})) {
            if (!has) continue;
            const conf = RESEARCH_CONFIG[rId];
            if (!conf) continue;
            if (conf.type === 'prod_mult') multiplier += conf.value;
            if (conf.type === 'crit_chance') critChance += conf.value;
            if (conf.type === 'crit_mult') critMultiplier = 8 + conf.value; // 10
            if (conf.type === 'offline_eff') offlineBonus += conf.value;
        }

        // Prestige
        if (prestige > 0) {
            multiplier += prestige * cfg.prestigeMultiplierPerLevel;
        }

        // Synergies
        const synergies = activeSynergies(servers);
        for (const s of synergies) multiplier += s.bonus;

        // Timed boost
        if (meta.boost && meta.boost.expiresAt > Date.now()) {
            multiplier *= (meta.boost.mult || 1);
        }

        const productionPerSec = basePerSec * multiplier;
        const offlineEff = Math.min(0.95, cfg.offlineEfficiency + offlineBonus);

        return {
            productionPerSec: Math.round(productionPerSec * 10) / 10,
            autoClicksPerSec,
            multiplier: Math.round(multiplier * 1000) / 1000,
            clickMult,
            critChance: Math.min(0.35, critChance),
            critMultiplier,
            offlineEff,
            synergies,
            basePerSec
        };
    }

    static _getSave(userId) {
        const save = stmts.getTycoonSave(userId);
        const meta = ensureMissions(extractMeta(save.admins));
        save.meta = meta;
        save.adminsClean = stripMeta(save.admins);
        return save;
    }

    static _persist(userId, save) {
        const admins = withMeta(save.adminsClean || stripMeta(save.admins), save.meta);
        stmts.saveTycoonSave(
            userId,
            save.local_coins,
            save.servers,
            admins,
            save.prestige || 0,
            save.last_active || Date.now()
        );
    }

    static loadUserGameState(userId) {
        const save = this._getSave(userId);
        const now = Date.now();
        const lastActive = save.last_active || now;
        const elapsedSeconds = Math.max(0, Math.floor((now - lastActive) / 1000));

        const rates = this.calculateProduction(save.servers, save.admins, save.prestige, save.meta);

        let offlineEarned = 0;
        let offlineSecondsApplied = 0;
        if (elapsedSeconds >= 10 && rates.productionPerSec > 0) {
            const cappedSeconds = Math.min(elapsedSeconds, cfg.offlineMaxHours * 3600);
            offlineSecondsApplied = cappedSeconds;
            offlineEarned = Math.floor(cappedSeconds * rates.productionPerSec * rates.offlineEff);
            save.local_coins += offlineEarned;
            save.meta.stats.totalEarned += offlineEarned;
            save.meta.stats.lifetimeEarned += offlineEarned;
            this._bumpMissions(save.meta, 'earned', offlineEarned);
        }

        // Random temporary event (10% al volver si prod > 10)
        if (!save.meta.boost && rates.productionPerSec >= 10 && Math.random() < 0.12) {
            save.meta.boost = {
                mult: 1.5,
                expiresAt: now + 3 * 60 * 1000,
                label: 'Torneo flash +50% (3 min)'
            };
        }
        if (save.meta.boost && save.meta.boost.expiresAt <= now) {
            save.meta.boost = null;
        }

        save.last_active = now;
        this._persist(userId, save);

        const rates2 = this.calculateProduction(save.servers, save.admins, save.prestige, save.meta);

        return {
            userId,
            coins: Math.floor(save.local_coins),
            servers: save.servers,
            admins: stripMeta(save.admins),
            research: save.meta.research,
            prestige: save.prestige || 0,
            stats: save.meta.stats,
            missions: save.meta.missions,
            boost: save.meta.boost,
            productionPerSec: rates2.productionPerSec,
            autoClicksPerSec: rates2.autoClicksPerSec,
            multiplier: rates2.multiplier,
            critChance: rates2.critChance,
            critMultiplier: rates2.critMultiplier,
            offlineEff: rates2.offlineEff,
            synergies: rates2.synergies,
            offlineEarned,
            offlineSeconds: offlineSecondsApplied,
            unlocks: this._computeUnlocks(save),
            configs: this.getConfigs()
        };
    }

    static _computeUnlocks(save) {
        const stats = save.meta?.stats || {};
        const lifetime = Number(stats.lifetimeEarned) || 0;
        const spent = Number(stats.totalSpent) || 0;
        const coins = Math.floor(Number(save.local_coins) || 0);
        const prestige = save.prestige || 0;
        // Progreso = ganado + gastado + liquidez + prestigio (inyectar monedas también desbloquea)
        const unlockPower = lifetime + spent + coins + prestige * 50000;

        const servers = {};
        for (const conf of Object.values(SERVERS_CONFIG)) {
            servers[conf.id] = unlockPower >= conf.unlockAt || conf.unlockAt === 0;
        }
        const admins = {};
        for (const conf of Object.values(ADMINS_CONFIG)) {
            admins[conf.id] = unlockPower >= (conf.unlockAt || 0);
        }
        return { servers, admins, unlockPower };
    }

    static _bumpMissions(meta, type, amount = 1) {
        ensureMissions(meta);
        for (const m of meta.missions.list) {
            if (m.type === type) {
                m.progress = Math.min(m.target, (m.progress || 0) + amount);
            }
            if (type === 'types' && m.type === 'types') {
                // handled separately
            }
        }
    }

    static _syncTypeMission(meta, servers) {
        ensureMissions(meta);
        const types = Object.entries(servers).filter(([k, v]) => !k.startsWith('__') && v > 0).length;
        for (const m of meta.missions.list) {
            if (m.type === 'types') m.progress = Math.min(m.target, types);
        }
    }

    static processClick(userId, clientClickCount = 1) {
        const count = Math.min(Math.max(1, Math.floor(clientClickCount)), 15);
        const save = this._getSave(userId);
        const rates = this.calculateProduction(save.servers, save.admins, save.prestige, save.meta);

        let totalGained = 0;
        let crits = 0;
        const baseClick = Math.max(1, Math.floor(1 * rates.multiplier * rates.clickMult));

        for (let i = 0; i < count; i++) {
            let gained = baseClick;
            if (Math.random() < rates.critChance) {
                gained = Math.floor(baseClick * rates.critMultiplier);
                crits++;
            }
            totalGained += gained;
        }

        save.local_coins += totalGained;
        save.meta.stats.totalClicks += count;
        save.meta.stats.totalCrits += crits;
        save.meta.stats.totalEarned += totalGained;
        save.meta.stats.lifetimeEarned += totalGained;
        this._bumpMissions(save.meta, 'clicks', count);
        this._bumpMissions(save.meta, 'earned', totalGained);
        if (crits) this._bumpMissions(save.meta, 'crits', crits);

        save.last_active = Date.now();
        this._persist(userId, save);

        return {
            success: true,
            coins: Math.floor(save.local_coins),
            gained: totalGained,
            clickValue: baseClick,
            crits,
            critMultiplier: rates.critMultiplier
        };
    }

    static buyServer(userId, serverId) {
        const conf = SERVERS_CONFIG[serverId];
        if (!conf) return { success: false, error: 'Servidor no válido' };

        const save = this._getSave(userId);
        const unlocks = this._computeUnlocks(save);
        if (!unlocks.servers[serverId]) {
            return {
                success: false,
                error: `Bloqueado · necesitás más progreso (unlock ${conf.unlockAt})`,
                unlockAt: conf.unlockAt
            };
        }

        const currentCount = save.servers[serverId] || 0;
        const cost = this.calculateServerCost(serverId, currentCount);
        if (save.local_coins < cost) {
            return { success: false, error: 'Monedas insuficientes', required: cost };
        }

        save.local_coins -= cost;
        save.servers[serverId] = currentCount + 1;
        save.meta.stats.totalBuys += 1;
        save.meta.stats.totalSpent = (save.meta.stats.totalSpent || 0) + cost;
        this._bumpMissions(save.meta, 'buys', 1);
        this._syncTypeMission(save.meta, save.servers);

        // Combo de compras (bonus monedas si comprás seguido)
        const now = Date.now();
        const chain = save.meta.chain || { lastBuyAt: 0, streak: 0 };
        if (now - (chain.lastBuyAt || 0) < 8000) chain.streak = (chain.streak || 0) + 1;
        else chain.streak = 1;
        chain.lastBuyAt = now;
        save.meta.chain = chain;
        let chainBonus = 0;
        if (chain.streak >= 3) {
            chainBonus = Math.floor(cost * 0.05 * Math.min(5, chain.streak - 2));
            save.local_coins += chainBonus;
            save.meta.stats.totalEarned += chainBonus;
            save.meta.stats.lifetimeEarned += chainBonus;
        }

        save.last_active = now;
        this._persist(userId, save);

        const rates = this.calculateProduction(save.servers, save.admins, save.prestige, save.meta);
        if (rates.productionPerSec > (save.meta.stats.bestProduction || 0)) {
            save.meta.stats.bestProduction = rates.productionPerSec;
            this._persist(userId, save);
        }
        return {
            success: true,
            serverId,
            count: save.servers[serverId],
            coins: Math.floor(save.local_coins),
            nextCost: this.calculateServerCost(serverId, save.servers[serverId]),
            productionPerSec: rates.productionPerSec,
            autoClicksPerSec: rates.autoClicksPerSec,
            multiplier: rates.multiplier,
            synergies: rates.synergies,
            unlocks: this._computeUnlocks(save),
            chainStreak: chain.streak,
            chainBonus
        };
    }

    static buyAdmin(userId, adminId) {
        const conf = ADMINS_CONFIG[adminId];
        if (!conf) return { success: false, error: 'Admin no válido' };

        const save = this._getSave(userId);
        const unlocks = this._computeUnlocks(save);
        if (!unlocks.admins[adminId]) {
            return { success: false, error: `Staff bloqueado · progresá más (unlock ${conf.unlockAt})` };
        }
        if (save.adminsClean[adminId] || stripMeta(save.admins)[adminId]) {
            return { success: false, error: 'Ya contrataste a este Staff' };
        }
        if (save.local_coins < conf.cost) {
            return { success: false, error: 'Monedas insuficientes', required: conf.cost };
        }

        save.local_coins -= conf.cost;
        save.adminsClean[adminId] = true;
        save.meta.stats.totalSpent = (save.meta.stats.totalSpent || 0) + conf.cost;
        save.admins = withMeta(save.adminsClean, save.meta);
        save.last_active = Date.now();
        this._persist(userId, save);

        const rates = this.calculateProduction(save.servers, save.admins, save.prestige, save.meta);
        return {
            success: true,
            adminId,
            admins: stripMeta(save.admins),
            coins: Math.floor(save.local_coins),
            productionPerSec: rates.productionPerSec,
            autoClicksPerSec: rates.autoClicksPerSec,
            multiplier: rates.multiplier,
            critChance: rates.critChance
        };
    }

    static buyResearch(userId, researchId) {
        const conf = RESEARCH_CONFIG[researchId];
        if (!conf) return { success: false, error: 'Research inválido' };

        const save = this._getSave(userId);
        if (save.meta.research[researchId]) {
            return { success: false, error: 'Ya investigado' };
        }
        for (const [reqId, need] of Object.entries(conf.requires || {})) {
            if (need && !save.meta.research[reqId]) {
                return { success: false, error: `Requiere: ${RESEARCH_CONFIG[reqId]?.name || reqId}` };
            }
        }
        if (save.local_coins < conf.cost) {
            return { success: false, error: 'Monedas insuficientes', required: conf.cost };
        }

        save.local_coins -= conf.cost;
        save.meta.research[researchId] = true;
        save.meta.stats.totalSpent = (save.meta.stats.totalSpent || 0) + conf.cost;
        save.last_active = Date.now();
        this._persist(userId, save);

        const rates = this.calculateProduction(save.servers, save.admins, save.prestige, save.meta);
        return {
            success: true,
            researchId,
            research: save.meta.research,
            coins: Math.floor(save.local_coins),
            productionPerSec: rates.productionPerSec,
            multiplier: rates.multiplier,
            critChance: rates.critChance,
            critMultiplier: rates.critMultiplier
        };
    }

    static claimMission(userId, missionId) {
        const save = this._getSave(userId);
        ensureMissions(save.meta);
        const m = save.meta.missions.list.find(x => x.id === missionId);
        if (!m) return { success: false, error: 'Misión no encontrada' };
        if (save.meta.missions.claimed[missionId]) {
            return { success: false, error: 'Ya reclamada' };
        }
        if ((m.progress || 0) < m.target) {
            return { success: false, error: 'Misión incompleta' };
        }

        save.meta.missions.claimed[missionId] = true;
        save.local_coins += m.reward;
        save.meta.stats.totalEarned += m.reward;
        save.meta.stats.lifetimeEarned += m.reward;
        save.last_active = Date.now();
        this._persist(userId, save);

        return {
            success: true,
            missionId,
            reward: m.reward,
            coins: Math.floor(save.local_coins),
            missions: save.meta.missions
        };
    }

    static syncPassiveGains(userId, addedCoins) {
        const save = this._getSave(userId);
        const amt = Math.max(0, Math.floor(Number(addedCoins) || 0));
        if (amt <= 0) return { success: true, coins: Math.floor(save.local_coins) };

        const now = Date.now();
        const elapsedSec = Math.max(1, Math.floor((now - (save.last_active || now)) / 1000));
        const rates = this.calculateProduction(save.servers, save.admins, save.prestige, save.meta);
        const clickValue = Math.max(1, Math.floor(1 * rates.multiplier * rates.clickMult));
        const maxReasonable = Math.ceil(
            (rates.productionPerSec + rates.autoClicksPerSec * clickValue) * elapsedSec * 2.5 + 150
        );
        const capped = Math.min(amt, maxReasonable, cfg.maxSyncCoinsPerTick);

        save.local_coins += capped;
        save.meta.stats.totalEarned += capped;
        save.meta.stats.lifetimeEarned += capped;
        this._bumpMissions(save.meta, 'earned', capped);
        save.last_active = now;
        this._persist(userId, save);
        return { success: true, coins: Math.floor(save.local_coins), applied: capped };
    }

    static doPrestige(userId) {
        const save = this._getSave(userId);
        const rates = this.calculateProduction(save.servers, save.admins, save.prestige, save.meta);

        if (rates.productionPerSec < cfg.prestigeMinProduction) {
            return {
                success: false,
                error: `Necesitás al menos ${cfg.prestigeMinProduction}/s para prestigiar`,
                productionPerSec: rates.productionPerSec
            };
        }

        const newPrestige = (save.prestige || 0) + 1;
        // Keep lifetime stats + research? Classic prestige resets research
        const lifetime = save.meta.stats.lifetimeEarned || 0;
        const totalClicks = save.meta.stats.totalClicks || 0;

        save.local_coins = 15 * newPrestige; // soft start
        save.servers = {};
        save.adminsClean = {};
        save.meta = defaultMeta();
        save.meta.stats.lifetimeEarned = lifetime;
        save.meta.stats.totalClicks = totalClicks;
        save.prestige = newPrestige;
        save.last_active = Date.now();
        this._persist(userId, save);

        const rates2 = this.calculateProduction({}, {}, newPrestige, save.meta);
        return {
            success: true,
            prestige: newPrestige,
            coins: Math.floor(save.local_coins),
            servers: {},
            admins: {},
            research: {},
            productionPerSec: rates2.productionPerSec,
            autoClicksPerSec: rates2.autoClicksPerSec,
            multiplierBonus: `+${Math.round(newPrestige * cfg.prestigeMultiplierPerLevel * 100)}%`,
            unlocks: this._computeUnlocks(save)
        };
    }
}

module.exports = TycoonEngine;
