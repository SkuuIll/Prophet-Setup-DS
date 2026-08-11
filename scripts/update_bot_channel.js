require('dotenv').config({ override: true });
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const config = require('../config');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
    try {
        console.log(`Logueado como ${client.user.tag}`);
        const guild = await client.guilds.fetch(config.GUILD_ID || process.env.GUILD_ID);
        if (!guild) throw new Error("No se encontró el servidor");

        const channel = guild.channels.cache.find(c => c.name === config.CHANNELS.COMANDOS_BOT);
        if (!channel) throw new Error("No se encontró el canal de comandos: " + config.CHANNELS.COMANDOS_BOT);

        console.log(`Clonando canal ${channel.name}...`);
        // Clone the channel exactly as it is (permissions, parent category, etc)
        const newChannel = await channel.clone();
        
        console.log("Eliminando canal antiguo para evadir la restricción de 14 días...");
        await channel.delete();

        // Send Embed
        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setTitle('🤖 GUÍA DE COMANDOS DE PROPHETBOT')
            .setDescription(`Todos los miembros pueden usar estos comandos en este canal.\n\n**💰 ECONOMÍA Y TIENDA**\n> **\`/balance\`** : 💰 Ver tu saldo actual\n> **\`/daily\`** : 📅 Reclamar tu recompensa diaria\n> **\`/work\`** : 👷 Trabajar para ganar monedas\n> **\`/deposit\`** : 🏦 Depositar dinero en el banco\n> **\`/withdraw\`** : 💵 Retirar dinero del banco\n> **\`/pay\`** : 💸 Transferir dinero a otro usuario\n> **\`/shop\`** : 🛒 Abre la tienda de roles para gastar tu economía\n> **\`/inventory\`** : 🎒 Ver el inventario de objetos\n> **\`/gamble\`** : 🎰 Apostar dinero — ¡Doble o Nada!\n\n**🎵 MÚSICA**\n> **\`/play\`** : 🎵 Reproducir música\n> **\`/stop\`** : ⏹️ Detener la música y vaciar la cola\n> **\`/skip\`** : ⏭️ Saltar a la siguiente canción\n> **\`/pause\`** : ⏸️ Pausar o reanudar\n> **\`/queue\`** : 📋 Ver la cola de reproducción\n> **\`/volumen\`** : 🔊 Ajustar el volumen\n> **\`/loop\`** : 🔁 Cambiar el modo de repetición\n> **\`/shuffle\`** : 🔀 Mezclar la cola\n> **\`/filter\`** : 🎛️ Aplica filtros de audio\n\n**🎮 DIVERSIÓN Y MINIJUEGOS**\n> **\`/anonimo\`** : 🕵️ Mandar mensaje anónimo al chat\n> **\`/8ball\`** : 🎱 Consultá a la bola mágica del Prophet\n> **\`/avatar\`** : 🖼️ Ver el avatar de un usuario\n> **\`/bardeo\`** : 🎙️ Bardeo o sonido trampa en voz\n> **\`/confesion\`** : 🕵️ Confesión anónima en voz\n> **\`/blackjack\`** : 🃏 Juega al Blackjack (21)\n> **\`/coinflip\`** : 🪙 Lanzar una moneda\n> **\`/rps\`** : ✌️ Piedra, Papel o Tijera\n> **\`/tictactoe\`** : 🎮 Jugar Tres en Raya\n> **\`/fakeban\`** : 🚨 Baneo falso\n> **\`/meme\`** : 😂 Generador de memes\n> **\`/cartel\`** : 🖼️ Generar pósters\n> **\`/emoji\` / \`/sticker\`** : 😀 Crear emojis/stickers\n\n**⭐ NIVELES Y PERFILES**\n> **\`/perfil\`** : 👤 Tu perfil completo\n> **\`/nivel\`** : 📈 Ver tu nivel actual\n> **\`/ranking\`** : 🏆 Top del servidor\n> **\`/misiones\`** : 🎯 Misiones diarias/semanales\n> **\`/premium\`** : 💎 Membresías premium\n\n**⚔️ INTEGRACIONES GAMING**\n> **\`/steam\`** : 🎮 Ver perfil de Steam\n> **\`/lol\`** : 🛡️ Estadísticas de LoL\n> **\`/valorant\`** : 🔫 Estadísticas de VALORANT\n> **\`/cs2\`** : 🔫 Estadísticas de CS2\n> **\`/pubg\`** : 🪂 Estadísticas de PUBG\n\n**🛠️ UTILIDAD**\n> **\`/ai\`** : 🤖 Chateá con IA\n> **\`/afk\`** : 💤 Modo AFK\n> **\`/clima\` / \`/hora\` / \`/traductor\`** : 🌐 Herramientas globales\n> **\`/tiktok\` / \`/youtube-dl\`** : 🎵 Descargar videos\n> **\`/snipe\`** : 👀 Ver último mensaje borrado\n> **\`/recordatorio\` / \`/notas\`** : ⏰ Organización\n\n*También podés hacer Clic Derecho > Aplicaciones sobre usuarios/mensajes para usar menús rápidos.*`)
            .setFooter({ text: 'ProphetBot - Actualizado por la IA' })
            .setTimestamp();

        console.log("Enviando mensaje al nuevo canal...");
        await newChannel.send({ embeds: [embed] });
        console.log("¡Canal clonado, limpiado y configurado!");
        client.destroy();
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        client.destroy();
        process.exit(1);
    }
});

client.login(config.TOKEN || process.env.DISCORD_TOKEN);
