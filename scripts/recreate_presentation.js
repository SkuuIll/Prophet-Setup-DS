require('dotenv').config({ override: true });
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function processChannel(guild, key) {
    const chId = stmts.getConfig(key)?.value || config.CHANNELS[key];
    const oldChannel = guild.channels.cache.get(chId) || guild.channels.cache.find(c => c.name === chId);
    
    if (!oldChannel) {
        console.log(`[${key}] Canal no encontrado`);
        return;
    }

    console.log(`[${key}] Procesando canal: ${oldChannel.name}`);
    
    // Obtener el mensaje más antiguo buscando iterativamente hacia atrás
    let oldestMsg = null;
    let lastId = null;
    let fetchMore = true;

    while (fetchMore) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;
        
        const msgs = await oldChannel.messages.fetch(options).catch(() => null);
        if (!msgs || msgs.size === 0) {
            fetchMore = false;
        } else {
            const batchOldest = msgs.last();
            oldestMsg = batchOldest;
            lastId = batchOldest.id;
        }
    }

    if (!oldestMsg) {
        console.log(`[${key}] No hay mensajes, solo clonando y borrando.`);
    } else {
        console.log(`[${key}] Mensaje más antiguo encontrado del autor: ${oldestMsg.author.tag}`);
    }

    // Clonar
    const newChannel = await oldChannel.clone({
        position: oldChannel.rawPosition
    });
    console.log(`[${key}] Canal clonado con éxito -> ${newChannel.id}`);

    // Reenviar mensaje
    if (oldestMsg) {
        const payload = {
            content: oldestMsg.content || null,
            embeds: oldestMsg.embeds,
            components: oldestMsg.components
        };
        try {
            await newChannel.send(payload);
            console.log(`[${key}] Mensaje de presentación re-enviado!`);
        } catch (err) {
            console.error(`[${key}] Error al re-enviar mensaje:`, err.message);
        }
    }

    // Actualizar DB
    stmts.setConfig(key, newChannel.id);
    
    // Eliminar viejo
    try {
        await oldChannel.delete('Limpieza de presentación');
        console.log(`[${key}] Canal viejo eliminado.`);
    } catch (err) {
        console.error(`[${key}] Error al eliminar canal viejo:`, err.message);
    }
}

client.once('clientReady', async () => {
    try {
        const guild = await client.guilds.fetch(config.GUILD_ID);
        await guild.channels.fetch();

        await processChannel(guild, 'BIENVENIDOS');
        await processChannel(guild, 'ANUNCIOS');
        await processChannel(guild, 'ROLES');

    } catch(e) {
        console.error(e);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(config.TOKEN);
