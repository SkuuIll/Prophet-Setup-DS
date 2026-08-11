const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { getChannel } = require('../utils/runtimeConfig');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('clientReady', async () => {
    console.log(`Bot conectado como ${client.user.tag}`);

    try {
        const guild = client.guilds.cache.get(config.GUILD_ID);
        if (!guild) {
            console.error('Servidor no encontrado');
            process.exit(1);
        }

        await guild.channels.fetch();
        const channel = getChannel(guild, 'ANUNCIOS') || getChannel(guild, 'COMANDOS_BOT');
        if (!channel) {
            console.error('Canal no encontrado');
            process.exit(1);
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setTitle('🚀 ¡BIENVENIDOS A PROPHET GAMES HUB v3.0! 🎮')
            .setDescription(
                '¡Llegó la nueva plataforma de **Mini-Juegos Web y Discord Activities** en tiempo real para toda la comunidad de **Prophet Gaming**!\n\n' +
                'Todos los juegos están integrados a la economía del servidor: apostá, ganá monedas de Discord y competí por el podio.'
            )
            .addFields(
                {
                    name: '🕹️ 1. Tycoon de Servidores (Idle)',
                    value: 'Administrá racks de servidores con LEDs, contratá personal automatizado y generá ganancias pasivas incluso estando offline.',
                    inline: false
                },
                {
                    name: '🎰 2. Casino Web Prophet',
                    value: '• **Crash (Aviator):** Multiplicador en vivo Provably Fair.\n• **Ruleta Europea:** 37 números y tapete de apuestas.\n• **Cajas CS2:** Apertura con carrete animado.',
                    inline: false
                },
                {
                    name: '🎨 3. Trivia Party Game (Estilo Kahoot)',
                    value: 'Salas multijugador con PIN en vivo de 15s de velocidad. Gaming, memes y lore con premios de hasta 🪙 2,500 monedas.',
                    inline: false
                },
                {
                    name: '🃏 4. Truco Argentino & Blackjack',
                    value: '• **Truco:** Mazo de 40 cartas, Envido, Truco y tanteador.\n• **Blackjack 21:** Mesas contra el Dealer con pago 3:2.',
                    inline: false
                },
                {
                    name: '👾 5. Prophet Survivor 2D (Arcade Roguelite)',
                    value: 'Supervivencia a 60 FPS en Canvas con auto-ataque, gemas de XP, cartas de nivel y ranking global de récords.',
                    inline: false
                }
            )
            .setFooter({
                text: 'Usá /jugar para abrir tu portal de sesión seguro',
                iconURL: guild.iconURL()
            })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        console.log(`✅ Anuncio de Prophet Games Hub enviado exitosamente a #${channel.name}`);
        process.exit(0);
    } catch (err) {
        console.error('Error al enviar anuncio:', err);
        process.exit(1);
    }
});

client.login(process.env.DISCORD_TOKEN);
