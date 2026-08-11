const crypto = require('crypto');
const EconomyBridge = require('../common/economyBridge');
const cfg = require('../common/gamesConfig').cases || {};

const RARITY_CONFIG = {
    common: { name: 'Común', color: '#B0C3D9', weight: 79.0, grade: 1 },
    uncommon: { name: 'Poco Común', color: '#5E98D9', weight: 16.0, grade: 2 },
    rare: { name: 'Raro', color: '#4B69CD', weight: 3.5, grade: 3 },
    epic: { name: 'Épico', color: '#D32CE6', weight: 1.2, grade: 4 },
    legendary: { name: '★ Legendario', color: '#FFD700', weight: 0.3, grade: 5 }
};

const CASES_CONFIG = {
    case_prophet_starter: {
        id: 'case_prophet_starter',
        name: 'Caja Comunitaria Prophet',
        icon: '📦',
        cost: 250,
        desc: 'Caja de inicio. Pity épico cada 25, legendario cada 80.',
        pityMul: 1,
        items: {
            common: [
                { id: 'p250_arena', name: 'P250 | Duna de Arena', icon: '🔫', valueCoins: 80 },
                { id: 'glock_oxido', name: 'Glock-18 | Óxido Puro', icon: '🔫', valueCoins: 100 },
                { id: 'badge_novato', name: 'Título: Novato Prophet', icon: '🏷️', valueCoins: 120 },
                { id: 'coins_refund', name: 'Reembolso de 🪙 150', icon: '💰', valueCoins: 150, cash: true }
            ],
            uncommon: [
                { id: 'ak_safari', name: 'AK-47 | Safari Mesh', icon: '🔫', valueCoins: 350 },
                { id: 'm4_flashback', name: 'M4A1-S | Flashback', icon: '🔫', valueCoins: 400 },
                { id: 'badge_tirador', name: 'Badge: Tirador Hábil', icon: '🎯', valueCoins: 500 }
            ],
            rare: [
                { id: 'awp_sun', name: 'AWP | Sun in Leo', icon: '⚡', valueCoins: 1500 },
                { id: 'deagle_mecha', name: 'Desert Eagle | Mecha', icon: '🔫', valueCoins: 1800 },
                { id: 'vip_7d', name: 'Rol VIP (7 Días)', icon: '💎', valueCoins: 2500 }
            ],
            epic: [
                { id: 'm4_neanoir', name: 'M4A4 | Neo-Noir', icon: '🌸', valueCoins: 6000 },
                { id: 'ak_vulcan', name: 'AK-47 | Vulcan', icon: '🔥', valueCoins: 8500 },
                { id: 'vip_30d', name: 'Rol VIP (30 Días)', icon: '👑', valueCoins: 10000 }
            ],
            legendary: [
                { id: 'knife_gut', name: '★ Cuchillo Gut Safari', icon: '🔪', valueCoins: 35000 },
                { id: 'role_leyenda', name: 'Rol: Leyenda Prophet', icon: '👑', valueCoins: 50000 },
                { id: 'pozo_oro', name: '🪙 Pozo de Oro: 50,000', icon: '🏆', valueCoins: 50000, cash: true }
            ]
        }
    },
    case_elite_cs: {
        id: 'case_elite_cs',
        name: 'Caja Élite CS2 & Torneos',
        icon: '🎖️',
        cost: 1000,
        desc: 'Caja competitiva. Mejores odds de raro+.',
        pityMul: 0.85,
        items: {
            common: [
                { id: 'usp_cyrex', name: 'USP-S | Cyrex', icon: '🔫', valueCoins: 400 },
                { id: 'mp9_starlight', name: 'MP9 | Starlight', icon: '🔫', valueCoins: 450 },
                { id: 'coins_600', name: 'Bolsa de 🪙 600', icon: '💰', valueCoins: 600, cash: true }
            ],
            uncommon: [
                { id: 'ak_redline', name: 'AK-47 | Redline', icon: '🔴', valueCoins: 1400 },
                { id: 'm4_dragon', name: 'M4A4 | Dragon King', icon: '🐉', valueCoins: 1600 },
                { id: 'badge_headshot', name: 'Badge: Headshot King', icon: '🎯', valueCoins: 2000 }
            ],
            rare: [
                { id: 'awp_hyper', name: 'AWP | Hyper Beast', icon: '👹', valueCoins: 5000 },
                { id: 'deagle_print', name: 'Desert Eagle | Printstream', icon: '✨', valueCoins: 6500 }
            ],
            epic: [
                { id: 'ak_fireserpent', name: 'AK-47 | Fire Serpent', icon: '🐍', valueCoins: 25000 },
                { id: 'm4_howl', name: 'M4A4 | Howl Replica', icon: '🐺', valueCoins: 30000 }
            ],
            legendary: [
                { id: 'knife_butterfly', name: '★ Butterfly Doppler', icon: '🦋', valueCoins: 150000 },
                { id: 'pozo_mitico', name: '🪙 Pozo Mítico: 150,000', icon: '🏆', valueCoins: 150000, cash: true }
            ]
        }
    },
    case_high_roller: {
        id: 'case_high_roller',
        name: 'Caja Clandestina High-Roller',
        icon: '💎',
        cost: 5000,
        desc: 'High risk / high reward. Pity más agresivo.',
        pityMul: 0.7,
        items: {
            common: [
                { id: 'awp_asiimov', name: 'AWP | Asiimov', icon: '⚡', valueCoins: 2500 },
                { id: 'ak_bloodsport', name: 'AK-47 | Bloodsport', icon: '🩸', valueCoins: 2800 },
                { id: 'coins_3000', name: 'Cofre de 🪙 3,500', icon: '💰', valueCoins: 3500, cash: true }
            ],
            uncommon: [
                { id: 'deagle_fennec', name: 'Desert Eagle | Fennec Fox', icon: '🦊', valueCoins: 7500 },
                { id: 'm4_bluephos', name: 'M4A1-S | Blue Phosphor', icon: '💎', valueCoins: 9000 }
            ],
            rare: [
                { id: 'ak_gold', name: 'AK-47 | Gold Arabesque', icon: '🥇', valueCoins: 25000 },
                { id: 'awp_gungnir', name: 'AWP | Gungnir Replica', icon: '🔱', valueCoins: 35000 }
            ],
            epic: [
                { id: 'gloves_vice', name: '★ Guantes Sport Vice', icon: '🧤', valueCoins: 100000 },
                { id: 'role_patron', name: 'Rol: Patrón del Server', icon: '🎩', valueCoins: 120000 }
            ],
            legendary: [
                { id: 'knife_karambit', name: '★ Karambit Blue Gem #1', icon: '💎', valueCoins: 500000 },
                { id: 'pozo_diamante', name: '🪙 Pozo Diamante: 500,000', icon: '👑', valueCoins: 500000, cash: true }
            ]
        }
    },
    case_night_ops: {
        id: 'case_night_ops',
        name: 'Caja Night Ops',
        icon: '🌙',
        cost: 500,
        desc: 'Caja intermedia con buen EV y pity estándar.',
        pityMul: 0.95,
        items: {
            common: [
                { id: 'mp7_neon', name: 'MP7 | Neon Ply', icon: '🔫', valueCoins: 180 },
                { id: 'coins_280', name: 'Bolsa 🪙 280', icon: '💰', valueCoins: 280, cash: true },
                { id: 'badge_night', name: 'Badge: Night Owl', icon: '🦉', valueCoins: 220 }
            ],
            uncommon: [
                { id: 'ak_slate', name: 'AK-47 | Slate', icon: '⬛', valueCoins: 700 },
                { id: 'awp_capillary', name: 'AWP | Capillary', icon: '🩸', valueCoins: 850 }
            ],
            rare: [
                { id: 'm4_print', name: 'M4A1-S | Printstream', icon: '✨', valueCoins: 3200 },
                { id: 'knife_navaja', name: 'Navaja | Urban Masked', icon: '🗡️', valueCoins: 4000 }
            ],
            epic: [
                { id: 'gloves_moon', name: 'Guantes Moonrise', icon: '🌙', valueCoins: 14000 },
                { id: 'role_ops', name: 'Rol: Operativo Nocturno', icon: '🕶️', valueCoins: 16000 }
            ],
            legendary: [
                { id: 'knife_talon', name: '★ Talon Doppler', icon: '🦅', valueCoins: 90000 },
                { id: 'pozo_night', name: '🪙 Pozo Nocturno: 80,000', icon: '🏆', valueCoins: 80000, cash: true }
            ]
        }
    }
};

