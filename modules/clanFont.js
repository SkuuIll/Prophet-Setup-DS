'use strict';

// ═══════════════════════════════════════════════════════════
//  💎 MÓDULO DE FUENTES ESTILIZADAS DEL CLAN (SMALL CAPS & MÁS)
// ═══════════════════════════════════════════════════════════

const { PermissionsBitField } = require('discord.js');
const { stmts } = require('../database');

// Mapeo Unicode de fuentes
const FONT_MAPS = {
    'small-caps': {
        name: 'Small Caps (Minúsculas Mayúsculas)',
        description: 'Fuente estética estándar para clanes gaming',
        map: {
            'a': 'ᴀ', 'A': 'ᴀ',
            'b': 'ʙ', 'B': 'ʙ',
            'c': 'ᴄ', 'C': 'ᴄ',
            'd': 'ᴅ', 'D': 'ᴅ',
            'e': 'ᴇ', 'E': 'ᴇ',
            'f': 'ғ', 'F': 'ғ',
            'g': 'ɢ', 'G': 'ɢ',
            'h': 'ʜ', 'H': 'ʜ',
            'i': 'ɪ', 'I': 'ɪ',
            'j': 'ᴊ', 'J': 'ᴊ',
            'k': 'ᴋ', 'K': 'ᴋ',
            'l': 'ʟ', 'L': 'ʟ',
            'm': 'ᴍ', 'M': 'ᴍ',
            'n': 'ɴ', 'N': 'ɴ',
            'o': 'ᴏ', 'O': 'ᴏ',
            'p': 'ᴘ', 'P': 'ᴘ',
            'q': 'ǫ', 'Q': 'ǫ',
            'r': 'ʀ', 'R': 'ʀ',
            's': 's', 'S': 's',
            't': 'ᴛ', 'T': 'ᴛ',
            'u': 'ᴜ', 'U': 'ᴜ',
            'v': 'ᴠ', 'V': 'ᴠ',
            'w': 'ᴡ', 'W': 'ᴡ',
            'x': 'x', 'X': 'x',
            'y': 'ʏ', 'Y': 'ʏ',
            'z': 'ᴢ', 'Z': 'ᴢ',
            'á': 'ᴀ', 'Á': 'ᴀ', 'à': 'ᴀ', 'À': 'ᴀ', 'â': 'ᴀ', 'Â': 'ᴀ', 'ä': 'ᴀ', 'Ä': 'ᴀ', 'ã': 'ᴀ', 'Ã': 'ᴀ',
            'é': 'ᴇ', 'É': 'ᴇ', 'è': 'ᴇ', 'È': 'ᴇ', 'ê': 'ᴇ', 'Ê': 'ᴇ', 'ë': 'ᴇ', 'Ë': 'ᴇ',
            'í': 'ɪ', 'Í': 'ɪ', 'ì': 'ɪ', 'Ì': 'ɪ', 'î': 'ɪ', 'Î': 'ɪ', 'ï': 'ɪ', 'Ï': 'ɪ',
            'ó': 'ᴏ', 'Ó': 'ᴏ', 'ò': 'ᴏ', 'Ò': 'ᴏ', 'ô': 'ᴏ', 'Ô': 'ᴏ', 'ö': 'ᴏ', 'Ö': 'ᴏ', 'õ': 'ᴏ', 'Õ': 'ᴏ',
            'ú': 'ᴜ', 'Ú': 'ᴜ', 'ù': 'ᴜ', 'Ù': 'ᴜ', 'û': 'ᴜ', 'Û': 'ᴜ', 'ü': 'ᴜ', 'Ü': 'ᴜ',
            'ñ': 'ɴ', 'Ñ': 'ɴ', 'ç': 'ᴄ', 'Ç': 'ᴄ'
        }
    },
    'bold-sans': {
        name: 'Sans Bold (Moderna Gruesa)',
        description: 'Tipografía moderna y llamativa',
        map: {
            'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶',
            'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿',
            's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
            'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜',
            'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥',
            'S': '𝗦', 'T': '𝗧', 'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
            '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
        }
    },
    'bold-serif': {
        name: 'Serif Bold (Elegante)',
        description: 'Tipografía clásica y formal',
        map: {
            'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢',
            'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫',
            's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
            'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈',
            'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑',
            'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
            '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
        }
    },
    'gothic': {
        name: 'Gótica / Fraktur',
        description: 'Estilo medieval / gótico',
        map: {
            'a': '𝔞', 'b': '𝔟', 'c': '𝔠', 'd': '𝔡', 'e': '𝔢', 'f': '𝔣', 'g': '𝔤', 'h': '𝔥', 'i': '𝔦',
            'j': '𝔧', 'k': '𝔨', 'l': '𝔩', 'm': '𝔪', 'n': '𝔫', 'o': '𝔬', 'p': '𝔭', 'q': '𝔮', 'r': '𝔯',
            's': '𝔰', 't': '𝔱', 'u': '𝔲', 'v': '𝔳', 'w': '𝔴', 'x': '𝔵', 'y': '𝔶', 'z': '𝔷',
            'A': '𝔄', 'B': '𝔅', 'C': 'ℭ', 'D': '𝔇', 'E': '𝔈', 'F': '𝔉', 'G': '𝔊', 'H': 'ℌ', 'I': 'ℑ',
            'J': '𝔍', 'K': '𝔎', 'L': '𝔏', 'M': '𝔐', 'N': '𝔑', 'O': '𝔒', 'P': '𝔓', 'Q': '𝔔', 'R': 'ℜ',
            'S': '𝔖', 'T': '𝔗', 'U': '𝔘', 'V': '𝔙', 'W': '𝔚', 'X': '𝔛', 'Y': '𝔜', 'Z': 'ℨ'
        }
    },
    'double-struck': {
        name: 'Doble Línea (Aesthetic)',
        description: 'Estilo hueco / doble línea moderno',
        map: {
            'a': '𝕒', 'b': '𝕓', 'c': '𝕔', 'd': '𝕕', 'e': '𝕖', 'f': '𝕗', 'g': '𝕘', 'h': '𝕙', 'i': '𝕚',
            'j': '𝕛', 'k': '𝕜', 'l': '𝕝', 'm': '𝕞', 'n': '𝕟', 'o': '𝕠', 'p': '𝕡', 'q': '𝕢', 'r': '𝕣',
            's': '𝕤', 't': '𝕥', 'u': '𝕦', 'v': '𝕧', 'w': '𝕨', 'x': '𝕩', 'y': '𝕪', 'z': '𝕫',
            'A': '𝔸', 'B': '𝔹', 'C': 'ℂ', 'D': '𝔻', 'E': '𝔼', 'F': '𝔽', 'G': '𝔾', 'H': 'ℍ', 'I': '𝕀',
            'J': '𝕁', 'K': '𝕂', 'L': '𝕃', 'M': '𝕄', 'N': 'ℕ', 'O': '𝕆', 'P': 'ℙ', 'Q': 'ℚ', 'R': 'ℝ',
            'S': '𝕊', 'T': '𝕋', 'U': '𝕌', 'V': '𝕍', 'W': '𝕎', 'X': '𝕏', 'Y': '𝕐', 'Z': 'ℤ',
            '0': '𝟘', '1': '𝟙', '2': '𝟚', '3': '𝟛', '4': '𝟜', '5': '𝟝', '6': '𝟞', '7': '𝟟', '8': '𝟠', '9': '𝟡'
        }
    },
    'monospace': {
        name: 'Monospace (Código)',
        description: 'Espaciado fijo tipo terminal / retro',
        map: {
            'a': '𝚊', 'b': '𝚋', 'c': '𝚌', 'd': '𝚍', 'e': '𝚎', 'f': '𝚏', 'g': '𝚐', 'h': '𝚑', 'i': '𝚒',
            'j': '𝚓', 'k': '𝚔', 'l': '𝚕', 'm': '𝚖', 'n': '𝚗', 'o': '𝚘', 'p': '𝚙', 'q': '𝚚', 'r': '𝚛',
            's': '𝚜', 't': '𝚝', 'u': '𝚞', 'v': '𝚟', 'w': '𝚠', 'x': '𝚡', 'y': '𝚢', 'z': '𝚣',
            'A': '𝙰', 'B': '𝙱', 'C': '𝙲', 'D': '𝙳', 'E': '𝙴', 'F': '𝙵', 'G': '𝙶', 'H': '𝙷', 'I': '𝙸',
            'J': '𝙹', 'K': '𝙺', 'L': '𝙻', 'M': '𝙼', 'N': '𝙽', 'O': '𝙾', 'P': '𝙿', 'Q': '𝚀', 'R': '𝚁',
            'S': '𝚂', 'T': '𝚃', 'U': '𝚄', 'V': '𝚅', 'W': '𝚆', 'X': '𝚇', 'Y': '𝚈', 'Z': '𝚉',
            '0': '𝟶', '1': '𝟷', '2': '𝟸', '3': '𝟹', '4': '𝟺', '5': '𝟻', '6': '𝟼', '7': '𝟽', '8': '𝟾', '9': '𝟿'
        }
    }
};

