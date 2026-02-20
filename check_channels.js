const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log(`Bot conectado como ${client.user.tag}`);
    const guild = client.guilds.cache.get(config.GUILD_ID);

    if (!guild) {
        console.error('❌ No se encontró el servidor con ID:', config.GUILD_ID);
        process.exit(1);
    }

    console.log(`\n📂 Canales en el servidor "${guild.name}":`);
    console.log('--------------------------------------------------');

    // Obtener canales de texto
    const channels = await guild.channels.fetch();
    const textChannels = channels.filter(c => c.type === 0); // 0 = GUILD_TEXT

    textChannels.forEach(c => {
        console.log(`📝 ${c.name} (ID: ${c.id})`);
    });

    console.log('\n⚙️  Comparando con config.js:');
    console.log('--------------------------------------------------');

    const configChannels = Object.entries(config.CHANNELS);
    const serverChannelNames = textChannels.map(c => c.name);

    configChannels.forEach(([key, val]) => {
        if (serverChannelNames.includes(val)) {
            console.log(`✅ ${key}: Encontrado ("${val}")`);
        } else {
            console.log(`❌ ${key}: NO encontrado ("${val}")`);
        }
    });

    // ═══ ROLES ═══
    console.log('\n🎭 Roles en el servidor:');
    console.log('--------------------------------------------------');
    const roles = await guild.roles.fetch();
    const sortedRoles = roles.sort((a, b) => b.position - a.position);

    sortedRoles.forEach(r => {
        if (r.name !== '@everyone') {
            console.log(`🛡️ ${r.name} (Hex: ${r.hexColor})`);
        }
    });

    console.log('\n⚙️  Comparando ROLES con config.js:');
    console.log('--------------------------------------------------');

    const configRoles = Object.entries(config.ROLES);
    const serverRoleNames = roles.map(r => r.name);

    configRoles.forEach(([key, val]) => {
        // Si es null en config, ignoramos (significa que usa el default o no está set)
        if (val === null) {
            console.log(`ℹ️ ${key}: Configurado como null (usará default si existe)`);
            return;
        }

        if (serverRoleNames.includes(val)) {
            console.log(`✅ ${key}: Encontrado ("${val}")`);
        } else {
            console.log(`❌ ${key}: NO encontrado ("${val}")`);
        }
    });

    process.exit(0);
});

client.login(config.TOKEN);
