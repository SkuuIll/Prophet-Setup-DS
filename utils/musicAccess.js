const { notice } = require('./discordUI');

/**
 * Las acciones que alteran el reproductor solo pueden ejecutarse desde el
 * mismo canal de voz. Discord puede enviar miembros parciales en interacciones.
 */
function musicControlError(interaction) {
    const userVoiceId = interaction.member?.voice?.channelId
        || interaction.member?.voice?.channel?.id
        || interaction.guild?.members?.cache?.get(interaction.user?.id)?.voice?.channelId;
    const botVoiceId = interaction.guild?.members?.me?.voice?.channelId;
    if (!userVoiceId) return 'Tenés que conectarte a un canal de voz para controlar la música.';
    if (!botVoiceId) return 'El bot todavía no está en un canal de voz. Usá /play para empezar.';
    if (userVoiceId !== botVoiceId) return 'Tenés que estar en el mismo canal de voz que Prophet Music.';
    return null;
}

function musicNotice(title, description, tone = 'warning') {
    return notice({ title, description, tone });
}

function ensureMusicController(interaction) {
    const error = musicControlError(interaction);
    if (!error) return null;
    return musicNotice('Control de música', error);
}

module.exports = { musicControlError, musicNotice, ensureMusicController };
