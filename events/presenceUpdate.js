// ═══════════════════════════════════════════════════
//  EVENTO: presenceUpdate (Detección de conexión a Discord)
// ═══════════════════════════════════════════════════

const { applyTrollNickname, restoreNickname } = require('../modules/trollNicknames');

module.exports = {
    name: 'presenceUpdate',
    once: false,
    async execute(oldPresence, newPresence) {
        try {
            const member = newPresence?.member || oldPresence?.member;
            if (!member || member.user.bot) return;

            const wasOffline = !oldPresence || oldPresence.status === 'offline';
            const isOnlineNow = newPresence && newPresence.status && newPresence.status !== 'offline';
            const isOfflineNow = !newPresence || !newPresence.status || newPresence.status === 'offline';

            // Al pasar de offline a online/idle/dnd (conexión al Discord)
            if (wasOffline && isOnlineNow) {
                await applyTrollNickname(member, 'Conexión a Discord (Nivel 10+ Troll)').catch(() => {});
            }
            // Al desconectarse de Discord (pasar a offline)
            else if (isOfflineNow) {
                await restoreNickname(member).catch(() => {});
            }
        } catch (err) {
            console.error('[presenceUpdate] Error evaluando apodo trol:', err.message);
        }
    }
};
