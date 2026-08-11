/**
 * ═══ Discord Activities bootstrap — Prophet Games ═══
 *
 * Discord inyecta en el iframe:
 *   ?frame_id=&instance_id=&platform=desktop&guild_id=&channel_id=
 *
 * Al navegar entre juegos (ej. / → /tycoon/) esos query params se perdían.
 * Ahora se guardan en sessionStorage y se reinyectan en la URL antes del SDK.
 */

import { DiscordSDK } from '/games/vendor/embedded-app-sdk/index.mjs?v=20260811c';

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
    for (const p of ['/api/games/config', '/.proxy/api/games/config']) {
        try {
            const res = await fetch(p, { cache: 'no-store' });
            if (res.ok) return await res.json();
        } catch (_) {}
    }
    return null;
}

async function postJson(paths, body) {
    let last = null;
    for (const p of paths) {
        try {
            const res = await fetch(p, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                cache: 'no-store'
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) return data;
            last = data.error || `${res.status} ${p}`;
        } catch (e) {
            last = e.message || String(e);
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

        const { code } = await discordSdk.commands.authorize({
            client_id: String(clientId),
            response_type: 'code',
            state: '',
            prompt: 'none',
            scope: ['identify', 'guilds', 'applications.commands']
        });

        let authPayload;
        try {
            authPayload = await postJson(
                ['/api/games/activity-auth', '/.proxy/api/games/activity-auth'],
                { code }
            );
        } catch (_) {
            authPayload = await postJson(
                ['/api/token', '/.proxy/api/token'],
                { code }
            );
        }

        if (!authPayload || !authPayload.access_token) {
            throw new Error((authPayload && authPayload.error) || 'Sin access_token');
        }

        activityAuth = await discordSdk.commands.authenticate({
            access_token: authPayload.access_token
        });
        if (!activityAuth) throw new Error('authenticate() falló');

        if (authPayload.sessionToken) {
            sessionStorage.setItem('prophet_game_token', authPayload.sessionToken);
        }

        // Nombre visible: global_name (display) > username
        const sdkUser = activityAuth.user || {};
        const displayName = (authPayload.user && authPayload.user.username)
            || sdkUser.global_name
            || sdkUser.username
            || 'User';
        const userId = (authPayload.user && authPayload.user.id) || sdkUser.id;
        const avatar = (authPayload.user && authPayload.user.avatar) || sdkUser.avatar || null;

        sessionStorage.setItem('prophet_display_name', displayName);
        if (userId) sessionStorage.setItem('prophet_user_id', String(userId));
        if (avatar) sessionStorage.setItem('prophet_avatar', String(avatar));

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
