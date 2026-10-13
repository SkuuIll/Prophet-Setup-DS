# Auditoría progresiva de seguridad — fase P0

**Estado:** en curso. El PR #4 se fusionó a `main` y los arreglos posteriores se realizaron directamente allí. El VPS sigue con su checkout anterior hasta que el propietario decida desplegar.
No equivale a un pentest completo ni a pruebas del VPS real.

## Revisión focalizada de este avance

| Componente | Riesgo identificado | Acción | Verificación |
| --- | --- | --- | --- |
| `events/interactionCreate.js` | El selector `auto_roles_juegos` comprobaba roles protegidos por nombre, pero no permisos administrativos, moderación o jerarquía; posible asignación inadecuada con configuración equivocada. | Política central `utils/selfAssignableRoles.js`, usada en botón `rr_` y selector; bloquea roles administrados, críticos y fuera de jerarquía. | `test/selfAssignableRoles.test.js` |
| `commands/admin/reactionroles.js` | Permitía publicar panel con un rol privilegiado no listado en la configuración protegida. | Política de autoasignación aplicada también al crear el panel; requiere permiso de administrador en ejecución. | `test/discordModerationPermissions.test.js` |
| `commands/mod/` (9 comandos) | 8 comandos dependían del permiso declarado para el slash command, sin doble comprobación al ejecutarse; `mod-notes` carecía de permiso declarado. | Permiso explícito por comando en tiempo de ejecución; se declara `ModerateMembers` para `mod-notes`. | `test/discordModerationPermissions.test.js` |
| `events/interactionCreate.js` | Mensajes de error exponían excepciones internas directamente en la respuesta. | Mensajes de usuario genéricos, error real en logs del servidor. | Revisión de manejo de errores (no prueba E2E). |
| `web/security.js`, `web/middleware.js`, `web/authRoutes.js` | JWT existente mantenía claim de rol anterior si se cambiaba desde dashboard. | Revocación al modificar roles/borrar usuario y validación del rol actual en cada verificación de sesión. | `test/dashboardRoleSessions.test.js` |
| `games_server.js` | Resolución de rutas estáticas basada en prefijos de string; no protegía completamente contra escapes mediante enlaces simbólicos. | `games/common/publicFilePath.js` compara rutas relativas y `realpath`; limita a archivos dentro del directorio público. | `test/publicFilePath.test.js` |
| `games_server.js` | JSON HTTP podía acumular hasta ~1 millón de caracteres y cortar la conexión antes de enviar un error claro. | Límite de 64 KiB por bytes, rechazo de JSON raíz no-objeto y manejo de solicitudes interrumpidas. | Comprobación en CI, E2E aún pendiente. |
| `games/common/discordActivityAuth.js` | OAuth no limitaba tamaño de code/token y no tenía timeout explícito de red; se aceptaba ID no validado de respuesta. | Validación, límites, `AbortSignal.timeout(8000)` y Snowflake de Discord. | `test/discordOauthValidation.test.js` |

## Inventario inicial de rutas HTTP sensibles

**Dashboard** (`web/secureServer.js`): `GET /api/health` (pública),
`GET /api/dashboard` (`dashboard:read`),
`POST /api/config` (`config:write`),
`POST /api/tickets/close` (`tickets:close`),
`POST /api/giveaways/end` (`giveaways:end`),
`POST /api/reminders/delete` y `POST /api/warns/clear`
(`moderation:write`), `POST /api/summary/send` (`config:write`),
`GET /api/security/summary` (`security:read`).

**Auth / administración** (`web/authRoutes.js`):
`POST /api/auth/login`, `POST /api/auth/refresh` son públicas con
`apiSecurity`, validaciones y rate limits;
`GET /api/auth/me`, `POST /api/auth/logout`,
`POST /api/auth/change-password`, `GET /api/auth/csrf`
requieren sesión; `GET/POST/PATCH/DELETE /api/users` y
`POST /api/users/:id/reset-password` requieren permisos `users:*`;
`/api/security/audit`, `/api/security/blocked-ips`,
`/api/security/block-ip`, `/api/security/stats` requieren permisos
`security:read/write`. Seguir revisando respuesta a errores, CSRF de
métodos mutantes, reintentos y perfil de amenazas.

**Games** (`games_server.js`):
`GET /api/games/health`, `GET /api/games/config` públicos;
`POST /api/token`, `/api/games/token`, `/api/games/activity-auth`
intercambian códigos OAuth;
`POST /api/games/session-from-access` verifica access token en Discord;
`GET /api/games/session-info?token=` consulta una sesión;
`POST /api/games/create-token` exige secreto interno fuerte.
WebSockets `/ws` / `/.proxy/ws`: sesión de juego para operaciones,
modo demo bloqueado en producción según correcciones anteriores.
Las variantes `/.proxy/*` son equivalentes para Discord Activities.

## Correcciones adicionales aplicadas a main

- Las renovaciones de token del dashboard ahora son de un solo uso transaccional para evitar carreras; el navegador no hace renovaciones simultáneas.
- Las operaciones atómicas de saldo, banco y transferencias `/pay` evitan débito separado de crédito y no aceptan importes negativos, fraccionarios o mayores que el entero seguro.
- El reverse proxy local ya no usa el primer X-Forwarded-For, que podría estar inyectado por un cliente.
- Nuevos tests de renovación, economía, pagos y cabeceras proxy.

## Pruebas adicionales en main

- Las operaciones `/daily`, `/work`, `/pay`, banco y `/gamble` ya no permiten duplicar cobros por una lectura y escritura separadas.
- Prueba HTTP de Games en proceso separado con rutas sensibles y health checks.

## Riesgos / preguntas aún abiertos

- **P0**: `session-info` recibe el token en query string: analizar llamadas
  del frontend y migrar a `Authorization: Bearer` evitando pérdidas por
  logs, historial y referencias, **sin romper Activity existente**.
- **P0**: verificar en ejecución OAuth completo (permisos, consentimiento,
  scope, navegador embebido), política de origen y proxy inverso.
- **P0**: verificar la escritura de contraseñas iniciales del dashboard en
  `data/.dashboard_credentials.txt`, su eliminación/rotación y el
  aislamiento de los archivos locales.
- **P0**: comprobaciones de operaciones con sesiones/recompensas bajo múltiples
  websockets y workers, incluida revocación de tokens.
- **P1**: auditoría individual de más comandos y eventos (issue #8); los
  comandos de admin declaran permisos pero todavía no todos tienen controles
  runtime y pruebas funcionales.
- **P1**: trazas y cabeceras de proxy detrás de HTTPS real.
- **P1**: tests de payload JSON al límite y ataques de rutas contra servidor
  en ejecución en un entorno seguro.
- **P1**: resolver vulnerabilidades npm reportadas y determinar riesgo
  explotable para cada paquete.
- **P2**: componentes compartidos, código duplicado y frontend.

## Aceptación de la fase

No marcar #7 como cerrado hasta completar inventario, pruebas regresivas
para cada cambio importante, revisión de npm y pruebas funcionales pertinentes.
No desplegar a VPS antes de la aceptación final del propietario (issue #6).
