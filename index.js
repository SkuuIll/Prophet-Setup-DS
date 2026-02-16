// ═══════════════════════════════════════════════════
//  PROPHET BOT v2.0 — Entry Point
//  Bot privado para Prophet Gaming
// ═══════════════════════════════════════════════════

const { Client, GatewayIntentBits, Collection, REST, Routes, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// ═══ CREAR CLIENTE ═══
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
    ],
    partials: [
        Partials.Message,
        Partials.Reaction,
        Partials.GuildMember,
    ],
});

// ═══ COLECCIONES ═══
client.commands = new Collection();
client.cooldowns = new Collection();
client.snipes = new Collection();
client.afk = new Collection();

// ═══ CARGAR COMANDOS ═══
function cargarComandos() {
    const carpetas = fs.readdirSync(path.join(__dirname, 'commands'));
    let total = 0;

    for (const carpeta of carpetas) {
        const rutaCarpeta = path.join(__dirname, 'commands', carpeta);
        if (!fs.statSync(rutaCarpeta).isDirectory()) continue;

        const archivos = fs.readdirSync(rutaCarpeta).filter(f => f.endsWith('.js'));
        for (const archivo of archivos) {
            const comando = require(path.join(rutaCarpeta, archivo));
            if (comando.data && comando.execute) {
                client.commands.set(comando.data.name, comando);
                total++;
            }
        }
    }
    console.log(`📦 ${total} comandos cargados`);
}

// ═══ CARGAR EVENTOS ═══
function cargarEventos() {
    const archivos = fs.readdirSync(path.join(__dirname, 'events')).filter(f => f.endsWith('.js'));
    let total = 0;

    for (const archivo of archivos) {
        const evento = require(path.join(__dirname, 'events', archivo));
        if (evento.once) {
            client.once(evento.name, (...args) => evento.execute(...args, client));
        } else {
            client.on(evento.name, (...args) => evento.execute(...args, client));
        }
        total++;
    }
    console.log(`⚡ ${total} eventos cargados`);
}

// ═══ REGISTRAR SLASH COMMANDS ═══
async function registrarComandos() {
    const commands = [];
    client.commands.forEach(cmd => commands.push(cmd.data.toJSON()));

    const rest = new REST({ version: '10' }).setToken(config.TOKEN);

    try {
        console.log(`🔄 Registrando ${commands.length} slash commands...`);
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, config.GUILD_ID),
            { body: commands }
        );
        console.log(`✅ ${commands.length} slash commands registrados`);
    } catch (err) {
        console.error('❌ Error registrando commands:', err.message);
        if (err.rawError) console.error('   Detalles:', JSON.stringify(err.rawError, null, 2));
    }
}

// ═══ RESOLVER IDs DE CANALES Y ROLES ═══
async function resolverIDs(guild) {
    await guild.channels.fetch();
    await guild.roles.fetch();

    const buscarCanal = (nombre) => guild.channels.cache.find(c => c.name === nombre);
    const buscarRol = (nombre) => guild.roles.cache.find(r => r.name === nombre);

    // Canales
    config.CHANNELS.BIENVENIDOS = buscarCanal('👋│bienvenidos')?.id;
    config.CHANNELS.LOGS = buscarCanal('🤖│logs-bots')?.id;
    config.CHANNELS.REGLAS = buscarCanal('📌│reglas')?.id;
    config.CHANNELS.ANUNCIOS = buscarCanal('📢│anuncios')?.id;
    config.CHANNELS.COMANDOS_BOT = buscarCanal('🤖│comandos-bot')?.id;
    config.SUGERENCIAS.CHANNEL_ID = buscarCanal('❓│preguntas')?.id; // Provisional

    // Roles
    config.ROLES.PROPHET = buscarRol('👑 Prophet')?.id;
    config.ROLES.STAFF = buscarRol('🛡️ Staff')?.id;
    config.ROLES.MODERADOR = buscarRol('⚔️ Moderador')?.id;
    config.ROLES.VIP = buscarRol('💎 VIP')?.id;
    config.ROLES.VETERANO = buscarRol('🌟 Veterano')?.id;
    config.ROLES.MIEMBRO = buscarRol('👤 Miembro')?.id;
    config.ROLES.NUEVO = buscarRol('🆕 Nuevo')?.id;
    config.ROLES.BOTS = buscarRol('🤖 Bots')?.id;

    console.log('🔗 IDs resueltos:');
    console.log('   Canales:', Object.entries(config.CHANNELS).filter(([, v]) => v).length, '/', Object.keys(config.CHANNELS).length);
    console.log('   Roles:', Object.entries(config.ROLES).filter(([, v]) => v).length, '/', Object.keys(config.ROLES).length);
}