// Construir mapeo inverso para decodificar cualquier fuente estilizada a texto plano estándar
const UNICODE_TO_PLAIN = {
    // Small Caps
    'ᴀ': 'a', 'ʙ': 'b', 'ᴄ': 'c', 'ᴅ': 'd', 'ᴇ': 'e', 'ғ': 'f', 'ɢ': 'g',
    'ʜ': 'h', 'ɪ': 'i', 'ᴊ': 'j', 'ᴋ': 'k', 'ʟ': 'l', 'ᴍ': 'm', 'ɴ': 'n',
    'ᴏ': 'o', 'ᴘ': 'p', 'ǫ': 'q', 'ʀ': 'r', 's': 's', 'ᴛ': 't', 'ᴜ': 'u',
    'ᴠ': 'v', 'ᴡ': 'w', 'x': 'x', 'ʏ': 'y', 'ᴢ': 'z'
};

// Auto-poblar el mapeo inverso desde todos los estilos de fuentes registrados
for (const styleObj of Object.values(FONT_MAPS)) {
    if (styleObj && styleObj.map) {
        for (const [plainChar, styledChar] of Object.entries(styleObj.map)) {
            if (!UNICODE_TO_PLAIN[styledChar]) {
                UNICODE_TO_PLAIN[styledChar] = plainChar;
            }
        }
    }
}

