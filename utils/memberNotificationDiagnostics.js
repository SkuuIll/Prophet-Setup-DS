const config = require('../config');
const { stmts } = require('../database');
const {
    resolveMemberChannel,
    missingSendPermissions,
} = require('./memberNotifications');

function getPersistedValue(key) {
    try { return stmts.getConfig(key)?.value || null; }
    catch (error) {
        console.warn(`[Notificaciones] Error leyendo configuración ${key}:`, error.message);
        return null;
    }
}

async function inspectMemberNotifications(guild, { log = console } = {}) {
    for (const [key, kind] of [['BIENVENIDOS', 'welcome'], ['LOGS', 'logs']]) {
        const channel = await resolveMemberChannel(guild, {
            configValue: config.CHANNELS[key],
            persistedValue: getPersistedValue(key),
            kind, log,
        });
        if (!channel) {
            log.error?.(`[Notificaciones] Falta un canal para ${key}. Configurá un canal de texto en el dashboard o renombralo a #bienvenidos / #logs.`);
            continue;
        }
        const missing = missingSendPermissions(channel, guild);
        if (missing.length) {
            log.error?.(`[Notificaciones] #${channel.name} (${channel.id}): faltan permisos para el bot: ${missing.join(', ')}.`);
        } else {
            log.info?.(`[Notificaciones] ${key} listo: #${channel.name} (${channel.id}); permisos comprobados cuando están disponibles.`);
        }
    }
    log.info?.('[Notificaciones] guildMemberAdd y guildMemberRemove necesitan el Server Members Intent habilitado en el Discord Developer Portal.');
}

module.exports = { getPersistedValue, inspectMemberNotifications };