// ═══ INICIALIZAR MÚSICA (discord-player v7) ═══
async function inicializarMusica() {
    try {
        const { Player } = require('discord-player');
        const { DefaultExtractors } = require('@discord-player/extractor');

        // Crear instancia del Player
        client.player = new Player(client, {
            skipFFmpeg: false,
        });

        // Intentar cargar extractor de YouTube (ad-free, via youtubei.js)
        try {
            const { YoutubeiExtractor } = require('discord-player-youtubei');
            await client.player.extractors.register(YoutubeiExtractor, {});
            console.log('✅ YoutubeiExtractor cargado correctamente');
        } catch (ytErr) {
            console.warn('⚠️ discord-player-youtubei no disponible, usando extractores por defecto:', ytErr.message);
        }

        // Cargar extractores adicionales (Spotify, SoundCloud, etc.)
        await client.player.extractors.loadMulti(DefaultExtractors);

        // Eventos de depuración
        client.player.events.on('playerStart', (queue, track) => {
            if (queue.metadata?.channel) {
                const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

                const embed = new EmbedBuilder()
                    .setColor(config.COLORES.MUSICA || 0x9B59B6)
                    .setTitle('🎵 Reproduciendo ahora')
                    .setDescription(`[${track.title}](${track.url})`)
                    .addFields(
                        { name: '⏱️ Duración', value: track.duration, inline: true },
                        { name: '👤 Pedida por', value: `${track.requestedBy?.username || 'Desconocido'}`, inline: true }
                    )
                    .setThumbnail(track.thumbnail)
                    .setFooter({ text: 'Prophet Gaming | Música v2' });

                // Botones de control
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('music_pause').setEmoji('⏯️').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('music_loop').setEmoji('🔁').setStyle(ButtonStyle.Secondary)
                );

                queue.metadata.channel.send({ embeds: [embed], components: [row] }).then(msg => {
                    // Collector para los botones
                    const collector = msg.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        time: track.durationMS || 600000 // Escuchar por la duración de la canción o 10 min
                    });

                    collector.on('collect', async i => {
                        try {
                            // Verificar que el usuario esté en el mismo canal de voz
                            if (!i.member.voice.channelId || i.member.voice.channelId !== i.guild.members.me?.voice?.channelId) {
                                return i.reply({ content: '❌ Tenés que estar en el mismo canal de voz que yo.', ephemeral: true });
                            }

                            switch (i.customId) {
                                case 'music_pause':
                                    queue.node.isPaused() ? queue.node.resume() : queue.node.pause();
                                    await i.update({ content: `⏯️ **${queue.node.isPaused() ? 'Pausado' : 'Reanudado'}** por ${i.user}` });
                                    break;
                                case 'music_skip':
                                    queue.node.skip();
                                    await i.update({ content: `⏭️ **Canción saltada** por ${i.user}`, components: [] });
                                    collector.stop();
                                    break;
                                case 'music_stop':
                                    queue.node.stop();
                                    await i.update({ content: `⏹️ **Música detenida** por ${i.user}`, components: [] });
                                    collector.stop();
                                    break;
                                case 'music_loop': {
                                    const mode = queue.repeatMode === 0 ? 1 : 0;
                                    queue.setRepeatMode(mode);
                                    await i.reply({ content: `🔁 Bucle: **${mode === 1 ? 'Activado (Canción)' : 'Desactivado'}**`, ephemeral: true });
                                    break;
                                }
                            }
                        } catch (err) {
                            console.error('Error en botón de música:', err.message);
                            try {
                                if (!i.replied && !i.deferred) {
                                    await i.reply({ content: '❌ Ocurrió un error al procesar la acción.', ephemeral: true });
                                }
                            } catch (e) { }
                        }
                    });
                });
            }
        });

        client.player.events.on('audioTrackAdd', (queue, track) => {
            if (queue.metadata?.channel) {
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor(config.COLORES.MUSICA || 0x9B59B6)
                    .setDescription(`✅ **${track.title}** agregada a la cola.`)
                    .setFooter({ text: `Duración: ${track.duration}` });
                queue.metadata.channel.send({ embeds: [embed] });
            }
        });

        client.player.events.on('error', (queue, error) => {
            console.error(`❌ Error de player: ${error.message}`);
            console.error('   Stack:', error.stack);
            if (queue?.metadata?.channel) queue.metadata.channel.send(`❌ Error de reproducción: \`${error.message}\``);
        });

        client.player.events.on('playerError', (queue, error) => {
            console.error(`❌ Error de conexión: ${error.message}`);
            console.error('   Stack:', error.stack);
            if (queue?.metadata?.channel) queue.metadata.channel.send(`❌ Error de conexión: \`${error.message}\``);
        });

        // Log de extractores cargados para depuración
        const extractors = client.player.extractors.store;
        console.log(`🎵 Extractores cargados: ${extractors.size}`);
        for (const [name] of extractors) {
            console.log(`   📦 ${name}`);
        }

        console.log('🎵 Sistema de música discord-player v7 inicializado');
    } catch (err) {
        console.log('⚠️  Error iniciando música:', err.message);
        console.error(err);
    }
}

