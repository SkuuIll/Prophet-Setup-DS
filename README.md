<div align="center">
    <img src="https://cdn-icons-png.flaticon.com/512/4712/4712038.png" width="128" height="128" alt="Prophet Bot Logo">
    <h1>🤖 Prophet Bot v2.0</h1>
    <p>
        <b>El asistente definitivo para la comunidad de Prophet Gaming.</b>
    </p>

![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

</div>

---

## 📖 Descripción

**Prophet Bot** es una solución "todo en uno" diseñada exclusivamente para potenciar la experiencia en **Prophet Gaming**. No es solo un bot de moderación; es el corazón de la comunidad, integrando economía, entretenimiento, música de alta fidelidad y herramientas administrativas en un solo paquete robusto y estéticamente cuidado.

## ✨ Características Principales

### 🛒 Economía Avanzada
Un sistema financiero completo para mantener a los usuarios enganchados:
- **Global Economy:** Comandos de trabajo (`/work`), apuestas (`/gamble`, `/coinflip`) y recompensas diarias (`/daily`).
- **Tienda Interactiva:** Usa `/shop` para comprar items y roles exclusivos mediante un menú visual.
- **Inventario:** Guarda tus items y collectibles (`/inventory`).

### 🎮 Entretenimiento y Minigames
Diversión garantizada directamente en el chat, sin descargas extra:
- **Tic-Tac-Toe:** Juega contra tus amigos usando botones interactivos (`/tictactoe`).
- **Piedra, Papel o Tijera:** Desafía a la IA del bot (`/rps`).
- **Sorteos:** Sistema de giveaways automático (`/sorteo`).

### 🎵 Música Hi-Fi
Reproductor de música de última generación basado en **Discord Player v7**:
- Soporte para **YouTube, Spotify, SoundCloud** y más.
- **Panel de Control:** Botones persistentes para Pausa, Skip, Stop y Loop.
- Calidad de audio optimizada y sin lag.

### 🛡️ Moderación y Seguridad
Herramientas profesionales para mantener el orden:
- **Auto-Mod:** Filtros anti-spam, anti-links y anti-flooding configurables.
- **Sistema de Warns:** Historial de advertencias persistente en base de datos.
- **Logs:** Registro detallado de mensajes borrados (`/snipe`) y ediciones.
- **Tickets:** Sistema de soporte privado para miembros.

### 🎭 Auto-Roles
Gestión automática de roles para personalizar el perfil de cada jugador:
- **Juegos:** Rangos de PUBG, CS:GO y roles de "Diversión" (Troll).
- **Setup Automático:** Con un solo comando (`/reactionroles_games`) el bot crea los roles y paneles necesarios.

---

## 🛠️ Instalación y Configuración

Sigue estos pasos para desplegar tu propia instancia de Prophet Bot.

### Prerrequisitos
- [Node.js](https://nodejs.org/) v16.9.0 o superior.
- [FFmpeg](https://ffmpeg.org/) (opcional, para música local, aunque el bot usa `ffmpeg-static`).

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/TuUsuario/ProphetBot.git
   cd ProphetBot
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configuración de entorno:**
   Crea un archivo `.env` en la raíz del proyecto y añade tu token:
   ```env
   DISCORD_TOKEN=tu_token_aqui_sin_comillas
   ```

4. **Configuración del Servidor:**
   Edita `config.js` para adaptar el bot a tu servidor (IDs de canales, roles, colores):
   ```javascript
   module.exports = {
       GUILD_ID: 'TU_ID_DE_SERVIDOR',
       CHANNELS: { ... },
       ROLES: { ... }
   };
   ```

5. **Iniciar el bot:**
   Para desarrollo (con reinicio automático):
   ```bash
   npm run dev
   ```
   Para producción:
   ```bash
   npm start
   ```

---

## 📂 Estructura del Proyecto

```
ProphetBot/
├── commands/           # Comandos Slash (/slash) organizados por categoría
│   ├── admin/          # Administración y Setup
│   ├── economy/        # Economía y Tienda
│   ├── fun/            # Juegos e Interacción
│   ├── mod/            # Moderación
│   ├── music/          # Música
│   └── utility/        # Utilidades generales
├── events/             # Manejadores de eventos (messageCreate, interactionCreate...)
├── modules/            # Lógica de negocio reutilizable (Anti-spam, XP, Tickets)
├── database.js         # Sistema de persistencia JSON (Base de datos local)
├── config.js           # Archivo maestro de configuración
└── index.js            # Punto de entrada
```

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Si tienes una idea para mejorar Prophet Bot:

1. Haz un **Fork** del repositorio.
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`).
3. Haz commit de tus cambios (`git commit -m 'Add some AmazingFeature'`).
4. Haz push a la rama (`git push origin feature/AmazingFeature`).
5. Abre un **Pull Request**.

---

<div align="center">
    Desarrollado con ❤️ para <b>Prophet Gaming</b>
</div>
