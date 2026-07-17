# ProphetBot - Project Context & Architecture

Este documento provee un contexto global, detallado y seguro del proyecto para cualquier Inteligencia Artificial o nuevo desarrollador que quiera contribuir, sin exponer credenciales ni datos confidenciales.

## 1. Visión General del Proyecto
**ProphetBot** es el núcleo automatizado de la comunidad Prophet Gaming. No es solo un bot de música o de moderación, sino un sistema monolítico e integral que maneja todo el backend del servidor de Discord: 
- Economía y Niveles.
- Moderación y Logs.
- Sistema de Tickets y Sorteos.
- Integraciones complejas con juegos (PUBG, CS2, Steam, Riot Games).
- Webhooks de monitoreo de streamers (Twitch) y YouTube.
- Un panel web de control (Dashboard).

## 2. Pila Tecnológica (Tech Stack)
- **Entorno:** Node.js v18+.
- **Core:** `discord.js` v14.
- **Base de Datos:** SQLite3 implementado de manera sincrónica usando la librería ultra-rápida `better-sqlite3`.
- **Música:** `discord-player` v7 con dependencias de FFmpeg y extracciones nativas por `yt-dlp` (para bypass de YouTube). Soporte para Lavalink mediante `shoukaku`.
- **Panel Web:** Express.js, JWT, Helmet (Seguridad web).
- **Procesamiento de imágenes:** `canvas` / `@napi-rs/canvas`.

## 3. Topología de Archivos
```text
ProphetBot/
├── commands/            # Comandos Slash (Interacciones)
│   ├── admin/           # Comandos exclusivos para el Staff
│   ├── context/         # Comandos de menú contextual (Clic derecho)
│   ├── economy/         # Tienda, balance, pagos
│   ├── fun/             # Memes, juegos, 8ball, etc.
│   ├── levels/          # Tarjetas de nivel, ranking
│   ├── mod/             # Bans, mutes, warnings
│   ├── music/           # Reproductor musical
│   └── utility/         # Perfiles, reportes, estadísticas, integraciones
├── events/              # Event listeners de Discord.js
│   ├── guildMemberAdd.js    # Sistema de bienvenida y anti-raid
│   ├── interactionCreate.js # Despachador de botones, modales y slash commands
│   ├── messageCreate.js     # Experiencia, anti-spam y moderación avanzada
│   └── ...
├── modules/             # Sistemas Core (Motores y lógica)
│   ├── musicEngine.js   # Wrapper de discord-player
│   ├── onboarding.js    # Flujo guiado para nuevos miembros
│   ├── profileSystem.js # Manejo de perfiles complejos
│   ├── pubgApi.js       # Integración con endpoints de Bluehole
│   ├── twitchMonitor.js # Polling al API de Twitch (Helix)
│   └── ...
├── web/                 # Dashboard HTTP
│   ├── authRoutes.js    # Logins y Auth via Discord OAuth2
│   ├── security.js      # Middleware de rate-limits y seguridad criptográfica
│   └── server.js        # Arranque del webserver
├── database.js          # Conexión local a SQLite y funciones (Prepared Statements)
├── config.js            # Configuración dinámica del servidor
└── index.js             # Punto de entrada.
```

## 4. Flujos Clave del Sistema

### 4.1. Configuración Dinámica (`config.js`)
El bot no usa IDs hardcodeados de roles o canales en su código fuente para permitir fácil portabilidad.
- En `config.js`, los roles y canales se definen mediante **strings** (nombres exactos, incluyendo emojis). 
- Cuando el bot arranca (`index.js`), llama a `resolverIDs()` que busca estos nombres en la caché del servidor y muta el objeto `config` sustituyendo el nombre por el ID real.

### 4.2. Base de Datos (`database.js`)
Se utiliza un modo seguro (WAL mode en SQLite) para manejar grandes cantidades de lecturas/escrituras.
Todo el acceso se hace mediante un objeto exportado llamado `stmts` que contiene sentencias pre-compiladas (Ej: `stmts.getUser(id)`). 
**Regla Estricta:** Nunca hacer consultas dinámicas sin `prepare()`. 

### 4.3. Moderación y Eventos (`interactionCreate.js` & `messageCreate.js`)
- En `interactionCreate.js`, se despachan no solo comandos, sino respuestas a botones de reportes, tickets y menús de auto-roles. Hay mecanismos de validación (`rolesProtegidos`) para impedir que los usuarios se den a sí mismos roles como VIP, ADMIN o STAFF explotando botones de Discord.
- En `messageCreate.js` convive el Anti-spam, el otorgamiento de XP (con cool-downs y penalizaciones) y las respuestas automáticas.

## 5. Prácticas para Futuros Desarrollos
1. **Seguridad Ante Todo:** El código open-source no debe incluir el `.env`. Si creas un nuevo comando administrativo, asegúrate de validar permisos usando `interaction.member.permissions.has(PermissionFlagsBits.Administrator)` o comprobando si el usuario es STAFF.
2. **Discord.js v14:** Respeta el uso de los constructores `*Builder` (`EmbedBuilder`, `ActionRowBuilder`, etc.).
3. **Manejo de Errores UX:** Si un usuario usa mal un comando o falla una API, el bot debe informarlo con elegancia en lugar de fallar silenciosamente. Siempre `catch(error)` y enviar un mensaje al usuario o al canal de logs.
