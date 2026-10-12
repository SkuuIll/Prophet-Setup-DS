# Prophet Bot — Plan maestro de reconstrucción controlada

**Fecha de corte:** 12 de octubre de 2026  
**Repositorio:** `SkuuIll/Prophet-Setup-DS`  
**Rama de trabajo:** `fix/stabilize-security-deploy-20261012` (PR #4)  
**Producción:** no desplegar ni activar la actualización automática hasta completar la aceptación final del propietario.

## Objetivo

Modernizar, asegurar, ordenar y documentar todas las funcionalidades de Prophet Gaming
sin perder saldos, configuraciones, comandos, datos de usuarios, roles, mensajes
ni partidas. **No se considera terminado por el mero hecho de que CI esté verde.**

## Estado comprobado

- Inventario Git en esta rama antes de crear este plan: **496 archivos rastreados**
  (más 4 entradas de gitlink). De esos archivos, **264 son JavaScript**.
- Áreas propias: `commands/` (103 scripts), `events/` (18), `modules/` (31),
  `games/` (17), `utils/` (12), `scripts/` (34 archivos),
  `web/` (225 archivos, que incluyen terceros/SDK y recursos), `Lavalink/` (4).
- PR #4 antes del plan: **40 archivos cambiados**, 70 pruebas Node aprobadas,
  comprobación de sintaxis JS para 264 archivos, sintaxis Bash, instalación npm y
  auditoría de severidad crítica sin fallas (GitHub Actions run 38320503682).
- **Limitación:** esos 264 archivos no están auditados funcionalmente de forma
  individual; las 70 pruebas no cubren todas las interacciones con Discord, música,
  juegos y VPS. `docs/FILE_REVIEW_INVENTORY.csv` sirve de lista para recorrer
  cada archivo. Todo lo aún no auditado conserva ese estado explícito.
- Quedan **4 vulnerabilidades npm no críticas** notificadas en esa ejecución
  (1 baja, 3 moderadas), cuatro gitlinks incompletos y pruebas reales pendientes.
- **No hay conexión administrativa con el VPS** desde este chat. No se verificó
  `.env` real, firewall, proxy, certificados, roles ni contenido de SQLite en vivo.

## Fases, orden, entregables y criterios de cierre

| Fase | Prioridad | Qué se hará | Evidencia exigida | GitHub |
| --- | --- | --- | --- | --- |
| 0. Estabilización inicial | Parcial | Bienvenidas/despedidas, sesiones de Games, economía, deploy PM2, primeros tests y ayuda | PR revisado y CI + prueba funcional de aceptación | [PR #4](../pull/4) |
| 1. Seguridad integral | P0 | Permisos, OAuth, HTTP, WebSockets, amenazas comunes, secretos, npm, firewall/proxy | Hallazgos clasificados por severidad + pruebas de regresión | [#7](../issues/7) |
| 2. Discord end-to-end | P1 | 18 eventos, 103 archivos de comandos, botones, permisos, roles y errores | Matriz por evento/comando + ingreso/salida reales de prueba | [#8](../issues/8) |
| 3. Datos, economía y juegos | P1 | SQLite, migraciones, saldo atómico, cada motor y frontend de juego | Restore en ensayo + integridad monetaria, tests multijugador | [#9](../issues/9), [#5](../issues/5) |
| 4. UX y redacción | P2 | Embeds, menús, botones, modales, dashboard, mobile, textos, accesibilidad | Catálogo y pruebas de flujos principales con UI consistente | [#10](../issues/10) |
| 5. Arquitectura, música y rendimiento | P2 | Modularizar archivos grandes; Lavalink, métricas, errores, logs, memoria | Imports estables y ensayos completos de música y reinicio | [#11](../issues/11) |
| 6. Aceptación y único despliegue final | Bloqueante | Checklist VPS y Discord, backups/restores, revisión de variables y servicios, política de auto-update | Prueba final aprobada por propietario | [#6](../issues/6) |

**Nota de enlaces:** las incidencias reales están en
`https://github.com/SkuuIll/Prophet-Setup-DS/issues/<número>`; no mover ramas
de producción ni fusionar PRs automáticamente durante estas fases.

## Matriz de revisión de archivos

Mantener `docs/FILE_REVIEW_INVENTORY.csv` como registro de cobertura real. Para
cada archivo relevante, guardar al revisar:

1. **Responsabilidad**: qué hace y quién lo ejecuta.
2. **Entradas confiables/no confiables**: Discord, web, WS, env, DB, archivos.
3. **Riesgos**: permisos, concurrencia, fugas, inyecciones, secretos y regresiones.
4. **Pruebas**: unitarias, integración, manual y escenario de fallo.
5. **Código**: estructura, imports, tipado/validación, límites y logging.
6. **UX**: textos, estado de error/carga, accesibilidad, respuestas Discord.
7. **Resultado**: pendiente, revisado con hallazgos, corregido+testeado,
   o verificado; no confundir sintaxis con auditoría.

Para contenido vendorizado (`web/public/games/vendor/`) revisar **licencia,
origen, versión y controles de actualización**, sin modificar miles de líneas
de terceros manualmente ni atribuirles código propio. Revisar los cuatro
gitlinks rotos por separado (issue #5). Para assets revisar disponibilidad,
licencia, tamaños y rutas, no auditar como JavaScript.

## Criterios de calidad mínimos

- Ningún comando de administración sin controles de permisos coherentes entre
  `setDefaultMemberPermissions` y ejecución efectiva.
- Ningún endpoint que cree sesiones/dinero, cambie configuración o modifique
  Discord debe aceptar clientes no autenticados o sin autorización.
- No permitir que un error en banner, roles, Discord API o mensajes secundarios
  suprima el evento principal sin dejar log diagnosticable.
- Guardar saldos y movimientos de manera transaccional; nunca confiar en
  cantidades monetarias calculadas por el navegador.
- API/WS: inputs validados y acotados, tokens revocables, rate limits y métricas.
- Diseños: mismos nombres, botones, colores, iconos y tono editorial para casos
  equivalentes; mensajes claros en español rioplatense.
- Backups verificables con recuperación ensayada; Git nunca contiene secretos.
- Cambios de arquitectura en partes pequeñas, con compatibilidad de importación,
  sin borrados o reseteos masivos.

## Flujo de implementación y revisión

1. Leer y clasificar archivos por grupo (ver inventario).
2. Identificar problema y crear caso de prueba reproducible.
3. Corregir en rama/PR de trabajo; separar correcciones de refactors grandes.
4. Ejecutar sintaxis, tests, auditoría npm y comprobación de diffs.
5. Actualizar documentación y matriz por archivo.
6. Validar escenarios reales en un **entorno de ensayo separado**, si existe.
7. Corregir fallos y repetir hasta cumplir el criterio del área.
8. **Solo al final**, revisar checklist del issue #6 y obtener aceptación explícita
   para desplegar en producción.

Si se trabaja en muchos chats, las incidencias y este archivo preservan el estado;
no son garantía de que tareas pendientes se ejecuten automáticamente.

## Despliegue final y autoactualización del VPS

El primer despliegue requiere que el propietario siga
[`VPS_AUTO_DEPLOY.md`](VPS_AUTO_DEPLOY.md): guardar backup externo de SQLite y
`.env`, comprobar `git status --short`, llevar `main` a la revisión aceptada,
instalar cron UNA sola vez y ejecutar deploy supervisado. Antes de instalar cron,
no se descargan cambios automáticamente a la VPS.

La solución actual es **pull programado cada 2 minutos** (no push instantáneo
desde GitHub). Una vez habilitada, actualiza los cuatro procesos PM2 tras commits
fusionados a `main`, con rollback. Se debe comprobar que respeta archivos locales
y que el fallback del servidor funciona. Si se requiere despliegue instantáneo,
diseñar posteriormente un webhook autenticado/túnel seguro en vez de abrir SSH
público o subir llaves privadas a GitHub.

**Restricción del usuario:** no pedir ni ejecutar ninguna acción en producción
hasta completar el plan y contar con su aprobación final.

## Seguimiento

- [PR #4 — estabilización](https://github.com/SkuuIll/Prophet-Setup-DS/pull/4)
- [#5 — gitlinks rotos](https://github.com/SkuuIll/Prophet-Setup-DS/issues/5)
- [#6 — pruebas end-to-end y VPS](https://github.com/SkuuIll/Prophet-Setup-DS/issues/6)
- [#7 — seguridad y dependencias](https://github.com/SkuuIll/Prophet-Setup-DS/issues/7)
- [#8 — todos los comandos y eventos](https://github.com/SkuuIll/Prophet-Setup-DS/issues/8)
- [#9 — SQLite, economía y juegos](https://github.com/SkuuIll/Prophet-Setup-DS/issues/9)
- [#10 — UX, menús y redacción](https://github.com/SkuuIll/Prophet-Setup-DS/issues/10)
- [#11 — arquitectura, música y release](https://github.com/SkuuIll/Prophet-Setup-DS/issues/11)