// Pity + historial en memoria por proceso
const pityByUser = new Map(); // userId -> { sinceEpic, sinceLegendary, history: [] }

function getPity(userId) {
    if (!pityByUser.has(userId)) {
        pityByUser.set(userId, { sinceEpic: 0, sinceLegendary: 0, history: [], opens: 0 });
    }
    return pityByUser.get(userId);
}

function rollRarity(userId, caseConf) {
    const pity = getPity(userId);
    const pityEpic = Math.floor((cfg.pityEpicAt || 25) * (caseConf.pityMul || 1));
    const pityLeg = Math.floor((cfg.pityLegendaryAt || 80) * (caseConf.pityMul || 1));

    // Soft pity: sube chance de epic/leg cerca del umbral
    let wLeg = RARITY_CONFIG.legendary.weight;
    let wEpic = RARITY_CONFIG.epic.weight;
    let wRare = RARITY_CONFIG.rare.weight;
    let wUnc = RARITY_CONFIG.uncommon.weight;
    let wCom = RARITY_CONFIG.common.weight;

    if (pity.sinceLegendary >= pityLeg - 10) {
        wLeg += (pity.sinceLegendary - (pityLeg - 10)) * 0.8;
    }
    if (pity.sinceEpic >= pityEpic - 5) {
        wEpic += (pity.sinceEpic - (pityEpic - 5)) * 1.5;
    }

    // Hard pity
    if (pity.sinceLegendary >= pityLeg) return 'legendary';
    if (pity.sinceEpic >= pityEpic) return 'epic';

    const total = wLeg + wEpic + wRare + wUnc + wCom;
    const r = (crypto.randomBytes(4).readUInt32BE(0) / Math.pow(2, 32)) * total;
    let acc = 0;
    const order = [
        ['legendary', wLeg],
        ['epic', wEpic],
        ['rare', wRare],
        ['uncommon', wUnc],
        ['common', wCom]
    ];
    for (const [key, w] of order) {
        acc += w;
        if (r < acc) return key;
    }
    return 'common';
}

