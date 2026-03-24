// ═══════════════════════════════════════════════════════════════
// COMANDO: /notificaciones - Sistema de notificaciones inteligentes
// Prophet Bot v2.9
// ═══════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { NOTIFICATION_TYPES, getUserPreferences, setNotificationPreference, disableNotification, addKeywordWatch, removeKeywordWatch, getUserKeywords } = require('../../modules/smartNotifications');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('notificaciones')
        .setDescription('Configurá tus notificaciones personalizadas')
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('Ver tus notificaciones activas'))
        .addSubcommand(sub =>
            sub.setName('streamer')
                .setDescription('Recibir alerta cuando un streamer esté en vivo')
                .addStringOption(opt =>
                    opt.setName('nombre')
                        .setDescription('Nombre del streamer de Twitch')
                        .setRequired(true)
                        .setMaxLength(50))
                .addBooleanOption(opt =>
                    opt.setName('activar')
                        .setDescription('Activar (true) o desactivar (false)')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('keyword')
                .setDescription('Alerta cuando se mencione una palabra clave')
                .addStringOption(opt =>
                    opt.setName('palabra')
                        .setDescription('Palabra o frase a vigilar')
                        .setRequired(true)
                        .setMaxLength(30))
                .addBooleanOption(opt =>
                    opt.setName('activar')
                        .setDescription('Activar (true) o desactivar (false)')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('progreso')
                .setDescription('Resumen diario de tu progreso')
                .addBooleanOption(opt =>
                    opt.setName('activar')
                        .setDescription('Activar o desactivar el resumen diario')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('actividad')
                .setDescription('Alertas de actividad del servidor')
                .addBooleanOption(opt =>
                    opt.setName('activar')
                        .setDescription('Activar o desactivar')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        switch (subcommand) {
            case 'ver':
                return await showPreferences(interaction, userId);
            case 'streamer':
                return await configStreamer(interaction, userId);
            case 'keyword':
                return await configKeyword(interaction, userId);
            case 'progreso':
                return await configProgress(interaction, userId);
            case 'actividad':
                return await configActivity(interaction, userId);
            default:
                return interaction.reply({ content: '❌ Subcomando no reconocido.', ephemeral: true });
        }
    }
};

async function showPreferences(interaction, userId) {
    const prefs = getUserPreferences(userId);
    const keywords = getUserKeywords(userId);

    const embed = new EmbedBuilder()
        .setTitle('🔔 Tus Notificaciones')
        .setColor(0xBB86FC)
        .setDescription('Configuración actual de tus notificaciones:')
        .addFields(
            { 
                name: '🔴 Streamers',
                value: prefs.filter(p => p.type === NOTIFICATION_TYPES.STREAMER_LIVE).length > 0
                    ? prefs.filter(p => p.type === NOTIFICATION_TYPES.STREAMER_LIVE).map(p => `• ${p.target}`).join('\n')
                    : 'Ninguno configurado',
                inline: true
            },
            {
                name: '📌 Keywords',
                value: keywords.length > 0
                    ? keywords.map(k => `• "${k}"`).join('\n')
                    : 'Ninguna configurada',
                inline: true
            },
            {
                name: '📊 Resumen Diario',
                value: prefs.some(p => p.type === NOTIFICATION_TYPES.PROGRESS_SUMMARY) ? '✅ Activo' : '❌ Inactivo',
                inline: true
            },
            {
                name: '🏠 Actividad Server',
                value: prefs.some(p => p.type === NOTIFICATION_TYPES.SERVER_ACTIVITY) ? '✅ Activo' : '❌ Inactivo',
                inline: true
            }
        )
        .setFooter({ text: 'Usá los subcomandos para configurar' })
        .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function configStreamer(interaction, userId) {
    const nombre = interaction.options.getString('nombre').toLowerCase();
    const activar = interaction.options.getBoolean('activar');

    if (activar) {
        setNotificationPreference(userId, NOTIFICATION_TYPES.STREAMER_LIVE, nombre);
        
        const embed = new EmbedBuilder()
            .setTitle('🔴 Streamer Añadido')
            .setColor(0x69F0AE)
            .setDescription(`Vas a recibir un DM cuando **${nombre}** esté en vivo en Twitch.`)
            .addFields({ name: 'Streamer', value: nombre, inline: true })
            .setThumbnail(`https://unavatar.io/twitch/${nombre}?fallback=https://cdn.7tv.app/emote/6043a6a7123e6ceba45865a4/4x.png`)
            .setFooter({ text: 'Podés configurar hasta 10 streamers' });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
        disableNotification(userId, NOTIFICATION_TYPES.STREAMER_LIVE, nombre);
        
        return interaction.reply({
            content: `🔕 Notificaciones desactivadas para **${nombre}**.`,
            ephemeral: true
        });
    }
}

async function configKeyword(interaction, userId) {
    const palabra = interaction.options.getString('palabra').toLowerCase();
    const activar = interaction.options.getBoolean('activar');

    // Verificar límite
    const currentKeywords = getUserKeywords(userId);
    if (activar && currentKeywords.length >= 10) {
        return interaction.reply({
            content: '❌ Ya tienes 10 keywords configuradas. Eliminá alguna para agregar nuevas.',
            ephemeral: true
        });
    }

    if (activar) {
        addKeywordWatch(userId, palabra);
        
        const embed = new EmbedBuilder()
            .setTitle('📌 Keyword Añadida')
            .setColor(0x69F0AE)
            .setDescription(`Vas a recibir un DM cuando alguien mencione **"${palabra}"** en el servidor.`)
            .addFields(
                { name: 'Keyword', value: `"${palabra}"`, inline: true },
                { name: 'Keywords activas', value: `${currentKeywords.length + 1}/10`, inline: true }
            )
            .setFooter({ text: 'Solo funciona en canales donde el bot puede leer mensajes' });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
        removeKeywordWatch(userId, palabra);
        
        return interaction.reply({
            content: `🔕 Ya no vas a recibir alertas por **"${palabra}"**.`,
            ephemeral: true
        });
    }
}

async function configProgress(interaction, userId) {
    const activar = interaction.options.getBoolean('activar');

    if (activar) {
        setNotificationPreference(userId, NOTIFICATION_TYPES.PROGRESS_SUMMARY, 'daily');
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Resumen Diario Activado')
            .setColor(0x69F0AE)
            .setDescription('Cada día vas a recibir por DM un resumen con tu progreso:')
            .addFields(
                { name: 'Incluye', value: '• XP y nivel actual\n• Mensajes del día\n• Coins ganados\n• Racha de actividad' }
            )
            .setFooter({ text: 'El resumen se envía a las 00:00 Argentina' });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
        disableNotification(userId, NOTIFICATION_TYPES.PROGRESS_SUMMARY);
        
        return interaction.reply({
            content: '🔕 Resumen diario desactivado.',
            ephemeral: true
        });
    }
}

async function configActivity(interaction, userId) {
    const activar = interaction.options.getBoolean('activar');

    if (activar) {
        setNotificationPreference(userId, NOTIFICATION_TYPES.SERVER_ACTIVITY, 'all');
        
        const embed = new EmbedBuilder()
            .setTitle('🏠 Alertas de Actividad')
            .setColor(0x69F0AE)
            .setDescription('Vas a recibir notificaciones cuando:')
            .addFields(
                { name: 'Eventos', value: '• Nuevos sorteos\n• Eventos especiales\n• Anuncios importantes' }
            );

        return interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
        disableNotification(userId, NOTIFICATION_TYPES.SERVER_ACTIVITY);
        
        return interaction.reply({
            content: '🔕 Alertas de actividad desactivadas.',
            ephemeral: true
        });
    }
}
