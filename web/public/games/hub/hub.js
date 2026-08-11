/**
 * Prophet Games Hub — UI + auth
 */
(function () {
    function setName(name) {
        const el = document.getElementById('user-name');
        const greet = document.getElementById('hero-greeting');
        const clean = (name && name !== 'Demo' && name !== 'demo_user')
            ? name
            : null;
        if (el && clean) el.textContent = clean;
        if (greet) {
            greet.textContent = clean ? `Hola, ${clean}` : 'Conectando…';
        }
        return clean;
    }

    function setBalance(n) {
        const el = document.getElementById('user-balance');
        if (!el) return;
        const val = (typeof formatNumber === 'function')
            ? formatNumber(n ?? 0)
            : String(n ?? 0);
        el.textContent = val;
    }

    function setAvatar(auth) {
        const img = document.getElementById('user-avatar');
        if (!img || !window.ProphetProfile) return;
        const url = ProphetProfile.avatarUrlFromAuth(auth);
        if (url) {
            img.src = url;
            img.hidden = false;
            img.alt = auth?.username || '';
        }
    }

    function setStatus(text, online) {
        const el = document.getElementById('conn-status');
        if (!el) return;
        el.textContent = text;
        el.classList.toggle('online', !!online);
        el.classList.toggle('offline', !online);
    }

    function wireTiles() {
        document.querySelectorAll('.g-tile[data-href], .g-tile[href]').forEach((tile) => {
            tile.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.SoundFX) SoundFX.playClick();
                const href = tile.getAttribute('data-href') || tile.getAttribute('href');
                if (typeof window.prophetNavigate === 'function') {
                    window.prophetNavigate(href);
                } else {
                    location.href = href;
                }
            });
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        if (typeof window.__hideActivityBoot === 'function') {
            window.__hideActivityBoot('Autenticando…');
        }

        wireTiles();

        // Prefill desde storage (Activity) — nunca "Demo" a propósito
        const cached = sessionStorage.getItem('prophet_display_name');
        if (cached && cached !== 'Demo') setName(cached);
        else setName(null);

        try {
            // 1) Activity SDK primero
            if (window.prophetActivity?.ready) {
                try {
                    const act = await Promise.race([
                        window.prophetActivity.ready(),
                        new Promise((r) => setTimeout(() => r({ mode: 'timeout' }), 14000))
                    ]);
                    if (act?.user?.username) {
                        setName(act.user.username);
                        setAvatar({
                            userId: act.user.id,
                            username: act.user.username,
                            avatar: act.user.avatar,
                            discordUser: act.user
                        });
                    }
                    if (act?.error) {
                        console.warn('[Hub] Activity error:', act.error);
                        setStatus('Auth falló', false);
                    }
                } catch (e) {
                    console.warn('[Hub] Activity ready fail', e);
                }
            }

            // 2) WebSocket + sesión de juego
            const auth = await window.prophetClient.connect();
            if (auth) {
                const isDemo = auth.demo === true || auth.userId === 'demo_user';
                const name = (window.ProphetProfile && ProphetProfile.displayNameFromAuth(auth))
                    || auth.username
                    || sessionStorage.getItem('prophet_display_name')
                    || null;

                if (name && name !== 'Demo') setName(name);
                else if (isDemo) {
                    // No gritar "Demo": mostrar invitado
                    const el = document.getElementById('user-name');
                    if (el) el.textContent = 'Invitado';
                    const greet = document.getElementById('hero-greeting');
                    if (greet) greet.textContent = 'Modo invitado';
                }

                setBalance(auth.balance || 0);
                setAvatar(auth);
                try {
                    if (window.ProphetProfile) ProphetProfile.applyUserToNav(auth);
                } catch (_) { /* ignore */ }

                const lvl = document.getElementById('user-level');
                if (lvl) lvl.textContent = `Nvl ${auth.level || 1}`;

                if (isDemo) {
                    setStatus('Invitado', false);
                } else {
                    setStatus('En línea', true);
                }
            } else {
                setBalance(0);
                setStatus('Offline', false);
            }
        } catch (e) {
            console.warn('[Hub] connect error', e);
            setStatus('Offline', false);
        } finally {
            if (typeof window.__hideActivityBoot === 'function') {
                window.__hideActivityBoot();
            }
        }
    });
})();
