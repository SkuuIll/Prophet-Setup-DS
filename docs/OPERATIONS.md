# Operación de ProphetBot

## Estado y salud

- `pm2 list` muestra `ProphetBot` y `ProphetLavalink`.
- `curl --fail http://127.0.0.1:3789/api/health` debe devolver `ok: true` y `ready: true`.
- Lavalink solo debe escuchar en `127.0.0.1:2333`.
- El dashboard solo debe escuchar en `127.0.0.1:3789`; Nginx puede publicarlo con TLS si se necesita acceso externo.

## Despliegue

`npm run deploy` ejecuta un despliegue con bloqueo exclusivo:

1. cancela si existen cambios locales;
2. crea y verifica un backup SQLite;
3. descarga `origin/main` únicamente con fast-forward;
4. instala exactamente `package-lock.json`;
5. valida sintaxis, pruebas y vulnerabilidades críticas;
6. recarga `ProphetBot` con PM2;
7. exige un health check correcto;
8. restaura la revisión anterior si falla una etapa posterior a la actualización.

`scripts/auto_update.sh` solo llama al despliegue cuando el remoto está por delante y es descendiente directo. Los repositorios sucios, adelantados localmente o con ramas divergentes no se modifican.

## Datos y secretos

- `.env`, SQLite, backups, secretos persistentes y credenciales usan permisos `0600`.
- La contraseña de Lavalink se carga desde `.env`; se rota con `node scripts/rotate_lavalink_password.js` y luego se recargan `ProphetLavalink` y `ProphetBot`.
- JWT y cifrado se generan una sola vez en `data/secrets/` si no se definen externamente.
- La credencial inicial del dashboard queda en `data/.dashboard_credentials.txt` y fuerza cambio de contraseña.
- No se deben agregar archivos de `data/`, `.env` ni logs al repositorio.

## Base de datos

- `npm run db:backup` crea un backup mediante la API online de SQLite, ejecuta `quick_check` y conserva siete días.
- Las migraciones agregan columnas solo cuando faltan.
- Recordatorios y tempbans fallidos se conservan y reintentan con backoff exponencial.
- Los requisitos y el número de ganadores de sorteos se guardan en SQLite, por lo que sobreviven reinicios.

## Validación manual

```bash
npm run verify
npm run audit:prod
npm run db:backup
```
