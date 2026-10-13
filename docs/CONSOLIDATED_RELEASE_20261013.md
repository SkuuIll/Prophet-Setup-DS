# Prophet Gaming — entrega consolidada de desarrollo (13 de octubre de 2026)

**Rama única:** `main`. **Instalación:** `/root/ProphetBot` (VPS). **Copia de revisión:** `/root/ProphetBot-Revision`.

Esta entrega reúne los cambios de seguridad, economía, música, moderación, ayuda, tickets y mensajes. No se ha reiniciado producción desde este desarrollo; el cron `# ProphetBot-auto-update` fue pausado por la IA administradora. Un commit nuevo de GitHub **no** equivale a una versión desplegada en Discord.

## Reparaciones realizadas en main

- **Lavalink/Shoukaku:** reconexión y timeout REST configurados en segundos (5 y 15). Los errores internos del reproductor y de /play ya no se envían al canal de Discord.
- **Música:** los nueve comandos musicales (play, queue, filter, loop, pause, shuffle, skip, stop, volumen) tienen mensajes organizados; los controles que mutan reproducción verifican que el usuario esté en el mismo canal de voz. Se corrigió también el caso de reanudar una canción pausada.
- **Economía:** débito/crédito simultáneos en /pay y menú contextual Dar Coins; límites de saldos, validación de importes, cobros y movimientos bancarios atómicos; /daily y /work con cooldown + premio transaccional, bonus de hora extra auditable, y mensajes renovados. /balance con resumen claro y ranking sin 200 consultas individuales.
- **Moderación:** /ban, /kick, /mute y /tempban verifican permisos al ejecutar, reflejan operaciones confirmadas y no envían el DM antes de la sanción. /warn informa correctamente si el castigo automático tuvo éxito o no. /snipe restringe el historial eliminado al Staff y responde de forma privada. /slowmode y /purge tienen mensajes de error entendibles. Las notas de moderación incluyen una exportación protegida por permisos, que antes no tenía manejador.
- **Tickets:** protección ante doble apertura/cierre y preservación del canal cuando no se puede archivar la conversación. Transcripción TXT de respaldo si falla la librería HTML. El DM de cierre se envía después del archivado.
- **Interfaz:** /ayuda ahora enumera comandos realmente cargados, agrupa por categorías, filtra por permisos y pagina. Respuestas globales de permisos/cooldowns unificadas. Se rediseñaron FAQ, anuncios /embed, sorteos, /ping, /serverinfo, /nivel, y varias funciones recreativas.
- **Privacidad:** corrección de respuestas que incluían directamente mensajes de excepciones de proveedores externos o de Discord. En mensajes anónimos se aclara que el Staff puede ver el registro de seguridad; su identidad no se publica en el chat.
- **Games y dashboard:** Games escucha en 127.0.0.1 por defecto y está diseñado para funcionar detrás de Nginx; renovaciones de sesión transaccionales, controles de origen y pruebas HTTP de Games. El /api/health y la apertura de páginas no sustituyen pruebas dentro del cliente Discord.
- **Operaciones:** inventarios automáticos de comandos/UI y diagnóstico de PM2 sin filtrar valores secretos; checklist seguro de staging/backup/despliegue.

## Pruebas y revisión final del código

- Ejecutar `npm ci`, `npm run verify`, `npm run audit:prod` en un entorno aislado antes de desplegar. La última CI del commit final debe mostrar sintaxis y todas las pruebas aprobadas.
- Las pruebas cubren economía (pagos, saldo, bancos, cooldown, bonus), permisos de música y moderación, FAQ, refresh de dashboard, Games HTTP, tickets y exportación privada de notas.
- Verificar que tanto Games como el Dashboard y el proceso musical se inician bajo la configuración de la VPS y que cada servicio PM2 está sano.
- Revisar logs sin pegar valores de `.env` ni tokens en informes públicos.

## Riesgos y tareas que siguen abiertos (no declarar "100 % terminado")

1. **Pruebas end-to-end reales:** comandos en Discord, bienvenida/despedida con cuentas reales, audio en voz con YouTube/Spotify/Lavalink, reconexión y Activities incrustadas. CI no puede reproducir esas interacciones.
2. **Cuatro referencias Git incompletas:** web/public/games/2048, clumsybird, hextris y pacman. Hay referencias originales verificadas para las primeras tres, pero el origen Pacman no se ha identificado; no sustituir archivos por repositorios no comprobados ni sin licencias.
3. **Dependencias:** cuatro hallazgos de npm (1 bajo, 3 moderados); esbuild y file-type presentan bloqueos de actualizaciones transitivas por versiones requeridas de Discord Player y extractor. `discord-html-transcripts@3.3.0` está advertido por npm como defectuoso, por lo que existe respaldo TXT en tickets. No forzar reemplazos incompatibles sin prueba real de audio y lockfile.
4. **Diseño transversal:** se unificó la base visual y los flujos principales, pero no se verificaron manualmente todas las variantes de mensajes de los 103 archivos de comandos, ni todos los frontends HTML/CSS de juegos, ni los gráficos Canvas. Auditar el resto desde `scripts/audit_discord_ui.js --details`.
5. **Despliegue activo:** la VPS de producción continúa con una versión anterior. Los cambios nuevos aún no están confirmados con usuarios. Mantener el cron pausado hasta aprobación y monitoreo del despliegue supervisado.

## Procedimiento para una sola actualización controlada, después de la aceptación

1. Sincronizar solamente la copia de revisión desde `main` y confirmar commit y árbol limpios.
2. Respaldar SQLite con API de backup coherente, `.env`, ecosystem PM2, Nginx/crontab y el SHA anterior. No copiar únicamente el archivo SQLite con escrituras WAL activas.
3. Probar en la copia de revisión el código y el arranque de procesos de ensayo **sin utilizar tokens de producción ni modificar DB real**.
4. Durante ventana supervisada, desplegar SHA elegido mediante `scripts/deploy.sh`, que valida y reinicia los cuatro servicios en orden con controles de salud.
5. Verificar manualmente en Discord las interacciones y reproducción reales y el tráfico OAuth/WebSocket detrás de Nginx. Confirmar Games solo accesible desde localhost.
6. Solo si las pruebas reales pasan y el propietario lo decide, reactivar el cron. Si falla, restaurar versión anterior y servicios desde los backups; el rollback de git no restaura automáticamente DB ni secretos.

Seguimiento: `docs/MASTER_PLAN.md`, `docs/DISCORD_UX_AUDIT.md`, `docs/MUSIC_GAMES_RECOVERY.md`, Issues #5–#12.
