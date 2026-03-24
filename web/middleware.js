// ═══════════════════════════════════════════════════
//  PROPHET BOT — Middleware de Seguridad
// ═══════════════════════════════════════════════════

const security = require('./security');
const { URL } = require('url');

// ═══════════════════════════════════════════════════
//  MIDDLEWARE DE AUTENTICACIÓN
// ═══════════════════════════════════════════════════

/**
 * Extrae información del cliente
 */
function getClientInfo(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress = forwarded 
        ? forwarded.split(',')[0].trim() 
        : req.socket.remoteAddress || 'unknown';
    
    return {
        ipAddress: ipAddress.replace(/^::ffff:/, ''),
        userAgent: req.headers['user-agent'] || 'unknown'
    };
}

/**
 * Middleware de autenticación JWT
 */
function authenticate(req, res, next) {
    const { ipAddress, userAgent } = getClientInfo(req);
    
    // Detectar amenazas antes de procesar
    const threats = security.detectThreats(ipAddress, userAgent);
    if (threats.some(t => t.severity === 'critical')) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Acceso denegado', code: 'IP_BLOCKED' }));
        return;
    }
    
    // Verificar rate limit
    const rateLimit = security.checkRateLimit(ipAddress);
    if (!rateLimit.allowed) {
        res.setHeader('Retry-After', rateLimit.retryAfter);
        res.setHeader('X-RateLimit-Reset', rateLimit.resetAt);
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            error: 'Demasiadas solicitudes', 
            retryAfter: rateLimit.retryAfter 
        }));
        return;
    }
    
    // Extraer token
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7).trim() 
        : null;
    
    if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Token de autenticación requerido' }));
        return;
    }
    
    // Verificar JWT
    const verification = security.verifyJWT(token);
    
    if (!verification) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Token inválido' }));
        return;
    }
    
    if (verification.expired) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Token expirado', code: 'TOKEN_EXPIRED' }));
        return;
    }
    
    // Verificar sesión
    if (!security.verifySession(verification.payload.sessionId, verification.payload.userId)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Sesión no válida o expirada' }));
        return;
    }
    
    // Adjuntar información del usuario al request
    req.user = {
        id: verification.payload.userId,
        username: verification.payload.username,
        role: verification.payload.role,
        sessionId: verification.payload.sessionId
    };
    req.clientInfo = { ipAddress, userAgent };
    
    next();
}

/**
 * Middleware de autenticación opcional (no falla si no hay token)
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7).trim() 
        : null;
    
    if (token) {
        const verification = security.verifyJWT(token);
        if (verification?.valid && verification.payload) {
            req.user = {
                id: verification.payload.userId,
                username: verification.payload.username,
                role: verification.payload.role,
                sessionId: verification.payload.sessionId
            };
        }
    }
    
    const { ipAddress, userAgent } = getClientInfo(req);
    req.clientInfo = { ipAddress, userAgent };
    
    next();
}

// ═══════════════════════════════════════════════════
//  MIDDLEWARE DE AUTORIZACIÓN
// ═══════════════════════════════════════════════════

/**
 * Middleware que requiere un permiso específico
 */
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Autenticación requerida' }));
            return;
        }
        
        if (!security.hasPermission(req.user.role, permission)) {
            security.auditLog('unauthorized_access', {
                userId: req.user.id,
                resource: permission,
                ipAddress: req.clientInfo?.ipAddress,
                userAgent: req.clientInfo?.userAgent,
                status: 'denied'
            });
            
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'No tienes permiso para realizar esta acción',
                requiredPermission: permission
            }));
            return;
        }
        
        next();
    };
}

/**
 * Middleware que requiere un rol mínimo
 */
function requireRole(minRole) {
    return (req, res, next) => {
        if (!req.user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Autenticación requerida' }));
            return;
        }
        
        const userLevel = security.getRoleLevel(req.user.role);
        const requiredLevel = security.getRoleLevel(minRole);
        
        if (userLevel < requiredLevel) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'No tienes el rol necesario',
                requiredRole: minRole,
                currentRole: req.user.role
            }));
            return;
        }
        
        next();
    };
}

/**
 * Middleware que requiere ser admin o superior
 */
function requireAdmin(req, res, next) {
    return requireRole('admin')(req, res, next);
}

/**
 * Middleware que requiere ser superadmin
 */