// ═══ INICIO ═══
client.once('ready', async () => {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log(`  🤖 Prophet Bot v2.0`);
    console.log(`  📡 ${client.user.tag}`);
    console.log(`  📅 ${new Date().toLocaleString('es-AR')}`);
    console.log('═══════════════════════════════════════');
    console.log('');

    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (!guild) {
        console.error('❌ No se encontró el servidor. Verificá GUILD_ID en config.js');
        process.exit(1);
    }

    await resolverIDs(guild);
    await registrarComandos();
    await inicializarMusica();

    // Iniciar chequeo de sorteos
    const { verificarSorteos } = require('./modules/giveaways');
    setInterval(() => verificarSorteos(client), 30000); // Cada 30 segundos

    // ── Tempban expiry checker (cada 60s) ──
    const { stmts: dbStmts } = require('./database');
    setInterval(async () => {
        try {
            const expired = dbStmts.getActiveTempbans();
            for (const tb of expired) {
                try {
                    const targetGuild = client.guilds.cache.get(tb.guild_id);
                    if (targetGuild) {
                        await targetGuild.members.unban(tb.user_id, 'Tempban expirado - desbaneo automático');
                        console.log(`🔓 Tempban expirado: ${tb.user_id}`);
                        const logCh = targetGuild.channels.cache.get(config.CHANNELS.LOGS);
                        if (logCh) {
                            const { EmbedBuilder: EB } = require('discord.js');
                            const unbanEmbed = new EB()
                                .setColor(0x2ECC71)
                                .setTitle('🔓 **DESBANEO AUTOMÁTICO**')
                                .addFields(
                                    { name: '👤 Usuario', value: `<@${tb.user_id}>`, inline: true },
                                    { name: '📝 Ban original', value: tb.reason || 'Sin razón', inline: true }
                                )
                                .setFooter({ text: 'Prophet Gaming | Tempban expirado' })
                                .setTimestamp();
                            logCh.send({ embeds: [unbanEmbed] });
                        }
                    }
                    dbStmts.removeTempban(tb.guild_id, tb.user_id);
                } catch (e) {
                    console.error(`❌ Error desbaneando ${tb.user_id}:`, e.message);
                    dbStmts.removeTempban(tb.guild_id, tb.user_id);
                }
            }
        } catch (e) { console.error('❌ Error en tempban checker:', e.message); }
    }, 60000);

    console.log('');
    console.log('✅ Prophet Bot está listo');
    console.log(`🏠 Servidor: ${guild.name} (${guild.memberCount} miembros)`);
    console.log('');

    client.user.setActivity('Prophet Gaming 🎮', { type: 3 }); // "Watching"
});

// Cargar todo
cargarComandos();
cargarEventos();

// Manejo de errores global
process.on('unhandledRejection', (err) => {
    console.error('❌ Error no manejado:', err.message);
});

process.on('uncaughtException', (err) => {
    console.error('💀 Error fatal:', err.message);
    console.error(err.stack);
});

// Login
client.login(config.TOKEN).catch(err => {
    console.error('❌ Error de login:', err.message);
    process.exit(1);
});
