const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ─── GESTOR DE COLAS PARA SHOUKAKU ───
// Como Lavalink no tiene sistema de colas nativo, lo creamos acá
const serverQueues = new Map();

/*
Estructura de la cola (serverQueue):
{
    player: ShoukakuPlayer,
    channel: TextChannel,
    queue: [track, ...],
    current: track,
    history: [track, ...],
    repeatMode: 0, // 0 = Off, 1 = Track, 2 = Queue
    msg: Message (El último Now Playing),
    collector: ButtonCollector,
    volume: 50
}
*/

const MUSIC_COLORS = {
    PLAYING: 0xBB86FC,
    PAUSED: 0xFFB74D,
    QUEUE_ADD: 0x69F0AE,
    ERROR: 0xEF5350,
};

const MUSIC_BANNER = 'https://raw.githubusercontent.com/SkuuIll/Prophet-Setup-DS/main/assets/music_banner.png?v=update1';

// ─── Funciones visuales ───
function formatDuration(ms) {
    if (!ms || ms === 0) return 'En vivo';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

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

function crearEmbed(sq) {
    const track = sq.current;
    if (!track) return new EmbedBuilder().setDescription('No hay nada reproduciéndose');

    const isPaused = sq.player.paused;
    const loopIcons = ['▷ Desactivado', '🔂 Tema actual', '🔁 Cola completa'];
    const loopStatus = loopIcons[sq.repeatMode];

    let desc = `🎙️ **${track.info.author || 'Artista desconocido'}**\n`;
    desc += `⏱️ Duración: \`${formatDuration(track.info.length)}\`\n\n`;
    desc += `${barraVolumen(sq.volume)}\n`;
    desc += `${loopStatus}  ·  ${isPaused ? '⏸️ En pausa' : '▶️ Reproduciendo'}\n`;

    desc += '\n```\n─────── 🎶 Siguiente ───────\n```\n';
    if (sq.queue.length > 0) {
        sq.queue.slice(0, 5).forEach((t, i) => {
            const num = `${i + 1}`.padStart(2, '0');
            const titulo = formatearTitulo(t.info.title, 36);
            desc += `\`${num}\` [${titulo}](${t.info.uri})  ·  \`${formatDuration(t.info.length)}\`\n`;
        });
        if (sq.queue.length > 5) {
            desc += `\n> *…y \`${sq.queue.length - 5}\` temas más esperando*\n`;
        }
    } else {
        desc += '> *No hay temas en espera — Usá \`/playl\` para agregar*\n';
    }

    if (sq.history.length > 0) {
        desc += '\n```\n──────── ⏮️ Anterior ────────\n```\n';
        sq.history.slice(-3).reverse().forEach((t, i) => {
            const titulo = formatearTitulo(t.info.title, 36);
            desc += `\`${i + 1}.\` ${titulo}  ·  \`${formatDuration(t.info.length)}\`\n`;
        });
    }

    const embed = new EmbedBuilder()
        .setColor(isPaused ? MUSIC_COLORS.PAUSED : MUSIC_COLORS.PLAYING)
        .setAuthor({
            name: isPaused ? '⏸️  Música en pausa' : '♫  Reproduciendo ahora Lavalink',
            iconURL: track.requestedBy?.displayAvatarURL?.({ size: 32 })
        })
        .setTitle(track.info.title)
        .setURL(track.info.uri)
        .setDescription(desc)
        .addFields(
            { name: '👤 Pedida por', value: track.requestedBy ? `<@${track.requestedBy.id}>` : '`?`', inline: true },
            { name: '📋 En cola', value: `\`${sq.queue.length}\` temas`, inline: true },
            { name: '📊 Reproducidas', value: `\`${sq.history.length}\` temas`, inline: true }
        )
        .setImage(MUSIC_BANNER)
        .setFooter({ text: 'Prophet Music · Lavalink Engine · /playl para agregar' })
        .setTimestamp();

    if (track.info.artworkUrl) {
        embed.setThumbnail(track.info.artworkUrl);
    }

    return embed;
}

function crearBotones(sq) {
    const isPaused = sq.player.paused;
    const historyLen = sq.history.length;
    const loopMode = sq.repeatMode;

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ll_prev').setLabel('Anterior').setEmoji('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(historyLen === 0),
        new ButtonBuilder().setCustomId('ll_pause').setLabel(isPaused ? 'Reanudar' : 'Pausar').setEmoji(isPaused ? '▶️' : '⏸️').setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ll_skip').setLabel('Saltar').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ll_stop').setLabel('Detener').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ll_replay').setLabel('Reiniciar').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
    );

    const loopLabels = ['Loop: Off', 'Loop: Tema', 'Loop: Cola'];
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ll_loop').setLabel(loopLabels[loopMode]).setEmoji('🔁').setStyle(loopMode > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ll_shuffle').setLabel('Mezclar').setEmoji('🔀').setStyle(ButtonStyle.Secondary).setDisabled(sq.queue.length === 0),
        new ButtonBuilder().setCustomId('ll_voldown').setLabel('Vol −').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ll_volup').setLabel('Vol +').setEmoji('🔊').setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2];
}

