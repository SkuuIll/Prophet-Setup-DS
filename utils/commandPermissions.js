/**
 * Capa de defensa complementaria al permiso que Discord usa para mostrar
 * slash commands. Se valida de nuevo antes de ejecutar cada comando.
 */
function canExecuteRegisteredCommand(commandData, memberPermissions) {
    if (!commandData || typeof commandData.toJSON !== 'function') return false;
    const permissions = commandData.toJSON().default_member_permissions;
    // Comandos públicos no necesitan permisos especiales.
    if (permissions === null || permissions === undefined) return true;
    if (!memberPermissions || typeof memberPermissions.has !== 'function') return false;
    try {
        const required = BigInt(permissions);
        // Permisos 0 indican comando deshabilitado por defecto.
        return required !== 0n && memberPermissions.has(required);
    } catch {
        return false;
    }
}

module.exports = { canExecuteRegisteredCommand };
