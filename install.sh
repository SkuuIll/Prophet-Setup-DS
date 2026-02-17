#!/bin/bash

# ═══════════════════════════════════════════════════════════
#  PROPHET BOT — Script de Instalación y Actualización
#  Uso: ./install.sh   (detecta automáticamente si es
#        instalación nueva o actualización)
# ═══════════════════════════════════════════════════════════

set -e

NOMBRE_PM2="prophet-bot"
RAMA="main"
NODE_MIN_VERSION=18

echo ""
echo "═══════════════════════════════════════"
echo "  🚀 Prophet Bot — Deploy Script"
echo "  📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════"
echo ""

# ─── Detectar si es actualización ───
ES_ACTUALIZACION=false
if command -v pm2 &> /dev/null && pm2 describe "$NOMBRE_PM2" > /dev/null 2>&1; then
    ES_ACTUALIZACION=true
    echo "🔄 Modo: ACTUALIZACIÓN"
else
    echo "🆕 Modo: INSTALACIÓN NUEVA"
fi

# ─── 1. Detener y limpiar procesos PM2 duplicados ───
if [ "$ES_ACTUALIZACION" = true ]; then
    echo ""
    echo "⏹️  Deteniendo el bot..."
    pm2 delete "$NOMBRE_PM2" 2>/dev/null || true
    echo "   ✅ Bot detenido y procesos limpiados"
fi

# ─── 2. Actualizar código desde GitHub ───
echo ""
echo "📥 Descargando últimos cambios desde GitHub..."
if git pull origin "$RAMA"; then
    echo "   ✅ Código actualizado"
else
    echo "   ⚠️  No se pudo hacer git pull (puede haber conflictos)"
    echo "   Intentá resolver los conflictos manualmente y volvé a correr el script."
    exit 1
fi

# ─── 3. Instalar Node.js (mínimo v18 para discord-player-youtubei) ───
INSTALAR_NODE=false
if ! command -v node &> /dev/null; then
    INSTALAR_NODE=true
else
    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt "$NODE_MIN_VERSION" ]; then
        echo "⚠️  Node.js v$NODE_VERSION detectado, se necesita v$NODE_MIN_VERSION+. Actualizando..."
        INSTALAR_NODE=true
    fi
fi

if [ "$INSTALAR_NODE" = true ]; then
    echo ""
    echo "📦 Instalando Node.js v20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "   ✅ Node.js $(node -v) instalado"
else
    echo ""
    echo "📦 Node.js $(node -v) detectado ✅"
fi

# ─── 4. Instalar FFmpeg (necesario para música) ───
if ! command -v ffmpeg &> /dev/null; then
    echo ""
    echo "🎵 FFmpeg no encontrado. Instalando (necesario para música)..."
    sudo apt-get update -qq
    sudo apt-get install -y ffmpeg
    echo "   ✅ FFmpeg $(ffmpeg -version 2>&1 | head -1 | awk '{print $3}') instalado"
else
    echo "🎵 FFmpeg detectado ✅"
fi

# ─── 4b. Instalar yt-dlp (opcional pero recomendado) ───
if ! command -v yt-dlp &> /dev/null; then
    echo ""
    echo "🎵 yt-dlp no encontrado. Instalando..."
    sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
    sudo chmod a+rx /usr/local/bin/yt-dlp
    echo "   ✅ yt-dlp instalado"
else
    echo "🎵 yt-dlp detectado ✅"
fi

# ─── 5. Limpiar e instalar dependencias ───
echo ""
echo "📦 Instalando dependencias..."
# Solo limpiar si realmente falta node_modules o si hubo cambio de versión de node crítico
if [ "$INSTALAR_NODE" = true ] || [ ! -d "node_modules" ]; then
    echo "   🧹 Instalación limpia (node_modules)..."
    rm -rf node_modules package-lock.json
fi

# Usar npm install normal pero verboso si falla
if npm install --no-audit; then
    echo "   ✅ Dependencias base instaladas"
else
    echo "   ⚠️  Error en npm install base. Reintentando con force..."
    npm install --force --no-audit
fi

# ─── 6. Verificar dependencias críticas de música ───
echo ""
echo "🔍 Verificando módulos de música..."
MUSIC_OK=true

# Forzar instalación de discord-player-youtubei si falla la verificación
if ! node -e "require('discord-player-youtubei')" 2>/dev/null; then
    echo "   ⚠️  discord-player-youtubei no detectado. Instalando explícitamente..."
    npm install discord-player-youtubei@latest --save
fi

node -e "require('discord-player')" 2>/dev/null && echo "   ✅ discord-player" || MUSIC_OK=false
node -e "require('@discord-player/extractor')" 2>/dev/null && echo "   ✅ @discord-player/extractor" || MUSIC_OK=false
node -e "require('discord-player-youtubei')" 2>/dev/null && echo "   ✅ discord-player-youtubei" || MUSIC_OK=false

if [ "$MUSIC_OK" = false ]; then
    echo ""
    echo "   ⚠️  Faltan módulos de música. Reinstalando suite completa..."
    npm install discord-player@latest @discord-player/extractor@latest @discord-player/ffmpeg @discord-player/opus discord-player-youtubei@latest @discordjs/voice ffmpeg-static libsodium-wrappers --save
    echo "   ✅ Reinstalación de música completada"
fi

# ─── 7. Instalar PM2 si no existe ───
if ! command -v pm2 &> /dev/null; then
    echo ""
    echo "📦 Instalando PM2..."
    sudo npm install -g pm2
    echo "   ✅ PM2 instalado"
fi

# ─── 8. Iniciar el bot (siempre una sola instancia) ───
echo ""
echo "🤖 Iniciando el bot..."
pm2 start index.js --name "$NOMBRE_PM2"
echo "   ✅ Bot iniciado"

# ─── 9. Configurar inicio automático (solo si no está configurado) ───
if [ "$ES_ACTUALIZACION" = false ]; then
    echo ""
    echo "💾 Configurando inicio automático..."
    pm2 startup systemd -u root --hp /root 2>/dev/null || true
fi
pm2 save

# ─── 10. Estado final ───
echo ""
echo "═══════════════════════════════════════"
echo "  ✅ ¡Listo! Prophet Bot desplegado"
echo "═══════════════════════════════════════"
echo ""
pm2 status "$NOMBRE_PM2"
echo ""
echo "📝 Comandos útiles:"
echo "   pm2 status           → Ver estado del bot"
echo "   pm2 logs             → Ver logs en vivo"
echo "   pm2 logs --lines 50  → Ver últimas 50 líneas"
echo "   pm2 restart $NOMBRE_PM2 → Reiniciar sin reinstalar"
echo "   ./install.sh         → Actualizar y reiniciar"
echo ""
