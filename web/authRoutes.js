// ═══════════════════════════════════════════════════
//  PROPHET BOT — Rutas de Autenticación
// ═══════════════════════════════════════════════════

const security = require('./security');
const middleware = require('./middleware');
const { _db } = require('../database');

// ═══════════════════════════════════════════════════
//  HANDLERS DE AUTENTICACIÓN
// ═══════════════════════════════════════════════════

/**
 * POST /api/auth/login
 * Inicia sesión y devuelve tokens
 */
async function handleLogin(req, res) {
    const { ipAddress, userAgent } = middleware.getClientInfo(req);
    
    try {
        const { username, password } = req.body || {};
        
        if (!username || !password) {
            middleware.sendError(res, 400, 'Username y password son requeridos');
            return;
        }
        
        const result = await security.authenticateUser(username, password, ipAddress, userAgent);
        
        if (!result.success) {
            middleware.sendError(res, 401, result.error, result.lockedUntil ? 'ACCOUNT_LOCKED' : 'AUTH_FAILED', 
                result.lockedUntil ? { lockedUntil: result.lockedUntil } : null);
            return;
        }
        
        // Generar token CSRF
        const csrfToken = security.generateCSRFToken(result.sessionId);
        
        middleware.sendJson(res, 200, {
            success: true,
            user: result.user,
            tokens: result.tokens,
            csrfToken
        });
    } catch (error) {
        security.auditLog('login_error', {
            ipAddress,
            userAgent,
            status: 'error',
            details: { error: error.message }
        });
        middleware.sendError(res, 500, 'Error interno del servidor');
    }
}

/**
 * POST /api/auth/logout
 * Cierra la sesión actual
 */
async function handleLogout(req, res) {
    const { ipAddress } = req.clientInfo;
    
    try {
        security.logout(req.user.sessionId, req.user.id, ipAddress);
        
        middleware.sendJson(res, 200, { success: true, message: 'Sesión cerrada' });
    } catch (error) {
        middleware.sendError(res, 500, 'Error al cerrar sesión');
    }
}

/**
 * POST /api/auth/refresh
 * Renueva el access token usando el refresh token
 */
async function handleRefresh(req, res) {
    const { ipAddress, userAgent } = middleware.getClientInfo(req);
    
    try {
        const { refreshToken } = req.body || {};
        
        if (!refreshToken) {
            middleware.sendError(res, 400, 'Refresh token requerido');
            return;
        }
        
        const refreshTokenHash = require('crypto').createHash('sha256').update(refreshToken).digest('hex');
        
        // Buscar el refresh token
        const tokenRecord = _db.prepare(`
            SELECT rt.*, du.username, du.role
            FROM refresh_tokens rt
            JOIN dashboard_users du ON rt.user_id = du.id
            WHERE rt.token_hash = ? AND rt.revoked = 0 AND rt.expires_at > ?
        `).get(refreshTokenHash, Date.now());
        
        if (!tokenRecord) {
            middleware.sendError(res, 401, 'Refresh token inválido o expirado');
            return;
        }
        
        // Revocar el token anterior
        _db.prepare('UPDATE refresh_tokens SET revoked = 1, revoked_at = ? WHERE id = ?')
            .run(Date.now(), tokenRecord.id);
        
        // Crear nueva sesión
        const newSessionId = security.generateSecureToken(32);
        const newRefreshToken = security.generateRefreshToken();
        const newRefreshTokenHash = require('crypto').createHash('sha256').update(newRefreshToken).digest('hex');
        const sessionExpiry = Date.now() + security.parseExpiry(security.SECURITY_CONFIG.REFRESH_TOKEN_EXPIRY) * 1000;
        
        _db.prepare(`
            INSERT INTO dashboard_sessions (id, user_id, refresh_token_hash, ip_address, user_agent, created_at, expires_at, last_activity_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(newSessionId, tokenRecord.user_id, newRefreshTokenHash, ipAddress, userAgent, Date.now(), sessionExpiry, Date.now());
        
        _db.prepare(`
            INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(security.generateSecureToken(16), tokenRecord.user_id, newRefreshTokenHash, sessionExpiry, Date.now());
        
        // Generar nuevo JWT
        const jwt = security.generateJWT({
            userId: tokenRecord.user_id,
            username: tokenRecord.username,
            role: tokenRecord.role,
            sessionId: newSessionId
        });
        
        security.auditLog('token_refresh', {
            userId: tokenRecord.user_id,
            ipAddress,
            userAgent,
            resourceId: newSessionId
        });
        
        middleware.sendJson(res, 200, {
            success: true,
            tokens: {
                accessToken: jwt,
                refreshToken: newRefreshToken,
                expiresIn: security.parseExpiry(security.SECURITY_CONFIG.JWT_EXPIRY)
            }
        });
    } catch (error) {
        middleware.sendError(res, 500, 'Error al refrescar token');
    }
}

/**
 * GET /api/auth/me
 * Obtiene información del usuario actual
 */
async function handleGetCurrentUser(req, res) {
    try {
        const user = _db.prepare(`
            SELECT id, username, email, role, discord_id, two_factor_enabled, 
                   created_at, last_login_at, password_changed_at
            FROM dashboard_users WHERE id = ?
        `).get(req.user.id);
        
        if (!user) {
            middleware.sendError(res, 404, 'Usuario no encontrado');
            return;
        }
        
        middleware.sendJson(res, 200, {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                discordId: user.discord_id,
                twoFactorEnabled: user.two_factor_enabled === 1,
                createdAt: user.created_at,
                lastLoginAt: user.last_login_at,
                passwordChangedAt: user.password_changed_at
            }
        });
    } catch (error) {
        middleware.sendError(res, 500, 'Error al obtener usuario');
    }
}

