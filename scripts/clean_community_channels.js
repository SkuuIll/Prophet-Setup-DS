// ═══════════════════════════════════════════════════
//  SCRIPT: Limpieza de Canales en Comunidad
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

        // Canales a borrar
        const channelsToDelete = [
            '1473002312858341517', // 🖥️・streams
            '1508153734449074388', // 💡・sugerencias
            '1508153735984185364', // 🕵️・confesiones
            '1508153737716170762', // 🔢・counting
            '1473002308135682088', // 🖼️・multimedia
            '1473002309666476334', // ❓・soporte
        ];

        for (const chId of channelsToDelete) {
            const ch = guild.channels.cache.get(chId);
            if (ch) {
                console.log(`🗑️ Eliminando canal ${ch.name} (${ch.id})...`);
                await ch.delete('Simplificación de canales solicitada por el usuario');
            } else {
                console.log(`⚠️ Canal ID ${chId} no encontrado (o ya fue eliminado).`);
            }
        }

        // Renombrar 🤖・bot-comandos a 🤖・bot
        const chBotComandos = guild.channels.cache.get('1473002311088607387');
        if (chBotComandos) {
            console.log(`✨ Renombrando "${chBotComandos.name}" a "🤖・bot"...`);
            await chBotComandos.setName('🤖・bot');
        }

        console.log('🎉 ¡Limpieza de canales de comunidad completada!');
    } catch (err) {
        console.error('❌ Error en script:', err);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(config.TOKEN);
