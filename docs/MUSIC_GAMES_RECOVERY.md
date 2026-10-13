# Prophet Music y Games — validación antes del próximo despliegue

**Revisión de 13 de octubre de 2026.** La IA del VPS confirmó que `ProphetBot`, `ProphetMusic`, `ProphetGames` y `ProphetLavalink` están `online` y que la actualización automática de `main` quedó comentada en crontab, con respaldo privado. Esta afirmación proviene del informe del administrador; no se ha ejecutado el nuevo commit en producción.

## Arreglos aplicados en main

- `modules/shoukakuEngine.js`: `reconnectInterval` pasa de **5000 segundos** a **5 segundos** y `restTimeout` de **15000 segundos** a **15 segundos**, conforme a Shoukaku v4. La librería multiplica el valor de reconexión por 1000 para obtener milisegundos. Con 5000 la espera era aproximadamente 83 minutos.
- `music_bot.js` y `modules/musicEngine.js`: los errores privados ya no se envían textualmente al canal de Discord. Los mensajes ahora explican cómo reintentar, con menciones deshabilitadas y envío de errores protegido.
- `games_server.js`: el puerto 3850 escucha **por defecto** solo en `127.0.0.1`, detrás del proxy Nginx. El valor explícito de `GAMES_BIND_HOST` en `.env` tiene prioridad y **debe revisarse en la VPS**. El archivo `.env.example` documenta el valor seguro.
- `test/musicRecovery.test.js` y `test/gamesServerHttp.test.js`: pruebas de unidades Shoukaku y arranque HTTP con bind seguro por defecto.

## Qué hacer en la VPS antes de activar el cron

1. Mantener comentada exclusivamente la entrada `# ProphetBot-auto-update`. Verificar que no haya otro timer, deploy-hook o servicio que haga `git pull`/PM2 automáticamente.
2. Revisar **solo presencia/configuración, sin imprimir el valor de ningún secreto**: `GAMES_BIND_HOST` debe acabar en `127.0.0.1` para Games. Si existe explícitamente `0.0.0.0`, el nuevo default no lo sustituirá. Realizar ese ajuste únicamente al planificar el despliegue supervisado.
3. Verificar Nginx: upstream `127.0.0.1:3850`, actualización de WebSockets, CSP apropiada y certificados TLS; la restricción de bind **no sustituye** revisar reglas firewall.
4. Mantener Lavalink en puerto local `127.0.0.1:2333`; comprobar que su log indica `ready` y luego que Shoukaku conecta/reconecta. Un HTTP 401 en `/version` sin contraseña confirma protección, **no** falla de disponibilidad.
5. Probar en un servidor de ensayo: Lavalink arranca tarde respecto de ProphetMusic; Shoukaku reintenta en segundos, no minutos. Validar `/play`, `/skip`, `/queue`, Spotify/YouTube y reconexión, sin provocar indisponibilidad al Discord productivo.
6. Investigar `Failed to extract signature decipher function / n decipher function`. No forzar actualización del extractor o del plugin YouTube Source/LavaSrc sin consultar licencias, compatibilidad y escuchar un tema de prueba.
7. Confirmar la CI verde del SHA exacto antes de un despliegue, hacer backup SQLite consistente y disponer de rollback funcional. **No reiniciar procesos ni desplegar ahora**.

## Límites de las comprobaciones

Un check HTTP 200 y PM2 `online` prueban que hay procesos y endpoints disponibles, pero no que el audio o los comandos funcionen con usuarios reales. El informe del VPS no contiene reproducción de voz ni prueba real de membresías, Discord Activities ni correo de OAuth.

## Evidencias y seguimiento

- Shoukaku v4: https://guide.shoukaku.shipgirl.moe/4.0.1/guides/2-options/
- Issues: https://github.com/SkuuIll/Prophet-Setup-DS/issues/11 y https://github.com/SkuuIll/Prophet-Setup-DS/issues/7
- Auditoría Discord: https://github.com/SkuuIll/Prophet-Setup-DS/blob/main/docs/DISCORD_UX_AUDIT.md