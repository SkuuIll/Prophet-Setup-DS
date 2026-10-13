# Prophet Bot — despliegue automático en VPS (octubre de 2026)

Este proyecto usa un repositorio Git en `/root/ProphetBot`, PM2 con cuatro procesos
y SQLite en `data/prophet.sqlite`. Se conserva la ubicación de todos los módulos
existentes para no romper las importaciones ni comandos de Discord.

## Protección de datos

- Nunca subir `.env`, `data/`, respaldos, contraseñas ni `logs/` a GitHub.
- `git pull --ff-only` no elimina esos archivos ignorados; aun así, hacer una copia
  de seguridad externa antes del primer despliegue.
- El script `npm run deploy` ejecuta el backup SQLite antes de modificar el código.
- No usar `git reset --hard` manualmente para "arreglar" un VPS con cambios locales.
- El rollback automático solo aplica después de un avance del checkout limpio.

## Puesta en marcha UNA SOLA VEZ desde main, tras la aceptación del propietario

Los cambios ya están en `main`; **GitHub no realiza la instalación en la VPS por sí solo**. Ejecutar este procedimiento únicamente cuando la versión esté validada y el propietario decida actualizar. Conectate por SSH con la cuenta que administra estos procesos (actualmente root):

```bash
cd /root/ProphetBot
git status --short
git pull --ff-only origin main
npm run auto-update:install
npm run deploy
crontab -l | grep ProphetBot-auto-update
pm2 list
```

Si `git status --short` muestra cambios, conservá esos cambios e investigá por
qué existen ANTES de hacer pull. No borres archivos para forzar el despliegue.

`npm run auto-update:install` instala un cron idempotente que, por defecto,
compara `origin/main` cada 2 minutos. No necesita llaves SSH de ingreso al VPS
almacenadas en GitHub: el VPS inicia el `git fetch` como cliente. La máquina
requiere salida a GitHub, `git`, `npm`, `node >= 22`, PM2, `curl`, `flock` y
`crontab`. Para otro intervalo, usar, por ejemplo,
`AUTO_UPDATE_INTERVAL_MINUTES=5 npm run auto-update:install` (valores: 1, 2,
5, 10, 15, 30, 60).

El cron se instala para la **cuenta que ejecuta el instalador**. No se debe
instalar para una cuenta distinta de la propietaria del checkout y PM2.

## Qué sucede tras cada push/merge a main

1. Cron ejecuta `scripts/auto_update.sh`, compara el commit local con main y
   rechaza ramas divergentes o cambios sin confirmar.
2. `scripts/deploy.sh` usa un bloqueo exclusivo para evitar dos despliegues.
3. Crea un respaldo verificado de la base de datos.
4. Actualiza con fast-forward, ejecuta `npm ci`, pruebas de sintaxis y test,
   y audita vulnerabilidades críticas.
5. Recarga **en orden** `ProphetLavalink`, `ProphetGames`,
   `ProphetMusic` y `ProphetBot`.
6. Comprueba todos los estados PM2, que Discord esté listo en
   `/api/health` y que el servidor de juegos responda en
   `/api/games/health` dos veces consecutivas.
7. Si falla después del avance, vuelve al commit previo y recarga los procesos.
   Anota ese commit fallido en `data/deploy/failed-revision` para no repetir
   cada 2 minutos un fallo de arranque. Un commit posterior habilita otro intento.

Un push a una rama de trabajo, o un PR que todavía NO está fusionado, no provoca
despliegue; solo se observa `main`.

## Comprobación y diagnóstico

```bash
cd /root/ProphetBot
git log -1 --oneline
pm2 list
curl --fail http://127.0.0.1:3789/api/health
curl --fail http://127.0.0.1:3850/api/games/health
tail -n 80 logs/auto-update.log
pm2 logs ProphetBot --lines 50 --nostream
pm2 logs ProphetMusic --lines 50 --nostream
pm2 logs ProphetGames --lines 50 --nostream
pm2 logs ProphetLavalink --lines 50 --nostream
```

