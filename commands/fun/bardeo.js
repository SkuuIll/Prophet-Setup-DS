// ═══════════════════════════════════════════════════
//  COMANDO: /bardeo (Jumpscare / Bardeo en Salas de Voz)
// ═══════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    entersState,
    VoiceConnectionStatus
} = require('@discordjs/voice');
const config = require('../../config');

const SOUNDS_DIR = path.join(__dirname, '..', '..', 'assets', 'sounds');

const SOUNDS = {
    desconexion: {
        name: '🔌 Desconexión Falsa de Discord',
        file: 'discord_leave.mp3',
        fallbackTts: 'Usuario desconectado del servidor.',
        maxDuration: 4000
    },
    iorio: {
        name: '⚡ El Grito de Iorio',
        file: 'iorio.mp3',
        fallbackTts: '¡Pero la puta que lo parió loco, qué hacés!',
        maxDuration: 5000
    },
    quehaces: {
        name: '🤬 ¡¿Qué hacés, pelotudo?!',
        file: 'quehaces.mp3',
        fallbackTts: '¡¿Qué hacés, pelotudo?! ¡Ponete a jugar bien!',
        maxDuration: 4500
    },
    apagaelcoso: {
        name: '📺 ¡Apagá el coso!',
        file: 'apagaelcoso.mp3',
        fallbackTts: '¡Apagá el coso, apagaloooo!',
        maxDuration: 4500
    },
    manco: {
        name: '🚨 Alerta de Manco Detectado',
        file: 'alerta_manco.mp3',
        fallbackTts: 'Atención a todos en la sala. Se detectó una persona con cero manos en el canal.',
        maxDuration: 6000
    },
    trompeta: {
        name: '🎺 Fail Trombone (Payaso)',
        file: 'fail_trombone.mp3',
        fallbackTts: 'Womp womp womp, qué jugada más mala.',
        maxDuration: 4000
    },
    windows: {
        name: '💻 Error Crítico de Windows',
        file: 'windows_error.mp3',
        fallbackTts: 'Error crítico del sistema. Memoria cerebral insuficiente.',
        maxDuration: 4000
    },
    jumpscare: {
        name: '👻 Grito Jumpscare',
        file: 'jumpscare.mp3',
        fallbackTts: '¡Buuuuuuu! Te asustaste.',
        maxDuration: 4000
    }
};

/**
 * Obtener URL de TTS de Google en español latino/argentino
 */
function getTtsUrl(text) {
    return `https://translate.google.com/translate_tts?ie=UTF-8&tl=es-US&client=tw-ob&q=${encodeURIComponent(text)}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bardeo')
        .setDescription('🎙️ Entra a la sala de voz, tira un bardeo sonoro o sonido trampa y se desconecta')
        .addStringOption(opt =>
            opt.setName('sonido')
                .setDescription('Elige el sonido trampa o bardeo a reproducir')
                .setRequired(true)
                .addChoices(
                    { name: '🔌 Desconexión Falsa de Discord', value: 'desconexion' },
                    { name: '⚡ Grito de Iorio', value: 'iorio' },
                    { name: '🤬 ¡¿Qué hacés, pelotudo?!', value: 'quehaces' },
                    { name: '📺 ¡Apagá el coso!', value: 'apagaelcoso' },
                    { name: '🚨 Alerta de Manco', value: 'manco' },
                    { name: '🎺 Fail Trombone (Payaso)', value: 'trompeta' },
                    { name: '💻 Error de Windows', value: 'windows' },
                    { name: '👻 Grito Jumpscare', value: 'jumpscare' }
                )
        )
        .addUserOption(opt =>
            opt.setName('usuario')
                .setDescription('Usuario objetivo (debe estar en un canal de voz)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const soundKey = interaction.options.getString('sonido');
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        const soundData = SOUNDS[soundKey];

        if (!soundData) {
            return interaction.reply({ content: '❌ Sonido no válido.', ephemeral: true });
        }

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            return interaction.reply({ content: '❌ No se encontró al usuario en el servidor.', ephemeral: true });
        }

        const voiceChannel = member.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply({
                content: `❌ **${member.user.tag}** no está en ningún canal de voz.`,
                ephemeral: true
            });
        }

        // Permisos del bot para unirse al canal de voz
        const botMember = interaction.guild.members.me;
        const perms = voiceChannel.permissionsFor(botMember);
        if (!perms.has(PermissionFlagsBits.Connect) || !perms.has(PermissionFlagsBits.Speak)) {
            return interaction.reply({
                content: `❌ No tengo permisos para conectarme y hablar en el canal <#${voiceChannel.id}>.`,
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            console.log(`[Bardeo] Conectando a canal "${voiceChannel.name}" para trolear con "${soundData.name}"`);

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: false
            });

            await entersState(connection, VoiceConnectionStatus.Ready, 5000);

            const player = createAudioPlayer();
            // Cargar archivo de audio local con 0ms de latencia o fallback TTS
            const localSoundPath = path.join(SOUNDS_DIR, soundData.file);
            let resource;
            if (fs.existsSync(localSoundPath)) {
                resource = createAudioResource(localSoundPath);
            } else {
                resource = createAudioResource(getTtsUrl(soundData.fallbackTts));
            }

            player.play(resource);
            connection.subscribe(player);

            // Timeout de seguridad para desconectarse siempre
            const safetyTimeout = setTimeout(() => {
                try {
                    connection.destroy();
                } catch (_) {}
            }, soundData.maxDuration + 1500);

            player.on(AudioPlayerStatus.Idle, () => {
                clearTimeout(safetyTimeout);
                setTimeout(() => {
                    try {
                        connection.destroy();
                    } catch (_) {}
                }, 400);
            });

            player.on('error', (err) => {
                console.warn('[Bardeo] Error en reproductor, usando fallback TTS:', err.message);
                try {
                    const fallbackResource = createAudioResource(getTtsUrl(soundData.fallbackTts));
                    player.play(fallbackResource);
                } catch (_) {
                    connection.destroy();
                }
            });

            const embed = new EmbedBuilder()
                .setColor(config.COLORES?.WARN || 0xFFB74D)
                .setTitle('🎭  ¡Bardeo de Voz Ejecutado!')
                .setDescription(
                    `> 🎯 **Víctima:** ${member}\n` +
                    `> 🔊 **Sala:** <#${voiceChannel.id}>\n` +
                    `> 🎵 **Sonido reproducido:** \`${soundData.name}\``
                )
                .setFooter({ text: 'Prophet Gaming  ·  Modo Trol de Voz' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('[Bardeo] Error ejecutando comando de voz:', err);
            return interaction.editReply({
                content: `❌ Ocurrió un error al intentar conectarse a la sala de voz: ${err.message}`
            });
        }
    }
};
