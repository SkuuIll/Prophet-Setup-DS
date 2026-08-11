/**
 * ═══ Discord Activities bootstrap — Prophet Games ═══
 *
 * Discord inyecta en el iframe:
 *   ?frame_id=&instance_id=&platform=desktop&guild_id=&channel_id=
 *
 * Al navegar entre juegos (ej. / → /tycoon/) esos query params se perdían.
 * Ahora se guardan en sessionStorage y se reinyectan en la URL antes del SDK.
 */

import { DiscordSDK } from '/games/vendor/embedded-app-sdk/index.mjs?v=20260811h';

const FALLBACK_CLIENT_ID = '1472399458179354808';
const STORAGE_KEY = 'prophet_discord_embed_params';

/** Params que el SDK exige + extras útiles */
const EMBED_KEYS = [
    'frame_id',
    'instance_id',
    'platform',
    'guild_id',
    'channel_id',
    'location_id',
    'mobile_app_version',
    'custom_id',
    'referrer_id'
];

function readParamsFromSearch(search) {
    const p = new URLSearchParams(search || '');
    const out = {};
    for (const k of EMBED_KEYS) {
        const v = p.get(k);
        if (v) out[k] = v;
    }
    return out;
}

function hasRequired(params) {
    return Boolean(params.frame_id && params.instance_id && params.platform);
}

function loadStoredParams() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const obj = JSON.parse(raw);
        return obj && typeof obj === 'object' ? obj : {};
    } catch {
        return {};
    }
}

function saveParams(params) {
    if (!hasRequired(params)) return;
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(params));
    } catch (_) { /* ignore */ }
}

/**
 * Fusiona URL actual + sessionStorage.
 * Si la URL no tiene params pero sí el storage, reescribe la URL (replaceState)
 * para que DiscordSDK pueda leer window.location.search.
 */
function ensureEmbedParamsInUrl() {
    const fromUrl = readParamsFromSearch(window.location.search);
    const fromStore = loadStoredParams();

    // Preferir URL (más fresca); completar con storage
    const merged = { ...fromStore, ...fromUrl };

    if (hasRequired(fromUrl)) {
        saveParams(merged);
        return merged;
    }

    if (hasRequired(merged)) {
        saveParams(merged);
        // Reinyectar en la URL sin recargar
        try {
            const url = new URL(window.location.href);
            for (const [k, v] of Object.entries(merged)) {
                if (v) url.searchParams.set(k, v);
            }
            window.history.replaceState({}, '', url.toString());
            console.log('[Activity] Reinyectados params de Discord en la URL', url.search);
        } catch (e) {
            console.warn('[Activity] No se pudo replaceState', e);
        }
        return merged;
    }

    return merged;
}

function isDiscordsays() {
    return /\.discordsays\.com$/i.test(window.location.hostname || '');
}

/**
 * En discordsays.com TODAS las llamadas al backend deben ir por /.proxy/
 * (si no, Discord no reenvía al origin mapeado y el auth cae en Demo).
 */
function apiPaths(path) {
    const p = path.startsWith('/') ? path : `/${path}`;
    if (isDiscordsays()) {
        return [`/.proxy${p}`, p];
    }
    return [p, `/.proxy${p}`];
}

/**
 * Navegación entre juegos conservando frame_id y compañía.
 */
