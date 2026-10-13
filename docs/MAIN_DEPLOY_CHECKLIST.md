# Prophet Bot — validación y despliegue desde main

**Rama oficial:** `main`. No clonar nuevas ramas de trabajo ni tomar el
checkout antiguo `fix/stabilize-security-deploy-20261012` como versión final.

**Instalación real:** `/root/ProphetBot`  
**Copia descargada previamente:** `/root/ProphetBot-Revision`  
**Importante:** GitHub CI verifica instalación, sintaxis y unit tests; **no
prueba** los intents de Discord, WebSocket a través del proxy externo,
música Lavalink, SQLite real ni PM2 en producción.

## A. Sincronizar solamente la copia de revisión

La copia existente fue clonada con `--single-branch` y quizá no tiene
`origin/main`. Su estado debe estar limpio antes de cambiarla:

```bash
cd /root/ProphetBot-Revision
git status --short
git fetch origin main:refs/remotes/origin/main
git switch -C main --track origin/main
git status --short
git log -1 --oneline
```

El comando `git switch -C main` **crea/cambia la rama local main en la copia
de ensayo**, no crea una nueva rama remota ni modifica la producción. No
ejecutar si el `git status` inicial muestra modificaciones sin respaldar.
Para sucesivas actualizaciones usar `git pull --ff-only origin main` desde
esta copia. No mezclar archivos `.env` ni bases reales en el checkout de ensayo.

## B. Validación de una versión candidata en main

- [ ] Última GitHub Action del SHA exacto: instalación npm, comprobación de
      sintaxis y todas las pruebas en verde.
- [ ] Resolver o aceptar documentadamente dependencias vulnerables.
- [ ] Comprobar que los 4 gitlinks sin `.gitmodules` (issue #5) no sean
      necesarios o restaurarlos desde repositorios y licencias verificadas.
- [ ] Revisar configuración real sin mostrar valores privados: DISCORD_TOKEN,
      GUILD_ID, Server Members Intent, Message Content Intent, OAuth Activity,
      DISCORD_CLIENT_ID/SECRET, GAMES_INTERNAL_SECRET >=32 bytes, DATABASE,
      Lavalink credentials/puertos, reverse proxy, HTTPS.
- [ ] Probar `/probar-notificaciones` y eventos reales de entrada/salida
      en Discord de ensayo, incluyendo adjuntos y permisos de canal.
- [ ] Comandos de moderación, menús de roles, XP, economía, banco y transferencias,
      juegos/casino multijugador, OAuth y WebSockets con desconexiones.
- [ ] Música (Lavalink, audio, reconexiones), dashboard (login/refresh/roles),
      reinicio controlado y manejo de errores.
- [ ] Recuperación en entorno de ensayo desde una copia SQLite consistente.
- [ ] Confirmar que ninguna operación de prueba envía mensajes a usuarios
      reales, reinicia el bot productivo o muta saldos de producción.

## C. Despliegue final supervisado — solo cuando se decida hacerlo

**Antes:** respaldar fuera del repositorio `.env`, SQLite y su WAL, certificados,
ecosystem.config.js personalizado, reglas del proxy, crontab y lista de
servicios. SQLite en WAL debe respaldarse mediante su API de backup o
`sqlite3 .backup` con escritores controlados; NO copiar solo el archivo
principal si hay escritura activa.

Usar el administrador de la VPS para comprobar archivos y tareas existentes.
Si `/root/ProphetBot` tiene modificaciones locales, **no** usar
`git reset --hard`. Resolver la diferencia y respaldar los cambios antes de
desplegar.

```bash
cd /root/ProphetBot
git status --short
git branch --show-current
git fetch origin main
git log --oneline -3 origin/main
# Tras aprobar SHA, backups e .env:
git pull --ff-only origin main
npm run deploy
pm2 list
```

`npm run deploy` instala dependencias, valida y recarga los cuatro servicios,
monitorea endpoints y tiene rollback de checkout ante fallos. **El rollback
de checkout no restaura automáticamente cambios de DB, migraciones, secrets
ni servicios externos**; son necesarios backups y ensayo de restauración.

Para activar actualización automática **después** del despliegue inicial
verificado, consultar [VPS_AUTO_DEPLOY.md](VPS_AUTO_DEPLOY.md).
Esta automatización es *polling* periódico desde la VPS, no webhook inmediato.

## D. Reporte que debe devolver la IA con acceso al VPS

- SHA de `main` descargado y SHA que corre en `/root/ProphetBot`.
- `pm2 list`, reinicios, salidas de health checks y errores de logs recientes
  sin tokens ni datos personales.
- Resultados de pruebas funcionales en Discord/Activities/Lavalink.
- Puertos locales vs públicos, permisos/intents, cron y proxy.
- Backup efectuado y resultado de una restauración ensayada.
- Riesgos o bloqueos y resultado final: APTO / NO APTO.

El responsable del desarrollo ajustará `main` según esos informes. Nunca
interpretar `git pull` por sí solo como prueba de funcionamiento.
