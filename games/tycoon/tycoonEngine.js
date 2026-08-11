const { stmts } = require('../../database');

const SERVERS_CONFIG = {
    vps_entry: {
        id: 'vps_entry',
        name: 'VPS Casual (CS2 10 Slots)',
        icon: '💻',
        baseCost: 15,
        baseProd: 1, // 1 moneda/s
        desc: 'Un servidor modesto para jugar unos 5v5 con amigos.'
    },
    cs2_comp: {
        id: 'cs2_comp',
        name: 'Servidor CS2 128-Tick',
        icon: '🔫',
        baseCost: 100,
        baseProd: 8,
        desc: 'Servidor competitivo de alto rendimiento para torneos.'
    },
    pubg_custom: {
        id: 'pubg_custom',
        name: 'Servidor PUBG Custom Match',
        icon: '🪂',
        baseCost: 1100,
        baseProd: 45,
        desc: 'Capacidad para 100 jugadores en simultáneo en Erangel.'
    },
    rust_dedicated: {
        id: 'rust_dedicated',
        name: 'Servidor Rust 500x Loot',
        icon: '🪵',
        baseCost: 12000,
        baseProd: 260,
        desc: 'Servidor ultra tóxico y caótico. Genera ingresos masivos.'
    },
    ark_cluster: {
        id: 'ark_cluster',
        name: 'Cluster ARK Ascended',
        icon: '🦖',
        baseCost: 130000,
        baseProd: 1400,
        desc: 'Complejo de servidores interconectados con mods pesados.'
    },
    datacenter_prophet: {
        id: 'datacenter_prophet',
        name: 'Datacenter Prophet Gaming',
        icon: '🏢',
        baseCost: 1400000,
        baseProd: 9500,
        desc: 'Instalación de fibra óptica propia y refrigeración líquida.'
    }
};

const ADMINS_CONFIG = {
    mod_junior: {
        id: 'mod_junior',
        name: 'Moderador Junior',
        icon: '🛡️',
        cost: 500,
        type: 'autoclick',
        value: 1, // 1 click auto por seg
        desc: 'Monitorea el chat y reinicia servidores colgados.'
    },
    mod_senior: {
        id: 'mod_senior',
        name: 'Moderador Senior',
        icon: '⚔️',
        cost: 5000,
        type: 'multiplier',
        value: 0.10, // +10%
        desc: 'Mejora la gestión de los servidores (+10% producción global).'
    },
    sysadmin: {
        id: 'sysadmin',
        name: 'SysAdmin Linux',
        icon: '🐧',
        cost: 50000,
        type: 'multiplier',
        value: 0.25, // +25%
        desc: 'Optimiza el kernel y la latencia (+25% producción global).'
    },
    anticheat_ai: {
        id: 'anticheat_ai',
        name: 'IA Anti-Cheat Prophet',
        icon: '🤖',
        cost: 500000,
        type: 'multiplier',
        value: 0.50, // +50%
        desc: 'Banea tramposos automáticamente (+50% producción global).'
    },
    prophet_bot_core: {
        id: 'prophet_bot_core',
        name: 'Núcleo Prophet Bot v3.0',
        icon: '👑',
        cost: 5000000,
        type: 'multiplier',
        value: 1.00, // +100% (Duplica todo)
        desc: 'Inteligencia artificial cuántica administrando todo (+100%).'
    }
};

class TycoonEngine {
    static getConfigs() {
        return {
            servers: SERVERS_CONFIG,
            admins: ADMINS_CONFIG
        };
    }

    /**
     * Calcula el costo de comprar el siguiente servidor de un tipo
     */
    static calculateServerCost(serverId, currentCount = 0) {
        const conf = SERVERS_CONFIG[serverId];
        if (!conf) return 0;
        return Math.floor(conf.baseCost * Math.pow(1.15, currentCount));
    }

    /**
     * Calcula la producción por segundo de un usuario dado su estado
     */
    static calculateProduction(servers = {}, admins = {}, prestige = 0) {
        let basePerSec = 0;
        for (const [sId, count] of Object.entries(servers)) {
            const conf = SERVERS_CONFIG[sId];
            if (conf && count > 0) {
                basePerSec += conf.baseProd * count;
            }
        }

        let multiplier = 1.0;
        let autoClicksPerSec = 0;

        for (const [aId, has] of Object.entries(admins)) {
            if (!has) continue;
            const conf = ADMINS_CONFIG[aId];
            if (!conf) continue;

            if (conf.type === 'multiplier') {
                multiplier += conf.value;
            } else if (conf.type === 'autoclick') {
                autoClicksPerSec += conf.value;
            }
        }

        // Bono de prestigio (cada nivel de prestigio da +20%)
        if (prestige > 0) {
            multiplier += (prestige * 0.20);
        }

        const productionPerSec = basePerSec * multiplier;
        return {
            productionPerSec: Math.round(productionPerSec * 10) / 10,
            autoClicksPerSec,
            multiplier
        };
    }

