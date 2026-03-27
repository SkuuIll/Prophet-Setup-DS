const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} = require('discord.js');

// ─────────────────────────────────────────────────────────────
//  GESTOR DE COLAS SHOUKAKU — Prophet Music Lavalink Engine
//  Una cola por guild, independiente de discord-player
// ─────────────────────────────────────────────────────────────
const serverQueues = new Map();

// Limpieza periódica de colas huérfanas (cada 5 min)
setInterval(() => {
    for (const [guildId, sq] of serverQueues) {
        // Eliminar colas sin reproductor activo o sin canción actual
        if (!sq.player || !sq.current) {
            serverQueues.delete(guildId);
        }
    }
}, 5 * 60 * 1000);

const MUSIC_COLORS = {
    PLAYING: 0xBB86FC,
    PAUSED: 0xFFB74D,
    QUEUE_ADD: 0x69F0AE,
    ERROR: 0xEF5350,
};

const MUSIC_BANNER = 'https://raw.githubusercontent.com/SkuuIll/Prophet-Setup-DS/main/assets/music_banner.png?v=update1';

// ─── Utilidades visuales ──────────────────────────────────────
function formatDuration(ms) {
    if (!ms || ms === 0) return 'En vivo';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function barraVolumen(vol) {
    const bloques = 10;
    const lleno = Math.round((vol / 100) * bloques);
    const barra = '▰'.repeat(lleno) + '▱'.repeat(bloques - lleno);
    const icono = vol === 0 ? '🔇' : vol <= 30 ? '🔈' : vol <= 70 ? '🔉' : '🔊';
    return `${icono} ${barra} \`${vol}%\``;
}

function trim(s, max = 38) {
    return s.length <= max ? s : s.substring(0, max - 1) + '…';
}

// ─── Crear embed "Now Playing" ────────────────────────────────
function crearEmbed(sq) {
    const track = sq.current;
    if (!track) return new EmbedBuilder().setDescription('No hay nada reproduciéndose');

    const isPaused = sq.isPaused;   // Usamos estado propio (Shoukaku no expone .paused de forma fiable)
    const loopIcons = ['▷ Desactivado', '🔂 Tema actual', '🔁 Cola completa'];

    let desc = `🎙️ **${track.info.author || 'Artista desconocido'}**\n`;
    desc += `⏱️ Duración: \`${formatDuration(track.info.length)}\`\n\n`;
    desc += `${barraVolumen(sq.volume)}\n`;
    desc += `${loopIcons[sq.repeatMode]}  ·  ${isPaused ? '⏸️ En pausa' : '▶️ Reproduciendo'}\n`;

    desc += '\n```\n─────── 🎶 Siguiente ───────\n```\n';
    if (sq.queue.length > 0) {
        sq.queue.slice(0, 5).forEach((t, i) => {
            desc += `\`${String(i + 1).padStart(2, '0')}\` [${trim(t.info.title)}](${t.info.uri})  ·  \`${formatDuration(t.info.length)}\`\n`;
        });
        if (sq.queue.length > 5) desc += `\n> *…y \`${sq.queue.length - 5}\` temas más esperando*\n`;
    } else {
        desc += '> *Cola vacía — Usá `/playl` para agregar más temas*\n';
    }

    if (sq.history.length > 0) {
        desc += '\n```\n──────── ⏮️ Anterior ────────\n```\n';
        sq.history.slice(-3).reverse().forEach((t, i) => {
            desc += `\`${i + 1}.\` ${trim(t.info.title)}  ·  \`${formatDuration(t.info.length)}\`\n`;
        });
    }

    const embed = new EmbedBuilder()
        .setColor(isPaused ? MUSIC_COLORS.PAUSED : MUSIC_COLORS.PLAYING)
        .setAuthor({
            name: isPaused ? '⏸️  Música en pausa' : '♫  Reproduciendo ahora · Lavalink',
            iconURL: track.requestedBy?.displayAvatarURL?.({ size: 32 }),
        })
        .setTitle(track.info.title)
        .setURL(track.info.uri)
        .setDescription(desc)
        .addFields(
            { name: '👤 Pedida por', value: track.requestedBy ? `<@${track.requestedBy.id}>` : '`Sistema`', inline: true },
            { name: '📋 En cola', value: `\`${sq.queue.length}\` tema${sq.queue.length !== 1 ? 's' : ''}`, inline: true },
            { name: '📊 Reproducidas', value: `\`${sq.history.length}\` tema${sq.history.length !== 1 ? 's' : ''}`, inline: true },
        )
        .setImage(MUSIC_BANNER)
        .setFooter({ text: 'Prophet Music · Lavalink Engine · /playl para agregar' })
        .setTimestamp();

    if (track.info.artworkUrl) embed.setThumbnail(track.info.artworkUrl);
    return embed;
}

// ─── Crear botones de control ─────────────────────────────────
function crearBotones(sq) {
    const isPaused = sq.isPaused;
    const loopLabels = ['Loop: Off', 'Loop: Tema', 'Loop: Cola'];

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ll_prev').setLabel('Anterior').setEmoji('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(sq.history.length === 0),
        new ButtonBuilder().setCustomId('ll_pause').setLabel(isPaused ? 'Reanudar' : 'Pausar').setEmoji(isPaused ? '▶️' : '⏸️').setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ll_skip').setLabel('Saltar').setEmoji('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(sq.queue.length === 0),
        new ButtonBuilder().setCustomId('ll_stop').setLabel('Detener').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ll_replay').setLabel('Reiniciar').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ll_loop').setLabel(loopLabels[sq.repeatMode]).setEmoji('🔁').setStyle(sq.repeatMode > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ll_shuffle').setLabel('Mezclar').setEmoji('🔀').setStyle(ButtonStyle.Secondary).setDisabled(sq.queue.length < 2),
        new ButtonBuilder().setCustomId('ll_voldown').setLabel('Vol −').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ll_volup').setLabel('Vol +').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
    );

    return [row1, row2];
}

