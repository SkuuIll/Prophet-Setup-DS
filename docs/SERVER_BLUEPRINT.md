# Server Blueprint

Base profesional para `Prophet Gaming` y `ProphetBot`.

## Objetivo

- mantener una estructura clara de canales
- evitar drift de permisos
- alinear la config persistida del bot con la realidad del servidor
- dejar una convención simple para futuras mejoras

## Estructura recomendada

### Información
- `👋・bienvenidos`: solo lectura pública
- `📜・reglas`: solo lectura pública
- `📢・anuncios`: abierto por restricción actual de `Onboarding`
- `🏷️・roles`: solo lectura pública
- `📁・archivos`: escritura pública con adjuntos

### Comunidad
- `💬・chat`: escritura pública
- `💎・chat-vip`: privado para `VIP`
- `🖼️・multimedia`: escritura pública con adjuntos
- `❓・soporte`: escritura pública con adjuntos
- `🤖・bot-comandos`: escritura pública con adjuntos
- `🖥️・streams`: solo lectura pública
- `💡・sugerencias`: solo lectura pública, votos por reacciones
- `🕵️・confesiones`: solo lectura pública
- `🔢・counting`: escritura pública sin adjuntos ni embeds

### Staff
- `🛡️・chat-staff`
- `📋・reportes`
- `⚙️・logs`

### Voz
- `🔈・Lobby`
- `➕ Crear Sala`
- categoría `⟬🔊⟭ ═══ 𝗦𝗔𝗟𝗔𝗦 𝗧𝗘𝗠𝗣𝗢𝗥𝗔𝗟𝗘𝗦 ═══`

## Config que debe quedar persistida

- `SUGERENCIAS_CHANNEL`
- `CONFESIONES_CHANNEL`
- `COUNTING_CHANNEL`
- `LOGS`
- `COMANDOS_BOT`
- `REPORTES`
- `STAFF`
- `BIENVENIDOS`
- `ANUNCIOS`
- `CHAT`
- `REGLAS`
- `ROLES`
- `voice_generator_id`
- `voice_category_id`

## Script de control

Archivo:

- `scripts/server_blueprint.js`

Modos:

- auditoría:
  - `node scripts/server_blueprint.js`
- aplicación:
  - `node scripts/server_blueprint.js --apply`

## Qué corrige el script

- crea canales faltantes del blueprint
- mueve canales a su categoría correcta
- corrige permisos base de `@everyone`
- corrige permisos de staff en canales sensibles
- guarda IDs correctos en la config persistida

## Limitación conocida

`📢・anuncios` no puede cerrarse completamente a escritura pública mientras `Discord Onboarding` exija un canal escribible para `@everyone`.

Si se quiere cerrar:

1. revisar y actualizar onboarding
2. volver a correr `node scripts/server_blueprint.js --apply`
