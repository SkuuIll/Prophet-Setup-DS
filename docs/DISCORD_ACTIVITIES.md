# Prophet Games como Discord Activity

Los juegos de Prophet están pensados para correr **dentro de Discord** (iframe / App Launcher), no solo como links web.

## Arquitectura

```
Discord Client (Activity iframe)
    │  Embedded App SDK (authorize / authenticate)
    ▼
games_server.js  (HTTPS público vía tunnel o dominio)
    ├── GET  /                     → Hub (entry point)
    ├── GET  /games/*              → cada juego
    ├── POST /api/token            → OAuth code → access_token
    ├── POST /api/games/activity-auth → code → session + user verificado
    ├── GET  /api/games/config     → clientId público
    └── WS   /ws                   → multijugador / economía
```

La identidad del jugador se obtiene **server-side** con el OAuth de Discord. Nunca se confía en un `userId` mandado por el cliente.

## Requisitos

1. App en [Discord Developer Portal](https://discord.com/developers/applications)
2. Node 22+ con `games_server.js` accesible por **HTTPS**
3. Variables de entorno (ver abajo)
4. URL Mapping + Activities habilitadas

## Variables de entorno

Agregá a `.env`:

```bash
# Application ID (público) — mismo que el bot en la mayoría de casos
DISCORD_CLIENT_ID=123456789012345678

# Client Secret (OAuth2 → copiar del portal, NUNCA commitear)
DISCORD_CLIENT_SECRET=tu_secret_aqui

# URL pública HTTPS del games server (tunnel o dominio)
GAMES_BASE_URL=https://tu-tunnel.example.com/games
GAMES_PORT=3850
```

Si no ponés `DISCORD_CLIENT_ID`, el server intenta derivarlo del `DISCORD_TOKEN` (Application ID).  
**El Client Secret siempre hay que configurarlo a mano.**

## Setup en Developer Portal

### 1. OAuth2

- **Redirects:** agregá `https://127.0.0.1` (placeholder; el SDK lo maneja en Activities)
- Copiá **Client ID** y **Client Secret** al `.env`

### 2. Installation

- Marcá **User Install** y **Guild Install**

### 3. Activities → Settings

- Activá **Enable Activities**
- Eso crea el comando de entry point “Launch” por defecto

### 4. Activities → URL Mappings

Con el server expuesto por HTTPS (ej. cloudflared):

| PREFIX | TARGET |
|--------|--------|
| `/`    | `tu-host-publico.com`  *(sin https://)* |

Con un solo mapping en `/`, Discord proxyea todo (`/games`, `/api`, `/ws`, `/vendor`).

Ejemplo local con tunnel:

```bash
# Terminal 1
node games_server.js

# Terminal 2
cloudflared tunnel --url http://localhost:3850
# → https://algo.trycloudflare.com
```

URL Mapping: `/` → `algo.trycloudflare.com`

### 5. Instalar la app en el server

OAuth2 URL Generator (portal) o invitación con scopes:

- `bot`
- `applications.commands`
- (opcional) `identify`, `guilds` — los pide la Activity al launch

## Cómo lanzar la Activity

1. Activá **Developer Mode** en Discord (User Settings → Advanced)
2. Entrá a un **canal de voz** del server de prueba
3. App Launcher → buscá **Prophet Games** → Launch
4. Autorizá scopes la primera vez
5. El hub carga dentro de Discord; los juegos usan tu user real y la economía del bot

## Desarrollo local

```bash
# 1. Env
export DISCORD_CLIENT_ID=...
export DISCORD_CLIENT_SECRET=...

# 2. Server
node games_server.js

# 3. Tunnel público
cloudflared tunnel --url http://localhost:3850

# 4. Actualizar URL Mapping en el portal con el host del tunnel
```

### Navegador normal (sin Activity)

Sigue funcionando:

- `/jugar` genera un link con `?token=...`
- Sin token: modo `demo_token` para pruebas

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `games_server.js` | HTTP + WS + OAuth endpoints |
| `games/common/discordActivityAuth.js` | Exchange code + sesión |
| `web/public/games/common/discordActivity.js` | SDK bootstrap (ESM) |
| `web/public/games/common/api.js` | WS client (Activity + web) |
| `web/public/games/vendor/embedded-app-sdk/` | SDK empaquetado |
| `commands/utility/jugar.js` | Instrucciones + link fallback |

## Checklist de producción

- [ ] `DISCORD_CLIENT_ID` + `DISCORD_CLIENT_SECRET` en `.env`
- [ ] Activities **Enabled** en el portal
- [ ] URL Mapping `/` → host HTTPS estable
- [ ] Redirect OAuth configurado
- [ ] App instalada en el guild
- [ ] `games_server` detrás de HTTPS (reverse proxy / tunnel)
- [ ] WebSocket llega por el mismo host (`wss://…/ws`)
- [ ] Probar launch desde voz en cliente desktop

## Notas

- **No uses dinero real.** Toda la economía es virtual del bot.
- Datos del cliente Discord (canal, nitro, etc.) **no son confiables**; la economía usa solo el user verificado por OAuth en el server.
- El proxy de Discord bloquea hosts externos no mapeados (CSP). Serví assets y APIs desde el mismo host del Activity.
