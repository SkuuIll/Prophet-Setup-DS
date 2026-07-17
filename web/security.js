// ═══════════════════════════════════════════════════
//  PROPHET BOT — Sistema de Seguridad del Dashboard
// ═══════════════════════════════════════════════════

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { stmts, _db } = require('../database');

function loadOrCreateSecret(name, bytes) {
    const configured = String(process.env[name] || '').trim();
    if (configured) return configured;

    const secretsDir = path.join(__dirname, '..', 'data', 'secrets');
    const secretPath = path.join(secretsDir, name.toLowerCase());
    fs.mkdirSync(secretsDir, { recursive: true, mode: 0o700 });

    try {
        const persisted = fs.readFileSync(secretPath, 'utf8').trim();
        if (persisted) return persisted;
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }

    const generated = crypto.randomBytes(bytes).toString('hex');
    try {
        fs.writeFileSync(secretPath, generated, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
        return generated;
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        return fs.readFileSync(secretPath, 'utf8').trim();
    }
}

// ═══════════════════════════════════════════════════
//  CONFIGURACIÓN DE SEGURIDAD
// ═══════════════════════════════════════════════════

const SECURITY_CONFIG = {
    // JWT
    JWT_SECRET: loadOrCreateSecret('JWT_SECRET', 64),
    JWT_EXPIRY: process.env.JWT_EXPIRY || '15m',
    REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',
    
    // Password hashing
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    
    // Rate limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    LOGIN_RATE_LIMIT_MAX: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
    
    // Session
    SESSION_TIMEOUT_MS: parseInt(process.env.SESSION_TIMEOUT_MS) || 30 * 60 * 1000, // 30 min
    MAX_CONCURRENT_SESSIONS: parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 3,
    
    // Password policy
    PASSWORD_MIN_LENGTH: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
    PASSWORD_REQUIRE_UPPERCASE: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    PASSWORD_REQUIRE_LOWERCASE: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    PASSWORD_REQUIRE_NUMBER: process.env.PASSWORD_REQUIRE_NUMBER !== 'false',
    PASSWORD_REQUIRE_SPECIAL: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
    
    // 2FA
    TWO_FACTOR_ENABLED: process.env.TWO_FACTOR_ENABLED === 'true',
    TWO_FACTOR_ISSUER: process.env.TWO_FACTOR_ISSUER || 'ProphetBot Dashboard',
    
    // Encryption
    ENCRYPTION_KEY: loadOrCreateSecret('ENCRYPTION_KEY', 32),
    ENCRYPTION_ALGORITHM: 'aes-256-gcm',
    
    // CORS
    CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3789').split(','),
    
    // Content Security Policy
    CSP_DIRECTIVES: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https:"],
        "font-src": ["'self'"],
        "connect-src": ["'self'"],
        "frame-ancestors": ["'none'"],
        "form-action": ["'self'"],
    },
};

// ═══════════════════════════════════════════════════
//  INICIALIZACIÓN DE TABLAS DE SEGURIDAD
// ═══════════════════════════════════════════════════

