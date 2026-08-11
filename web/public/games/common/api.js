/**
 * ═══ CLIENTE WEBSOCKET & API — PROPHET GAMES ═══
 */

class ProphetGameClient {
    constructor() {
        this.ws = null;
        this.token = this.extractToken();
        this.listeners = new Map();
        this.isConnected = false;
        this.user = null;
    }

    extractToken() {
        const params = new URLSearchParams(window.location.search);
        let token = params.get('token');
        if (token) {
            sessionStorage.setItem('prophet_game_token', token);
            return token;
        }
        return sessionStorage.getItem('prophet_game_token') || 'demo_token';
    }

    connect() {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}/ws`;

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.isConnected = true;
                // Enviar handshake de autenticación
                this.send({ type: 'auth', token: this.token });
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'auth_success') {
                        this.user = data;
                        this.emit('authenticated', data);
                        resolve(data);
                    } else if (data.type === 'auth_error') {
                        this.emit('auth_error', data);
                        // En demo mode continuamos
                        resolve(null);
                    }
                    this.emit(data.type, data);
                } catch (e) {
                    console.error('Error parseando mensaje WS:', e);
                }
            };

            this.ws.onerror = (err) => {
                console.warn('WebSocket error:', err);
                this.emit('error', err);
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this.emit('disconnected');
                // Auto reconexión en 3 segundos
                setTimeout(() => this.connect(), 3000);
            };
        });
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    on(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(callback);
    }

    emit(type, data) {
        const cbs = this.listeners.get(type) || [];
        cbs.forEach(cb => cb(data));
    }
}

window.prophetClient = new ProphetGameClient();
