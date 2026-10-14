# Revisión de seguridad de Games — 14/10/2026

Rama propuesta: `fix/oauth-public-error-leak-20261014` (PR #13). **No hay merge ni despliegue.**

## Correcciones incluidas

- OAuth de Games: los mensajes internos de Discord, variables de entorno y excepciones de servidor ya no aparecen en respuestas públicas.
- OAuth: logs de excepciones limitados al tipo de error, sin imprimir códigos OAuth ni tokens.
- Sesiones de Games: `GET /api/games/session-info` exige `Authorization: Bearer <sessionToken>`. No acepta tokens en URL. Las páginas heredadas que reciban `?token=` lo guardan temporalmente y quitan de la barra de direcciones.
- Games HTTP: CORS ya no devuelve `*`; acepta origins HTTPS del mismo host, Discord Activities y entradas HTTPS definidas en `GAMES_CORS_ORIGINS`.
- Games WebSocket: rechaza origins no permitidos, desconecta sockets sin autenticación tras 15 segundos, limita 10 intentos de auth por conexión y 300 mensajes por 10 segundos.
- La identidad de usuarios autenticados en WebSocket procede de la sesión verificada por el servidor, no del nombre/avatar arbitrario que manda el navegador.
- Renderizado de Activity, UNO, Trivia, Crash y Survivor: el texto recibido de usuarios se presenta como texto literal o escapado antes de inyectarlo en HTML.
- CI: una vulnerabilidad de dependencia de severidad alta o crítica hace fallar el audit productivo.

## Comprobación

Pruebas de regresión en `test/originSecurity.test.js`, `test/oauthPublicErrors.test.js`, `test/activityXssSecurity.test.js`, `test/gamesServerHttp.test.js` y `test/websocketSecurity.test.js`.
Comprobar la ejecución de Actions asociada al **último SHA** de este PR antes de fusionar. Las suites automáticas no demuestran funcionamiento de OAuth/Discord/Lavalink con usuarios reales.

## Compatibilidad y riesgos no cerrados

- Revisar cualquier consumidor externo de `/api/games/session-info`: debe enviar bearer token en headers. Nunca se aceptará `?token=` en ese endpoint.
- Los clients de Discord Activity y el frontend servido desde el mismo HTTPS siguen admitidos. Para un frontend HTTPS ubicado en otro dominio, configurar `GAMES_CORS_ORIGINS` con orígenes exactos separados por coma.
- Confirmar que la configuración desplegada no sobreescribe `GAMES_BIND_HOST=127.0.0.1` con una escucha pública; el cambio en el código no modifica los `.env` reales.
- El rate limit del WebSocket es por conexión y proceso; la defensa multinodo requiere limitación compartida y límites en reverse proxy.
- Continúan pendientes los avisos moderados/bajos de npm documentados en `docs/CONSOLIDATED_RELEASE_20261013.md`: no se fuerzan overrides mayores sin evaluar extractor, música y dependencias transitivas.
- Falta verificar OAuth real, proxy HTTPS, WebSocket, permisos de Discord, mensajes y juego concurrente en entorno de ensayo; no cerrar issue #7 solamente con este PR.
- No tocar el cron, PM2 ni los datos de producción desde los cambios de esta rama. El despliegue y control del VPS pertenecen al propietario.
