require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log('Bot logged in as ' + client.user.tag);
    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID || '412085943936221206');
        if (!guild) throw new Error('Guild not found');
        
        // Dar permisos de subir imágenes y enviar mensajes con embeds a @everyone
        const everyone = guild.roles.everyone;
        const newPermissions = everyone.permissions.add([
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
        ]);
        
        await everyone.setPermissions(newPermissions);
        console.log('✅ Permisos actualizados con éxito para @everyone (AttachFiles, EmbedLinks)');
    } catch(e) {
        console.error('❌ Error actualizando permisos:', e);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