// ─── Funciones del Core ───
async function playNext(guildId, client) {
    const sq = serverQueues.get(guildId);
    if (!sq) return;

    if (sq.current) {
        sq.history.push(sq.current);
        if (sq.history.length > 50) sq.history.shift();
    }

    if (sq.queue.length === 0) {
        if (sq.repeatMode === 2 && sq.history.length > 0) {
            // Loop de cola: poner todo el historial en cola y resetear
            sq.queue = [...sq.history];
            sq.history = [];
        } else {
            // Se terminó la música
            setTimeout(() => {
                const checkSq = serverQueues.get(guildId);
                if (checkSq && checkSq.queue.length === 0 && !checkSq.player.track) {
                    client.shoukaku.leaveVoiceChannel(guildId).catch(() => { });
                    serverQueues.delete(guildId);
                }
            }, 30000);
            return;
        }
    }

    // Tomar el siguiente tema
    sq.current = sq.queue.shift();
    await sq.player.playTrack({ track: { encoded: sq.current.encoded } });
    await sq.player.setGlobalVolume(sq.volume);

    // Enviar/Actualizar Mensaje
    enviarMensaje(sq);
}

async function enviarMensaje(sq) {
    if (sq.collector) {
        sq.collector.stop('renew');
    }
    const embed = crearEmbed(sq);
    const rows = crearBotones(sq);

    if (sq.msg) {
        try {
            await sq.msg.edit({ embeds: [embed], components: rows });
            setupCollector(sq);
            return;
        } catch { } // Si falla (borrado), crear nuevo
    }

    sq.msg = await sq.channel.send({ embeds: [embed], components: rows });
    setupCollector(sq);
}

