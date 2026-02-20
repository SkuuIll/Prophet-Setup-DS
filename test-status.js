const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    try {
        console.log("Ready");
        // We need a test voice channel. The voice_generator_id is a voice channel.
        const stmts = require('./database').stmts;
        const configData = stmts.getConfig('voice_generator_id');
        const channelId = JSON.parse(configData);
        if (channelId) {
            await client.rest.put(`/channels/${channelId}/voice-status`, {
                body: { status: "Test status 😄" }
            });
            console.log("Status set successfully.");
        }
    } catch (e) {
        console.error("Error setting status:", e);
    }
    process.exit();
});

client.login(config.TOKEN);