function initSecurityTables() {
    _db.exec(`
        -- Usuarios del dashboard (separados de usuarios de Discord)
        CREATE TABLE IF NOT EXISTS dashboard_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'viewer',
            discord_id TEXT,
            two_factor_secret TEXT,
            two_factor_enabled INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            last_login_at INTEGER,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until INTEGER,
            password_changed_at INTEGER,
            must_change_password INTEGER DEFAULT 0
        );
        
        -- Sesiones activas
        CREATE TABLE IF NOT EXISTS dashboard_sessions (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            refresh_token_hash TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            last_activity_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES dashboard_users(id) ON DELETE CASCADE
        );
        
        -- Tokens de refresh
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            revoked INTEGER DEFAULT 0,
            revoked_at INTEGER,
            FOREIGN KEY (user_id) REFERENCES dashboard_users(id) ON DELETE CASCADE
        );
        
        -- Intentos de login (para rate limiting y detección de ataques)
        CREATE TABLE IF NOT EXISTS login_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address TEXT NOT NULL,
            username TEXT,
            success INTEGER NOT NULL,
            attempted_at INTEGER NOT NULL,
            user_agent TEXT,
            failure_reason TEXT
        );
        
        -- Auditoría de acciones
        CREATE TABLE IF NOT EXISTS security_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            resource TEXT,
            resource_id TEXT,
            ip_address TEXT,
            user_agent TEXT,
            details TEXT,
            status TEXT NOT NULL DEFAULT 'success',
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES dashboard_users(id) ON DELETE SET NULL
        );
        
        -- Tokens de reseteo de contraseña
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at INTEGER NOT NULL,
            used INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES dashboard_users(id) ON DELETE CASCADE
        );
        
        -- IPs bloqueadas
        CREATE TABLE IF NOT EXISTS blocked_ips (
            ip_address TEXT PRIMARY KEY,
            reason TEXT,
            blocked_at INTEGER NOT NULL,
            expires_at INTEGER,
            blocked_by INTEGER,
            FOREIGN KEY (blocked_by) REFERENCES dashboard_users(id) ON DELETE SET NULL
        );
        
        -- Índices para rendimiento
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON dashboard_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires ON dashboard_sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
        CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at);
        CREATE INDEX IF NOT EXISTS idx_audit_log_user ON security_audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_action ON security_audit_log(action);
        CREATE INDEX IF NOT EXISTS idx_audit_log_time ON security_audit_log(created_at);
    `);
}

// Inicializar tablas al cargar el módulo
try {
    initSecurityTables();
} catch (error) {
    console.error('Error inicializando tablas de seguridad:', error.message);
}

// ═══════════════════════════════════════════════════
//  UTILIDADES DE ENCRIPTACIÓN
// ═══════════════════════════════════════════════════

/**
 * Encripta datos sensibles usando AES-256-GCM
 */
