// ═══════════════════════════════════════════════════
//  PROPHET BOT — Inicialización de Seguridad
// ═══════════════════════════════════════════════════

const security = require('./security');
const { _db } = require('../database');
const crypto = require('crypto');

/**
 * Inicializa el sistema de seguridad
 */
async function initializeSecurity() {
    console.log('🔐 Inicializando sistema de seguridad...');
    
    try {
        // Verificar si ya existe un superadmin
        const existingSuperAdmin = _db.prepare('SELECT id FROM dashboard_users WHERE role = ?').get('superadmin');
        
        if (!existingSuperAdmin) {
            // Crear superadmin por defecto
            const defaultUsername = process.env.DASHBOARD_ADMIN_USER || 'admin';
            const defaultPassword = process.env.DASHBOARD_ADMIN_PASS || crypto.randomBytes(12).toString('base64');
            
            await security.createDashboardUser({
                username: defaultUsername,
                email: process.env.DASHBOARD_ADMIN_EMAIL || null,
                password: defaultPassword,
                role: 'superadmin'
            });
            
            console.log('');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('⚠️  CREDENCIALES DEL DASHBOARD (GUARDAR EN LUGAR SEGURO)');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`   Usuario: ${defaultUsername}`);
            console.log(`   Contraseña: ${defaultPassword}`);
            console.log('═══════════════════════════════════════════════════════════');
            console.log('   ⚠️  CAMBIA LA CONTRASEÑA INMEDIATAMENTE DESPUÉS DEL PRIMER LOGIN');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('');
            
            // Guardar en archivo temporal para referencia
            const fs = require('fs');
            const path = require('path');
            const credPath = path.join(__dirname, '..', 'data', '.dashboard_credentials.txt');
            
            fs.writeFileSync(credPath, 
                `Dashboard Admin Credentials\n` +
                `Generated: ${new Date().toISOString()}\n` +
                `Username: ${defaultUsername}\n` +
                `Password: ${defaultPassword}\n\n` +
                `⚠️ DELETE THIS FILE AFTER FIRST LOGIN\n`
            );
            
            // Hacer el archivo solo legible por el propietario
            fs.chmodSync(credPath, 0o600);
        }
        
        // Limpiar sesiones expiradas
        _db.prepare('DELETE FROM dashboard_sessions WHERE expires_at < ?').run(Date.now());
        _db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ?').run(Date.now());
        _db.prepare('DELETE FROM password_reset_tokens WHERE expires_at < ?').run(Date.now());
        
        // Limpiar intentos de login antiguos (más de 30 días)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        _db.prepare('DELETE FROM login_attempts WHERE attempted_at < ?').run(thirtyDaysAgo);
        
        // Limpiar logs de auditoría antiguos (más de 90 días, excepto eventos críticos)
        const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
        _db.prepare(`
            DELETE FROM security_audit_log 
            WHERE created_at < ? 
            AND action NOT IN ('login', 'logout', 'password_change', 'user_created', 'user_deleted', 'ip_blocked')
        `).run(ninetyDaysAgo);
        
        console.log('✅ Sistema de seguridad inicializado correctamente');
        
        return true;
    } catch (error) {
        console.error('❌ Error inicializando seguridad:', error.message);
        return false;
    }
}

/**
 * Verifica la configuración de seguridad
 */
function verifySecurityConfig() {
    const warnings = [];
    const errors = [];
    
    // Verificar JWT_SECRET
    if (!process.env.JWT_SECRET) {
        warnings.push('JWT_SECRET no está configurado. Se usará un valor aleatorio que cambiará al reiniciar.');
    }
    
    // Verificar ENCRYPTION_KEY
    if (!process.env.ENCRYPTION_KEY) {
        warnings.push('ENCRYPTION_KEY no está configurado. Los datos encriptados no serán recuperables después de reiniciar.');
    }
    
    // Verificar configuración de HTTPS
    if (process.env.NODE_ENV === 'production') {
        if (!process.env.HTTPS_ENABLED && process.env.DASHBOARD_HOST !== '127.0.0.1') {
            errors.push('En producción, el dashboard debería usar HTTPS o estar limitado a localhost.');
        }
    }
    
    // Verificar CORS
    const corsOrigins = process.env.CORS_ORIGINS || 'http://localhost:3789';
    if (corsOrigins.includes('*')) {
        warnings.push('CORS permite todos los orígenes (*). Esto es inseguro en producción.');
    }
    
    // Verificar contraseña de admin
    if (process.env.DASHBOARD_ADMIN_PASS) {
        const passLength = process.env.DASHBOARD_ADMIN_PASS.length;
        if (passLength < 8) {
            errors.push('DASHBOARD_ADMIN_PASS debe tener al menos 8 caracteres.');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Obtiene resumen de seguridad para el dashboard
 */
function getSecuritySummary() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    
    return {
        users: {
            total: _db.prepare('SELECT COUNT(*) as count FROM dashboard_users').get().count,
            admins: _db.prepare('SELECT COUNT(*) as count FROM dashboard_users WHERE role IN (?, ?)').get('admin', 'superadmin').count,
            locked: _db.prepare('SELECT COUNT(*) as count FROM dashboard_users WHERE locked_until > ?').get(now).count
        },
        sessions: {
            active: _db.prepare('SELECT COUNT(*) as count FROM dashboard_sessions WHERE expires_at > ?').get(now).count
        },
        threats: {
            blockedIps: _db.prepare('SELECT COUNT(*) as count FROM blocked_ips WHERE expires_at IS NULL OR expires_at > ?').get(now).count,
            failedLogins24h: _db.prepare('SELECT COUNT(*) as count FROM login_attempts WHERE success = 0 AND attempted_at > ?').get(last24h).count
        },
        audit: {
            events24h: _db.prepare('SELECT COUNT(*) as count FROM security_audit_log WHERE created_at > ?').get(last24h).count,
            loginAttempts24h: _db.prepare('SELECT COUNT(*) as count FROM login_attempts WHERE attempted_at > ?').get(last24h).count
        }
    };
}

module.exports = {
    initializeSecurity,
    verifySecurityConfig,
    getSecuritySummary
};
