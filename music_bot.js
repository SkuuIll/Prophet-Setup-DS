// ═══════════════════════════════════════════════════
//  PROPHET MUSIC BOT — Entry Point
//  Bot secundario dedicado exclusivamente a la música
// ═══════════════════════════════════════════════════

const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { stmts } = require('./database'); // Comparte la misma DB

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();
client.cooldowns = new Collection();

// ═══ CARGAR SOLO COMANDOS DE MÚSICA ═══
function cargarComandosMusica() {
    const rutaCarpeta = path.join(__dirname, 'commands', 'music');
    if (!fs.existsSync(rutaCarpeta)) return;
    
    let total = 0;
    const archivos = fs.readdirSync(rutaCarpeta).filter(f => f.endsWith('.js'));
    for (const archivo of archivos) {
        const comando = require(path.join(rutaCarpeta, archivo));
        if (comando.data && comando.execute) {
            client.commands.set(comando.data.name, comando);
            total++;
        }
    }
    console.log(`🎵 ${total} comandos de música cargados`);
}

// ═══ REGISTRAR SLASH COMMANDS ═══
async function registrarComandos() {
    const commands = [];
    client.commands.forEach(cmd => commands.push(cmd.data.toJSON()));

    const rest = new REST({ version: '10' }).setToken(config.MUSIC_TOKEN);

    try {
        console.log(`🔄 Registrando ${commands.length} slash commands para música...`);
        // Registramos globalmente (o localmente)
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, config.GUILD_ID),
            { body: commands }
        );
        console.log(`✅ ${commands.length} slash commands registrados`);
    } catch (err) {
        console.error('❌ Error registrando commands de música:', err.message);
    }
}

// ═══ INTERACTION CREATE (Sólo para comandos de música y botones de música) ═══
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const comando = client.commands.get(interaction.commandName);
            if (!comando) return;

            // Verificar canal
            const canalComandosId = config.CHANNELS.COMANDOS_BOT;
            // Permitimos ejecutar música en el canal de comandos o si es administrador
            
            const startedAt = Date.now();
            try {
                await comando.execute(interaction, client);
                const durationMs = Date.now() - startedAt;
                stmts.addLog('MUSIC_COMMAND', {
                    user: interaction.user.tag,
                    command: interaction.commandName,
                    channel: interaction.channel?.name || interaction.channelId,
                    durationMs,
                });
            } catch (error) {
                console.error(`Error en /${interaction.commandName}:`, error.message);
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setAuthor({ name: '⚠️  Error del sistema' })
                    .setDescription(`> Ocurrió un error al ejecutar \`/${interaction.commandName}\`.\n\`\`\`\n${error.message}\n\`\`\``);
                if (interaction.replied || interaction.deferred) await interaction.followUp({ embeds: [errorEmbed], flags: 64 });
                else await interaction.reply({ embeds: [errorEmbed], flags: 64 });
            }
        }
    } catch (e) {
        console.error("Error crítico procesando interacción de música:", e);
    }
});

// Cargar comandos antes de registrar
cargarComandosMusica();

// ═══ INICIO ═══
client.once('clientReady', async () => {
    console.log('═══════════════════════════════════════');
    console.log(`  🎵 Prophet Music Bot`);
    console.log(`  📡 ${client.user.tag}`);
    console.log('═══════════════════════════════════════');

    // Inicializar IDs básicos necesarios para música (solo los canales/roles vitales)
    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (guild) {
        const canalComandos = guild.channels.cache.find(c => c.name === config.CHANNELS.COMANDOS_BOT);
        if (canalComandos) config.CHANNELS.COMANDOS_BOT = canalComandos.id;
    }

    await registrarComandos();
    
    // Iniciar Motor de Música
    await require('./modules/musicEngine')(client);

    client.user.setActivity('🎵 Música en Prophet', { type: 2 }); // "Listening to"
    console.log('✅ Bot de música listo para operar 24/7 sin interrupciones.');
});

// ═══ INICIALIZAR SHOUKAKU ANTES DEL LOGIN ═══
const { crearShoukaku } = require('./modules/shoukakuEngine');
crearShoukaku(client);

// Login
if (!config.MUSIC_TOKEN) {
    console.error('❌ FATAL: No se encontró DISCORD_MUSIC_TOKEN en .env');
    process.exit(1);
}

client.login(config.MUSIC_TOKEN).catch(err => {
    console.error('❌ Error de login (Music Bot):', err.message);
    process.exit(1);
});