/**
 * POST /api/auth/change-password
 * Cambia la contraseña del usuario actual
 */
async function handleChangePassword(req, res) {
    const { ipAddress } = req.clientInfo;
    
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body || {};
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            middleware.sendError(res, 400, 'Todos los campos son requeridos');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            middleware.sendError(res, 400, 'Las contraseñas nuevas no coinciden');
            return;
        }
        
        await security.changePassword(req.user.id, currentPassword, newPassword, ipAddress);
        
        middleware.sendJson(res, 200, { 
            success: true, 
            message: 'Contraseña cambiada exitosamente. Por favor, inicia sesión nuevamente.' 
        });
    } catch (error) {
        middleware.sendError(res, 400, error.message);
    }
}

/**
 * GET /api/auth/csrf
 * Obtiene un token CSRF
 */
async function handleGetCsrf(req, res) {
    if (!req.user?.sessionId) {
        middleware.sendError(res, 401, 'Sesión no encontrada');
        return;
    }
    
    const csrfToken = security.generateCSRFToken(req.user.sessionId);
    
    middleware.sendJson(res, 200, {
        success: true,
        csrfToken
    });
}

// ═══════════════════════════════════════════════════
//  HANDLERS DE GESTIÓN DE USUARIOS
// ═══════════════════════════════════════════════════

/**
 * GET /api/users
 * Lista usuarios del dashboard (requiere admin)
 */
async function handleListUsers(req, res) {
    try {
        const users = _db.prepare(`
            SELECT id, username, email, role, discord_id, two_factor_enabled,
                   created_at, updated_at, last_login_at, locked_until
            FROM dashboard_users
            ORDER BY created_at DESC
        `).all();
        
        middleware.sendJson(res, 200, {
            success: true,
            users: users.map(u => ({
                id: u.id,
                username: u.username,
                email: u.email,
                role: u.role,
                discordId: u.discord_id,
                twoFactorEnabled: u.two_factor_enabled === 1,
                createdAt: u.created_at,
                lastLoginAt: u.last_login_at,
                isLocked: u.locked_until && u.locked_until > Date.now()
            }))
        });
    } catch (error) {
        middleware.sendError(res, 500, 'Error al listar usuarios');
    }
}

/**
 * POST /api/users
 * Crea un nuevo usuario (requiere admin)
 */
async function handleCreateUser(req, res) {
    const { ipAddress } = req.clientInfo;
    
    try {
        const { username, email, password, role = 'viewer', discordId } = req.body || {};
        
        // Verificar que no intenten crear superadmin
        if (role === 'superadmin' && req.user.role !== 'superadmin') {
            middleware.sendError(res, 403, 'No tienes permiso para crear superadministradores');
            return;
        }
        
        // Verificar permisos sobre el rol
        if (!security.canModifyUser(req.user.role, role)) {
            middleware.sendError(res, 403, 'No tienes permiso para crear usuarios con ese rol');
            return;
        }
        
        const user = await security.createDashboardUser({
            username,
            email,
            password,
            role,
            discordId
        });
        
        security.auditLog('user_created', {
            userId: req.user.id,
            ipAddress,
            resource: 'user',
            resourceId: user.id,
            details: { username, email, role }
        });
        
        middleware.sendJson(res, 201, {
            success: true,
            user
        });
    } catch (error) {
        middleware.sendError(res, 400, error.message);
    }
}