    /**
     * Carga el estado del usuario y calcula el progreso offline
     */
    static loadUserGameState(userId) {
        const save = stmts.getTycoonSave(userId);
        const now = Date.now();
        const lastActive = save.last_active || now;
        const elapsedSeconds = Math.max(0, Math.floor((now - lastActive) / 1000));

        const { productionPerSec, autoClicksPerSec } = this.calculateProduction(save.servers, save.admins, save.prestige);

        let offlineEarned = 0;
        let offlineSecondsApplied = 0;

        // Si pasaron más de 10 segundos fuera, calculamos ganancias offline (máximo 12 horas)
        if (elapsedSeconds >= 10 && productionPerSec > 0) {
            const cappedSeconds = Math.min(elapsedSeconds, 12 * 3600);
            offlineSecondsApplied = cappedSeconds;
            // 85% de eficiencia offline
            offlineEarned = Math.floor(cappedSeconds * productionPerSec * 0.85);
            save.local_coins += offlineEarned;
        }

        // Actualizamos last_active a ahora
        save.last_active = now;
        stmts.saveTycoonSave(userId, save.local_coins, save.servers, save.admins, save.prestige, now);

        return {
            userId,
            coins: Math.floor(save.local_coins),
            servers: save.servers,
            admins: save.admins,
            prestige: save.prestige || 0,
            productionPerSec,
            autoClicksPerSec,
            offlineEarned,
            offlineSeconds: offlineSecondsApplied,
            configs: {
                servers: SERVERS_CONFIG,
                admins: ADMINS_CONFIG
            }
        };
    }

    /**
     * Procesa un click manual ("Reiniciar Servidor")
     */
    static processClick(userId, clientClickCount = 1) {
        const count = Math.min(Math.max(1, Math.floor(clientClickCount)), 10);
        const save = stmts.getTycoonSave(userId);
        
        // Cada click base da 1 moneda + bonus por servidores
        const { multiplier } = this.calculateProduction(save.servers, save.admins, save.prestige);
        const clickValue = Math.max(1, Math.floor(1 * multiplier));
        const totalGained = clickValue * count;

        save.local_coins += totalGained;
        save.last_active = Date.now();
        stmts.saveTycoonSave(userId, save.local_coins, save.servers, save.admins, save.prestige, save.last_active);

        return {
            success: true,
            coins: Math.floor(save.local_coins),
            gained: totalGained,
            clickValue
        };
    }

    /**
     * Compra un servidor
     */
    static buyServer(userId, serverId) {
        const conf = SERVERS_CONFIG[serverId];
        if (!conf) return { success: false, error: 'Servidor no válido' };

        const save = stmts.getTycoonSave(userId);
        const currentCount = save.servers[serverId] || 0;
        const cost = this.calculateServerCost(serverId, currentCount);

        if (save.local_coins < cost) {
            return { success: false, error: 'Monedas insuficientes', required: cost, current: Math.floor(save.local_coins) };
        }

        save.local_coins -= cost;
        save.servers[serverId] = currentCount + 1;
        save.last_active = Date.now();

        stmts.saveTycoonSave(userId, save.local_coins, save.servers, save.admins, save.prestige, save.last_active);

        const { productionPerSec, autoClicksPerSec } = this.calculateProduction(save.servers, save.admins, save.prestige);

        return {
            success: true,
            serverId,
            count: save.servers[serverId],
            coins: Math.floor(save.local_coins),
            nextCost: this.calculateServerCost(serverId, save.servers[serverId]),
            productionPerSec,
            autoClicksPerSec
        };
    }

    /**
     * Contrata a un Administrador / Staff
     */
    static buyAdmin(userId, adminId) {
        const conf = ADMINS_CONFIG[adminId];
        if (!conf) return { success: false, error: 'Admin no válido' };

        const save = stmts.getTycoonSave(userId);
        if (save.admins[adminId]) {
            return { success: false, error: 'Ya contrataste a este Admin' };
        }

        if (save.local_coins < conf.cost) {
            return { success: false, error: 'Monedas insuficientes', required: conf.cost, current: Math.floor(save.local_coins) };
        }

        save.local_coins -= conf.cost;
        save.admins[adminId] = true;
        save.last_active = Date.now();

        stmts.saveTycoonSave(userId, save.local_coins, save.servers, save.admins, save.prestige, save.last_active);

        const { productionPerSec, autoClicksPerSec } = this.calculateProduction(save.servers, save.admins, save.prestige);

        return {
            success: true,
            adminId,
            admins: save.admins,
            coins: Math.floor(save.local_coins),
            productionPerSec,
            autoClicksPerSec
        };
    }

    /**
     * Guarda el progreso pasivo acumulado durante el juego activo
     */
    static syncPassiveGains(userId, addedCoins) {
        const save = stmts.getTycoonSave(userId);
        const amt = Math.max(0, Math.floor(Number(addedCoins) || 0));
        save.local_coins += amt;
        save.last_active = Date.now();
        stmts.saveTycoonSave(userId, save.local_coins, save.servers, save.admins, save.prestige, save.last_active);
        return { success: true, coins: Math.floor(save.local_coins) };
    }
}

module.exports = TycoonEngine;
