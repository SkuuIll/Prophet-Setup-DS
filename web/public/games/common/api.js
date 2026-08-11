/**
 * ═══ CLIENTE WEBSOCKET & API — PROPHET GAMES ═══
 * Soporta:
 *  - Discord Activities (auth vía Embedded App SDK → sessionToken)
 *  - Browser normal (token query/session o demo)
 */

class ProphetGameClient {
    constructor() {
        this.ws = null;
        this.token = this.extractToken();
        this.listeners = new Map();
        this.isConnected = false;
        this.isAuthenticated = false;
        this.user = null;
        this._connectPromise = null;
        this._reconnectTimer = null;
        this._intentionalClose = false;
        this.pendingQueue = [];
        this.activityInfo = null;
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

    /**
     * Espera auth de Discord Activity si aplica, y actualiza this.token.
     */
    async ensureActivityAuth() {
        if (!window.prophetActivity) return null;
        try {
            const info = await window.prophetActivity.ready();
            this.activityInfo = info;
            if (info?.sessionToken) {
                this.token = info.sessionToken;
                sessionStorage.setItem('prophet_game_token', info.sessionToken);
            }
            // Guardar nombre de Discord para UI y reconexiones
            const uname = info?.user?.username
                || info?.user?.global_name
                || info?.auth?.user?.global_name
                || info?.auth?.user?.username;
            if (uname) {
                sessionStorage.setItem('prophet_display_name', uname);
            }
            if (info?.user?.avatar && info?.user?.id) {
                sessionStorage.setItem('prophet_avatar', String(info.user.avatar));
                sessionStorage.setItem('prophet_user_id', String(info.user.id));
            }
            return info;
        } catch (e) {
            console.warn('[ProphetClient] Activity auth error', e);
            return null;
        }
    }

    connect(timeoutMs = 12000) {
        if (this._connectPromise) return this._connectPromise;

        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isAuthenticated) {
            return Promise.resolve(this.user);
        }

        this._connectPromise = (async () => {
            // 1) Auth Activity primero (si estamos en Discord)
            await this.ensureActivityAuth();

            // 2) Abrir WebSocket
            return new Promise((resolve) => {
                let settled = false;
                const finish = (value) => {
                    if (settled) return;
                    settled = true;
                    this._connectPromise = null;
                    resolve(value);
                };

                const timer = setTimeout(() => {
                    console.warn('[ProphetClient] Timeout de conexión — modo local');
                    finish(this.user || this._demoUserFromActivity());
                }, timeoutMs);

                try {
                    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    const host = window.location.host;
                    // Discord proxy: mismo host del activity frame
                    const wsUrl = `${protocol}//${host}/ws`;

                    if (this.ws) {
                        try {
                            this.ws.onclose = null;
                            this.ws.close();
                        } catch (_) { /* ignore */ }
                    }

                    this.ws = new WebSocket(wsUrl);

                    this.ws.onopen = () => {
                        this.isConnected = true;
                        this.send({ type: 'auth', token: this.token });
                    };

                    this.ws.onmessage = (event) => {
                        try {
                            const data = JSON.parse(event.data);

                            if (data.type === 'auth_success') {
                                // Enriquecer con datos de Activity / storage
                                const storedName = sessionStorage.getItem('prophet_display_name');
                                if (this.activityInfo?.user) {
                                    data.username = this.activityInfo.user.username
                                        || this.activityInfo.user.global_name
                                        || data.username;
                                    data.discordUser = this.activityInfo.user;
                                    data.avatar = this.activityInfo.user.avatar || data.avatar;
                                }
                                if (storedName && (!data.username || /^Jugador_/.test(data.username) || data.username === data.userId)) {
                                    data.username = storedName;
                                }
                                if (this.activityInfo?.balance != null && (data.balance == null || data.demo)) {
                                    data.balance = this.activityInfo.balance;
                                }
                                if (data.username) {
                                    sessionStorage.setItem('prophet_display_name', data.username);
                                }
                                this.user = data;
                                this.isAuthenticated = true;
                                // Pintar nav en cualquier juego
                                try {
                                    if (window.ProphetProfile) ProphetProfile.applyUserToNav(data);
                                } catch (_) { /* ignore */ }
                                clearTimeout(timer);
                                this.emit('authenticated', data);
                                this._flushQueue();
                                finish(data);
                            } else if (data.type === 'auth_error') {
                                if (this.token !== 'demo_token' && !this.activityInfo?.sessionToken) {
                                    console.warn('[ProphetClient] Token inválido, usando demo_token');
                                    this.token = 'demo_token';
                                    sessionStorage.setItem('prophet_game_token', 'demo_token');
                                    this.send({ type: 'auth', token: 'demo_token' });
                                    return;
                                }
                                this.isAuthenticated = false;
                                clearTimeout(timer);
                                this.emit('auth_error', data);
                                finish(this._demoUserFromActivity());
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
                        this.isAuthenticated = false;
                        this.emit('disconnected');
                        if (!settled) {
                            clearTimeout(timer);
                            finish(this.user || this._demoUserFromActivity());
                        }
                        if (!this._intentionalClose) {
                            clearTimeout(this._reconnectTimer);
                            this._reconnectTimer = setTimeout(() => {
                                this._connectPromise = null;
                                this.connect().then((auth) => {
                                    if (auth) this.emit('reconnected', auth);
                                });
                            }, 3000);
                        }
                    };
                } catch (e) {
                    console.error('No se pudo abrir WebSocket:', e);
                    clearTimeout(timer);
                    finish(this._demoUserFromActivity());
                }
            });
        })();

        return this._connectPromise;
    }

    _demoUserFromActivity() {
        if (this.activityInfo?.user) {
            return {
                userId: this.activityInfo.user.id,
                username: this.activityInfo.user.username,
                balance: this.activityInfo.balance || 0,
                level: this.activityInfo.level || 1,
                demo: !this.activityInfo.sessionToken
            };
        }
        return null;
    }

    _flushQueue() {
        while (this.pendingQueue.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
            const msg = this.pendingQueue.shift();
            this.ws.send(JSON.stringify(msg));
        }
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else if (data && data.type && data.type !== 'auth') {
            this.pendingQueue.push(data);
            if (this.pendingQueue.length > 50) this.pendingQueue.shift();
        }
    }

    on(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(callback);
    }

    off(type, callback) {
        const cbs = this.listeners.get(type);
        if (!cbs) return;
        const i = cbs.indexOf(callback);
        if (i >= 0) cbs.splice(i, 1);
    }

    emit(type, data) {
        const cbs = this.listeners.get(type) || [];
        cbs.forEach(cb => {
            try { cb(data); } catch (e) { console.error(e); }
        });
    }
}

window.prophetClient = new ProphetGameClient();
