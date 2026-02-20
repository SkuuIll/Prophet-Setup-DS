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

    // Canales (nuevos nombres del rediseño)
    config.CHANNELS.REGLAS = buscarCanal('📜・reglas')?.id;
    config.CHANNELS.BIENVENIDOS = buscarCanal('👋・bienvenidos')?.id;
    config.CHANNELS.ANUNCIOS = buscarCanal('📢・anuncios')?.id;
    config.CHANNELS.ROLES = buscarCanal('🏷️・roles')?.id;
    config.CHANNELS.CHAT = buscarCanal('💬・chat')?.id;
    config.CHANNELS.CHAT_VIP = buscarCanal('💎・chat-vip')?.id;
    config.CHANNELS.MULTIMEDIA = buscarCanal('🖼️・multimedia')?.id;
    config.CHANNELS.SOPORTE = buscarCanal('❓・soporte')?.id;
    config.CHANNELS.COMANDOS_BOT = buscarCanal('🤖・bot-comandos')?.id;
    config.CHANNELS.STREAMS = buscarCanal('🖥️・streams')?.id;
    config.CHANNELS.LOGS = buscarCanal('⚙️・logs')?.id;

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

// ═══ INICIALIZAR MÚSICA (discord-player v7 + yt-dlp) ═══
async function inicializarMusica() {
    try {
        const { Player } = require('discord-player');
        const { DefaultExtractors } = require('@discord-player/extractor');
        const { spawn } = require('child_process');
        const { Readable } = require('stream');


        // Crear instancia del Player
        client.player = new Player(client, {
            skipFFmpeg: false,
            ytdlOptions: {
                quality: 'highestaudio',
                highWaterMark: 1 << 25,
            },
        });

        // Intentar cargar YoutubeiExtractor para BÚSQUEDA y metadata de YouTube
        try {
            const { YoutubeiExtractor } = require('discord-player-youtubei');
            await client.player.extractors.register(YoutubeiExtractor, {
                streamOptions: {
                    useClient: 'ANDROID',
                },
            });
            console.log('✅ YoutubeiExtractor cargado (búsqueda + metadata)');
        } catch (ytErr) {
            console.warn('⚠️ discord-player-youtubei no disponible:', ytErr.message);
        }

        // Cargar extractores adicionales (Spotify, SoundCloud, etc.)
        await client.player.extractors.loadMulti(DefaultExtractors);

        // ═══ HOOK: Usar yt-dlp para obtener el stream de audio ═══
        // discord-player v7 usa un registro global para onBeforeCreateStream
        const { onBeforeCreateStream } = require('discord-player');

        onBeforeCreateStream(async (track, queryType, queue) => {
            // Solo usar yt-dlp para URLs de YouTube
            if (!track.url || !track.url.includes('youtube.com/watch')) {
                return null; // dejar que el extractor por defecto maneje
            }

            try {
                console.log(`🎵 [yt-dlp] Obteniendo stream para: ${track.title}`);

                // Obtener URL directa de audio con yt-dlp
                const audioUrl = await new Promise((resolve, reject) => {
                    const proc = spawn('yt-dlp', [
                        '-f', 'bestaudio[ext=webm]/bestaudio',
                        '--get-url',
                        '--no-warnings',
                        '--force-ipv4',
                        track.url
                    ]);

                    let stdout = '';
                    let stderr = '';
                    proc.stdout.on('data', d => stdout += d.toString());
                    proc.stderr.on('data', d => stderr += d.toString());
                    proc.on('close', code => {
                        if (code === 0 && stdout.trim()) {
                            resolve(stdout.trim().split('\n')[0]);
                        } else {
                            reject(new Error(`yt-dlp falló (code ${code}): ${stderr}`));
                        }
                    });
                    proc.on('error', reject);

                    // Timeout de 15 segundos
                    setTimeout(() => { proc.kill(); reject(new Error('yt-dlp timeout')); }, 15000);
                });

                console.log(`🎵 [yt-dlp] URL obtenida OK, pasando a discord-player...`);

                // Retornar la URL directa — discord-player se encarga de FFmpeg
                return {
                    stream: audioUrl,
                    type: 'url',
                };
            } catch (err) {
                console.error(`❌ [yt-dlp] Error: ${err.message}`);
                return null; // fallback al extractor por defecto
            }
        });

        // ═══════════════════════════════════════════════════════════
        //  🎵 SISTEMA DE MÚSICA — PROPHET MUSIC ENGINE v3.0
        //  Diseño premium con controles interactivos
        // ═══════════════════════════════════════════════════════════
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

        // Historial de canciones por guild para botón "anterior"
        const musicHistory = new Map();

        // Referencia al mensaje "Now Playing" activo por guild
        const nowPlayingMessages = new Map();

        const { stmts } = require('./database');

        // ─── Constantes de diseño ───
        const MUSIC_COLORS = {
            PLAYING: 0xBB86FC,   // Violeta premium
            PAUSED: 0xFFB74D,   // Ámbar cálido
            QUEUE_ADD: 0x69F0AE,   // Verde menta
            QUEUE_EMPTY: 0x546E7A,   // Gris azulado
            DISCONNECT: 0x37474F,   // Gris oscuro
            ERROR: 0xEF5350,   // Rojo suave
            SKIP: 0xFFD54F,   // Amarillo dorado
        };

        const MUSIC_BANNER = 'https://raw.githubusercontent.com/SkuuIll/Prophet-Setup-DS/main/assets/music_banner.png';

        // ─── Utilidades visuales ───
        function barraVolumen(vol) {
            const bloques = 10;
            const lleno = Math.round((vol / 100) * bloques);
            const vacio = bloques - lleno;
            const barra = '▰'.repeat(lleno) + '▱'.repeat(vacio);
            let icono = '🔇';
            if (vol > 0 && vol <= 30) icono = '🔈';
            else if (vol > 30 && vol <= 70) icono = '🔉';
            else if (vol > 70) icono = '🔊';
            return `${icono} ${barra} \`${vol}%\``;
        }

        function formatearTitulo(titulo, max = 42) {
            if (titulo.length <= max) return titulo;
            return titulo.substring(0, max - 1) + '…';
        }

        function iconoPlataforma(url) {
            if (!url) return '🎵';
            if (url.includes('youtube.com') || url.includes('youtu.be')) return '<:yt:🔴>';
            if (url.includes('spotify.com')) return '🟢';
            if (url.includes('soundcloud.com')) return '🟠';
            return '🎵';
        }

        // ─── Función para crear el embed de "Reproduciendo ahora" ───
        function crearNowPlayingEmbed(queue, track) {
            const tracks = queue.tracks.toArray();
            const history = musicHistory.get(queue.guild.id) || [];
            const isPaused = queue.node.isPaused();

            const loopIcons = ['▷ Desactivado', '🔂 Tema actual', '🔁 Cola completa'];
            const loopStatus = loopIcons[queue.repeatMode] || loopIcons[0];

            // ─── Sección principal ───
            let description = '';

            // Artista y duración en una línea elegante
            description += `🎙️ **${track.author || 'Artista desconocido'}**\n`;
            description += `⏱️ Duración: \`${track.duration}\`\n\n`;

            // Volumen visual
            description += `${barraVolumen(queue.node.volume)}\n`;
            description += `${loopStatus}  ·  ${isPaused ? '⏸️ En pausa' : '▶️ Reproduciendo'}\n`;

            // ─── Cola de reproducción ───
            description += '\n```\n─────── 🎶 Siguiente ───────\n```\n';

            if (tracks.length > 0) {
                const nextTracks = tracks.slice(0, 5);
                nextTracks.forEach((t, i) => {
                    const num = `${i + 1}`.padStart(2, '0');
                    const titulo = formatearTitulo(t.title, 36);
                    description += `\`${num}\` [${titulo}](${t.url})  ·  \`${t.duration}\`\n`;
                });
                if (tracks.length > 5) {
                    description += `\n> *…y \`${tracks.length - 5}\` tema${tracks.length - 5 !== 1 ? 's' : ''} más esperando*\n`;
                }
            } else {
                description += '> *No hay temas en espera — Usá \`/play\` para agregar*\n';
            }

            // ─── Historial reciente ───
            if (history.length > 0) {
                description += '\n```\n──────── ⏮️ Anterior ────────\n```\n';
                const recentHistory = history.slice(-3).reverse();
                recentHistory.forEach((t, i) => {
                    const titulo = formatearTitulo(t.title, 36);
                    description += `\`${i + 1}.\` ${titulo}  ·  \`${t.duration}\`\n`;
                });
            }

            const embed = new EmbedBuilder()
                .setColor(isPaused ? MUSIC_COLORS.PAUSED : MUSIC_COLORS.PLAYING)
                .setAuthor({
                    name: isPaused ? '⏸️  Música en pausa' : '♫  Reproduciendo ahora',
                    iconURL: track.requestedBy?.displayAvatarURL?.({ size: 32 }) || undefined
                })
                .setTitle(`${track.title}`)
                .setURL(track.url)
                .setThumbnail(track.thumbnail)
                .setDescription(description)
                .addFields(
                    {
                        name: '👤 Pedida por',
                        value: `<@${track.requestedBy?.id || '0'}>`,
                        inline: true
                    },
                    {
                        name: '📋 En cola',
                        value: `\`${tracks.length}\` tema${tracks.length !== 1 ? 's' : ''}`,
                        inline: true
                    },
                    {
                        name: '📊 Reproducidas',
                        value: `\`${history.length}\` tema${history.length !== 1 ? 's' : ''}`,
                        inline: true
                    },
                )
                .setImage(MUSIC_BANNER)
                .setFooter({
                    text: `Prophet Music  ·  /play para agregar  ·  /queue para ver la cola`
                })
                .setTimestamp();

            return embed;
        }

        // ─── Función para crear los botones de control ───
        function crearBotonesMusica(queue) {
            const isPaused = queue.node.isPaused();
            const history = musicHistory.get(queue.guild.id) || [];
            const loopMode = queue.repeatMode;

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('music_prev')
                    .setLabel('Anterior')
                    .setEmoji('⏮️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(history.length === 0),
                new ButtonBuilder()
                    .setCustomId('music_pause')
                    .setLabel(isPaused ? 'Reanudar' : 'Pausar')
                    .setEmoji(isPaused ? '▶️' : '⏸️')
                    .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setLabel('Saltar')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setLabel('Detener')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('music_replay')
                    .setLabel('Reiniciar')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary),
            );

            const loopLabels = ['Loop: Off', 'Loop: Tema', 'Loop: Cola'];
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setLabel(loopLabels[loopMode] || 'Loop: Off')
                    .setEmoji('🔁')
                    .setStyle(loopMode > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setLabel('Mezclar')
                    .setEmoji('🔀')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_voldown')
                    .setLabel('Vol −')
                    .setEmoji('🔉')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_volup')
                    .setLabel('Vol +')
                    .setEmoji('🔊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_queue')
                    .setLabel('Cola')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Secondary),
            );

            return [row1, row2];
        }

        // ─── Función para actualizar el mensaje now playing ───
        async function actualizarNowPlaying(queue) {
            const guildId = queue.guild.id;
            const data = nowPlayingMessages.get(guildId);
            const msgRef = data?.msg;
            if (!msgRef || !queue.currentTrack) return;

            try {
                const embed = crearNowPlayingEmbed(queue, queue.currentTrack);
                const rows = crearBotonesMusica(queue);
                await msgRef.edit({ embeds: [embed], components: rows });
            } catch (err) {
                // El mensaje puede haber sido borrado
            }
        }

        // ─── Setup Collector Helper ───
        function setupCollector(msg, guildId) {
            const collector = msg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 24 * 60 * 60 * 1000
            });

            collector.on('collect', async i => {
                try {
                    if (i.member.voice.channelId && i.member.voice.channelId !== i.guild.members.me?.voice?.channelId) {
                        return i.reply({
                            content: '> ❌ **Acceso denegado** — Tenés que estar en el mismo canal de voz para controlar la música.',
                            ephemeral: true
                        });
                    }

                    const currentQueue = client.player.queues.get(i.guild.id);
                    if (!currentQueue || (!currentQueue.isPlaying() && i.customId !== 'music_queue')) {
                        return i.reply({
                            content: '> ❌ **Sin reproducción activa** — No hay nada sonando en este momento.',
                            ephemeral: true
                        });
                    }

                    switch (i.customId) {
                        case 'music_prev': {
                            const hist = musicHistory.get(guildId) || [];
                            if (hist.length === 0) {
                                return i.reply({ content: '> ❌ No hay temas anteriores en el historial.', ephemeral: true });
                            }
                            const prevTrack = hist.pop();
                            musicHistory.set(guildId, hist);
                            currentQueue.insertTrack(prevTrack, 0);
                            currentQueue.node.skip();
                            await i.reply({
                                content: `> ⏮️ **Volviendo a:** ${prevTrack.title}`,
                                ephemeral: true
                            });
                            break;
                        }

                        case 'music_pause': {
                            const wasPaused = currentQueue.node.isPaused();
                            wasPaused ? currentQueue.node.resume() : currentQueue.node.pause();
                            await actualizarNowPlaying(currentQueue);
                            await i.reply({
                                content: wasPaused
                                    ? '> ▶️ **Reproducción reanudada**'
                                    : '> ⏸️ **Música pausada**',
                                ephemeral: true
                            });
                            break;
                        }

                        case 'music_skip': {
                            const skippedTrack = currentQueue.currentTrack;
                            await i.reply({
                                content: `> ⏭️ **Saltada:** ${skippedTrack?.title || 'Canción'}\n> Saltada por ${i.user}`,
                                ephemeral: true
                            });
                            currentQueue.node.skip();
                            break;
                        }

                        case 'music_stop': {
                            currentQueue.delete();
                            await i.reply({
                                content: '> ⏹️ **Reproducción detenida** — Nos vemos la próxima 👋',
                                ephemeral: true
                            });
                            break;
                        }

                        case 'music_replay': {
                            currentQueue.node.seek(0);
                            await i.reply({
                                content: `> 🔄 **Reiniciando:** ${currentQueue.currentTrack?.title}`,
                                ephemeral: true
                            });
                            break;
                        }

                        case 'music_loop': {
                            const modeNames = [
                                '> ▷ **Loop desactivado** — Reproducción normal',
                                '> 🔂 **Loop de tema** — Se repite la canción actual',
                                '> 🔁 **Loop de cola** — Se repite toda la lista'
                            ];
                            const nextMode = (currentQueue.repeatMode + 1) % 3;
                            currentQueue.setRepeatMode(nextMode);
                            await actualizarNowPlaying(currentQueue);
                            await i.reply({ content: modeNames[nextMode], ephemeral: true });
                            break;
                        }

                        case 'music_shuffle': {
                            currentQueue.tracks.shuffle();
                            await actualizarNowPlaying(currentQueue);
                            await i.reply({
                                content: '> 🔀 **Cola mezclada** — El orden fue aleatorizado',
                                ephemeral: true
                            });
                            break;
                        }

                        case 'music_voldown': {
                            const newVol = Math.max(0, currentQueue.node.volume - 10);
                            currentQueue.node.setVolume(newVol);
                            await actualizarNowPlaying(currentQueue);
                            await i.reply({
                                content: `> ${barraVolumen(newVol)}`,
                                ephemeral: true
                            });
                            break;
                        }

                        case 'music_volup': {
                            const newVol = Math.min(100, currentQueue.node.volume + 10);
                            currentQueue.node.setVolume(newVol);
                            await actualizarNowPlaying(currentQueue);
                            await i.reply({
                                content: `> ${barraVolumen(newVol)}`,
                                ephemeral: true
                            });
                            break;
                        }

                        case 'music_queue': {
                            const tracks = currentQueue.tracks.toArray();
                            const hist = musicHistory.get(guildId) || [];
                            const current = currentQueue.currentTrack;

                            let desc = '';
                            desc += `**♫ Sonando ahora:**\n`;
                            desc += `> [${current.title}](${current.url})  ·  \`${current.duration}\`\n`;
                            desc += `> 🎙️ ${current.author || 'Desconocido'}  ·  Pedida por <@${current.requestedBy?.id || '0'}>\n\n`;

                            if (tracks.length > 0) {
                                desc += '**📋 Siguiente en la cola:**\n';
                                tracks.slice(0, 10).forEach((t, idx) => {
                                    const num = `${idx + 1}`.padStart(2, '0');
                                    const titulo = formatearTitulo(t.title, 40);
                                    desc += `\`${num}\` [${titulo}](${t.url})  ·  \`${t.duration}\`\n`;
                                });
                                if (tracks.length > 10) {
                                    desc += `\n> *…y \`${tracks.length - 10}\` temas más en espera*\n`;
                                }
                            } else {
                                desc += '*La cola está vacía — Usá `/play` para seguir agregando temas*\n';
                            }

                            if (hist.length > 0) {
                                desc += '\n**⏮️ Últimas reproducidas:**\n';
                                hist.slice(-5).reverse().forEach((t, idx) => {
                                    const titulo = formatearTitulo(t.title, 40);
                                    desc += `\`${idx + 1}.\` ${titulo}  ·  \`${t.duration}\`\n`;
                                });
                            }

                            // Calcular duración total de la cola
                            const totalTracks = tracks.length;

                            const queueEmbed = new EmbedBuilder()
                                .setColor(MUSIC_COLORS.PLAYING)
                                .setAuthor({ name: '📋  Cola de reproducción', iconURL: i.user.displayAvatarURL({ size: 32 }) })
                                .setDescription(desc)
                                .addFields(
                                    { name: '📊 En cola', value: `\`${totalTracks}\` temas`, inline: true },
                                    { name: '🎵 Reproducidas', value: `\`${hist.length}\` temas`, inline: true },
                                    { name: '🔊 Volumen', value: `\`${currentQueue.node.volume}%\``, inline: true },
                                )
                                .setFooter({ text: 'Prophet Music  ·  Cola de reproducción' })
                                .setTimestamp();

                            await i.reply({ embeds: [queueEmbed], ephemeral: true });
                            break;
                        }
                    }
                } catch (err) {
                    console.error('Error en botón de música:', err.message);
                    if (!i.replied && !i.deferred) {
                        await i.reply({ content: '> ⚠️ Ocurrió un error al procesar la acción.', ephemeral: true }).catch(() => { });
                    }
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'renew') return;
                const data = nowPlayingMessages.get(guildId);
                if (data && data.msg.id === msg.id) {
                    msg.edit({ components: [] }).catch(() => { });
                    nowPlayingMessages.delete(guildId);
                }
            });

            return collector;
        }

        // ─── Evento: Nueva canción empieza a sonar ───
        client.player.events.on('playerStart', async (queue, track) => {
            if (!queue.metadata?.channel) return;
            const guildId = queue.guild.id;

            stmts.addLog('MUSIC_START', {
                song: track.title,
                url: track.url,
                requestedBy: track.requestedBy?.tag || 'Unknown'
            });

            const embed = crearNowPlayingEmbed(queue, track);
            const rows = crearBotonesMusica(queue);

            const data = nowPlayingMessages.get(guildId);

            // Intentar actualizar mensaje existente
            if (data && data.msg) {
                try {
                    if (data.collector) data.collector.stop('renew');

                    const msg = data.msg;
                    await msg.edit({ embeds: [embed], components: rows });

                    const newCollector = setupCollector(msg, guildId);
                    nowPlayingMessages.set(guildId, { msg, collector: newCollector });

                    if (!musicHistory.has(guildId)) musicHistory.set(guildId, []);
                    return;
                } catch (e) {
                    nowPlayingMessages.delete(guildId);
                }
            }

            // Enviar nuevo mensaje si no había uno o falló la edición
            queue.metadata.channel.send({ embeds: [embed], components: rows }).then(msg => {
                const collector = setupCollector(msg, guildId);
                nowPlayingMessages.set(guildId, { msg, collector });
            });

            if (!musicHistory.has(guildId)) {
                musicHistory.set(guildId, []);
            }
        });

        // ─── Evento: Track agregado a la cola ───
        client.player.events.on('audioTrackAdd', (queue, track) => {
            if (!queue.metadata?.channel) return;

            const tracks = queue.tracks.toArray();
            const position = tracks.findIndex(t => t.id === track.id) + 1;

            const embed = new EmbedBuilder()
                .setColor(MUSIC_COLORS.QUEUE_ADD)
                .setAuthor({ name: '✦  Agregada a la cola' })
                .setTitle(track.title)
                .setURL(track.url)
                .setThumbnail(track.thumbnail)
                .setDescription(
                    `🎙️ **${track.author || 'Artista desconocido'}**\n` +
                    `⏱️ Duración: \`${track.duration}\`  ·  Posición: \`#${position || tracks.length}\`\n\n` +
                    `> Pedida por <@${track.requestedBy?.id || '0'}>`
                )
                .setFooter({
                    text: `${tracks.length} tema${tracks.length !== 1 ? 's' : ''} en cola  ·  Prophet Music`
                })
                .setTimestamp();

            // Auto-borrar después de 12 segundos para mantener el canal limpio
            queue.metadata.channel.send({ embeds: [embed] }).then(msg => {
                setTimeout(() => msg.delete().catch(() => { }), 12000);
            });

            // Actualizar el embed principal para reflejar la cola actualizada
            actualizarNowPlaying(queue);
        });

        // ─── Guardar historial cuando cambia de canción ───
        client.player.events.on('playerFinish', (queue, track) => {
            const guildId = queue.guild.id;
            if (!musicHistory.has(guildId)) musicHistory.set(guildId, []);
            const hist = musicHistory.get(guildId);
            hist.push(track);
            if (hist.length > 50) hist.shift();
        });

        // ─── Eventos de error (embeds premium) ───
        client.player.events.on('error', (queue, error) => {
            console.error(`❌ Error de player: ${error.message}`);
            console.error('   Stack:', error.stack);
            if (queue?.metadata?.channel) {
                const embed = new EmbedBuilder()
                    .setColor(MUSIC_COLORS.ERROR)
                    .setAuthor({ name: '⚠️  Error de reproducción' })
                    .setDescription(`> \`${error.message}\`\n\nEl reproductor intentará continuar con el siguiente tema.`)
                    .setFooter({ text: 'Prophet Music  ·  Error handler' })
                    .setTimestamp();
                queue.metadata.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => { }), 10000));
            }
        });

        client.player.events.on('playerError', (queue, error, track) => {
            console.error(`❌ Error de conexión: ${error.message}`);
            console.error('   Stack:', error.stack);
            console.error('   Track:', track?.title, track?.url);
            if (queue?.metadata?.channel) {
                const embed = new EmbedBuilder()
                    .setColor(MUSIC_COLORS.ERROR)
                    .setAuthor({ name: '⚠️  Error de conexión' })
                    .setDescription(
                        `No se pudo conectar al stream de audio.\n` +
                        `> **Tema:** ${track?.title || 'Desconocido'}\n` +
                        `> **Error:** \`${error.message}\``
                    )
                    .setFooter({ text: 'Prophet Music  ·  Error handler' })
                    .setTimestamp();
                queue.metadata.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => { }), 10000));
            }
        });

        client.player.events.on('playerSkip', (queue, track) => {
            console.warn(`⏭️ Track saltado (no se pudo reproducir): ${track.title}`);
            if (queue?.metadata?.channel) {
                const embed = new EmbedBuilder()
                    .setColor(MUSIC_COLORS.SKIP)
                    .setDescription(`> ⏭️ **${formatearTitulo(track.title, 50)}** no se pudo reproducir y fue saltada automáticamente.`)
                    .setTimestamp();
                queue.metadata.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => { }), 8000));
            }
        });

        // ─── Eventos informativos ───
        client.player.events.on('emptyQueue', (queue) => {
            console.log('📭 Cola vacía');
            const guildId = queue.guild.id;
            const history = musicHistory.get(guildId) || [];

            stmts.addLog('MUSIC_END', { guildId, reason: 'Queue empty' });

            if (queue.metadata?.channel) {
                let desc = '> La cola terminó. Usá `/play` para seguir escuchando.\n';

                // Mostrar mini-resumen de la sesión
                if (history.length > 0) {
                    desc += `\n**📊 Resumen de sesión:**\n`;
                    desc += `> 🎵 \`${history.length}\` temas reproducidos\n`;
                    const lastTrack = history[history.length - 1];
                    if (lastTrack) {
                        desc += `> 🔚 Último tema: *${formatearTitulo(lastTrack.title, 40)}*\n`;
                    }
                }

                const embed = new EmbedBuilder()
                    .setColor(MUSIC_COLORS.QUEUE_EMPTY)
                    .setAuthor({ name: '📭  Cola finalizada' })
                    .setDescription(desc)
                    .setFooter({ text: 'Prophet Music  ·  ¡Gracias por escuchar!' })
                    .setTimestamp();

                const data = nowPlayingMessages.get(guildId);
                if (data && data.msg) {
                    try {
                        if (data.collector) data.collector.stop('renew');
                        data.msg.edit({ embeds: [embed], components: [] }).catch(() => { });
                    } catch (e) { }
                    nowPlayingMessages.delete(guildId);
                } else {
                    queue.metadata.channel.send({ embeds: [embed] });
                }
            }
        });

        client.player.events.on('disconnect', (queue) => {
            console.log('🔌 Bot desconectado del canal de voz');
            const guildId = queue.guild.id;
            const history = musicHistory.get(guildId) || [];

            stmts.addLog('MUSIC_DISCONNECT', { guildId });

            const data = nowPlayingMessages.get(guildId);
            if (data && data.msg) {
                try {
                    if (data.collector) data.collector.stop('renew');

                    if (data.msg.editable) {
                        let desc = '> El bot se desconectó del canal de voz.\n';
                        if (history.length > 0) {
                            desc += `\n**📊 Sesión finalizada:**\n`;
                            desc += `> 🎵 \`${history.length}\` temas reproducidos\n`;
                            desc += '\n**⏮️ Últimos temas:**\n';
                            history.slice(-3).reverse().forEach((t, idx) => {
                                desc += `> \`${idx + 1}.\` ${formatearTitulo(t.title, 38)}  ·  \`${t.duration}\`\n`;
                            });
                        }

                        const disconnectEmbed = new EmbedBuilder()
                            .setColor(MUSIC_COLORS.DISCONNECT)
                            .setAuthor({ name: '🔌  Desconectado' })
                            .setDescription(desc)
                            .setFooter({ text: 'Prophet Music  ·  Sesión terminada' })
                            .setTimestamp();

                        data.msg.edit({ embeds: [disconnectEmbed], components: [] }).catch(() => { });
                    }
                } catch (e) { }
                nowPlayingMessages.delete(guildId);
            }

            musicHistory.delete(guildId);
        });

        client.player.events.on('emptyChannel', (queue) => {
            console.log('👻 Canal de voz vacío, pero me quedo esperando...');
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

                        stmts.addLog('SYSTEM_UNBAN', { userId: tb.user_id, guildId: tb.guild_id });

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

    stmts.addLog('SYSTEM_BOOT', { version: '2.0.1', message: 'Prophet Bot iniciado correctamente' });
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