/**
 * PATCH /api/users/:id
 * Actualiza un usuario
 */
async function handleUpdateUser(req, res) {
    const { ipAddress } = req.clientInfo;
    const userId = parseInt(req.params?.id, 10);
    
    if (!userId) {
        middleware.sendError(res, 400, 'ID de usuario inválido');
        return;
    }
    
    try {
        const targetUser = _db.prepare('SELECT * FROM dashboard_users WHERE id = ?').get(userId);
        
        if (!targetUser) {
            middleware.sendError(res, 404, 'Usuario no encontrado');
            return;
        }
        
        // Verificar permisos
        if (!security.canModifyUser(req.user.role, targetUser.role)) {
            middleware.sendError(res, 403, 'No tienes permiso para modificar este usuario');
            return;
        }
        
        const updates = req.body || {};
        const allowedFields = ['email', 'role', 'discordId'];
        const setClause = [];
        const params = [];
        
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                // Validaciones específicas
                if (field === 'role') {
                    if (!security.ROLES[updates.role]) {
                        middleware.sendError(res, 400, 'Rol inválido');
                        return;
                    }
                    if (!security.canModifyUser(req.user.role, updates.role)) {
                        middleware.sendError(res, 403, 'No puedes asignar ese rol');
                        return;
                    }
                }
                
                setClause.push(`${field === 'discordId' ? 'discord_id' : field} = ?`);
                params.push(updates[field]);
            }
        }
        
        if (setClause.length === 0) {
            middleware.sendError(res, 400, 'No hay campos para actualizar');
            return;
        }
        
        setClause.push('updated_at = ?');
        params.push(Date.now());
        params.push(userId);
        
        _db.prepare(`UPDATE dashboard_users SET ${setClause.join(', ')} WHERE id = ?`).run(...params);
        
        security.auditLog('user_updated', {
            userId: req.user.id,
            ipAddress,
            resource: 'user',
            resourceId: userId,
            details: updates
        });
        
        middleware.sendJson(res, 200, { success: true, message: 'Usuario actualizado' });
    } catch (error) {
        middleware.sendError(res, 500, 'Error al actualizar usuario');
    }
}

/**
 * DELETE /api/users/:id
 * Elimina un usuario
 */
async function handleDeleteUser(req, res) {
    const { ipAddress } = req.clientInfo;
    const userId = parseInt(req.params?.id, 10);
    
    if (!userId) {
        middleware.sendError(res, 400, 'ID de usuario inválido');
        return;
    }
    
    // No puede eliminarse a sí mismo
    if (userId === req.user.id) {
        middleware.sendError(res, 400, 'No puedes eliminarte a ti mismo');
        return;
    }
    
    try {
        const targetUser = _db.prepare('SELECT * FROM dashboard_users WHERE id = ?').get(userId);
        
        if (!targetUser) {
            middleware.sendError(res, 404, 'Usuario no encontrado');
            return;
        }
        
        // Verificar permisos
        if (!security.canModifyUser(req.user.role, targetUser.role)) {
            middleware.sendError(res, 403, 'No tienes permiso para eliminar este usuario');
            return;
        }
        
        _db.prepare('DELETE FROM dashboard_users WHERE id = ?').run(userId);
        
        security.auditLog('user_deleted', {
            userId: req.user.id,
            ipAddress,
            resource: 'user',
            resourceId: userId,
            details: { deletedUsername: targetUser.username }
        });
        
        middleware.sendJson(res, 200, { success: true, message: 'Usuario eliminado' });
    } catch (error) {
        middleware.sendError(res, 500, 'Error al eliminar usuario');
    }
}

/**
 * POST /api/users/:id/reset-password
 * Resetea la contraseña de un usuario
 */