/**
 * Normaliza cualquier texto que ya contenga fuentes estilizadas o caracteres especiales a texto plano estándar
 * @param {string} text - Texto con o sin fuentes estilizadas
 * @returns {string} Texto plano ASCII normalizado
 */
function normalizeToPlainText(text) {
    if (!text || typeof text !== 'string') return '';
    let result = '';
    for (const char of Array.from(text)) {
        if (UNICODE_TO_PLAIN[char]) {
            result += UNICODE_TO_PLAIN[char];
            continue;
        }
        const code = char.codePointAt(0);
        // Fullwidth ASCII (FF01-FF5E -> 21-7E)
        if (code >= 0xFF01 && code <= 0xFF5E) {
            result += String.fromCodePoint(code - 0xFEE0);
        } else {
            result += char;
        }
    }
    return result;
}

/**
 * Convierte un texto a la fuente Unicode indicada (normalizando primero si ya tenía otra fuente)
 * @param {string} text - Texto a convertir
 * @param {string} style - Estilo ('small-caps', 'bold-sans', 'bold-serif', 'gothic', 'double-struck', 'monospace')
 * @returns {string} Texto convertido
 */
function convertText(text, style = 'small-caps') {
    if (!text || typeof text !== 'string') return '';
    const plain = normalizeToPlainText(text);
    const styleObj = FONT_MAPS[style] || FONT_MAPS['small-caps'];
    const map = styleObj.map;

    let result = '';
    for (const char of Array.from(plain)) {
        result += map[char] || char;
    }

    return Array.from(result).slice(0, 32).join('');
}

