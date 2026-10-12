# Estado de la estabilización y plan de refactorización de ProphetBot

## Estructura actual (conservada)

| Ruta | Propósito |
| --- | --- |
| `index.js` y `music_bot.js` | Aplicaciones de Discord independientes |
| `games_server.js` | HTTP y WebSocket de los juegos |
| `web/secureServer.js`, `web/security.js` | Dashboard de administración |
| `commands/{admin,economy,fun,gaming,mod,music,profile,utility}/` | Slash commands |
| `events/` | Receptores de eventos Discord |
| `modules/` | Integraciones, música, antispam, perfil y otros servicios |
| `games/` | Motores de juego y sesiones |
| `web/public/games/` | Frontend de Activities |
| `database.js` | Persistencia SQLite compartida |
| `test/` | Pruebas unitarias |
| `scripts/` | Administración del servidor y despliegues |

## Cambios incluidos en esta rama

- Seguridad: `/api/games/create-token` no expide sesiones con secreto ausente;
  se compara el secreto en tiempo constante, se valida el ID de Discord y
  se limitan los tiempos de expiración.
- Estabilidad: `busy_timeout` SQLite y tests en modo secuencial para evitar
  bloqueos entre workers durante migraciones.
- Despliegue: actualización y rollback de los cuatro procesos PM2, comprobación
  del dashboard listo y Games activo, cuarentena de commits que fallaron.
- Automatización: cron idempotente con comprobaciones cada 2 minutos y
  documentación del paso inicial que debe ejecutar el administrador.
- Dependencias: cambios compatibles con los PR de Dependabot #1 (undici) y
  #3 (brace-expansion), sin alterar las otras dependencias.

## Segunda ronda: eventos y superficie de aplicaciones

- Bienvenidas y despedidas: resolución por ID persistido/nombre del canal,
  diagnóstico de permisos, envío anticipado, fallback sin imagen, mensajes
  más claros y comando `/probar-notificaciones` para un administrador.
- Listener de eventos: manejo explícito de errores de promesas asincrónicas;
  corregido el fallo del log de roles cuando no existe canal LOGS.
- Juegos: el modo demo público ya no permite entrar a WebSockets en producción;
  mensajes WS limitados y sesiones comprobadas tras autenticarse.
- Dashboard: no confiar en `X-Forwarded-For` del cliente externo para el
  rate limiting; evitar respuestas dobles cuando un JSON supera el máximo.
- Menú de ayuda: guías más coherentes y respuestas privadas al intentar
  manejar un menú de otra persona.
- Pruebas unitarias de resolución de canales, fallback sin banner, proxy
  HTTP y políticas de WebSocket.

## Próximas etapas que requieren datos de ejecución y pruebas reales

1. **Integración**: pruebas en un servidor Discord de ensayo de slash commands,
   botones, permisos, intents y eventos que no pueden verificarse solo por CI.
2. **Juegos**: pruebas E2E de Discord Embedded App SDK, WebSockets, partidas
   multijugador y autenticación OAuth bajo un proxy HTTPS real.
3. **Música**: validar un flujo de reproducción completo en Lavalink, Discord
   Player, YouTube y los bots secundarios sin reinicios ni pérdida de sesión.
4. **Persistencia**: probar múltiples procesos con una copia desidentificada de
   la base SQLite productiva, migraciones desde instalaciones viejas y restores.
5. **Modularidad**: separar `database.js`, `games_server.js`, `config.js` y
   `index.js` en servicios y repositorios, uno a la vez, con tests de regresión.
6. **Sistema**: ejecutar los servicios con usuario dedicado y permisos mínimos,
   evaluar firewall y protección HTTPS sin cortar el acceso actual.
7. **Observabilidad**: alertas por reinicios repetidos, errores en jobs,
   WebSockets cerrados y estado del Lavalink de forma externa.

El archivo de PM2 compartido por el propietario muestra cuatro procesos online,
el registro de 93 comandos en el bot principal y tráfico de escáneres a Games.
No hay evidencia en esos logs de la totalidad de los fallos funcionales
reportados. No se ha inspeccionado el filesystem real ni el .env del VPS.
