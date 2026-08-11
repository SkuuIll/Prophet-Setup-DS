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

/**
 * Obtener URL de TTS de Google en español latino/argentino
 */
function getTtsUrl(text) {
    return `https://translate.google.com/translate_tts?ie=UTF-8&tl=es-US&client=tw-ob&q=${encodeURIComponent(text)}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('confesion')
        .setDescription('🕵️ Entra a tu sala de voz y cuenta una confesión anónima (TTS)')
        .addStringOption(opt =>
            opt.setName('mensaje')
                .setDescription('Lo que quieres que diga el bot (se dirá con voz robótica anónima)')
                .setRequired(true)
                .setMaxLength(200)
        ),

    async execute(interaction) {
        const texto = interaction.options.getString('mensaje');

        const voiceChannel = interaction.member.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply({
                content: `❌ **Tenés que estar en un canal de voz** para que el bot entre a decir tu confesión.`,
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
            console.log(`[Confesión] Conectando a canal "${voiceChannel.name}" para hablar.`);

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: false
            });

            await entersState(connection, VoiceConnectionStatus.Ready, 5000);

            const player = createAudioPlayer();
            
            // TTS para confesión directo (sin intro)
            const resource = createAudioResource(getTtsUrl(texto));

            player.play(resource);
            connection.subscribe(player);

            // Calcular un timeout máximo basado en la cantidad de caracteres
            // Google TTS habla aprox a 15 caracteres por segundo
            const estDurationMs = (texto.length / 10) * 1000 + 3000;
            const maxDuration = Math.min(estDurationMs + 5000, 30000); // max 30 segs
            
            const safetyTimeout = setTimeout(() => {
                try {
                    connection.destroy();
                } catch (_) {}
            }, maxDuration);

            player.on(AudioPlayerStatus.Idle, () => {
                clearTimeout(safetyTimeout);
                setTimeout(() => {
                    try {
                        connection.destroy();
                    } catch (_) {}
                }, 500);
            });

            player.on('error', (err) => {
                console.warn('[Confesión] Error en reproductor TTS:', err.message);
                try {
                    connection.destroy();
                } catch (_) {}
            });

            const embed = new EmbedBuilder()
                .setColor(0x9C27B0) // Violeta para confesiones
                .setTitle('🕵️ ¡Confesión Anónima Entregada!')
                .setDescription(`> 🔊 El bot entró a **<#${voiceChannel.id}>** y dijo tu mensaje.`)
                .setFooter({ text: 'Nadie más sabe que fuiste vos 👀' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('[Confesión] Error ejecutando comando:', err);
            return interaction.editReply({
                content: `❌ Ocurrió un error al intentar conectarse a la sala de voz: ${err.message}`
            });
        }
    }
};
