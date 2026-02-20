<div align="center">

<img src="assets/logo.png" width="140" height="140" alt="Prophet Bot" style="border-radius: 50%;">

# Prophet Bot v2.5

**El asistente definitivo para Prophet Gaming.**\
Música · Moderación · Economía · Niveles · Mini-juegos — todo en un solo bot.

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/Node.js-v20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![PM2](https://img.shields.io/badge/PM2-Production-2B037A?style=for-the-badge&logo=pm2&logoColor=white)](https://pm2.keymetrics.io)
[![License](https://img.shields.io/badge/Licencia-Privada-EF5350?style=for-the-badge)](LICENSE)

<br>

<img src="assets/banner.png" width="600" alt="Prophet Gaming Banner">

</div>

---

## � Tabla de contenidos

- [Descripción](#-descripción)
- [Características](#-características)
- [Comandos](#-comandos-49-total)
- [Stack Técnico](#-stack-técnico)
- [Instalación](#-instalación)
- [Configuración VPS](#-configuración-vps-producción)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Base de Datos](#-base-de-datos)
- [Changelog](#-changelog)

---

## 🎯 Descripción

**Prophet Bot** es una solución *todo-en-uno* construida exclusivamente para **Prophet Gaming**. No es solo un bot de moderación; es el corazón digital de la comunidad — integrando un sistema de economía completo, reproductor de música de alta fidelidad, niveles con roles automáticos, mini-juegos interactivos y herramientas administrativas avanzadas, todo envuelto en un diseño visual premium con branding consistente.

### ¿Por qué Prophet Bot?

| | Característica | Detalle |
|---|---|---|
| 🎨 | **Diseño Premium** | Todos los mensajes usan embeds con colores consistentes y branding Prophet |
| 🇦🇷 | **100% en Español** | Argentino, con voseo y expresiones locales |
| �️ | **Anti-Raid** | Detección automática de raids con alertas al staff |
| 📊 | **Métricas** | Sistema de logs interno con historial de acciones |
| 💾 | **Persistencia** | Base de datos JSON con guardado automático y debounce |
| 🎵 | **Multi-Plataforma** | YouTube, Spotify, SoundCloud, Apple Music, Vimeo y más |

---

## ✨ Características

### 🎵 Reproductor de Música — *Prophet Music Engine v3.0*

<table>
<tr><td width="50%">

- Basado en **Discord Player v7** con 7 extractores
- Soporte: YouTube, Spotify, SoundCloud, Apple Music, Vimeo
- Streaming vía **yt-dlp** para máxima compatibilidad
- Panel de control interactivo con **10 botones**
- Barra de progreso visual y volumen dinámico
- Historial de reproducción por servidor
- Loop (canción/cola), shuffle, replay
- Optimizado con `highWaterMark` para 0 lag

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

### 💰 Sistema de Economía

Un ecosistema financiero completo que mantiene a los usuarios activos:

| Comando | Descripción |
|---|---|
| `/balance` | Saldo con tabla formateada y barra de distribución efectivo/banco |
| `/daily` | Recompensa diaria con cooldown de 24h |
| `/work` | 15 trabajos aleatorios con narrativas divertidas |
| `/gamble` | Doble o nada — 50/50 de ganar o perder tu apuesta |
| `/pay` | Transferencias P2P entre usuarios |
| `/deposit` / `/withdraw` | Mover dinero entre efectivo y banco |
| `/shop` | Tienda interactiva con menú desplegable e indicador de asequibilidad |
| `/inventory` | Inventario de items comprados |

### 📈 Sistema de Niveles y XP

- XP por mensaje con cooldown anti-abuse
- **Level-up** automático con notificación embed
- **Roles por nivel** asignados automáticamente
- Leaderboard con `/top`
- Perfil individual con `/nivel`

### 🛡️ Moderación y Seguridad

| Comando | Descripción | Extras |
|---|---|---|
| `/ban` | Ban permanente | DM al usuario, log a DB, avatar en embed |
| `/tempban` | Ban temporal | Countdown Discord, desbaneo automático |
| `/kick` | Expulsar usuario | DM + log |
| `/mute` | Timeout temporal | Timer relativo, duración formateada |
| `/warn` | Advertencia | Auto-mute/kick al llegar al límite |
| `/warns` | Ver historial | Lista con fechas y moderadores |
| `/clear` | Borrar mensajes | Filtro por usuario |
| `/purge` | Borrar con filtros | Bots, humanos, links, archivos, no-fijados |
| `/slowmode` | Modo lento | Duración formateada inteligente |

**Sistemas automáticos:**
- 🛡️ **Anti-Spam** — Detección de flooding, spam de texto repetido y menciones masivas
- 🚨 **Anti-Raid** — Alerta automática al detectar entradas sospechosas
- 📝 **Logs automáticos** — Mensajes eliminados, editados, entradas/salidas de miembros

### 🎮 Entretenimiento

| Comando | Descripción |
|---|---|
| `/tictactoe` | Tres en raya con botones interactivos (PvP) |
| `/rps` | Piedra, Papel o Tijera contra el bot |
| `/8ball` | Bola mágica con respuestas color-coded |
| `/coinflip` | Cara o Cruz con emojis temáticos |
| `/confesion` | Confesiones anónimas al canal configurado |
| `/sorteo` | Sistema de giveaways con timer automático |
| `/encuesta` / `/encuesta_pro` | Encuestas simples y avanzadas con gráficos |

### 🔧 Utilidades

| Comando | Descripción |
|---|---|
| `/ping` | Latencia + uptime + RAM + indicador de calidad |
| `/afk` | Modo ausente con notificación automática y duración |
| `/snipe` | Recuperar último mensaje borrado (code block) |
| `/suggest` | Sugerencias con votación ✅/❌ |
| `/userinfo` / `/serverinfo` | Info detallada de usuarios/servidor |
| `/embed` | Constructor de embeds personalizados |
| `/ayuda` | Guía completa de todos los sistemas |

### 🎙️ Canales Dinámicos (Join-To-Create)
El bot cuenta con un sistema interactivo de creación de salas privadas (`🔊 Salas Temporales`):
- Los usuarios se unen a `➕ Crear Sala` y el bot automáticamente les genera un canal de voz privado instantáneo donde tienen control total.
- El canal creado desaparece **inmediatamente al quedar vacío**.
- **💥 Estados Automáticos Tóxicos & Gaming:** Cada vez que se crea una sala o un usuario ingresa como primero a un canal público vacío, el bot inyecta silenciosamente un Estado de Voz hiper random:

> `🤬 Modo Tóxico ON` · `🧂 Más salado que el mar` · `📉 Perdiendo RP...` · `💀 Carreados por el team` · `🐒 Equipo de macacos` · `🚮 Basura espacial` · `🔥 Tilteados al máximo` · `🖱️ Rompiendo periféricos` · `💦 Sudando sangre` · `🏆 Smurfeando chilling` · `❌ Alt + F4 inminente` · `🤡 Circo de 5 pistas` · `🤝 Carrileando bronces` · `🛑 Lag mental` · `♿ Mi team da pena` · `🎮 Feedeando intencionalmente` · `🚪 Desinstalando el juego` · `🤐 Muteall y a ganar` · `🔪 Apuñaladas al team` · `🚑 Llama a la ambulancia` · `🦶 Jugando con los pies` · `💻 Monitor apagado` · `🗑️ Directo a la basura` · `🦍 Mentalidad de Plata IV` · `💤 Dormido esperando gank` · `🥊 Boxeando al teclado` · `💥 0/10 power spike` · `🐔 Campeando` · `🐛 El juego está bug!` · `🤖 Somos todos bots` · `👀 Jugando a ciegas` · `🗣️ Mucho texto, poco aim` · `🐌 Reflejos de caracol` · `🧠 -100 IQ plays` · `🧱 Hablándole a la pared` · `🚨 Reporte en progreso...` · `💩 Mis mecánicas dan asco` · `🤡 Los payasos del server` · `💣 A punto de explotar` · `🚫 Chat restringido`

### ⚙️ Administración

| Comando | Descripción |
|---|---|
| `/setup-tickets` | Panel de tickets con sistema de soporte privado |
| `/setup-counting` | Juego de contar con celebraciones cada 100 |
| `/setup-confesiones` | Canal de confesiones anónimas |
| `/reactionroles` | Panel de auto-roles con botones |
| `/reactionroles_games` | Panel especializado para roles de juegos |
| `/memoria` | Ver logs internos del bot (últimas acciones) |

---

## 📋 Comandos (49 total)

```
📁 admin/       6 comandos    ⚙️  Configuración y setup del servidor
📁 economy/     9 comandos    💰 Sistema financiero completo
📁 fun/         6 comandos    🎮 Juegos y entretenimiento
📁 levels/      2 comandos    📈 Niveles y leaderboard
📁 mod/         9 comandos    🛡️  Moderación y seguridad
📁 music/       6 comandos    🎵 Reproductor de música
📁 utility/    11 comandos    🔧 Herramientas y utilidades
```

---

## � Stack Técnico

| Tecnología | Versión | Uso |
|---|---|---|
| **Node.js** | v20.x | Runtime |
| **discord.js** | v14 | API de Discord |
| **discord-player** | v7 | Motor de música |
| **discord-player-youtubei** | latest | Extractor YouTube |
| **@discord-player/extractor** | latest | Extractores adicionales (Spotify, SoundCloud, etc.) |
| **@discord-player/ffmpeg** | latest | Procesamiento de audio |
| **@discord-player/opus** | latest | Codificación de audio |
| **yt-dlp** | latest | Streaming de audio |
| **FFmpeg** | 6.x | Transcodificación |
| **PM2** | 6.x | Process manager (producción) |
| **dotenv** | 17.x | Variables de entorno |

---

## 🚀 Instalación

### Prerrequisitos

- **Node.js** v18+ ([descargar](https://nodejs.org/))
- **FFmpeg** instalado en el sistema
- **yt-dlp** instalado globalmente
- Una **aplicación de Discord** con bot token ([Discord Developer Portal](https://discord.com/developers/applications))

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/SkuuIll/Prophet-Setup-DS.git
cd Prophet-Setup-DS

# 2. Instalar dependencias
npm install

# 3. Crear archivo de entorno
echo "DISCORD_TOKEN=tu_token_aqui" > .env

# 4. Configurar el bot
#    Editá config.js con los IDs de tu servidor:
#    - GUILD_ID
#    - CHANNELS (bienvenidos, logs, reglas, etc.)
#    - ROLES (nuevo, mods, vip, etc.)
nano config.js

# 5. Iniciar (desarrollo)
node index.js

# 6. Iniciar (producción con PM2)
pm2 start ecosystem.config.js
pm2 save
```

---

## 🖥️ Configuración VPS (Producción)

Prophet Bot está optimizado para correr en una VPS Linux con la siguiente configuración:

### Requisitos mínimos

| Recurso | Mínimo | Recomendado |
|---|---|---|
| **RAM** | 512 MB | 2 GB+ |
| **CPU** | 1 vCPU | 2 vCPU |
| **Disco** | 5 GB | 20 GB |
| **OS** | Ubuntu 22.04+ | Ubuntu 24.04 |

### Setup automático

```bash
# Instalar dependencias del sistema
apt update && apt install -y nodejs npm ffmpeg
npm install -g pm2

# Instalar yt-dlp
pip3 install -U yt-dlp

# Clonar y arrancar
git clone https://github.com/SkuuIll/Prophet-Setup-DS.git /root/ProphetBot
cd /root/ProphetBot
npm install
echo "DISCORD_TOKEN=tu_token" > .env
# Editar config.js

# Arrancar con PM2
pm2 start ecosystem.config.js
pm2 startup    # Auto-start en reboot
pm2 save       # Guardar proceso
```

### Configuración incluida

| Componente | Configuración |
|---|---|
| **PM2** | `ecosystem.config.js` — max 500MB RAM, auto-restart, logs JSON |
| **Node.js** | `--max-old-space-size=512 --optimize-for-size` |
| **Log Rotation** | pm2-logrotate + logrotate.d — max 50MB/archivo, 7 días |
| **yt-dlp** | Cron semanal de actualización automática |
| **Swap** | `vm.swappiness=10` (prioriza RAM) |
| **Firewall** | UFW activo (solo SSH) |
| **fail2ban** | Protección anti-brute force |

### Comandos de gestión

```bash
pm2 status                 # Ver estado del bot
pm2 logs ProphetBot        # Logs en tiempo real
pm2 restart ProphetBot     # Reiniciar
pm2 stop ProphetBot        # Detener
pm2 monit                  # Monitor interactivo (CPU/RAM)
pm2 logs ProphetBot --lines 100 --nostream   # Últimas 100 líneas
```

---

## 📂 Estructura del Proyecto

```
ProphetBot/
│
├── 📁 assets/                  # Recursos visuales
│   ├── banner.png              # Banner principal del servidor
│   ├── logo.png                # Logo del bot
│   └── music_banner.png        # Banner del reproductor de música
│
├── 📁 commands/                # 49 Slash Commands organizados
│   ├── 📁 admin/       (6)    # Setup de tickets, counting, roles, confesiones
│   ├── 📁 economy/     (9)    # Balance, daily, work, gamble, shop, pay, bank
│   ├── 📁 fun/         (6)    # 8ball, coinflip, rps, tictactoe, confesion
│   ├── 📁 levels/      (2)    # Nivel individual y leaderboard
│   ├── 📁 mod/         (9)    # Ban, kick, mute, warn, clear, purge, tempban
│   ├── 📁 music/       (6)    # Play, pause, skip, stop, queue, volumen
│   └── 📁 utility/    (11)    # Ping, afk, snipe, suggest, info, embed, sorteo
│
├── 📁 events/                  # Event Handlers
│   ├── guildMemberAdd.js       # Bienvenida + anti-raid + rol automático
│   ├── guildMemberRemove.js    # Log de salida con tiempo en servidor
│   ├── interactionCreate.js    # Router de slash commands, botones y modals
│   ├── messageCreate.js        # XP, AFK, anti-spam, counting game
│   ├── messageDelete.js        # Log + snipe
│   └── messageUpdate.js        # Log de ediciones con jump link
│
├── 📁 modules/                 # Lógica reutilizable
│   ├── antispam.js             # Anti-spam y anti-raid
│   ├── giveaways.js            # Sistema de sorteos con timer
│   ├── leveling.js             # Cálculo de XP, niveles y roles
│   └── tickets.js              # Sistema de tickets de soporte
│
├── 📁 data/                    # Datos persistentes (gitignored)
│   └── prophet.json            # Base de datos JSON del bot
│
├── 📁 logs/                    # Logs de PM2 (gitignored)
│
├── ⚙️ config.js                # IDs de canales, roles, colores, umbrales
├── 💾 database.js              # Motor de persistencia con debounce
├── 🚀 index.js                 # Entry point + Music Engine + Event Router
├── 📦 ecosystem.config.js      # Configuración PM2 para producción
├── 📦 package.json             # Dependencias del proyecto
├── 🔒 .env                     # Token (gitignored)
└── 📝 .gitignore               # Exclusiones de Git
```

---

## 💾 Base de Datos

Prophet Bot usa un sistema de persistencia basado en **JSON** (`data/prophet.json`) con guardado debounced para evitar escrituras excesivas al disco.

### Estructura de datos

```javascript
{
  "users": {
    "USER_ID": {
      "xp": 0,              // Experiencia acumulada
      "level": 1,            // Nivel actual
      "messages": 0,         // Total de mensajes
      "balance": 0,          // Dinero en efectivo
      "bank": 0,             // Dinero en el banco
      "inventory": [],       // Items comprados
      "last_daily": 0,       // Timestamp del último /daily
      "last_work": 0         // Timestamp del último /work
    }
  },
  "warns": [],               // Historial de advertencias
  "reactionRoles": {},       // Paneles de auto-roles
  "giveaways": [],           // Sorteos activos
  "tickets": {},             // Tickets de soporte
  "tempbans": [],            // Bans temporales pendientes
  "config": {},              // Configuraciones dinámicas
  "logs": []                 // Historial de acciones del bot
}
```

---

## 🎨 Paleta de colores

Los embeds del bot siguen una paleta consistente para comunicar estados visuales:

| Color | Hex | Uso |
|---|---|---|
| 🟣 Principal | `#BB86FC` | Mensajes generales, música, economía |
| 🟢 Éxito | `#69F0AE` | Acciones completadas, confirmaciones |
| 🔴 Error | `#EF5350` | Errores, bans, expulsiones |
| 🟡 Advertencia | `#FFB74D` | Warns, mutes, cooldowns |
| 🔵 Info | `#42A5F5` | Logs, información neutral |
| ⚫ Disconnect | `#37474F` | Desconexión de voz |

---

## 📝 Changelog

### v2.5 — *Febrero 2026*
- ✨ Rediseño completo de todos los mensajes del bot con embeds premium
- 🎵 Prophet Music Engine v3.0 con panel de 10 botones
- 🎨 Paleta de colores consistente en todo el bot
- 🛡️ Moderación mejorada: avatares, countdown, logs a DB
- 💰 Economía: números formateados, barras visuales
- 🏓 Ping ahora muestra uptime, RAM e indicador de calidad
- 🔧 Fix crítico: `setConfig()` y scope de `stmts` en ready handler
- ⚙️ Ecosystem config de PM2 para producción

### v2.0 — *Febrero 2026*
- 🎵 Migración a discord-player v7
- 💰 Sistema de economía completo
- 🛡️ Anti-spam y anti-raid
- 📊 Sistema de niveles y XP
- 🎮 Mini-juegos interactivos

### v1.0 — *Release inicial*
- Bot base con moderación y utilidades

---

<div align="center">

### 🏠 Prophet Gaming

Desarrollado con ❤️ y ☕ para la comunidad.

<sub>Bot privado — No disponible para uso público.</sub>

</div>
