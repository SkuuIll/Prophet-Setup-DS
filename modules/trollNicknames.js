// ═══════════════════════════════════════════════════
//  MÓDULO: Apodos Trol / Tóxicos Argentinos (Nivel 10+)
// ═══════════════════════════════════════════════════

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');

// ── LISTA DE APODOS TÓXICOS / TROLS AL ESTILO GAMER ARGENTINO ──
const TROLL_NICKNAMES_POOL = [
    // Insultos y bardo clásico argentino / gamer
    'Gordo Tetón',
    'Pelotudo Atómico',
    'Manco del Orto',
    'Pedazo de Forro',
    'Gordo Termotanque',
    'Inútil de Mierda',
    'Pelotudo con Wi-Fi',
    'Gordo Fracasado',
    'Manco de Mierda',
    'Chupapijas 3000',
    'Virgo Resentido',
    'Cornudo Consciente',
    'Gordo Come Trabas',
    'Cara de Verga',
    'Llorón del Orto',
    'Sorete Feeder',
    'Pito Corto FC',
    'Hijo de Remil Kills',
    'Pedazo de Manco',
    'Gordo Sifón de Soda',
    'Bobo a Pedal',
    'Forro Pinchado',
    'Cagón de Mierda',
    'El Más Pelotudo',
    'Manco Culiado',
    'Gordo Garca',
    'Cara de Pija',
    'Sorete con Auris',
    'Gordo Downloader',
    'Virgo Nivel 100',
    'Fracasado del Orto',
    'Cabeza de Pija',
    'Enfermito del LoL',
    'Malcojido Serial',
    'Carreado de Mierda',
    'Gordo Choto',
    'Pajero Crónico',
    'Basura Inservible',
    'Desastre Humano',
    'Saco de Cuernos',
    'Muerto de Hambre',
    'El Chupa Bananas',
    'Gordo Lechón',
    'Gordo Bosta',
    'Pelotudo Crónico',
    'Manco Hijo de Remil',
    'Chupapijas Nato',
    'Gordo Termo HDP',
    'Pedazo de Inútil',
    'Linyera del RP',

    // Lunfardo / Gaming criollo
    'El Come Gordas 3000',
    'Termo de Manaos',
    'El Pibe 0/15',
    'Carreado por la Abuela',
    'Manos de Manteca',
    'Feeder Profesional',
    'El Rey del Tilteo',
    'Vendedor de Humo FC',
    'Lag Mental 24/7',
    'Cono con Auriculares',
    'El Bronce Resentido',
    'Tiracables 2000',
    'Mancos Unidos FC',
    'Donador de Kills',
    'El Sin Manos',
    'El Fantasma de la B',
    'Amigo del Gulag',
    'Tóxico de Coto',
    'Cabeza de Termo',
    'El Señor del Alt+F4',
    'Desinstalador Serial',
    'Perro Salchicha Bélico',
    'Toxiquito de Palermo',
    'Tarta de Humo',
    '0 Manos 100% Sal',
    'Cacho Manos Flojas',
    'Monociclo Sin Rueda',
    'Bala Perdida',
    'Sopa de Tornillos',
    'Carreame Que Me Caigo',
    'El Pibe Respawneador',
    'Chori y Manaos',
    'Tirador de Molotovs',
    'Bebedor de Lavandina',
    'Chupamedias de Messi',
    'El Pibe No Pego Una',
    'Smurf de Madera V',
    'Pikachu con Rabia',
    'Especialista en Feedeo',
    'El Pibe Smurf Inverso',
    'Fracasado del RP',
    'El Rey de la Mancha',
    'Comedor de Balas',
    'El Manco del Abasto',
    'Terror del K/D Negativo',
    'Mucho Texto Poco Aim',
    'Reflejos de Babosa',
    'Don Tilteos',
    'Lagarto Cósmico',
    'Boca Yo Te Amo',
    'Inspeccionador de Pisos',
    'Feedeando en Pantuflas',
    'El Quemado por el LoL',
    'Carreado Sin Dignidad',
    'El Pibe Sin Sonido',
    'Rey de la Salada',
    'Cero Impacto Social',
    'Tiro al Pichón',
    'Vendido por 2 Pesos',
    'El Cono de Tránsito',
    'Microondas de Ideas',
    'Muerto en la Primera'
];

