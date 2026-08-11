// ═══════════════════════════════════════════════════
//  SCRIPT: Restaurar apodos de usuarios fuera de voz
// ═══════════════════════════════════════════════════

require('dotenv').config({ override: true });
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');
const { restoreNickname } = require('../modules/trollNicknames');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

client.once('ready', async () => {
    console.log(`🤖 Conectado como ${client.user.tag}`);

    try {
        const guild = await client.guilds.fetch(config.GUILD_ID).catch(() => null);
        if (!guild) {
            console.error('❌ No se encontró el servidor');
            process.exit(1);
        }

        await guild.members.fetch();
        await guild.channels.fetch();

        // Obtener IDs de usuarios actualmente en voz
        const usersInVoice = new Set();
        guild.channels.cache.forEach(c => {
            if (c.isVoiceBased()) {
                c.members.forEach(m => usersInVoice.add(m.id));
            }
        });

        // Buscar todos los registros en troll_nicknames
        const Database = require('better-sqlite3');
        const db = new Database('./data/prophet.sqlite');
        const rows = db.prepare('SELECT * FROM troll_nicknames').all();

        console.log(`🔍 Total registros de troll nicknames en DB: ${rows.length}`);

        for (const row of rows) {
            // Si el usuario ya no está en voz, restaurar su apodo inmediatamente
            if (!usersInVoice.has(row.user_id)) {
                const member = await guild.members.fetch(row.user_id).catch(() => null);
                if (member) {
                    console.log(`🔄 Restaurando apodo de ${member.user.tag} (fuera de voz)...`);
                    const res = await restoreNickname(member);
                    console.log(`   Resultado:`, res);
                } else {
                    stmts.removeTrollNickData(row.user_id);
                }
            } else {
                console.log(`🎙️ Usuario ${row.user_id} sigue en sala de voz, conservando apodo.`);
            }
        }

        console.log('✅ Proceso de sincronización y restauración completado.');
    } catch (e) {
        console.error('❌ Error en script:', e);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(config.TOKEN);
