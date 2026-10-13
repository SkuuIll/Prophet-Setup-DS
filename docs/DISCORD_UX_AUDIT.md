# Prophet Gaming — auditoría y renovación de mensajes de Discord

**Estado: parcial en main.** No equivale a rediseño terminado del proyecto.

## Hallazgos y correcciones — 13 de octubre de 2026

- El menú `/ayuda` tenía 688 líneas y números de comandos escritos a mano; podía anunciar opciones obsoletas. Fue reemplazado por catálogo dinámico, con permisos efectivos, menú privado, categorías, páginas y expiración.
- El bot principal anota en cada comando la categoría real a partir de su carpeta.
- `utils/discordUI.js` centraliza tonos de color, avisos privados, recibos de economía y límites de embeds.
- Se rediseñaron `/balance`, `/deposit`, `/withdraw`, `/ping`, `/serverinfo` y los mensajes globales de permisos, cooldown y canal incorrecto.
- Las preguntas frecuentes recomendaban `/reporte`, `/editar-perfil`, `/badges` y `/ticket` como comandos. Esos textos fueron corregidos.
- La tabla `faq_entries` no tenía UNIQUE(question), por lo que INSERT OR IGNORE agregaba 10 registros nuevos en cada arranque. Ahora se actualiza por pregunta y categoría sin insertar duplicados adicionales; no se borran filas históricas sin respaldo.
- Se agregó un diagnóstico read-only de PM2 y categorías de errores de logs, sin imprimir líneas ni secretos.

## Inventario medible de todos los comandos

`node scripts/audit_discord_ui.js`

`node scripts/audit_discord_ui.js --details`

Devuelve las carpetas de comandos, el número de scripts, constructores de
embeds, respuestas interactivas y los archivos que ya usan el nuevo tema.
**Usar el helper no significa que cada respuesta del archivo esté ya rediseñada**;
hay que probar sus rutas y pantallas.

## Guía visual

- **Estilo:** Prophet Gaming, colores constantes según contexto (primary,
  success, warning, error, info, music). Evitar iconos y barras decorativas
  en exceso o banners diferentes para acciones equivalentes.
- **Jerarquía:** título breve, resultado en la primera frase, valores principales
  en campos y explicación clara de siguientes pasos.
- **Errores:** privados, sin stack traces, nombres de rutas internas ni secretos,
  con orientación concreta para resolver el problema.
- **Éxitos:** importes legibles, saldos reales y confirmaciones solo si el
  movimiento terminó correctamente.
- **Controles:** menos botones por fila, texto claro, categorías reales, páginas
  cortas, manejo de expiración y permisos verificados.
- **Accesibilidad:** la información no debe depender únicamente del color ni
  de emojis. Evitar bloques ASCII que se desalinean en teléfonos.
- **Interacciones:** mensajes de servidor públicos cuando corresponda;
  configuración, preferencias y errores personales mediante respuesta privada.
- **Ayuda:** tomar comandos disponibles de la colección realmente registrada,
  no anunciar funciones inexistentes.

## Pendientes

- [x] Biblioteca visual compartida y pruebas.
- [x] Menú de ayuda dinámico.
- [x] FAQ sin referencias muertas ni inserciones duplicadas.
- [x] Primera migración de cartera, banco, estado y servidor.
- [ ] Revisar individualmente el resto de comandos del bot principal y musical.
- [ ] Normalizar moderación, tickets, sorteos, perfiles y notificaciones.
- [ ] Validar Canvas de entrada/salida e imágenes reales en Discord.
- [ ] Actualizar UI mobile/responsive del dashboard y juegos.
- [ ] Verificar menús, permisos y colectores en un servidor de ensayo real.

El código solo cambia **nuevos mensajes enviados después de desplegarlo**;
no edita retrospectivamente mensajes publicados en canales.

## Diagnóstico del servidor real sin secretos

El script nuevo `scripts/diagnose_runtime.js` consulta PM2, logs y endpoints
locales sin cambios de estado. Se recomienda que la IA de la VPS lo ejecute
tras sincronizar una copia de main, con:

`PROPHET_DIAGNOSTIC_ROOT=/root/ProphetBot node /root/ProphetBot-Revision/scripts/diagnose_runtime.js`

Este informe muestra el commit activo y errores por categoría, **no verifica**
automáticamente Server Members Intent en el portal Discord ni confirma envíos
de bienvenidas, despedidas o reproducción Lavalink. Para ello siguen siendo
necesarias pruebas reales en el servidor.

Seguimiento: https://github.com/SkuuIll/Prophet-Setup-DS/issues/10
