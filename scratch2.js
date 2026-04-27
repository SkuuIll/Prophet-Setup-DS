const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    const guild = client.guilds.cache.get(config.GUILD_ID);
    await guild.roles.fetch();
    console.log("Roles matching 'pubg':", guild.roles.cache.filter(r => r.name.toLowerCase().includes('pubg')).map(r => r.name));
    console.log("Roles matching 'cs2':", guild.roles.cache.filter(r => r.name.toLowerCase().includes('cs2')).map(r => r.name));
    console.log("Roles matching 'counter':", guild.roles.cache.filter(r => r.name.toLowerCase().includes('counter')).map(r => r.name));
    process.exit(0);
});
client.login(config.TOKEN);
