// ═══════════════════════════════════════════════════
//  SCRIPT: Limpiar por completo el canal de logs
// ═══════════════════════════════════════════════════

require('dotenv').config({ override: true });
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('clientReady', async () => {
    console.log(`🤖 Conectado como ${client.user.tag}`);

    try {
        const guild = await client.guilds.fetch(config.GUILD_ID);
        if (!guild) {
            console.error('❌ Servidor no encontrado');
            process.exit(1);
        }

        await guild.channels.fetch();
        const logChannel = guild.channels.cache.get('1473002337126711568')
            || guild.channels.cache.get(config.CHANNELS.LOGS)
            || guild.channels.cache.find(c => c.name.includes('logs'));

        if (!logChannel || !logChannel.isTextBased()) {
            console.error('❌ Canal de logs no encontrado');
            process.exit(1);
        }

        console.log(`🧹 Iniciando limpieza completa de #${logChannel.name} (${logChannel.id})...`);

        let totalDeleted = 0;
        let fetched;

        do {
            fetched = await logChannel.messages.fetch({ limit: 100 }).catch(() => null);
            if (!fetched || fetched.size === 0) break;

            console.log(`📥 Obtenidos ${fetched.size} mensajes para borrar...`);

            // 1. Intentar bulkDelete con filtro de 14 días
            const deleted = await logChannel.bulkDelete(fetched, true).catch(() => null);
            if (deleted && deleted.size > 0) {
                totalDeleted += deleted.size;
                console.log(`   ✨ ${deleted.size} mensajes borrados con bulkDelete.`);
            }

            // 2. Si quedaron mensajes más antiguos de 14 días, borrarlos uno a uno
            const remaining = fetched.filter(m => !deleted || !deleted.has(m.id));
            if (remaining.size > 0) {
                console.log(`   ⏳ Borrando individualmente ${remaining.size} mensajes antiguos...`);
                for (const msg of remaining.values()) {
                    await msg.delete().catch(() => {});
                    totalDeleted++;
                    await new Promise(r => setTimeout(r, 250)); // Evitar rate limits
                }
            }
        } while (fetched && fetched.size >= 2);

        console.log(`🎉 ¡Canal #${logChannel.name} limpiado por completo! (Total borrados: ${totalDeleted})`);
    } catch (err) {
        console.error('❌ Error limpiando logs:', err);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(config.TOKEN);
