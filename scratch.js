const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    const guild = client.guilds.cache.get(config.GUILD_ID);
    await guild.roles.fetch();
    const vip = guild.roles.cache.find(r => r.name === '💎 VIP');
    const nuevo = guild.roles.cache.find(r => r.name === '🆕 Nuevo');
    console.log('VIP ID:', vip?.id);
    console.log('NUEVO ID:', nuevo?.id);
    
    // Also let's check what config.ROLES looks like when index.js runs resolverIDs
    const resolverRol = (value) => guild.roles.cache.get(value) || guild.roles.cache.find(role => role.name === value);
    for (const [key, value] of Object.entries({ ...config.ROLES })) {
        const role = resolverRol(value);
        if (role) config.ROLES[key] = role.id;
    }
    console.log(config.ROLES);
    process.exit(0);
});
client.login(config.TOKEN);