function navigatePreserveEmbed(path) {
    const params = { ...loadStoredParams(), ...readParamsFromSearch(window.location.search) };
    let target = path || '/';
    // Normalizar rutas de juegos
    if (target.startsWith('../')) {
        // ../tycoon/ → /tycoon/ o /games/tycoon/
        target = '/' + target.replace(/^\.\.\//, '');
    }
    if (target.startsWith('./')) target = target.slice(1);
    if (!target.startsWith('/')) target = '/' + target;

    // Preferir /games/<name>/ si es un juego conocido sin prefijo
    const bare = target.replace(/^\/games\//, '/').replace(/\/$/, '');
    const known = ['tycoon', 'casino', 'trivia', 'cards', 'survivor', 'hub'];
    const name = bare.replace(/^\//, '').split('/')[0];
    if (known.includes(name) && !target.startsWith('/games/')) {
        target = `/games/${name}/`;
    }

    try {
        const url = new URL(target, window.location.origin);
        if (hasRequired(params)) {
            for (const [k, v] of Object.entries(params)) {
                if (v) url.searchParams.set(k, v);
            }
        }
        window.location.href = url.pathname + url.search + url.hash;
    } catch {
        window.location.href = target;
    }
}

// Exponer para hub y otros juegos
window.prophetNavigate = navigatePreserveEmbed;

let discordSdk = null;
let activityAuth = null;
let readyPromise = null;

function showError(title, detail) {
    try {
        let el = document.getElementById('prophet-activity-error');
        if (!el) {
            el = document.createElement('div');
            el.id = 'prophet-activity-error';
            Object.assign(el.style, {
                position: 'fixed', inset: '0', zIndex: '99999',
                background: 'rgba(7,5,15,0.97)', color: '#fff',
                fontFamily: 'system-ui,sans-serif', display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '24px', textAlign: 'center', gap: '12px'
            });
            document.body.appendChild(el);
        }
        el.innerHTML = `
          <div style="font-size:2rem">⚠️</div>
          <h2 style="margin:0;font-size:1.25rem">${title}</h2>
          <pre style="max-width:640px;white-space:pre-wrap;color:#c4b5fd;font-size:.82rem;background:#120c20;padding:14px;border-radius:12px;border:1px solid rgba(179,136,255,.35);text-align:left">${detail}</pre>
          <button id="prophet-activity-retry" style="margin-top:8px;padding:10px 18px;border:none;border-radius:10px;background:#b388ff;color:#0a0612;font-weight:800;cursor:pointer">
            Volver al Hub
          </button>
        `;
        const btn = document.getElementById('prophet-activity-retry');
        if (btn) {
            btn.onclick = () => navigatePreserveEmbed('/games/hub/');
        }
        if (typeof window.__hideActivityBoot === 'function') window.__hideActivityBoot('Error');
    } catch (_) { /* ignore */ }
}

async function fetchConfig() {
    for (const p of apiPaths('/api/games/config')) {
        try {
            const res = await fetch(p, { cache: 'no-store' });
            if (res.ok) return await res.json();
            console.warn('[Activity] config fail', p, res.status);
        } catch (e) {
            console.warn('[Activity] config err', p, e.message || e);
        }
    }
    return null;
}

async function postJson(pathOrPaths, body) {
    const paths = Array.isArray(pathOrPaths)
        ? pathOrPaths
        : apiPaths(pathOrPaths);
    let last = null;
    for (const p of paths) {
        try {
            console.log('[Activity] POST', p);
            const res = await fetch(p, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                cache: 'no-store'
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                console.log('[Activity] POST OK', p, {
                    hasAccess: Boolean(data.access_token),
                    hasSession: Boolean(data.sessionToken),
                    user: data.user?.username || data.user?.id
                });
                return data;
            }
            last = data.error || `${res.status} ${p}`;
            console.warn('[Activity] POST fail', p, last);
        } catch (e) {
            last = e.message || String(e);
            console.warn('[Activity] POST err', p, last);
        }
    }
    throw new Error(last || 'POST failed');
}

async function setupActivity() {
    // Siempre intentar recuperar params (URL o storage)
    let merged = ensureEmbedParamsInUrl();

    console.log('[Activity] boot', {
        href: window.location.href,
        host: window.location.hostname,
        params: merged,
        hasRequired: hasRequired(merged)
    });

    // Browser normal sin params y sin storage → modo web
    if (!isDiscordsays() && !hasRequired(merged)) {
        return { mode: 'web' };
    }

    // En discordsays: si aún no hay params, esperar un poco (primer load)
    if (!hasRequired(merged)) {
        const t0 = Date.now();
        while (Date.now() - t0 < 2000) {
            await new Promise(r => setTimeout(r, 50));
            merged = ensureEmbedParamsInUrl();
            if (hasRequired(merged)) break;
        }
    }

    if (!hasRequired(merged)) {
        // Último recurso: si estamos en discordsays pero Discord no mandó params
        // (raro en el primer load; normal si navegaste y se borró storage)
        showError(
            'Falta frame_id de Discord',
            'URL actual:\n' + window.location.href +
            '\n\nhost: ' + window.location.hostname +
            '\nframe_id: ' + (merged.frame_id || '(vacío)') +
            '\ninstance_id: ' + (merged.instance_id || '(vacío)') +
            '\nplatform: ' + (merged.platform || '(vacío)') +
            '\n\nSi acabás de entrar a un juego desde el hub, volvé a lanzar la Activity\n' +
            'desde el canal de voz (los params se guardan al inicio).'
        );
        return { mode: 'activity', error: 'frame_id query param is not defined' };
    }

    // Asegurar URL tiene params antes del constructor
    merged = ensureEmbedParamsInUrl();
    if (!hasRequired(readParamsFromSearch(window.location.search))) {
        showError(
            'No se pudieron reinyectar los params',
            'Storage OK pero location.search vacío.\n' + window.location.href
        );
        return { mode: 'activity', error: 'could not restore frame_id to URL' };
    }

    try {
        const config = await fetchConfig();
        const clientId = (config && config.clientId) || FALLBACK_CLIENT_ID;

        if (typeof window.__hideActivityBoot === 'function') {
            window.__hideActivityBoot('Conectando SDK…');
        }

        discordSdk = new DiscordSDK(String(clientId));
        await discordSdk.ready();
        console.log('[Activity] SDK ready', {
            channelId: discordSdk.channelId,
            guildId: discordSdk.guildId,
            instanceId: discordSdk.instanceId
        });

        // Guardar de nuevo por si acaso
        saveParams(readParamsFromSearch(window.location.search));

        if (typeof window.__hideActivityBoot === 'function') {
            window.__hideActivityBoot('Autorizando…');
        }

        // Solo identify es suficiente para nombre/avatar (menos fricción OAuth)
        const scopes = ['identify', 'guilds', 'applications.commands'];
        let code = null;
        try {
            const authRes = await discordSdk.commands.authorize({
                client_id: String(clientId),
                response_type: 'code',
                state: '',
                prompt: 'none',
                scope: scopes
            });
            code = authRes?.code;
        } catch (e1) {
            console.warn('[Activity] authorize prompt=none falló, reintento…', e1);
            const authRes = await discordSdk.commands.authorize({
                client_id: String(clientId),
                response_type: 'code',
                state: '',
                prompt: 'consent',
                scope: ['identify']
            });
            code = authRes?.code;
        }
        if (!code) throw new Error('Discord no devolvió OAuth code');

        // Un solo intercambio de code (codes son one-shot). Preferir /.proxy en Activity.
        let authPayload = null;
        let lastErr = null;
        try {
            authPayload = await postJson('/api/games/activity-auth', { code });
        } catch (e) {
            lastErr = e;
            try {
                authPayload = await postJson('/api/token', { code });
            } catch (e2) {
                lastErr = e2;
                authPayload = null;
            }
        }

        if (!authPayload || !authPayload.access_token) {
            throw new Error(
                (authPayload && authPayload.error)
                || (lastErr && lastErr.message)
                || 'Sin access_token de Discord (OAuth falló)'
            );
        }

        activityAuth = await discordSdk.commands.authenticate({
            access_token: authPayload.access_token
        });
        if (!activityAuth) throw new Error('authenticate() falló');

        // Si el backend no mandó sessionToken, mint con access_token
        if (!authPayload.sessionToken && authPayload.access_token) {
            try {
                const minted = await postJson('/api/games/session-from-access', {
                    access_token: authPayload.access_token
                });
                if (minted?.sessionToken) {
                    authPayload.sessionToken = minted.sessionToken;
                    authPayload.user = minted.user || authPayload.user;
                    authPayload.balance = minted.balance ?? authPayload.balance;
                    authPayload.level = minted.level ?? authPayload.level;
                }
            } catch (e) {
                console.warn('[Activity] No se pudo mint sessionToken', e);
            }
        }

        if (authPayload.sessionToken) {
            sessionStorage.setItem('prophet_game_token', authPayload.sessionToken);
        } else {
            sessionStorage.removeItem('prophet_game_token');
        }

        // Nombre visible: global_name (display) > username del SDK / backend
        const sdkUser = activityAuth.user || {};
        const displayName = (authPayload.user && authPayload.user.username)
            || sdkUser.global_name
            || sdkUser.username
            || 'User';
        const userId = (authPayload.user && authPayload.user.id) || sdkUser.id;
        const avatar = (authPayload.user && authPayload.user.avatar) || sdkUser.avatar || null;

        if (!userId) {
            throw new Error('Discord no devolvió user.id — no se puede crear sesión');
        }

        sessionStorage.setItem('prophet_display_name', displayName);
        sessionStorage.setItem('prophet_user_id', String(userId));
        if (avatar) sessionStorage.setItem('prophet_avatar', String(avatar));

        console.log('[Activity] auth OK', {
            userId,
            displayName,
            hasSession: Boolean(authPayload.sessionToken)
        });

        if (typeof window.__hideActivityBoot === 'function') {
            window.__hideActivityBoot(`Hola, ${displayName}`);
        }

        const err = document.getElementById('prophet-activity-error');
        if (err) err.remove();

        return {
            mode: 'activity',
            sessionToken: authPayload.sessionToken || null,
            access_token: authPayload.access_token,
            user: {
                id: userId,
                username: displayName,
                global_name: sdkUser.global_name || null,
                avatar
            },
            auth: activityAuth,
            sdk: discordSdk,
            balance: authPayload.balance,
            level: authPayload.level
        };
    } catch (err) {
        console.error('[Activity] fail', err);
        showError(
            'Error al iniciar la Activity',
            String(err && err.message ? err.message : err) + '\n\nURL:\n' + window.location.href
        );
        return { mode: 'activity', error: String(err && err.message ? err.message : err) };
    }
}

function getSetupPromise() {
    if (!readyPromise) readyPromise = setupActivity();
    return readyPromise;
}

window.prophetActivity = {
    isDiscordFrame: isDiscordsays() || hasRequired(loadStoredParams()) || hasRequired(readParamsFromSearch(window.location.search)),
    embedInfo: () => ({ ...loadStoredParams(), ...readParamsFromSearch(window.location.search), href: window.location.href }),
    hasEmbedParams: () => hasRequired({ ...loadStoredParams(), ...readParamsFromSearch(window.location.search) }),
    navigate: navigatePreserveEmbed,
    getSdk: () => discordSdk,
    getAuth: () => activityAuth,
    ready: getSetupPromise,
    setup: getSetupPromise
};

// Ejecutar restore de params lo antes posible
ensureEmbedParamsInUrl();
getSetupPromise();

export { setupActivity, getSetupPromise, navigatePreserveEmbed };
