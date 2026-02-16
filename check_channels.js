const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log(`🤖 Logueado como ${client.user.tag}`);

    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (!guild) {
        console.error(`❌ No encontré el servidor con ID: ${config.GUILD_ID}`);
        process.exit(1);
    }

    console.log(`🏠 Servidor: ${guild.name}`);
    console.log('─'.repeat(40));

    // Obtener todos los canales del servidor
    await guild.channels.fetch();
    const serverChannels = guild.channels.cache;

    console.log('📋 CANALES ACTUALES EN DISCORD:');
    serverChannels.forEach(c => {
        if (c.type === 0 || c.type === 2) { // 0 = Text, 2 = Voice - simplificado
            console.log(`   • "${c.name}" (ID: ${c.id}) - Tipo: ${c.type}`);
        }
    });

    console.log('\n🔍 VERIFICACIÓN CON CONFIG.JS:');
    console.log('─'.repeat(40));

    let missing = 0;
    const configChannels = config.CHANNELS;

    for (const [key, expectedName] of Object.entries(configChannels)) {
        // Buscar canal que tenga EXACTAMENTE ese nombre
        const found = serverChannels.find(c => c.name === expectedName);

        if (found) {
            console.log(`✅ ${key}: Encontrado ("${expectedName}")`);
        } else {
            console.log(`❌ ${key}: NO ENCONTRADO (Esperaba: "${expectedName}")`);
            missing++;
        }
    }

    console.log('─'.repeat(40));
    if (missing === 0) {
        console.log('✨ Todo parece estar correcto.');
    } else {
        console.log(`⚠️  Hay ${missing} canales de la configuración que NO coinciden con discord.`);
        console.log('   Revisá la lista de "CANALES ACTUALES" arriba y actualizá config.js con los nombres nuevos.');
    }

    process.exit(0);
});

client.login(config.TOKEN);
