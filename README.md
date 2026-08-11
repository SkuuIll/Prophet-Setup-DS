<div align="center">

<img src="assets/logo.png" width="140" height="140" alt="Prophet Bot" style="border-radius: 50%;">

# Prophet Bot v3.0

**El asistente definitivo para Prophet Gaming.**\
Música · Moderación · Economía · Niveles · Mini-juegos · Utilidades — todo en un solo bot.

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/Node.js-v22-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![PM2](https://img.shields.io/badge/PM2-Production-2B037A?style=for-the-badge&logo=pm2&logoColor=white)](https://pm2.keymetrics.io)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)
[![License](https://img.shields.io/badge/Licencia-Privada-EF5350?style=for-the-badge)](#-licencia)

<br>

<img src="assets/banner.png" width="600" alt="Prophet Gaming Banner">

</div>

---

## 📋 Tabla de contenidos

- [Descripción](#-descripción)
- [Características](#-características)
- [Comandos](#-comandos)
- [Stack Técnico](#-stack-técnico)
- [Instalación](#-instalación)
- [Configuración VPS](#-configuración-vps-producción)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Base de Datos](#-base-de-datos)
- [Dashboard Web](#-dashboard-web)
- [Changelog](#-changelog)
- [Licencia](#-licencia)

---

## 🎯 Descripción

**Prophet Bot** es una solución *todo-en-uno* construida exclusivamente para **Prophet Gaming**. No es solo un bot de moderación: es el corazón digital de la comunidad — integrando un sistema de economía completo, reproductor de música de alta fidelidad, niveles con roles automáticos, mini-juegos interactivos, herramientas de utilidad avanzadas, sistema de perfiles con badges y achievements, IA integrada, y moderación automática inteligente, todo con un diseño visual premium y branding consistente.

### ¿Por qué Prophet Bot?

| | Característica | Detalle |
|---|---|---|
| 🎨 | **Diseño Premium** | Todos los mensajes usan embeds con colores, animaciones de suspense y branding Prophet |
| 🇦🇷 | **100% en Español** | Argentino, con voseo y expresiones locales |
| 🛡️ | **Auto-Mod Inteligente** | Detección de spam, raids, phishing, Zalgo, emoji flood y más |
| 📊 | **Métricas en vivo** | Leaderboards de XP y economía con posición propia destacada |
| 💾 | **SQLite** | Base de datos robusta, migrada desde JSON con transacciones atómicas |
| 🎵 | **Multi-Bot Architecture** | Bot de música 100% independiente (`ProphetMusic`) corriendo en paralelo |
| ⏰ | **Recordatorios** | Sistema de DM con timer flexible y hasta 10 activos por usuario |
| 🌐 | **Traducciones** | 10 idiomas, bola mágica, definiciones, QR codes y más utilidades |
| 🤖 | **IA Integrada** | Asistente conversacional, búsqueda semántica en historial |
| 🏆 | **Sistema de Perfiles** | 24 badges, 11 achievements, 7 quests diarias |
| 🎮 | **Integraciones Gaming** | Steam, Riot Games (LoL), calendario de eventos |
| 🌐 | **Dashboard Web** | Panel de administración con seguridad robusta |

---

## ✨ Características

### 🎵 Reproductor de Música — *Prophet Music Engine v4.0 (Dual-Bot)*

<table>
<tr><td width="50%">

- **Proceso Independiente:** Corre bajo su propio bot y token (`ProphetMusic`) para rendimiento 100% sin lag, sin interrumpir los comandos principales
- Soporte Multi-Plataforma: YouTube, Spotify, SoundCloud, Apple Music, Vimeo
- Panel de control **Ultra Compacto** con 10 botones sin spam
- Barra de progreso visual y timestamp en tiempo real
- Loop, shuffle, replay, volumen dinámico y filtros (`/filter`)
- Filtro anti-spam inteligente para notificaciones de "Agregada a la cola"
- Historial de reproducción por servidor

</td><td width="50%">

```
🎵 Reproduciendo ahora
━━━━━━━━━╸━━━━━━ 3:24 / 5:12

⏮️ ⏯️ ⏭️ ⏹️ 🔄
🔁 🔀 🔉 🔊 📋

Cola: 5 temas · 23m restantes
Vol: ▰▰▰▰▰▰▰▱▱▱ 70%
```

</td></tr>
</table>

---

### 💰 Sistema de Economía

Un ecosistema financiero completo con animaciones y feedback visual:

| Comando | Mejoras v2.8 |
|---|---|
| `/balance` | Etiqueta de riqueza dinámica (🌱→👑), barra efectivo/banco |
| `/daily` | Barra de cooldown con porcentaje + frases motivacionales |
| `/work` | 18 trabajos, barra por segundos, conceptos de salario |
| `/gamble` | Animación de casino (1.6s suspense) + 10 frases aleatorias |
| `/pay` | **Confirmación con botones** + DM automático al receptor |
| `/deposit` / `/withdraw` | Acepta `todo`, barra de distribución post-transacción |
| `/shop` | Indicadores ✅/🔒 por fondos, déficit exacto, live update |
| `/inventory` | Items ordenados por rareza, descripción por ítem |
| `/ecotop` | Barra de riqueza relativa al #1, tier label, tu posición |

---

### 📈 Sistema de Niveles y XP

| Comando | Descripción |
|---|---|
| `/nivel` | Tarjeta canvas premium con glow ring, barra XP degradada y stats |
| `/top` | Leaderboard con mini-barra XP, rango (🌱→👑), tu posición destacada |

**Sistema automático:**
- XP por mensaje con cooldown anti-abuse
- Level-up con notificación embed + asignación automática de roles
- Canvas premium para tarjetas de nivel y bienvenida

---

### 🏆 Sistema de Perfiles *(v2.9)*

Sistema gamificado con **badges, achievements y quests**:

| Componente | Cantidad | Descripción |
|---|---|---|
| **Badges** | 24 | Insignias coleccionables (Fundador, Veterano, Booster, etc.) |
| **Achievements** | 11 | Logros desbloqueables con recompensas XP/coins |
| **Quests** | 7 diarias | Misiones con progreso automático y premios |

**Comandos:**
- `/perfil` — Ver perfil completo con badges y stats
- `/badges` — Galería de insignias coleccionables
- `/achievements` — Progreso de logros
- `/quests` — Misiones activas y completadas

---

### 🤖 IA Integrada *(v2.9)*

| Comando | Descripción |
|---|---|
| `/asistente` | Chat con IA para preguntas generales (Gemini API) |
| `/buscar` | Búsqueda semántica en historial de mensajes del servidor |

---

### 🎮 Integraciones Gaming *(v2.9)*

| Comando | Descripción |
|---|---|
| `/steam` | Perfil Steam, juegos, logros recientes |
| `/lol` | Stats de League of Legends (rank, winrate, campeones) |
| `/evento` | Sistema de eventos con calendario y recordatorios |

---

### 💎 Sistema Premium *(v2.9)*

Sistema de suscripción opcional con Mercado Pago:

- Badges exclusivos para premium
- Mayor límite de recordatorios
- Acceso anticipado a nuevas funciones
- Comandos y minijuegos sin ads ni cooldowns largos

---

### 🛡️ Moderación y Seguridad

| Comando | Descripción |
|---|---|
| `/ban` | Ban permanente — DM al usuario, log a DB, avatar en embed |
| `/tempban` | Ban temporal — countdown Discord, desbaneo automático |
| `/kick` | Expulsión — DM + log |
| `/mute` | Timeout temporal — timer relativo, duración formateada |
| `/warn` | Advertencia — auto-mute/kick al llegar al límite |
| `/warns` | Historial con fechas y moderadores |
| `/clear` / `/purge` | Borrar mensajes con filtros avanzados (bots, links, etc.) |
| `/reporte` | **Reporte anónimo** de usuarios al canal de Staff con botones de acción |

**Sistemas automáticos de protección:**

| Sistema | Filtros |
|---|---|
| 🛡️ **Anti-Spam** | Flood, invites, links no whitelistados, menciones masivas, mayúsculas |
| 🧠 **Auto-Mod Inteligente** | Emoji flood (+15), texto Zalgo, chars repetidos, frases de phishing |
| 🚨 **Anti-Raid** | Alerta automática + **lockdown automático** (verificationLevel HIGH por 5min) |
| 📝 **Logs automáticos** | Mensajes eliminados/editados, entradas/salidas de miembros |

---

### 🎮 Entretenimiento & Gaming

| Comando | Mejoras v2.8 |
|---|---|
| `/blackjack` | Cartas en backtick, fuerza de mano, refund en timeout, headers `##` |
| `/coinflip` | Animación de suspense 1.8s, frases aleatorias, colores dinámicos |
| `/rps` | Embed rico, botones coloreados post-juego, frases aleatorias |
| `/tictactoe` | Línea ganadora verde, colores por jugador, turno forzado |
| `/8ball` | **2s suspense**, 19 respuestas, distribución ponderada, veredicto 🟢🟡🔴 |
| `/pubg` | Stats Lifetime, Temporadas, Partidas, Replays 2D |
| `/buscar-grupo` | LFG interactivo con botón de unión |

---

### 🔧 Utilidades — *Suite Completa*

| Comando | Descripción |
|---|---|
| `/ping` | Barra de latencia, uptime con días, RAM usado/total |
| `/ayuda` | Menú por categoría con deferReply y estado de ping en footer |
| `/recordatorio` | DM programado (10s–7d), acepta `10m`, `1h30m`, `2d`, etc. |
| `/recordatorio-lista` | Ver activos con botones 🗑️ para cancelar, se actualiza en vivo |
| `/hilo` | Crear hilos públicos o privados con auto-archive configurable |
| `/calc` | Calculadora segura: `+−×÷ ** √ ()` sin eval, con separadores de miles |
| `/color` | Preview de `#HEX`, `#RGB` o `rgb(r,g,b)` → HEX/RGB/HSL + nombre del color |
| `/clip` | Embed rico para YouTube (thumbnail auto), Twitch, Medal, Streamable, Imgur |
| `/traductor` | 10 idiomas, auto-detect origen, calidad 🟢🟡🔴 — MyMemory API |
| `/definir` | Definiciones en ES/EN — Free Dictionary API + Wiktionary fallback |
| `/qr` | QR code con colores Prophet, 3 tamaños, sin npm extra |
| `/estadísticas` | Barra miembros/bots, top-3 XP y economía en vivo, estado del bot |
| `/cumpleaños-lista` | Ordenado por días restantes, 🔔 próximos, 🎉 hoy |
| `/userinfo` / `/serverinfo` | Info detallada con campos enriquecidos |
| `/afk` | Modo ausente con notificación automática y duración |
| `/snipe` | Recuperar último mensaje borrado |
| `/suggest` | Sugerencias con votación ✅/❌ |
| `/embed` | Constructor de embeds personalizados |

---

### 🎙️ Canales Dinámicos (Join-To-Create)

- Los usuarios se unen a `➕ Crear Sala` y el bot les genera un canal de voz privado instantáneo
- El canal se elimina **automáticamente al quedar vacío**
- Estados de voz gaming random automáticos: `🤬 Modo Tóxico ON`, `📉 Perdiendo RP...`, `💀 Carreados por el team` y 40+ más

### ⚙️ Administración

| Comando | Descripción |
|---|---|
| `/setup-tickets` | Panel de tickets con sistema de soporte privado |
| `/setup-counting` | Juego de contar con celebraciones cada 100 |
| `/setup-confesiones` | Canal de confesiones anónimas |
| `/reactionroles` | Panel de auto-roles con botones |
| `/trollnick` | Sistema de apodos tóxicos argentinos para Nivel 10+ (Con Auto-Troll) |
| `/memoria` | Ver logs internos del bot |
| `/botstats` | Ver estado de CPU/RAM del bot |
| `/configurar-*` | Sistema de Alertas Automáticas (Twitch, YouTube, Servers) |

---

### 💎 Sistema de Boost Rewards *(automático)*

Cada vez que alguien boostea el servidor:
- 💰 Recibe **coins automáticos** (configurable en `config.js`)
- 📩 **DM de agradecimiento** con embed premium
- 📢 **Anuncio público** en el canal de bienvenida/general

---

## 📋 Comandos

```
📁 admin/      12 comandos    ⚙️  Configuración y setup del servidor
📁 economy/    10 comandos    💰 Sistema financiero completo
📁 fun/        10 comandos    🎉 Juegos y entretenimiento
📁 gaming/      2 comandos    🎮 Estadísticas de juegos (PUBG, CS2)
📁 levels/      2 comandos    📈 Niveles y leaderboard
📁 mod/         9 comandos    🛡️  Moderación y seguridad
📁 music/      10 comandos    🎵 Reproductor de música
📁 utility/    42 comandos    🔧 Herramientas y utilidades

Total: 97 comandos
```

---

## 🛠️ Stack Técnico

| Tecnología | Versión | Uso |
|---|---|---|
| **Node.js** | v22.x | Runtime |
| **discord.js** | v14.25 | API de Discord |
| **better-sqlite3** | v12.8 | Base de datos SQLite |
| **shoukaku** | v4.3 | Cliente Lavalink para música |
| **discord-player** | v7.2 | Reproductor de música alternativo |
| **canvas** | v3.2 | Tarjetas de nivel y bienvenida |
| **PM2** | v6.x | Process manager (producción) |
| **dotenv** | v17.3 | Variables de entorno |
| **node-schedule** | v2.1 | Tareas programadas |

---

## 🚀 Instalación

### Prerrequisitos

- **Node.js** v18+ ([descargar](https://nodejs.org/))
- **Lavalink** corriendo (para música) — incluido en `Lavalink/`
- Una **aplicación de Discord** con bot token ([Discord Developer Portal](https://discord.com/developers/applications))

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/SkuuIll/Prophet-Setup-DS.git
cd Prophet-Setup-DS

# 2. Instalar dependencias
npm install

# 3. Crear archivo de entorno
cat > .env << EOF
DISCORD_TOKEN=tu_token_principal_aqui
DISCORD_MUSIC_TOKEN=tu_token_bot_musica_aqui
GUILD_ID=id_del_servidor
EOF

# 4. Configurar el bot
#    Editá config.js con los IDs de tu servidor
nano config.js

# 5. Iniciar Lavalink (para música)
java -jar Lavalink/Lavalink.jar &

# 6. Iniciar (desarrollo)
node index.js

# 7. Iniciar (producción con PM2)
pm2 start ecosystem.config.js
pm2 save
```

---

## 🖥️ Configuración VPS (Producción)

### Requisitos mínimos

| Recurso | Mínimo | Recomendado |
|---|---|---|
| **RAM** | 512 MB | 2 GB+ |
| **CPU** | 1 vCPU | 2 vCPU |
| **Disco** | 5 GB | 20 GB |
| **OS** | Ubuntu 22.04+ | Ubuntu 24.04 |

### Setup automático

```bash
apt update && apt install -y nodejs npm ffmpeg default-jdk
npm install -g pm2

git clone https://github.com/SkuuIll/Prophet-Setup-DS.git /root/ProphetBot
cd /root/ProphetBot
npm install

cat > .env << EOF
DISCORD_TOKEN=tu_token_principal_aqui
DISCORD_MUSIC_TOKEN=tu_token_bot_musica_aqui
GUILD_ID=id_servidor
EOF

# Editar config.js con IDs reales
nano config.js

# Iniciar Lavalink
cd Lavalink && java -jar Lavalink.jar &
cd ..

pm2 start ecosystem.config.js
pm2 startup && pm2 save
```

### Comandos de gestión

```bash
pm2 status                # Ver estado
pm2 logs ProphetBot       # Logs en tiempo real
pm2 restart ProphetBot    # Reiniciar
pm2 monit                 # Monitor CPU/RAM
```

---

## 📂 Estructura del Proyecto

```
ProphetBot/
│
├── 📁 assets/                  # Recursos visuales
│   ├── banner.png              # Banner del servidor (welcome card)
│   ├── logo.png                # Logo del bot
│   ├── music_banner.png        # Banner del reproductor
│   └── 📁 sounds/             # Sonidos para /bardeo y /confesion
│
├── 📁 commands/                # 100 Slash Commands (10 carpetas)
│   ├── 📁 admin/      (14)    # Setup de tickets, voz, roles, Twitch, YouTube
│   ├── 📁 context/     (3)    # Menús de clic derecho (reportar, perfil, coins)
│   ├── 📁 economy/     (9)    # Balance, daily, work, gamble, shop, pay, bank
│   ├── 📁 fun/        (14)    # 8ball, coinflip, rps, tictactoe, blackjack, meme
│   ├── 📁 gaming/      (5)    # Steam, LoL, VALORANT, CS2, PUBG stats
│   ├── 📁 mod/         (9)    # Ban, kick, mute, warn, purge, tempban
│   ├── 📁 music/       (9)    # Play, queue, skip, stop, volumen, filter
│   ├── 📁 profile/     (6)    # Perfil, nivel, ranking, misiones, premium, rep
│   └── 📁 utility/    (31)    # Ping, recordatorio, calc, color, qr, IA, etc.
│
├── 📁 events/                  # 17 Event Handlers
│   ├── guildMemberAdd.js       # Bienvenida canvas + anti-raid + boost rewards
│   ├── guildMemberUpdate.js    # Boost rewards + log de roles/apodos
│   ├── interactionCreate.js    # Router de slash commands y botones
│   ├── messageCreate.js        # XP, AFK, anti-spam, auto-mod, counting
│   ├── messageDelete.js        # Log + snipe
│   ├── voiceStateUpdate.js     # Canales dinámicos + estados gaming + logs
│   └── ...                     # +11 event handlers más
│
├── 📁 modules/                 # 30 Módulos de lógica
│   ├── musicEngine.js          # Motor de música (discord-player + Shoukaku)
│   ├── antispam.js             # Anti-spam (10 filtros), anti-raid
│   ├── leveling.js             # Cálculo de XP, niveles y roles
│   ├── trollNicknames.js       # Sistema de apodos trol argentinos
│   ├── profileSystem.js        # Badges, achievements, quests
│   ├── aiChat.js               # Chat con IA (Gemini)
│   ├── twitchMonitor.js        # Monitor de streams en vivo
│   ├── youtubeMonitor.js       # Monitor de videos nuevos
│   ├── gameServerMonitor.js    # Monitor de servidores de juegos
│   └── ...                     # +21 módulos más
│
├── 📁 scripts/                 # 29 Scripts one-shot y herramientas
│   ├── deploy.sh               # Deploy automatizado
│   ├── auto_update.sh          # Auto-update con git pull
│   ├── backup_database.js      # Backup de SQLite
│   ├── send_staff_commands.js  # Postea guía de comandos en staff
│   ├── update_bot_channel.js   # Actualiza canal de comandos
│   └── ...                     # +24 scripts más
│
├── 📁 test/                    # 7 Tests unitarios
│   ├── musicResolver.test.js   # Tests del resolver de música
│   ├── trollNicknames.test.js  # Tests del sistema trol
│   └── ...                     # +5 tests más
│
├── 📁 utils/                   # 10 Utilidades compartidas
│   ├── canvas.js               # Tarjetas de nivel + welcome card premium
│   ├── musicResolver.js        # Resolver de URLs de música
│   ├── PaginationBuilder.js    # Paginación de embeds
│   └── ...                     # +7 utilidades más
│
├── 📁 web/                     # Dashboard web interno
│   ├── server.js               # Servidor HTTP Express
│   ├── secureServer.js         # Servidor seguro con JWT/RBAC
│   ├── security.js             # Sistema de seguridad completo
│   └── ...                     # +4 archivos web
│
├── 📁 Lavalink/                # Servidor de audio
│   ├── Lavalink.jar            # Servidor Lavalink
│   └── application.yml         # Configuración
│
├── 📁 data/                    # Datos persistentes (gitignored)
│   └── prophet.sqlite          # Base de datos SQLite
│
├── ⚙️ config.js                # IDs de canales, roles, colores, economía
├── 💾 database.js              # Motor SQLite con migraciones y WAL
├── 🚀 index.js                 # Entry point — ProphetBot (bot principal)
├── 🎵 music_bot.js             # Entry point — ProphetMusic (bot de música)
├── 📦 ecosystem.config.js      # Config PM2 (3 procesos: Bot + Lavalink + Music)
└── 📦 package.json             # Dependencias
```

---

## 💾 Base de Datos

Prophet Bot usa **SQLite** (vía `better-sqlite3`) con modo WAL para máximo rendimiento y migración automática desde la DB legacy JSON.

### Tablas principales

| Tabla | Descripción |
|---|---|
| `users` | XP, nivel, mensajes, balance, banco, cooldowns, cumpleaños, preferencias |
| `user_inventory` | Items por usuario |
| `user_preferences` | Timezone, idioma, configuraciones de IA |
| `user_badges` | Badges desbloqueados |
| `user_achievements` | Progreso de achievements |
| `user_quests` | Quests activas y completadas |
| `warns` | Historial de advertencias |
| `giveaways` / `giveaway_entries` | Sorteos activos con soporte multi-ganador |
| `tickets` | Tickets de soporte abiertos |
| `tempbans` | Bans temporales pendientes de expirar |
| `temp_channels` | Canales de voz temporales activos |
| `reaction_roles` | Paneles de auto-roles |
| `starboards` | Mensajes destacados |
| `twitch_subs` | Suscripciones a streamers |
| `youtube_subs` | Suscripciones a canales de YouTube |
| `github_subs` | Suscripciones a repositorios |
| `game_servers` | Monitores de servidores de juegos |
| `reminders` | Recordatorios programados |
| `analytics_daily` | Métricas diarias |
| `command_metrics_daily` | Estadísticas de comandos |
| `health_checks` | Estado de servicios |

---

## 🌐 Dashboard Web

El bot incluye un dashboard web interno accesible solo desde localhost:

```
🌐 Dashboard interno: http://127.0.0.1:3789/dashboard
```

### Características del Dashboard

- Estado en tiempo real del bot
- Métricas del servidor
- Gestión de monitores (Twitch, YouTube, GitHub, Game Servers)
- Logs de actividad

### Sistema de Seguridad

El dashboard seguro (`web/secureServer.js`) incluye:

| Medida | Implementación |
|---|---|
| **Autenticación** | JWT + Refresh tokens |
| **Contraseñas** | PBKDF2 con 100,000 iteraciones |
| **Rate Limiting** | 5 intentos de login, bloqueo 30min |
| **CSRF** | Tokens por sesión |
| **XSS** | Sanitización + CSP headers |
| **RBAC** | 5 roles: superadmin, admin, moderator, editor, viewer |
| **Auditoría** | Logs de todos los eventos de seguridad |

---

## 🎨 Paleta de colores

| Color | Hex | Uso |
|---|---|---|
| 🟣 Principal | `#BB86FC` | Mensajes generales, música, economía |
| 🟢 Éxito | `#69F0AE` | Acciones completadas, confirmaciones |
| 🔴 Error | `#EF5350` | Errores, bans, expulsiones |
| 🟡 Advertencia | `#FFB74D` | Warns, mutes, cooldowns |
| 🔵 Info | `#42A5F5` | Logs, información neutral |
| 🩷 Boost | `#FF73FA` | Boost rewards y anuncios |

---

## 📝 Changelog

### v3.0 — *Arquitectura Dual-Bot & Nuevos Sistemas*

**🚀 Arquitectura Dual-Bot (Nuevo Motor PM2):**
- **ProphetMusic Independiente**: La música ahora se ejecuta en un proceso de Node.js 100% independiente con su propio Bot (App de Discord), asegurando que los comandos de música o carga extrema nunca saturen al bot principal.
- **Interacción fluida**: Podés escuchar música mientras el bot principal interactúa en el mismo canal (ej. `/confesion`, `/bardeo`) sin que se corte el audio.

**🆕 Nuevos Sistemas y Comandos:**
- 🎭 **Sistema Trollnick**: `/trollnick` — Asignación automática de apodos tóxicos/trols argentinos (ej: `Manco`, `Cornudo`) para usuarios nivel 10+ al conectarse a voz. Incluye modo `toggle`, forzado y restore.
- 📡 **Monitor de Servidores**: `/monitor-servidor` — Sistema para monitorear servidores de juegos (CS2, Minecraft, Rust) y enviar alertas si se caen.
- 🟪 **Notificaciones Twitch/YouTube**: `/configurar-twitch` y `/configurar-youtube` — Auto posteo cuando hay nuevos directos o videos.
- 🚀 **Ascensor**: `/ascensor` — Comando rápido para mover a todos los usuarios de un canal de voz a otro.

**✨ Mejoras Ultra y UX:**
- 🎵 **Music Player v4.0**: Interfaz mucho más compacta y limpia (se removió el banner gigante).
- 🧹 **Anti-Spam de Música**: El sistema ya no manda doble mensaje de "Agregada a la cola" si la cola estaba vacía. Los avisos de cola se auto-borran a los 12 segundos.
- 🛡️ **Logs de Voz Inteligentes**: Arreglado el bug de `# desconocida` al borrar salas temporales. Ahora guarda nombres en texto plano (`🔊 Sala de...`).
- 🤖 **Dashboard Staff**: Nuevo comando interno para postear la guía de los +50 comandos divididos en dos paneles.

### v2.9 — *IA, Integraciones y Perfiles*

**🆕 Nuevas funcionalidades:**
- 🤖 **IA Integrada** — `/asistente` para chat con IA, `/buscar` para búsqueda semántica en historial
- 🏆 **Sistema de Perfiles** — 24 badges, 11 achievements, 7 quests diarias con `/perfil`, `/badges`, `/achievements`, `/quests`
- 🎮 **Integraciones Gaming** — `/steam` para perfiles Steam, `/lol` para stats de League of Legends
- 📅 **Calendario de Eventos** — `/evento` para crear y gestionar eventos con recordatorios
- 💎 **Sistema Premium** — Integración con Mercado Pago para suscripciones
- 🌐 **Dashboard Web** — Panel de administración interno con seguridad robusta

**🐛 Bug Fixes:**
- ✅ **Sistema de cumpleaños** — Corregido typo `cumplanHoy` → `cumplenHoy` que causaba `ReferenceError` silencioso cada medianoche; corregido timezone a UTC-3 (Argentina)
- ✅ **Cooldown de XP** — `last_xp` ahora se persiste correctamente en la DB (columna faltante); el cooldown anti-abuse funciona como corresponde
- ✅ **Sorteos** — Corregida race condition donde un sorteo podía quedar marcado terminado sin anunciar ganador si había error de red
- ✅ **Canales de voz temporales** — Ya no quedan canales huérfanos tras reiniciar el bot; se limpian automáticamente al boot y se persisten en la tabla `temp_channels`
- ✅ **Select menu de roles** — Ya no depende de búsqueda por nombre de rol; usa IDs de `config.ROLES_JUEGOS` con fallback inteligente

**✨ Mejoras:**
- 🔒 **Anti-Raid activo** — Al detectar un raid, sube automáticamente el `verificationLevel` del servidor a HIGH por 5 minutos y lo restaura solo
- 🏆 **Sorteos multi-ganador** — `/sorteo` tiene parámetro `ganadores` (1–10) para sorteos con múltiples premios
- ⚡ **Optimizaciones internas** — Limpieza de logs con 1 query (antes 2), antispam Map limpiado cada 60s (antes 5min)
- 🔑 **`GUILD_ID` en `.env`** — Ya no hardcodeado en `config.js`
- 🧹 **Imports dinámicos** — Todos los `require()` movidos al top de sus archivos para mejor legibilidad
- 🗄️ **DB**: nuevas tablas `temp_channels`, `user_badges`, `user_achievements`, `user_quests`, `user_preferences` + migrations automáticas

### v2.8 — *Marzo 2026*

**🆕 Nuevas utilidades:**
- `/recordatorio` — DM programado con timer flexible (`10m`, `1h30m`, `2d`, etc.)
- `/recordatorio-lista` — Ver y cancelar recordatorios activos con botones
- `/hilo` — Crear hilos públicos o privados con auto-archive
- `/calc` — Calculadora segura con soporte para `√`, `**`, paréntesis
- `/color` — Preview visual de cualquier color HEX/RGB con conversión completa
- `/clip` — Embed rico para compartir clips (YouTube con thumbnail, Twitch, Medal, Streamable)
- `/traductor` — 10 idiomas, auto-detect, calidad de traducción
- `/definir` — Diccionario ES/EN con Free Dictionary API + Wiktionary
- `/qr` — QR code estilizado con colores Prophet
- `/reporte` — Reportes anónimos al Staff con botones de acción
- `/estadísticas` — Dashboard del servidor con rankings en vivo
- `/cumpleaños-lista` — Próximos cumpleaños ordenados por días restantes

**✨ Mejoras de UI:**
- `/top` + `/ecotop` — Barras visuales, tier labels, posición propia destacada
- `/8ball` — Suspense de 2 segundos, 19 respuestas ponderadas, veredicto visual
- `/rps` — Embed rico, botones coloreados post-juego, frases aleatorias
- `/tictactoe` — Línea ganadora verde, colores por jugador (❌🔴 / ⭕🔵)
- `/deposit` / `/withdraw` — Acceso rápido `todo`, barra de distribución
- `/pay` — **Confirmación con botones** + DM automático al receptor
- `/inventory` — Items ordenados por rareza con descripción y emoji
- `/coinflip`, `/gamble`, `/daily`, `/work`, `/balance`, `/shop`, `/blackjack`, `/ping`, `/ayuda` — Animaciones, barras de progreso y embeds premium

**🤖 Sistemas automáticos:**
- **Boost Rewards** — Coins + DM + anuncio público al boostear
- **Auto-Mod +4 filtros** — Emoji flood, texto Zalgo, chars repetidos, phishing
- **Welcome Card premium** — Canvas con glow ring, glass panel y partículas
- **Base de datos migrada** a SQLite con modo WAL

### v2.6 — *Marzo 2026*
- 🔫 Módulo PUBG con stats interactivas y replays 2D
- 🎵 Música con Lavalink (shoukaku) para máxima estabilidad

### v2.5 — *Febrero 2026*
- ✨ Rediseño completo con embeds premium y paleta de colores consistente
- 🎵 Prophet Music Engine v3.0 con panel de 10 botones
- 💰 Sistema de economía completo refactorizado

### v2.0 — *Febrero 2026*
- Migración a discord.js v14
- Sistema de economía, niveles y mini-juegos

### v1.0 — *Release inicial*
- Bot base con moderación y utilidades

---

## 📜 Licencia

Este proyecto es **privado y exclusivo** para **Prophet Gaming**.

```
Copyright (c) 2026 Prophet Gaming

Todos los derechos reservados.

Este software y su código fuente son propiedad de Prophet Gaming.
No está permitido copiar, modificar, distribuir, sublicenciar o usar
este software para ningún propósito sin autorización expresa por escrito.

El uso no autorizado constituye una violación de los derechos de autor
y puede resultar en acciones legales.
```

---

<div align="center">

### 🏠 Prophet Gaming

Desarrollado con ❤️ y ☕ para la comunidad.

<sub>Bot privado — No disponible para uso público.</sub>

</div>
