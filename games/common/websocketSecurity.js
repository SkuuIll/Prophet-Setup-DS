// Evita que un token de demostración dé acceso a juegos/economía reales.
// Solo se habilita expresamente durante desarrollo en loopback.
function isLocalDemoAllowed({ enabled, nodeEnv, address }) {
    return enabled === 'true'
        && nodeEnv !== 'production'
        && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
}

module.exports = { isLocalDemoAllowed };
