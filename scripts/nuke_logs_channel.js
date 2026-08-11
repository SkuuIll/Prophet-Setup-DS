// ═══════════════════════════════════════════════════
//  SCRIPT: Clonar y resetear canal de logs 100% vacío
// ═══════════════════════════════════════════════════

require('dotenv').config({ override: true });
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', async () => {
    console.log(`🤖 Conectado como ${client.user.tag}`);

    try {
        const guild = await client.guilds.fetch(config.GUILD_ID);
        if (!guild) {
            console.error('❌ Servidor no encontrado');
            process.exit(1);
        }

        await guild.channels.fetch();
        const logChannel = guild.channels.cache.get('1473002337126711568')
            || guild.channels.cache.get(config.CHANNELS.LOGS)
            || guild.channels.cache.find(c => c.name.includes('logs'));

        if (!logChannel || !logChannel.isTextBased()) {
            console.error('❌ Canal de logs no encontrado');
            process.exit(1);
        }

        const position = logChannel.position;
        const parentId = logChannel.parentId;
        const name = logChannel.name;
        const topic = logChannel.topic;
        const permissionOverwrites = logChannel.permissionOverwrites.cache.map(p => ({
            id: p.id,
            allow: p.allow.toArray(),
            deny: p.deny.toArray(),
            type: p.type
        }));

        console.log(`🔄 Clonando y limpiando #${name} (${logChannel.id})...`);

        const newChannel = await guild.channels.create({
            name,
            type: logChannel.type,
            parent: parentId,
            position,
            topic,
            permissionOverwrites
        });

        console.log(`✨ Nuevo canal creado: ${newChannel.id}`);

        await logChannel.delete('Limpieza completa de logs');
        console.log(`🗑️ Canal anterior eliminado.`);

        await newChannel.setPosition(position);
        console.log(`🎉 ¡Canal #${name} reseteado y 100% limpio!`);
    } catch (err) {
        console.error('❌ Error reseteando canal de logs:', err);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(config.TOKEN);
