const { Shoukaku, Connectors } = require('shoukaku');

const Nodes = [{
    name: 'Prophet Node',
    url: 'localhost:2333',
    auth: 'youshallnotpass',
    secure: false
}];

const ShoukakuOptions = {
    resume: true,
    resumeTimeout: 30,
    resumeByLibrary: true,
    reconnectTries: 10,
    reconnectInterval: 5000,
    restTimeout: 15000,
    moveOnDisconnect: true
};

function crearShoukaku(client) {
    try {
        const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes, ShoukakuOptions);

        shoukaku.on('error', (name, error) => {
            console.error(`[Shoukaku] Error del Nodo '${name}':`, error);
        });

        shoukaku.on('ready', (name) => {
            console.log(`🎵 [Shoukaku] Nodo Lavalink '${name}' listo y conectado!`);
        });

        shoukaku.on('close', (name, code, reason) => {
            console.warn(`[Shoukaku] Nodo '${name}' cerrado - Código: ${code}, Razón: ${reason || 'desconocida'}`);
        });

        shoukaku.on('disconnect', (name, count) => {
            console.warn(`[Shoukaku] Nodo '${name}' desconectado. Intentos: ${count}`);
        });

        client.shoukaku = shoukaku;
        console.log('✅ Shoukaku creado y enlazado al cliente (esperando login para conectar al nodo)');
        return shoukaku;
    } catch (err) {
        console.warn('⚠️ No se pudo crear Shoukaku. Error:', err.message);
        client.shoukaku = null;
        return null;
    }
}

module.exports = { crearShoukaku };