/**
 * Verifica si el bot puede gestionar y cambiar el apodo de un miembro
 */
function canManageMember(member) {
    if (!member || member.user?.bot) return false;
    const guild = member.guild;
    if (!guild) return false;

    // No se puede cambiar el apodo del dueño del servidor
    if (member.id === guild.ownerId) return false;

    const me = guild.members.me;
    if (!me) return false;

    // Verificar si el bot tiene el permiso de Gestionar Apodos
    if (!me.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
        return false;
    }

    // Verificar jerarquía de roles
    return me.roles.highest.position > member.roles.highest.position;
}

/**
 * Aplica una fuente estilizada al nombre de vista (displayName) de un miembro
 * @param {GuildMember} member - Miembro de Discord
 * @param {string} style - Estilo de tipografía
 * @param {string} reason - Razón para auditoría
 * @param {boolean} updateOriginal - Si se debe sobrescribir el nombre original de referencia
 */
async function applyClanFont(member, style = 'small-caps', reason = 'Estilo de fuente del clan', updateOriginal = false) {
    if (!member) {
        return { success: false, reason: 'NO_MEMBER' };
    }

    if (!canManageMember(member)) {
        return { success: false, reason: 'CANNOT_MANAGE_MEMBER' };
    }

    // Tomar el nombre de vista actual (displayName = apodo de servidor o nombre de perfil visible)
    const currentDisplayName = member.displayName || member.user?.displayName || member.user?.username || '';
    if (!currentDisplayName) {
        return { success: false, reason: 'NO_DISPLAY_NAME' };
    }

    const savedData = stmts.getFontNickData(member.id);
    const baseSource = (savedData?.original_display_name && !updateOriginal)
        ? savedData.original_display_name
        : currentDisplayName;

    const newNick = convertText(baseSource, style);
    if (!newNick) {
        return { success: false, reason: 'CONVERSION_EMPTY' };
    }

    // Si ya tiene exactamente ese apodo y el estilo registrado es el mismo, evitar peticiones redundantes
    if (member.nickname === newNick && savedData?.font_style === style) {
        return { success: true, originalDisplayName: baseSource, newNickname: newNick, unchanged: true };
    }

    try {
        const plainOriginal = normalizeToPlainText(baseSource) || baseSource;
        // Guardar el nombre de vista original para poder restaurarlo después
        stmts.saveFontNickData(member.id, plainOriginal, newNick, style, Date.now(), updateOriginal);

        if (member.nickname !== newNick) {
            await member.setNickname(newNick, `[Prophet Font] ${reason}`.substring(0, 512));
        }

        return {
            success: true,
            originalDisplayName: plainOriginal,
            newNickname: newNick,
            style
        };
    } catch (err) {
        return { success: false, reason: err.message };
    }
}

/**
 * Aplica la fuente estilizada a todos los miembros elegibles del servidor
 */
