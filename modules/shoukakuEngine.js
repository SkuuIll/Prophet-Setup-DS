const { Shoukaku, Connectors } = require('shoukaku');
const config = require('../config');
const { stmts } = require('../database');

const Nodes = [{
    name: 'Prophet Node',
    url: config.LAVALINK.URL,
    auth: config.LAVALINK.PASSWORD,
    secure: config.LAVALINK.SECURE,
}];

const ShoukakuOptions = {
    resume: true,
    resumeTimeout: 30,
    resumeByLibrary: true,
    reconnectTries: 10,
    reconnectInterval: 5000,
    restTimeout: 15000,
    moveOnDisconnect: true,
};

function crearShoukaku(client) {
    try {
        const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes, ShoukakuOptions);

        shoukaku.on('error', (name, error) => {
            stmts.incrementAnalyticsMetric('error_events', 'lavalink', 1);
            stmts.setHealthCheck(`lavalink:${name}`, {
                status: 'error',
                details: { message: error.message || String(error) }
            });
            console.error(`[Shoukaku] Error del Nodo '${name}':`, error);
        });

        shoukaku.on('ready', (name) => {
            stmts.setHealthCheck(`lavalink:${name}`, {
                status: 'ok',
                details: { url: config.LAVALINK.URL }
            });
            console.log(`🎵 [Shoukaku] Nodo Lavalink '${name}' listo y conectado!`);
        });

        shoukaku.on('close', (name, code, reason) => {
            stmts.setHealthCheck(`lavalink:${name}`, {
                status: 'warn',
                details: { code, reason: reason || 'desconocida' }
            });
            console.warn(`[Shoukaku] Nodo '${name}' cerrado - Código: ${code}, Razón: ${reason || 'desconocida'}`);
        });

        shoukaku.on('disconnect', (name, count) => {
            stmts.setHealthCheck(`lavalink:${name}`, {
                status: 'warn',
                details: { reconnectAttempts: count }
            });
            console.warn(`[Shoukaku] Nodo '${name}' desconectado. Intentos: ${count}`);
        });

        client.shoukaku = shoukaku;
        console.log('✅ Shoukaku creado y enlazado al cliente (esperando login para conectar al nodo)');
        return shoukaku;
    } catch (err) {
        stmts.incrementAnalyticsMetric('error_events', 'lavalink', 1);
        stmts.setHealthCheck('lavalink:bootstrap', {
            status: 'error',
            details: { message: err.message }
        });
        console.warn('⚠️ No se pudo crear Shoukaku. Error:', err.message);
        client.shoukaku = null;
        return null;
    }
}

module.exports = { crearShoukaku };