async function handleResetUserPassword(req, res) {
    const { ipAddress } = req.clientInfo;
    const userId = parseInt(req.params?.id, 10);
    
    if (!userId) {
        middleware.sendError(res, 400, 'ID de usuario inválido');
        return;
    }
    
    try {
        const targetUser = _db.prepare('SELECT * FROM dashboard_users WHERE id = ?').get(userId);
        
        if (!targetUser) {
            middleware.sendError(res, 404, 'Usuario no encontrado');
            return;
        }
        
        if (!security.canModifyUser(req.user.role, targetUser.role)) {
            middleware.sendError(res, 403, 'No tienes permiso para resetear la contraseña de este usuario');
            return;
        }
        
        // Generar contraseña temporal
        const tempPassword = security.generateSecureToken(8);
        const passwordHash = await security.hashPassword(tempPassword);
        
        _db.prepare(`
            UPDATE dashboard_users 
            SET password_hash = ?, password_changed_at = ?, must_change_password = 1, 
                failed_login_attempts = 0, locked_until = NULL, updated_at = ?
            WHERE id = ?
        `).run(passwordHash, Date.now(), Date.now(), userId);
        
        security.auditLog('password_reset', {
            userId: req.user.id,
            ipAddress,
            resource: 'user',
            resourceId: userId,
            details: { targetUsername: targetUser.username }
        });
        
        middleware.sendJson(res, 200, {
            success: true,
            tempPassword,
            message: 'Contraseña reseteada. El usuario deberá cambiarla en su próximo inicio de sesión.'
        });
    } catch (error) {
        middleware.sendError(res, 500, 'Error al resetear contraseña');
    }
}

// ═══════════════════════════════════════════════════
//  HANDLERS DE SEGURIDAD
// ═══════════════════════════════════════════════════

/**
 * GET /api/security/audit
 * Obtiene logs de auditoría
 */
async function handleGetAuditLogs(req, res) {
    try {
        const { userId, action, status, since, until, limit = 100 } = req.query || {};
        
        const filters = {};
        if (userId) filters.userId = parseInt(userId, 10);
        if (action) filters.action = action;
        if (status) filters.status = status;
        if (since) filters.since = parseInt(since, 10);
        if (until) filters.until = parseInt(until, 10);
        
        const logs = security.getAuditLogs(filters, parseInt(limit, 10));
        
        middleware.sendJson(res, 200, { success: true, logs });
    } catch (error) {
        middleware.sendError(res, 500, 'Error al obtener logs');
    }
}

/**
 * GET /api/security/blocked-ips
 * Lista IPs bloqueadas
 */
async function handleListBlockedIps(req, res) {
    try {
        const ips = _db.prepare(`
            SELECT ip_address, reason, blocked_at, expires_at
            FROM blocked_ips
            WHERE expires_at IS NULL OR expires_at > ?
            ORDER BY blocked_at DESC
        `).all(Date.now());
        
        middleware.sendJson(res, 200, { success: true, blockedIps: ips });
    } catch (error) {
        middleware.sendError(res, 500, 'Error al listar IPs bloqueadas');
    }
}

/**
 * POST /api/security/block-ip
 * Bloquea una IP
 */
async function handleBlockIp(req, res) {
    const { ipAddress } = req.clientInfo;
    
    try {
        const { ip, reason, durationMinutes } = req.body || {};
        
        if (!ip) {
            middleware.sendError(res, 400, 'IP requerida');
            return;
        }
        
        const duration = durationMinutes ? parseInt(durationMinutes, 10) * 60 * 1000 : null;
        
        security.blockIp(ip, reason || 'Bloqueado manualmente', duration, req.user.id);
        
        middleware.sendJson(res, 200, { success: true, message: 'IP bloqueada' });
    } catch (error) {
        middleware.sendError(res, 500, 'Error al bloquear IP');
    }
}

/**
 * DELETE /api/security/block-ip/:ip
 * Desbloquea una IP
 */
async function handleUnblockIp(req, res) {
    const ip = req.params?.ip;
    
    if (!ip) {
        middleware.sendError(res, 400, 'IP requerida');
        return;
    }
    
    try {
        security.unblockIp(ip, req.user.id);
        
        middleware.sendJson(res, 200, { success: true, message: 'IP desbloqueada' });
    } catch (error) {
        middleware.sendError(res, 500, 'Error al desbloquear IP');
    }
}

/**
 * GET /api/security/stats
 * Estadísticas de seguridad
 */
async function handleSecurityStats(req, res) {
    try {
        const now = Date.now();
        const last24h = now - 24 * 60 * 60 * 1000;
        
        const stats = {
            loginAttempts: {
                total: _db.prepare('SELECT COUNT(*) as count FROM login_attempts WHERE attempted_at > ?').get(last24h).count,
                successful: _db.prepare('SELECT COUNT(*) as count FROM login_attempts WHERE success = 1 AND attempted_at > ?').get(last24h).count,
                failed: _db.prepare('SELECT COUNT(*) as count FROM login_attempts WHERE success = 0 AND attempted_at > ?').get(last24h).count
            },
            activeSessions: _db.prepare('SELECT COUNT(*) as count FROM dashboard_sessions WHERE expires_at > ?').get(now).count,
            totalUsers: _db.prepare('SELECT COUNT(*) as count FROM dashboard_users').get().count,
            blockedIps: _db.prepare('SELECT COUNT(*) as count FROM blocked_ips WHERE expires_at IS NULL OR expires_at > ?').get(now).count,
            auditEvents: _db.prepare('SELECT COUNT(*) as count FROM security_audit_log WHERE created_at > ?').get(last24h).count
        };
        
        middleware.sendJson(res, 200, { success: true, stats });
    } catch (error) {
        middleware.sendError(res, 500, 'Error al obtener estadísticas');
    }
}

