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

    const channel = guild.channels.cache.find(c => c.name === config.CHANNELS.BIENVENIDOS);

    if (!channel) {
        console.log('Canal de bienvenidas no encontrado.');
        process.exit(1);
    }

    const embed = new EmbedBuilder()
        .setColor(config.COLORES.PRINCIPAL)
        .setAuthor({ name: '👋 Bienvenida Oficial a Prophet Gaming', iconURL: client.user.displayAvatarURL() })
        .setTitle('¡Te damos la bienvenida a nuestra comunidad!')
        .setDescription(
            '¡Hola! Es un gustazo tenerte acá en **Prophet Gaming**. Somo una comunidad enfocada en Gaming, pasarla bien, jugar en equipo y armar altas charlas. Para que te vayas ubicando rápido, acá tenés los pasos más importantes:\n\n' +

            '**📜 1. Pasá por las Reglas:**\n' +
            `> Es fundamental mantener el buen rollo, leélas en <#${config.CHANNELS.REGLAS}> para evitar castigos o baneos.\n\n` +

            '**🎮 2. Las Salas Privadas (Join-To-Create):**\n' +
            '> Como acabás de llegar, debés saber que podés crear TU propia sala de voz privada con control total. Solo conectate al canal de voz `➕ Crear Sala` y el bot la genera por vos en un segundo.\n\n' +

            '**💰 3. Tu propia economía y niveles:**\n' +
            '> Ganá monedas escribiendo en el chat y trabajando en nuestro bot. ¡Apostá en el casino, ganá juegos como el Blackjack, y comprá los mejores **Roles** en nuestra tienda virtual!\n\n' +

            '**🎵 4. La mejor música DJ:**\n' +
            `> Usá los comandos de música o entrate a una sala y poné \`/play\` para traer todos tus temas de Spotify o YouTube con alta calidad y filtros.`
        )
        .setImage('https://raw.githubusercontent.com/SkuuIll/Prophet-Setup-DS/main/assets/banner.png')
        .setFooter({ text: 'Prophet Gaming · Que la pases genial' })
        .setTimestamp();

    try {
        await channel.send({ embeds: [embed] });
        console.log('Mensaje de bienvenida enviado exitosamente.');
    } catch (e) {
        console.error('Error enviando: ', e);
    }

    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
