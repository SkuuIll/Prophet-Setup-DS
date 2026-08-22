// ═══════════════════════════════════════════════════
//  SCRIPT: Restauración inmediata de todos los apodos
// ═══════════════════════════════════════════════════

require('dotenv').config({ override: true });
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');
const { canManageMember, restoreNickname, TROLL_NICKNAMES_POOL } = require('../modules/trollNicknames');

// Forzar desactivación en DB
stmts.setConfig('troll_nicknames_enabled', false);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ]
});

client.once('ready', async () => {
    console.log(`🤖 Conectado como ${client.user.tag}`);

    try {
        const guild = await client.guilds.fetch(config.GUILD_ID);
        if (!guild) {
            console.error('❌ No se encontró el servidor');
            process.exit(1);
        }

        console.log(`🏠 Servidor: ${guild.name} (${guild.id})`);
        await guild.members.fetch();

        const allTrollData = stmts.getAllTrollNickData();
        console.log(`📋 Total de registros en DB troll_nicknames: ${allTrollData.length}`);

        let restoredCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const row of allTrollData) {
            const member = guild.members.cache.get(row.user_id);
            if (!member) {
                console.log(`⚠️ Miembro ${row.user_id} ya no está en el servidor. Limpiando registro.`);
                stmts.removeTrollNickData(row.user_id);
                continue;
            }

            if (!canManageMember(member)) {
                console.log(`⏭️ Omitiendo ${member.user.tag} (rol superior o dueño). Limpiando registro.`);
                stmts.removeTrollNickData(row.user_id);
                skippedCount++;
                continue;
            }

            const original = row.original_nickname;
            const targetNick = (original && original !== member.user.username) ? original : null;

            try {
                await member.setNickname(targetNick, 'Restauración completa y desactivación de apodos trol');
                stmts.removeTrollNickData(member.id);
                console.log(`✅ [${restoredCount + 1}/${allTrollData.length}] Restaurado: ${member.user.tag} -> "${targetNick || member.user.username}"`);
                restoredCount++;
                // Pausa de 250ms para evitar rate limits
                await new Promise(r => setTimeout(r, 250));
            } catch (err) {
                console.error(`❌ Error restaurando a ${member.user.tag}: ${err.message}`);
                errorCount++;
            }
        }

        // Barrido secundario: verificar si algún otro miembro tiene un apodo del pool
        const trollPoolSet = new Set(TROLL_NICKNAMES_POOL);
        for (const [, member] of guild.members.cache) {
            if (member.user.bot || !canManageMember(member) || !member.nickname) continue;
            if (trollPoolSet.has(member.nickname) || member.nickname.startsWith('[Manco]') || member.nickname.startsWith('[AFK]') || member.nickname.startsWith('Termo ')) {
                try {
                    console.log(`🧹 Limpiando apodo residual de ${member.user.tag}: "${member.nickname}" -> username base`);
                    await member.setNickname(null, 'Limpieza de apodo residual');
                    restoredCount++;
                    await new Promise(r => setTimeout(r, 250));
                } catch (_) {}
            }
        }

        console.log('\n═══════════════════════════════════════');
        console.log(`🎉 RESTAURACIÓN COMPLETADA:`);
        console.log(`   • Apodos restaurados: ${restoredCount}`);
        console.log(`   • Omitidos (sin permisos): ${skippedCount}`);
        console.log(`   • Errores: ${errorCount}`);
        console.log(`   • Estado en DB: troll_nicknames_enabled = false`);
        console.log('═══════════════════════════════════════\n');

    } catch (e) {
        console.error('❌ Error general:', e);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(config.TOKEN);