// ─── Actualizar mensaje Now Playing ──────────────────────────
async function actualizarUI(sq) {
    if (!sq.msg) return;
    try {
        await sq.msg.edit({ embeds: [crearEmbed(sq)], components: crearBotones(sq) });
    } catch (_) { }
}

// ─── Reproducir siguiente de la cola ─────────────────────────
async function playNext(guildId, client) {
    const sq = serverQueues.get(guildId);
    if (!sq) return;

    // Mover current al historial
    if (sq.current) {
        sq.history.push(sq.current);
        if (sq.history.length > 50) sq.history.shift();
    }

    // Gestión de vacío de cola
    if (sq.queue.length === 0) {
        if (sq.repeatMode === 2 && sq.history.length > 0) {
            // Loop de cola completa
            sq.queue = [...sq.history];
            sq.history = [];
        } else {
            // Fin de reproducción
            sq.current = null;
            if (sq.msg) {
                await sq.msg.edit({ components: [] }).catch(() => { });
            }
            setTimeout(async () => {
                const checkSq = serverQueues.get(guildId);
                if (checkSq && !checkSq.current) {
                    await client.shoukaku.leaveVoiceChannel(guildId).catch(() => { });
                    serverQueues.delete(guildId);
                }
            }, 30000);
            return;
        }
    }

    sq.current = sq.queue.shift();
    sq.isPaused = false;

    try {
        await sq.player.playTrack({ track: { encoded: sq.current.encoded } });
        await sq.player.setVolume(sq.volume);   // Shoukaku v4: setVolume(0-100)
    } catch (err) {
        console.error('[playl] Error al reproducir:', err.message);
        // Intentar el siguiente
        return playNext(guildId, client);
    }

    await enviarOActualizarUI(sq);
}