function requireSuperAdmin(req, res, next) {
    return requireRole('superadmin')(req, res, next);
}

// ═══════════════════════════════════════════════════
//  MIDDLEWARE DE CSRF
// ═══════════════════════════════════════════════════

/**
 * Middleware de verificación CSRF para métodos mutantes
 */
function csrfProtection(req, res, next) {
    // Solo verificar para métodos que modifican datos
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    
    if (!mutatingMethods.includes(req.method)) {
        return next();
    }
    
    if (!req.user?.sessionId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Sesión no encontrada' }));
        return;
    }
    
    const csrfToken = req.headers['x-csrf-token'];
    
    if (!csrfToken || !security.verifyCSRFToken(csrfToken, req.user.sessionId)) {
        security.auditLog('csrf_violation', {
            userId: req.user?.id,
            ipAddress: req.clientInfo?.ipAddress,
            userAgent: req.clientInfo?.userAgent,
            status: 'denied'
        });
        
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Token CSRF inválido' }));
        return;
    }
    
    next();
}

// ═══════════════════════════════════════════════════
//  MIDDLEWARE DE CORS
// ═══════════════════════════════════════════════════

/**
 * Middleware de CORS
 */
function cors(req, res, next) {
    const origin = req.headers.origin;
    
    // Verificar si el origen está permitido
    if (origin && security.SECURITY_CONFIG.CORS_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 
            'Authorization, Content-Type, X-CSRF-Token, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Expose-Headers', 
            'X-CSRF-Token, X-RateLimit-Remaining, X-RateLimit-Reset');
        res.setHeader('Access-Control-Max-Age', '86400');
    }
    
    // Responder a preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    next();
}

// ═══════════════════════════════════════════════════
//  MIDDLEWARE DE HEADERS DE SEGURIDAD
// ═══════════════════════════════════════════════════

/**
 * Aplica headers de seguridad a todas las respuestas
 */
function securityHeaders(req, res, next) {
    const nonce = security.generateSecureToken(16);
    req.nonce = nonce;
    
    const headers = security.getSecurityHeaders(nonce);
    
    for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value);
    }
    
    next();
}

// ═══════════════════════════════════════════════════
//  MIDDLEWARE DE VALIDACIÓN DE INPUT
// ═══════════════════════════════════════════════════

/**
 * Valida el tamaño del body
 */
function validateBodySize(maxSize = 1024 * 1024) { // 1MB default
    return (req, res, next) => {
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);
        
        if (contentLength > maxSize) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Payload demasiado grande' }));
            return;
        }
        
        next();
    };
}

/**
 * Sanitiza el body JSON
 */
function sanitizeBody(maxDepth = 10) {
    return (req, res, next) => {
        if (!req.body || typeof req.body !== 'object') {
            return next();
        }
        
        const sanitize = (obj, depth = 0) => {
            if (depth > maxDepth) return {};
            
            if (Array.isArray(obj)) {
                return obj.map(item => sanitize(item, depth + 1));
            }
            
            if (typeof obj === 'object' && obj !== null) {
                const sanitized = {};
                for (const [key, value] of Object.entries(obj)) {
                    // Validar clave
                    const sanitizedKey = security.sanitizeString(key, 100);
                    
                    if (typeof value === 'string') {
                        sanitized[sanitizedKey] = security.sanitizeString(value, 10000);
                    } else if (typeof value === 'object' && value !== null) {
                        sanitized[sanitizedKey] = sanitize(value, depth + 1);
                    } else {
                        sanitized[sanitizedKey] = value;
                    }
                }
                return sanitized;
            }
            
            return obj;
        };
        
        req.body = sanitize(req.body);
        next();
    };
}

// ═══════════════════════════════════════════════════
//  MIDDLEWARE DE LOGGING
// ═══════════════════════════════════════════════════

/**
 * Log de todas las peticiones
 */
function requestLogger(req, res, next) {
    const startTime = Date.now();
    const { ipAddress, userAgent } = getClientInfo(req);
    
    // Interceptar el end original para capturar el código de estado
    const originalEnd = res.end.bind(res);
    res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        
        // Log de auditoría para acciones sensibles
        const sensitiveRoutes = [
            '/api/auth/login',
            '/api/auth/logout',
            '/api/users',
            '/api/config',
            '/api/security'
        ];
        
        if (sensitiveRoutes.some(route => req.url?.startsWith(route))) {
            security.auditLog('api_request', {
                userId: req.user?.id,
                resource: req.url,
                ipAddress,
                userAgent,
                details: {
                    method: req.method,
                    statusCode: res.statusCode,
                    duration
                }
            });
        }
        
        return originalEnd(chunk, encoding);
    };
    
    next();
}

