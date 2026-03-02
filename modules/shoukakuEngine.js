const { Shoukaku, Connectors } = require('shoukaku');

module.exports = async function inicializarShoukaku(client) {
    const Nodes = [{
        name: 'Prophet Node',
        url: 'localhost:2333',     // Por defecto, asumiendo lavalink local
        auth: 'youshallnotpass',   // Contraseña base de lavalink
        secure: false
    }];

    // Opciones de configuración
    const options = {
        resume: true,
        resumeTimeout: 30,
        resumeByLibrary: true,
        reconnectTries: 5,
        reconnectInterval: 5000,
        restTimeout: 15000,
        moveOnDisconnect: true
    };

    try {
        client.shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes, options);

        client.shoukaku.on('error', (_, error) => console.error(`[Shoukaku] Error del Nodo: ${error}`));
        client.shoukaku.on('ready', (name) => console.log(`🎵 [Shoukaku] Nodo Lavalink '${name}' listo y conectado!`));
        client.shoukaku.on('close', (name, code, reason) => console.log(`[Shoukaku] Nodo ${name} cerrado - Código: ${code}, Razón: ${reason}`));
        client.shoukaku.on('disconnect', (name, count) => console.log(`[Shoukaku] Nodo ${name} desconectado. Intentos: ${count}`));

        console.log('✅ Shoukaku wrapper inicializado para soporte futuro de Lavalink');
    } catch (err) {
        console.warn('⚠️ No se pudo inicializar Shoukaku. ¿Lavalink activo? Error: ', err.message);
    }
};
