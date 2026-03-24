// ═══════════════════════════════════════════════════════════════
// SISTEMA DE MEJORAS DE UX
// Prophet Bot v2.9
// ═══════════════════════════════════════════════════════════════

const { _db: db } = require('../database');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');

// ═══ PERSISTENCIA DE ESTADO ═══

function getUserState(userId) {
    let state = db.prepare(`SELECT * FROM user_state WHERE user_id = ?`).get(userId);
    
    if (!state) {
        db.prepare(`INSERT OR IGNORE INTO user_state (user_id) VALUES (?)`).run(userId);
        state = {
            user_id: userId,
            last_leaderboard_page: 1,
            last_shop_page: 1,
            last_ecotop_page: 1,
            last_top_page: 1,
            last_command: null,
            last_command_at: null,
            last_viewed_profile: null,
            preferences: '{}'
        };
    }
    
    return {
        ...state,
        preferences: JSON.parse(state.preferences || '{}')
    };
}

function updateUserState(userId, updates) {
    const state = getUserState(userId);
    const merged = { ...state, ...updates };
    
    if (updates.preferences) {
        merged.preferences = JSON.stringify({ ...state.preferences, ...updates.preferences });
    }
    
    return db.prepare(`
        INSERT OR REPLACE INTO user_state 
        (user_id, last_leaderboard_page, last_shop_page, last_ecotop_page, last_top_page, last_command, last_command_at, last_viewed_profile, preferences)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        userId,
        merged.last_leaderboard_page || 1,
        merged.last_shop_page || 1,
        merged.last_ecotop_page || 1,
        merged.last_top_page || 1,
        merged.last_command,
        merged.last_command_at,
        merged.last_viewed_profile,
        merged.preferences || '{}'
    );
}

function updateLastCommand(userId, commandName) {
    return updateUserState(userId, {
        last_command: commandName,
        last_command_at: Date.now()
    });
}

function updatePageState(userId, pageType, page) {
    const fieldMap = {
        'leaderboard': 'last_leaderboard_page',
        'shop': 'last_shop_page',
        'ecotop': 'last_ecotop_page',
        'top': 'last_top_page'
    };
    
    const field = fieldMap[pageType];
    if (!field) return null;
    
    return updateUserState(userId, { [field]: page });
}

function getLastPage(userId, pageType) {
    const state = getUserState(userId);
    const fieldMap = {
        'leaderboard': 'last_leaderboard_page',
        'shop': 'last_shop_page',
        'ecotop': 'last_ecotop_page',
        'top': 'last_top_page'
    };
    
    return state[fieldMap[pageType]] || 1;
}

// ═══ PREFERENCIAS DE USUARIO ═══

const USER_PREFERENCES_SCHEMA = {
    theme: { type: 'string', default: 'default', options: ['default', 'dark', 'light', 'prophet'] },
    language: { type: 'string', default: 'es', options: ['es', 'en'] },
    timezone: { type: 'string', default: 'America/Argentina/Buenos_Aires' },
    compact_mode: { type: 'boolean', default: false },
    show_timestamps: { type: 'boolean', default: true },
    notifications: { type: 'boolean', default: true },
    daily_summary: { type: 'boolean', default: false },
    private_profile: { type: 'boolean', default: false }
};

function getUserPreferences(userId) {
    const state = getUserState(userId);
    const prefs = state.preferences || {};
    
    // Aplicar defaults
    const result = {};
    for (const [key, schema] of Object.entries(USER_PREFERENCES_SCHEMA)) {
        result[key] = prefs[key] !== undefined ? prefs[key] : schema.default;
    }
    
    return result;
}

function setUserPreference(userId, key, value) {
    if (!USER_PREFERENCES_SCHEMA[key]) {
        throw new Error(`Preferencia desconocida: ${key}`);
    }
    
    const schema = USER_PREFERENCES_SCHEMA[key];
    
    // Validar tipo
    if (schema.type === 'boolean') {
        value = Boolean(value);
    } else if (schema.type === 'string') {
        value = String(value);
        if (schema.options && !schema.options.includes(value)) {
            throw new Error(`Valor inválido para ${key}. Opciones: ${schema.options.join(', ')}`);
        }
    }
    
    return updateUserState(userId, {
        preferences: { [key]: value }
    });
}

// ═══ MODALES INTERACTIVOS ═══

function createReportModal() {
    return new ModalBuilder()
        .setCustomId('report_modal')
        .setTitle('Reportar Usuario')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('report_reason')
                    .setLabel('Razón del reporte')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Describí el motivo del reporte...')
                    .setRequired(true)
                    .setMaxLength(1000)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('report_evidence')
                    .setLabel('Evidencia (links)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Links a capturas o mensajes (opcional)')
                    .setRequired(false)
                    .setMaxLength(500)
            )
        );
}

function createReminderModal() {
    return new ModalBuilder()
        .setCustomId('reminder_modal')
        .setTitle('Crear Recordatorio')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('reminder_time')
                    .setLabel('Tiempo (ej: 10m, 1h, 2d)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('1h30m')
                    .setRequired(true)
                    .setMaxLength(20)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('reminder_message')
                    .setLabel('Mensaje del recordatorio')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('¿Qué querés que te recuerde?')
                    .setRequired(true)
                    .setMaxLength(500)
            )
        );
}

function createEventModal() {
    return new ModalBuilder()
        .setCustomId('event_modal')
        .setTitle('Crear Evento')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('event_name')
                    .setLabel('Nombre del evento')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ej: Torneo de Valorant')
                    .setRequired(true)
                    .setMaxLength(100)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('event_description')
                    .setLabel('Descripción')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Detalles del evento...')
                    .setRequired(true)
                    .setMaxLength(1000)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('event_datetime')
                    .setLabel('Fecha y hora (DD/MM HH:MM)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('25/03 22:00')
                    .setRequired(true)
                    .setMaxLength(20)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('event_max')
                    .setLabel('Máximo participantes (0 = sin límite)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('20')
                    .setRequired(false)
                    .setMaxLength(5)
            )
        );
}

function createEmbedModal() {
    return new ModalBuilder()
        .setCustomId('embed_modal')
        .setTitle('Constructor de Embed')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('embed_title')
                    .setLabel('Título')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Título del mensaje')
                    .setRequired(true)
                    .setMaxLength(256)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('embed_description')
                    .setLabel('Descripción')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Contenido del mensaje...')
                    .setRequired(true)
                    .setMaxLength(4000)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('embed_color')
                    .setLabel('Color (HEX, ej: #BB86FC)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('#BB86FC')
                    .setRequired(false)
                    .setMaxLength(7)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('embed_image')
                    .setLabel('URL de imagen')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('https://...')
                    .setRequired(false)
                    .setMaxLength(500)
            )
        );
}

function createSuggestionModal() {
    return new ModalBuilder()
        .setCustomId('suggestion_modal')
        .setTitle('Enviar Sugerencia')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('suggestion_title')
                    .setLabel('Título de la sugerencia')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Resumen breve de tu idea')
                    .setRequired(true)
                    .setMaxLength(100)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('suggestion_description')
                    .setLabel('Descripción detallada')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Explicá tu sugerencia en detalle...')
                    .setRequired(true)
                    .setMaxLength(1000)
            )
        );
}

function createNoteModal() {
    return new ModalBuilder()
        .setCustomId('note_modal')
        .setTitle('Agregar Nota')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('note_content')
                    .setLabel('Nota')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Contenido de la nota...')
                    .setRequired(true)
                    .setMaxLength(1000)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('note_type')
                    .setLabel('Tipo (info/warning/danger)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('info')
                    .setRequired(false)
                    .setMaxLength(10)
            )
        );
}

// ═══ MENÚS SELECT DINÁMICOS ═══

function createCategorySelectMenu(customId, placeholder = 'Seleccioná una categoría') {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎵 Música')
                    .setDescription('Comandos de música y audio')
                    .setValue('music')
                    .setEmoji('🎵'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💰 Economía')
                    .setDescription('Sistema económico')
                    .setValue('economy')
                    .setEmoji('💰'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📈 Niveles')
                    .setDescription('XP y rangos')
                    .setValue('levels')
                    .setEmoji('📈'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛡️ Moderación')
                    .setDescription('Herramientas de moderación')
                    .setValue('mod')
                    .setEmoji('🛡️'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎮 Gaming')
                    .setDescription('Stats y búsquedas')
                    .setValue('gaming')
                    .setEmoji('🎮'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔧 Utilidades')
                    .setDescription('Herramientas varias')
                    .setValue('utility')
                    .setEmoji('🔧'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎉 Entretenimiento')
                    .setDescription('Juegos y diversión')
                    .setValue('fun')
                    .setEmoji('🎉')
            )
    );
}

function createThemeSelectMenu() {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('theme_select')
            .setPlaceholder('Elegí un tema')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Predeterminado (Púrpura)')
                    .setDescription('Tema Prophet clásico')
                    .setValue('default')
                    .setEmoji('🟣'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Oscuro')
                    .setDescription('Tema oscuro minimalista')
                    .setValue('dark')
                    .setEmoji('🌑'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Claro')
                    .setDescription('Tema claro')
                    .setValue('light')
                    .setEmoji('☀️'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Prophet Gaming')
                    .setDescription('Colores Prophet Gaming')
                    .setValue('prophet')
                    .setEmoji('🎮')
            )
    );
}

function createTimezoneSelectMenu() {
    const timezones = [
        { label: 'Argentina (Buenos Aires)', value: 'America/Argentina/Buenos_Aires', emoji: '🇦🇷' },
        { label: 'Chile (Santiago)', value: 'America/Santiago', emoji: '🇨🇱' },
        { label: 'México (Ciudad de México)', value: 'America/Mexico_City', emoji: '🇲🇽' },
        { label: 'Colombia (Bogotá)', value: 'America/Bogota', emoji: '🇨🇴' },
        { label: 'España (Madrid)', value: 'Europe/Madrid', emoji: '🇪🇸' },
        { label: 'UTC', value: 'UTC', emoji: '🌍' },
        { label: 'US East (New York)', value: 'America/New_York', emoji: '🇺🇸' },
        { label: 'US West (Los Angeles)', value: 'America/Los_Angeles', emoji: '🇺🇸' }
    ];

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('timezone_select')
            .setPlaceholder('Seleccioná tu zona horaria')
            .addOptions(
                timezones.map(tz => 
                    new StringSelectMenuOptionBuilder()
                        .setLabel(tz.label)
                        .setValue(tz.value)
                        .setEmoji(tz.emoji)
                )
            )
    );
}

// ═══ COMANDOS CONTEXTUALES ═══

function createContextualCommands() {
    return [
        // Ver Perfil
        new ContextMenuCommandBuilder()
            .setName('Ver Perfil')
            .setType(ApplicationCommandType.User),
        
        // Dar Coins
        new ContextMenuCommandBuilder()
            .setName('Dar Coins')
            .setType(ApplicationCommandType.User),
        
        // Ver Advertencias
        new ContextMenuCommandBuilder()
            .setName('Ver Advertencias')
            .setType(ApplicationCommandType.User),
        
        // Agregar Nota (Mod)
        new ContextMenuCommandBuilder()
            .setName('Agregar Nota (Mod)')
            .setType(ApplicationCommandType.User),
        
        // Reportar
        new ContextMenuCommandBuilder()
            .setName('Reportar Usuario')
            .setType(ApplicationCommandType.User),
        
        // Traducir Mensaje
        new ContextMenuCommandBuilder()
            .setName('Traducir Mensaje')
            .setType(ApplicationCommandType.Message),
        
        // Guardar Mensaje
        new ContextMenuCommandBuilder()
            .setName('Guardar Mensaje')
            .setType(ApplicationCommandType.Message),
        
        // Ver Detalles
        new ContextMenuCommandBuilder()
            .setName('Ver Detalles')
            .setType(ApplicationCommandType.Message)
    ];
}

// ═══ AUTOCOMPLETADO DINÁMICO ═══

async function getMusicAutocomplete(client, userId, query) {
    const history = getUserMusicHistory(userId);
    const suggestions = [];

    // Historial reciente
    if (history.length > 0) {
        const recent = history
            .filter(h => h.title.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5);
        
        for (const song of recent) {
            suggestions.push({
                name: `🕐 ${song.title.substring(0, 80)}`,
                value: song.url || song.title
            });
        }
    }

    // Trending del servidor (si existe)
    const trending = getServerTrendingSongs(client);
    if (trending.length > 0) {
        const matching = trending
            .filter(t => t.title.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5);
        
        for (const song of matching) {
            suggestions.push({
                name: `🔥 ${song.title.substring(0, 80)}`,
                value: song.url || song.title
            });
        }
    }

    return suggestions.slice(0, 25);
}

function getUserMusicHistory(userId) {
    // Por ahora retorna array vacío, implementar con tabla de historial
    return [];
}

function getServerTrendingSongs(client) {
    // Por ahora retorna array vacío, implementar con tracking
    return [];
}

async function getUserAutocomplete(guild, query) {
    if (!guild) return [];
    
    const members = await guild.members.fetch({ limit: 50 });
    const q = query.toLowerCase();
    
    return members
        .filter(m => 
            m.user.username.toLowerCase().includes(q) ||
            m.displayName.toLowerCase().includes(q)
        )
        .map(m => ({
            name: `${m.displayName} (${m.user.username})`,
            value: m.id
        }))
        .slice(0, 25);
}

async function getCommandAutocomplete(client, userId, query) {
    const state = getUserState(userId);
    const commands = Array.from(client.commands.keys());
    const q = query.toLowerCase();
    
    // Comandos usados recientemente primero
    const suggestions = [];
    
    if (state.last_command && state.last_command.toLowerCase().includes(q)) {
        suggestions.push({
            name: `🕐 ${state.last_command} (último usado)`,
            value: state.last_command
        });
    }
    
    // Otros comandos que coincidan
    const matching = commands
        .filter(c => c.toLowerCase().includes(q) && c !== state.last_command)
        .slice(0, 24);
    
    for (const cmd of matching) {
        suggestions.push({
            name: `/${cmd}`,
            value: cmd
        });
    }
    
    return suggestions.slice(0, 25);
}

// ═══ COLORES POR TEMA ═══

const THEME_COLORS = {
    default: {
        primary: 0xBB86FC,
        success: 0x69F0AE,
        error: 0xEF5350,
        warning: 0xFFB74D,
        info: 0x42A5F5
    },
    dark: {
        primary: 0x2D2D2D,
        success: 0x4CAF50,
        error: 0xF44336,
        warning: 0xFF9800,
        info: 0x2196F3
    },
    light: {
        primary: 0xE1BEE7,
        success: 0xC8E6C9,
        error: 0xFFCDD2,
        warning: 0xFFE0B2,
        info: 0xBBDEFB
    },
    prophet: {
        primary: 0x7B1FA2,
        success: 0x00E676,
        error: 0xFF1744,
        warning: 0xFFD600,
        info: 0x00B0FF
    }
};

function getThemeColors(userId) {
    const prefs = getUserPreferences(userId);
    return THEME_COLORS[prefs.theme] || THEME_COLORS.default;
}

// ═══ EXPORTACIONES ═══

module.exports = {
    // Estado
    getUserState,
    updateUserState,
    updateLastCommand,
    updatePageState,
    getLastPage,
    // Preferencias
    USER_PREFERENCES_SCHEMA,
    getUserPreferences,
    setUserPreference,
    // Modales
    createReportModal,
    createReminderModal,
    createEventModal,
    createEmbedModal,
    createSuggestionModal,
    createNoteModal,
    // Menús
    createCategorySelectMenu,
    createThemeSelectMenu,
    createTimezoneSelectMenu,
    // Comandos contextuales
    createContextualCommands,
    // Autocompletado
    getMusicAutocomplete,
    getUserAutocomplete,
    getCommandAutocomplete,
    // Temas
    THEME_COLORS,
    getThemeColors
};