// Plantillas dinámicas combinadas con el nombre base
const DYNAMIC_TEMPLATES = [
    (name) => `[0/20] ${name}`,
    (name) => `El Tóxico ${name}`,
    (name) => `Don ${name} Feeder`,
    (name) => `[Manco] ${name}`,
    (name) => `${name} (Carreado)`,
    (name) => `${name} el Tilteado`,
    (name) => `Termo ${name}`,
    (name) => `[Llorón] ${name}`,
    (name) => `${name} Sin Manos`,
    (name) => `Gordo ${name}`,
    (name) => `${name} el Pelotudo`,
    (name) => `[Forro] ${name}`,
    (name) => `${name} Cara de Verga`,
    (name) => `${name} Inútil`,
    (name) => `[Feeder] ${name}`,
    (name) => `Cornudo ${name}`,
    (name) => `${name} Pito Corto`,
    (name) => `${name} del Orto`,
    (name) => `[0 Kills] ${name}`,
    (name) => `${name} Chupapijas`
];

/**
 * Obtener si el sistema está habilitado
 */
function isTrollEnabled() {
    const dbConfig = stmts.getConfig('troll_nicknames_enabled');
    if (dbConfig !== null && dbConfig !== undefined) {
        return Boolean(dbConfig.value);
    }
    return config.TROLL_NICKNAMES?.ENABLED ?? true;
}

/**
 * Activar o desactivar el sistema
 */
function setTrollEnabled(enabled) {
    stmts.setConfig('troll_nicknames_enabled', Boolean(enabled));
}

/**
 * Obtener el nivel mínimo requerido
 */
function getMinLevel() {
    const dbConfig = stmts.getConfig('troll_nicknames_min_level');
    if (dbConfig !== null && dbConfig !== undefined && Number.isInteger(dbConfig.value)) {
        return dbConfig.value;
    }
    return config.TROLL_NICKNAMES?.MIN_LEVEL ?? 10;
}

/**
 * Configurar el nivel mínimo requerido
 */
function setMinLevel(level) {
    const safeLevel = Math.max(1, Number.parseInt(level, 10) || 10);
    stmts.setConfig('troll_nicknames_min_level', safeLevel);
    return safeLevel;
}

/**
 * Obtener cooldown configurado en ms
 */
function getCooldownMs() {
    return config.TROLL_NICKNAMES?.COOLDOWN ?? (30 * 60 * 1000);
}

/**
 * Generar un apodo trol aleatorio (máx 32 caracteres)
 */
function getRandomTrollNickname(baseName = '') {
    const cleanBase = (baseName || 'Pibe').trim().replace(/[[\]()]/g, '');
    const useDynamic = Math.random() < 0.35 && cleanBase.length > 0;

    let nick = '';
    if (useDynamic) {
        const template = DYNAMIC_TEMPLATES[Math.floor(Math.random() * DYNAMIC_TEMPLATES.length)];
        nick = template(cleanBase);
    } else {
        nick = TROLL_NICKNAMES_POOL[Math.floor(Math.random() * TROLL_NICKNAMES_POOL.length)];
    }

    if (nick.length > 32) {
        nick = nick.substring(0, 32).trim();
    }
    return nick;
}

/**
 * Verificar si un miembro es elegible para recibir apodo trol según permisos de Discord
 */
function canManageMember(member) {
    if (!member || !member.guild) return false;
    if (member.user.bot) return false;
    if (member.id === member.guild.ownerId) return false;

    const botMember = member.guild.members.me || member.guild.members.cache.get(member.client.user.id);
    if (!botMember) return false;
    if (!botMember.permissions.has(PermissionFlagsBits.ManageNicknames)) return false;

    // Jerarquía de roles: el rol más alto del bot debe ser estrictamente superior al del usuario
    if (member.roles.highest.position >= botMember.roles.highest.position) {
        return false;
    }

    return true;
}

