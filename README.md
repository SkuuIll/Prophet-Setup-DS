# Prophet-Setup-DS

Este repositorio contiene el código fuente del Bot **ProphetBot** y los planes/scripts de configuración para el servidor de Discord de Prophet Gaming.

## Estructura del Proyecto

- **ProphetBot/**: Contiene el código fuente del bot de Discord.
  - `commands/`: Comandos del bot (`/slash commands`).
  - `events/`: Manejadores de eventos de Discord (`ready`, `messageCreate`, etc.).
  - `modules/`: Módulos adicionales del bot.
  - `config.js`: Configuración principal del bot (Token, IDs, Roles).
  - `index.js`: Punto de entrada del bot.

- **Plan/**: Documentación y scripts para la configuración y mantenimiento del servidor.
  - `*_*.md`: Archivos de documentación con planes, roles, canales, etc.
  - `*.js`: Scripts de utilidad para configurar, verificar y limpiar el servidor.

## Instalación y Uso

### Prerrequisitos
- Node.js (v16.9.0 o superior)
- NPM o Yarn

### Configuración del Bot

1. Navega a la carpeta del bot:
   ```bash
   cd ProphetBot
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env` basado en el ejemplo `.env.example` y agrega tu token de Discord:
   ```bash
   cp .env.example .env
   ```
   Edita `.env` y coloca tu `DISCORD_TOKEN`.

4. Inicia el bot:
   ```bash
   npm start
   ```

### Uso de Scripts de Planificación

Los scripts en la carpeta `Plan/` están diseñados para ejecutarse según sea necesario para tareas administrativas masivas.

Ejemplo para verificar el estado del servidor:
```bash
cd Plan
node verify_server.js
```

## Notas de Seguridad

- El archivo `.env` está en `.gitignore` para evitar subir credenciales al repositorio.
- Asegúrate de nunca compartir tu `.env` o tu token públicamente.

## Contribución

1. Haz un Fork del proyecto.
2. Crea una rama para tu funcionalidad (`git checkout -b feature/nueva-funcionalidad`).
3. Haz Commit de tus cambios (`git commit -m 'Añadir nueva funcionalidad'`).
4. Haz Push a la rama (`git push origin feature/nueva-funcionalidad`).
5. Abre un Pull Request.
