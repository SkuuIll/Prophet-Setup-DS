// ═══════════════════════════════════════════════════
//  EVENTO: presenceUpdate (Detección de conexión a Discord)
// ═══════════════════════════════════════════════════

module.exports = {
    name: 'presenceUpdate',
    once: false,
    async execute(oldPresence, newPresence) {
        // Los apodos trol automáticos se aplican exclusivamente al entrar/salir de canales de voz
        // (voiceStateUpdate) y mediante el comando manual /trollnick para evitar loops y rate limits de Discord.
    }
};
