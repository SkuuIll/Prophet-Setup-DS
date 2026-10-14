// Evita que un token de demostración dé acceso a juegos/economía reales.
// Solo se habilita expresamente durante desarrollo en loopback.
function isLocalDemoAllowed({ enabled, nodeEnv, address }) {
    return enabled === 'true'
        && nodeEnv !== 'production'
        && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
}

// Control por conexión; un cliente no puede consumir CPU ilimitadamente con mensajes JSON.
const MESSAGE_WINDOW_MS = 10_000;
const MAX_MESSAGES_PER_WINDOW = 300;
function consumeMessageBudget(budget, now = Date.now()) {
    if (!Number.isFinite(budget.startedAt) || now - budget.startedAt >= MESSAGE_WINDOW_MS || now < budget.startedAt) {
        budget.startedAt = now;
        budget.count = 0;
    }
    budget.count += 1;
    return budget.count <= MAX_MESSAGES_PER_WINDOW;
}

module.exports = { isLocalDemoAllowed, consumeMessageBudget, MESSAGE_WINDOW_MS, MAX_MESSAGES_PER_WINDOW };
