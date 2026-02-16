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

        // ═══ SISTEMA DE MÚSICA PREMIUM ═══
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

        // Historial de canciones por guild para botón "anterior"
        const musicHistory = new Map();

        // Referencia al mensaje "Now Playing" activo por guild
        const nowPlayingMessages = new Map();

        // ─── Función para crear el embed de "Reproduciendo ahora" ───
        function crearNowPlayingEmbed(queue, track) {
            const tracks = queue.tracks.toArray();
            const history = musicHistory.get(queue.guild.id) || [];

            const loopModes = ['❌ Off', '🔂 Canción', '🔁 Cola'];
            const loopStatus = loopModes[queue.repeatMode] || loopModes[0];
            const isPaused = queue.node.isPaused();

            // Info de cola — SIEMPRE visible
            let queueInfo = '\n\n━━━━━━━━━━━━━━━━━━━━━━\n📋 **Cola de reproducción:**\n';
            if (tracks.length > 0) {
                const nextTracks = tracks.slice(0, 5);
                nextTracks.forEach((t, i) => {
                    const titulo = t.title.length > 38 ? t.title.substring(0, 38) + '...' : t.title;
                    queueInfo += `\`${i + 1}.\` [${titulo}](${t.url}) — \`${t.duration}\`\n`;
                });
                if (tracks.length > 5) {
                    queueInfo += `\n*...y ${tracks.length - 5} tema${tracks.length - 5 !== 1 ? 's' : ''} más en cola*`;
                }
            } else {
                queueInfo += '*Cola vacía — Usá `/play` para agregar más temas* 🎶';
            }

            // Historial reciente
            if (history.length > 0) {
                queueInfo += '\n\n⏮️ **Reproducidos:**\n';
                history.slice(-3).reverse().forEach((t, i) => {
                    const titulo = t.title.length > 38 ? t.title.substring(0, 38) + '...' : t.title;
                    queueInfo += `\`${i + 1}.\` ${titulo} — \`${t.duration}\`\n`;
                });
            }

            const embed = new EmbedBuilder()
                .setColor(isPaused ? 0xFFA500 : (config.COLORES.MUSICA || 0x9B59B6))
                .setAuthor({
                    name: isPaused ? '⏸️ En pausa' : '🎵 Reproduciendo ahora',
                    iconURL: track.requestedBy?.displayAvatarURL?.() || undefined
                })
                .setTitle(track.title)
                .setURL(track.url)
                .setThumbnail(track.thumbnail)
                .setDescription(queueInfo)
                .addFields(
                    { name: '⏱️ Duración', value: `\`${track.duration}\``, inline: true },
                    { name: '👤 Pedida por', value: `<@${track.requestedBy?.id || '0'}>`, inline: true },
                    { name: '🎙️ Autor', value: track.author || 'Desconocido', inline: true },
                    { name: '🔊 Volumen', value: `\`${queue.node.volume}%\``, inline: true },
                    { name: '🔁 Loop', value: loopStatus, inline: true },
                    { name: '📋 En cola', value: `\`${tracks.length} tema${tracks.length !== 1 ? 's' : ''}\``, inline: true },
                )
                .setFooter({
                    text: `Prophet Gaming | Música v2 • ${history.length > 0 ? `${history.length} reproducido${history.length !== 1 ? 's' : ''}` : 'Sin historial'}`
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
                    .setEmoji('⏮️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(history.length === 0),
                new ButtonBuilder()
                    .setCustomId('music_pause')
                    .setEmoji(isPaused ? '▶️' : '⏸️')
                    .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('music_replay')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary),
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setEmoji('🔁')
                    .setStyle(loopMode > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setEmoji('🔀')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_voldown')
                    .setEmoji('🔉')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_volup')
                    .setEmoji('🔊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_queue')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Secondary),
            );

            return [row1, row2];
        }

        // ─── Función para actualizar el mensaje now playing ───
        async function actualizarNowPlaying(queue) {
            const guildId = queue.guild.id;
            const msgRef = nowPlayingMessages.get(guildId);
            if (!msgRef || !queue.currentTrack) return;

            try {
                const embed = crearNowPlayingEmbed(queue, queue.currentTrack);
                const rows = crearBotonesMusica(queue);
                await msgRef.edit({ embeds: [embed], components: rows });
            } catch (err) {
                // El mensaje puede haber sido borrado
            }
        }

        // ─── Evento: Nueva canción empieza a sonar ───
        client.player.events.on('playerStart', (queue, track) => {
            if (!queue.metadata?.channel) return;

            const guildId = queue.guild.id;

            // Borrar mensaje anterior de now playing si existe
            // Transformar mensaje anterior en historial en lugar de borrarlo
            const oldMsg = nowPlayingMessages.get(guildId);
            if (oldMsg) {
                try {
                    if (oldMsg.embeds[0]) {
                        const oldEmbed = EmbedBuilder.from(oldMsg.embeds[0])
                            .setColor(0x34495E) // Dark Blue/Grey para historial
                            .setAuthor({ name: '⏮️ Historial de reproducción' })
                            .setFooter({ text: 'Prophet Gaming | Finalizado' })
                            .setTimestamp(); // Mantener timestamp original o actualizar

                        const replayRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('music_replay_old')
                                .setLabel('Volver a escuchar')
                                .setEmoji('🔄')
                                .setStyle(ButtonStyle.Secondary)
                        );

                        oldMsg.edit({ embeds: [oldEmbed], components: [replayRow] }).catch(() => { });
                    } else {
                        oldMsg.delete().catch(() => { });
                    }
                } catch (e) {
                    oldMsg.delete().catch(() => { });
                }
                nowPlayingMessages.delete(guildId);
            }

            const embed = crearNowPlayingEmbed(queue, track);
            const rows = crearBotonesMusica(queue);

            queue.metadata.channel.send({ embeds: [embed], components: rows }).then(msg => {
                nowPlayingMessages.set(guildId, msg);

                // Collector permanente (se renueva con cada canción)
                const collector = msg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 24 * 60 * 60 * 1000 // 24 horas
                });

                collector.on('collect', async i => {
                    try {
                        // Verificar canal de voz: Permitir si el usuario está en el MISMO canal o en NINGUNO (control remoto)
                        // Solo bloquear si está en un canal DIFERENTE
                        if (i.member.voice.channelId && i.member.voice.channelId !== i.guild.members.me?.voice?.channelId) {
                            return i.reply({ content: '❌ Estás en otro canal de voz. Entrá al mío o desconectate para usar los controles.', ephemeral: true });
                        }

                        // Para los botones normales, verificar cola activa. Para replay_old, no es necesario.
                        if (i.customId !== 'music_replay_old') {
                            const currentQueue = client.player.queues.get(i.guild.id);
                            if (!currentQueue || !currentQueue.isPlaying()) {
                                return i.reply({ content: '❌ No hay nada reproduciéndose.', ephemeral: true });
                            }
                        }

                        // Obtener currentQueue nuevamente para usarlo dentro del switch si hace falta
                        // Nota: Para music_replay_old no usamos currentQueue del contexto actual sino el track del closure.
                        const currentQueue = client.player.queues.get(i.guild.id);

                        switch (i.customId) {
                            case 'music_prev': {
                                const hist = musicHistory.get(guildId) || [];
                                if (hist.length === 0) {
                                    return i.reply({ content: '❌ No hay canciones anteriores.', ephemeral: true });
                                }
                                const prevTrack = hist.pop();
                                musicHistory.set(guildId, hist);
                                currentQueue.insertTrack(prevTrack, 0);
                                currentQueue.node.skip();
                                await i.reply({ content: `⏮️ Volviendo a **${prevTrack.title}**`, ephemeral: true });
                                break;
                            }
                            case 'music_pause': {
                                currentQueue.node.isPaused() ? currentQueue.node.resume() : currentQueue.node.pause();
                                const embed = crearNowPlayingEmbed(currentQueue, currentQueue.currentTrack);
                                const rows = crearBotonesMusica(currentQueue);
                                await i.update({ embeds: [embed], components: rows });
                                break;
                            }
                            case 'music_skip': {
                                const skippedTrack = currentQueue.currentTrack;
                                await i.reply({ content: `⏭️ **${skippedTrack?.title || 'Canción'}** saltada por ${i.user}`, ephemeral: true });
                                currentQueue.node.skip();
                                break;
                            }
                            case 'music_stop': {
                                currentQueue.delete();
                                musicHistory.delete(guildId);
                                nowPlayingMessages.delete(guildId);
                                await i.update({
                                    embeds: [new EmbedBuilder()
                                        .setColor(0xFF0000)
                                        .setDescription('⏹️ **Música detenida.** La cola fue vaciada y me desconecté del canal.')
                                        .setFooter({ text: `Detenida por ${i.user.username}` })
                                        .setTimestamp()
                                    ],
                                    components: []
                                });
                                collector.stop();
                                break;
                            }
                            case 'music_replay': {
                                const currentTrack = currentQueue.currentTrack;
                                if (currentTrack) {
                                    currentQueue.insertTrack(currentTrack, 0);
                                    currentQueue.node.skip();
                                    await i.reply({ content: `🔄 Reproduciendo de nuevo **${currentTrack.title}**`, ephemeral: true });
                                } else {
                                    await i.reply({ content: '❌ No hay canción para repetir.', ephemeral: true });
                                }
                                break;
                            }
                            case 'music_loop': {
                                const modes = [0, 1, 2]; // Off → Canción → Cola → Off
                                const modeNames = ['❌ Desactivado', '🔂 Canción en loop', '🔁 Cola en loop'];
                                const nextMode = (currentQueue.repeatMode + 1) % 3;
                                currentQueue.setRepeatMode(nextMode);
                                const embed = crearNowPlayingEmbed(currentQueue, currentQueue.currentTrack);
                                const rows = crearBotonesMusica(currentQueue);
                                await i.update({ embeds: [embed], components: rows });
                                await i.followUp({ content: `${modeNames[nextMode]}`, ephemeral: true });
                                break;
                            }
                            case 'music_shuffle': {
                                currentQueue.tracks.shuffle();
                                const embed = crearNowPlayingEmbed(currentQueue, currentQueue.currentTrack);
                                const rows = crearBotonesMusica(currentQueue);
                                await i.update({ embeds: [embed], components: rows });
                                await i.followUp({ content: '🔀 Cola mezclada aleatoriamente', ephemeral: true });
                                break;
                            }
                            case 'music_voldown': {
                                const newVol = Math.max(0, currentQueue.node.volume - 10);
                                currentQueue.node.setVolume(newVol);
                                const embed = crearNowPlayingEmbed(currentQueue, currentQueue.currentTrack);
                                const rows = crearBotonesMusica(currentQueue);
                                await i.update({ embeds: [embed], components: rows });
                                break;
                            }
                            case 'music_volup': {
                                const newVol = Math.min(100, currentQueue.node.volume + 10);
                                currentQueue.node.setVolume(newVol);
                                const embed = crearNowPlayingEmbed(currentQueue, currentQueue.currentTrack);
                                const rows = crearBotonesMusica(currentQueue);
                                await i.update({ embeds: [embed], components: rows });
                                break;
                            }
                            case 'music_queue': {
                                const tracks = currentQueue.tracks.toArray();
                                const hist = musicHistory.get(guildId) || [];

                                let desc = `🎵 **Reproduciendo:** [${currentQueue.currentTrack.title}](${currentQueue.currentTrack.url}) — \`${currentQueue.currentTrack.duration}\`\n\n`;

                                if (tracks.length > 0) {
                                    desc += '📋 **Cola:**\n';
                                    tracks.slice(0, 10).forEach((t, i) => {
                                        desc += `\`${i + 1}.\` [${t.title.length > 45 ? t.title.substring(0, 45) + '...' : t.title}](${t.url}) — \`${t.duration}\`\n`;
                                    });
                                    if (tracks.length > 10) desc += `*...y ${tracks.length - 10} temas más*\n`;
                                } else {
                                    desc += '*La cola está vacía. Usá `/play` para agregar más temas.*\n';
                                }

                                if (hist.length > 0) {
                                    desc += '\n⏮️ **Historial reciente:**\n';
                                    hist.slice(-5).reverse().forEach((t, i) => {
                                        desc += `\`${i + 1}.\` ${t.title.length > 45 ? t.title.substring(0, 45) + '...' : t.title} — \`${t.duration}\`\n`;
                                    });
                                }

                                const queueEmbed = new EmbedBuilder()
                                    .setColor(config.COLORES.MUSICA || 0x9B59B6)
                                    .setTitle('🎶 Cola de reproducción')
                                    .setDescription(desc)
                                    .setFooter({ text: `${tracks.length} en cola • ${hist.length} reproducidas • Volumen: ${currentQueue.node.volume}%` })
                                    .setTimestamp();

                                await i.reply({ embeds: [queueEmbed], ephemeral: true });
                                break;
                            }
                            case 'music_replay_old': {
                                await i.deferReply({ ephemeral: true });
                                try {
                                    // 'track' viene del cierre (closure) de playerStart, corresponde a ESTE mensaje histórico
                                    const voiceChannel = i.member.voice.channel;
                                    if (!voiceChannel) return i.editReply({ content: '❌ Tenés que estar en un canal de voz.' });

                                    await i.editReply({ content: `🔄 Cargando de nuevo **${track.title}**...` });

                                    await client.player.play(voiceChannel, track.url, {
                                        requestedBy: i.user,
                                        nodeOptions: {
                                            metadata: { channel: i.channel },
                                            volume: 50,
                                            leaveOnEmpty: false,
                                            leaveOnEmptyCooldown: 30000,
                                            leaveOnEnd: true,
                                            leaveOnEndCooldown: 60000,
                                        }
                                    });
                                } catch (e) {
                                    console.error(e);
                                    await i.editReply({ content: `❌ Error al reproducir: ${e.message}` });
                                }
                                break;
                            }
                        }
                    } catch (err) {
                        console.error('Error en botón de música:', err.message);
                        try {
                            if (!i.replied && !i.deferred) {
                                await i.reply({ content: '❌ Error al procesar.', ephemeral: true });
                            }
                        } catch (e) { }
                    }
                });

                collector.on('end', () => {
                    // Si el collector expira, remover botones
                    msg.edit({ components: [] }).catch(() => { });
                    nowPlayingMessages.delete(guildId);
                });
            });

            // Guardar track actual al historial al cambiar de canción
            if (!musicHistory.has(guildId)) {
                musicHistory.set(guildId, []);
            }
        });

        // ─── Evento: Track agregado a la cola (no al reproducir, solo al agregar a cola existente) ───
        client.player.events.on('audioTrackAdd', (queue, track) => {
            if (!queue.metadata?.channel) return;

            const tracks = queue.tracks.toArray();
            const position = tracks.findIndex(t => t.id === track.id) + 1;

            const embed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setAuthor({ name: '➕ Agregada a la cola' })
                .setTitle(track.title)
                .setURL(track.url)
                .setThumbnail(track.thumbnail)
                .addFields(
                    { name: '⏱️ Duración', value: `\`${track.duration}\``, inline: true },
                    { name: '📋 Posición', value: `\`#${position || tracks.length}\``, inline: true },
                    { name: '👤 Pedida por', value: `<@${track.requestedBy?.id || '0'}>`, inline: true },
                )
                .setFooter({ text: `${tracks.length} tema${tracks.length !== 1 ? 's' : ''} en cola` })
                .setTimestamp();

            queue.metadata.channel.send({ embeds: [embed] });
        });

        // ─── Guardar historial cuando cambia de canción ───
        client.player.events.on('playerFinish', (queue, track) => {
            const guildId = queue.guild.id;
            if (!musicHistory.has(guildId)) musicHistory.set(guildId, []);
            const hist = musicHistory.get(guildId);
            hist.push(track);
            // Mantener máximo 50 tracks en historial
            if (hist.length > 50) hist.shift();
        });

        // ─── Eventos de error ───
        client.player.events.on('error', (queue, error) => {
            console.error(`❌ Error de player: ${error.message}`);
            console.error('   Stack:', error.stack);
            if (queue?.metadata?.channel) queue.metadata.channel.send(`❌ Error de reproducción: \`${error.message}\``);
        });

        client.player.events.on('playerError', (queue, error, track) => {
            console.error(`❌ Error de conexión: ${error.message}`);
            console.error('   Stack:', error.stack);
            console.error('   Track:', track?.title, track?.url);
            if (queue?.metadata?.channel) queue.metadata.channel.send(`❌ Error de conexión: \`${error.message}\``);
        });

        client.player.events.on('playerSkip', (queue, track) => {
            console.warn(`⏭️ Track saltado (no se pudo reproducir): ${track.title}`);
            if (queue?.metadata?.channel) queue.metadata.channel.send(`⚠️ No se pudo reproducir **${track.title}**, saltando...`);
        });

        // ─── Eventos informativos ───
        client.player.events.on('emptyQueue', (queue) => {
            console.log('📭 Cola vacía');
            const guildId = queue.guild.id;
            if (queue.metadata?.channel) {
                const embed = new EmbedBuilder()
                    .setColor(0x95A5A6)
                    .setDescription('📭 **Cola vacía.** Agregá más temas con `/play`.')
                    .setTimestamp();
                queue.metadata.channel.send({ embeds: [embed] });

                // Transformar el último mensaje de playing a historial
                const oldMsg = nowPlayingMessages.get(guildId);
                if (oldMsg) {
                    try {
                        if (oldMsg.embeds[0]) {
                            const oldEmbed = EmbedBuilder.from(oldMsg.embeds[0])
                                .setColor(0x34495E)
                                .setAuthor({ name: '⏮️ Historial de reproducción' })
                                .setFooter({ text: 'Prophet Gaming | Finalizado' });

                            // Replay button logic relies on the existing collector attached to oldMsg
                            const replayRow = new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId('music_replay_old')
                                    .setLabel('Volver a escuchar')
                                    .setEmoji('🔄')
                                    .setStyle(ButtonStyle.Secondary)
                            );
                            oldMsg.edit({ embeds: [oldEmbed], components: [replayRow] }).catch(() => { });
                        }
                    } catch (e) { }
                    nowPlayingMessages.delete(guildId);
                }
            }
        });

        client.player.events.on('disconnect', (queue) => {
            console.log('🔌 Bot desconectado del canal de voz');
            const guildId = queue.guild.id;
            musicHistory.delete(guildId);
            const oldMsg = nowPlayingMessages.get(guildId);
            if (oldMsg && oldMsg.editable) {
                try {
                    const oldEmbed = EmbedBuilder.from(oldMsg.embeds[0])
                        .setColor(0x34495E)
                        .setAuthor({ name: '⏮️ Historial de reproducción' })
                        .setFooter({ text: 'Prophet Gaming | Finalizado por desconexión' });

                    // No podemos agregar botón de replay fácil aquí porque no tenemos el 'track' del closure a mano 
                    // (el msg original tiene su collector, pero si editamos los componentes aquí, ¿rompemos algo?)
                    // Mejor dejarlo como historial visual sin botones o intentar mantener el botón si ya lo tenía.
                    // Si es 'disconnect', el bot se fue.
                    oldMsg.edit({ embeds: [oldEmbed], components: [] }).catch(() => { });
                } catch (e) { }
                nowPlayingMessages.delete(guildId);
            }
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