// ─── Enviar o editar el mensaje de UI ────────────────────────
async function enviarOActualizarUI(sq) {
    if (sq.collector) sq.collector.stop('renew');

    const embed = crearEmbed(sq);
    const rows = crearBotones(sq);

    if (sq.msg) {
        try {
            await sq.msg.edit({ embeds: [embed], components: rows });
            setupCollector(sq);
            return;
        } catch (_) {
            sq.msg = null; // fue borrado
        }
    }

    sq.msg = await sq.channel.send({ embeds: [embed], components: rows });
    setupCollector(sq);
}

// ─── Configurar collector de botones ─────────────────────────
function setupCollector(sq) {
    if (!sq.msg) return;

    sq.collector = sq.msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 24 * 60 * 60 * 1000,
    });

    sq.collector.on('collect', async i => {
        try {
            // Verificar que el usuario está en el canal de voz del bot
            const botVoiceChannelId = i.guild.members.me?.voice?.channelId;
            if (i.member.voice.channelId !== botVoiceChannelId) {
                return i.reply({ content: '> ❌ Tenés que estar en el mismo canal de voz que el bot.', ephemeral: true });
            }

            switch (i.customId) {
                case 'll_pause': {
                    sq.isPaused = !sq.isPaused;
                    await sq.player.setPaused(sq.isPaused);
                    await i.deferUpdate();
                    await actualizarUI(sq);
                    break;
                }
                case 'll_skip': {
                    // Marcar que el skip es intencional para que el evento 'end' llame playNext
                    sq.skipping = true;
                    await sq.player.stopTrack();
                    await i.reply({ content: `> ⏭️ **Saltada:** \`${sq.current?.info?.title || '?'}\``, ephemeral: true });
                    break;
                }
                case 'll_stop': {
                    sq.queue = [];
                    sq.current = null;
                    await sq.player.stopTrack();
                    await i.client.shoukaku.leaveVoiceChannel(i.guild.id).catch(() => { });
                    serverQueues.delete(i.guild.id);
                    try {
                        await sq.msg.edit({
                            embeds: [new EmbedBuilder()
                                .setColor(0x546E7A)
                                .setAuthor({ name: '⏹️  Reproducción Detenida · Prophet Music' })
                                .setDescription('> La cola fue vaciada y el bot abandonó el canal de voz.\n> Usá `/playl` para empezar de nuevo cuando quieras 🎶')
                                .setFooter({ text: 'Prophet Music  ·  ¡Hasta la próxima!' })
                                .setTimestamp()
                            ],
                            components: []
                        });
                    } catch (_) { }
                    await i.reply({ content: '> ⏹️ **Música detenida** — ¡Hasta la próxima, DJ! 👋', ephemeral: true });
                    break;
                }
                case 'll_prev': {
                    if (sq.history.length === 0) {
                        return i.reply({ content: '> ❌ No hay historial.', ephemeral: true });
                    }
                    const prev = sq.history.pop();
                    if (sq.current) sq.queue.unshift(sq.current); // devolver actual a cola
                    sq.queue.unshift(prev);                        // poner anterior primero
                    sq.skipping = true;
                    await sq.player.stopTrack();
                    await i.reply({ content: `> ⏮️ **Volviendo a:** \`${prev.info.title}\``, ephemeral: true });
                    break;
                }
                case 'll_replay': {
                    await sq.player.seekTo(0);
                    await i.reply({ content: `> 🔄 **Reiniciando:** \`${sq.current?.info?.title || '?'}\``, ephemeral: true });
                    break;
                }
                case 'll_loop': {
                    sq.repeatMode = (sq.repeatMode + 1) % 3;
                    const loopNames = ['desactivado', '🔂 tema actual', '🔁 cola completa'];
                    await i.deferUpdate();
                    await actualizarUI(sq);
                    break;
                }
                case 'll_shuffle': {
                    sq.queue.sort(() => Math.random() - 0.5);
                    await i.reply({ content: '> 🔀 **Cola mezclada aleatoriamente.**', ephemeral: true });
                    await actualizarUI(sq);
                    break;
                }
                case 'll_voldown': {
                    sq.volume = Math.max(0, sq.volume - 10);
                    const DBStmts = require('../../database').stmts;
                    DBStmts.setGuildVolume(i.guild.id, sq.volume);
                    await sq.player.setVolume(sq.volume);
                    await i.deferUpdate();
                    await actualizarUI(sq);
                    break;
                }
                case 'll_volup': {
                    sq.volume = Math.min(100, sq.volume + 10);
                    const DBStmts = require('../../database').stmts;
                    DBStmts.setGuildVolume(i.guild.id, sq.volume);
                    await sq.player.setVolume(sq.volume);
                    await i.deferUpdate();
                    await actualizarUI(sq);
                    break;
                }
            }
        } catch (err) {
            console.error('[playl] Error en botón:', err.message);
            if (!i.replied && !i.deferred) {
                i.reply({ content: '> ⚠️ Ocurrió un error.', ephemeral: true }).catch(() => { });
            }
        }
    });

    sq.collector.on('end', (_, reason) => {
        if (reason === 'renew') return; // Proximo cargó un nuevo collector
        if (sq.msg) {
            sq.msg.edit({ components: [] }).catch(() => { });
        }
    });
}

