// ═══════════════════════════════════════════════════
//  SCRIPT: Aplicar Small Caps a los nombres de vista del Clan
// ═══════════════════════════════════════════════════

require('dotenv').config({ override: true });
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config');
const { canManageMember, applyClanFont } = require('../modules/clanFont');

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
            console.error(`❌ No se encontró el servidor con ID: ${config.GUILD_ID}`);
            process.exit(1);
        }

        console.log(`🏠 Servidor: ${guild.name} (${guild.id})`);
        await guild.members.fetch();

        const humanMembers = guild.members.cache.filter(m => !m.user.bot);
        console.log(`📋 Total miembros humanos en el servidor: ${humanMembers.size}`);
        console.log(`✨ Aplicando fuente Small Caps al nombre de vista (displayName)...`);

        let applied = 0;
        let skipped = 0;
        let errors = 0;
        let index = 0;

        for (const [, member] of humanMembers) {
            index++;
            if (!canManageMember(member)) {
                console.log(`⏭️ [${index}/${humanMembers.size}] Omitido (dueño/rol superior): ${member.displayName}`);
                skipped++;
                continue;
            }

            const currentName = member.displayName;
            const res = await applyClanFont(member, 'small-caps', 'Fuente Small Caps del Clan');

            if (res.success) {
                console.log(`✨ [${index}/${humanMembers.size}] Convertido: "${currentName}" -> "${res.newNickname}"`);
                applied++;
            } else {
                console.log(`❌ [${index}/${humanMembers.size}] Error con ${member.displayName}: ${res.reason}`);
                errors++;
            }

            // Pausa de 250ms para respetar el rate limit de Discord
            await new Promise(r => setTimeout(r, 250));
        }

        console.log('\n═══════════════════════════════════════');
        console.log(`📊 RESUMEN FINAL:`);
        console.log(`   • Total miembros evaluados: ${humanMembers.size}`);
        console.log(`   • Nombres convertidos a Small Caps: ${applied}`);
        console.log(`   • Omitidos (Dueño o roles superiores): ${skipped}`);
        console.log(`   • Errores: ${errors}`);
        console.log('═══════════════════════════════════════\n');

    } catch (e) {
        console.error('❌ Error ejecutando script:', e);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(config.TOKEN);
