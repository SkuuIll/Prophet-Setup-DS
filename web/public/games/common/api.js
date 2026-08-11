/**
 * ═══ CLIENTE WEBSOCKET & API — PROPHET GAMES ═══
 * Auth prioritaria:
 *  1) Discord Activity → sessionToken real (userId de Discord)
 *  2) token en query/sessionStorage
 *  3) demo_token SOLO fuera de Discord / fallback final
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
        this._authAttempts = 0;
    }

    extractToken() {
        const params = new URLSearchParams(window.location.search);
        let token = params.get('token');
        if (token && token !== 'demo_token') {
            sessionStorage.setItem('prophet_game_token', token);
            return token;
        }
        const stored = sessionStorage.getItem('prophet_game_token');
        // No devolver demo_token pegoteado de sesiones viejas si hay pistas de Discord
        if (stored && stored !== 'demo_token') return stored;
        if (stored === 'demo_token') {
            const hasDiscordHint = sessionStorage.getItem('prophet_user_id')
                || sessionStorage.getItem('prophet_display_name');
            // En Activity limpiaremos después de OAuth
            if (!hasDiscordHint) return 'demo_token';
            return null;
        }
        return null;
    }

    _isDiscordContext() {
        try {
            if (/\.discordsays\.com$/i.test(window.location.hostname || '')) return true;
            if (window.prophetActivity?.isDiscordFrame) return true;
            if (window.prophetActivity?.hasEmbedParams?.()) return true;
            const p = new URLSearchParams(window.location.search);
            if (p.get('frame_id') && p.get('instance_id')) return true;
        } catch (_) { /* ignore */ }
        return false;
    }

    _apiPaths(path) {
        const p = path.startsWith('/') ? path : `/${path}`;
        const onDiscord = this._isDiscordContext()
            || /\.discordsays\.com$/i.test(window.location.hostname || '');
        // En Activity SIEMPRE preferir /.proxy (si no, el POST no llega al backend)
        return onDiscord ? [`/.proxy${p}`, p] : [p, `/.proxy${p}`];
    }

    async _mintSessionFromAccess(accessToken) {
        if (!accessToken) return null;
        for (const p of this._apiPaths('/api/games/session-from-access')) {
            try {
                console.log('[ProphetClient] mint session', p);
                const res = await fetch(p, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ access_token: accessToken }),
                    cache: 'no-store'
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.sessionToken) {
                    console.log('[ProphetClient] mint OK', data.user?.username || data.user?.id);
                    return data;
                }
                console.warn('[ProphetClient] mint fail', p, res.status, data.error);
            } catch (e) {
                console.warn('[ProphetClient] mint err', p, e.message || e);
            }
        }
        return null;
    }

    /**
     * Espera auth de Discord Activity si aplica, y actualiza this.token.
     */
    async ensureActivityAuth() {
        if (!window.prophetActivity) {
            // Módulo aún no cargó: esperar un poco
            const t0 = Date.now();
            while (!window.prophetActivity && Date.now() - t0 < 4000) {
                await new Promise(r => setTimeout(r, 50));
            }
        }
        if (!window.prophetActivity) return null;

        try {
            const info = await window.prophetActivity.ready();
            this.activityInfo = info;

            // Si Activity dio access_token pero no sessionToken → mint
            if (info?.access_token && !info?.sessionToken) {
                const minted = await this._mintSessionFromAccess(info.access_token);
                if (minted?.sessionToken) {
                    info.sessionToken = minted.sessionToken;
                    info.user = minted.user || info.user;
                    info.balance = minted.balance ?? info.balance;
                    info.level = minted.level ?? info.level;
                    this.activityInfo = info;
                }
            }

            if (info?.sessionToken) {
                this.token = info.sessionToken;
                sessionStorage.setItem('prophet_game_token', info.sessionToken);
            }

            const uname = info?.user?.username
                || info?.user?.global_name
                || info?.auth?.user?.global_name
                || info?.auth?.user?.username;
            if (uname) {
                sessionStorage.setItem('prophet_display_name', uname);
            }
            if (info?.user?.id) {
                sessionStorage.setItem('prophet_user_id', String(info.user.id));
            }
            if (info?.user?.avatar) {
                sessionStorage.setItem('prophet_avatar', String(info.user.avatar));
            }
            return info;
        } catch (e) {
            console.warn('[ProphetClient] Activity auth error', e);
            return null;
        }
    }

    _displayNameHint() {
        return sessionStorage.getItem('prophet_display_name')
            || this.activityInfo?.user?.username
            || this.activityInfo?.user?.global_name
            || null;
    }

    _avatarHint() {
        return sessionStorage.getItem('prophet_avatar')
            || this.activityInfo?.user?.avatar
            || null;
    }

    connect(timeoutMs = 15000) {
        if (this._connectPromise) return this._connectPromise;

        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isAuthenticated && this.user && !this.user.demo) {
            return Promise.resolve(this.user);
        }

        this._connectPromise = (async () => {
            // 1) Auth Activity primero (si estamos en Discord)
            await this.ensureActivityAuth();

            // 2) Token final
            if (!this.token || this.token === 'demo_token') {
                const stored = sessionStorage.getItem('prophet_game_token');
                if (stored && stored !== 'demo_token') this.token = stored;
            }
            // Solo demo si NO hay sesión real y (no Discord o Activity falló)
            if (!this.token || this.token === 'demo_token') {
                if (this._isDiscordContext() && this.activityInfo?.sessionToken) {
                    this.token = this.activityInfo.sessionToken;
                } else if (!this._isDiscordContext()) {
                    this.token = 'demo_token';
                } else if (this.activityInfo?.access_token) {
                    const minted = await this._mintSessionFromAccess(this.activityInfo.access_token);
                    if (minted?.sessionToken) {
                        this.token = minted.sessionToken;
                        sessionStorage.setItem('prophet_game_token', minted.sessionToken);
                        if (minted.user) {
                            this.activityInfo.user = minted.user;
                            this.activityInfo.sessionToken = minted.sessionToken;
                        }
                    } else {
                        this.token = 'demo_token';
                    }
                } else {
                    // Activity falló: demo con nombre si lo tenemos
                    this.token = 'demo_token';
                }
            }

            // 3) Abrir WebSocket
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
                    // En discordsays el WS debe ir por /.proxy/ws
                    const onDiscordSays = /\.discordsays\.com$/i.test(window.location.hostname || '');
                    const wsPath = onDiscordSays ? '/.proxy/ws' : '/ws';
                    const wsUrl = `${protocol}//${host}${wsPath}`;
                    console.log('[ProphetClient] WS connect', wsUrl, 'token?', Boolean(this.token && this.token !== 'demo_token'));

                    if (this.ws) {
                        try {
                            this.ws.onclose = null;
                            this.ws.close();
                        } catch (_) { /* ignore */ }
                    }

                    this.ws = new WebSocket(wsUrl);

                    this.ws.onopen = () => {
                        this.isConnected = true;
                        this._sendAuth();
                    };

                    this.ws.onmessage = async (event) => {
                        try {
                            const data = JSON.parse(event.data);

                            if (data.type === 'auth_success') {
                                // Si el server mandó demo pero tenemos Activity real → reintentar mint
                                if (data.demo && this._authAttempts < 2) {
                                    const access = this.activityInfo?.access_token;
                                    if (access) {
                                        this._authAttempts++;
                                        const minted = await this._mintSessionFromAccess(access);
                                        if (minted?.sessionToken) {
                                            this.token = minted.sessionToken;
                                            sessionStorage.setItem('prophet_game_token', minted.sessionToken);
                                            this._sendAuth();
                                            return;
                                        }
                                    }
                                }

                                // Enriquecer con Discord
                                const storedName = sessionStorage.getItem('prophet_display_name');
                                if (this.activityInfo?.user) {
                                    data.username = this.activityInfo.user.username
                                        || this.activityInfo.user.global_name
                                        || data.username;
                                    data.discordUser = this.activityInfo.user;
                                    data.avatar = this.activityInfo.user.avatar || data.avatar;
                                    if (!data.demo && this.activityInfo.user.id) {
                                        data.userId = data.userId || this.activityInfo.user.id;
                                    }
                                }
                                if (storedName && (
                                    !data.username
                                    || data.username === 'Demo'
                                    || /^Jugador_/.test(data.username)
                                    || data.username === data.userId
                                )) {
                                    data.username = storedName;
                                }
                                if (this.activityInfo?.balance != null && (data.balance == null || data.demo)) {
                                    data.balance = this.activityInfo.balance;
                                }
                                if (data.username && data.username !== 'Demo') {
                                    sessionStorage.setItem('prophet_display_name', data.username);
                                }
                                if (data.userId && data.userId !== 'demo_user') {
                                    sessionStorage.setItem('prophet_user_id', String(data.userId));
                                }

                                this.user = data;
                                this.isAuthenticated = true;
                                try {
                                    if (window.ProphetProfile) ProphetProfile.applyUserToNav(data);
                                } catch (_) { /* ignore */ }
                                clearTimeout(timer);
                                this.emit('authenticated', data);
                                this._flushQueue();
                                finish(data);
                            } else if (data.type === 'auth_error') {
                                // Token inválido: intentar mint desde access_token de Activity
                                if (this._authAttempts < 2 && this.activityInfo?.access_token) {
                                    this._authAttempts++;
                                    const minted = await this._mintSessionFromAccess(this.activityInfo.access_token);
                                    if (minted?.sessionToken) {
                                        this.token = minted.sessionToken;
                                        sessionStorage.setItem('prophet_game_token', minted.sessionToken);
                                        this._sendAuth();
                                        return;
                                    }
                                }
                                // Último recurso: demo (solo si no hay otra opción)
                                if (this.token !== 'demo_token') {
                                    console.warn('[ProphetClient] Token inválido, fallback demo');
                                    this.token = 'demo_token';
                                    this._sendAuth();
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
                                this._authAttempts = 0;
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

    _sendAuth() {
        const payload = {
            type: 'auth',
            token: this.token || 'demo_token'
        };
        const name = this._displayNameHint();
        const avatar = this._avatarHint();
        if (name) payload.username = name;
        if (avatar) payload.avatar = avatar;
        this.send(payload);
    }

    _demoUserFromActivity() {
        if (this.activityInfo?.user) {
            return {
                userId: this.activityInfo.user.id || 'demo_user',
                username: this.activityInfo.user.username || 'Demo',
                balance: this.activityInfo.balance || 0,
                level: this.activityInfo.level || 1,
                demo: !this.activityInfo.sessionToken,
                avatar: this.activityInfo.user.avatar || null
            };
        }
        const name = sessionStorage.getItem('prophet_display_name');
        const id = sessionStorage.getItem('prophet_user_id');
        if (name || id) {
            return {
                userId: id || 'demo_user',
                username: name || 'Demo',
                balance: 0,
                level: 1,
                demo: true
            };
        }
        return {
            userId: 'demo_user',
            username: 'Demo',
            balance: 10000,
            level: 1,
            demo: true
        };
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
