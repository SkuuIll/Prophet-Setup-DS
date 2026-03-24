// ═══════════════════════════════════════════════════════════════
// COMANDO: /preferencias - Configurar preferencias de UX
// Prophet Bot v2.9
// ═══════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUserPreferences, setUserPreference, USER_PREFERENCES_SCHEMA, getUserState, updateUserState } = require('../../modules/uxEnhancements');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('preferencias')
        .setDescription('Configurá tus preferencias personales del bot')
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('Ver tus preferencias actuales'))
        .addSubcommand(sub =>
            sub.setName('tema')
                .setDescription('Cambiar el tema visual de los mensajes')
                .addStringOption(opt =>
                    opt.setName('opcion')
                        .setDescription('Tema a usar')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟣 Predeterminado (Púrpura)', value: 'default' },
                            { name: '🌑 Oscuro', value: 'dark' },
                            { name: '☀️ Claro', value: 'light' },
                            { name: '🎮 Prophet Gaming', value: 'prophet' }
                        )))
        .addSubcommand(sub =>
            sub.setName('zona-horaria')
                .setDescription('Configurar tu zona horaria')
                .addStringOption(opt =>
                    opt.setName('zona')
                        .setDescription('Tu zona horaria')
                        .setRequired(true)
                        .addChoices(
                            { name: '🇦🇷 Argentina (Buenos Aires)', value: 'America/Argentina/Buenos_Aires' },
                            { name: '🇨🇱 Chile (Santiago)', value: 'America/Santiago' },
                            { name: '🇲🇽 México (CDMX)', value: 'America/Mexico_City' },
                            { name: '🇨🇴 Colombia (Bogotá)', value: 'America/Bogota' },
                            { name: '🇪🇸 España (Madrid)', value: 'Europe/Madrid' },
                            { name: '🌍 UTC', value: 'UTC' },
                            { name: '🇺🇸 US East (NY)', value: 'America/New_York' },
                            { name: '🇺🇸 US West (LA)', value: 'America/Los_Angeles' }
                        )))
        .addSubcommand(sub =>
            sub.setName('idioma')
                .setDescription('Cambiar idioma del bot')
                .addStringOption(opt =>
                    opt.setName('opcion')
                        .setDescription('Idioma preferido')
                        .setRequired(true)
                        .addChoices(
                            { name: '🇦🇷 Español (Argentina)', value: 'es' },
                            { name: '🇺🇸 English', value: 'en' }
                        )))
        .addSubcommand(sub =>
            sub.setName('notificaciones')
                .setDescription('Configurar notificaciones generales')
                .addBooleanOption(opt =>
                    opt.setName('activar')
                        .setDescription('Activar o desactivar')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('resumen-diario')
                .setDescription('Recibir resumen diario de actividad')
                .addBooleanOption(opt =>
                    opt.setName('activar')
                        .setDescription('Activar o desactivar')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('perfil-privado')
                .setDescription('Hacer tu perfil privado')
                .addBooleanOption(opt =>
                    opt.setName('activar')
                        .setDescription('Activar o desactivar')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('modo-compacto')
                .setDescription('Usar mensajes más compactos')
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
            case 'tema':
                return await setPref(interaction, userId, 'theme', interaction.options.getString('opcion'));
            case 'zona-horaria':
                return await setPref(interaction, userId, 'timezone', interaction.options.getString('zona'));
            case 'idioma':
                return await setPref(interaction, userId, 'language', interaction.options.getString('opcion'));
            case 'notificaciones':
                return await setPref(interaction, userId, 'notifications', interaction.options.getBoolean('activar'));
            case 'resumen-diario':
                return await setPref(interaction, userId, 'daily_summary', interaction.options.getBoolean('activar'));
            case 'perfil-privado':
                return await setPref(interaction, userId, 'private_profile', interaction.options.getBoolean('activar'));
            case 'modo-compacto':
                return await setPref(interaction, userId, 'compact_mode', interaction.options.getBoolean('activar'));
        }
    }
};

async function showPreferences(interaction, userId) {
    const prefs = getUserPreferences(userId);
    const state = getUserState(userId);

    const themeEmoji = {
        'default': '🟣',
        'dark': '🌑',
        'light': '☀️',
        'prophet': '🎮'
    };

    const embed = new EmbedBuilder()
        .setTitle('⚙️ Tus Preferencias')
        .setColor(0xBB86FC)
        .setDescription('Configuración personal del bot')
        .addFields(
            { 
                name: '🎨 Tema Visual', 
                value: `${themeEmoji[prefs.theme] || '🟣'} ${prefs.theme.charAt(0).toUpperCase() + prefs.theme.slice(1)}`,
                inline: true 
            },
            { 
                name: '🌍 Zona Horaria', 
                value: prefs.timezone,
                inline: true 
            },
            { 
                name: '🗣️ Idioma', 
                value: prefs.language === 'es' ? '🇦🇷 Español' : '🇺🇸 English',
                inline: true 
            },
            { 
                name: '🔔 Notificaciones', 
                value: prefs.notifications ? '✅ Activas' : '❌ Inactivas',
                inline: true 
            },
            { 
                name: '📊 Resumen Diario', 
                value: prefs.daily_summary ? '✅ Activo' : '❌ Inactivo',
                inline: true 
            },
            { 
                name: '🔒 Perfil Privado', 
                value: prefs.private_profile ? '✅ Sí' : '❌ No',
                inline: true 
            },
            { 
                name: '📝 Modo Compacto', 
                value: prefs.compact_mode ? '✅ Activo' : '❌ No',
                inline: true 
            }
        )
        .setFooter({ text: 'Usá los subcomandos para cambiar cada opción' })
        .setTimestamp();

    // Menú de acceso rápido
    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('pref_quick_menu')
                .setPlaceholder('Cambiar preferencia...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Cambiar Tema')
                        .setValue('theme')
                        .setEmoji('🎨'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Cambiar Zona Horaria')
                        .setValue('timezone')
                        .setEmoji('🌍'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Cambiar Idioma')
                        .setValue('language')
                        .setEmoji('🗣️'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Toggle Notificaciones')
                        .setValue('notifications')
                        .setEmoji('🔔'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Toggle Resumen Diario')
                        .setValue('daily_summary')
                        .setEmoji('📊')
                )
        );

    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function setPref(interaction, userId, key, value) {
    try {
        setUserPreference(userId, key, value);
        
        const prefNames = {
            'theme': 'Tema Visual',
            'timezone': 'Zona Horaria',
            'language': 'Idioma',
            'notifications': 'Notificaciones',
            'daily_summary': 'Resumen Diario',
            'private_profile': 'Perfil Privado',
            'compact_mode': 'Modo Compacto'
        };

        const displayValue = typeof value === 'boolean' 
            ? (value ? '✅ Activado' : '❌ Desactivado')
            : value;

        const embed = new EmbedBuilder()
            .setTitle('✅ Preferencia Actualizada')
            .setColor(0x69F0AE)
            .addFields(
                { name: 'Opción', value: prefNames[key] || key, inline: true },
                { name: 'Nuevo valor', value: String(displayValue), inline: true }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        return interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}