// ─────────────────────────────────────────────────────────────
//  COMANDO /playl
// ─────────────────────────────────────────────────────────────
module.exports = {
    data: new SlashCommandBuilder()
        .setName('playl')
        .setDescription('🎶 Reproduce música con Lavalink (UI completa con botones y cola)')
        .addStringOption(option =>
            option.setName('cancion')
                .setDescription('URL de YouTube/Spotify o nombre de la canción')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        const client = interaction.client;
        const guildId = interaction.guild.id;

        // ── Guard: Lavalink disponible ──
        const node = client.shoukaku?.getIdealNode();
        if (!node) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0xEF5350)
                    .setAuthor({ name: '⚠️  Lavalink no disponible' })
                    .setDescription('> El servidor de música no está disponible en este momento.\n> Intentá de nuevo en unos segundos o contactá al Staff.')
                ]
            });
        }

        // ── Guard: canal de voz ──
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0xFFB74D)
                    .setAuthor({ name: '🔊  Canal de Voz Requerido' })
                    .setDescription('> ❌ Tenés que **unirte a un canal de voz** primero para usar este comando.')
                    .setFooter({ text: 'Prophet Music  ·  Conectate a voz y volvé a intentarlo' })
                ]
            });
        }

        const query = interaction.options.getString('cancion');

        try {
            // ── Resolver query ──
            const isURL = /^https?:\/\//.test(query);
            const searchQuery = isURL ? query : `ytsearch:${query}`;
            const result = await node.rest.resolve(searchQuery);

            if (!result || result.loadType === 'empty' || result.loadType === 'error') {
                const msg = result?.data?.message || 'Sin resultados para tu búsqueda';
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(0xEF5350)
                        .setAuthor({ name: '🔍  Sin Resultados' })
                        .setDescription(`> ❌ No encontré nada para **\`${query}\`**\n> *${msg}*\n\n> 💡 Intentá con otro nombre, URL o plataforma.`)
                        .setFooter({ text: 'Prophet Music  ·  Soporta YouTube, Spotify, SoundCloud' })
                    ]
                });
            }

            // ── Extraer tracks ──
            let tracks = [];
            let playlistName = null;

            switch (result.loadType) {
                case 'playlist':
                    tracks = result.data.tracks || result.data;
                    playlistName = result.data.info?.name || 'Playlist';
                    break;
                case 'track':
                    tracks = [result.data];
                    break;
                case 'search':
                    tracks = result.data.length > 0 ? [result.data[0]] : [];
                    break;
                default:
                    tracks = Array.isArray(result.data) ? result.data.slice(0, 1) : [result.data];
            }

            if (!tracks.length || !tracks[0]?.encoded) {
                return interaction.editReply('❌ No se pudo obtener la pista de audio.');
            }

            // Etiquetar solicitante
            tracks.forEach(t => t.requestedBy = interaction.user);

            // ── Obtener o crear Queue/Player ──
            let sq = serverQueues.get(guildId);

            if (!sq) {
                const player = await client.shoukaku.joinVoiceChannel({
                    guildId,
                    channelId: voiceChannel.id,
                    shardId: interaction.guild.shardId || 0,
                });

                const DBStmts = require('../../database').stmts;
                const dbSettings = DBStmts.getGuildSettings(guildId);

                sq = {
                    player,
                    channel: interaction.channel,
                    queue: [],
                    current: null,
                    history: [],
                    repeatMode: 0,
                    isPaused: false,
                    skipping: false,
                    msg: null,
                    collector: null,
                    volume: dbSettings.music_volume || 10,
                };

                serverQueues.set(guildId, sq);

                // ── Eventos del player ──
                player.on('end', async (data) => {
                    // 'replaced' = nuevo playTrack fue llamado antes de que terminara el anterior
                    if (data.reason === 'replaced') return;

                    const currentSq = serverQueues.get(guildId);
                    if (!currentSq) return;

                    // Loop de un tema
                    if (currentSq.repeatMode === 1 && currentSq.current && !currentSq.skipping) {
                        currentSq.skipping = false;
                        await currentSq.player.playTrack({ track: { encoded: currentSq.current.encoded } });
                        return;
                    }

                    currentSq.skipping = false;
                    await playNext(guildId, client);
                });

                player.on('exception', async (data) => {
                    console.error('[playl] Track exception:', data);
                    const currentSq = serverQueues.get(guildId);
                    if (currentSq) await playNext(guildId, client);
                });

                player.on('closed', () => {
                    serverQueues.delete(guildId);
                });
            }

            // ── Añadir tracks a la cola ──
            sq.queue.push(...tracks);

            const alreadyPlaying = !!sq.current;

            if (!alreadyPlaying) {
                // Empezar reproducción
                await playNext(guildId, client);
                // El mensaje lo envía playNext → enviarOActualizarUI
                await interaction.deleteReply().catch(() => { });
            } else {
                // Ya hay algo sonando: notificar que se añadió
                const first = tracks[0];
                const addedDesc = playlistName
                    ? `📋 **Playlist:** ${playlistName} (${tracks.length} canciones)\n> Primera: **[${first.info.title}](${first.info.uri})**`
                    : `**[${first.info.title}](${first.info.uri})**\n> 🎙 ${first.info.author}  ·  ⏱ \`${formatDuration(first.info.length)}\`\n> Posición: \`#${sq.queue.length}\``;

                const addEmbed = new EmbedBuilder()
                    .setColor(MUSIC_COLORS.QUEUE_ADD)
                    .setAuthor({ name: '✦  Agregado a la Cola · Prophet Music', iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(addedDesc)
                    .setThumbnail(first.info.artworkUrl || null)
                    .setFooter({ text: `📋 ${sq.queue.length} tema${sq.queue.length !== 1 ? 's' : ''} esperando  ·  Prophet Music` })
                    .setTimestamp();

                await interaction.editReply({ embeds: [addEmbed] });
                setTimeout(() => interaction.deleteReply().catch(() => { }), 10000);

                // Actualizar UI principal con la nueva cola
                await actualizarUI(sq);
            }

        } catch (err) {
            console.error('[playl] Error general:', err);
            // Limpiar si hay un player roto
            const brokenSq = serverQueues.get(guildId);
            if (brokenSq && !brokenSq.current) {
                await client.shoukaku.leaveVoiceChannel(guildId).catch(() => { });
                serverQueues.delete(guildId);
            }
            await interaction.editReply(`❌ Error: ${err.message || 'Error inesperado'}`).catch(() => { });
        }
    },
};