function setupCollector(sq) {
    if (!sq.msg) return;
    sq.collector = sq.msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 24 * 60 * 60 * 1000
    });

    sq.collector.on('collect', async i => {
        try {
            if (i.member.voice.channelId !== sq.player.connection.channelId) {
                return i.reply({ content: '> ❌ Tenés que estar en el mismo canal de voz.', ephemeral: true });
            }

            switch (i.customId) {
                case 'll_pause':
                    await sq.player.setPaused(!sq.player.paused);
                    await i.deferUpdate();
                    break;
                case 'll_skip':
                    await sq.player.stopTrack(); // Emite evento 'end'
                    await i.reply({ content: '> ⏭️ Saltada', ephemeral: true });
                    break;
                case 'll_stop':
                    sq.queue = [];
                    await sq.player.stopTrack();
                    i.client.shoukaku.leaveVoiceChannel(i.guild.id).catch(() => { });
                    serverQueues.delete(i.guild.id);
                    await i.reply({ content: '> ⏹️ Detenida', ephemeral: true });
                    break;
                case 'll_prev':
                    if (sq.history.length > 0) {
                        const prev = sq.history.pop();
                        // El current pasa de nuevo a la cola (arriba) si querés, o no.
                        sq.queue.unshift(sq.current);
                        sq.queue.unshift(prev); // Lo forzamos como próximo
                        await sq.player.stopTrack();
                        await i.reply({ content: `> ⏮️ Volviendo a: ${prev.info.title}`, ephemeral: true });
                    } else {
                        await i.reply({ content: '> ❌ No hay historial.', ephemeral: true });
                    }
                    break;
                case 'll_replay':
                    await sq.player.seekTo(0);
                    await i.reply({ content: '> 🔄 Reiniciando', ephemeral: true });
                    break;
                case 'll_loop':
                    sq.repeatMode = (sq.repeatMode + 1) % 3;
                    await i.deferUpdate();
                    break;
                case 'll_shuffle':
                    sq.queue.sort(() => Math.random() - 0.5);
                    await i.reply({ content: '> 🔀 Cola mezclada', ephemeral: true });
                    break;
                case 'll_voldown':
                    sq.volume = Math.max(0, sq.volume - 10);
                    await sq.player.setGlobalVolume(sq.volume);
                    await i.deferUpdate();
                    break;
                case 'll_volup':
                    sq.volume = Math.min(100, sq.volume + 10);
                    await sq.player.setGlobalVolume(sq.volume);
                    await i.deferUpdate();
                    break;
            }

            // Actualizar vista
            if (['ll_pause', 'll_loop', 'll_voldown', 'll_volup'].includes(i.customId)) {
                if (sq.msg) {
                    await sq.msg.edit({ embeds: [crearEmbed(sq)], components: crearBotones(sq) }).catch(() => { });
                }
            }
        } catch (err) { }
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playl')
        .setDescription('Reproduce música usando Lavalink (Versión Definitiva con UI)')
        .addStringOption(option =>
            option.setName('cancion')
                .setDescription('URL o nombre de la canción')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        const client = interaction.client;
        const guildId = interaction.guild.id;

        if (!client.shoukaku || client.shoukaku.nodes.size === 0) {
            return interaction.editReply('❌ **Lavalink** está desconectado.');
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.editReply('❌ Tenés que estar en un canal de voz.');
        }

        const node = client.shoukaku.getIdealNode();
        if (!node) {
            return interaction.editReply('❌ Nodos no disponibles.');
        }

        const query = interaction.options.getString('cancion');

        try {
            const isURL = /^https?:\/\//.test(query);
            const searchQuery = isURL ? query : `ytsearch:${query}`;
            const result = await node.rest.resolve(searchQuery);

            if (!result || result.loadType === 'empty' || result.loadType === 'error') {
                return interaction.editReply(`❌ No se encontró: ${result?.data?.message || 'Nada'}`);
            }

            // ── Extraer Tracks ──
            let extractT = [];
            let extraInfo = '';

            if (result.loadType === 'playlist') {
                extractT = result.data.tracks || result.data;
                extraInfo = `\n📋 **Playlist añadida:** ${result.data.info?.name} (${extractT.length} canciones)`;
            } else if (result.loadType === 'track') {
                extractT = [result.data];
            } else if (result.loadType === 'search') {
                extractT = [result.data[0]];
            } else {
                extractT = Array.isArray(result.data) ? [result.data[0]] : [result.data];
            }

            if (!extractT.length || !extractT[0].encoded) {
                return interaction.editReply('❌ Error extrayendo pista de audio.');
            }

            // Etiquetar solicitante a cada track
            extractT.forEach(t => t.requestedBy = interaction.user);

            // ── Instanciar Cola y Reproductor ──
            let sq = serverQueues.get(guildId);
            if (!sq) {
                const player = await client.shoukaku.joinVoiceChannel({
                    guildId: guildId,
                    channelId: voiceChannel.id,
                    shardId: interaction.guild.shardId || 0
                });

                sq = {
                    player: player,
                    channel: interaction.channel,
                    queue: [],
                    current: null,
                    history: [],
                    repeatMode: 0,
                    msg: null,
                    collector: null,
                    volume: 50
                };
                serverQueues.set(guildId, sq);

                // Evento al terminar una canción
                player.on('end', (data) => {
                    // reason = 'replaced', 'finished', 'loadFailed', 'stopped'
                    if (data.reason === 'replaced') return;

                    if (sq.repeatMode === 1 && sq.current) {
                        sq.player.playTrack({ track: { encoded: sq.current.encoded } });
                        return;
                    }

                    playNext(guildId, client);
                });

                player.on('closed', () => {
                    serverQueues.delete(guildId);
                });
            }

            // ── Añadir y Reproducir ──
            sq.queue.push(...extractT);

            const isFirstPlay = !sq.current;

            if (isFirstPlay) {
                // Si estaba vacío, empezar a reproducir (playNext saca de la cola y reproduce)
                await playNext(guildId, client);
                await interaction.deleteReply().catch(() => { });
            } else {
                // Si ya está sonando, avisar que se añadió
                const t = extractT[0];
                const addEmbed = new EmbedBuilder()
                    .setColor(MUSIC_COLORS.QUEUE_ADD)
                    .setAuthor({ name: '✦ Agregado a la cola', iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(`**[${t.info.title}](${t.info.uri})**\n> 🎙 ${t.info.author}  ·  ⏱ \`${formatDuration(t.info.length)}\` ${extraInfo}`)
                    .setThumbnail(t.info.artworkUrl || null);

                await interaction.editReply({ embeds: [addEmbed] });

                // Actualizar el player message
                if (sq.msg) {
                    await sq.msg.edit({ embeds: [crearEmbed(sq)] }).catch(() => { });
                }
            }

        } catch (err) {
            console.error('Lavalink GUI Error:', err);
            await interaction.editReply(`❌ Error inesperado: ${err.message}`).catch(() => { });
        }
    }
};