function encrypt(text) {
    if (!text) return null;
    
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(SECURITY_CONFIG.ENCRYPTION_KEY, 'hex').slice(0, 32);
    const cipher = crypto.createCipheriv(SECURITY_CONFIG.ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
        iv: iv.toString('hex'),
        encrypted,
        authTag: authTag.toString('hex'),
        combined: `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
    };
}

/**
 * Desencripta datos sensibles
 */
function decrypt(combined) {
    if (!combined) return null;
    
    try {
        const [ivHex, authTagHex, encrypted] = combined.split(':');
        const key = Buffer.from(SECURITY_CONFIG.ENCRYPTION_KEY, 'hex').slice(0, 32);
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        
        const decipher = crypto.createDecipheriv(SECURITY_CONFIG.ENCRYPTION_ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Error desencriptando:', error.message);
        return null;
    }
}

/**
 * Hash de contraseña usando PBKDF2 (alternativa a bcrypt sin dependencia externa)
 */
async function hashPassword(password) {
    const salt = crypto.randomBytes(32);
    const iterations = 100000;
    const keylen = 64;
    const digest = 'sha512';
    
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, iterations, keylen, digest, (err, derivedKey) => {
            if (err) reject(err);
            resolve(`pbkdf2:${iterations}:${digest}:${salt.toString('hex')}:${derivedKey.toString('hex')}`);
        });
    });
}

/**
 * Verifica contraseña contra hash
 */
async function verifyPassword(password, storedHash) {
    try {
        const [algorithm, iterations, digest, saltHex, hashHex] = storedHash.split(':');
        
        if (algorithm !== 'pbkdf2') {
            // Fallback para hashes legacy
            return crypto.timingSafeEqual(
                Buffer.from(storedHash, 'hex'),
                Buffer.from(password, 'hex')
            );
        }
        
        const salt = Buffer.from(saltHex, 'hex');
        const iterationsNum = parseInt(iterations);
        
        return new Promise((resolve, reject) => {
            crypto.pbkdf2(password, salt, iterationsNum, 64, digest, (err, derivedKey) => {
                if (err) reject(err);
                resolve(crypto.timingSafeEqual(
                    Buffer.from(hashHex, 'hex'),
                    derivedKey
                ));
            });
        });
    } catch {
        return false;
    }
}

/**
 * Genera un token seguro
 */
function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

// ═══════════════════════════════════════════════════
//  JWT - JSON Web Tokens
// ═══════════════════════════════════════════════════

/**
 * Genera un JWT
 */
function generateJWT(payload, expiresIn = SECURITY_CONFIG.JWT_EXPIRY) {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };
    
    const now = Math.floor(Date.now() / 1000);
    const exp = now + parseExpiry(expiresIn);
    
    const tokenPayload = {
        ...payload,
        iat: now,
        exp
    };
    
    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const payloadB64 = base64UrlEncode(JSON.stringify(tokenPayload));
    const signature = crypto
        .createHmac('sha256', SECURITY_CONFIG.JWT_SECRET)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    
    return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Verifica y decodifica un JWT
 */
function verifyJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const [headerB64, payloadB64, signature] = parts;
        
        // Verificar firma
        const expectedSignature = crypto
            .createHmac('sha256', SECURITY_CONFIG.JWT_SECRET)
            .update(`${headerB64}.${payloadB64}`)
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        
        if (!crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        )) {
            return null;
        }
        
        const payload = JSON.parse(base64UrlDecode(payloadB64));
        
        // Verificar expiración
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return { valid: false, expired: true };
        }
        
        return { valid: true, payload };
    } catch {
        return null;
    }
}

/**
 * Genera refresh token
 */
function generateRefreshToken() {
    return generateSecureToken(64);
}

/**
 * Parsea tiempo de expiración (ej: "15m", "7d", "1h")
 */
function parseExpiry(expiry) {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 min
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 3600;
        case 'd': return value * 86400;
        default: return 900;
    }
}

function base64UrlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function base64UrlDecode(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return Buffer.from(base64, 'base64').toString('utf8');
}

// ═══════════════════════════════════════════════════
//  PROTECCIÓN CSRF
// ═══════════════════════════════════════════════════

const csrfTokens = new Map();

/**
 * Genera token CSRF
 */
function generateCSRFToken(sessionId) {
    const token = generateSecureToken(32);
    const timestamp = Date.now();
    
    csrfTokens.set(token, {
        sessionId,
        createdAt: timestamp,
        expiresAt: timestamp + SECURITY_CONFIG.SESSION_TIMEOUT_MS
    });
    
    // Limpiar tokens expirados
    cleanupCSRFTokens();
    
    return token;
}

/**
 * Verifica token CSRF
 */
function verifyCSRFToken(token, sessionId) {
    if (!token) return false;
    
    const tokenData = csrfTokens.get(token);
    if (!tokenData) return false;
    
    if (Date.now() > tokenData.expiresAt) {
        csrfTokens.delete(token);
        return false;
    }
    
    if (tokenData.sessionId !== sessionId) {
        return false;
    }
    
    return true;
}

/**
 * Limpia tokens CSRF expirados
 */
function cleanupCSRFTokens() {
    const now = Date.now();
    for (const [token, data] of csrfTokens.entries()) {
        if (data.expiresAt < now) {
            csrfTokens.delete(token);
        }
    }
}

// ═══════════════════════════════════════════════════
//  RATE LIMITING
// ═══════════════════════════════════════════════════

const rateLimitStore = new Map();

/**
 * Verifica rate limit para una IP o usuario
 */
function checkRateLimit(identifier, maxRequests = SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS) {
    const now = Date.now();
    const windowStart = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS;
    
    let requests = rateLimitStore.get(identifier) || [];
    requests = requests.filter(time => time > windowStart);
    
    if (requests.length >= maxRequests) {
        const oldestRequest = Math.min(...requests);
        const resetTime = oldestRequest + SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS;
        
        return {
            allowed: false,
            remaining: 0,
            resetAt: resetTime,
            retryAfter: Math.ceil((resetTime - now) / 1000)
        };
    }
    
    requests.push(now);
    rateLimitStore.set(identifier, requests);
    
    return {
        allowed: true,
        remaining: maxRequests - requests.length,
        resetAt: windowStart + SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS
    };
}

/**
 * Limpia rate limits antiguos
 */
function cleanupRateLimits() {
    const windowStart = Date.now() - SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS;
    
    for (const [identifier, requests] of rateLimitStore.entries()) {
        const validRequests = requests.filter(time => time > windowStart);
        if (validRequests.length === 0) {
            rateLimitStore.delete(identifier);
        } else {
            rateLimitStore.set(identifier, validRequests);
        }
    }
}

// Limpiar cada 5 minutos
setInterval(() => {
    cleanupRateLimits();
    cleanupCSRFTokens();
}, 5 * 60 * 1000);

// ═══════════════════════════════════════════════════
//  VALIDACIÓN DE INPUT
// ═══════════════════════════════════════════════════

/**
 * Sanitiza string contra XSS
 */
function sanitizeString(input, maxLength = 1000) {
    if (typeof input !== 'string') return '';
    
    return input
        .slice(0, maxLength)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/`/g, '&#x60;')
        .replace(/=/g, '&#x3D;');
}