// ═══════════════════════════════════════════════════
//  ROUTER
// ═══════════════════════════════════════════════════

/**
 * Procesa las rutas de autenticación
 */
function handleAuthRoutes(req, res, path, method) {
    // Rutas públicas
    if (path === '/api/auth/login' && method === 'POST') {
        return middleware.apiSecurity(req, res, () => handleLogin(req, res));
    }
    
    if (path === '/api/auth/refresh' && method === 'POST') {
        return middleware.apiSecurity(req, res, () => handleRefresh(req, res));
    }
    
    // Rutas protegidas - usuario actual
    if (path === '/api/auth/me' && method === 'GET') {
        return middleware.protectedApi('dashboard:read')(req, res, () => handleGetCurrentUser(req, res));
    }
    
    if (path === '/api/auth/logout' && method === 'POST') {
        return middleware.protectedApi()(req, res, () => handleLogout(req, res));
    }
    
    if (path === '/api/auth/change-password' && method === 'POST') {
        return middleware.protectedApi()(req, res, () => handleChangePassword(req, res));
    }
    
    if (path === '/api/auth/csrf' && method === 'GET') {
        return middleware.protectedApi()(req, res, () => handleGetCsrf(req, res));
    }
    
    // Gestión de usuarios - requiere admin
    if (path === '/api/users' && method === 'GET') {
        return middleware.protectedApi('users:read')(req, res, () => handleListUsers(req, res));
    }
    
    if (path === '/api/users' && method === 'POST') {
        return middleware.protectedApi('users:write')(req, res, () => handleCreateUser(req, res));
    }
    
    // Rutas con parámetros
    const userMatch = path.match(/^\/api\/users\/(\d+)$/);
    if (userMatch) {
        req.params = { id: userMatch[1] };
        
        if (method === 'PATCH') {
            return middleware.protectedApi('users:write')(req, res, () => handleUpdateUser(req, res));
        }
        if (method === 'DELETE') {
            return middleware.protectedApi('users:delete')(req, res, () => handleDeleteUser(req, res));
        }
    }
    
    const resetPasswordMatch = path.match(/^\/api\/users\/(\d+)\/reset-password$/);
    if (resetPasswordMatch && method === 'POST') {
        req.params = { id: resetPasswordMatch[1] };
        return middleware.protectedApi('users:write')(req, res, () => handleResetUserPassword(req, res));
    }
    
    // Seguridad - requiere admin
    if (path === '/api/security/audit' && method === 'GET') {
        return middleware.protectedApi('security:read')(req, res, () => handleGetAuditLogs(req, res));
    }
    
    if (path === '/api/security/blocked-ips' && method === 'GET') {
        return middleware.protectedApi('security:read')(req, res, () => handleListBlockedIps(req, res));
    }
    
    if (path === '/api/security/block-ip' && method === 'POST') {
        return middleware.protectedApi('security:write')(req, res, () => handleBlockIp(req, res));
    }
    
    const unblockIpMatch = path.match(/^\/api\/security\/block-ip\/(.+)$/);
    if (unblockIpMatch && method === 'DELETE') {
        req.params = { ip: unblockIpMatch[1] };
        return middleware.protectedApi('security:write')(req, res, () => handleUnblockIp(req, res));
    }
    
    if (path === '/api/security/stats' && method === 'GET') {
        return middleware.protectedApi('security:read')(req, res, () => handleSecurityStats(req, res));
    }
    
    return false; // Ruta no manejada
}

module.exports = {
    handleAuthRoutes,
    handleLogin,
    handleLogout,
    handleRefresh,
    handleGetCurrentUser,
    handleChangePassword,
    handleListUsers,
    handleCreateUser,
    handleUpdateUser,
    handleDeleteUser,
    handleResetUserPassword,
    handleGetAuditLogs,
    handleListBlockedIps,
    handleBlockIp,
    handleUnblockIp,
    handleSecurityStats
};
