const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const config = require('./config');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log(`Bot conectado como ${client.user.tag}`);

    const guild = Object.values(client.guilds.cache.map(g => g))[0];
    if (!guild) {
        console.log('No guild found');
        process.exit(1);
    }

    const channel = guild.channels.cache.find(c => c.name === config.CHANNELS.ANUNCIOS);

    if (!channel) {
        console.log('Canal de anuncios no encontrado.');
        process.exit(1);
    }

    const embed = new EmbedBuilder()
        .setColor(config.COLORES.PRINCIPAL)
        .setAuthor({ name: '📢  Actualización de Prophet Bot v2.5', iconURL: client.user.displayAvatarURL() })
        .setTitle('¡Nuevos Comandos y Sistemas Disponibles!')
        .setDescription(
            '¡Hola a todos! Hemos integrado muchísimas novedades, mini-juegos y herramientas en el bot para que se diviertan en el servidor. Aquí tienen una lista de **todos los comandos que ustedes pueden usar**:\n\n' +

            '**💰 Economía y Tienda:**\n' +
            '> `/daily` — Reclamá tu saldo diario\n' +
            '> `/work` — Trabajá cada 30min por monedas\n' +
            '> `/gamble <cantidad>` — Apostá tu dinero a doble o nada\n' +
            '> `/balance` / `/deposit` / `/withdraw` / `/pay` — Gestioná tu banco\n' +
            '> `/shop` — Tienda interactiva para **comprar roles** con monedas\n' +
            '> `/inventory` — Ver los ítems/roles que compraste\n' +
            '> `/ecotop` — Leaderboard de los más ricos del server\n\n' +

            '**🎵 Música DJ de Alta Calidad:**\n' +
            '> `/play <canción/URL>` — Reproducí desde YouTube o Spotify\n' +
            '> `/filter <filtro>` — Agregale **Filtros** (Bassboost, Nightcore, 8D, etc)\n' +
            '> `/volumen`, `/queue`, `/skip`, `/stop`, `/pause` — Control de la música\n\n' +

            '**🎮 Juegos y Diversión:**\n' +
            '> `/blackjack <apuesta>` — **¡Nuevo!** Jugá al Blackjack contra el bot\n' +
            '> `/buscar-grupo` — **¡Nuevo!** Buscá gente para jugar, el bot avisa al llenarse\n' +
            '> `/tictactoe`, `/rps`, `/coinflip`, `/8ball` — Mini-juegos clásicos\n' +
            '> `/confesion` — Enviá una confesión y un secreto de forma 100% anónima\n\n' +

            '**🔧 Comunidad:**\n' +
            '> 🎂 `/cumple <DD/MM>` — Registrá tu cumpleaños para recibir Auto-Rol festivo\n' +
            '> `/nivel` / `/top` — Revisá tu XP y tu puesto en el Leaderboard de actividad\n' +
            '> `/afk` — Avisale al resto que no estás en el teclado\n' +
            '> `/ping`, `/serverinfo`, `/userinfo`, `/avatar` — Info útil\n\n' +

            '**🎙️ Salas Privadas Temporales:**\n' +
            '> Entrando al canal `➕ Crear Sala`, el bot te creará tu propio canal temporal. Además, te asignará **Automáticamente un estado Troll/Gaming**.\n\n' +

            '🔗 *Para ver toda esta información en cualquier momento, escribí el comando:* `/ayuda`'
        )
        .setImage('https://raw.githubusercontent.com/SkuuIll/Prophet-Setup-DS/main/assets/banner.png')
        .setFooter({ text: 'Prophet Gaming · Actualización v2.5' })
        .setTimestamp();

    try {
        await channel.send({ content: '@everyone', embeds: [embed] });
        console.log('Mensaje enviado exitosamente.');
    } catch (e) {
        console.error('Error enviando: ', e);
    }

    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