/**
 * Comprobar si corresponde aplicar apodo trol automáticamente
 */
function shouldApplyTrollNickname(member, force = false) {
    if (!member || member.user.bot) return false;
    if (!isTrollEnabled() && !force) return false;
    if (!canManageMember(member)) return false;

    // Verificar nivel del usuario
    const userData = stmts.getUser(member.id);
    const userLevel = userData?.level || 0;
    const minLevel = getMinLevel();

    if (userLevel < minLevel && !force) {
        return false;
    }

    // Verificar cooldown
    if (!force) {
        const trollData = stmts.getTrollNickData(member.id);
        if (trollData && trollData.last_applied) {
            const timePassed = Date.now() - trollData.last_applied;
            const cooldown = getCooldownMs();
            if (timePassed < cooldown) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Aplicar apodo trol a un miembro
 */
async function applyTrollNickname(member, triggerReason = 'Conexión a Discord (Nivel 10+ Troll)', force = false) {
    if (!shouldApplyTrollNickname(member, force)) {
        return { success: false, reason: 'NOT_ELIGIBLE' };
    }

    const currentNick = member.nickname;
    const currentDisplayName = member.displayName;
    const rawUsername = member.user.username;

    // Obtener datos guardados
    let trollData = stmts.getTrollNickData(member.id);
    const originalName = trollData?.original_nickname || currentNick || rawUsername;

    // Generar nuevo apodo que no sea idéntico al actual
    let newNick = getRandomTrollNickname(originalName);
    let attempts = 0;
    while (newNick === currentDisplayName && attempts < 5) {
        newNick = getRandomTrollNickname(originalName);
        attempts++;
    }

    try {
        await member.setNickname(newNick, `[Prophet Troll] ${triggerReason}`.substring(0, 512));

        // Guardar en base de datos
        stmts.saveTrollNickData(member.id, originalName, newNick, Date.now());

        // Log en canal de auditoría si está habilitado
        if (config.TROLL_NICKNAMES?.LOG_CHANGES !== false) {
            const logChannelId = config.CHANNELS.LOGS;
            const logChannel = member.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const userData = stmts.getUser(member.id);
                const lvl = userData?.level || 0;

                const embed = new EmbedBuilder()
                    .setColor(config.COLORES?.WARN || 0xFFB74D)
                    .setAuthor({
                        name: '🎭  Apodo Trol Argentino Asignado',
                        iconURL: member.user.displayAvatarURL()
                    })
                    .setDescription(
                        `> **Usuario:** ${member} (\`${member.id}\`)\n` +
                        `> **Nivel:** **${lvl}** (Requisito: ${getMinLevel()}+)\n` +
                        `> **Motivo:** ${triggerReason}\n\n` +
                        `> **Nombre Original:** \`${originalName}\`\n` +
                        `> **Nuevo Apodo Trol:** \`${newNick}\``
                    )
                    .setFooter({ text: 'Prophet Gaming  ·  Sistema de Apodos Trol' })
                    .setTimestamp();

                logChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }

        return {
            success: true,
            nickname: newNick,
            originalNickname: originalName,
            member
        };
    } catch (err) {
        console.error(`[TrollNicknames] Error al cambiar apodo a ${member.user.tag}:`, err.message);
        return { success: false, reason: err.message };
    }
}

/**
 * Restaurar apodo original de un miembro
 */
async function restoreNickname(member) {
    if (!member) {
        return { success: false, reason: 'NO_MEMBER' };
    }

    let liveMember = member;
    try {
        if (member.guild && member.guild.members) {
            liveMember = await member.guild.members.fetch(member.id).catch(() => member);
        }
    } catch (_) {
        liveMember = member;
    }

    if (!canManageMember(liveMember)) {
        return { success: false, reason: 'CANNOT_MANAGE_MEMBER' };
    }

    const trollData = stmts.getTrollNickData(liveMember.id);
    if (!trollData) {
        return { success: false, reason: 'NO_TROLL_DATA' };
    }

    const original = trollData.original_nickname;
    // Si el apodo original era igual al username base (o no tenía apodo), pasar null remueve el apodo en Discord
    const targetNick = (original && original !== liveMember.user.username) ? original : null;

    try {
        await liveMember.setNickname(targetNick, 'Restauración de apodo original al desconectarse');
        stmts.removeTrollNickData(liveMember.id);
        console.log(`[TrollNicknames] ↩️ Apodo restaurado para ${liveMember.user.tag} -> "${original || liveMember.user.username}"`);

        if (config.TROLL_NICKNAMES?.LOG_CHANGES !== false) {
            const logChannelId = config.CHANNELS.LOGS;
            const logChannel = liveMember.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor(config.COLORES?.INFO || 0x42A5F5)
                    .setAuthor({
                        name: '↩️  Apodo Restaurado (Desconexión)',
                        iconURL: liveMember.user.displayAvatarURL()
                    })
                    .setDescription(
                        `> **Usuario:** ${liveMember} (\`${liveMember.id}\`)\n` +
                        `> **Apodo Restaurado:** \`${original || liveMember.user.username}\``
                    )
                    .setFooter({ text: 'Prophet Gaming  ·  Sistema de Apodos Trol' })
                    .setTimestamp();

                logChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }

        return {
            success: true,
            restoredNickname: original || liveMember.user.username
        };
    } catch (err) {
        console.error(`[TrollNicknames] Error restaurando apodo a ${liveMember.user.tag}:`, err.message);
        return { success: false, reason: err.message };
    }
}

/**
 * Aplicar apodos trol a todos los miembros elegibles del servidor
 */
async function applyAllTrollNicknames(guild, force = false) {
    if (!guild) return { success: false, total: 0, applied: 0, skipped: 0, errors: [] };

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

        const userData = stmts.getUser(member.id);
        const lvl = userData?.level || 0;
        if (!force && lvl < getMinLevel()) {
            skipped++;
            continue;
        }

        try {
            const res = await applyTrollNickname(member, 'Aplicación masiva server-wide', force);
            if (res.success) {
                applied++;
            } else {
                skipped++;
            }
            // Pausa de 300ms entre miembros para evitar rate limits de Discord
            await new Promise(r => setTimeout(r, 300));
        } catch (e) {
            errors.push({ user: member.user.tag, error: e.message });
            skipped++;
        }
    }

    return { success: true, total: members.size, applied, skipped, errors };
}

/**
 * Restaurar los apodos originales de todos los miembros que tienen apodo trol registrado
 */
async function restoreAllTrollNicknames(guild) {
    if (!guild) return { success: false, total: 0, restored: 0, errors: [] };

    const rows = stmts.getAllTrollNickData();
    let restored = 0;
    const errors = [];

    for (const row of rows) {
        try {
            const member = await guild.members.fetch(row.user_id).catch(() => null);
            if (member) {
                const res = await restoreNickname(member);
                if (res.success) {
                    restored++;
                } else {
                    errors.push({ user: member.user?.tag || row.user_id, error: res.reason });
                }
            } else {
                stmts.removeTrollNickData(row.user_id);
            }
            await new Promise(r => setTimeout(r, 200));
        } catch (e) {
            errors.push({ user: row.user_id, error: e.message });
        }
    }

    return { success: true, total: rows.length, restored, errors };
}

/**
 * Obtener lista de todos los apodos trol disponibles
 */
function getTrollNicknamesList() {
    return [...TROLL_NICKNAMES_POOL];
}

module.exports = {
    TROLL_NICKNAMES_POOL,
    DYNAMIC_TEMPLATES,
    isTrollEnabled,
    setTrollEnabled,
    getMinLevel,
    setMinLevel,
    getRandomTrollNickname,
    canManageMember,
    shouldApplyTrollNickname,
    applyTrollNickname,
    applyAllTrollNicknames,
    restoreNickname,
    restoreAllTrollNicknames,
    getTrollNicknamesList
};