async function applyClanFontToAll(guild, style = 'small-caps', delayMs = 250) {
    if (!guild) {
        return { success: false, total: 0, applied: 0, skipped: 0, errors: [] };
    }

    await guild.members.fetch().catch(() => {});
    const members = guild.members.cache.filter(m => !m.user.bot);

    let applied = 0;
    let skipped = 0;
    const errors = [];

    for (const [, member] of members) {
        if (!canManageMember(member)) {
            skipped++;
            continue;
        }

        const res = await applyClanFont(member, style, 'Aplicación masiva de fuente del clan');
        if (res.success) {
            applied++;
        } else {
            skipped++;
            if (res.reason && !['CANNOT_MANAGE_MEMBER', 'NO_DISPLAY_NAME'].includes(res.reason)) {
                errors.push({ user: member.user.tag, error: res.reason });
            }
        }

        if (delayMs > 0) {
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    return {
        success: true,
        total: members.size,
        applied,
        skipped,
        errors,
        style
    };
}

/**
 * Restaura el nombre de vista original de un miembro
 */
async function restoreMemberFont(member) {
    if (!member) {
        return { success: false, reason: 'NO_MEMBER' };
    }

    if (!canManageMember(member)) {
        return { success: false, reason: 'CANNOT_MANAGE_MEMBER' };
    }

    const fontData = stmts.getFontNickData(member.id);
    const original = fontData?.original_display_name;

    // Si el nombre original era idéntico al username base de la cuenta, pasar null elimina el apodo
    const targetNick = (original && original !== member.user.username) ? original : null;

    try {
        await member.setNickname(targetNick, 'Restauración de nombre de vista original');
        stmts.removeFontNickData(member.id);

        return {
            success: true,
            restoredName: original || member.user.username
        };
    } catch (err) {
        return { success: false, reason: err.message };
    }
}

/**
 * Restaura los nombres de vista de todos los miembros guardados en la base de datos
 */
async function restoreAllMembersFont(guild, delayMs = 250) {
    if (!guild) {
        return { success: false, total: 0, restored: 0, skipped: 0 };
    }

    await guild.members.fetch().catch(() => {});
    const allBackups = stmts.getAllFontNickData();

    let restored = 0;
    let skipped = 0;

    for (const row of allBackups) {
        const member = guild.members.cache.get(row.user_id);
        if (!member) {
            stmts.removeFontNickData(row.user_id);
            continue;
        }

        if (!canManageMember(member)) {
            skipped++;
            stmts.removeFontNickData(row.user_id);
            continue;
        }

        const res = await restoreMemberFont(member);
        if (res.success) {
            restored++;
        } else {
            skipped++;
        }

        if (delayMs > 0) {
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    return {
        success: true,
        total: allBackups.length,
        restored,
        skipped
    };
}

/**
 * Devuelve la lista de estilos disponibles
 */
function getFontStylesList() {
    return Object.entries(FONT_MAPS).map(([key, val]) => ({
        id: key,
        name: val.name,
        description: val.description,
        preview: convertText('Prophet Gaming', key)
    }));
}

/**
 * Obtiene si la aplicación automática al ingresar está activa
 */
function isAutoClanFontEnabled() {
    const dbConfig = stmts.getConfig('clan_font_auto_enabled');
    if (dbConfig !== null && dbConfig !== undefined) {
        return Boolean(dbConfig.value);
    }
    return true; // Activado por defecto
}

/**
 * Activa o desactiva la aplicación automática al ingresar
 */
function setAutoClanFontEnabled(enabled) {
    stmts.setConfig('clan_font_auto_enabled', Boolean(enabled));
}

/**
 * Obtiene el estilo de fuente configurado por defecto
 */
function getClanFontStyle() {
    const dbConfig = stmts.getConfig('clan_font_auto_style');
    if (dbConfig !== null && dbConfig !== undefined && dbConfig.value) {
        return String(dbConfig.value);
    }
    return 'small-caps';
}

/**
 * Guarda el estilo de fuente por defecto
 */
function setClanFontStyle(style) {
    stmts.setConfig('clan_font_auto_style', style || 'small-caps');
}

module.exports = {
    FONT_MAPS,
    normalizeToPlainText,
    convertText,
    canManageMember,
    applyClanFont,
    applyClanFontToAll,
    restoreMemberFont,
    restoreAllMembersFont,
    getFontStylesList,
    isAutoClanFontEnabled,
    setAutoClanFontEnabled,
    getClanFontStyle,
    setClanFontStyle
};

