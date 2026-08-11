const crypto = require('crypto');
const EconomyBridge = require('../common/economyBridge');

const RARITY_CONFIG = {
    common: { name: 'Común', color: '#B0C3D9', prob: 79.0, grade: 1 },
    uncommon: { name: 'Poco Común', color: '#5E98D9', prob: 16.0, grade: 2 },
    rare: { name: 'Raro', color: '#4B69CD', prob: 3.0, grade: 3 },
    epic: { name: 'Épico', color: '#D32CE6', prob: 0.6, grade: 4 },
    legendary: { name: '★ Legendario', color: '#FFD700', prob: 0.25, grade: 5 } // remaining 1.15% goes to common
};

const CASES_CONFIG = {
    case_prophet_starter: {
        id: 'case_prophet_starter',
        name: 'Caja Comunitaria Prophet',
        icon: '📦',
        cost: 250,
        desc: 'Caja de inicio para probar suerte con skins y títulos.',
        items: {
            common: [
                { id: 'p250_arena', name: 'P250 | Duna de Arena', icon: '🔫', valueCoins: 80 },
                { id: 'glock_oxido', name: 'Glock-18 | Óxido Puro', icon: '🔫', valueCoins: 100 },
                { id: 'badge_novato', name: 'Título: Novato Prophet', icon: '🏷️', valueCoins: 120 },
                { id: 'coins_refund', name: 'Reembolso de 🪙 150', icon: '💰', valueCoins: 150 }
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
                { id: 'pozo_oro', name: '🪙 Pozo de Oro: 50,000 Monedas', icon: '🏆', valueCoins: 50000 }
            ]
        }
    },
    case_elite_cs: {
        id: 'case_elite_cs',
        name: 'Caja Élite CS2 & Torneos',
        icon: '🎖️',
        cost: 1000,
        desc: 'Caja competitiva con skins de alta gama y roles élite.',
        items: {
            common: [
                { id: 'usp_cyrex', name: 'USP-S | Cyrex', icon: '🔫', valueCoins: 400 },
                { id: 'mp9_starlight', name: 'MP9 | Starlight', icon: '🔫', valueCoins: 450 },
                { id: 'coins_600', name: 'Bolsa de 🪙 600 Monedas', icon: '💰', valueCoins: 600 }
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
                { id: 'knife_butterfly', name: '★ Cuchillo Butterfly Doppler', icon: '🦋', valueCoins: 150000 },
                { id: 'pozo_mitico', name: '🪙 Pozo Mítico: 150,000 Monedas', icon: '🏆', valueCoins: 150000 }
            ]
        }
    },
    case_high_roller: {
        id: 'case_high_roller',
        name: 'Caja Clandestina High-Roller',
        icon: '💎',
        cost: 5000,
        desc: 'Exclusiva para grandes apostadores. Premios legendarios.',
        items: {
            common: [
                { id: 'awp_asiimov', name: 'AWP | Asiimov', icon: '⚡', valueCoins: 2500 },
                { id: 'ak_bloodsport', name: 'AK-47 | Bloodsport', icon: '🩸', valueCoins: 2800 },
                { id: 'coins_3000', name: 'Cofre de 🪙 3,500 Monedas', icon: '💰', valueCoins: 3500 }
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
                { id: 'gloves_vice', name: '★ Guantes Sport Vice (Pink)', icon: '🧤', valueCoins: 100000 },
                { id: 'role_patron', name: 'Rol: Patrón del Server', icon: '🎩', valueCoins: 120000 }
            ],
            legendary: [
                { id: 'knife_karambit', name: '★ Karambit Case Hardened #1 Blue Gem', icon: '💎', valueCoins: 500000 },
                { id: 'pozo_diamante', name: '🪙 Pozo Diamante: 500,000 Monedas', icon: '👑', valueCoins: 500000 }
            ]
        }
    }
};

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
        return CASES_CONFIG[caseId] || null;
    }

    /**
     * Abre una caja generando el carrete completo de 40 items con desaceleración
     */
    static openCase(userId, caseId) {
        const caseConf = CASES_CONFIG[caseId];
        if (!caseConf) {
            return { success: false, error: 'Caja no encontrada' };
        }

        // Descontar costo de la caja
        const deduct = EconomyBridge.deductCoins(userId, caseConf.cost, 'casino_cases', 'open_case', `Apertura de ${caseConf.name}`);
        if (!deduct.success) {
            return { success: false, error: deduct.error || 'Saldo insuficiente para abrir esta caja' };
        }

        // Determinar rareza ganadora con algoritmo ponderado
        const randFloat = (crypto.randomBytes(4).readUInt32BE(0) / Math.pow(2, 32)) * 100;
        let winningRarity = 'common';

        if (randFloat < 0.25) {
            winningRarity = 'legendary';
        } else if (randFloat < 0.25 + 0.60) {
            winningRarity = 'epic';
        } else if (randFloat < 0.25 + 0.60 + 3.00) {
            winningRarity = 'rare';
        } else if (randFloat < 0.25 + 0.60 + 3.00 + 16.00) {
            winningRarity = 'uncommon';
        } else {
            winningRarity = 'common';
        }

        // Seleccionar ítem ganador
        const pool = caseConf.items[winningRarity];
        const winningItem = pool[crypto.randomBytes(2).readUInt16BE(0) % pool.length];

        // Si el ítem otorga monedas directas, acreditarlas
        let finalBalance = deduct.balance;
        if (winningItem.valueCoins && (winningItem.id.startsWith('coins_') || winningItem.id.startsWith('pozo_'))) {
            const add = EconomyBridge.addCoins(userId, winningItem.valueCoins, 'casino_cases', 'item_reward', `Premio ${winningItem.name}`);
            finalBalance = add.balance;
        }

        // Generar un carrete de 45 ítems con el ganador en el índice 35
        const reel = [];
        const allRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        for (let i = 0; i < 45; i++) {
            if (i === 35) {
                reel.push({
                    ...winningItem,
                    rarity: winningRarity,
                    rarityInfo: RARITY_CONFIG[winningRarity]
                });
            } else {
                // Relleno visual realista
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

        return {
            success: true,
            caseId,
            caseName: caseConf.name,
            winningIndex: 35,
            winningItem: {
                ...winningItem,
                rarity: winningRarity,
                rarityInfo: RARITY_CONFIG[winningRarity]
            },
            reel,
            balance: finalBalance
        };
    }
}

module.exports = CasesEngine;