/**
 * Valida email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valida fortaleza de contraseña
 */
function validatePasswordStrength(password) {
    const result = {
        valid: true,
        errors: [],
        strength: 0
    };
    
    if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
        result.valid = false;
        result.errors.push(`Mínimo ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} caracteres`);
    } else {
        result.strength += 1;
    }
    
    if (SECURITY_CONFIG.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
        result.valid = false;
        result.errors.push('Al menos una mayúscula');
    } else if (/[A-Z]/.test(password)) {
        result.strength += 1;
    }
    
    if (SECURITY_CONFIG.PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
        result.valid = false;
        result.errors.push('Al menos una minúscula');
    } else if (/[a-z]/.test(password)) {
        result.strength += 1;
    }
    
    if (SECURITY_CONFIG.PASSWORD_REQUIRE_NUMBER && !/\d/.test(password)) {
        result.valid = false;
        result.errors.push('Al menos un número');
    } else if (/\d/.test(password)) {
        result.strength += 1;
    }
    
    if (SECURITY_CONFIG.PASSWORD_REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        result.valid = false;
        result.errors.push('Al menos un carácter especial');
    } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        result.strength += 1;
    }
    
    // Verificar patrones comunes débiles
    const weakPatterns = [
        /(.)\1{2,}/, // Caracteres repetidos
        /123|234|345|456|567|678|789|890/, // Secuencias numéricas
        /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i // Secuencias alfabéticas
    ];
    
    for (const pattern of weakPatterns) {
        if (pattern.test(password)) {
            result.strength = Math.max(1, result.strength - 1);
            break;
        }
    }
    
    return result;
}

/**
 * Valida username
 */
function validateUsername(username) {
    const result = { valid: true, errors: [] };
    
    if (!username || username.length < 3) {
        result.valid = false;
        result.errors.push('Mínimo 3 caracteres');
    }
    
    if (username && username.length > 32) {
        result.valid = false;
        result.errors.push('Máximo 32 caracteres');
    }
    
    if (username && !/^[a-zA-Z0-9_-]+$/.test(username)) {
        result.valid = false;
        result.errors.push('Solo letras, números, guiones y guiones bajos');
    }
    
    return result;
}

// ═══════════════════════════════════════════════════
//  HEADERS DE SEGURIDAD HTTP
// ═══════════════════════════════════════════════════

/**
 * Genera headers de seguridad
 */
function getSecurityHeaders(nonce = null) {
    const cspDirectives = Object.entries(SECURITY_CONFIG.CSP_DIRECTIVES)
        .map(([key, values]) => {
            const nonceValue = nonce && key === 'script-src' ? [`'nonce-${nonce}'`] : [];
            return `${key} ${[...values, ...nonceValue].join(' ')}`;
        })
        .join('; ');
    
    return {
        'Content-Security-Policy': cspDirectives,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };
}

// ═══════════════════════════════════════════════════
//  SISTEMA DE ROLES Y PERMISOS (RBAC)
// ═══════════════════════════════════════════════════

const ROLES = {
    superadmin: {
        level: 100,
        permissions: ['*']
    },
    admin: {
        level: 80,
        permissions: [
            'dashboard:read', 'dashboard:write',
            'users:read', 'users:write', 'users:delete',
            'config:read', 'config:write',
            'logs:read', 'logs:export',
            'analytics:read',
            'tickets:read', 'tickets:write', 'tickets:close',
            'giveaways:read', 'giveaways:write', 'giveaways:end',
            'moderation:read', 'moderation:write',
            'security:read'
        ]
    },
    moderator: {
        level: 60,
        permissions: [
            'dashboard:read',
            'users:read',
            'logs:read',
            'analytics:read',
            'tickets:read', 'tickets:write', 'tickets:close',
            'giveaways:read', 'giveaways:end',
            'moderation:read', 'moderation:write'
        ]
    },
    editor: {
        level: 40,
        permissions: [
            'dashboard:read',
            'config:read',
            'logs:read',
            'analytics:read',
            'tickets:read',
            'giveaways:read', 'giveaways:write'
        ]
    },
    viewer: {
        level: 20,
        permissions: [
            'dashboard:read',
            'logs:read',
            'analytics:read'
        ]
    }
};

