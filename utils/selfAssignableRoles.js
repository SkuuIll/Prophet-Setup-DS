const { PermissionFlagsBits } = require('discord.js');

const DANGEROUS_ROLE_PERMISSIONS = [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ManageNicknames,
    PermissionFlagsBits.ManageThreads,
    PermissionFlagsBits.ManageGuildExpressions,
    PermissionFlagsBits.ManageEmojisAndStickers,
    PermissionFlagsBits.MoveMembers,
    PermissionFlagsBits.MuteMembers,
    PermissionFlagsBits.DeafenMembers,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.ManageEvents,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.MentionEveryone,
].filter(flag => flag !== undefined);

function getSelfAssignableRoleError(role, guild, protectedRoles = []) {
    if (!role || !guild) return 'El rol no existe.';
    if (role.id === guild.id || role.managed) return 'El rol no se puede asignar manualmente.';
    const protectedSet = new Set(protectedRoles.filter(Boolean));
    if (protectedSet.has(role.id) || protectedSet.has(role.name)) {
        return 'Ese rol está reservado para el equipo o para recompensas especiales.';
    }
    const name = String(role.name || '').toLowerCase();
    if (/(?:^|[^a-z])(?:admin|staff|moderad|prophet|vip|owner|fundador)(?:[^a-z]|$)/.test(name)) {
        return 'Ese rol es de acceso restringido.';
    }
    if (!role.permissions || DANGEROUS_ROLE_PERMISSIONS.some(flag => role.permissions.has(flag))) {
        return 'Ese rol otorga permisos de moderación o administración.';
    }

    // Nunca mover roles que el bot no puede controlar según la jerarquía.
    const highest = guild.members?.me?.roles?.highest;
    if (highest && typeof highest.comparePositionTo === 'function'
        && highest.comparePositionTo(role) <= 0) {
        return 'Ese rol está por encima del bot en la jerarquía.';
    }
    return null;
}

module.exports = { DANGEROUS_ROLE_PERMISSIONS, getSelfAssignableRoleError };