Si el despliegue rechaza una revisión, corregir el código en otra revisión y
fusionarla en main. Para reintentar manualmente la misma revisión después de
solucionar el fallo del VPS, ejecutar `npm run deploy` con supervisión.
No usar `--force`, no eliminar `data/` y no borrar el respaldo SQLite.

## Variables locales imprescindibles

Mantener el `.env` actual, y agregar manualmente si faltan:

```dotenv
DISCORD_MUSIC_TOKEN=REEMPLAZAR_TOKEN_DEL_SEGUNDO_BOT
GAMES_INTERNAL_SECRET=REEMPLAZAR_POR_SECRETO_ALEATORIO_DE_64_HEX
GAMES_BASE_URL=https://TU_DOMINIO_PUBLICO/games
```

Generar el secreto localmente con `openssl rand -hex 32`. Nunca pegar su valor
en tickets, chats ni archivos versionados. `GAMES_INTERNAL_SECRET` protege
`POST /api/games/create-token`; sin secreto fuerte responde 503 (cerrado).
Los juegos iniciados mediante `/jugar` y OAuth no necesitan ese endpoint
interno.

## Seguridad de red

Los logs entregados el 12-10-2026 muestran peticiones automáticas desde
Internet buscando archivos sensibles en ProphetGames. Esto no demuestra un
acceso exitoso, pero indica que hay una superficie pública expuesta.

Recomendado: poner ProphetGames detrás de un reverse proxy HTTPS (Nginx o
equivalente), configurar `GAMES_BIND_HOST=127.0.0.1`, mantener el puerto 3850
accesible SOLO localmente y servir `GAMES_BASE_URL` desde un dominio HTTPS.
**No cierres el puerto sin configurar primero el proxy**, porque podrías
romper Discord Activities y los juegos externos. Comprobar certificados,
WebSockets y el enrutamiento `/.proxy` del SDK antes de aplicar el firewall.

No cambiar `GAMES_BIND_HOST` en un VPS en producción sin validar esa topología:
el valor por defecto conserva el comportamiento previo (`0.0.0.0`) y emite
una advertencia explícita al arrancar.

## Fuera de alcance de esta migración conservadora

No se mueven decenas de archivos ni se renombra masivamente `commands/`,
`events/`, `modules/`, `web/` y `games/`, porque eso podría romper cientos
de imports en el servidor productivo. La estructura actual queda documentada
en `docs/REFACTOR_PLAN.md`; el traslado de módulos se puede hacer en fases
con pruebas de integración y respaldo.

## Reparación de banners y notificaciones de miembros

El bot principal necesita el intent `GuildMembers` ya declarado en `index.js`.
Comprobá en **Discord Developer Portal → Bot → Privileged Gateway Intents**
que esté habilitado **Server Members Intent** (sin compartir el token del bot).
El bot debe tener acceso al canal configurado como **BIENVENIDOS** y permisos
**Ver canal**, **Enviar mensajes**, **Insertar enlaces** y **Adjuntar archivos**.

Esta versión revisa al iniciar el canal de bienvenida y el de logs, busca
alternativas por nombre si el ID guardado en SQLite quedó obsoleto y deja
mensajes precisos en la salida de ProphetBot. En el servidor Discord un
administrador puede ejecutar:
- `/probar-notificaciones tipo:bienvenida`
- `/probar-notificaciones tipo:despedida`

Ambos comandos mandan una **vista previa** al canal real, sin alterar métricas
de miembros ni crear/sacar usuarios. Si la vista previa funciona pero un
ingreso real no produce mensaje, hay que comprobar que el evento
`guildMemberAdd` efectivamente llegue desde el Gateway de Discord. Si falla
solo la imagen, revisá el módulo nativo `canvas` y el permiso
`AttachFiles`.

## WebSockets de juegos

Los mensajes WebSocket tienen tamaño máximo de 64 KiB y los tokens de sesión
expirados dejan de autorizar acciones. El modo demo está deshabilitado salvo
configuración explícita `GAMES_DEMO_ENABLED=true`, ambiente de desarrollo y
cliente desde loopback; nunca en el VPS de producción.