// ═══════════════════════════════════════════════════
//  MIDDLEWARE DE PARSEO DE BODY
// ═══════════════════════════════════════════════════

/**
 * Parsea JSON del body de forma segura
 */
function parseJsonBody(maxSize = 64 * 1024) {
    return (req, res, next) => {
        if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
            req.body = {};
            return next();
        }
        
        const contentType = req.headers['content-type'] || '';
        
        if (!contentType.includes('application/json')) {
            req.body = {};
            return next();
        }
        
        let raw = '';
        let size = 0;
        
        req.on('data', chunk => {
            size += chunk.length;
            if (size > maxSize) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Payload demasiado grande' }));
                req.destroy();
                return;
            }
            raw += chunk;
        });
        
        req.on('end', () => {
            if (!raw) {
                req.body = {};
                return next();
            }
            
            try {
                req.body = JSON.parse(raw);
                next();
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'JSON inválido' }));
            }
        });
        
        req.on('error', error => {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        });
    };
}

// ═══════════════════════════════════════════════════
//  COMPOSICIÓN DE MIDDLEWARES
// ═══════════════════════════════════════════════════

/**
 * Middleware completo de seguridad para API
 */
function apiSecurity(req, res, next) {
    const middlewares = [
        securityHeaders,
        cors,
        requestLogger,
        parseJsonBody(),
        sanitizeBody()
    ];
    
    let index = 0;
    
    const runNext = () => {
        if (index < middlewares.length) {
            middlewares[index++](req, res, runNext);
        } else {
            next();
        }
    };
    
    runNext();
}

/**
 * Middleware completo para endpoints protegidos
 */
function protectedApi(permission = null) {
    const middlewares = [
        apiSecurity,
        authenticate,
        csrfProtection
    ];
    
    if (permission) {
        middlewares.push(requirePermission(permission));
    }
    
    return (req, res, next) => {
        let index = 0;
        
        const runNext = () => {
            if (index < middlewares.length) {
                middlewares[index++](req, res, runNext);
            } else {
                next();
            }
        };
        
        runNext();
    };
}

// ═══════════════════════════════════════════════════
//  UTILIDADES DE RESPUESTA
// ═══════════════════════════════════════════════════

/**
 * Envía respuesta JSON con headers de seguridad
 */
function sendJson(res, statusCode, data, nonce = null) {
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        ...security.getSecurityHeaders(nonce)
    };
    
    res.writeHead(statusCode, headers);
    res.end(JSON.stringify(data, null, 2));
}

/**
 * Envía error estandarizado
 */
function sendError(res, statusCode, message, code = null, details = null) {
    const error = {
        error: message,
        timestamp: new Date().toISOString()
    };
    
    if (code) error.code = code;
    if (details) error.details = details;
    
    sendJson(res, statusCode, error);
}

/**
 * Genera y envía token CSRF
 */
function sendCsrfToken(req, res, next) {
    if (req.user?.sessionId) {
        const csrfToken = security.generateCSRFToken(req.user.sessionId);
        res.setHeader('X-CSRF-Token', csrfToken);
        res.setHeader('Access-Control-Expose-Headers', 
            (res.getHeader('Access-Control-Expose-Headers') || '') + ', X-CSRF-Token');
    }
    next();
}

// ═══════════════════════════════════════════════════
//  EXPORTACIONES
// ═══════════════════════════════════════════════════

module.exports = {
    // Autenticación
    authenticate,
    optionalAuth,
    getClientInfo,
    
    // Autorización
    requirePermission,
    requireRole,
    requireAdmin,
    requireSuperAdmin,
    
    // Protección
    csrfProtection,
    cors,
    securityHeaders,
    
    // Validación
    validateBodySize,
    sanitizeBody,
    parseJsonBody,
    
    // Logging
    requestLogger,
    
    // Composición
    apiSecurity,
    protectedApi,
    
    // Utilidades
    sendJson,
    sendError,
    sendCsrfToken
};