function pickItem(pool) {
    return pool[crypto.randomBytes(2).readUInt16BE(0) % pool.length];
}

function isCashItem(item) {
    return item.cash === true ||
        item.id.startsWith('coins_') ||
        item.id.startsWith('pozo_');
}

class CasesEngine {
    static getCasesList() {
        return Object.values(CASES_CONFIG).map(c => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            cost: c.cost,
            desc: c.desc
        }));
    }

    static getCaseDetails(caseId) {
        const c = CASES_CONFIG[caseId];
        if (!c) return null;
        return {
            ...c,
            rarities: RARITY_CONFIG,
            pity: {
                epicAt: Math.floor((cfg.pityEpicAt || 25) * (c.pityMul || 1)),
                legendaryAt: Math.floor((cfg.pityLegendaryAt || 80) * (c.pityMul || 1))
            }
        };
    }

    static getPityState(userId) {
        const p = getPity(userId);
        return {
            sinceEpic: p.sinceEpic,
            sinceLegendary: p.sinceLegendary,
            opens: p.opens,
            history: p.history.slice(0, cfg.historySize || 20),
            pityEpicAt: cfg.pityEpicAt || 25,
            pityLegendaryAt: cfg.pityLegendaryAt || 80
        };
    }

    /**
     * Abre una caja: pity, soft-sell de skins, historial, carrete visual.
     */
    static openCase(userId, caseId) {
        const caseConf = CASES_CONFIG[caseId];
        if (!caseConf) {
            return { success: false, error: 'Caja no encontrada' };
        }

        const deduct = EconomyBridge.deductCoins(
            userId, caseConf.cost, 'casino_cases', 'open_case', `Apertura de ${caseConf.name}`
        );
        if (!deduct.success) {
            return { success: false, error: deduct.error || 'Saldo insuficiente para abrir esta caja' };
        }

        const pity = getPity(userId);
        const winningRarity = rollRarity(userId, caseConf);
        const pool = caseConf.items[winningRarity] || caseConf.items.common;
        const winningItem = pickItem(pool);

        // Actualizar pity
        pity.opens += 1;
        if (winningRarity === 'legendary') {
            pity.sinceLegendary = 0;
            pity.sinceEpic = 0;
        } else if (winningRarity === 'epic') {
            pity.sinceEpic = 0;
            pity.sinceLegendary += 1;
        } else {
            pity.sinceEpic += 1;
            pity.sinceLegendary += 1;
        }

        // Economía: cash items = full value; skins = soft sell rate
        let finalBalance = deduct.balance;
        let credited = 0;
        const sellRate = cfg.softSellRate ?? 0.35;
        if (isCashItem(winningItem)) {
            credited = winningItem.valueCoins;
            const add = EconomyBridge.addCoins(
                userId, credited, 'casino_cases', 'item_reward', `Premio ${winningItem.name}`
            );
            finalBalance = add.balance;
        } else if (winningItem.valueCoins > 0) {
            credited = Math.floor(winningItem.valueCoins * sellRate);
            if (credited > 0) {
                const add = EconomyBridge.addCoins(
                    userId, credited, 'casino_cases', 'skin_sell',
                    `Venta soft ${winningItem.name} (${Math.round(sellRate * 100)}%)`
                );
                finalBalance = add.balance;
            }
        }

        // Historial
        const histEntry = {
            ts: Date.now(),
            caseId,
            caseName: caseConf.name,
            item: winningItem.name,
            rarity: winningRarity,
            credited,
            icon: winningItem.icon
        };
        pity.history.unshift(histEntry);
        if (pity.history.length > (cfg.historySize || 20)) pity.history.length = cfg.historySize || 20;

        // Carrete visual (ganador en índice 35)
        const reel = [];
        for (let i = 0; i < 45; i++) {
            if (i === 35) {
                reel.push({
                    ...winningItem,
                    rarity: winningRarity,
                    rarityInfo: RARITY_CONFIG[winningRarity]
                });
            } else {
                const randR = Math.random() * 100;
                let rKey = 'common';
                if (randR < 1) rKey = 'legendary';
                else if (randR < 4) rKey = 'epic';
                else if (randR < 15) rKey = 'rare';
                else if (randR < 35) rKey = 'uncommon';
                const rPool = caseConf.items[rKey] || caseConf.items.common;
                const randomItem = rPool[Math.floor(Math.random() * rPool.length)];
                reel.push({
                    ...randomItem,
                    rarity: rKey,
                    rarityInfo: RARITY_CONFIG[rKey]
                });
            }
        }

        const wasPity =
            (winningRarity === 'epic' && pity.sinceEpic === 0 && histEntry) ||
            (winningRarity === 'legendary');

        return {
            success: true,
            caseId,
            caseName: caseConf.name,
            winningIndex: 35,
            winningItem: {
                ...winningItem,
                rarity: winningRarity,
                rarityInfo: RARITY_CONFIG[winningRarity],
                credited,
                softSold: !isCashItem(winningItem)
            },
            reel,
            balance: finalBalance,
            pity: this.getPityState(userId),
            pityTriggered: winningRarity === 'legendary' ||
                (winningRarity === 'epic' && pity.sinceEpic === 0)
        };
    }
}

module.exports = CasesEngine;
