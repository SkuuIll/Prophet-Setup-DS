const { PermissionFlagsBits } = require('discord.js');

// Nunca dependemos de un único ID que puede haber quedado obsoleto en SQLite.
// Nombres alternativos tolerantes con emojis y cambios de mayúsculas.
function normalizeName(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isMessageChannel(channel) {
    return Boolean(channel && typeof channel.send === 'function'
        && (typeof channel.isTextBased !== 'function' || channel.isTextBased()));
}

function missingSendPermissions(channel, guild, { includeFiles = true } = {}) {
    const me = guild?.members?.me;
    if (!me || typeof channel?.permissionsFor !== 'function') return [];
    const perms = channel.permissionsFor(me);
    if (!perms) return ['ViewChannel', 'SendMessages'];
    const required = [
        ['ViewChannel', PermissionFlagsBits.ViewChannel],
        ['SendMessages', PermissionFlagsBits.SendMessages],
        ['EmbedLinks', PermissionFlagsBits.EmbedLinks],
    ];
    if (includeFiles) required.push(['AttachFiles', PermissionFlagsBits.AttachFiles]);
    return required.filter(([, flag]) => !perms.has(flag)).map(([name]) => name);
}

async function resolveMessageChannel(guild, { ids = [], names = [], log = console } = {}) {
    const channels = guild?.channels;
    if (!channels?.cache) return null;

    const seen = new Set();
    for (const original of ids) {
        const id = String(original || '').trim();
        if (!/^\d{17,20}$/.test(id) || seen.has(id)) continue;
        seen.add(id);
        const ch = channels.cache.get(id)
            || (typeof channels.fetch === 'function'
                ? await channels.fetch(id).catch(() => null) : null);
        if (isMessageChannel(ch)) return ch;
        log.warn?.(`[Notificaciones] Canal configurado ${id} no encontrado o no admite mensajes; probando alternativas.`);
    }

    const wanted = names.map(normalizeName).filter(Boolean);
    const collection = [...channels.cache.values()].filter(isMessageChannel);
    const exact = collection.find(ch => wanted.includes(normalizeName(ch.name)));
    if (exact) return exact;
    return collection.find(ch => wanted.some(name => normalizeName(ch.name).includes(name))) || null;
}

async function resolveMemberChannel(guild, { configValue, persistedValue, kind = 'welcome', log = console } = {}) {
    const names = kind === 'logs'
        ? ['logs', 'registro', 'audit', 'mod-logs']
        : ['bienvenidos', 'bienvenida', 'welcome', 'ingresos', 'entradas', 'nuevos-miembros'];
    return resolveMessageChannel(guild, {
        ids: [persistedValue, configValue],
        names: [configValue, ...names],
        log,
    });
}

async function sendWithImageFallback(channel, payload, { log = console } = {}) {
    try {
        return await channel.send(payload);
    } catch (error) {
        log.error?.(`[Notificaciones] Falló envío en #${channel.name || channel.id}: ${error.message}`);
        if (!payload.files?.length) throw error;
        // Descartar la imagen si falla su subida, sin silenciar los errores.
        const embeds = payload.embeds?.map(e => {
            const copy = typeof e.toJSON === 'function' ? e.toJSON() : { ...e };
            delete copy.image;
            return copy;
        });
        return channel.send({ ...payload, files: [], embeds });
    }
}

module.exports = {
    normalizeName,
    isMessageChannel,
    missingSendPermissions,
    resolveMessageChannel,
    resolveMemberChannel,
    sendWithImageFallback,
};
