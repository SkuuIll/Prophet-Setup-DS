// ═══════════════════════════════════════════════════
//  SCRIPT: Aplicar Apodos Trol a los Usuarios en Salas de Voz Ahora Mismo
// ═══════════════════════════════════════════════════

require('dotenv').config({ override: true });
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');
const { applyTrollNickname, canManageMember, setTrollEnabled } = require('../modules/trollNicknames');

// Script de prueba manual (desactivado por defecto)

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
        const guildId = config.GUILD_ID;
        const guild = await client.guilds.fetch(guildId).catch(() => null);

        if (!guild) {
            console.error(`❌ No se encontró el servidor con ID: ${guildId}`);
            process.exit(1);
        }

        console.log(`🏠 Servidor: ${guild.name} (${guild.id})`);
        await guild.members.fetch();
        await guild.channels.fetch();

        // Buscar todos los miembros que están en canales de voz
        const voiceMembers = [];
        guild.channels.cache.forEach(channel => {
            if (channel.isVoiceBased() && channel.members.size > 0) {
                channel.members.forEach(member => {
                    if (!member.user.bot) {
                        voiceMembers.push({ member, channelName: channel.name });
                    }
                });
            }
        });

        console.log(`🎙️ Total de usuarios en salas de voz encontrados: ${voiceMembers.length}`);

        if (voiceMembers.length === 0) {
            console.log('ℹ️ No hay usuarios humanos conectados en salas de voz en este momento.');
        }

        let applied = 0;
        let skipped = 0;

        for (const item of voiceMembers) {
            const member = item.member;
            console.log(`\n👉 Evaluando a: ${member.user.tag} (en sala "${item.channelName}")`);

            if (!canManageMember(member)) {
                console.log(`   ⚠️ Omitido: El bot no tiene jerarquía/permisos sobre ${member.user.tag} (dueño o rol superior al bot).`);
                skipped++;
                continue;
            }

            const result = await applyTrollNickname(member, 'Aplicado a miembros en sala de voz', true);
            if (result.success) {
                console.log(`   🔥 ¡Apodo cambiado con éxito!`);
                console.log(`      Anterior: "${result.originalNickname}"`);
                console.log(`      Nuevo:    "${result.nickname}"`);
                applied++;
            } else {
                console.log(`   ❌ Error aplicando apodo: ${result.reason}`);
                skipped++;
            }

            // Espera breve para evitar rate limit de Discord
            await new Promise(r => setTimeout(r, 600));
        }

        console.log('\n═══════════════════════════════════════');
        console.log(`📊 RESUMEN FINAL:`);
        console.log(`   • Total en voz: ${voiceMembers.length}`);
        console.log(`   • Apodos cambiados: ${applied}`);
        console.log(`   • Omitidos/Sin permisos: ${skipped}`);
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error ejecutando script:', error);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(config.TOKEN);