/**
 * Verifica si un rol tiene un permiso específico
 */
function hasPermission(role, permission) {
    if (!ROLES[role]) return false;
    
    const permissions = ROLES[role].permissions;
    
    // Superadmin tiene acceso a todo
    if (permissions.includes('*')) return true;
    
    // Verificar permiso exacto
    if (permissions.includes(permission)) return true;
    
    // Verificar permisos con wildcard (ej: "users:*" para "users:read")
    const [resource] = permission.split(':');
    if (permissions.includes(`${resource}:*`)) return true;
    
    return false;
}

/**
 * Obtiene el nivel de un rol
 */
function getRoleLevel(role) {
    return ROLES[role]?.level || 0;
}

/**
 * Verifica si el usuario puede realizar una acción sobre otro usuario
 */
function canModifyUser(actorRole, targetRole) {
    return getRoleLevel(actorRole) > getRoleLevel(targetRole);
}

// ═══════════════════════════════════════════════════
//  AUDITORÍA Y LOGGING DE SEGURIDAD
// ═══════════════════════════════════════════════════

/**
 * Registra evento de auditoría
 */
function auditLog(action, details = {}) {
    const {
        userId = null,
        resource = null,
        resourceId = null,
        ipAddress = null,
        userAgent = null,
        status = 'success'
    } = details;
    
    try {
        _db.prepare(`
            INSERT INTO security_audit_log 
            (user_id, action, resource, resource_id, ip_address, user_agent, details, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            userId,
            action,
            resource,
            resourceId,
            ipAddress,
            userAgent,
            JSON.stringify(details),
            status,
            Date.now()
        );
    } catch (error) {
        console.error('Error registrando auditoría:', error.message);
    }
}

/**
 * Obtiene logs de auditoría
 */
function getAuditLogs(filters = {}, limit = 100) {
    let query = 'SELECT * FROM security_audit_log WHERE 1=1';
    const params = [];
    
    if (filters.userId) {
        query += ' AND user_id = ?';
        params.push(filters.userId);
    }
    
    if (filters.action) {
        query += ' AND action = ?';
        params.push(filters.action);
    }
    
    if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
    }
    
    if (filters.since) {
        query += ' AND created_at >= ?';
        params.push(filters.since);
    }
    
    if (filters.until) {
        query += ' AND created_at <= ?';
        params.push(filters.until);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    return _db.prepare(query).all(...params).map(row => ({
        ...row,
        details: JSON.parse(row.details || '{}')
    }));
}

// ═══════════════════════════════════════════════════
//  GESTIÓN DE USUARIOS DEL DASHBOARD
// ═══════════════════════════════════════════════════

/**
 * Crea un usuario del dashboard
 */
async function createDashboardUser(userData) {
    const { username, email, password, role = 'viewer', discordId = null } = userData;
    
    // Validar username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
        throw new Error(usernameValidation.errors.join(', '));
    }
    
    // Validar email si se proporciona
    if (email && !isValidEmail(email)) {
        throw new Error('Email inválido');
    }
    
    // Validar contraseña
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(', '));
    }
    
    // Validar rol
    if (!ROLES[role]) {
        throw new Error('Rol inválido');
    }
    
    // Verificar si ya existe
    const existing = _db.prepare('SELECT id FROM dashboard_users WHERE username = ?').get(username);
    if (existing) {
        throw new Error('El nombre de usuario ya existe');
    }
    
    if (email) {
        const existingEmail = _db.prepare('SELECT id FROM dashboard_users WHERE email = ?').get(email);
        if (existingEmail) {
            throw new Error('El email ya está registrado');
        }
    }
    
    const passwordHash = await hashPassword(password);
    const now = Date.now();
    
    const result = _db.prepare(`
        INSERT INTO dashboard_users 
        (username, email, password_hash, role, discord_id, created_at, updated_at, password_changed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(username, email || null, passwordHash, role, discordId, now, now, now);
    
    auditLog('user_created', { 
        resourceId: result.lastInsertRowid,
        details: { username, email, role }
    });
    
    return {
        id: result.lastInsertRowid,
        username,
        email,
        role,
        discordId,
        createdAt: now
    };
}

/**
 * Autentica un usuario
 */
async function authenticateUser(username, password, ipAddress, userAgent) {
    const user = _db.prepare('SELECT * FROM dashboard_users WHERE username = ?').get(username);
    
    if (!user) {
        await recordLoginAttempt(ipAddress, username, false, 'Usuario no encontrado', userAgent);
        return { success: false, error: 'Credenciales inválidas' };
    }
    
    // Verificar si está bloqueado
    if (user.locked_until && user.locked_until > Date.now()) {
        await recordLoginAttempt(ipAddress, username, false, 'Cuenta bloqueada', userAgent);
        return { 
            success: false, 
            error: 'Cuenta temporalmente bloqueada',
            lockedUntil: user.locked_until
        };
    }
    
    // Verificar contraseña
    const validPassword = await verifyPassword(password, user.password_hash);
    
    if (!validPassword) {
        // Incrementar intentos fallidos
        const newAttempts = (user.failed_login_attempts || 0) + 1;
        
        if (newAttempts >= SECURITY_CONFIG.LOGIN_RATE_LIMIT_MAX) {
            // Bloquear cuenta
            const lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutos
            _db.prepare('UPDATE dashboard_users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?')
                .run(newAttempts, lockUntil, user.id);
            
            await recordLoginAttempt(ipAddress, username, false, 'Cuenta bloqueada por intentos fallidos', userAgent);
            return { 
                success: false, 
                error: 'Demasiados intentos fallidos. Cuenta bloqueada por 30 minutos',
                lockedUntil: lockUntil
            };
        }
        
        _db.prepare('UPDATE dashboard_users SET failed_login_attempts = ? WHERE id = ?')
            .run(newAttempts, user.id);
        
        await recordLoginAttempt(ipAddress, username, false, 'Contraseña incorrecta', userAgent);
        return { success: false, error: 'Credenciales inválidas' };
    }
    
    // Login exitoso
    _db.prepare('UPDATE dashboard_users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?')
        .run(Date.now(), user.id);
    
    await recordLoginAttempt(ipAddress, username, true, null, userAgent);
    
    // Crear sesión
    const sessionId = generateSecureToken(32);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const sessionExpiry = Date.now() + parseExpiry(SECURITY_CONFIG.REFRESH_TOKEN_EXPIRY) * 1000;
    
    // Limpiar sesiones antiguas del usuario
    const existingSessions = _db.prepare('SELECT id FROM dashboard_sessions WHERE user_id = ? ORDER BY created_at DESC')
        .all(user.id);
    
    if (existingSessions.length >= SECURITY_CONFIG.MAX_CONCURRENT_SESSIONS) {
        const sessionsToKeep = existingSessions.slice(0, SECURITY_CONFIG.MAX_CONCURRENT_SESSIONS - 1);
        const idsToKeep = sessionsToKeep.map(s => s.id);
        
        if (idsToKeep.length > 0) {
            const placeholders = idsToKeep.map(() => '?').join(',');
            _db.prepare(`DELETE FROM dashboard_sessions WHERE user_id = ? AND id NOT IN (${placeholders})`)
                .run(user.id, ...idsToKeep);
        }
    }
    
    _db.prepare(`
        INSERT INTO dashboard_sessions (id, user_id, refresh_token_hash, ip_address, user_agent, created_at, expires_at, last_activity_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, user.id, refreshTokenHash, ipAddress, userAgent, Date.now(), sessionExpiry, Date.now());
    
    // Guardar refresh token
    _db.prepare(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(generateSecureToken(16), user.id, refreshTokenHash, sessionExpiry, Date.now());
    
    // Generar JWT
    const jwt = generateJWT({
        userId: user.id,
        username: user.username,
        role: user.role,
        sessionId
    });
    
    auditLog('login', { 
        userId: user.id, 
        ipAddress, 
        userAgent,
        resourceId: sessionId
    });
    
    return {
        success: true,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            twoFactorEnabled: user.two_factor_enabled === 1,
            mustChangePassword: user.must_change_password === 1
        },
        tokens: {
            accessToken: jwt,
            refreshToken,
            expiresIn: parseExpiry(SECURITY_CONFIG.JWT_EXPIRY)
        },
        sessionId
    };
}

/**
 * Registra intento de login
 */
async function recordLoginAttempt(ipAddress, username, success, failureReason, userAgent) {
    _db.prepare(`
        INSERT INTO login_attempts (ip_address, username, success, attempted_at, user_agent, failure_reason)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(ipAddress, username, success ? 1 : 0, Date.now(), userAgent, failureReason);
}

/**
 * Verifica sesión activa
 */
function verifySession(sessionId, userId) {
    const session = _db.prepare(`
        SELECT * FROM dashboard_sessions 
        WHERE id = ? AND user_id = ?
    `).get(sessionId, userId);

    if (!session) return false;

    const now = Date.now();
    const inactive = session.last_activity_at <= (now - SECURITY_CONFIG.SESSION_TIMEOUT_MS);
    const expired = session.expires_at <= now;

    if (inactive || expired) {
        revokeSession(sessionId, userId);
        return false;
    }

    _db.prepare('UPDATE dashboard_sessions SET last_activity_at = ? WHERE id = ?')
        .run(now, sessionId);

    return true;
}

function revokeSession(sessionId, userId = null) {
    let session;

    if (userId === null) {
        session = _db.prepare('SELECT id, user_id, refresh_token_hash FROM dashboard_sessions WHERE id = ?').get(sessionId);
    } else {
        session = _db.prepare('SELECT id, user_id, refresh_token_hash FROM dashboard_sessions WHERE id = ? AND user_id = ?').get(sessionId, userId);
    }

    if (!session) return null;

    const now = Date.now();

    if (session.refresh_token_hash) {
        _db.prepare('UPDATE refresh_tokens SET revoked = 1, revoked_at = ? WHERE token_hash = ? AND revoked = 0')
            .run(now, session.refresh_token_hash);
    }

    _db.prepare('DELETE FROM dashboard_sessions WHERE id = ?').run(sessionId);
    return session;
}

function revokeUserSessions(userId, exceptSessionId = null) {
    const sessions = exceptSessionId
        ? _db.prepare('SELECT id, refresh_token_hash FROM dashboard_sessions WHERE user_id = ? AND id != ?').all(userId, exceptSessionId)
        : _db.prepare('SELECT id, refresh_token_hash FROM dashboard_sessions WHERE user_id = ?').all(userId);

    if (!sessions.length) return 0;

    const now = Date.now();
    const hashes = sessions.map(session => session.refresh_token_hash).filter(Boolean);

    if (hashes.length) {
        const placeholders = hashes.map(() => '?').join(',');
        _db.prepare(`UPDATE refresh_tokens SET revoked = 1, revoked_at = ? WHERE token_hash IN (${placeholders}) AND revoked = 0`)
            .run(now, ...hashes);
    }

    if (exceptSessionId) {
        _db.prepare('DELETE FROM dashboard_sessions WHERE user_id = ? AND id != ?').run(userId, exceptSessionId);
    } else {
        _db.prepare('DELETE FROM dashboard_sessions WHERE user_id = ?').run(userId);
    }

    return sessions.length;
}

/**
 * Cierra sesión
 */
function logout(sessionId, userId, ipAddress) {
    const revokedSession = revokeSession(sessionId, userId);

    auditLog('logout', {
        userId,
        ipAddress,
        resourceId: sessionId,
        status: revokedSession ? 'success' : 'failed'
    });
}

/**
 * Cambia contraseña
 */
async function changePassword(userId, currentPassword, newPassword, ipAddress) {
    const user = _db.prepare('SELECT * FROM dashboard_users WHERE id = ?').get(userId);
    
    if (!user) {
        throw new Error('Usuario no encontrado');
    }
    
    const validPassword = await verifyPassword(currentPassword, user.password_hash);
    if (!validPassword) {
        auditLog('password_change', { userId, ipAddress, status: 'failed', details: { reason: 'Contraseña actual incorrecta' }});
        throw new Error('Contraseña actual incorrecta');
    }
    
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(', '));
    }
    
    const newPasswordHash = await hashPassword(newPassword);
    const now = Date.now();
    
    _db.prepare('UPDATE dashboard_users SET password_hash = ?, password_changed_at = ?, must_change_password = 0, updated_at = ? WHERE id = ?')
        .run(newPasswordHash, now, now, userId);

    const revokedSessions = revokeUserSessions(userId);
    
    auditLog('password_change', { userId, ipAddress, details: { revokedSessions } });
    
    return { success: true, revokedSessions };
}

// ═══════════════════════════════════════════════════
//  DETECCIÓN DE AMENAZAS
// ═══════════════════════════════════════════════════

/**
 * Detecta patrones de ataque
 */
function detectThreats(ipAddress, userAgent) {
    const threats = [];
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutos
    
    // Verificar intentos fallidos recientes
    const failedAttempts = _db.prepare(`
        SELECT COUNT(*) as count FROM login_attempts 
        WHERE ip_address = ? AND success = 0 AND attempted_at > ?
    `).get(ipAddress, now - windowMs);
    
    if (failedAttempts.count >= 10) {
        threats.push({
            type: 'brute_force',
            severity: 'high',
            message: `${failedAttempts.count} intentos fallidos en los últimos 5 minutos`
        });
    }
    
    // Verificar si la IP está bloqueada
    const blockedIp = _db.prepare('SELECT * FROM blocked_ips WHERE ip_address = ? AND (expires_at IS NULL OR expires_at > ?)')
        .get(ipAddress, now);
    
    if (blockedIp) {
        threats.push({
            type: 'blocked_ip',
            severity: 'critical',
            message: 'IP bloqueada',
            reason: blockedIp.reason
        });
    }
    
    // Verificar user agents sospechosos
    const suspiciousPatterns = [
        /sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /zgrab/i,
        /gobuster/i, /dirb/i, /dirbuster/i, /wfuzz/i,
        /burp/i, /owasp/i, /scanner/i
    ];
    
    if (userAgent) {
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(userAgent)) {
                threats.push({
                    type: 'suspicious_user_agent',
                    severity: 'medium',
                    message: 'User agent sospechoso detectado'
                });
                break;
            }
        }
    }
    
    return threats;
}

