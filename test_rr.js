const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    const guild = client.guilds.cache.get(config.GUILD_ID);
    await guild.roles.fetch();
    
    // Simulate resolverIDs
    const resolverRol = (value) => guild.roles.cache.get(value) || guild.roles.cache.find(role => role.name === value);
    for (const [key, value] of Object.entries({ ...config.ROLES })) {
        const role = resolverRol(value);
        if (role) config.ROLES[key] = role.id;
    }
    
    // Simulate interaction
    const vipRole = guild.roles.cache.get(config.ROLES.VIP);
    console.log("vipRole id:", vipRole.id);
    console.log("vipRole name:", vipRole.name);
    
    const rolesProtegidos = [config.ROLES.PROPHET, config.ROLES.STAFF, config.ROLES.MODERADOR, config.ROLES.VIP, config.ROLES.BOTS].filter(Boolean);
    console.log("rolesProtegidos:", rolesProtegidos);
    
    const isProtected = rolesProtegidos.includes(vipRole.id) || rolesProtegidos.includes(vipRole.name);
    console.log("Is VIP protected?", isProtected);
    
    process.exit(0);
});
client.login(config.TOKEN);
