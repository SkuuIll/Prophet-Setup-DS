const fs = require('fs');
const path = require('path');

/**
 * Resuelve un archivo público sin permitir salir del directorio raíz.
 * realpath también evita escapes a través de enlaces simbólicos.
 */
function resolvePublicFile(root, requested) {
    if (typeof requested !== 'string' || !requested || requested.includes('\0')) return null;
    // Los nombres de archivo de las Activities son rutas URL relativas, nunca rutas absolutas.
    const parts = requested.replace(/\\/g, '/').split('/');
    if (path.isAbsolute(requested) || parts.some(p => p === '..' || p === '.')) return null;
    const rootReal = fs.realpathSync(root);
    let candidate = path.resolve(rootReal, requested);
    const relative = path.relative(rootReal, candidate);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
        return null;
    }
    try {
        if (fs.statSync(candidate).isDirectory()) {
            candidate = path.join(candidate, 'index.html');
        }
        const real = fs.realpathSync(candidate);
        const realRelative = path.relative(rootReal, real);
        if (realRelative === '..' || realRelative.startsWith('..' + path.sep)
            || path.isAbsolute(realRelative)) return null;
        return fs.statSync(real).isFile() ? real : null;
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR' || error.code === 'ELOOP') {
            return null;
        }
        throw error;
    }
}

module.exports = { resolvePublicFile };