/**
 * Bloquea una IP
 */
function blockIp(ipAddress, reason, duration = null, blockedBy = null) {
    const expiresAt = duration ? Date.now() + duration : null;
    
    _db.prepare(`
        INSERT OR REPLACE INTO blocked_ips (ip_address, reason, blocked_at, expires_at, blocked_by)
        VALUES (?, ?, ?, ?, ?)
    `).run(ipAddress, reason, Date.now(), expiresAt, blockedBy);
    
    auditLog('ip_blocked', { 
        userId: blockedBy,
        resource: 'ip',
        resourceId: ipAddress,
        details: { reason, duration }
    });
}

/**
 * Desbloquea una IP
 */
function unblockIp(ipAddress, unblockedBy = null) {
    _db.prepare('DELETE FROM blocked_ips WHERE ip_address = ?').run(ipAddress);
    
    auditLog('ip_unblocked', {
        userId: unblockedBy,
        resource: 'ip',
        resourceId: ipAddress
    });
}

// ═══════════════════════════════════════════════════
//  EXPORTACIONES
// ═══════════════════════════════════════════════════

module.exports = {
    // Configuración
    SECURITY_CONFIG,
    ROLES,
    
    // Encriptación
    encrypt,
    decrypt,
    hashPassword,
    verifyPassword,
    generateSecureToken,
    
    // JWT
    generateJWT,
    verifyJWT,
    generateRefreshToken,
    parseExpiry,
    
    // CSRF
    generateCSRFToken,
    verifyCSRFToken,
    
    // Rate Limiting
    checkRateLimit,
    
    // Validación
    sanitizeString,
    isValidEmail,
    validatePasswordStrength,
    validateUsername,
    
    // Headers
    getSecurityHeaders,
    
    // Permisos
    hasPermission,
    getRoleLevel,
    canModifyUser,
    
    // Auditoría
    auditLog,
    getAuditLogs,
    
    // Usuarios
    createDashboardUser,
    authenticateUser,
    verifySession,
    logout,
    changePassword,
    revokeSession,
    revokeUserSessions,
    
    // Amenazas
    detectThreats,
    blockIp,
    unblockIp
};
